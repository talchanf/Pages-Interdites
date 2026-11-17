/* Pages Interdites : logique du site (filtres, fiches, statistiques, import) */

const {parseCSV, buildCompact, decode} = BBCore;
const $ = s => document.querySelector(s);
const norm = s => (s||"").toString().normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const esc = s => (s??"").toString().replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => n.toLocaleString("fr-FR");

/* ---------- Libellés en français ---------- */
const R_FR = {moral:"Morale",sexual:"Sexuel",political:"Politique",violence:"Violence",lgbtq:"LGBTQ+",religious:"Religieux",racial:"Racial",language:"Langage",drugs:"Drogues",obscenity:"Obscénité",other:"Autre"};
const ACT_FR = {banned:"Interdit",restricted:"Restreint",challenged:"Contesté"};
const ST_FR = {active:"En vigueur",historical:"Historique",rescinded:"Levée"};
const SC_FR = {school:"École",government:"Gouvernement",public_library:"Bibliothèque publique",retail:"Commerce",customs:"Douanes",church:"Église",prison:"Prison"};
const C_OVR = {CS:"Tchécoslovaquie",DD:"RDA (Allemagne de l'Est)",SU:"URSS",YU:"Yougoslavie",VA:"Vatican (Saint-Siège)",HK:"Hong Kong",PS:"Palestine"};
let regionNames, langNames;
try{regionNames=new Intl.DisplayNames(["fr"],{type:"region"});langNames=new Intl.DisplayNames(["fr"],{type:"language"});}catch(e){}
let countryEn={};
const cName = c => C_OVR[c] || (()=>{try{const n=regionNames&&regionNames.of(c);if(n&&n!==c)return n;}catch(e){}return countryEn[c]||c;})();
const lName = l => {if(!l)return "";try{const n=langNames&&langNames.of(l);if(n&&n!==l)return n;}catch(e){}return l;};
const rName = r => R_FR[r] || r;

/* ---------- État ---------- */
let BOOKS = [], current = [], shown = 0;
const PAGE = 120;
let state = {q:"",country:"",scope:"",status:"",era:"",sort:"countries",reasons:new Set()};

function load(compact){
  countryEn = compact.countryNames || {};
  setBooks(decode(compact));
}
function setBooks(books){
  BOOKS = books;
  BOOKS.forEach(b=>{b._s = norm(b.title+" "+b.authors.join(" ")); b._cn = b.countries.map(cName);});
  buildFilters(); route();
}

function buildFilters(){
  const cc={};BOOKS.forEach(b=>b.countries.forEach(c=>cc[c]=(cc[c]||0)+1));
  const cs=Object.keys(cc).sort((a,b)=>cName(a).localeCompare(cName(b),"fr"));
  $("#country").innerHTML='<option value="">Tous les pays</option>'+cs.map(c=>`<option value="${esc(c)}">${esc(cName(c))} (${fmt(cc[c])})</option>`).join("");
  const sc=[...new Set(BOOKS.flatMap(b=>b.scopes||[]))];
  $("#scope").innerHTML='<option value="">Toutes les portées</option>'+sc.map(s=>`<option value="${esc(s)}">${esc(SC_FR[s]||s)}</option>`).join("");
  $("#scope").hidden=!sc.length;
  const rc={};BOOKS.forEach(b=>b.reasons.forEach(r=>rc[r]=(rc[r]||0)+1));
  $("#chips").innerHTML=Object.keys(rc).sort((a,b)=>rc[b]-rc[a]).map(r=>`<button class="chip" data-r="${esc(r)}" aria-pressed="${state.reasons.has(r)}">${esc(rName(r))}</button>`).join("");
  $("#f-books").textContent=fmt(BOOKS.length);
  const nb=BOOKS.reduce((s,b)=>s+b.bans.length,0);$("#f-bans").textContent=fmt(nb||BOOKS.reduce((s,b)=>s+b.countries.length,0));
  $("#f-countries").textContent=cs.length;
}

function filtered(){
  const q=norm(state.q).trim(); const [ea,ez]=state.era?state.era.split("-").map(Number):[0,0];
  const out=BOOKS.filter(b=>{
    if(q && !b._s.includes(q)) return false;
    if(state.era && (!b.year||b.year<ea||b.year>ez)) return false;
    for(const r of state.reasons) if(!b.reasons.includes(r)) return false;
    if(state.country||state.scope||state.status){
      if(!b.bans.length) return !state.scope&&!state.status&&b.countries.includes(state.country);
      return b.bans.some(x=>(!state.country||x.c===state.country)&&(!state.scope||x.scope===state.scope)&&(!state.status||x.st===state.status));
    }
    return true;
  });
  const s=state.sort, t=(a,b)=>a.title.localeCompare(b.title,"fr");
  out.sort((a,b)=>
    s==="countries"?(b.countries.length-a.countries.length)||(b.bans.length-a.bans.length)||t(a,b):
    s==="bans"?(b.bans.length-a.bans.length)||t(a,b):
    s==="year"?(a.year||9999)-(b.year||9999)||t(a,b):
    s==="year-d"?(b.year||0)-(a.year||0)||t(a,b):
    s==="first"?(a.firstBan||9999)-(b.firstBan||9999)||t(a,b):t(a,b));
  return out;
}
function card(b,i){
  const nb=b.bans.length;
  return `<button class="book" data-i="${i}">
    <div class="spine"><span>${b.year||"année inconnue"}</span><span>${esc(lName(b.lang))}</span></div>
    <h3>${esc(b.title)}</h3><div class="au">${esc(b.blanket?"Toutes les œuvres de "+b.authors.join(", "):b.authors.join(", ")||"Auteur inconnu")}</div>
    <div class="tags">${b.reasons.slice(0,4).map(r=>`<span class="tag">${esc(rName(r))}</span>`).join("")}${b.reasons.length>4?`<span class="tag st">+${b.reasons.length-4}</span>`:""}</div>
    <div class="where">${esc(b._cn.slice(0,3).join(", "))}${b.countries.length>3?` et ${b.countries.length-3} autre${b.countries.length>4?"s":""}`:""}${nb?` · ${fmt(nb)} mesure${nb>1?"s":""}${b.active?`, ${fmt(b.active)} en vigueur`:""}`:""}</div>
  </button>`;
}
function render(){
  current=filtered(); shown=0;
  const n=current.length;
  $("#count").textContent=`${fmt(n)} livre${n>1?"s":""}`;
  $("#grid").innerHTML=n?"":`<div class="empty">Aucun livre ne correspond à ces critères.</div>`;
  more();
}
function more(){
  const next=current.slice(shown,shown+PAGE);
  $("#grid").insertAdjacentHTML("beforeend",next.map((b,k)=>card(b,shown+k)).join(""));
  shown+=next.length; $("#more").hidden=shown>=current.length;
  $("#more").textContent=`Afficher plus (${fmt(current.length-shown)} restants)`;
}

function openBook(b){
  const groups={};b.bans.forEach(x=>(groups[x.c]=groups[x.c]||[]).push(x));
  const order=Object.keys(groups).sort((a,c)=>groups[c].length-groups[a].length);
  const MAX=25;
  const gHtml=order.map(c=>{
    const l=groups[c].sort((a,z)=>(a.ys||0)-(z.ys||0));
    const yrs=l.map(x=>x.ys).filter(Boolean);
    return `<div class="cgroup"><h5>${esc(cName(c))}<span>${l.length} mesure${l.length>1?"s":""}${yrs.length?` · ${Math.min(...yrs)}${Math.max(...yrs)!==Math.min(...yrs)?"–"+Math.max(...yrs):""}`:""}</span></h5>
      <table class="bans"><thead><tr><th>Année</th><th>Mesure</th><th>Portée</th><th>Statut</th><th>Motifs</th><th>Source</th></tr></thead><tbody>
      ${l.slice(0,MAX).map(x=>`<tr><td>${x.ys||"?"}${x.ye?"–"+x.ye:""}</td><td>${esc(ACT_FR[x.act]||x.act)}</td><td>${esc(SC_FR[x.scope]||x.scope)}</td><td>${esc(ST_FR[x.st]||x.st)}</td><td>${esc(x.reasons.map(rName).join(", "))}</td>
        <td>${x.src.map(([n,u])=>u?`<a href="${esc(u)}" target="_blank" rel="noopener" title="${esc(n)}">${esc(n.length>32?n.slice(0,30)+"…":n||"lien")}</a>`:esc(n)).join("<br>")}</td></tr>`).join("")}
      </tbody></table>${l.length>MAX?`<p class="credit">… et ${l.length-MAX} autres mesures.</p>`:""}</div>`;
  }).join("");
  $("#dlg-body").innerHTML=`
    <div class="tags">${b.reasons.map(r=>`<span class="tag">${esc(rName(r))}</span>`).join("")}</div>
    <h2>${esc(b.title)}</h2><div class="au">${esc(b.blanket?"Toutes les œuvres de "+b.authors.join(", "):b.authors.join(", "))}${b.year?`, ${b.year}`:""}</div>
    <dl>
      ${b.lang?`<dt>Langue originale</dt><dd>${esc(lName(b.lang))}</dd>`:""}
      <dt>Pays</dt><dd>${esc(b._cn.join(", ")||"non précisé")}</dd>
      ${b.bans.length?`<dt>Mesures recensées</dt><dd>${fmt(b.bans.length)} dont ${fmt(b.active)} en vigueur</dd>`:""}
      ${b.firstBan?`<dt>Première mesure</dt><dd>${b.firstBan}</dd>`:""}
    </dl>
    ${gHtml}`;
  $("#dlg").showModal(); $("#dlg .dlg").scrollTop=0;
}

function bars(el,entries,onClick,label=k=>k){
  const max=Math.max(1,...entries.map(e=>e[1]));
  el.innerHTML=entries.map(([k,v])=>`<button class="barrow" data-k="${esc(k)}"><span>${esc(label(k))}</span><span class="track"><span class="fill" style="display:block;width:${v/max*100}%"></span></span><span class="n">${fmt(v)}</span></button>`).join("");
  el.querySelectorAll(".barrow").forEach(b=>b.onclick=()=>onClick(b.dataset.k));
}
function renderStats(){
  const rc={},cc={},sc={},st={};
  BOOKS.forEach(b=>{
    b.reasons.forEach(r=>rc[r]=(rc[r]||0)+1);
    b.countries.forEach(c=>cc[c]=(cc[c]||0)+1);
    new Set(b.bans.map(x=>x.scope)).forEach(s=>sc[s]=(sc[s]||0)+1);
    new Set(b.bans.map(x=>x.st)).forEach(s=>st[s]=(st[s]||0)+1);
  });
  const goWith=f=>k=>{resetState();f(k);go("catalogue");};
  bars($("#s-reasons"),Object.entries(rc).sort((a,b)=>b[1]-a[1]),goWith(k=>state.reasons.add(k)),rName);
  bars($("#s-countries"),Object.entries(cc).sort((a,b)=>b[1]-a[1]).slice(0,15),goWith(k=>state.country=k),cName);
  bars($("#s-scopes"),Object.entries(sc).sort((a,b)=>b[1]-a[1]),goWith(k=>state.scope=k),k=>SC_FR[k]||k);
  bars($("#s-status"),Object.entries(st).sort((a,b)=>b[1]-a[1]),goWith(k=>state.status=k),k=>ST_FR[k]||k);
  const buckets=[["<1800",0,1799],["1800s",1800,1899],["1900-29",1900,1929],["1930-49",1930,1949],["1950-69",1950,1969],["1970-89",1970,1989],["1990-09",1990,2009],["2010-19",2010,2019],["2020+",2020,3000]];
  const all=BOOKS.flatMap(b=>b.bans.map(x=>x.ys)).filter(Boolean);
  const counts=buckets.map(([l,a,z])=>[l,all.filter(y=>y>=a&&y<=z).length]);
  const max=Math.max(1,...counts.map(c=>c[1]));
  $("#s-time").innerHTML=counts.map(([l,v])=>`<div class="col" title="${fmt(v)} mesure(s)"><small>${fmt(v)}</small><i style="height:${v/max*78}%"></i><small>${l}</small></div>`).join("");
}

function resetState(){state={q:"",country:"",scope:"",status:"",era:"",sort:state.sort,reasons:new Set()};}
function syncControls(){
  $("#q").value=state.q;$("#country").value=state.country;$("#scope").value=state.scope;$("#status").value=state.status;$("#era").value=state.era;$("#sort").value=state.sort;
  document.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",state.reasons.has(c.dataset.r)));
}
function go(v){if(location.hash!=="#"+v)location.hash=v;else route();}
function route(){
  const v=["catalogue","statistiques","a-propos"].includes(location.hash.slice(1))?location.hash.slice(1):"catalogue";
  document.querySelectorAll(".view").forEach(s=>s.classList.toggle("on",s.id==="v-"+v));
  document.querySelectorAll("nav.tabs a").forEach(a=>a.classList.toggle("on",a.dataset.v===v));
  if(!BOOKS.length) return;
  if(v==="statistiques")renderStats();
  if(v==="catalogue"){syncControls();render();}
  window.scrollTo(0,0);
}

/* ---------- Import ---------- */
const TABLES=["books","authors","bans","ban_reasons","ban_sources","countries"];
function pick(o,keys){for(const k of Object.keys(o)){const n=norm(k).replace(/[^a-z]/g,"");if(keys.some(x=>n===x||n.includes(x)))return o[k];}}
const asList=v=>Array.isArray(v)?v.map(x=>typeof x==="object"&&x?(x.name||x.label||x.title||""):String(x)).filter(Boolean):(v?String(v).split(/[|;]/).map(s=>s.trim()).filter(Boolean):[]);
function flatToBooks(recs){
  const map=new Map();
  for(const o of recs){
    if(!o||typeof o!=="object")continue;
    const title=pick(o,["title","titre"]);if(!title)continue;
    const authors=asList(pick(o,["author","auteur"]));
    const key=norm(title)+"|"+norm(authors.join());
    let b=map.get(key);
    if(!b){const y=parseInt(pick(o,["year","annee","published"]));b={title:String(title).trim(),authors,year:isNaN(y)?0:y,lang:String(pick(o,["language","langue"])||""),blanket:false,bans:[],countries:[],reasons:[],scopes:[],firstBan:0,active:0};map.set(key,b);}
    asList(pick(o,["country","pays"])).forEach(c=>{if(!b.countries.includes(c))b.countries.push(c);});
    asList(pick(o,["reason","motif","category"])).forEach(r=>{if(!b.reasons.includes(r))b.reasons.push(r);});
  }
  return [...map.values()].map(b=>({...b,reasons:b.reasons.length?b.reasons:["other"]}));
}
async function handleFiles(files){
  const msg=$("#import-msg");msg.textContent="Lecture en cours…";
  try{
    const texts={};
    for(const f of files){
      if(/\.zip$/i.test(f.name)){
        if(typeof JSZip==="undefined")throw new Error("le module de lecture des zip n'a pas pu être chargé, dépose plutôt les fichiers CSV.");
        const z=await JSZip.loadAsync(f);
        for(const name of Object.keys(z.files)){const base=name.split("/").pop();if(/\.(csv|json|tsv)$/i.test(base)&&!z.files[name].dir)texts[base]=await z.files[name].async("string");}
      } else texts[f.name]=await f.text();
    }
    const tab={};
    for(const [name,txt] of Object.entries(texts)){const m=name.toLowerCase().match(/^(.*)\.(csv|tsv)$/);if(m&&TABLES.includes(m[1]))tab[m[1]]=parseCSV(txt);}
    if(tab.books&&tab.bans){
      msg.textContent="Assemblage des tables…";
      const d=buildCompact(tab);load(d);
      msg.innerHTML=`<strong style="color:var(--ink)">${fmt(d.B.length)} livres et ${fmt(tab.bans.length)} mesures importés.</strong>${tab.authors?"":" Fichier authors.csv absent : les auteurs s'affichent sous forme d'identifiants."}`;
      return;
    }
    if(tab.books||tab.bans){msg.textContent="Il faut au moins books.csv et bans.csv (idéalement le zip complet).";return;}
    const [name,txt]=Object.entries(texts)[0]||[];
    if(!txt){msg.textContent="Aucun fichier lisible.";return;}
    let recs;
    if(/\.json$/i.test(name)||/^\s*[\[{]/.test(txt)){
      const j=JSON.parse(txt);
      if(j&&j.metadata&&j.files&&j.links){msg.innerHTML="Ce fichier JSON est la fiche descriptive Zenodo du jeu de données, pas les données elles-mêmes. Dépose plutôt <code>banned-books-open-core.zip</code>.";return;}
      recs=Array.isArray(j)?j:(j.books||j.data||j.records||Object.values(j).find(Array.isArray)||[]);
    } else recs=parseCSV(txt);
    const books=flatToBooks(recs);
    if(!books.length){msg.textContent="Aucun livre reconnu : il faut une colonne title ou titre.";return;}
    setBooks(books);
    msg.innerHTML=`<strong style="color:var(--ink)">${fmt(books.length)} livres importés.</strong>`;
  }catch(e){msg.textContent="Impossible de lire ce fichier : "+e.message;}
}

/* ---------- Événements ---------- */
let qt;$("#q").addEventListener("input",e=>{clearTimeout(qt);qt=setTimeout(()=>{state.q=e.target.value;render();},150);});
for(const id of ["country","scope","status","era","sort"]) $("#"+id).onchange=e=>{state[id]=e.target.value;render();};
$("#chips").onclick=e=>{const c=e.target.closest(".chip");if(!c)return;const r=c.dataset.r;state.reasons.has(r)?state.reasons.delete(r):state.reasons.add(r);c.setAttribute("aria-pressed",state.reasons.has(r));render();};
$("#grid").onclick=e=>{const b=e.target.closest(".book");if(b)openBook(current[+b.dataset.i]);};
$("#more").onclick=more;
$("#random").onclick=()=>{const pool=current.length?current:BOOKS;if(pool.length)openBook(pool[Math.floor(Math.random()*pool.length)]);};
$("#reset").onclick=()=>{resetState();syncControls();render();};
$("#dlg-x").onclick=()=>$("#dlg").close();
$("#dlg").onclick=e=>{if(e.target.id==="dlg")$("#dlg").close();};
$("#file").onchange=e=>e.target.files.length&&handleFiles([...e.target.files]);
const drop=$("#drop");
["dragover","dragenter"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add("over");}));
["dragleave","drop"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove("over");}));
drop.addEventListener("drop",e=>e.dataTransfer.files.length&&handleFiles([...e.dataTransfer.files]));
$("#restore").onclick=()=>{if(window.BB_DATA){load(window.BB_DATA);$("#import-msg").textContent="Données intégrées restaurées.";}};
window.addEventListener("hashchange",route);

route();
setTimeout(()=>{ if(window.BB_DATA) load(window.BB_DATA); else $("#grid").innerHTML='<div class="empty">Les données n\'ont pas pu être chargées.</div>'; },0);