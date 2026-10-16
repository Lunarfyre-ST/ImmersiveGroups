const assert=require('assert/strict');
module.exports=async function verifyScenePreferences(context,url){
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 const base='/scripts/extensions/third-party/ImmersiveGroups/';
 await page.evaluate(async base=>{window.stage027=await import(base+'modules/stage-controls.js');window.animation027=await import(base+'modules/scene-animations.js');window.colors027=await import(base+'modules/outfit-catalog.js');window.before027=JSON.stringify(ctx.chat);},base);
 // History mode is a visibility preference. Existing rows and their IDs survive.
 await page.locator('#prome-sheld-last_mes').check();assert.equal(await page.locator('#chat > .mes:not(.prome-hidden-message)').count(),1);
 await page.locator('#prome-sheld-last_mes').uncheck();assert.equal(await page.locator('#chat > .mes:not(.prome-hidden-message)').count(),60);
 assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===before027),true);
 assert.equal(await page.locator('#ig-tab-original').textContent(),'Legacy / Prome');
 const summary=key=>page.locator(`[data-ig-summary="${key}"]`),scene=key=>page.locator(`[data-scene-setting="${key}"]`);
 assert.equal(await summary('automation').textContent(),'Automation: Off');assert.match(await summary('gallery').textContent(),/^Gallery: On/);
 await page.locator('#ig-tab-context').click();await scene('enabled').check();await scene('scope').selectOption('speaker');
 assert.equal(await summary('outfits').textContent(),'Outfits: Speaker');await scene('scope').selectOption('all');assert.equal(await summary('outfits').textContent(),'Outfits: All');
 await scene('backgrounds').check();assert.equal(await summary('background').textContent(),'Background: On');await scene('mode').selectOption('api');assert.equal(await summary('mode').textContent(),'Mode: API');
 await page.locator('#ig-gallery-model-prompt input[data-gallery-setting="enabled"]').uncheck();assert.match(await summary('gallery').textContent(),/^Gallery: Off/);
 await scene('enabled').uncheck();assert.equal(await summary('outfits').textContent(),'Outfits: Off');assert.equal(await summary('background').textContent(),'Background: Off');
 await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.gallery.prompt.placement='before';window.dispatchEvent(new Event('ig-gallery-change'));});assert.match(await summary('gallery').textContent(),/Start of message/);
 // Button background remains independent when together, optionally inherits when split.
 await page.evaluate(()=>colors027.setCharacterColors('alex.png',{background:'#123456',speak:'#aabbcc',inheritSpeak:true}));
 await page.locator('#ig-tab-controls').click();const setting=key=>key.includes('Fade')?page.locator(`#ig-pane-animations [data-animation-setting="${key}"]`):page.locator(`[data-prome-stage-setting="${key}"]`);
 await setting('stageSpeakPlacement').selectOption('top');await setting('stageOutfitPlacement').selectOption('top');
 const alex=page.locator('.prome-stage-outfit').first();await page.waitForFunction(()=>getComputedStyle(document.querySelector('.prome-stage-outfit')).backgroundColor==='rgb(18, 52, 86)');
 await setting('stageOutfitPlacement').selectOption('bottom');await page.waitForFunction(()=>getComputedStyle(document.querySelector('.prome-stage-outfit')).backgroundColor==='rgb(170, 187, 204)');
 await page.evaluate(()=>colors027.setCharacterColors('alex.png',{inheritSpeak:false}));await page.waitForFunction(()=>getComputedStyle(document.querySelector('.prome-stage-outfit')).backgroundColor==='rgb(18, 52, 86)');
 await setting('stageOutfitPlacement').selectOption('top');
 await page.locator('#ig-tab-outfits').click();await page.locator('#ig-character-colors').evaluate(n=>n.closest('details').open=true);assert.equal(await page.locator('#ig-character-colors input[aria-label="Inherit Speak color when separated"]').isChecked(),false);
 // Animation values are shared; paired sliders synchronize exact typed values.
 await page.locator('#ig-tab-animations').click();assert.equal(await setting('outfitFadeEnabled').isChecked(),false);assert.equal(await setting('backgroundFadeEnabled').isChecked(),false);
 await setting('outfitFadeMode').selectOption('sequential');await setting('outfitFadeLinked').uncheck();
 await setting('outfitFadeEnabled').check();await page.locator('#ig-pane-animations input[type=number][data-animation-setting="outfitFadeOut"]').fill('120');await page.locator('#ig-pane-animations input[type=number][data-animation-setting="outfitFadeOut"]').press('Tab');
 assert.equal(await page.locator('#ig-pane-animations input[type=range][data-animation-setting="outfitFadeOut"]').inputValue(),'120');
 assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.outfitFadeOut),120);
 await page.locator('#ig-edit-layout').selectOption('mobile');assert.equal(await setting('outfitFadeEnabled').isChecked(),true);await page.locator('#ig-edit-layout').selectOption('auto');
 await page.evaluate(()=>{window.nodes027=[...document.querySelectorAll('#visual-novel-wrapper img')];window.neighbors027=nodes027.slice(1).map(n=>[n,n.src,n.style.cssText]);window.result027=null;window.outfit027=stage027.changeOutfit('alex.png','Alex/outfit2').then(x=>result027=x);});
 await page.waitForFunction(()=>nodes027[0].getAnimations().length>0);
 assert.equal(await page.evaluate(()=>nodes027[1].getAnimations().length),0);
 await page.waitForFunction(()=>result027!==null);assert.equal(await page.evaluate(()=>result027),true);assert.match(await page.evaluate(()=>nodes027[0].src),/outfit2/);
 assert.equal(await page.evaluate(()=>neighbors027.every(([n,src,css],i)=>n===nodes027[i+1]&&n.src===src&&n.style.cssText===css)),true);
 assert.equal(await page.evaluate(()=>nodes027[0].getAnimations().length),0);
 // A superseded fade must never commit an older outfit after a newer request.
 await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.outfitFadeOut=200;window.resultA027=null;stage027.changeOutfit('alex.png','Alex/outfit1').then(x=>resultA027=x);});await page.waitForFunction(()=>nodes027[0].getAnimations().length>0);
 await page.evaluate(()=>{window.resultB027=null;stage027.changeOutfit('alex.png','Alex/outfit2').then(x=>resultB027=x);});await page.waitForFunction(()=>resultA027!==null&&resultB027!==null);
 assert.equal(await page.evaluate(()=>resultA027),false);assert.equal(await page.evaluate(()=>resultB027),true);assert.match(await page.evaluate(()=>nodes027[0].src),/outfit2/);
 // Changing chats while fading cannot commit to the newly opened chat.
 await page.evaluate(()=>{window.stale027=null;stage027.changeOutfit('alex.png','Alex/outfit1').then(x=>stale027=x);});await page.waitForFunction(()=>nodes027[0].getAnimations().length>0);
 await page.evaluate(async()=>{window.oldChatId027=ctx.getCurrentChatId;ctx.getCurrentChatId=()=> 'other-chat';for(const fn of events.CHAT_CHANGED||[])await fn();});await page.waitForFunction(()=>stale027!==null);assert.equal(await page.evaluate(()=>stale027),false);await page.evaluate(()=>{ctx.getCurrentChatId=oldChatId027;});
 // Native backgrounds get a visual overlay only; styles/locks remain native-owned.
 await setting('backgroundFadeEnabled').check();await page.evaluate(()=>{const bg=document.createElement('div');bg.id='bg1';Object.assign(bg.style,{position:'fixed',inset:'0',zIndex:'-1',backgroundImage:'url("/backgrounds/forest.jpg")'});document.body.prepend(bg);});
 await page.waitForTimeout(30);await page.evaluate(()=>document.getElementById('bg1').style.backgroundImage='url("/backgrounds/town.jpg")');
 await page.waitForFunction(()=>Boolean(document.querySelector('.ig-background-transition')));await page.waitForFunction(()=>!document.querySelector('.ig-background-transition'));
 assert.match(await page.locator('#bg1').evaluate(n=>n.style.backgroundImage),/town.jpg/);assert.equal(await page.locator('#bg1').evaluate(n=>n.getAnimations().length),0);
 await page.evaluate(()=>{document.getElementById('bg1').style.backgroundImage='url("/backgrounds/forest.jpg")';});await page.waitForFunction(()=>Boolean(document.querySelector('.ig-background-transition')));await setting('backgroundFadeEnabled').uncheck();assert.equal(await page.locator('.ig-background-transition').count(),0);
 // Zero-duration transitions commit normally and leave no animation effects.
 await page.evaluate(()=>{Object.assign(ctx.extensionSettings.ImmersiveGroups,{outfitFadeOut:0,outfitFadeIn:0});window.zero027=null;stage027.changeOutfit('alex.png','Alex/outfit1').then(x=>zero027=x);});await page.waitForFunction(()=>zero027!==null);assert.equal(await page.evaluate(()=>zero027),true);assert.equal(await page.evaluate(()=>nodes027[0].getAnimations().length),0);
 await page.evaluate(()=>{Object.assign(ctx.extensionSettings.ImmersiveGroups,{outfitFadeOut:200,outfitFadeIn:200});});
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.outfitFadeEnabled=true;window.motion027=null;stage027.changeOutfit('alex.png','Alex/outfit1').then(x=>motion027=x);});await page.waitForFunction(()=>motion027!==null);assert.equal(await page.evaluate(()=>motion027),true);assert.equal(await page.evaluate(()=>nodes027[0].getAnimations().length),0);
 assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===before027),true);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.ig-settings-tabs [role=tab]').count(),10);assert.ok(await page.locator('.ig-automation-summary').evaluate(n=>n.getBoundingClientRect().right<=window.innerWidth));
 await page.screenshot({path:require('path').resolve(__dirname,'../artifacts/v027-mobile.png'),fullPage:true});assert.deepEqual(errors,[]);await page.close();
};
