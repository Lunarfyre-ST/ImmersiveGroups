// SPDX-License-Identifier: AGPL-3.0-only
const assert=require('node:assert/strict');
module.exports=async(context,url)=>{
 const page=await context.newPage();await page.setViewportSize({width:390,height:844});
 await page.route('**/characters/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="teal"/></svg>'}));
 await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 await page.addStyleTag({content:'html{transform:translateZ(0)}body{height:100dvh;overflow:hidden}#sheld{position:fixed;inset:0}#extensions_settings{display:none}'});
 const measure=async()=>{
  await page.evaluate(()=>window.scrollTo(100000,100000));
  const data=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,x:scrollX,y:scrollY}));
  assert.deepEqual(data,{width:data.width,height:data.height,scrollWidth:data.width,scrollHeight:data.height,x:0,y:0});
 };

 await page.evaluate(async()=>{window.overflowStage=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/stage-controls.js');window.overflowMotion=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/animation-controls.js');const s=ctx.extensionSettings.ImmersiveGroups;s.layoutMode='mobile';s.stageOffsetX=0;s.stageOffsetY=0;s.enableHeightProfiles=true;s.mobileHeightProfiles['alex.png']={fineTuneOffset:60,offsetY:180};window.dispatchEvent(new Event('ig-layout-change'));});
 await page.waitForFunction(()=>document.querySelector('#ig-mobile-sprites img')?.naturalWidth>0);await measure();
 await page.evaluate(()=>{const bg=document.createElement('div');bg.id='bg1';Object.assign(bg.style,{position:'fixed',inset:'0',backgroundImage:'url("/backgrounds/forest.jpg")',backgroundSize:'cover',zIndex:'-1'});document.body.prepend(bg);overflowMotion.writeAnimationSetting('backgroundPanMotionEnabled',true);overflowMotion.writeAnimationSetting('backgroundPanMotionStrength',10);});
 for(const vertical of [false,true]){
  await page.evaluate(value=>overflowMotion.writeAnimationSetting('backgroundPanMotionMobileVertical',value),vertical);
  await page.waitForFunction(()=>document.getElementById('bg1').getAnimations().length>0);
  await page.evaluate(()=>{for(const animation of document.getElementById('bg1').getAnimations()){animation.pause();animation.currentTime=10000;}});
  await measure();
 }
 // Internal chat scrolling must remain available while the page is contained.
 assert.equal(await page.evaluate(()=>{const chat=document.getElementById('chat');chat.scrollTop=100;return chat.scrollTop>0;}),true);
 await page.evaluate(()=>overflowMotion.writeAnimationSetting('backgroundPanMotionEnabled',false));
 await page.waitForFunction(()=>!document.querySelector('.ig-motion-background-viewport'));
 assert.equal(await page.evaluate(()=>document.getElementById('bg1').parentNode===document.body),true);
 await page.evaluate(()=>{overflowMotion.writeAnimationSetting('entranceMotionEnabled',true);overflowMotion.writeAnimationSetting('entranceMotionDuration',10000);});
 await page.waitForTimeout(100);
 await page.evaluate(()=>document.querySelector('#ig-mobile-sprites > .expression-holder').remove());
 await page.waitForFunction(()=>document.querySelector('.ig-motion-exit'));
 await measure();
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('.ig-motion-exit-viewport,.ig-motion-exit'));
 assert.equal(await page.evaluate(()=>ImmersiveGroups.version),'0.4.0');await page.close();
};
