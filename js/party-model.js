/* Tisza: pure party calculations and a versioned, local-only collection. */
(function(PC){
  "use strict";
  var KEY = "pc-my-parties", DRAFT = "pc-party-draft", LIMIT = 6;
  var FAMILIES = ["social-democracy", "communism", "liberalism", "libertarianism", "conservatism", "nationalism", "monarchism", "green", "populism", "technocracy", "anarchism", "centrism", "other"];
  var KINDS = ["parliamentary", "opposition", "regional", "movement"];
  var EMBLEMS = ["mono", "sun", "leaf", "star", "wave", "mountain", "compass", "bridge", "tree", "spark", "shield", "book", "heart", "globe", "flag", "flower", "bolt", "diamond", "circle", "arrow", "anchor", "scales", "bird", "grain", "orbit"];
  var list = [], error = null;
  function obj(v){ return !!v && typeof v === "object" && !Array.isArray(v); }
  function text(v, n){ return typeof v === "string" ? v.trim().slice(0, n) : ""; }
  function num(v, lo, hi, fallback){ return typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback; }
  function half(v){ return Math.round(num(v, -10, 10, 0) * 2) / 2; }
  function iso(v, fallback){ return typeof v === "string" && /^\d{4}-\d\d-\d\dT/.test(v) && isFinite(Date.parse(v)) ? new Date(v).toISOString() : fallback; }
  function fromSub(sub){
    var out = { x:0, y:0 };
    PC.SUBAXES.forEach(function(a){ out[a.axis] += half(sub && sub[a.id]) / 3; });
    return out;
  }
  function toSub(x, y){
    var out = {};
    PC.SUBAXES.forEach(function(a){ out[a.id] = half(a.axis === "x" ? x : y); });
    return out;
  }
  function normalize(raw){
    raw = obj(raw) ? raw : {};
    var now = new Date().toISOString(), sub = {}, votes = {};
    PC.SUBAXES.forEach(function(a){ sub[a.id] = half(raw.sub && raw.sub[a.id]); });
    PC.VOTES.forEach(function(v){
      var s = raw.votes && raw.votes[v.id];
      if(["for", "against", "abstain", "absent"].indexOf(s) !== -1) votes[v.id] = s;
    });
    var pt = fromSub(sub);
    var p = {
      id:/^u[1-6]$/.test(raw.id) ? raw.id : "u1",
      name:text(raw.name, 60), short:text(raw.short, 24), tag:text(raw.tag, 8),
      color:/^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color.toLowerCase() : "#a5b4fc",
      emblem:EMBLEMS.indexOf(raw.emblem) !== -1 ? raw.emblem : "mono",
      founded:Math.round(num(raw.founded, 1990, 2100, 2026)), leader:text(raw.leader, 80),
      slogan:text(raw.slogan, 120), summary:text(raw.summary, 600),
      family:FAMILIES.indexOf(raw.family) !== -1 ? raw.family : "other",
      ideology:text(raw.ideology, 120), kind:KINDS.indexOf(raw.kind) !== -1 ? raw.kind : "movement",
      sub:sub, x:pt.x, y:pt.y,
      theses:Array.isArray(raw.theses) ? raw.theses.slice(0, 8).map(function(s){ return text(s, 160); }).filter(Boolean) : [],
      votes:votes, seats:Math.round(num(raw.seats, 0, 450, 0)), inCoalition:raw.inCoalition === true,
      created:iso(raw.created, now), updated:iso(raw.updated, now)
    };
    if(obj(raw.declared)) p.declared = { x:half(raw.declared.x), y:half(raw.declared.y), note:text(raw.declared.note, 300) };
    return p;
  }
  function nearest(p, n){ return PC.calc.rankParties(p).slice(0, n == null ? 3 : Math.max(0, n)); }
  function voteMatch(p){
    return PC.PARTIES.map(function(real){
      var same = 0, common = 0;
      PC.VOTES.forEach(function(v){
        var a = p.votes[v.id], b = PC.voteStance(v, real);
        if(!a || a === "absent" || b === "absent" || b === "unknown") return;
        common++; if(a === b) same++;
      });
      return { p:real, same:same, common:common, ratio:common ? same / common : null };
    });
  }
  /* 4.1: предел ссылки P1 поднят с 1800 до 4000 знаков. Русский шаблон
     с программой и 28 голосованиями занимает около 2600 знаков (кириллица
     в UTF-8 и base64 втрое длиннее латиницы), и при 1800 ни одним шаблоном
     нельзя было поделиться. 4000 знаков спокойно проходят в адресной
     строке и в мессенджерах; формат P1 при этом не меняется. */
  var P1_MAX = 4000;
  var FIELDS = ["id", "name", "short", "tag", "color", "emblem", "founded", "leader", "slogan", "summary", "family", "ideology", "kind", "sub", "declared", "theses", "votes", "seats", "inCoalition", "created", "updated"];
  function pack(p){ return FIELDS.map(function(k){ return p[k] === undefined ? null : p[k]; }); }
  function unpack(a){ var p = {}; FIELDS.forEach(function(k, i){ if(a[i] !== null) p[k] = a[i]; }); return p; }
  function fail(code){ error = code; return null; }
  function encode(raw){
    error = null;
    try{
      var code = "P1." + btoa(unescape(encodeURIComponent(JSON.stringify(pack(normalize(raw)))))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      return code.length <= P1_MAX ? code : fail("too-long");
    }catch(e){ return fail("invalid"); }
  }
  function decode(code){
    error = null;
    if(typeof code !== "string" || code.length > P1_MAX) return fail("too-long");
    if(!/^P1\.[A-Za-z0-9_-]+$/.test(code)) return fail("format");
    try{
      var body = code.slice(3), a = JSON.parse(decodeURIComponent(escape(atob(body.replace(/-/g, "+").replace(/_/g, "/")))));
      if(!Array.isArray(a) || a.length !== FIELDS.length) return fail("schema");
      var p = normalize(unpack(a));
      if(JSON.stringify(pack(p)) !== JSON.stringify(a)) return fail("schema");
      if(encode(p) !== code) return fail("format");
      return p;
    }catch(e){ return fail("invalid"); }
  }
  function valid(raw){
    return obj(raw) && typeof raw.name === "string" && /^#[0-9a-f]{6}$/i.test(raw.color) && obj(raw.sub) &&
      PC.SUBAXES.every(function(a){ return typeof raw.sub[a.id] === "number" && isFinite(raw.sub[a.id]); });
  }
  function persist(){ return PC.store.setJSON(KEY, { v:1, list:list }); }
  function notify(){ if(typeof document !== "undefined" && typeof CustomEvent !== "undefined") document.dispatchEvent(new CustomEvent("pc:parties")); }
  function load(){
    var raw = PC.store.get(KEY, null);
    list = [];
    if(raw === null) return { reset:false, migrated:false };
    try{
      var data = JSON.parse(raw), migrated = Array.isArray(data);
      var src = migrated ? data : data && data.v === 1 && data.list;
      if(!Array.isArray(src) || src.length > LIMIT || !src.every(valid)) throw new Error("schema");
      var ids = {};
      list = src.map(function(p, i){
        var n = normalize(p);
        if(migrated) n.id = "u" + (i + 1);
        if(ids[n.id]) throw new Error("duplicate");
        ids[n.id] = true; return n;
      });
      if(migrated) persist();
      return { reset:false, migrated:migrated };
    }catch(e){ list = []; persist(); return { reset:true, migrated:false }; }
  }
  function save(raw, asNew){
    var p = normalize(raw), ix = asNew ? -1 : list.findIndex(function(x){ return x.id === p.id; });
    if(ix === -1){
      if(list.length >= LIMIT) return fail("limit");
      p.id = ["u1", "u2", "u3", "u4", "u5", "u6"].find(function(id){ return !list.some(function(x){ return x.id === id; }); });
      p.created = new Date().toISOString();
    }
    p.updated = new Date().toISOString();
    var before = list.slice();
    if(ix < 0) list.push(p); else list[ix] = p;
    if(!persist()){ list = before; return fail("storage"); }
    error = null; notify(); return p;
  }
  function remove(id){
    var old = list.slice(), p = list.find(function(x){ return x.id === id; });
    list = list.filter(function(x){ return x.id !== id; });
    if(!persist()){ list = old; return null; } notify(); return p;
  }
  function exportJSON(){ return JSON.stringify({ format:"politcompass-parties", v:1, list:list }, null, 2); }
  function importJSON(json){
    var data;
    try{ data = typeof json === "string" ? JSON.parse(json) : json; }catch(e){ return { added:0, skipped:0, error:"json" }; }
    if(!obj(data) || data.v !== 1 || data.format !== "politcompass-parties" || !Array.isArray(data.list) || data.list.length > 100) return { added:0, skipped:0, error:"schema" };
    var added = 0, skipped = 0;
    data.list.forEach(function(raw){ if(valid(raw) && save(raw, true)) added++; else skipped++; });
    return { added:added, skipped:skipped };
  }
  /* Метод наибольших остатков: целые доли, сумма которых ровно total.
     Общий для гипотетической палаты и для модели выборов (js/party-election.js). */
  function apportion(weights, total){
    var sum = weights.reduce(function(s, w){ return s + Math.max(0, w); }, 0), out = weights.map(function(){ return 0; });
    if(!(sum > 0) || !(total > 0)) return out;
    var k = Math.abs(sum - total) < 1e-9 ? 1 : total / sum;
    var rows = weights.map(function(w, i){ var q = Math.max(0, w) * k; return { i:i, n:Math.floor(q), r:q - Math.floor(q) }; });
    var rest = total - rows.reduce(function(s, r){ return s + r.n; }, 0);
    rows.slice().sort(function(a, b){ return (b.r - a.r) || (a.i - b.i); }).slice(0, rest).forEach(function(r){ r.n++; });
    rows.forEach(function(r){ out[r.i] = r.n; });
    return out;
  }
  /* Largest remainders preserve exactly 450 seats, including independents. */
  function hypothetical(conv, own){
    own = (own || list).filter(function(p){ return p.inCoalition && p.seats > 0; });
    var requested = own.reduce(function(s, p){ return s + p.seats; }, 0);
    var ownTotal = Math.min(450, requested), remaining = 450 - ownTotal;
    var real = PC.PARTIES.filter(function(p){ return PC.seatsAt(p, conv) > 0; });
    var held = real.reduce(function(s, p){ return s + PC.seatsAt(p, conv); }, 0);
    var rows = real.map(function(p){ return { p:p, weight:PC.seatsAt(p, conv) * remaining / 450 }; });
    if(held < 450) rows.push({ p:{ id:"independent", name:"", x:0, y:0 }, weight:(450 - held) * remaining / 450 });
    own.forEach(function(p){ rows.push({ p:p, weight:requested > 450 ? p.seats / requested * 450 : p.seats }); });
    var seats = apportion(rows.map(function(r){ return r.weight; }), 450);
    rows.forEach(function(r, i){ r.seats = seats[i]; });
    return rows;
  }
  PC.partyModel = { normalize:normalize, fromSub:fromSub, toSub:toSub, nearest:nearest, voteMatch:voteMatch,
    encode:encode, decode:decode, error:function(){ return error; }, FAMILIES:FAMILIES, KINDS:KINDS, EMBLEMS:EMBLEMS,
    load:load, list:function(){ return list.slice(); }, save:save, remove:remove, importJSON:importJSON, exportJSON:exportJSON,
    hypothetical:hypothetical, apportion:apportion, valid:valid, KEY:KEY, DRAFT:DRAFT, LIMIT:LIMIT };
  PC.allParties = function(){ return PC.PARTIES.concat(list); };
})(window.PC = window.PC || {});
