// SPDX-License-Identifier: AGPL-3.0-only
const assert=require('node:assert/strict');
// Mobile viewport: height-only resizes keep animations, scaled sprites stay on screen, modals fit small screens.
module.exports=async(context,url)=>{
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});
 await page.route('**/characters/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="1000"><rect width="400" height="1000" fill="teal"/></svg>'}));
 await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 await page.evaluate(async()=>{window.mvMotion=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/animation-controls.js');const s=ctx.extensionSettings.ImmersiveGroups;s.layoutMode='mobile';s.enableVN_UI=true;window.dispatchEvent(new Event('ig-layout-change'));});
 await page.waitForFunction(()=>[...document.querySelectorAll('#ig-mobile-sprites img')].length===3&&[...document.querySelectorAll('#ig-mobile-sprites img')].every(i=>i.complete&&i.naturalWidth>0));
 // Toolbar/keyboard resizes (height only) keep a running exit; a width change still cancels it.
 await page.evaluate(()=>{mvMotion.writeAnimationSetting('entranceMotionEnabled',true);mvMotion.writeAnimationSetting('entranceMotionDuration',10000);});await page.waitForTimeout(150);
 await page.evaluate(()=>document.querySelector('#ig-mobile-sprites > .expression-holder').remove());await page.waitForSelector('.ig-motion-exit');
 await page.setViewportSize({width:390,height:790});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>Boolean(document.querySelector('.ig-motion-exit'))),true);
 await page.setViewportSize({width:420,height:790});await page.waitForFunction(()=>!document.querySelector('.ig-motion-exit'));
 await page.evaluate(()=>{mvMotion.writeAnimationSetting('entranceMotionEnabled',false);ctx.groups[0].disabled_members=[];emit('GROUP_UPDATED');});
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelectorAll('#ig-mobile-sprites > .expression-holder img').length===3&&[...document.querySelectorAll('#ig-mobile-sprites img')].every(i=>i.complete));
 // Background pan keeps its progress when only the height changes.
 await page.evaluate(()=>{const bg=document.createElement('div');bg.id='bg1';Object.assign(bg.style,{position:'fixed',inset:'0',zIndex:'-1',backgroundImage:'url("/backgrounds/forest.jpg")',backgroundSize:'cover'});document.body.prepend(bg);mvMotion.writeAnimationSetting('backgroundPanMotionEnabled',true);});
 const pan=()=>page.evaluate(()=>{const a=document.getElementById('bg1').getAnimations()[0];return a?a.currentTime:null;});
 await page.waitForFunction(()=>document.getElementById('bg1').getAnimations().length>0);await page.waitForTimeout(1200);const before=await pan();
 await page.setViewportSize({width:390,height:788});await page.waitForTimeout(200);const after=await pan();assert.ok(after>=before,`pan restarted: ${before} -> ${after}`);
 await page.evaluate(()=>mvMotion.writeAnimationSetting('backgroundPanMotionEnabled',false));
 // Scaled sprites: one shared factor keeps the tallest on screen and keeps relative heights.
 const sprites=()=>page.evaluate(()=>[...document.querySelectorAll('#ig-mobile-sprites > .expression-holder img')].map(i=>{const r=i.getBoundingClientRect();return {top:r.top,height:r.height};}));
 await page.setViewportSize({width:360,height:640});await page.waitForTimeout(200);const normal=await sprites();
 await page.evaluate(()=>{const s=ctx.extensionSettings.ImmersiveGroups;(s.mobileLayoutSettings||={}).layoutSpriteScale=150;window.dispatchEvent(new Event('ig-layout-change'));});await page.waitForTimeout(200);
 const scaled=await sprites();assert.ok(scaled.every(s=>s.top>=-1),JSON.stringify(scaled));assert.equal(await page.evaluate(()=>document.body.classList.contains('ig-mobile-sprites-fitted')),true);
 const ratio=(list)=>list.map(s=>s.height/Math.max(...list.map(x=>x.height)));for(const [a,b] of ratio(normal).map((r,i)=>[r,ratio(scaled)[i]]))assert.ok(Math.abs(a-b)<0.01);
 assert.ok(Math.max(...scaled.map(s=>s.height))>Math.max(...normal.map(s=>s.height)));
 await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.mobileLayoutSettings.layoutSpriteScale=100;window.dispatchEvent(new Event('ig-layout-change'));});await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>document.body.classList.contains('ig-mobile-sprites-fitted')),false);
 // Modals fit inside the padded backdrop on a small phone, and phone captions stay readable.
 await page.evaluate(()=>ImmersiveGroupsGallery.openLibrary({type:'outfit'}));const library=page.locator('.ig-unified-library');await library.waitFor();
 const box=await library.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=640&&box.x>=0&&box.x+box.width<=360,JSON.stringify(box));
 assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.ig-library-types > button, .ig-library-types > button small')].every(n=>parseFloat(getComputedStyle(n).fontSize)>=11)));
 await page.keyboard.press('Escape');await library.waitFor({state:'detached'});
 assert.deepEqual(errors,[]);await page.close();
 console.log('PASS: mobile height-only resizes keep animations and pan progress, width changes still cancel, scaled sprites fit on screen with relative heights, and phone modals fit.');
};
