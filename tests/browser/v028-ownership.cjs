const assert=require('assert/strict');
module.exports=async function verifyOwnership(context,url){
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 await page.evaluate(async()=>{const base='/scripts/extensions/third-party/ImmersiveGroups/modules/';window.owners028=await import(base+'outfit-catalog.js');window.stageOwners028=await import(base+'stage-controls.js');window.beforeOwners028=JSON.stringify(ctx.chat);window.ownerGroup028=ctx.groupId;ctx.groupId=null;ctx.characterId=0;const holder=document.createElement('div');holder.id='expression-holder';holder.className='expression-holder';const image=document.createElement('img');image.src='/characters/Alex/outfit1/neutral.png';holder.append(image);document.body.append(holder);window.reusedSprite028=image;});
 await page.waitForTimeout(30);
 // Native single-character holders survive chat switches. Mutation oldValue must
 // not attach Alex's previous source to Bea, or Bea's source to Alex.
 await page.evaluate(()=>{ctx.characterId=1;reusedSprite028.src='/characters/Bea/outfit2/neutral.png';});await page.waitForTimeout(50);
 await page.evaluate(()=>{ctx.characterId=0;reusedSprite028.src='/characters/Alex/outfit1/neutral.png';});await page.waitForTimeout(50);
 assert.equal(await page.evaluate(()=>owners028.outfitOptions(ctx.characters[1],true).some(e=>e.folder.startsWith('Alex/'))),false);
 assert.equal(await page.evaluate(()=>owners028.outfitOptions(ctx.characters[0],true).some(e=>e.folder.startsWith('Bea/'))),false);
 // Unknown custom roots must not be inferred from another chat's stale image.
 await page.evaluate(()=>{ctx.characterId=0;ctx.extensionSettings.expressionOverrides.find(e=>e.name==='alex').path='CustomAlex/night';owners028.rememberNativeOutfits();reusedSprite028.src='/characters/CustomAlex/night/neutral.png';});await page.waitForTimeout(30);
 await page.evaluate(()=>{ctx.characterId=1;reusedSprite028.src='/characters/Bea/outfit1/neutral.png';});await page.waitForTimeout(30);
 assert.equal(await page.evaluate(()=>owners028.outfitOptions(ctx.characters[1],true).some(e=>e.folder==='CustomAlex/night')),false);
 const repair=await page.evaluate(()=>{
  ctx.groupId=ownerGroup028;ctx.characterId=0;document.getElementById('expression-holder').remove();const s=ctx.extensionSettings.ImmersiveGroups;
  owners028.catalogFor('alex.png').outfits.push({folder:'Bea/winter',label:'Winter',description:'KEEP ORIGINAL NOTES',hidden:false,source:'observed'});
  s.outfitFolders['alex.png'].push('Bea/winter');owners028.catalogFor('bea.png').outfits.push({folder:'Alex/outfit2',label:'Other wrong entry',description:'SECOND NOTES',source:'discovered'});
  ctx.extensionSettings.expressionOverrides.find(e=>e.name==='alex').path='Bea/winter';const overrides=JSON.stringify(ctx.extensionSettings.expressionOverrides);
  owners028.rememberNativeOutfits();stageOwners028.refreshStageControls();
  const candidate=owners028.discoveryCandidates(ctx.characters[0],'Bea/winter');
  const rejected=owners028.rememberOutfit(ctx.characters[0],'Bea/outfit2');
  const imported=owners028.importFolderNames(ctx.characters[0],[{webkitRelativePath:'characters/Bea/robe/neutral.png'}],'Bea/winter');
  const api=ImmersiveGroupsSceneLibrary;
  return {overridesUnchanged:overrides===JSON.stringify(ctx.extensionSettings.expressionOverrides),archived:api.getMismatchedOutfits(),mirror:s.outfitFolders['alex.png'],entries:api.getEntries().filter(e=>e.kind==='outfit'&&e.avatar==='alex.png').map(e=>e.folder),candidate,rejected,imported,automatic:owners028.automaticOutfitAllowed('alex.png','Bea/winter'),current:stageOwners028.currentFolder(ctx.characters[0])};
 });
 assert.equal(repair.overridesUnchanged,true);assert.equal(repair.archived.find(e=>e.avatar==='alex.png'&&e.folder==='Bea/winter').description,'KEEP ORIGINAL NOTES');assert.ok(!repair.mirror.includes('Bea/winter'));assert.ok(!repair.entries.includes('Bea/winter'));assert.ok(!repair.candidate.some(f=>f.startsWith('Bea/')));assert.equal(repair.rejected,false);assert.equal(repair.imported,0);assert.equal(repair.automatic,false);assert.ok(!repair.current.startsWith('Bea/'));
 // Repair is idempotent and preserved notes can be explicitly restored as shared.
 await page.evaluate(()=>{owners028.repairOutfitOwnership();ImmersiveGroupsGallery.openLibrary({type:'outfit',character:'alex.png'});});const library=page.locator('.ig-unified-library');await library.waitFor();
 assert.equal(await library.locator('.ig-library-card').filter({hasText:'Bea/winter'}).count(),0);
 await library.getByRole('button',{name:/Review mismatched outfits/}).click();const review=library.locator('.ig-library-mismatches');await review.waitFor();const saved=review.locator('article').filter({hasText:'Bea/winter'});assert.match(await saved.textContent(),/KEEP ORIGINAL NOTES/);
 await saved.getByRole('button',{name:'Restore as shared outfit',exact:true}).click();await page.waitForFunction(()=>owners028.outfitOptions(ctx.characters[0],true).some(e=>e.folder==='Bea/winter'));
 const restored=await page.evaluate(()=>owners028.outfitOptions(ctx.characters[0],true).find(e=>e.folder==='Bea/winter'));assert.equal(restored.explicit,true);assert.equal(restored.description,'KEEP ORIGINAL NOTES');
 await page.evaluate(()=>owners028.repairOutfitOwnership());assert.equal(await page.evaluate(()=>owners028.quarantinedOutfits().some(e=>e.avatar==='alex.png'&&e.folder==='Bea/winter')),false);
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 // Removing an accidental shared entry suppresses native/legacy re-insertion.
 await page.evaluate(()=>{owners028.removeOutfit('alex.png','Bea/winter');owners028.rememberNativeOutfits();owners028.seedOutfits(ctx.characters[0],'Bea/winter');});assert.equal(await page.evaluate(()=>owners028.outfitOptions(ctx.characters[0],true).some(e=>e.folder==='Bea/winter')),false);
 assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeOwners028),true);assert.deepEqual(errors,[]);await page.close();
};
