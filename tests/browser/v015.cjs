const assert=require('assert/strict'),path=require('path');
module.exports=async function verifySettingsReorganization(context,url){
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 const tabs=page.locator('.ig-settings-tabs [role=tab]');
<<<<<<< HEAD
 assert.deepEqual(await tabs.allTextContents(),['Layout','Controls','Characters','Sprites','Animations','Backgrounds','Gallery','Automation','Legacy / Prome','About']);
=======
 assert.deepEqual(await tabs.allTextContents(),['Layout','Controls','Characters','Sprites','Backgrounds','Gallery','Automation','Advanced / Prome','About']);
>>>>>>> 80eb6b24fe0276df89f7dec59ead36cc3c949b60
 assert.equal(await page.locator('#ig-tab-chat').getAttribute('aria-selected'),'true');
 await page.locator('#ig-tab-chat').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#ig-tab-controls').getAttribute('aria-selected'),'true');
 await page.keyboard.press('End');assert.equal(await page.locator('#ig-tab-about').getAttribute('aria-selected'),'true');
 await page.locator('#ig-tab-controls').click();await page.locator('#ig-controls-offsets > summary').click();
 const x=page.locator('input[type=number][data-prome-stage-setting=stageOffsetX]');
 // Default follows the live layout; explicit editing can target the other profile.
 assert.equal(await page.locator('#ig-edit-layout').inputValue(),'auto');
 await x.fill('18');await x.press('Tab');assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.stageOffsetX),18);
 await page.locator('#ig-edit-layout').selectOption('mobile');await x.fill('-9');await x.press('Tab');assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.mobileLayoutSettings.stageOffsetX),-9);assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.stageOffsetX),18);
 await page.locator('#ig-edit-layout').selectOption('auto');await page.locator('#ig-layout-mode').selectOption('mobile');assert.equal(await x.inputValue(),'-9');
 await page.locator('#ig-layout-mode').selectOption('desktop');assert.equal(await x.inputValue(),'18');
 // Main presets target the edited profile, while the live popup targets its display.
 const presets=page.locator('[data-ig-presets]');await presets.locator(':scope > summary').click();await presets.locator('[data-live-preset-name]').fill('Main PC');await presets.locator('[data-live-save]').click();
 await x.fill('39');await x.press('Tab');await presets.locator('[data-live-load]').click();assert.equal(await x.inputValue(),'18');
 await page.locator('#prome-stage-manage').click();const live=page.locator('.ig-live-tuning');await live.locator('[data-live-presets] > summary').click();assert.ok((await live.locator('[data-live-preset] option').allTextContents()).includes('Main PC'));await live.locator('[data-live-close]').click();
 await page.locator('#ig-tab-outfits').click();await page.locator('#prome-profile-character').selectOption('bea.png');
 await page.locator('#prome-profile-cm').fill('169');await page.locator('#prome-profile-cm').press('Tab');
 await page.locator('#ig-pane-outfits details > summary').filter({hasText:'Button colors'}).click();
 const color=page.locator('#ig-character-colors input[aria-label="Button background"]');await color.evaluate(n=>{n.value='#337755';n.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.outfitCatalog['bea.png'].colors.background),'#337755');
 await page.locator('#prome-open-outfit-editor').click();assert.equal(await page.locator('.ig-unified-library [aria-label="Library character"]').inputValue(),'bea.png');
 await page.locator('.ig-unified-library [aria-label="Library character"]').selectOption('cedar.png');await page.locator('.ig-unified-library > .local-image-modal-header').getByRole('button',{name:'Close',exact:true}).click();assert.equal(await page.locator('#prome-profile-character').inputValue(),'cedar.png');assert.equal(await page.locator('#prome-profile-cm').inputValue(),'180');
 await page.locator('#prome-profile-character').selectOption('bea.png');assert.equal(await color.inputValue(),'#337755');assert.equal(await page.locator('#prome-profile-cm').inputValue(),'169');
 await page.screenshot({path:path.join(__dirname,'../artifacts/settings-characters-v015.png')});
 // Feature switches disable only their options and retain previous values.
 await page.locator('#ig-tab-chat').click();const rows=page.locator('#prome-quick-reply-desktop');await rows.fill('4');await page.locator('#prome-limit-quick-replies').uncheck();assert.equal(await rows.isDisabled(),true);assert.equal(await rows.inputValue(),'4');await page.locator('#prome-limit-quick-replies').check();assert.equal(await rows.isEnabled(),true);assert.equal(await rows.inputValue(),'4');
 await page.locator('#ig-tab-sprites').click();const dim=page.locator('[data-prome-stage-setting=speakerDimCurrent][type=number]');assert.equal(await dim.isDisabled(),true);await page.locator('#ig-pane-sprites details > summary').filter({hasText:'Speaker dimming'}).click();await page.locator('#prome-sprite-defocus-tint').check();assert.equal(await dim.isEnabled(),true);
 await page.locator('#ig-tab-gallery').click();assert.equal(await page.locator('#ig-pane-gallery [data-gallery-setting=enabled]').count(),0);
 const repeat=page.locator('[data-gallery-setting=repeatEnabled]'),cooldown=page.locator('[data-gallery-setting=cooldownRounds]');assert.equal(await cooldown.isDisabled(),true);await repeat.check();assert.equal(await cooldown.isEnabled(),true);await repeat.uncheck();assert.equal(await cooldown.isDisabled(),true);
 const floating=page.locator('[data-localimage-ui=quickSendPlacement]');await floating.evaluate(n=>n.closest('details').open=true);assert.equal(await page.locator('[data-localimage-ui=buttonSize]').isDisabled(),true);await floating.selectOption('both');assert.equal(await page.locator('[data-localimage-ui=buttonSize]').isEnabled(),true);await floating.selectOption('scene');
 await page.getByRole('button',{name:'Image prompt settings → Automation',exact:true}).click();assert.equal(await page.locator('#ig-tab-context').getAttribute('aria-selected'),'true');
 const prompt=page.locator('#ig-gallery-model-prompt'),enabled=prompt.locator('[data-gallery-setting=enabled]');assert.equal(await enabled.isChecked(),true);await prompt.locator('.ig-gallery-prompt-advanced > summary').click();await enabled.uncheck();assert.equal(await prompt.locator('textarea').isDisabled(),true);assert.equal(await page.evaluate(()=>prompts['ImmersiveGroups.Gallery'].prompt),'');await enabled.check();assert.equal(await prompt.locator('textarea').isEnabled(),true);assert.match(await page.evaluate(()=>prompts['ImmersiveGroups.Gallery'].prompt),/::img general forest::/);
 assert.equal(await page.locator('#ig-automation-roadmap input,#ig-automation-roadmap select').count(),0);
 await page.locator('#ig-tab-backgrounds').click();await page.locator('.ig-background-defaults > summary').click();assert.equal(await page.getByRole('spinbutton',{name:'Background load delay (ms)',exact:true}).isDisabled(),true);await page.locator('[data-bg-auto]').check();assert.equal(await page.getByRole('spinbutton',{name:'Background load delay (ms)',exact:true}).isEnabled(),true);await page.locator('[data-bg-auto]').uncheck();
 // Every tab stays within a phone viewport and exposes just one selected pane.
 await page.locator('#ig-tab-controls').click();await page.locator('#ig-edit-layout').selectOption('auto');await page.locator('#ig-layout-mode').selectOption('auto');await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('input[type=number][data-prome-stage-setting=stageOffsetX]').value==='-9');assert.equal(await x.inputValue(),'-9');
 for(const id of ['chat','controls','outfits','sprites','backgrounds','gallery','context','original','about']){await page.locator('#ig-tab-'+id).click();assert.equal(await page.locator('.ig-settings-panes > section:not([hidden])').count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow in ${id}`);}
 await page.locator('#ig-tab-chat').click();await page.locator('[data-ig-presets]').evaluate(n=>n.open=false);await page.locator('.prome-vn-settings').screenshot({path:path.join(__dirname,'../artifacts/settings-layout-mobile-v015.png')});
 await page.waitForFunction(()=>document.querySelectorAll('#chat img.localimage-inserted').length===6);
 assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeChat),true);assert.deepEqual(errors,[]);await page.close();
};
