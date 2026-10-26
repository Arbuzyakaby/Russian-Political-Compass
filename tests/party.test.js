"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./harness.js");
function app(){ return loadApp(); }
function sample(PC){ return PC.partyModel.normalize({ name:"Союз городов <img onerror=alert(1)>", short:"Города", tag:"СГ", color:"#34d399", sub:PC.partyModel.toSub(-2, -3) }); }
const plain = value => JSON.parse(JSON.stringify(value));

test("normalize: limits, types, unknown fields and six half-step subaxes", () => {
  const {PC}=app(),M=PC.partyModel,p=M.normalize({name:" x ".repeat(70),short:"a".repeat(30),tag:"a".repeat(10),leader:"b".repeat(90),slogan:"c".repeat(140),summary:"d".repeat(700),ideology:"e".repeat(150),color:"red;url(x)",founded:2200,seats:-1,inCoalition:"true",emblem:"evil",family:"evil",kind:"evil",sub:{property:11,civil:-20,regulation:1.3,redistribution:NaN},theses:Array(10).fill("z".repeat(180)),unexpected:"bad",votes:{bogus:"for"}});
  for(const[k,n]of Object.entries({name:60,short:24,tag:8,leader:80,slogan:120,summary:600,ideology:120}))assert.ok(p[k].length<=n,k);
  assert.equal(p.color,"#a5b4fc");assert.equal(p.founded,2100);assert.equal(p.seats,0);assert.equal(p.inCoalition,false);assert.equal(p.emblem,"mono");assert.equal(p.family,"other");assert.equal(p.kind,"movement");assert.equal(p.theses.length,8);assert.ok(p.theses.every(s=>s.length===160));assert.equal(p.unexpected,undefined);assert.deepEqual(plain(p.votes),{});
  assert.equal(p.sub.property,10);assert.equal(p.sub.civil,-10);assert.equal(p.sub.regulation,1.5);assert.equal(p.sub.redistribution,0);
});
test("fromSub averages three axes; toSub distributes direct values equally",()=>{
  const {PC}=app(),M=PC.partyModel,sub=M.toSub(3.2,-4.9);assert.equal(sub.property,3);assert.equal(sub.civil,-5);assert.deepEqual(plain(M.fromSub(sub)),{x:3,y:-5});
  sub.property=-3;assert.equal(M.fromSub(sub).x,1);assert.equal(M.normalize({sub}).x,1);
});
test("P1 links round-trip Unicode, markup-shaped text, votes and optional declared point",()=>{
  const {PC}=app(),M=PC.partyModel,p=sample(PC);p.declared={x:1,y:2,note:"<script> ☀"};p.votes[PC.VOTES[0].id]="against";const code=M.encode(p);assert.match(code,/^P1\.[A-Za-z0-9_-]+$/);assert.ok(code.length<=1800);assert.deepEqual(plain(M.decode(code)),plain(p));
});
test("P1 rejects corruption, trailing junk, excess length, unknown fields and noncanonical base64",()=>{
  const {PC}=app(),M=PC.partyModel,p=sample(PC),code=M.encode(p);
  for(const invalid of [code+"!",code+"=",code.slice(0,-3),"P2."+code.slice(3),"P1."+"a".repeat(4000),null]){assert.equal(M.decode(invalid),null);assert.ok(M.error());}
  const a=JSON.parse(Buffer.from(code.slice(3),"base64url").toString());a[4]="invalid";assert.equal(M.decode("P1."+Buffer.from(JSON.stringify(a)).toString("base64url")),null);assert.equal(M.error(),"schema");
});
test("P1 reports oversized manifests instead of truncating them",()=>{
  const {PC}=app(),M=PC.partyModel,p=sample(PC);p.summary="Я".repeat(600);p.theses=Array(8).fill("Я".repeat(160));assert.equal(M.encode(p),null);assert.equal(M.error(),"too-long");
});
test("collection uses unique u1–u6 slots, enforces limit and updates in place",()=>{
  const {PC}=app(),M=PC.partyModel;for(let i=0;i<6;i++)assert.equal(M.save(sample(PC),true).id,"u"+(i+1));assert.equal(M.save(sample(PC),true),null);assert.equal(M.error(),"limit");const p=M.list()[2];p.name="Edited";assert.ok(M.save(p));assert.equal(M.list().length,6);assert.equal(M.list()[2].name,"Edited");M.remove("u2");assert.equal(M.save(sample(PC),true).id,"u2");
});
test("collection persistence, legacy array migration and damaged storage recovery",()=>{
  const {PC,storage}=app(),M=PC.partyModel,p=sample(PC);storage.setItem(M.KEY,JSON.stringify([p]));assert.equal(M.load().migrated,true);assert.equal(JSON.parse(storage.getItem(M.KEY)).v,1);assert.equal(M.list().length,1);storage.setItem(M.KEY,'{"v":1,"list":[{}]}');assert.equal(M.load().reset,true);assert.equal(M.list().length,0);storage.setItem(M.KEY,"broken");assert.equal(M.load().reset,true);storage.setItem(M.DRAFT,'{"keep":true}');M.load();assert.equal(storage.getItem(M.DRAFT),'{"keep":true}');
});
test("duplicate ids and future storage versions are rejected",()=>{
  const {PC,storage}=app(),M=PC.partyModel,p=sample(PC);for(const data of [{v:2,list:[]},{v:1,list:[p,p]},{v:1,list:Array(7).fill(p)}]){storage.setItem(M.KEY,JSON.stringify(data));assert.equal(M.load().reset,true);}
});
test("nearest uses the shared distance calculation and only real parties",()=>{
  const {PC}=app(),M=PC.partyModel,p=M.normalize(PC.PARTIES[0]);M.save(p,true);const rows=M.nearest(p,3);assert.equal(rows[0].p.id,PC.PARTIES[0].id);assert.equal(rows[0].d,PC.calc.distance(p,PC.PARTIES[0]));assert.equal(rows.length,3);assert.ok(rows.every(r=>!/^u/.test(r.p.id)));assert.ok(rows[0].d<=rows[1].d&&rows[1].d<=rows[2].d);
});
test("voteMatch excludes unknowns, non-participation and missing factions",()=>{
  const {PC}=app(),M=PC.partyModel,p=sample(PC),er=PC.partyById("er");PC.VOTES.forEach(v=>{const st=PC.voteStance(v,er);if(["for","against","abstain"].includes(st))p.votes[v.id]=st;});let row=M.voteMatch(p).find(r=>r.p.id==="er");assert.equal(row.ratio,1);assert.ok(row.common>20);const id=Object.keys(p.votes)[0];p.votes[id]="absent";assert.equal(M.voteMatch(p).find(r=>r.p.id==="er").common,row.common-1);assert.equal(M.voteMatch(M.normalize({}))[0].ratio,null);
});
test("hypothetical allocation totals 450 across every convocation and oversized requests",()=>{
  const {PC}=app(),M=PC.partyModel,p=sample(PC);p.inCoalition=true;p.seats=98;for(const c of PC.CONVOCATIONS){const rows=M.hypothetical(c.id,[p]);assert.equal(rows.reduce((s,r)=>s+r.seats,0),450);assert.equal(rows.find(r=>r.p.id===p.id).seats,98);assert.ok(rows.every(r=>Number.isInteger(r.seats)&&r.seats>=0));}
  const other=M.normalize({...p,id:"u2",seats:450});p.seats=450;assert.equal(M.hypothetical(9,[p,other]).reduce((s,r)=>s+r.seats,0),450);
});
test("coalition calculations use scenario seats without mutating real data",()=>{
  const {PC}=app(),M=PC.partyModel,before=JSON.stringify(PC.PARTIES);M.save({...sample(PC),inCoalition:true,seats:98},true);const result=PC.coalition.evaluate(["u1"],9);assert.equal(result.seats,98);assert.equal(result.metrics.total,98);assert.equal(JSON.stringify(PC.PARTIES),before);
});
test("party JSON export/import preserves schema and reports skipped entries and limit",()=>{
  const {PC}=app(),M=PC.partyModel;M.save(sample(PC),true);const data=JSON.parse(M.exportJSON());assert.equal(data.format,"politcompass-parties");assert.equal(data.v,1);data.list.push({bad:true});assert.deepEqual(plain(M.importJSON(data)),{added:1,skipped:1});assert.ok(M.importJSON("bad").error);assert.ok(M.importJSON({v:5,list:[]}).error);for(let i=0;i<6;i++)M.save(sample(PC),true);assert.deepEqual(plain(M.importJSON({format:data.format,v:1,list:[data.list[0]]})),{added:0,skipped:1});
});
test("failed writes do not publish unsaved changes",()=>{
  const {PC}=app(),M=PC.partyModel;PC.store.setJSON=()=>false;assert.equal(M.save(sample(PC),true),null);assert.equal(M.error(),"storage");assert.equal(M.list().length,0);
});
