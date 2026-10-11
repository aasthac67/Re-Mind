const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const ts=require(root+'/node_modules/typescript');
const {parseEnv}=require('node:util');
const config=parseEnv(fs.readFileSync(root+'/.env.local','utf8'));
const {configure}=require('./setup-dial.cjs');
async function main(){
 const scratch=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'remind-store-check-'));
 for(const name of ['workspace','demo-data','task-store']){const code=ts.transpileModule(fs.readFileSync(root+'/lib/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;fs.writeFileSync(scratch+'/'+name+'.js',code);}
 const setupDir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'remind-setup-check-')); configure(setupDir,'+14155550123'); const before=fs.readFileSync(setupDir+'/.env.local','utf8'); configure(setupDir,'+14155550999'); assert.equal(fs.readFileSync(setupDir+'/.env.local','utf8'),before); assert.throws(()=>configure(setupDir,'bad')); console.log('PASS: repeated setup preserves existing settings; invalid caller rejected');
 process.chdir(scratch);const store=require(scratch+'/task-store.js');
 const input={title:'Test persisted rental task',project:'Seattle Trip',requestId:'test-1'};
 const [a,b]=await Promise.all([store.createTask(input,'Dial call'),store.createTask(input,'Dial call')]);assert.equal(a.id,b.id);
 assert.equal((await store.listTasks()).filter(t=>t.id===a.id).length,1);
 await store.updateTask(a.id,'blocked','Dial call');assert.equal((await store.projectContext('Seattle Trip')).tasks.find(t=>t.id===a.id).status,'blocked');
 await assert.rejects(()=>store.createTask({...input,project:'Unknown',requestId:'test-2'},'Dial call'));
 console.log('PASS: persistence, retry deduplication, concurrent writes, status updates, project validation');
 const url='http://127.0.0.1:3000/api/dial/mcp';
 const headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'};
 const init={jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'remind-test',version:'1'}}};
 assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify(init)})).status,401);
 const auth={...headers,Authorization:'Bearer '+config.REMIND_MCP_TOKEN};
 const response=await fetch(url,{method:'POST',headers:auth,body:JSON.stringify(init)});assert.equal(response.status,200);assert.ok((await response.json()).result.serverInfo);
 const tools=await fetch(url,{method:'POST',headers:auth,body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list',params:{}})});assert.equal((await tools.json()).result.tools.length,4);
 const call={jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'list_tasks',arguments:{}}};
 const denied=await fetch(url,{method:'POST',headers:auth,body:JSON.stringify(call)});assert.equal((await denied.json()).result.isError,true);
 const allowed={...auth,'x-dial-direction':'inbound','x-dial-agent-number':config.DIAL_NUMBER,'x-dial-user-number':config.DIAL_ALLOWED_CALLERS.split(',')[0]};
 const permitted=await fetch(url,{method:'POST',headers:allowed,body:JSON.stringify(call)});const result=await permitted.json();assert.ok(!result.result.isError);assert.ok(JSON.parse(result.result.content[0].text).length>=4);
 const spoofed=await fetch('http://127.0.0.1:3000/api/tasks',{headers:{origin:'https://evil.example'}});assert.equal(spoofed.status,403);
 console.log('PASS: MCP initialization, discovery, missing-token rejection, caller authorization, cross-origin API rejection');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
