const assert=require('node:assert/strict');
const path=require('node:path');
// Shared folder gallery: keyboard tiles, details panel, undoable name removal, bulk actions and confirmed deletes.
module.exports=async(context,url)=>{
 const page=await context.newPage();await page.setViewportSize({width:1200,height:900});await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let files=['forest.png','sunset.png'];const deleted=[];
 await page.route('**/api/images/list',route=>route.fulfill({json:files}));
 await page.route('**/api/images/delete',async route=>{const body=JSON.parse(route.request().postData());deleted.push(body.path);files=files.filter(f=>!body.path.endsWith('/'+f));await route.fulfill({json:{}});});
 await page.evaluate(()=>{window.popupCalls=0;ctx.POPUP_TYPE=native.POPUP_TYPE;const original=ctx.callGenericPopup;ctx.callGenericPopup=async(...args)=>{window.popupCalls++;return original?original(...args):true;};});
 await page.evaluate(()=>ImmersiveGroupsGallery.openLibrary({type:'image'}));await page.locator('.ig-unified-library').getByRole('button',{name:'Upload / manage image files',exact:true}).click();
 const gallery=page.getByRole('dialog',{name:'General Gallery',exact:true});await gallery.waitFor();
 const tiles=gallery.locator('.local-image-grid > button.local-image-item');await page.waitForFunction(()=>document.querySelectorAll('.ig-folder-gallery .local-image-grid > button').length===2);
 assert.equal(await gallery.getByRole('button',{name:'sunset.png (no command name)',exact:true}).count(),1);assert.match(await gallery.locator('.assigned-count').textContent(),/1 of 2 images named/);
 await gallery.getByRole('combobox',{name:'Filter gallery images',exact:true}).selectOption('unnamed');assert.equal(await tiles.count(),1);await gallery.getByRole('combobox',{name:'Filter gallery images',exact:true}).selectOption('all');
 // Keyboard: a tile is a button; Enter opens its details and focuses the name field.
 await gallery.getByRole('button',{name:'sunset.png (no command name)',exact:true}).focus();await page.keyboard.press('Enter');
 const details=gallery.getByRole('complementary',{name:'Image details',exact:true});await details.waitFor();assert.equal(await details.getByRole('textbox',{name:'Command name',exact:true}).inputValue(),'sunset');
 await details.getByRole('textbox',{name:'Scene description',exact:true}).fill('Evening sky');await details.getByRole('button',{name:'Assign name',exact:true}).click();
 await page.waitForFunction(()=>ctx.extensionSettings.ImmersiveGroups.gallery.generalAssignments.sunset?.description==='Evening sky');
 // Removing a name is undoable and restores the full saved object.
 const before=await page.evaluate(()=>JSON.stringify(ctx.extensionSettings.ImmersiveGroups.gallery.generalAssignments.sunset));
 await details.getByRole('button',{name:'Remove name',exact:true}).click();assert.equal(await page.evaluate(()=>Object.hasOwn(ctx.extensionSettings.ImmersiveGroups.gallery.generalAssignments,'sunset')),false);
 await gallery.locator('.ig-folder-notice').getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(ctx.extensionSettings.ImmersiveGroups.gallery.generalAssignments.sunset)),before);
 // Renaming keeps bindings/availability and the old name as an alias.
 await gallery.getByRole('button',{name:'forest',exact:true}).click();await details.getByRole('textbox',{name:'Command name',exact:true}).fill('forest glade');assert.match(await details.locator('code').last().textContent(),/::img general forest_glade::/);
 await details.getByRole('button',{name:'Save details',exact:true}).click();
 const renamed=await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.gallery.generalAssignments.forest_glade);assert.equal(renamed.availability,'bound');assert.deepEqual(renamed.characterBindings,['alex.png']);assert.ok(renamed.aliases.includes('forest'));assert.equal(renamed.description,'Forest clearing');
 assert.equal(await page.evaluate(()=>Object.hasOwn(ctx.extensionSettings.ImmersiveGroups.gallery.generalAssignments,'forest')),false);
 await page.screenshot({path:path.join(__dirname,'../artifacts/folder-gallery-details.png')});
 // Escape closes the details panel before the gallery.
 await page.keyboard.press('Escape');await details.waitFor({state:'detached'});assert.equal(await gallery.isVisible(),true);
 // Bulk selection: remove names together, then delete after native confirmation.
 await gallery.getByRole('button',{name:'Select',exact:true}).click();await gallery.getByRole('button',{name:'Select all shown',exact:true}).click();assert.match(await gallery.locator('.ig-folder-bulk').textContent(),/2 images selected/);
 await gallery.getByRole('button',{name:'sunset',exact:true}).click();assert.equal(await gallery.getByRole('button',{name:'sunset',exact:true}).getAttribute('aria-pressed'),'false');
 await gallery.getByRole('button',{name:'Delete files',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.ig-folder-gallery [aria-label="forest_glade"]'));
 assert.equal(await page.evaluate(()=>window.popupCalls),1);assert.deepEqual(deleted,['user/images/LocalImage-General/forest.png']);assert.equal(await page.evaluate(()=>Object.hasOwn(ctx.extensionSettings.ImmersiveGroups.gallery.generalAssignments,'forest_glade')),false);
 // Mobile: details become a bottom sheet without horizontal overflow.
 await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:760});await gallery.getByRole('button',{name:'sunset',exact:true}).click();await details.waitFor();
 assert.ok(await gallery.evaluate(n=>n.scrollWidth<=n.clientWidth));await page.screenshot({path:path.join(__dirname,'../artifacts/folder-gallery-mobile.png')});
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await gallery.waitFor({state:'detached'});
 assert.deepEqual(errors,[]);await page.close();
 console.log('PASS: folder gallery keyboard tiles, details panel, undoable name removal, rename aliases, bulk selection, confirmed deletes and mobile sheet.');
};
