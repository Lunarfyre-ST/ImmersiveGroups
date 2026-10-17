const assert=require('assert/strict'),path=require('path');
module.exports=async function verifySceneTools(context,url){
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:1200,height:1100});await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 // Real pointer dragging must leave the panel under the pointer as its anchor moves.
 await page.locator('#prome-stage-manage').click();await page.locator('[data-live-offsets]').evaluate(n=>n.open=true);
 const slider=page.locator('input[type=range][data-live-setting=stageOffsetY]');await slider.scrollIntoViewIfNeeded();
 const pinned=await page.locator('.ig-live-tuning').boundingBox(),r=await slider.boundingBox();
 await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width*.8,r.y+r.height/2,{steps:8});
 await page.waitForFunction(()=>ctx.extensionSettings.ImmersiveGroups.stageOffsetY>25);
 const dragging=await page.locator('.ig-live-tuning').boundingBox();assert.equal(dragging.x,pinned.x);assert.equal(dragging.y,pinned.y);await page.mouse.up();
 await page.locator('input[type=number][data-live-setting=stageOffsetY]').fill('0');await page.locator('input[type=number][data-live-setting=stageOffsetY]').press('Tab');
 const fit=page.locator('input[type=range][data-live-setting=layoutSpriteScale]');assert.equal(await fit.getAttribute('min'),'-20');assert.equal(await fit.getAttribute('max'),'20');
 await fit.fill('5.5');assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.layoutSpriteScale),105.5);
 const fitNumber=page.locator('input[type=number][data-live-setting=layoutSpriteScale]');await fitNumber.fill('150');await fitNumber.press('Tab');assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.layoutSpriteScale),250);assert.equal(await fit.inputValue(),'20');assert.equal(await fitNumber.inputValue(),'150');
 await fitNumber.fill('0');await fitNumber.press('Tab');await page.locator('[data-live-close]').click();
 // Outfits are global per avatar, including inactive/native Quick Reply changes.
 const memory=await page.evaluate(async()=>{
  const catalog=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/outfit-catalog.js'),s=ctx.extensionSettings.ImmersiveGroups;
  catalog.rememberOutfit(ctx.characters[0],'Alex/nightgown',{label:'Nightgown'});catalog.editOutfit('alex.png','Alex/nightgown',{description:'Evening clothes',hidden:false});
  const originalGroup=ctx.groupId;ctx.groupId=null;ctx.characterId=1;
  ctx.extensionSettings.expressionOverrides.find(e=>e.name==='cedar').path='Cedar/QuickReply';emit('CHAT_CHANGED');
  ctx.groupId=originalGroup;ctx.characterId=0;emit('CHAT_CHANGED');
  const known=catalog.outfitOptions(ctx.characters[0]).find(e=>e.folder==='Alex/nightgown');
  s.outfitDiscoveryDone['bea.png']=true;s.outfitCatalog['bea.png'].outfits=[];s.outfitFolders['bea.png']=[];
  const repaired=await catalog.discoverOutfits(ctx.characters[1],'Bea/outfit1');catalog.removeOutfit('bea.png','Bea/outfit2');
  const repeat=await catalog.discoverOutfits(ctx.characters[1],'Bea/outfit1');
  return {known,qr:catalog.outfitOptions(ctx.characters[2]).some(e=>e.folder==='Cedar/QuickReply'),mirror:s.outfitFolders['cedar.png'],repaired,repeat,removed:catalog.outfitOptions(ctx.characters[1],true).some(e=>e.folder==='Bea/outfit2')};
 });
 assert.equal(memory.known.label,'Nightgown');assert.equal(memory.known.description,'Evening clothes');assert.equal(memory.qr,true);assert.ok(memory.mirror.includes('Cedar/QuickReply'));assert.ok(memory.repaired.found>0);assert.equal(memory.repeat.skipped,true);assert.equal(memory.removed,false);
 // The combined shortcut is available even if background selection is disabled.
 await page.waitForFunction(()=>document.getElementById('local_image_floating_button'));
 assert.equal(await page.locator('#local_image_floating_button').isVisible(),false);
 await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.sheldCharacterControls=false;window.dispatchEvent(new Event('ig-layout-change'));});await page.waitForSelector('#local_image_floating_button',{state:'visible'});await page.locator('#local_image_floating_button').click();assert.equal(await page.locator('#local_image_floating_panel [data-quick-search]').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#local_image_floating_panel').count(),0);
 await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.sheldCharacterControls=true;window.dispatchEvent(new Event('ig-layout-change'));});await page.waitForSelector('#local_image_floating_button',{state:'hidden'});
 await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.stageShowBackground=false;window.dispatchEvent(new Event('ig-layout-change'));});
 await page.getByRole('button',{name:'Backgrounds and images',exact:true}).click();assert.equal(await page.locator('[data-media-pane=images]').isVisible(),true);assert.equal(await page.locator('[data-media-tabs]').isVisible(),false);
 const menu=page.locator('[data-media-pane=images]'),image=menu.locator('[data-quick-results]');await menu.locator('[data-quick-search]').fill('forest');
 await image.locator('.ig-media-card').first().click();await menu.locator('.ig-quick-preview').evaluate(n=>n.open=true);assert.equal(await menu.locator('[data-quick-preview]').isVisible(),true);
 // An explicit send uses the native send UI; inserting never replaces a draft.
 await page.evaluate(()=>{const send=document.createElement('button');send.id='send_but';send.type='button';send.addEventListener('click',()=>{window.quickSent=document.getElementById('send_textarea').value;document.getElementById('send_textarea').value='';});document.getElementById('send_form').append(send);});
 await menu.locator('[data-quick-send]').click();assert.match(await page.evaluate(()=>window.quickSent),/^\/sys ::img general forest::$/);
 await page.locator('#send_textarea').fill('My unfinished draft');assert.equal(await menu.locator('[data-quick-send]').isDisabled(),true);await menu.locator('[data-quick-insert]').click();assert.equal(await page.locator('#send_textarea').inputValue(),'My unfinished draft\n::img general forest::');
 await page.locator('#send_textarea').fill('');await page.locator('[data-media-close]').click();
 await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.stageShowBackground=true;window.dispatchEvent(new Event('ig-layout-change'));});
 await page.getByRole('button',{name:'Backgrounds and images',exact:true}).click();await page.locator('[data-media-tab=backgrounds]').click();assert.equal(await page.locator('[data-bg-pool=linked]').isVisible(),true);await page.locator('[data-media-tab=images]').click();
 await menu.locator('[data-quick-library]').click();await page.waitForSelector('.ig-gallery-studio');assert.equal(await page.locator('.ig-background-popover').isVisible(),false);
 const card=page.locator('.ig-gallery-image-card').filter({has:page.locator('strong',{hasText:/^forest$/})}).first();await card.getByRole('button',{name:/Details & bindings/}).click();
 const editor=page.locator('.ig-gallery-editor');assert.equal(await editor.locator('.ig-image-bindings').isVisible(),true);
 await editor.locator('.ig-gallery-binding-list label').filter({hasText:'Alex'}).first().locator('input').check();assert.equal(await editor.getByRole('combobox',{name:'Available in',exact:true}).inputValue(),'bound');
 await editor.locator('.ig-gallery-binding-list label').filter({hasText:'Bea'}).first().locator('input').check();await editor.getByRole('checkbox',{name:'Require all selected characters to be present'}).check();await editor.getByRole('button',{name:'Save image details'}).click();
 const bound=await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.gallery.generalAssignments.forest);assert.deepEqual(bound.characterBindings,['alex.png','bea.png']);assert.equal(bound.requireAllCharacters,true);assert.equal(bound.availability,'bound');
 await page.locator('.ig-gallery-studio > .local-image-modal-header').getByRole('button',{name:'Close',exact:true}).click();
 await page.evaluate(()=>{ctx.groupId=null;ctx.characterId=2;emit('CHAT_CHANGED');});await page.waitForTimeout(150);await page.getByRole('button',{name:'Backgrounds and images',exact:true}).click();assert.equal(await image.locator('.ig-media-card').evaluateAll(nodes=>nodes.some(n=>n.textContent.includes('forest'))),false);await page.locator('[data-media-close]').click();
 await page.evaluate(()=>{ctx.groupId=ctx.groups[0].id;ctx.characterId=0;emit('CHAT_CHANGED');});
 // Reload serialized settings into a new runtime, rather than reusing module state.
 const saved=await page.evaluate(()=>structuredClone(ctx.extensionSettings.ImmersiveGroups));await page.addInitScript(s=>{document.addEventListener('DOMContentLoaded',()=>{if(window.ctx)ctx.extensionSettings.ImmersiveGroups=s;},{once:true});},saved);
 await page.reload();await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 const remembered=await page.evaluate(async()=>{const catalog=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/outfit-catalog.js');return catalog.outfitOptions(ctx.characters[0]).find(e=>e.folder==='Alex/nightgown');});assert.equal(remembered.label,'Nightgown');assert.equal(remembered.description,'Evening clothes');
 // A narrow screen keeps both menus bounded while sliders are adjusted live.
 await page.setViewportSize({width:390,height:844});await page.locator('#prome-stage-manage').click();await page.locator('input[type=range][data-live-setting=sheldHeightPercent]').fill('55');
 assert.ok(await page.locator('.ig-live-tuning').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));await page.locator('[data-live-close]').click();
 await page.getByRole('button',{name:'Backgrounds and images',exact:true}).click();await page.locator('[data-media-tab=images]').click();assert.ok(await page.locator('.ig-background-popover').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));await page.screenshot({path:path.join(__dirname,'../artifacts/media-mobile.png')});
 assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeChat),true);assert.deepEqual(errors,[]);await page.close();
};
