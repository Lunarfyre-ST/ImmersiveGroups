const assert=require('assert/strict'),path=require('path'),{build}=require('esbuild');
module.exports=async function verifySanitization(context,url){
 const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/parser-probe/'))requests.push(r.url());});
 await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 const bundle=await build({entryPoints:[path.resolve(__dirname,'../../gallery/src/gallery-model.js')],bundle:true,write:false,format:'iife',globalName:'IGSecurityModel',platform:'browser',target:'es2022'});
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 const checks=await page.evaluate(()=>{
  window.parserExecuted=false;const before=JSON.stringify(ctx.chat);
  const text='<script>window.parserExecuted=true; ::img general hidden::</script ignored=x><iframe src="/parser-probe/frame">::img general hidden::</iframe><img src="/parser-probe/image" onerror="window.parserExecuted=true"><pre><pre>Example</pre>::img general nested::</pre><p>::img general visible::</p>';
  const real=IGSecurityModel.commandsInText(text).map(m=>m[1]);
  const joined=IGSecurityModel.commandsInText('::img general visible:: ::im<script>discard</script>g general invented::').map(m=>m[1]);
  return {real,joined,executed:window.parserExecuted,untouched:JSON.stringify(ctx.chat)===before};
 });assert.deepEqual(checks,{real:['general visible'],joined:['general visible'],executed:false,untouched:true});await page.waitForTimeout(40);assert.deepEqual(requests,[]);
 // A hidden example with a nonstandard closing tag must not consume the one
 // image slot and suppress the real command later in the same reply.
 await page.evaluate(()=>{
  const s=ctx.extensionSettings.ImmersiveGroups.gallery;s.enabled=true;Object.assign(s.limits,{perMessageEnabled:true,maxPerMessage:1,perRoundEnabled:false,repeatEnabled:false});s.generalAssignments.cabin={path:'user/images/LocalImage-General/cabin.png',description:'Cabin'};
  const id=ctx.chat.length;window.securityMessageId=id;ctx.chat.push({name:'Alex',original_avatar:'alex.png',mes:'<pre>::img general forest::</pre ignored=x>\n::img general cabin::'});
  const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',String(id));const body=document.createElement('div');body.className='mes_text';const pre=document.createElement('pre');pre.textContent='::img general forest::';const p=document.createElement('p');const em=document.createElement('em');em.textContent='Keep formatting';const q=document.createElement('q');q.textContent='Dialogue';p.append(em,q,document.createTextNode(' ::img general cabin::'));body.append(pre,p);row.append(body);document.getElementById('chat').append(row);window.beforeSecurityMessage=JSON.stringify(ctx.chat);
 });
 await page.waitForFunction(()=>document.querySelector(`[mesid="${securityMessageId}"] img.localimage-inserted[alt="cabin"]`));
 assert.equal(await page.locator('#chat > .mes').last().locator('.localimage-suppressed').count(),0);
 assert.equal(await page.locator('#chat > .mes').last().locator('pre').textContent(),'::img general forest::');assert.equal(await page.locator('#chat > .mes').last().locator('em').textContent(),'Keep formatting');assert.equal(await page.locator('#chat > .mes').last().locator('q').textContent(),'Dialogue');
 assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeSecurityMessage),true);assert.deepEqual(errors,[]);await page.close();
};
