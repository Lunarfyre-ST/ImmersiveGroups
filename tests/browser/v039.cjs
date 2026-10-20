const assert=require('node:assert/strict');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
module.exports=async(context,url)=>{
 const page=await context.newPage(),errors=[],uploads=[],files=['neutral.png'];let fail=false,hold=null;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/sprites/get?name=Alex%2Foutfit1',route=>route.fulfill({json:files.map(filename=>({label:filename.split(/[-.]/)[0],path:'/characters/Alex/outfit1/'+filename}))}));
 await page.route('**/api/sprites/upload',async route=>{
  if(hold)await hold;
  if(fail)return route.fulfill({status:500,body:'Upload failed'});
  const data=route.request().postDataBuffer().toString('latin1'),filename=data.match(/filename="([^"]+)"/)?.[1],folder=data.match(/name="name"\r\n\r\n([^\r]+)/)?.[1];
  uploads.push({folder,filename});files.push(filename);return route.fulfill({json:{ok:true}});
 });
 await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 // A character never selected in a chat still has an editable Basic entry.
 const basic=await page.evaluate(async()=>{
  const api=ImmersiveGroupsSceneLibrary,s=ctx.extensionSettings.ImmersiveGroups,c={name:'New character',avatar:'new.png'};ctx.characters.push(c);
  const find=()=>api.getEntries().filter(e=>e.avatar===c.avatar&&e.folder===c.name);
  const before=find();api.addOutfit(c.avatar,c.name+'/other','Other');api.reorderOutfit(before[0],api.getEntries().find(e=>e.avatar===c.avatar&&e.folder===c.name+'/other'));
  const moved=s.outfitCatalog[c.avatar].outfits[0].folder===c.name;
  api.updateOutfit(before[0],{label:'Everyday',description:'Normal clothes',hidden:true});const edited=find()[0];
  api.removeOutfit(edited);const {seedOutfits}=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/outfit-catalog.js');seedOutfits(c,c.name);
  const removed=find().length;api.addOutfit(c.avatar,c.name,'Restored');const restored=find()[0];
  return {before:before.length,moved,edited:{name:edited.name,description:edited.description,hidden:edited.hidden},removed,restored:restored.name,ignored:s.outfitCatalog[c.avatar].ignored};
 });
 assert.deepEqual(basic,{before:1,moved:true,edited:{name:'Everyday',description:'Normal clothes',hidden:true},removed:0,restored:'Restored',ignored:[]});
 await page.evaluate(()=>ImmersiveGroupsGallery.openLibrary({type:'outfit',search:'Alex/outfit1'}));
 const library=page.locator('.ig-unified-library'),card=library.locator('[data-library-kind=outfit]').filter({has:page.locator('code',{hasText:/^Alex\/outfit1$/})});await card.waitFor();
 await card.getByRole('button',{name:'Add expression images',exact:true}).click();
 await library.getByLabel('Expression image files', {exact:true}).setInputFiles([{name:'neutral.png',mimeType:'image/png',buffer:png},{name:'holiday.png',mimeType:'image/png',buffer:png}]);
 const panel=page.getByRole('dialog',{name:'Add expression images',exact:true}),submit=panel.getByRole('button',{name:'Upload expression images',exact:true});
 await panel.getByLabel('Expression for image 1',{exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('[aria-label="Expression for image 1"]').value==='neutral');
 assert.equal(await panel.getByLabel('Expression for image 2',{exact:true}).inputValue(),'');assert.equal(await submit.isDisabled(),true);
 await panel.getByLabel('Expression for image 2',{exact:true}).selectOption('joy');
 await page.setViewportSize({width:390,height:650});assert.equal(await panel.evaluate(n=>n.scrollWidth<=n.clientWidth),true);
 await submit.click();await panel.waitFor({state:'hidden'});
 assert.deepEqual(uploads,[{folder:'Alex/outfit1',filename:'neutral-1.png'},{folder:'Alex/outfit1',filename:'joy.png'}]);
 await card.locator('.ig-library-thumbnail').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>[...document.querySelectorAll('.ig-expression-browser')].some(n=>n.textContent.includes('3 expressions')));
 // Failed writes retain the form and report partial-upload counts honestly.
 await card.getByRole('button',{name:'Add expression images',exact:true}).click();await library.getByLabel('Expression image files',{exact:true}).setInputFiles({name:'joy.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>document.querySelector('[aria-label="Expression for image 1"]').value==='joy');fail=true;await submit.click();await page.waitForFunction(()=>document.querySelector('.ig-library-panel-status').textContent.includes('0 images uploaded before HTTP 500'));
 assert.equal(await panel.isVisible(),true);fail=false;await submit.click();await panel.waitFor({state:'hidden'});assert.equal(uploads.at(-1).filename,'joy-1.png');
 // Unknown/unsafe assignments are rejected before any POST, even outside the UI.
 const rejected=await page.evaluate(async()=>{try{await ImmersiveGroupsSceneLibrary.uploadSprites('Alex/outfit1',[new File(['x'],'x.png')],{expressions:['../bad']});return false;}catch{return true;}});assert.equal(rejected,true);assert.equal(uploads.length,3);
 // A completed upload must not dismiss a different panel opened in the meantime.
 await card.getByRole('button',{name:'Add expression images',exact:true}).click();await library.getByLabel('Expression image files',{exact:true}).setInputFiles({name:'joy.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>document.querySelector('[aria-label="Expression for image 1"]').value==='joy');let release;hold=new Promise(resolve=>{release=resolve;});
 const request=page.waitForRequest('**/api/sprites/upload');await submit.click();await request;await panel.getByRole('button',{name:'Close Add expression images',exact:true}).click();await library.getByRole('button',{name:'Filters',exact:true}).click();
 const response=page.waitForResponse('**/api/sprites/upload');release();await response;hold=null;await page.waitForFunction(()=>document.querySelector('.ig-library-panel-status').textContent.includes('1 sprites uploaded'));
 assert.equal(await page.getByRole('dialog',{name:'Library filters',exact:true}).isVisible(),true);
 assert.deepEqual(errors,[]);await page.close();console.log('PASS: unvisited Basic entries, durable removal/restoration, detected/assigned expression uploads, collision safety, mobile form and upload failure/retry.');
};
