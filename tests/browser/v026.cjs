const assert=require('assert/strict');
module.exports=async function verifyAudit(context,url){
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'/?clean&sharedheaders');await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 const prompt=await page.evaluate(async()=>{
  const source=[{role:'system',content:'Keep ::img general forest:: instructions'},{role:'assistant',content:'RP ::img general forest::'},{role:'user',content:[{type:'text',text:'Text ::img general forest::'},{type:'image_url',image_url:{url:'unchanged'}}]}],before=JSON.stringify(source),payload={chat:source};
  for(const fn of events.CHAT_COMPLETION_PROMPT_READY||[])await fn(payload);
  return {source:JSON.stringify(source)===before,clean:!payload.chat[1].content.includes('::img'),parts:payload.chat[2].content[0].text==='Text ',system:payload.chat[0]===source[0],image:payload.chat[2].content[1]===source[2].content[1]};
 });assert.deepEqual(prompt,{source:true,clean:true,parts:true,system:true,image:true});
 // Lazy previews and an explicit bulk check share the same three-request limit.
 let active=0,peak=0,release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/api/sprites/get?*',async route=>{active++;peak=Math.max(peak,active);await gate;active--;const folder=new URL(route.request().url()).searchParams.get('name');await route.fulfill({json:[{label:'neutral',path:`/characters/${folder}/neutral.png`}]});});
 await page.evaluate(()=>{for(let i=0;i<14;i++)ImmersiveGroupsSceneLibrary.addOutfit('alex.png','Alex/check'+i,'Check '+i);ImmersiveGroupsGallery.openLibrary({type:'outfit'});window.auditCheck=ImmersiveGroupsSceneLibrary.checkOutfitImages().then(()=>window.auditChecked=true);});
 for(let i=0;i<100&&active<3;i++)await page.waitForTimeout(10);assert.equal(active,3);release();await page.waitForFunction(()=>window.auditChecked);assert.equal(peak,3);
 await page.keyboard.press('Escape');await page.unroute('**/api/sprites/get?*');
 // Concurrent imports into one folder must read the updated destination list.
 const stems=['neutral'],uploads=[];
 await page.route('**/api/sprites/get?*',async route=>{const folder=new URL(route.request().url()).searchParams.get('name');await route.fulfill({json:stems.map(stem=>({label:'neutral',path:`/characters/${folder}/${stem}.png`}))});});
 await page.route('**/api/sprites/upload',async route=>{const body=route.request().postDataBuffer().toString('latin1'),stem=body.match(/name="spriteName"\r\n\r\n([^\r\n]+)/)?.[1];assert.ok(stem);uploads.push(stem);stems.push(stem);await route.fulfill({json:{ok:true}});});
 const imports=await page.evaluate(async()=>{
  const {uploadOutfitImages}=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/outfit-files.js');
  const file=()=>new File([new Uint8Array([1,2,3])],'neutral.png',{type:'image/png'});
  const results=await Promise.all([uploadOutfitImages('Alex/import',[file()]),uploadOutfitImages('Alex\\import',[file()])]);
  return {results,headers:sharedRequestHeaders};
 });assert.deepEqual(uploads,['neutral-1','neutral-2']);assert.equal(imports.headers['Content-Type'],'application/json');assert.ok(imports.results.every(r=>r.uploaded===1));
 await page.unroute('**/api/sprites/get?*');await page.unroute('**/api/sprites/upload');
 // A completed upload saves to its original owner but never reopens a closed modal.
 let uploadStarted,finishUpload;const started=new Promise(resolve=>uploadStarted=resolve),uploadGate=new Promise(resolve=>finishUpload=resolve);
 await page.route('**/api/images/upload',async route=>{uploadStarted();await uploadGate;await route.fulfill({json:{path:'user/images/LocalImage-General/audit-upload.png'}});});
 await page.evaluate(()=>ImmersiveGroupsGallery.openLibrary({type:'image'}));await page.locator('.ig-unified-library').getByRole('button',{name:'Upload / manage image files',exact:true}).click();
 await page.locator('#local-image-gallery-root input[type=file]').setInputFiles({name:'audit-upload.png',mimeType:'image/png',buffer:Buffer.from([1,2,3])});await started;
 await page.locator('#local-image-gallery-root button[title=Close]').click();assert.equal(await page.locator('#local-image-gallery-root .local-image-modal').count(),0);finishUpload();
 await page.waitForFunction(()=>ctx.extensionSettings.ImmersiveGroups.gallery.generalAssignments['audit-upload']);await page.waitForTimeout(80);assert.equal(await page.locator('#local-image-gallery-root .local-image-modal').count(),0);await page.unroute('**/api/images/upload');
 // Malformed aliases stay harmless; valid aliases still render.
 await page.evaluate(()=>{const s=ctx.extensionSettings.ImmersiveGroups.gallery;s.generalAssignments.forest={path:'user/images/LocalImage-General/forest.png',aliases:[null,5,'oldforest']};const row=document.createElement('div');row.className='mes';row.id='audit-alias';row.setAttribute('mesid','0');row.innerHTML='<div class="mes_text"><p><em>::img general oldforest::</em></p><p><q>Keep formatting</q></p></div>';document.getElementById('chat').append(row);emit('SETTINGS_UPDATED');});
 await page.waitForSelector('#audit-alias .localimage-inserted');assert.equal(await page.locator('#audit-alias q').textContent(),'Keep formatting');
 // Streaming one row must not walk every previous message for scene commands.
 await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.gallery.enabled=false;ctx.extensionSettings.ImmersiveGroups.sceneAutomation.enabled=true;window.dispatchEvent(new Event('ig-layout-change'));});
 await page.waitForTimeout(120);
 await page.evaluate(()=>{window.walkedRows=[];const original=document.createTreeWalker.bind(document);document.createTreeWalker=(node,...args)=>{if(node?.matches?.('.mes_text'))walkedRows.push(node);return original(node,...args);};document.querySelector('#chat .mes:last-child .mes_text').append(document.createTextNode(' ::background "forest.jpg"::'));});
 await page.waitForFunction(()=>walkedRows.length>0);assert.equal(await page.evaluate(()=>new Set(walkedRows).size),1);
 assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeChat),true);assert.deepEqual(errors,[]);await page.close();
};
