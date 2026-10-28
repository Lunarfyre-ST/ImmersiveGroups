// SPDX-License-Identifier: AGPL-3.0-only
const assert=require('node:assert/strict');
const {inflateSync}=require('node:zlib');
// A one-pixel PNG has no preceding pixels/rows, so every PNG filter leaves
// its first RGB sample unchanged. Check painted output as well as DOM opacity.
function pixel(png){
 assert.equal(png.readUInt32BE(16),1);assert.equal(png.readUInt32BE(20),1);assert.equal(png[24],8);assert.ok([2,6].includes(png[25]));
 const chunks=[];
 for(let offset=8;offset<png.length;){const length=png.readUInt32BE(offset);if(png.toString('ascii',offset+4,offset+8)==='IDAT')chunks.push(png.subarray(offset+8,offset+8+length));offset+=length+12;}
 return [...inflateSync(Buffer.concat(chunks)).subarray(1,4)];
}
module.exports=async(context,url)=>{
 const page=await context.newPage();await page.setViewportSize({width:390,height:844});
 // Native #bg1 exists before extension startup, with fixed background attachment
 // and absolute positioning inside SillyTavern's transformed viewport root.
 await page.route(url,async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('<body>',`<body><div id="bg1" style='position:absolute;inset:0;width:100%;height:100%;z-index:-1;background-image:url("/backgrounds/forest.jpg");background-size:cover;background-attachment:fixed'></div>`)});});
 await page.route('**/backgrounds/**',route=>route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="${route.request().url().includes('town')?'purple':'teal'}"/></svg>`}));
 await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 await page.addStyleTag({content:'html{transform:translateZ(0)}body{height:100dvh;overflow:hidden;background:black}#sheld{position:fixed;inset:0}#extensions_settings{display:none}body > :not(.ig-motion-background-viewport):not(#bg1):not(.ig-background-transition):not(.ig-motion-scene-fade){visibility:hidden}'});
 await page.evaluate(async()=>{window.mc=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/animation-controls.js');const s=ctx.extensionSettings.ImmersiveGroups;s.layoutMode='mobile';s.backgroundFadeEnabled=true;s.backgroundFadeIn=120;s.backgroundFadeOut=120;s.backgroundFadeLinked=true;mc.writeAnimationSetting('backgroundPanMotionEnabled',true);mc.writeAnimationSetting('sceneMotionEnabled',true);});
 await page.waitForFunction(()=>document.querySelector('.ig-motion-background-viewport'));
 await page.evaluate(()=>{window.backgroundNode=document.getElementById('bg1');window.backgroundParent=backgroundNode.parentNode;window.panAnimation=backgroundNode.getAnimations()[0];window.backgroundMoves=0;new MutationObserver(records=>{backgroundMoves+=records.filter(r=>[...r.removedNodes].includes(backgroundNode)).length;}).observe(document.body,{childList:true,subtree:true});});
 for(const mode of ['cross','sequential']){
  await page.evaluate(value=>mc.writeAnimationSetting('backgroundFadeMode',value),mode);
  for(const file of ['town','forest']){
   await page.evaluate(value=>backgroundNode.style.backgroundImage=`url("/backgrounds/${value}.jpg")`,file);
   await page.waitForFunction(()=>Boolean(document.querySelector('.ig-background-transition')));
   await page.waitForFunction(()=>!document.querySelector('.ig-background-transition,.ig-motion-scene-fade')&&!backgroundNode.getAnimations().some(a=>a.effect.getKeyframes().some(f=>f.opacity!==undefined)));
   assert.equal(await page.evaluate(()=>getComputedStyle(backgroundNode).opacity),'1');
   assert.equal(await page.evaluate(()=>document.getElementById('bg1')===backgroundNode&&backgroundNode.parentNode===backgroundParent&&backgroundNode.getAnimations().includes(panAnimation)&&backgroundMoves===0),true);
   assert.deepEqual(pixel(await page.screenshot({clip:{x:20,y:20,width:1,height:1}})),file==='town'?[128,0,128]:[0,128,128]);
   assert.deepEqual(await page.evaluate(()=>{window.scrollTo(99999,99999);return [scrollX,scrollY];}),[0,0]);
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('.ig-motion-background-viewport'));
 assert.equal(await page.evaluate(()=>backgroundNode.parentNode===document.body),true);
 assert.deepEqual(pixel(await page.screenshot({clip:{x:20,y:20,width:1,height:1}})),[0,128,128]);
 await page.close();
};
