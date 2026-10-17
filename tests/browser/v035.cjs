// SPDX-License-Identifier: AGPL-3.0-only
const assert=require('assert/strict'),fs=require('fs/promises'),path=require('path');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
module.exports=async(context,url)=>{
 const page=await context.newPage(),errors=[],uploads=[];let changed=false;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/characters/**',route=>route.fulfill({contentType:'image/png',body:changed?Buffer.concat([png,Buffer.from('different bytes')]):png}));
 await page.route('**/api/sprites/get?**',route=>{const folder=new URL(route.request().url()).searchParams.get('name');return route.fulfill({json:['Alex/outfit1','Alex/second'].includes(folder)?[{label:'neutral',path:`/characters/${folder}/neutral.png?t=fixed`}]:[]});});
 await page.route('**/api/sprites/upload',route=>{uploads.push(route.request().url());return route.fulfill({json:{ok:true}});});
 await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 await page.evaluate(()=>{const s=ctx.extensionSettings.ImmersiveGroups;s.autoDiscoverOutfits=false;s.outfitCatalog['alex.png'].outfits=[{folder:'Alex/outfit1',label:'Main',description:'Main outfit'},{folder:'Alex/second',label:'Second',description:'Second outfit'}];ImmersiveGroupsTransfers.open();});
 const dialog=page.locator('.ig-transfer-dialog');await dialog.getByRole('button',{name:'Clear characters',exact:true}).click();await dialog.locator('.ig-transfer-characters input[value="alex.png"]').check();
 await dialog.getByRole('textbox',{name:'Bundle name',exact:true}).fill('0.3.5 fixture');await dialog.getByRole('textbox',{name:'Pack version',exact:true}).fill('1.0.0');
 const picker=dialog.locator('.ig-transfer-outfit-picker');await picker.locator('summary').click();
 assert.match(await picker.textContent(),/Alex \/ Main/);assert.match(await picker.textContent(),/Alex \/ Second/);
 const entries=picker.locator('[data-transfer-export-outfit]');for(const entry of await entries.all())if((await entry.getAttribute('data-transfer-export-outfit'))!==JSON.stringify(['alex.png','Alex/second']))await entry.uncheck();assert.match(await picker.locator('summary').textContent(),/1 selected/);
 async function downloadPack(){const pending=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download named ZIP',exact:true}).click();const download=await pending;const bytes=await fs.readFile(await download.path());await page.waitForFunction(()=>!document.querySelector('.ig-transfer-dialog').matches('[aria-busy="true"]'));return bytes;}
 const bytes=await downloadPack();const first=await page.evaluate(async bytes=>{window.pack=await ImmersiveGroupsTransfers.inspectBundle(new File([new Uint8Array(bytes)],'pack.zip'));return pack.manifest;},Array.from(bytes));
 assert.equal(first.pack.version,'1.0.0');assert.equal(first.extensionVersion,'0.3.5');assert.deepEqual(first.characters[0].outfits.map(o=>o.folder),['Alex/second']);assert.equal(first.assets.filter(a=>a.kind==='sprite').length,1);
 await dialog.getByRole('textbox',{name:'Pack version',exact:true}).fill('1.1.0');const next=await downloadPack();const second=await page.evaluate(async bytes=>(await ImmersiveGroupsTransfers.inspectBundle(new File([new Uint8Array(bytes)],'next.zip'))).manifest,Array.from(next));assert.equal(second.pack.id,first.pack.id);assert.equal(second.pack.version,'1.1.0');
 await dialog.getByRole('button',{name:'Import',exact:true}).click();await dialog.locator('input[type=file]').setInputFiles({name:'pack.zip',mimeType:'application/zip',buffer:bytes});
 const row=dialog.locator('.ig-transfer-outfit-row');await page.waitForFunction(()=>document.querySelector('[data-transfer-outfit]')&&!document.querySelector('[data-transfer-outfit]').disabled);
 assert.match(await picker.textContent(),/Alex \/ Second/);assert.equal(await picker.evaluate(n=>n.open),true);assert.match(await row.textContent(),/Conflict found for this outfit/);assert.equal(await row.locator('input[type=checkbox]').isChecked(),false);
 await row.getByText('1 file comparisons',{exact:true}).click();assert.match(await row.textContent(),/Identical bytes and filename/);assert.match(await row.textContent(),/SHA-256/);
 await row.locator('input[type=checkbox]').check();const apply=dialog.getByRole('button',{name:'Apply selected import',exact:true});assert.equal(await apply.isDisabled(),true);await dialog.locator('[data-transfer-overwrite-ack]').check();await apply.click();await page.waitForFunction(()=>document.querySelector('.ig-transfer-status').textContent.startsWith('Imported'));
 assert.equal(uploads.length,0);assert.match(await dialog.locator('.ig-transfer-status').textContent(),/1 byte-identical/);
 await page.waitForFunction(()=>document.querySelector('[data-transfer-outfit]')&&!document.querySelector('[data-transfer-outfit]').disabled);assert.match(await row.textContent(),/same as last processed version 1.0.0/);
 // Same timestamp and inventory, changed bytes: a saved review must fail before writes.
 await page.evaluate(async()=>{window.args={mappingValues:{'alex.png':'alex.png'},roots:{'alex.png':'Alex'},categories:pack.manifest.options,selection:pack.manifest.selection};window.proof=await ImmersiveGroupsTransfers.reviewDestinations(pack.manifest,args);});changed=true;
 const stale=await page.evaluate(async()=>{const before=JSON.stringify(ctx.extensionSettings.ImmersiveGroups);try{await ImmersiveGroupsTransfers.importBundle(pack,{...args,conflictReview:proof,overwriteAcknowledged:true});return {};}catch(error){return {error:error.message,unchanged:before===JSON.stringify(ctx.extensionSettings.ImmersiveGroups)};}});assert.match(stale.error,/changed since review/);assert.equal(stale.unchanged,true);assert.equal(uploads.length,0);
 await dialog.getByRole('button',{name:'Recheck outfit conflicts',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.ig-transfer-outfit-row')?.textContent.includes('Different file contents'));assert.equal(await row.locator('input[type=checkbox]').isChecked(),false);
 await page.setViewportSize({width:390,height:844});assert.equal(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth),true);await page.screenshot({path:path.join(__dirname,'../artifacts/v035-outfit-review-mobile.png')});
 assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeChat),true);assert.deepEqual(errors,[]);await page.close();
 console.log('PASS: outfit count dropdowns, export exclusions, pack revisions, per-outfit comparisons, identical-file skips and same-timestamp stale approvals.');
};
