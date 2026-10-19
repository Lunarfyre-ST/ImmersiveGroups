// SPDX-License-Identifier: AGPL-3.0-only
const assert=require('assert/strict'),path=require('path');
module.exports=async(context,url)=>{
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');await page.locator('#ig-tab-animations').click();
 const pane=page.locator('#ig-pane-animations');
 assert.deepEqual(await pane.locator('[data-motion-effect]').evaluateAll(nodes=>nodes.slice(0,2).map(n=>n.dataset.motionEffect)),['breathing','backgroundPan']);
 assert.equal(await pane.locator('[data-motion-effect=entrance]').isVisible(),false);
 await pane.locator('[data-animation-tab=experimental]').click();const entrance=pane.locator('[data-motion-effect=entrance]');await entrance.locator('summary').click();
 const duration=entrance.locator('[type=number][data-animation-setting=entranceMotionDuration]');await duration.fill('0.613');await duration.press('Tab');assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.entranceMotionDuration),613);assert.equal(await entrance.locator('[type=range][data-animation-setting=entranceMotionDuration]').getAttribute('step'),'0.1');
 await page.evaluate(async()=>{const base='/scripts/extensions/third-party/ImmersiveGroups/modules/';window.controls=await import(base+'animation-controls.js');window.motion=await import(base+'scene-motion.js');window.records=[];globalThis[Symbol.for('LunarDebug.sink')]={protocol:1,enabled:true,emit(event,fields){records.push({event,...fields});},begin(event,fields){records.push({event,phase:'start',...fields});return {finish(fields){records.push({event,phase:'end',...fields});}};}};window.cedar=document.getElementById('expression-cedar.png');window.originalCedar=cedar.querySelector('img');window.before037=JSON.stringify([ctx.chat,ctx.extensionSettings.ImmersiveGroups.heightProfiles,ctx.extensionSettings.expressionOverrides]);controls.writeAnimationSetting('entranceMotionEnabled',true);});
 await page.waitForTimeout(700);
 // An unmuted character's entrance must survive group updates and unrelated
 // layout notifications; those notifications do not reload other characters.
 await page.evaluate(()=>{ctx.groups[0].disabled_members=['cedar.png'];cedar.style.display='none';events.GROUP_UPDATED.forEach(fn=>fn());});await page.waitForTimeout(700);
 await page.evaluate(()=>{ctx.groups[0].disabled_members=[];cedar.style.display='';events.GROUP_UPDATED.forEach(fn=>fn());});await page.waitForFunction(()=>originalCedar.getAnimations().length>0);
 await page.evaluate(()=>{window.entranceJob=originalCedar.getAnimations()[0];window.alexSrc=document.getElementById('expression-alex.png').querySelector('img').src;events.GROUP_UPDATED.forEach(fn=>fn());window.dispatchEvent(new Event('ig-layout-change'));});await page.waitForTimeout(60);
 assert.equal(await page.evaluate(()=>entranceJob.playState==='running'),true);assert.equal(await page.evaluate(()=>document.getElementById('expression-alex.png').querySelector('img').src===alexSrc),true);await page.waitForTimeout(700);
 // Match native setImage: two expression-animating images, then replacement.
 await page.evaluate(()=>{records.length=0;originalCedar.classList.add('expression-animating');window.replacement=originalCedar.cloneNode();replacement.classList.add('expression-animating');cedar.append(replacement);});await page.waitForTimeout(40);
 await page.evaluate(()=>{originalCedar.remove();replacement.classList.remove('expression-animating');});await page.waitForTimeout(80);
 assert.equal(await page.evaluate(()=>replacement.getAnimations().length),0);assert.equal(await page.locator('.ig-motion-exit').count(),0);assert.equal(await page.evaluate(()=>records.some(r=>r.stage==='node_replaced')),true);assert.equal(await page.evaluate(()=>records.some(r=>r.event==='animation.motion'&&r.effect==='entrance'&&r.phase==='start')),false);
 // Two overlapping slow loads cannot start an entrance for an obsolete source.
 let release;const gate=new Promise(resolve=>{release=resolve;});await page.route('**/characters/slow-037/**',async route=>{await gate;try{await route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="280"/>'});}catch{/* Superseded requests may already have been cancelled. */}});
 await page.evaluate(()=>{cedar.style.display='none';});await page.waitForTimeout(700);
 await page.evaluate(()=>{records.length=0;cedar.style.display='';replacement.src='/characters/slow-037/first.png';});await page.waitForTimeout(60);
 await page.evaluate(()=>replacement.src='/characters/slow-037/latest.png');await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>replacement.getAnimations().length),0);assert.equal(await page.evaluate(()=>records.some(r=>r.stage==='load_wait')),true);
 release();await page.waitForFunction(()=>replacement.complete&&replacement.naturalWidth>0&&replacement.getAnimations().length>0);await page.waitForTimeout(700);
 assert.equal(await page.evaluate(()=>records.filter(r=>r.event==='animation.motion'&&r.effect==='entrance'&&r.phase==='start'&&!r.exiting).length),1);
 // Waiting intensity changes only the loop, never stored height corrections.
 await page.evaluate(()=>{controls.writeAnimationSetting('entranceMotionEnabled',false);controls.writeAnimationSetting('breathingMotionEnabled',true);controls.writeAnimationSetting('breathingMotionScope','all');controls.writeAnimationSetting('breathingMotionStrength',2);controls.writeAnimationSetting('breathingMotionWaitingStrength',50);motion.updateMotionSpeaker('alex.png');});
 await page.waitForFunction(()=>document.getElementById('expression-bea.png').querySelector('img').getAnimations().some(a=>a.effect.getKeyframes().some(f=>Number(f.scale)===1.01)));
 await page.evaluate(()=>controls.writeAnimationSetting('breathingMotionWaitingStrength',0));await page.waitForTimeout(60);await page.evaluate(()=>motion.updateMotionSpeaker('alex.png'));await page.waitForFunction(()=>document.getElementById('expression-bea.png').querySelector('img').getAnimations().length===0&&document.getElementById('expression-alex.png').querySelector('img').getAnimations().length>0);
 assert.equal(await page.evaluate(()=>JSON.stringify([ctx.chat,ctx.extensionSettings.ImmersiveGroups.heightProfiles,ctx.extensionSettings.expressionOverrides])===before037),true);assert.equal(await page.evaluate(()=>/cedar|alex|slow-037|\.png|http/i.test(JSON.stringify(records))),false);
 await page.setViewportSize({width:390,height:844});await pane.locator('[data-animation-tab=idle]').click();await pane.locator('[data-motion-effect=breathing] > summary').click();assert.equal(await pane.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);await page.screenshot({path:path.join(__dirname,'../artifacts/v037-animations-mobile.png')});assert.deepEqual(errors,[]);await page.close();
 console.log('PASS: seconds UI, idle/experimental tabs, unmute entrance continuity, native node replacement, overlapping slow loads, waiting breathing intensity and unchanged saved data.');
};
