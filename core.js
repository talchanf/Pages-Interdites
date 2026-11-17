/* Pages Interdites : lecture du jeu de données « Banned Books, Open Censorship Core » */
(function (root) {
  const REASONS = ["moral","sexual","political","violence","lgbtq","religious","racial","language","drugs","obscenity","other"];
  const ACTIONS = ["banned","restricted","challenged"];
  const STATUS = ["active","historical","rescinded"];
  const SCOPES = ["school","government","public_library","retail","customs","church","prison"];

  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const first = text.slice(0, text.indexOf("\n") >>> 0);
    const cnt = ch => (first.match(new RegExp("\\" + ch, "g")) || []).length;
    const sep = cnt("\t") > cnt(",") && cnt("\t") > cnt(";") ? "\t" : cnt(";") > cnt(",") ? ";" : ",";
    const rows = []; let row = [], f = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    const h = (rows.shift() || []).map(x => x.trim());
    return rows.filter(r => r.some(x => x.trim())).map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i] ?? ""); return o; });
  }

  /* Tables relationnelles -> format compact */
  function buildCompact(t) {
    const authorName = new Map((t.authors || []).map(a => [a.slug, a.display_name]));
    const A = [], aIdx = new Map();
    const ai = s => { const n = authorName.get(s) || s; if (!aIdx.has(n)) { aIdx.set(n, A.length); A.push(n); } return aIdx.get(n); };
    const C = [], cIdx = new Map();
    const ci = c => { if (!cIdx.has(c)) { cIdx.set(c, C.length); C.push(c); } return cIdx.get(c); };
    const S = [], sIdx = new Map();
    const si = (n, u) => { const k = n + "\u0001" + u; if (!sIdx.has(k)) { sIdx.set(k, S.length); S.push([n, u]); } return sIdx.get(k); };

    const reasonsBy = new Map();
    for (const r of t.ban_reasons || []) {
      let i = REASONS.indexOf(r.reason_slug); if (i < 0) i = REASONS.indexOf("other");
      reasonsBy.set(r.ban_id, (reasonsBy.get(r.ban_id) || 0) | (1 << i));
    }
    const sourcesBy = new Map();
    for (const s of t.ban_sources || []) {
      if (!s.source_name && !s.source_url) continue;
      const l = sourcesBy.get(s.ban_id) || []; const k = si(s.source_name || "", s.source_url || "");
      if (!l.includes(k)) l.push(k); sourcesBy.set(s.ban_id, l);
    }
    const bansBy = new Map();
    for (const b of t.bans || []) {
      const ys = parseInt(b.year_started), ye = parseInt(b.year_ended);
      const rec = [ci(b.country_code), isNaN(ys) ? 0 : ys, isNaN(ye) ? 0 : ye,
        Math.max(0, ACTIONS.indexOf(b.action_type)), Math.max(0, STATUS.indexOf(b.status)),
        Math.max(0, SCOPES.indexOf(b.scope)), reasonsBy.get(b.ban_id) || 0, sourcesBy.get(b.ban_id) || []];
      const l = bansBy.get(b.book_slug) || []; l.push(rec); bansBy.set(b.book_slug, l);
    }
    const B = (t.books || []).map(b => {
      const y = parseInt(b.first_published_year);
      return [b.title, isNaN(y) ? 0 : y, b.original_language || "",
        (b.author_slugs || "").split("|").filter(Boolean).map(ai),
        b.is_blanket_works === "true" ? 1 : 0, bansBy.get(b.slug) || []];
    });
    const countryNames = {}; (t.countries || []).forEach(c => countryNames[c.code] = c.name_en);
    return { v: 1, A, C, S, B, countryNames };
  }

  /* Format compact -> objets utilisés par le site */
  function decode(d) {
    return d.B.map(([title, year, lang, au, blanket, bans]) => {
      const bs = bans.map(([c, ys, ye, act, st, sc, rm, src]) => ({
        c: d.C[c], ys, ye, act: ACTIONS[act], st: STATUS[st], scope: SCOPES[sc],
        reasons: REASONS.filter((_, i) => rm & (1 << i)), src: src.map(i => d.S[i])
      }));
      const countries = [...new Set(bs.map(b => b.c))];
      const reasons = [...new Set(bs.flatMap(b => b.reasons))];
      const yrs = bs.map(b => b.ys).filter(Boolean);
      return {
        title, year, lang, authors: au.map(i => d.A[i]), blanket: !!blanket, bans: bs,
        countries, reasons: reasons.length ? reasons : ["other"],
        firstBan: yrs.length ? Math.min(...yrs) : 0,
        active: bs.filter(b => b.st === "active").length,
        scopes: [...new Set(bs.map(b => b.scope))]
      };
    });
  }

  const api = { REASONS, ACTIONS, STATUS, SCOPES, parseCSV, buildCompact, decode };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BBCore = api;
})(typeof window !== "undefined" ? window : globalThis);