const assert=require('assert/strict'),path=require('path');
module.exports=async function verifyBackgroundContext(context,url){
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 await page.locator('#ig-tab-context').click();const scene=page.locator('#ig-scene-automation'),linked=scene.locator('[data-scene-setting=backgroundLinkedOnly]');
 assert.equal(await linked.isChecked(),true);assert.equal(await linked.isDisabled(),true);
 await scene.locator('[data-scene-setting=enabled]').check();assert.equal(await linked.isDisabled(),true);await scene.locator('[data-scene-setting=backgrounds]').check();assert.equal(await linked.isEnabled(),true);
 await scene.locator('[data-scene-preview-section]').evaluate(n=>n.open=true);await scene.locator('[data-scene-preview-refresh]').click();await page.waitForFunction(()=>document.querySelector('[data-scene-background-status]').textContent.startsWith('0 backgrounds'));
 assert.equal((await scene.locator('[data-scene-preview]').textContent()).includes('::background "town.jpg"::'),false);assert.equal((await scene.locator('[data-scene-preview]').textContent()).includes('::background "forest.jpg"::'),false);assert.match(await scene.locator('[data-scene-background-status]').textContent(),/not used as a fallback/);
 // Edit real library controls; prompt/preview must update without a chat reload.
 await scene.locator('[data-scene-background-library]').click();await page.waitForSelector('.ig-unified-library');
 const forest=page.locator('[data-library-kind=background]').filter({has:page.locator('strong',{hasText:'forest.jpg'})});await forest.locator('details').evaluate(n=>n.open=true);
 await forest.locator('details label').filter({hasText:'Alex'}).locator('input').check();await page.waitForFunction(()=>document.querySelector('[data-scene-background-status]').textContent.startsWith('0 backgrounds'));
 await forest.locator('details label').filter({hasText:'Bea'}).locator('input').check();await forest.locator('details label').filter({hasText:'Cedar'}).locator('input').check();
 await forest.getByRole('textbox',{name:'Scene description for forest.jpg',exact:true}).fill('A quiet forest clearing beside a river.');
 const town=page.locator('[data-library-kind=background]').filter({has:page.locator('strong',{hasText:'town.jpg'})});await town.locator('details').evaluate(n=>n.open=true);await town.locator('details label').filter({hasText:'Bea'}).locator('input').check();
 await page.locator('.ig-unified-library > .local-image-modal-header').getByRole('button',{name:'Close',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-scene-background-status]').textContent.startsWith('1 background'));
 await page.waitForFunction(()=>document.querySelector('[data-scene-preview]').textContent.includes('A quiet forest clearing beside a river.'));
 let prompt=await page.evaluate(()=>prompts['ImmersiveGroups.Scene'].prompt);assert.ok(prompt.includes('::background "forest.jpg"::'));assert.equal(prompt.includes('::background "town.jpg"::'),false);assert.ok(prompt.includes('A quiet forest clearing beside a river.'));
 // Speaker-only outfit context still filters backgrounds for the entire group.
 await scene.locator('[data-scene-setting=scope]').selectOption('speaker');await scene.locator('[data-scene-speaker]').selectOption('bea.png');await scene.locator('[data-scene-preview-refresh]').click();prompt=await scene.locator('[data-scene-preview]').textContent();assert.ok(prompt.includes('::background "forest.jpg"::'));assert.equal(prompt.includes('::background "town.jpg"::'),false);
 // Allowing unlinked is explicit; foreign character links remain ineligible.
 await linked.uncheck();assert.equal((await page.evaluate(()=>prompts['ImmersiveGroups.Scene'].prompt)).includes('::background "town.jpg"::'),false);
 await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.backgroundBindings['town.jpg']=[];window.dispatchEvent(new Event('ig-background-catalog-change'));});
 await page.waitForFunction(()=>document.querySelector('[data-scene-background-status]').textContent.startsWith('2 backgrounds'));const broad=await page.evaluate(()=>prompts['ImmersiveGroups.Scene'].prompt);assert.ok(broad.includes('::background "town.jpg"::'));
 await linked.check();const narrow=await page.evaluate(()=>prompts['ImmersiveGroups.Scene'].prompt);assert.equal(narrow.includes('::background "town.jpg"::'),false);assert.ok(narrow.length<broad.length);
 // Native locks still suppress background commands.
 await page.evaluate(()=>{native.chat_metadata.custom_background='locked.jpg';window.dispatchEvent(new Event('ig-layout-change'));});await page.waitForFunction(()=>document.querySelector('[data-scene-background-status]').textContent.includes('locked;'));assert.equal((await page.evaluate(()=>prompts['ImmersiveGroups.Scene'].prompt)).includes('::background "forest.jpg"::'),false);
 await page.evaluate(()=>{delete native.chat_metadata.custom_background;window.dispatchEvent(new Event('ig-layout-change'));});
 // Manual library choices are independent of the model filter.
 await page.evaluate(()=>document.addEventListener('click',event=>{const node=event.target.closest('.bg_example');if(node)window.manualBackground=node.getAttribute('bgfile');}));
 await scene.locator('[data-scene-background-library]').click();await town.getByRole('button',{name:'Use',exact:true}).click();assert.equal(await page.evaluate(()=>window.manualBackground),'town.jpg');await page.locator('.ig-unified-library > .local-image-modal-header').getByRole('button',{name:'Close',exact:true}).click();
 const saved=await page.evaluate(()=>structuredClone(ctx.extensionSettings.ImmersiveGroups));await page.addInitScript(s=>{document.addEventListener('DOMContentLoaded',()=>{if(window.ctx)ctx.extensionSettings.ImmersiveGroups=s;},{once:true});},saved);await page.reload();await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');await page.locator('#ig-tab-context').click();assert.equal(await linked.isChecked(),true);await page.waitForFunction(()=>prompts['ImmersiveGroups.Scene'].prompt.includes('::background "forest.jpg"::'));assert.equal((await page.evaluate(()=>prompts['ImmersiveGroups.Scene'].prompt)).includes('::background "town.jpg"::'),false);
 await page.setViewportSize({width:390,height:844});await scene.locator('[data-scene-preview-section]').evaluate(n=>n.open=false);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(__dirname,'../artifacts/background-context-mobile.png')});
 assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeChat),true);assert.deepEqual(errors,[]);await page.close();
};
