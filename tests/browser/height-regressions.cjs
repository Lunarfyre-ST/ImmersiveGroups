// SPDX-License-Identifier: AGPL-3.0-only
const assert=require('assert/strict');
module.exports=async(context,url)=>{
 const page=await context.newPage(),errors=[];
 let saved={schemaVersion:1,enableVN_UI:true,enableHeightProfiles:true,heightMode:'manual',heightProfiles:{'alex.png':{heightCm:165,fineTuneOffset:9.090909,offsetY:12},'bea.png':{heightCm:180,fineTuneOffset:0}},mobileHeightProfiles:{'alex.png':{heightCm:165,fineTuneOffset:17,offsetY:-8}},gallery:{}};
 page.on('pageerror',error=>errors.push(error.message));
 // Persist a synthetic settings snapshot between actual page loads. The fixture
 // has no native settings-save endpoint; never use a real user profile here.
 await page.route(url+'/**',async route=>{
  if(new URL(route.request().url()).pathname!=='/')return route.fallback();
  const response=await route.fetch(),html=await response.text();
  await route.fulfill({response,body:html.replace('<script type=module src=',`<script>ctx.extensionSettings.ImmersiveGroups=${JSON.stringify(saved)};</script><script type=module src=`)});
 });
 await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 await page.locator('#ig-tab-outfits').click();await page.locator('#ig-edit-layout').selectOption('desktop');await page.locator('#prome-profile-character').selectOption('alex.png');
 assert.equal(await page.locator('#prome-profile-fine').inputValue(),'9.09');
 await page.locator('#prome-profile-reset').click();assert.equal(await page.locator('#prome-profile-fine').inputValue(),'0');
 await page.locator('#prome-profile-character').selectOption('bea.png');await page.locator('#prome-profile-character').selectOption('alex.png');assert.equal(await page.locator('#prome-profile-fine').inputValue(),'0');
 await page.locator('#ig-edit-layout').selectOption('mobile');assert.equal(await page.locator('#prome-profile-fine').inputValue(),'17');await page.locator('#ig-edit-layout').selectOption('desktop');
 saved=await page.evaluate(()=>JSON.parse(JSON.stringify(ctx.extensionSettings.ImmersiveGroups)));
 // Partially restored settings may keep the current profile fields while
 // losing their migration marker and falling back to the old manual mode.
 delete saved.heightSchemaVersion;delete saved.heightMode;
 await page.reload();await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');await page.locator('#ig-tab-outfits').click();await page.locator('#ig-edit-layout').selectOption('desktop');await page.locator('#prome-profile-character').selectOption('alex.png');
 assert.equal(await page.locator('#prome-profile-fine').inputValue(),'0');assert.equal(await page.locator('#prome-profile-cm').inputValue(),'165');assert.equal(await page.locator('#prome-profile-y').inputValue(),'12');
 await page.locator('#ig-edit-layout').selectOption('mobile');assert.equal(await page.locator('#prome-profile-fine').inputValue(),'17');assert.equal(await page.locator('#prome-profile-y').inputValue(),'-8');
 saved=await page.evaluate(()=>JSON.parse(JSON.stringify(ctx.extensionSettings.ImmersiveGroups)));
 assert.equal(saved.heightSchemaVersion,3);await page.reload();await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.heightProfiles['alex.png'].fineTuneOffset),0);
 assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeChat),true);assert.deepEqual(errors,[]);await page.close();
 console.log('PASS: fine-tune reset survives character/layout changes and reloads with incomplete migration metadata; mobile corrections and heights remain independent.');
};
