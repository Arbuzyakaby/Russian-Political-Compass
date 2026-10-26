"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),net=require("node:net"),http=require("node:http"),{spawn}=require("node:child_process"),path=require("node:path");
test("local server rejects malformed URI and path escapes, then continues serving",async()=>{
  const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>resolve(p));});});
  const child=spawn(process.execPath,[path.join(__dirname,"server.js")],{env:{...process.env,PC_PORT:String(port),PC_ROOT:path.join(__dirname,"..")},stdio:["ignore","pipe","pipe"]});
  try{
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error("server timeout")),5000);child.once("error",reject);child.stdout.on("data",()=>{clearTimeout(timer);resolve();});});
    async function status(route){return new Promise((resolve,reject)=>http.get({host:"127.0.0.1",port,path:route},r=>{r.resume();resolve(r.statusCode);}).on("error",reject));}
    assert.equal(await status("/%FF"),400);assert.equal(await status("/%00"),400);assert.equal(await status("/%2e%2e%5coutside"),403);assert.equal(await status("/index.html"),200);
  }finally{child.kill();}
});
