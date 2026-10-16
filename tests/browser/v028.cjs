const assert=require('assert/strict'),path=require('path');
module.exports=async function verifyCrossfades(context,url){
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 await page.evaluate(async()=>{const base='/scripts/extensions/third-party/ImmersiveGroups/modules/';window.controls028=await import(base+'animation-controls.js');window.stage028=await import(base+'stage-controls.js');window.before028=JSON.stringify(ctx.chat);});
 const main=page.locator('#ig-pane-animations'),field=(key,type)=>main.locator(`[data-animation-setting="${key}"]${type?`[type="${type}"]`:''}`);
 await page.locator('#ig-tab-animations').click();
 for(const kind of ['outfit','background']){assert.equal(await field(kind+'FadeMode').inputValue(),'cross');assert.equal(await field(kind+'FadeLinked').isChecked(),true);assert.equal(await field(kind+'FadeEnabled').isChecked(),false);}
 await field('outfitFadeOut','number').fill('513');await field('outfitFadeOut','number').press('Tab');assert.equal(await field('outfitFadeIn','number').inputValue(),'513');assert.equal(await field('outfitFadeIn','range').inputValue(),'513');
 await field('outfitFadeIn','range').evaluate(n=>{n.value='237';n.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await field('outfitFadeOut','number').inputValue(),'237');
 await field('outfitFadeLinked').uncheck();await field('outfitFadeOut','number').fill('700');await field('outfitFadeOut','number').press('Tab');assert.equal(await field('outfitFadeIn','number').inputValue(),'237');
 await field('outfitFadeLinked').check();assert.equal(await field('outfitFadeOut','number').inputValue(),'237');
 await field('outfitFadeMode').selectOption('sequential');await main.locator('[data-animation-reset]').click();assert.equal(await field('outfitFadeMode').inputValue(),'cross');assert.equal(await field('outfitFadeOut','number').inputValue(),'200');
 // Both views share the same values; live controls sit between Position and Presets.
 await page.locator('#prome-stage-manage').click();const live=page.locator('.ig-live-tuning');
 assert.equal(await live.evaluate(n=>{const a=[...n.children];return a.indexOf(n.querySelector('[data-live-offsets]'))<a.indexOf(n.querySelector('[data-live-animations]'))&&a.indexOf(n.querySelector('[data-live-animations]'))<a.indexOf(n.querySelector('[data-live-presets]'));}),true);
 await live.locator('[data-live-animations] > summary').click();const liveNumber=live.locator('input[type=number][data-animation-setting="backgroundFadeOut"]');
 await liveNumber.fill('420');await liveNumber.press('Tab');assert.equal(await field('backgroundFadeIn','number').inputValue(),'420');assert.equal(await live.locator('input[type=range][data-animation-setting="backgroundFadeIn"]').inputValue(),'420');
 await live.locator('[data-animation-reset]').click();assert.equal(await liveNumber.inputValue(),'350');assert.equal(await field('backgroundFadeIn','number').inputValue(),'350');
 await live.locator('[data-live-close]').click();
 // Real crossfades retain a visual old layer while committing the new sprite.
 await page.evaluate(()=>{controls028.writeAnimationSetting('outfitFadeEnabled',true);controls028.writeAnimationSetting('outfitFadeIn',800);window.node028=document.querySelector('#visual-novel-wrapper .expression-holder img');window.oldSrc028=node028.src;window.other028=[...document.querySelectorAll('#visual-novel-wrapper .expression-holder img')].slice(1).map(n=>[n,n.src,n.style.cssText]);window.done028=null;stage028.changeOutfit('alex.png','Alex/outfit2').then(x=>done028=x);});
 await page.waitForFunction(()=>document.querySelector('.ig-outfit-transition')&&node028.src.includes('outfit2'));
 assert.equal(await page.locator('#visual-novel-wrapper .expression-holder img').count(),3);
 await page.waitForFunction(()=>{const old=document.querySelector('.ig-outfit-transition');if(!old)return false;const a=Number(getComputedStyle(old).opacity),b=Number(getComputedStyle(node028).opacity);return a>0&&a<.9&&b>0&&b<1;});
 assert.equal(await page.evaluate(()=>{const a=document.querySelector('.ig-outfit-transition').getBoundingClientRect(),b=node028.getBoundingClientRect();return ['x','y','width','height'].every(k=>Math.abs(a[k]-b[k])<1);}),true);
 assert.equal(await page.evaluate(()=>other028.every(([n,src,css])=>n.isConnected&&n.src===src&&n.style.cssText===css&&n.getAnimations().length===0)),true);
 await page.waitForFunction(()=>done028!==null);assert.equal(await page.evaluate(()=>done028),true);assert.equal(await page.locator('.ig-outfit-transition').count(),0);
 // Interrupting a committed crossfade leaves only the newest transition layer.
 await page.evaluate(()=>{window.first028=null;stage028.changeOutfit('alex.png','Alex/outfit1').then(x=>first028=x);});await page.waitForFunction(()=>Boolean(document.querySelector('.ig-outfit-transition')));
 await page.evaluate(()=>{window.second028=null;stage028.changeOutfit('alex.png','Alex/outfit2').then(x=>second028=x);});await page.waitForFunction(()=>first028!==null&&second028!==null);
 assert.equal(await page.evaluate(()=>first028&&second028),true);assert.match(await page.evaluate(()=>node028.src),/outfit2/);assert.equal(await page.locator('.ig-outfit-transition').count(),0);assert.equal(await page.evaluate(()=>node028.getAnimations().length),0);
 // Sequential background mode keeps the new scene hidden through fade-out.
 await page.evaluate(()=>{controls028.writeAnimationSetting('backgroundFadeEnabled',true);controls028.writeAnimationSetting('backgroundFadeMode','sequential');controls028.writeAnimationSetting('backgroundFadeIn',600);const n=document.createElement('div');n.id='bg1';Object.assign(n.style,{position:'fixed',inset:'0',zIndex:'-1',backgroundImage:'url("/backgrounds/forest.jpg")'});document.body.prepend(n);});await page.waitForTimeout(30);
 await page.evaluate(()=>document.getElementById('bg1').style.backgroundImage='url("/backgrounds/town.jpg")');await page.waitForFunction(()=>{const old=document.querySelector('.ig-background-transition');return old&&Number(getComputedStyle(old).opacity)<.95;});
 assert.equal(await page.locator('#bg1').evaluate(n=>Number(getComputedStyle(n).opacity)),0);await page.waitForFunction(()=>!document.querySelector('.ig-background-transition'));await page.waitForFunction(()=>document.getElementById('bg1').getAnimations().length===0);
 // The default background mode fades both layers at the same time.
 await page.evaluate(()=>{controls028.writeAnimationSetting('backgroundFadeMode','cross');document.getElementById('bg1').style.backgroundImage='url("/backgrounds/forest.jpg")';});await page.waitForFunction(()=>{const old=document.querySelector('.ig-background-transition');if(!old)return false;const a=Number(getComputedStyle(old).opacity),b=Number(getComputedStyle(document.getElementById('bg1')).opacity);return a>0&&a<.9&&b>0&&b<1;});
 await page.evaluate(()=>controls028.resetAnimationSettings());assert.equal(await page.locator('.ig-background-transition,.ig-outfit-transition').count(),0);
 assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===before028),true);
 // Responsive live animation controls stay within a phone-width popup.
 await page.setViewportSize({width:390,height:844});await page.locator('#prome-stage-manage').click();await live.locator('[data-live-animations]').evaluate(n=>n.open=true);
 assert.ok(await live.evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.screenshot({path:path.resolve(__dirname,'../artifacts/v028-live-mobile.png'),fullPage:true});await live.locator('[data-live-close]').click();
 assert.deepEqual(errors,[]);await page.close();
};
