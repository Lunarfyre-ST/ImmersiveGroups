// SPDX-License-Identifier: AGPL-3.0-only
const assert=require('node:assert/strict');
module.exports=async(context,url)=>{
 for(const [width,height,viewport] of [[400,1200,{width:390,height:844}],[1200,400,{width:390,height:844}],[100,200,{width:390,height:844}],[1200,400,{width:844,height:390}],[1200,400,{width:1200,height:900}]]){
  const page=await context.newPage();await page.setViewportSize(viewport);
  await page.route('**/characters/**',route=>route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="teal"/></svg>`}));
  await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
  // Relevant native SillyTavern 1.18.0 expression and mobile layout rules.
  await page.addStyleTag({content:`#expression-wrapper{position:fixed;inset:0;display:flex;justify-content:center}body.waifuMode .expression-holder{min-width:100px;min-height:100px;max-height:90vh;max-width:90vw;height:90vh;width:fit-content;position:absolute;bottom:0;left:0;right:0;margin:0 auto;display:flex;justify-content:center;overflow:hidden}img.expression{min-width:100px;min-height:100px;max-height:90vh;max-width:90vh;width:auto;object-fit:contain}#expression-wrapper img.expression{height:auto}@media (max-width:1000px){body.waifuMode .expression-holder{max-width:100vw;height:100vh;width:max-content}body.waifuMode img.expression{object-fit:cover}}@media (max-width:1000px) and (orientation:landscape){body.waifuMode img.expression{object-fit:contain}}.expression-holder{transition:none!important}`});
  await page.evaluate(async()=>{window.layout=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/responsive.js');window.scale=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/scale.js');const s=ctx.extensionSettings.ImmersiveGroups;s.enableVN_UI=true;s.enableHeightProfiles=true;s.layoutMode='mobile';s.mobileLayoutSettings.layoutSpriteScale=100;s.mobileLayoutSettings.heightReferenceMode='visible';s.mobileLayoutSettings.recentSpeakerLimit=0;s.heightProfiles={'alex.png':{heightCm:165,fineTuneOffset:0},'bea.png':{heightCm:180,fineTuneOffset:0},'cedar.png':{heightCm:160,fineTuneOffset:0}};s.mobileHeightProfiles={'alex.png':{fineTuneOffset:0},'bea.png':{fineTuneOffset:0},'cedar.png':{fineTuneOffset:0}};window.savedHeightProfiles=JSON.stringify([s.heightProfiles,s.mobileHeightProfiles]);ctx.groups[0].disabled_members=[];window.dispatchEvent(new Event('ig-layout-change'));emit('GROUP_UPDATED');});
  await page.waitForFunction(()=>document.querySelector('#ig-expression-alex\\.png img')?.naturalWidth>0);
  await page.evaluate(()=>scale.applyScale());
  assert.ok(Math.abs(await page.evaluate(()=>Number(document.getElementById('ig-expression-alex.png').style.getPropertyValue('--prome-sprite-scale')))-165/180)<1e-8);
  await page.evaluate(()=>{ctx.groups[0].disabled_members=['bea.png','cedar.png'];emit('GROUP_UPDATED');});
  await page.waitForFunction(()=>Math.abs(Number(document.getElementById('ig-expression-alex.png')?.style.getPropertyValue('--prome-sprite-scale'))-1)<1e-8);
  await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.mobileLayoutSettings.heightReferenceMode='group';scale.applyScale();});
  assert.ok(Math.abs(await page.evaluate(()=>Number(document.getElementById('ig-expression-alex.png').style.getPropertyValue('--prome-sprite-scale')))-165/180)<1e-8);
  await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.mobileLayoutSettings.heightReferenceMode='visible';scale.applyScale();const image=document.querySelector('#expression-holder img');image.className='expression';image.src='/characters/Alex/outfit1/neutral.png';});
  assert.equal(await page.evaluate(()=>JSON.stringify([ctx.extensionSettings.ImmersiveGroups.heightProfiles,ctx.extensionSettings.ImmersiveGroups.mobileHeightProfiles])===savedHeightProfiles),true);
  await page.waitForFunction(()=>document.querySelector('#expression-holder img').naturalWidth>0);
  const group=await page.evaluate(()=>{const h=document.getElementById('ig-expression-alex.png'),r=h.querySelector('img').getBoundingClientRect();return {height:r.height,width:r.width,factor:Number(h.style.getPropertyValue('--prome-sprite-scale')),fit:getComputedStyle(h.querySelector('img')).objectFit};});
  await page.evaluate(()=>{ctx.groupId=null;emit('CHAT_CHANGED');});
  await page.waitForFunction(()=>!document.body.classList.contains('ig-mobile-group')&&Number(document.getElementById('expression-holder').style.getPropertyValue('--prome-sprite-scale'))===1);
  const solo=await page.evaluate(()=>{const h=document.getElementById('expression-holder'),r=h.querySelector('img').getBoundingClientRect();return {height:r.height,width:r.width,factor:Number(h.style.getPropertyValue('--prome-sprite-scale')),fit:getComputedStyle(h.querySelector('img')).objectFit};});
  assert.equal(group.fit,solo.fit);
  assert.equal(group.factor,1);assert.equal(solo.factor,1);
  assert.ok(Math.abs(group.height-solo.height)<1,`Image ${width}x${height}: group ${JSON.stringify(group)}, solo ${JSON.stringify(solo)}`);
  assert.ok(Math.abs(group.width-solo.width)<1,`Image ${width}x${height}: group ${JSON.stringify(group)}, solo ${JSON.stringify(solo)}`);
  // Non-default fit and per-character corrections must be shared between the
  // same character's solo and group renders without changing stored values.
  await page.evaluate(()=>{ctx.groupId='g';const s=ctx.extensionSettings.ImmersiveGroups;s.mobileLayoutSettings.layoutSpriteScale=115;s.mobileHeightProfiles['alex.png'].fineTuneOffset=12.5;emit('CHAT_CHANGED');});
  await page.waitForFunction(()=>document.body.classList.contains('ig-mobile-group')&&Math.abs(Number(document.getElementById('ig-expression-alex.png')?.style.getPropertyValue('--prome-sprite-scale'))-1.29375)<1e-8);
  const adjustedGroup=await page.evaluate(()=>{const h=document.getElementById('ig-expression-alex.png'),r=h.querySelector('img').getBoundingClientRect();return {height:r.height,width:r.width,factor:Number(h.style.getPropertyValue('--prome-sprite-scale')),fit:getComputedStyle(h.querySelector('img')).objectFit};});
  await page.evaluate(()=>{ctx.groupId=null;emit('CHAT_CHANGED');});
  await page.waitForFunction(()=>!document.body.classList.contains('ig-mobile-group')&&Math.abs(Number(document.getElementById('expression-holder').style.getPropertyValue('--prome-sprite-scale'))-1.29375)<1e-8);
  const adjustedSolo=await page.evaluate(()=>{const h=document.getElementById('expression-holder'),r=h.querySelector('img').getBoundingClientRect();return {height:r.height,width:r.width,factor:Number(h.style.getPropertyValue('--prome-sprite-scale'))};});
  assert.ok(Math.abs(adjustedGroup.factor-1.29375)<1e-8);assert.equal(adjustedSolo.factor,adjustedGroup.factor);
  assert.ok(Math.abs(adjustedGroup.height-adjustedSolo.height)<1);assert.ok(Math.abs(adjustedGroup.width-adjustedSolo.width)<1);
  assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.mobileHeightProfiles['alex.png'].fineTuneOffset),12.5);
  assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeChat),true);
  await page.close();
 }
};
