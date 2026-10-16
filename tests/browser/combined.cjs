const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium:pw}=require('playwright');
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const launchArgs=process.env.PLAYWRIGHT_CHROMIUM_ARGS?JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS):[];
const importPattern=/import\s+([\s\S]*?)\s+from\s*['"]([^'"]+)['"]/g;
function imports(source){return [...source.matchAll(importPattern)].map(m=>({source:m[2],names:m[1].startsWith('*')?[]:(m[1].match(/\{([\s\S]*?)\}/)?.[1]||'').split(',').map(s=>s.trim().split(/\s+as\s+/)[0]).filter(Boolean)}));}
const root=path.resolve(__dirname,'../..'),prefix='/scripts/extensions/third-party/ImmersiveGroups/';
const native=new Map();for(const file of ['index.js','prome.js','constants.js','utils.js','listeners.js',...fs.readdirSync(root+'/modules').filter(x=>x.endsWith('.js')).map(x=>'modules/'+x)]){for(const node of imports(fs.readFileSync(root+'/'+file,'utf8'))){const url=new URL(node.source,'http://fixture'+prefix+file).pathname;if(url.startsWith(prefix))continue;if(!native.has(url))native.set(url,new Set());for(const name of node.names)native.get(url).add(name);}}
for(const [url,keys] of native){if(url.endsWith('/extensions.js'))['extensionNames','getExtensionManifest'].forEach(n=>keys.add(n));if(url.endsWith('/expressions/index.js'))['lastExpression','visualNovelUpdateLayers'].forEach(n=>keys.add(n));if(url.endsWith('/backgrounds.js'))['getBackgroundPath','background_settings'].forEach(n=>keys.add(n));}
let requests=[];const seed=`window.calls=[];window.saves=0;window.events={};window.ctx={groupId:'g',characterId:0,name1:'User',characters:[{name:'Alex',avatar:'alex.png'},{name:'Bea',avatar:'bea.png'},{name:'Cedar',avatar:'cedar.png'}],groups:[{id:'g',name:'Test Group',members:['alex.png','bea.png','cedar.png'],disabled_members:[]}],chat:Array.from({length:60},(_,i)=>({name:['Alex','Bea','Cedar'][i%3],original_avatar:['alex.png','bea.png','cedar.png'][i%3],mes:i%10===0?'Image ::img general forest::':'Message '+i})),extensionSettings:{disabledExtensions:['third-party/Prome-VN-Extension','third-party/SillyTavern-LocalImage'],'Prome-VN-Extension':{enableVN_UI:true,autoDiscoverOutfits:true,hideBasicOutfit:true,stageShowLocks:true,enableHeightProfiles:true,heightProfiles:{'alex.png':{scalePercent:75}},stageIdleOpacity:83,outfitCatalog:{'alex.png':{outfits:[{folder:'Alex/outfit1',label:'Main',description:'Adventure'}],ignored:[],locked:true}}},'SillyTavern-LocalImage':{enabled:true,generalAssignments:{forest:{path:'user/images/LocalImage-General/forest.png',description:'Forest clearing',availability:'bound',characterBindings:['alex.png']}},ui:{showFloatingButton:false},prompt:{enabled:true}} ,expressionOverrides:[{name:'alex',path:'Alex/outfit1'},{name:'bea',path:'Bea/outfit1'},{name:'cedar',path:'Cedar/outfit1'}]},saveSettingsDebounced(){saves++;},getRequestHeaders:()=>({'Content-Type':'application/json'}),getCurrentChatId:()=> 'test-chat',setExtensionPrompt(key,prompt,type,depth,scan,role){(window.prompts||={})[key]={prompt,type,depth,role};}};
window.SillyTavern={getContext:()=>ctx};window.beforeLegacy=JSON.stringify({'Prome-VN-Extension':ctx.extensionSettings['Prome-VN-Extension'],'SillyTavern-LocalImage':ctx.extensionSettings['SillyTavern-LocalImage']});window.beforeChat=JSON.stringify(ctx.chat);window.emit=(name,...args)=>(events[name]||[]).forEach(fn=>fn(...args));const eventNames=['CHAT_CHANGED','GROUP_UPDATED','CHARACTER_MESSAGE_RENDERED','MESSAGE_RECEIVED','MESSAGE_RENDERED','MESSAGE_SWIPED','MESSAGE_DELETED','MESSAGE_EDITED','GENERATION_STARTED','GENERATION_AFTER_COMMANDS','GENERATION_ENDED','GENERATION_STOPPED','GROUP_MEMBER_DRAFTED','GROUP_WRAPPER_STARTED','GROUP_WRAPPER_FINISHED','SETTINGS_UPDATED','CHAT_COMPLETION_PROMPT_READY','GENERATE_AFTER_COMBINE_PROMPTS'];
const Placeholder=function(...args){};Placeholder.fromProps=x=>x;const noop=()=>{};window.native={getContext:()=>ctx,extension_settings:ctx.extensionSettings,extensionNames:['third-party/ImmersiveGroups','third-party/Prome-VN-Extension','third-party/SillyTavern-LocalImage'],getExtensionManifest:name=>({display_name:name.split('/').pop()}),saveSettingsDebounced:ctx.saveSettingsDebounced,getRequestHeaders:ctx.getRequestHeaders,eventSource:{on:(name,fn)=>{(events[name]||=[]).push(fn)}},event_types:Object.fromEntries(eventNames.map(n=>[n,n])),power_user:{waifuMode:true,movingUIState:{}},isGenerating:()=>Boolean(window.fixtureGenerating),Generate:async(type,args)=>calls.push({type,args}),debounce:fn=>{let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),5)}},debounce_timeout:{short:5,quick:5,relaxed:5},isMobile:()=>window.nativeMobile||false,visualNovelUpdateLayers:async()=>{window.nativeRebuilds=(window.nativeRebuilds||0)+1},lastExpression:{},chat_metadata:{},background_settings:{name:'forest.jpg',url:'url("backgrounds/forest.jpg")'},getBackgroundPath:f=>'backgrounds/'+encodeURIComponent(f),renderExtensionTemplateAsync:async(name,file)=>{const r=await fetch('/scripts/extensions/'+name+'/'+file+'.html');if(!r.ok)throw Error('Missing template '+file);return r.text()},SlashCommand:Placeholder,SlashCommandNamedArgument:Placeholder,SlashCommandEnumValue:Placeholder,SlashCommandParser:{addCommandObject:noop},ARGUMENT_TYPE:{BOOLEAN:1,NUMBER:2,STRING:3},enumTypes:{enum:1},POPUP_TYPE:{TEXT:1,CONFIRM:2},callGenericPopup:async()=>true};for(const name of ['getRequestHeaders','saveSettingsDebounced'])ctx[name]=native[name];ctx.eventTypes=native.event_types;ctx.eventSource=native.eventSource;window.toastr={error:(...a)=>console.error('TOAST',...a),info:noop,warning:noop};
<<<<<<< HEAD
if(new URL(location.href).searchParams.has('v012'))ctx.extensionSettings.ImmersiveGroups={schemaVersion:1,heightSchemaVersion:2,enableVN_UI:true,enableHeightProfiles:true,heightProfiles:{'alex.png':{heightCm:145,fineTunePercent:110}},mobileHeightProfiles:{'alex.png':{heightCm:145,fineTunePercent:80}},layoutSpriteScale:110,mobileLayoutSettings:{layoutSpriteScale:85},gallery:{}};if(new URL(location.href).searchParams.has('conflict'))ctx.extensionSettings.disabledExtensions=[];if(new URL(location.href).searchParams.has('fresh')){delete ctx.extensionSettings['Prome-VN-Extension'];delete ctx.extensionSettings['SillyTavern-LocalImage'];}if(new URL(location.href).searchParams.has('clean')){for(const key of Object.keys(ctx.extensionSettings))if(key!=='disabledExtensions')delete ctx.extensionSettings[key];native.power_user.waifuMode=false;for(const image of document.querySelectorAll('#visual-novel-wrapper img'))image.src=image.src.replace('/outfit1/','/');if(new URL(location.href).searchParams.has('empty')){ctx.characters=[];ctx.groups=[];ctx.groupId=null;ctx.characterId=null;ctx.chat=[];}window.beforeChat=JSON.stringify(ctx.chat);}if(new URL(location.href).searchParams.has('sharedheaders')){window.sharedRequestHeaders={'Content-Type':'application/json','X-CSRF-Token':'fixture-token'};ctx.getRequestHeaders=native.getRequestHeaders=()=>sharedRequestHeaders;}document.getElementById('chat').innerHTML=ctx.chat.map((m,i)=>'<div class="mes" mesid="'+i+'"><div class="mes_text"><p><em>Action</em> <q>Dialogue</q> '+m.mes+'</p></div></div>').join('');`;
const baseStyle=`:root{--SmartThemeBodyColor:#e8e9ed;--SmartThemeBlurTintColor:#252933;--SmartThemeBorderColor:#ffffff30;--SmartThemeQuoteColor:#c6afe5}*{box-sizing:border-box}body{font-family:Arial;background:#151820;color:#e8e9ed;margin:0}button,input,textarea,select{font:inherit;color:inherit;background:#272d38;border:1px solid #ffffff30;border-radius:5px}.text_pole{padding:6px}.menu_button{padding:7px;cursor:pointer}#sheld{position:relative;z-index:30;display:flex;flex-direction:column;max-width:1100px;margin:auto}#chat{max-height:280px;overflow:auto}.mes{padding:8px;border-bottom:1px solid #ffffff20}.expression-holder{position:absolute;bottom:0;width:max-content;height:280px}.expression-holder img{height:280px;width:auto}#visual-novel-wrapper{position:relative;height:300px;width:100%}#extensions_settings{position:relative;z-index:2000;max-width:660px;margin:auto}small{font-size:12px}.inline-drawer-content{display:block!important}`;
const html=`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>${baseStyle}</style><link rel=stylesheet href="${prefix}style.css"><body><div id=sheld><div id=visual-novel-wrapper>${['Alex','Bea','Cedar'].map(n=>'<div class="expression-holder" id="expression-'+n.toLowerCase()+'.png"><img src="/characters/'+n+'/outfit1/neutral.png" data-expression="neutral"></div>').join('')}</div><div id=expression-wrapper><div id=expression-holder class=expression-holder><img></div></div><div id=chat></div><div id="qr--bar"><div class="qr--buttons"><button type="button" class="qr--button">Quick Reply</button></div></div><form id=send_form><textarea id=send_textarea></textarea></form></div><div id=extensions_settings></div><div id=extensionsMenu></div><div class=persona_controls_buttons_block></div><script src=/jquery.js></script><script>${seed}</script><script type=module src="${prefix}index.js"></script>`;
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://fixture');requests.push(url.pathname);if(url.pathname==='/jquery.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(root+'/node_modules/jquery/dist/jquery.min.js'));}else if(native.has(url.pathname)){res.setHeader('Content-Type','application/javascript');const names=[...native.get(url.pathname)];res.end(names.map(name=>`export const ${name} = window.native[${JSON.stringify(name)}] ?? function(){};`).join('\n'));}else if(url.pathname.startsWith(prefix)){const file=path.join(root,url.pathname.slice(prefix.length));if(!fs.existsSync(file)){res.writeHead(404);res.end('Missing '+file);return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'text/plain');res.end(fs.readFileSync(file));}else if(url.pathname==='/api/backgrounds/all'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({images:['forest.jpg','town.jpg']}));}else if(url.pathname.startsWith('/backgrounds/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="68" height="44"></svg>');}else if(url.pathname==='/api/images/list'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(['forest.png']));}else if(url.pathname==='/api/sprites/get'){const folder=url.searchParams.get('name');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(/outfit[12]$/.test(folder)?[{label:'neutral',path:'/characters/'+folder+'/neutral.png'}]:[]));}else if(url.pathname.startsWith('/characters/')||url.pathname.startsWith('/user/images/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="280"><rect width="100" height="280" fill="#739b84"/></svg>');}else{res.setHeader('Content-Type','text/html');res.end(html);}});
(async()=>{fs.mkdirSync(path.join(root,'tests/artifacts'),{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await pw.launch({...(executablePath?{executablePath}:{}),args:launchArgs,headless:true});const browserContext=await browser.newContext({viewport:{width:1200,height:1200},hasTouch:true});const page=await browserContext.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message)});page.on('console',msg=>{if(msg.type()==='error')console.error('CONSOLE',msg.text())});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');assert.equal(await page.locator('.prome-vn-settings').count(),1);assert.equal(await page.locator('#ig-tab-gallery').count(),1);assert.equal(await page.locator('.ig-settings-tabs [role=tab]').count(),10);assert.equal(await page.evaluate(()=>JSON.stringify({'Prome-VN-Extension':ctx.extensionSettings['Prome-VN-Extension'],'SillyTavern-LocalImage':ctx.extensionSettings['SillyTavern-LocalImage']})===beforeLegacy),true);assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.heightProfiles['alex.png'].fineTuneOffset),-25);assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.gallery.prompt.enabled),true);await page.waitForFunction(()=>document.querySelectorAll('#chat img.localimage-inserted').length===6);assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeChat),true);

 if(process.env.IG_BROWSER_ONLY==='ownership'){await require('./v028-ownership.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: cross-character folder ownership, recycled sprite holders, safe quarantine, native overrides, recovery and re-insertion guards.');await browser.close();server.close();return;}
 if(process.env.IG_BROWSER_ONLY==='crossfades'){await require('./v028.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: crossfades, linked timings, reset defaults, live animation controls and sequential backgrounds.');await browser.close();server.close();return;}
 if(process.env.IG_BROWSER_ONLY==='scene-preferences'){await require('./v027.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: scrollable chat, live automation status, color inheritance and cancellable scene animations.');await browser.close();server.close();return;}
 if(process.env.IG_BROWSER_ONLY==='audit'){await require('./v026.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: audit fixes, concurrency, prompt ownership, stale uploads and row-scoped rendering.');await browser.close();server.close();return;}
=======
if(new URL(location.href).searchParams.has('v012'))ctx.extensionSettings.ImmersiveGroups={schemaVersion:1,heightSchemaVersion:2,enableVN_UI:true,enableHeightProfiles:true,heightProfiles:{'alex.png':{heightCm:145,fineTunePercent:110}},mobileHeightProfiles:{'alex.png':{heightCm:145,fineTunePercent:80}},layoutSpriteScale:110,mobileLayoutSettings:{layoutSpriteScale:85},gallery:{}};if(new URL(location.href).searchParams.has('conflict'))ctx.extensionSettings.disabledExtensions=[];if(new URL(location.href).searchParams.has('fresh')){delete ctx.extensionSettings['Prome-VN-Extension'];delete ctx.extensionSettings['SillyTavern-LocalImage'];}if(new URL(location.href).searchParams.has('clean')){for(const key of Object.keys(ctx.extensionSettings))if(key!=='disabledExtensions')delete ctx.extensionSettings[key];native.power_user.waifuMode=false;for(const image of document.querySelectorAll('#visual-novel-wrapper img'))image.src=image.src.replace('/outfit1/','/');if(new URL(location.href).searchParams.has('empty')){ctx.characters=[];ctx.groups=[];ctx.groupId=null;ctx.characterId=null;ctx.chat=[];}window.beforeChat=JSON.stringify(ctx.chat);}document.getElementById('chat').innerHTML=ctx.chat.map((m,i)=>'<div class="mes" mesid="'+i+'"><div class="mes_text"><p><em>Action</em> <q>Dialogue</q> '+m.mes+'</p></div></div>').join('');`;
const baseStyle=`:root{--SmartThemeBodyColor:#e8e9ed;--SmartThemeBlurTintColor:#252933;--SmartThemeBorderColor:#ffffff30;--SmartThemeQuoteColor:#c6afe5}*{box-sizing:border-box}body{font-family:Arial;background:#151820;color:#e8e9ed;margin:0}button,input,textarea,select{font:inherit;color:inherit;background:#272d38;border:1px solid #ffffff30;border-radius:5px}.text_pole{padding:6px}.menu_button{padding:7px;cursor:pointer}#sheld{position:relative;z-index:30;display:flex;flex-direction:column;max-width:1100px;margin:auto}#chat{max-height:280px;overflow:auto}.mes{padding:8px;border-bottom:1px solid #ffffff20}.expression-holder{position:absolute;bottom:0;width:max-content;height:280px}.expression-holder img{height:280px;width:auto}#visual-novel-wrapper{position:relative;height:300px;width:100%}#extensions_settings{position:relative;z-index:2000;max-width:660px;margin:auto}small{font-size:12px}.inline-drawer-content{display:block!important}`;
const html=`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>${baseStyle}</style><link rel=stylesheet href="${prefix}style.css"><body><div id=sheld><div id=visual-novel-wrapper>${['Alex','Bea','Cedar'].map(n=>'<div class="expression-holder" id="expression-'+n.toLowerCase()+'.png"><img src="/characters/'+n+'/outfit1/neutral.png" data-expression="neutral"></div>').join('')}</div><div id=expression-wrapper><div id=expression-holder class=expression-holder><img></div></div><div id=chat></div><div id="qr--bar"><div class="qr--buttons"><button type="button" class="qr--button">Quick Reply</button></div></div><form id=send_form><textarea id=send_textarea></textarea></form></div><div id=extensions_settings></div><div id=extensionsMenu></div><div class=persona_controls_buttons_block></div><script src=/jquery.js></script><script>${seed}</script><script type=module src="${prefix}index.js"></script>`;
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://fixture');requests.push(url.pathname);if(url.pathname==='/jquery.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(root+'/node_modules/jquery/dist/jquery.min.js'));}else if(native.has(url.pathname)){res.setHeader('Content-Type','application/javascript');const names=[...native.get(url.pathname)];res.end(names.map(name=>`export const ${name} = window.native[${JSON.stringify(name)}] ?? function(){};`).join('\n'));}else if(url.pathname.startsWith(prefix)){const file=path.join(root,url.pathname.slice(prefix.length));if(!fs.existsSync(file)){res.writeHead(404);res.end('Missing '+file);return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'text/plain');res.end(fs.readFileSync(file));}else if(url.pathname==='/api/backgrounds/all'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({images:['forest.jpg','town.jpg']}));}else if(url.pathname.startsWith('/backgrounds/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="68" height="44"></svg>');}else if(url.pathname==='/api/images/list'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(['forest.png']));}else if(url.pathname==='/api/sprites/get'){const folder=url.searchParams.get('name');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(/outfit[12]$/.test(folder)?[{label:'neutral',path:'/characters/'+folder+'/neutral.png'}]:[]));}else if(url.pathname.startsWith('/characters/')||url.pathname.startsWith('/user/images/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="280"><rect width="100" height="280" fill="#739b84"/></svg>');}else{res.setHeader('Content-Type','text/html');res.end(html);}});
(async()=>{fs.mkdirSync(path.join(root,'tests/artifacts'),{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await pw.launch({...(executablePath?{executablePath}:{}),args:launchArgs,headless:true});const browserContext=await browser.newContext({viewport:{width:1200,height:1200},hasTouch:true});const page=await browserContext.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message)});page.on('console',msg=>{if(msg.type()==='error')console.error('CONSOLE',msg.text())});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');assert.equal(await page.locator('.prome-vn-settings').count(),1);assert.equal(await page.locator('#ig-tab-gallery').count(),1);assert.equal(await page.locator('.ig-settings-tabs [role=tab]').count(),9);assert.equal(await page.evaluate(()=>JSON.stringify({'Prome-VN-Extension':ctx.extensionSettings['Prome-VN-Extension'],'SillyTavern-LocalImage':ctx.extensionSettings['SillyTavern-LocalImage']})===beforeLegacy),true);assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.heightProfiles['alex.png'].fineTuneOffset),-25);assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.gallery.prompt.enabled),true);await page.waitForFunction(()=>document.querySelectorAll('#chat img.localimage-inserted').length===6);assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeChat),true);

>>>>>>> 80eb6b24fe0276df89f7dec59ead36cc3c949b60
 if(process.env.IG_BROWSER_ONLY==='defaults'){await require('./v025.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: new defaults, lock status, moved shadows, credits and import help.');await browser.close();server.close();return;}
 if(process.env.IG_BROWSER_ONLY==='library-layout'){await require('./v024.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: library layout and clean defaults.');await browser.close();server.close();return;}
 if(process.env.IG_BROWSER_ONLY==='polish'){await require('./v023.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: compact background navigation and outfit filters.');await browser.close();server.close();return;}
 if(process.env.IG_BROWSER_ONLY==='release'){await require('./v022.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: 0.2.2 release features.');await browser.close();server.close();return;}
 if(process.env.IG_BROWSER_ONLY==='library'){await require('./v021.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: unified asset library, inline descriptions, filters and linked navigation.');await browser.close();server.close();return;}
 if(process.env.IG_BROWSER_ONLY==='auto-api'){await require('./v019.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: automatic API scheduling, group coalescing, idle/quiet events and cancellation.');await browser.close();server.close();return;}
 if(process.env.IG_BROWSER_ONLY==='background-context'){await require('./v018.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: linked-only background context, live descriptions, scope, locks and persistence.');await browser.close();server.close();return;}
 if(process.env.IG_BROWSER_ONLY==='scene-tools'){await require('./v017.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: pinned tools, outfit memory, merged media and bindings.');await browser.close();server.close();return;}
 if(process.env.IG_BROWSER_ONLY==='automation'){await require('./v016.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: scene automation browser checks.');await browser.close();server.close();return;}
 if(process.env.IG_BROWSER_ONLY==='settings'){await require('./v015.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);console.log('PASS: settings reorganization browser checks.');await browser.close();server.close();return;}
 // Profile edits must survive switching, reflect actual runtime controls, and never
 // cause mobile snapshots to mask changes to global settings.
 await page.locator('#ig-tab-controls').click();
 const setting=key=>page.locator(`[data-prome-stage-setting="${key}"]`);
 await page.locator('#ig-layout-mode').selectOption('desktop');
 await setting('stageCenterCards').check();
 await page.waitForFunction(()=>document.getElementById('prome-stage-controls').dataset.center==='true');
 assert.equal(await page.locator('#prome-stage-roster').evaluate(n=>getComputedStyle(n).justifyContent),'safe center');
 await page.locator('#ig-tab-chat').click();await setting('settingsTabsCentered').evaluate(n=>n.closest('details').open=true);await setting('settingsTabsCentered').check();await page.locator('#ig-tab-controls').click();
 assert.ok(await page.locator('.ig-settings-shell').evaluate(n=>n.classList.contains('ig-centered-tabs')));
 await page.locator('#ig-edit-layout').selectOption('mobile');
 assert.equal(await setting('stageCenterCards').isChecked(),false);
 assert.equal(await setting('settingsTabsCentered').isChecked(),true);
 assert.match(await page.locator('.ig-layout-status').textContent(),/editing the other profile/);
 await page.locator('#ig-pane-controls .ig-advanced > summary').first().click();
 await page.locator('input[type=number][data-prome-stage-setting=stageFontSize]').fill('19');
 await page.locator('input[type=number][data-prome-stage-setting=stageFontSize]').press('Tab');
 await setting('stageNamesAbove').check();
 await setting('stageShowSpeak').uncheck();
 assert.equal(await page.locator('#prome-stage-controls').evaluate(n=>n.style.getPropertyValue('--prome-control-font')),'13px');
 await page.locator('#ig-layout-mode').selectOption('mobile');
 await page.waitForFunction(()=>document.getElementById('prome-stage-controls').style.getPropertyValue('--prome-control-font')==='19px');
 await page.waitForFunction(()=>document.querySelectorAll('#ig-mobile-sprites>.expression-holder').length===3);
 assert.equal(await page.locator('#prome-stage-controls').getAttribute('data-names'),'above');
 assert.equal(await page.locator('.prome-stage-talk:visible').count(),0);
 await page.locator('#ig-tab-chat').click();await setting('settingsTabsCentered').uncheck();await page.locator('#ig-tab-controls').click();
 assert.equal(await page.locator('.ig-settings-shell').evaluate(n=>n.classList.contains('ig-centered-tabs')),false);
 await page.locator('#ig-edit-layout').selectOption('desktop');
 assert.equal(await page.locator('input[type=number][data-prome-stage-setting=stageFontSize]').inputValue(),'13');
 assert.equal(await setting('stageCenterCards').isChecked(),true);
 assert.equal(await setting('stageNamesAbove').isChecked(),false);
 await page.locator('#ig-edit-layout').selectOption('mobile');
 assert.equal(await page.locator('input[type=number][data-prome-stage-setting=stageFontSize]').inputValue(),'19');
 await page.locator('#prome-stage-style-reset').click();
 assert.equal(await page.locator('input[type=number][data-prome-stage-setting=stageFontSize]').inputValue(),'13');
 await page.locator('#ig-edit-layout').selectOption('desktop');
 await page.locator('#ig-layout-mode').selectOption('desktop');
 await page.locator('#ig-tab-outfits').click();
 if(await page.locator('#prome-height-profile-editor').getAttribute('open')===null)await page.locator('#prome-height-profile-editor > summary').click();
 await page.locator('#prome-profile-character').selectOption('alex.png');
 await page.locator('#prome-profile-fine').fill('-15');await page.locator('#prome-profile-fine').press('Tab');
 await page.locator('#ig-edit-layout').selectOption('mobile');
 assert.equal(await page.locator('#prome-profile-fine').inputValue(),'-25');
 await page.locator('#prome-profile-fine').fill('-35');await page.locator('#prome-profile-fine').press('Tab');
 await page.locator('#ig-edit-layout').selectOption('desktop');
 assert.equal(await page.locator('#prome-profile-fine').inputValue(),'-15');

 await page.locator('#ig-layout-mode').selectOption('mobile');
 await page.waitForFunction(()=>document.getElementById('ig-expression-alex.png')?.style.getPropertyValue('--prome-sprite-scale')==='0.65');
 await page.locator('#ig-layout-mode').selectOption('desktop');
 await page.waitForFunction(()=>document.getElementById('expression-alex.png').style.getPropertyValue('--prome-sprite-scale')==='0.85');
 await page.locator('#prome-profile-cm').fill('145');await page.locator('#prome-profile-cm').press('Tab');
 await page.locator('#ig-edit-layout').selectOption('mobile');assert.equal(await page.locator('#prome-profile-cm').inputValue(),'145');
 await page.locator('#ig-layout-mode').selectOption('mobile');
 await page.waitForFunction(()=>Math.abs(Number(document.getElementById('ig-expression-alex.png')?.style.getPropertyValue('--prome-sprite-scale'))-.65*145/180)<1e-8);
 assert.equal(await page.locator('#prome-profile-fine-slider').getAttribute('min'),'-20');
 assert.equal(await page.locator('#prome-profile-fine-slider').getAttribute('max'),'20');
 assert.equal(await page.locator('#prome-profile-fine-slider').inputValue(),'-20');
 assert.equal(await page.locator('#prome-profile-fine').inputValue(),'-35');
 await page.locator('#prome-profile-fine').fill('75');await page.locator('#prome-profile-fine').press('Tab');
 assert.equal(await page.locator('#prome-profile-fine-slider').inputValue(),'20');
 assert.equal(await page.locator('#prome-profile-fine').inputValue(),'75');
 await page.locator('#prome-profile-fine-slider').fill('5.5');
 assert.equal(await page.locator('#prome-profile-fine').inputValue(),'5.5');
 await page.locator('#prome-profile-fine').fill('-35');await page.locator('#prome-profile-fine').press('Tab');
 const crossChat=await page.evaluate(async()=>{
   const stage=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/stage-controls.js');
   const heights=await import('/scripts/extensions/third-party/ImmersiveGroups/modules/height-profiles.js');
   const originalGroup=ctx.groupId,members=[...ctx.groups[0].members];
   const group=heights.spriteProfileFactor(document.getElementById('ig-expression-alex.png'));
   ctx.groups[0].members=['alex.png'];stage.refreshStageControls();
   const shortGroup=heights.spriteProfileFactor(document.getElementById('ig-expression-alex.png'));
   ctx.groupId=null;stage.refreshStageControls();
   const solo=Number(document.getElementById('expression-holder').style.getPropertyValue('--prome-sprite-scale'));
   ctx.groupId=originalGroup;ctx.groups[0].members=members;stage.refreshStageControls();
   return {group,shortGroup,solo};
 });
 assert.ok(Math.abs(crossChat.group-.65*145/180)<1e-8);assert.ok(Math.abs(crossChat.shortGroup-.65)<1e-8);assert.ok(Math.abs(crossChat.solo-.65)<1e-8);
 await page.locator('#prome-profile-cm').fill('180');await page.locator('#prome-profile-cm').press('Tab');
 await page.locator('#ig-edit-layout').selectOption('desktop');await page.locator('#ig-layout-mode').selectOption('desktop');
 await page.locator('#ig-tab-chat').click();
 await page.locator('#prome-quick-reply-mobile').fill('0');
 await page.locator('#ig-layout-mode').selectOption('mobile');
 await page.waitForFunction(()=>document.body.classList.contains('ig-hide-quick-replies'));
 await page.locator('#ig-layout-mode').selectOption('desktop');
 await page.waitForFunction(()=>!document.body.classList.contains('ig-hide-quick-replies'));
 await page.locator('#ig-tab-backgrounds').click();
 await page.locator('#ig-open-backgrounds').click();
 const notes=page.getByRole('textbox',{name:'Scene description for forest.jpg',exact:true});
 await notes.fill('A quiet clearing at dawn.');
 await page.locator('.ig-unified-library > .local-image-modal-header').getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('#ig-open-backgrounds').click();
 assert.equal(await notes.inputValue(),'A quiet clearing at dawn.');
 await page.locator('.ig-unified-library > .local-image-modal-header').getByRole('button',{name:'Close',exact:true}).click();
 const background=await page.evaluate(async()=> (await ImmersiveGroups.getSceneContext()).scene.backgrounds);
 assert.equal(background.current,'forest.jpg');
 assert.equal(background.library.find(b=>b.file==='forest.jpg').description,'A quiet clearing at dawn.');
 await page.evaluate(async()=>{const c=await ImmersiveGroups.getSceneContext();c.scene.backgrounds.library[0].characterBindings.push('changed');});
 assert.equal(await page.evaluate(()=>Object.values(ctx.extensionSettings.ImmersiveGroups.backgroundBindings).some(a=>a.includes('changed'))),false);
 await page.locator('#ig-tab-context').click();
 assert.match(await page.locator('#ig-pane-context').textContent(),/Work in progress/);
 assert.match(await page.locator('#ig-pane-context').textContent(),/All active characters/);
 assert.equal(await page.locator('#ig-automation-roadmap input, #ig-automation-roadmap select').count(),0);
 await page.locator('#ig-tab-controls').click();
 const outfit=page.locator('.prome-stage-outfit').first();
 await outfit.click();
 const currentOption=page.locator('.ig-outfit-options:not([hidden]) [role=option][aria-selected=true]');
 const otherOption=page.locator('.ig-outfit-options:not([hidden]) [role=option][aria-selected=false]').first();
 await otherOption.hover();
 assert.equal(await otherOption.evaluate(n=>n.classList.contains('ig-option-active')),true);
 assert.equal(await currentOption.getAttribute('aria-selected'),'true');
 assert.equal(await currentOption.evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(91, 91, 91)');
 const intended=await otherOption.getAttribute('data-folder');
 // A native/external outfit update while the list is open must not move rows.
 await page.evaluate(()=>{window.beforePickerReorder=structuredClone(ctx.extensionSettings.ImmersiveGroups.outfitCatalog['alex.png'].outfits);ctx.extensionSettings.ImmersiveGroups.outfitCatalog['alex.png'].outfits.reverse();emit('SETTINGS_UPDATED');});
 assert.equal(await otherOption.getAttribute('data-folder'),intended);
 await otherOption.click();
 await page.waitForFunction(folder=>document.getElementById('expression-alex.png').querySelector('img').dataset.spriteFolderName===folder,intended);
 assert.equal(await outfit.getAttribute('aria-expanded'),'false');
 await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.outfitCatalog['alex.png'].outfits=window.beforePickerReorder;emit('SETTINGS_UPDATED');});
 await page.waitForFunction(()=>document.querySelector('.prome-stage-outfit').getAttribute('aria-expanded')==='false');
 await outfit.focus();await outfit.press('ArrowDown');await outfit.press('Home');await outfit.press('Enter');
 await page.waitForFunction(()=>document.getElementById('expression-alex.png').querySelector('img').src.includes('outfit1'));
 // Center around the full bar, even when background tools are visible.
 await page.locator('#ig-tab-backgrounds').click();await setting('stageShowBackground').check();
 await page.waitForFunction(()=>!document.querySelector('.ig-background-controls').hidden);
 const centered=await page.locator('#prome-stage-controls').evaluate(bar=>{const rows=[...bar.querySelectorAll('.prome-character-chip')].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect());const b=bar.getBoundingClientRect();return Math.abs((rows[0].left+rows.at(-1).right)/2-(b.left+b.right)/2);});
 assert.ok(centered<2,`Center error: ${centered}px`);
 assert.ok((await page.locator('.ig-background-controls').boundingBox()).width<=40);
 await page.getByRole('button',{name:'Backgrounds and images',exact:true}).click();await page.locator('[data-media-tab=backgrounds]').click();
 await page.waitForSelector('.ig-background-popover:not([hidden])');
 await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.backgroundBindings={'forest.jpg':['alex.png'],'town.jpg':['bea.png']};ctx.extensionSettings.ImmersiveGroups.backgroundFavorites=['town.jpg'];emit('SETTINGS_UPDATED');});
 await page.waitForFunction(()=>document.querySelector('[data-bg-linked]').options.length===1);
 assert.deepEqual(await page.locator('[data-bg-linked] option').evaluateAll(nodes=>nodes.map(n=>n.value)),['']);
 await page.locator('[data-bg-character]').selectOption('alex.png');
 assert.deepEqual(await page.locator('[data-bg-linked] option').evaluateAll(nodes=>nodes.map(n=>n.value)),['','forest.jpg']);
 assert.equal(await page.locator('[data-bg-picker]').isDisabled(),true);
 await page.locator('[data-bg-character]').selectOption('bea.png');
 assert.deepEqual(await page.locator('[data-bg-linked] option').evaluateAll(nodes=>nodes.map(n=>n.value)),['','town.jpg']);
 assert.deepEqual(await page.locator('[data-bg-picker] option').evaluateAll(nodes=>nodes.map(n=>n.value)),['','town.jpg']);
 await page.evaluate(()=>{document.addEventListener('click',event=>{const item=event.target.closest('.bg_example');if(item)window.lastPickedBackground=item.getAttribute('bgfile');});});
 await page.locator('[data-bg-linked]').selectOption('town.jpg');assert.equal(await page.evaluate(()=>window.lastPickedBackground),'town.jpg');
 await page.locator('#prome-stage-manage').click();
 await page.waitForSelector('.ig-live-tuning:not([hidden])');
 assert.equal(await page.locator('.ig-background-popover').isVisible(),false);
 const live=page.locator('.ig-live-tuning');
 await live.locator('input[type=number][data-live-setting=sheldHeightPercent]').fill('65');await live.locator('input[type=number][data-live-setting=sheldHeightPercent]').press('Tab');
 assert.equal(await page.locator('#prome-sheld-height-number').inputValue(),'65');
 assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.sheldHeightPercent),65);
 // Live controls edit the displayed profile, even if settings edit the other one.
 await live.locator('[data-live-mode]').selectOption('mobile');
 await live.locator('input[type=number][data-live-setting=spriteSpacingPercent]').fill('62');await live.locator('input[type=number][data-live-setting=spriteSpacingPercent]').press('Tab');
 assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.mobileLayoutSettings.spriteSpacingPercent),62);
 assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.spriteSpacingPercent),100);
 await live.locator('[data-live-buttons] > summary').click();
 await live.locator('input[type=number][data-live-setting=stageControlHeight]').fill('36');await live.locator('input[type=number][data-live-setting=stageControlHeight]').press('Tab');
 await live.locator('input[type=number][data-live-setting=stageFontSize]').fill('17');await live.locator('input[type=number][data-live-setting=stageFontSize]').press('Tab');
 await page.waitForFunction(()=>document.getElementById('prome-stage-controls').style.getPropertyValue('--prome-control-font')==='17px');
 assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.stageFontSize),13);
 assert.equal(await page.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.mobileLayoutSettings.stageControlHeight),36);
 await live.locator('[data-live-toggle=stageShowSpeak]').uncheck();await page.waitForFunction(()=>document.querySelector('.prome-stage-talk').hidden);
 await live.locator('[data-live-toggle=stageShowSpeak]').check();
 await live.locator('[data-live-toggle=stageNamesAbove]').check();await page.waitForFunction(()=>document.getElementById('prome-stage-controls').dataset.names==='above');
 await live.locator('[data-live-choice=stageOutfitPlacement]').selectOption('bottom');await page.waitForFunction(()=>document.querySelector('#ig-bottom-outfits .prome-stage-outfit'));
 await live.locator('[data-live-choice=stageOutfitPlacement]').selectOption('top');
 await page.screenshot({path:path.join(root,'tests/artifacts/live-buttons-desktop.png')});

 await live.locator('[data-live-mode]').selectOption('desktop');
 await live.locator('[data-live-outfits]').click();
 await page.waitForSelector('.ig-unified-library');
 await page.locator('.ig-unified-library > .local-image-modal-header').getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('#ig-tab-controls').click();
 assert.equal(await page.locator('.ig-settings-tabs').evaluate(n=>n.scrollWidth<=n.clientWidth),true);
 await page.screenshot({path:path.join(root,'tests/artifacts/settings-desktop.png')});
 await page.locator('#ig-tab-gallery').click();await page.getByRole('button',{name:'Open asset library',exact:true}).click();await page.waitForSelector('.ig-gallery-image-card');assert.ok(await page.locator('.ig-gallery-image-card').count());await page.getByRole('button',{name:'Close',exact:true}).click();await page.locator('#ig-tab-about').click();assert.match(await page.locator('#ig-pane-about').textContent(),/Bronya-Rand/);assert.match(await page.locator('#ig-pane-about').textContent(),/mechamarmot/);assert.ok((await page.locator('[data-ig-document="CREDITS.md"]').getAttribute('href')).endsWith('/ImmersiveGroups/CREDITS.md'));
 await page.locator('.prome-stage-talk').nth(1).click();assert.equal(await page.evaluate(()=>calls.at(-1).args.force_chid),1);const neighbor=await page.locator('#expression-bea\\.png').boundingBox();await page.locator('.prome-stage-outfit').first().click();await page.locator('.ig-outfit-options:not([hidden]) [data-folder="Alex/outfit2"]').click();await page.waitForFunction(()=>document.getElementById('expression-alex.png').querySelector('img').src.includes('outfit2'));assert.deepEqual(await page.locator('#expression-bea\\.png').boundingBox(),neighbor);
 await page.evaluate(()=>{emit('GENERATION_AFTER_COMMANDS','normal')});assert.match(await page.evaluate(()=>prompts['ImmersiveGroups.Gallery'].prompt),/::img general forest::/);assert.equal(await page.evaluate(()=>prompts['SillyTavern-LocalImage'].prompt),'');const snapshot=await page.evaluate(()=>ImmersiveGroups.getSceneContext());assert.ok(snapshot.scene&&snapshot.gallery);await page.locator('#ig-tab-controls').click();await page.locator('#ig-layout-mode').selectOption('auto');await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{window.nativeMobile=true;window.dispatchEvent(new Event('resize'));});await page.waitForFunction(()=>document.querySelectorAll('#ig-mobile-sprites>.expression-holder').length===3);
 await page.evaluate(()=>{ctx.extensionSettings.ImmersiveGroups.spriteDefocusTint=true;emit('GROUP_MEMBER_DRAFTED',0);});
 await page.waitForFunction(()=>Number(getComputedStyle(document.getElementById('ig-expression-alex.png')).zIndex)>Number(getComputedStyle(document.getElementById('ig-expression-cedar.png')).zIndex));
 await page.evaluate(()=>{document.getElementById('ig-expression-cedar.png').style.zIndex='9999';});
 assert.ok(await page.evaluate(()=>Number(getComputedStyle(document.getElementById('ig-expression-alex.png')).zIndex)>Number(getComputedStyle(document.getElementById('ig-expression-cedar.png')).zIndex)));
 await page.evaluate(()=>emit('GENERATION_ENDED'));
 await page.waitForFunction(()=>Number(getComputedStyle(document.getElementById('ig-expression-cedar.png')).zIndex)>Number(getComputedStyle(document.getElementById('ig-expression-bea.png')).zIndex));
 // Touch coordinates must commit the actual row, not the previously selected item.
 await page.locator('.prome-stage-outfit').first().click();const touchRow=page.locator('.ig-outfit-options:not([hidden]) [data-folder="Alex/outfit1"]');
 const touchBox=await touchRow.boundingBox();await page.touchscreen.tap(touchBox.x+touchBox.width/2,touchBox.y+touchBox.height/2);
 await page.waitForFunction(()=>document.getElementById('ig-expression-alex.png').querySelector('img').src.includes('outfit1'));
 await page.locator('#ig-tab-controls').click();assert.equal(await page.locator('.ig-settings-tabs').evaluate(n=>n.scrollWidth<=n.clientWidth),true);await page.locator('#prome-stage-manage').click();await page.waitForSelector('.ig-live-tuning:not([hidden])');assert.ok(await page.locator('.ig-live-tuning').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));assert.ok(await page.locator('[data-live-close]').evaluate(n=>{const r=n.getBoundingClientRect(),p=n.closest('.ig-live-tuning').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom;}));await page.screenshot({path:path.join(root,'tests/artifacts/live-mobile.png')});await page.locator('[data-live-close]').click();await page.locator('.prome-vn-settings').screenshot({path:path.join(root,'tests/artifacts/settings-mobile.png')});await page.locator('#ig-tab-gallery').click();await page.locator('#sheld').evaluate(el=>el.style.display='none');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(root,'tests/artifacts/combined-mobile.png')});assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>JSON.stringify(ctx.chat)===beforeChat),true);
 const conflict=await browserContext.newPage();await conflict.goto(`http://127.0.0.1:${server.address().port}/?conflict`);await conflict.waitForSelector('#immersivegroups-startup-status');assert.equal(await conflict.evaluate(()=>Symbol.for('ImmersiveGroups.runtime')&&globalThis[Symbol.for('ImmersiveGroups.runtime')].status),'blocked');assert.equal(await conflict.locator('#prome-stage-controls').count(),0);assert.equal(await conflict.locator('#chat img.localimage-inserted').count(),0);await conflict.close();
 const upgrade=await browserContext.newPage();const upgradeErrors=[];upgrade.on('pageerror',e=>upgradeErrors.push(e.message));
 await upgrade.goto(`http://127.0.0.1:${server.address().port}/?v012`);await upgrade.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');
 assert.equal(await upgrade.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.heightProfiles['alex.png'].fineTuneOffset),10);
 assert.equal(await upgrade.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.mobileHeightProfiles['alex.png'].fineTuneOffset),-20);
 assert.equal(await upgrade.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.heightProfilesV2Backup.heightProfiles['alex.png'].fineTunePercent),110);
 await upgrade.waitForFunction(()=>Math.abs(Number(document.getElementById('expression-alex.png').style.getPropertyValue('--prome-sprite-scale'))-145/165*1.1*1.1)<1e-8);
 assert.deepEqual(upgradeErrors,[]);await upgrade.close();
 const fresh=await browserContext.newPage();const freshErrors=[];fresh.on('pageerror',e=>freshErrors.push(e.message));await fresh.goto(`http://127.0.0.1:${server.address().port}/?fresh`);await fresh.waitForFunction(()=>window.ImmersiveGroups?.getStatus().status==='ready');assert.equal(await fresh.locator('#ig-tab-gallery').count(),1);assert.equal(await fresh.evaluate(()=>ctx.extensionSettings.ImmersiveGroups.enableVN_UI),true);assert.deepEqual(freshErrors,[]);await fresh.close();
 await require('./v014.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v015.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v016.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v017.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v018.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v019.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v021.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v022.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v023.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v024.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v025.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
<<<<<<< HEAD
 await require('./v026.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v027.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v028.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 await require('./v028-ownership.cjs')(browserContext,`http://127.0.0.1:${server.address().port}`);
 console.log('PASS: scoped scene injection, exact commands, locks, DOM formatting, no history replay, dry runs and manual main/profile/custom API trials;  reorganized ten tabs, main/live preset parity, profile following, shared character selection and colors, dependent controls, moved Gallery prompting and phone overflow checks;  wheel cycling, bounded/searchable outfit menus, width breakpoints, signed fit, per-layout and sprite offsets, presets, background default priorities/restore/locks/cancellation;  actual combined ESM entry + scene subsystem + rebuilt Gallery bundle; one window/ten wrapped tabs; stable click/hover/keyboard outfit selection, full-bar centering, compact backgrounds, live tuning and speaker layering; tallest-character reference, signed fine tuning, live button editing, linked backgrounds, edit/live profiles, forced modes, checkboxes, profile reset, independent scales, background descriptions and context roadmap; both settings migrate with untouched backups; 60 messages unchanged; image rendering, Speak/outfit stability, new prompt namespace, combined API, mobile sprites/UI, duplicate guard, and fresh install.');await browser.close();server.close();
=======
 console.log('PASS: scoped scene injection, exact commands, locks, DOM formatting, no history replay, dry runs and manual main/profile/custom API trials;  reorganized nine tabs, main/live preset parity, profile following, shared character selection and colors, dependent controls, moved Gallery prompting and phone overflow checks;  wheel cycling, bounded/searchable outfit menus, width breakpoints, signed fit, per-layout and sprite offsets, presets, background default priorities/restore/locks/cancellation;  actual combined ESM entry + scene subsystem + rebuilt Gallery bundle; one window/nine wrapped tabs; stable click/hover/keyboard outfit selection, full-bar centering, compact backgrounds, live tuning and speaker layering; tallest-character reference, signed fine tuning, live button editing, linked backgrounds, edit/live profiles, forced modes, checkboxes, profile reset, independent scales, background descriptions and context roadmap; both settings migrate with untouched backups; 60 messages unchanged; image rendering, Speak/outfit stability, new prompt namespace, combined API, mobile sprites/UI, duplicate guard, and fresh install.');await browser.close();server.close();
>>>>>>> 80eb6b24fe0276df89f7dec59ead36cc3c949b60
})().catch(e=>{console.error(e);server.close();process.exit(1)});
