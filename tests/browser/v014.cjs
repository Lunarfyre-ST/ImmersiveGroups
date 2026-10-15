const assert=require('assert/strict'),fs=require('fs'),path=require('path');
module.exports=async function verifyNewFeatures(context,url){
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1200,height:950});await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 await page.evaluate(()=>{document.addEventListener('click',event=>{const n=event.target.closest('.bg_example');if(n)(window.bgPicks||=[]).push({file:n.getAttribute('bgfile'),automatic:n.dataset.igAutomatic==='true'});});});
 const mobile=()=>page.evaluate(async()=>(await import('/scripts/extensions/third-party/ImmersiveGroups/modules/responsive.js')).mobileLayout());
 assert.equal(await mobile(),false);await page.setViewportSize({width:800,height:1200});assert.equal(await mobile(),true);
 await page.locator('#ig-layout-mode').selectOption('desktop');assert.equal(await mobile(),false);
 await page.setViewportSize({width:1200,height:700});await page.locator('#ig-layout-mode').selectOption('auto');assert.equal(await mobile(),false);
 await page.setViewportSize({width:1200,height:950});
 // Wheel changes the hovered character only, without moving a neighbor.
 const outfit=page.locator('.prome-stage-outfit').first();await page.waitForFunction(()=>document.querySelector('.prome-stage-outfit').value==='Alex/outfit1');
 const neighbor=await page.locator('#expression-bea\\.png').boundingBox();await outfit.hover();await page.mouse.wheel(0,100);
 await page.waitForFunction(()=>document.getElementById('expression-alex.png').querySelector('img').src.includes('outfit2'));
 assert.deepEqual(await page.locator('#expression-bea\\.png').boundingBox(),neighbor);
 await outfit.dispatchEvent('wheel',{deltaY:100,ctrlKey:true});assert.equal(await outfit.evaluate(n=>n.value),'Alex/outfit2');
 await page.waitForTimeout(180);await outfit.hover();await page.mouse.wheel(0,100);await page.waitForFunction(()=>document.getElementById('expression-alex.png').querySelector('img').src.includes('outfit1'));
 // Long menus stay below the anchor, scroll internally, search, and reveal selection.
 await page.evaluate(async()=>{const catalog=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/outfit-catalog.js');for(let i=3;i<=25;i++)catalog.rememberOutfit(ctx.characters[0],`Alex/test${i}`,{label:`Extra ${i}`});});
 await outfit.click();const popup=page.locator('.ig-outfit-options:not([hidden])'),rows=popup.locator('.ig-outfit-rows');
 const anchorBox=await outfit.boundingBox(),popupBox=await popup.boundingBox();assert.ok(popupBox.y>=anchorBox.y+anchorBox.height);assert.ok(popupBox.height<360);
 assert.equal(await rows.evaluate(n=>n.scrollHeight>n.clientHeight),true);
 const initialY=popupBox.y;await popup.getByRole('searchbox').fill('Extra 25');assert.equal(await popup.locator('[role=option]').count(),1);assert.equal((await popup.boundingBox()).y,initialY);
 await popup.getByRole('searchbox').fill('');await outfit.focus();await outfit.press('End');assert.ok(await rows.evaluate(n=>n.scrollTop>0));await outfit.press('Escape');
 // Signed Fit controls retain large typed values and display the true multiplier.
 await page.locator('#ig-tab-sprites').click();const fit=page.locator('input[type=number][data-prome-stage-setting=layoutSpriteScale]');
 await fit.fill('75');await fit.press('Tab');assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.layoutSpriteScale),175);assert.equal(await page.locator('input[type=range][data-prome-stage-setting=layoutSpriteScale]').inputValue(),'20');
 await fit.fill('9');await fit.press('Tab');assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.layoutSpriteScale),109);
 await page.locator('#prome-profile-y').fill('-25');await page.locator('#prome-profile-y').press('Tab');
 await page.waitForFunction(()=>document.getElementById('expression-alex.png').style.getPropertyValue('--ig-sprite-y')==='-25px');
 assert.match(await page.locator('#prome-profile-preview').textContent(),/109% fit/);
 await page.locator('#prome-stage-manage').click();const live=page.locator('.ig-live-tuning');
 assert.equal(await live.locator('input[type=number][data-live-setting=layoutSpriteScale]').inputValue(),'9');
 await live.locator('[data-live-offsets] > summary').click();
 const x=live.locator('input[type=number][data-live-setting=stageOffsetX]');await x.fill('14');await x.press('Tab');
 await page.waitForFunction(()=>document.getElementById('prome-stage-controls').style.getPropertyValue('--ig-controls-x')==='14px');
 await live.locator('[data-live-mode]').selectOption('mobile');assert.equal(await x.inputValue(),'0');await x.fill('-12');await x.press('Tab');
 await live.locator('[data-live-mode]').selectOption('desktop');assert.equal(await x.inputValue(),'14');
 await live.locator('[data-live-presets] > summary').click();await live.locator('[data-live-preset-name]').fill('Wide scene');await live.locator('[data-live-save]').click();
 await x.fill('33');await x.press('Tab');await live.locator('[data-live-load]').click();assert.equal(await x.inputValue(),'14');
 const downloadReady=page.waitForEvent('download');await live.locator('[data-live-export]').click();const download=await downloadReady;const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(exported.format,'ImmersiveGroups.visual-layouts');assert.equal(exported.desktop.settings.stageOffsetX,14);assert.equal(exported.mobile.settings.stageOffsetX,-12);assert.equal(JSON.stringify(exported).includes('Message 10'),false);
 const inputFile=live.locator('[data-live-file]');const invalid=structuredClone(exported);invalid.mobile.settings.stageOffsetX=99999;await inputFile.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});await page.waitForFunction(()=>document.querySelector('[data-live-notice]').textContent.includes('Invalid stageOffsetX'));assert.equal(await x.inputValue(),'14');
 await x.fill('22');await x.press('Tab');await inputFile.setInputFiles({name:'layouts.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await page.waitForFunction(()=>document.querySelector('[data-live-notice]').textContent.includes('Imported both'));assert.equal(await x.inputValue(),'14');
 await live.locator('[data-live-reset-scale]').click();assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.heightProfiles['alex.png'].fineTuneOffset),0);assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.layoutSpriteScale),100);
 assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.mobileLayoutSettings.stageOffsetX),-12);
 assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.heightProfiles['alex.png'].offsetY),-25);
 await live.locator('[data-live-close]').click();
 // Defaults: actual native selection events, saved-chat precedence, cancellation,
 // exact-group rules, and native lock protection. No chat array writes.
 await page.locator('#ig-tab-backgrounds').click();await page.locator('#ig-pane-backgrounds > details > summary').click();
 const auto=page.locator('[data-bg-auto]'),delay=page.getByRole('spinbutton',{name:'Background load delay (ms)',exact:true});
 await delay.fill('100');await delay.press('Tab');
 await page.getByRole('combobox',{name:'Global default background',exact:true}).selectOption('forest.jpg');await page.locator('#ig-pane-backgrounds details details > summary').click();await page.getByRole('textbox',{name:'Background rule name',exact:true}).fill('Group home');await page.getByRole('combobox',{name:'Rule default background',exact:true}).selectOption('town.jpg');await page.getByRole('button',{name:'Add rule',exact:true}).click();assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.backgroundDefaultRules[0].characters.length),3);await page.screenshot({path:path.join(__dirname,'../artifacts/background-defaults.png')});await page.evaluate(()=>{window.bgPicks=[];});
 await auto.check();await page.waitForFunction(()=>window.bgPicks?.some(p=>p.file==='town.jpg'&&p.automatic));
 // Manual selection is remembered and restored before any default rule.
 await page.evaluate(async()=>{await (await import('/scripts/extensions/third-party/ImmersiveGroups/modules/scene-backgrounds.js')).pickBackground('forest.jpg');window.bgPicks=[];ctx.getCurrentChatId=()=> 'temporary-chat';emit('CHAT_CHANGED');ctx.getCurrentChatId=()=> 'test-chat';emit('CHAT_CHANGED');});
 await page.waitForFunction(()=>window.bgPicks?.some(p=>p.file==='forest.jpg'&&p.automatic));
 await page.evaluate(()=>{window.bgPicks=[];native.chat_metadata.custom_background='url("backgrounds/locked.jpg")';emit('CHAT_CHANGED');});await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>bgPicks.length),0);
 await page.evaluate(()=>{delete native.chat_metadata.custom_background;ctx.getCurrentChatId=()=> 'switch-a';emit('CHAT_CHANGED');ctx.getCurrentChatId=()=> 'switch-b';emit('CHAT_CHANGED');});
 await page.waitForFunction(()=>window.bgPicks?.length===1);assert.equal(await page.evaluate(()=>bgPicks[0].file),'town.jpg');
 await page.evaluate(async()=>{window.bgPicks=[];ctx.getCurrentChatId=()=> 'manual-race';emit('CHAT_CHANGED');(await import('/scripts/extensions/third-party/ImmersiveGroups/modules/scene-backgrounds.js')).pickBackground('forest.jpg');});await page.waitForTimeout(180);
 assert.deepEqual(await page.evaluate(()=>bgPicks),[{file:'forest.jpg',automatic:false}]);
 // Cancellation still works after a delayed API response starts, not just its timer.
 await page.route('**/api/backgrounds/all',async route=>{await new Promise(resolve=>setTimeout(resolve,200));await route.continue();});
 await page.evaluate(()=>{window.bgPicks=[];ctx.getCurrentChatId=()=> 'fetch-race';emit('CHAT_CHANGED');});await page.waitForTimeout(130);
 await page.evaluate(async()=>{(await import('/scripts/extensions/third-party/ImmersiveGroups/modules/scene-backgrounds.js')).pickBackground('forest.jpg');});await page.waitForTimeout(250);
 assert.deepEqual(await page.evaluate(()=>bgPicks),[{file:'forest.jpg',automatic:false}]);await page.unroute('**/api/backgrounds/all');
 assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeChat),true);assert.deepEqual(errors,[]);
 await page.close();
};
