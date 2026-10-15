// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { layoutSettings, editingLayout, writeLayoutSetting } from './responsive.js';
import { mobileSpritesActive, mobileSprite, syncMobileSprites } from './mobile-sprites.js';
import { setupBackgrounds, refreshBackgrounds, backgroundSceneContext } from './scene-backgrounds.js';
import { seedOutfits, rememberOutfit, outfitOptions, catalogFor, setOutfitLock, onCatalogChange, discoverOutfits, automaticOutfitAllowed, sceneOutfitContext } from './outfit-catalog.js';
import { setupOutfitEditor, openOutfitEditor } from './outfit-editor.js';
import { createOutfitPicker } from './outfit-picker.js';
import { setupSettingsDependencies } from './settings-dependencies.js';
import { setupLiveTuning } from './live-tuning.js';
import { applySpeakerDimming, setActiveSpeaker, setupSpeakerTracking } from './speaker-dimming.js';
import { extension_settings, getContext } from '../../../../extensions.js';
import { Generate, isGenerating, saveSettingsDebounced, eventSource, event_types } from '../../../../../script.js';
import { power_user } from '../../../../power-user.js';
import * as expressions from '../../../expressions/index.js';
import { extensionName, defaultSettings } from '../constants.js';
import { applyScale } from './scale.js';
import { bounded, packFromSource } from './height-profiles.js';

const config = () => extension_settings[extensionName];
const owns = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const get = id => document.getElementById(id);
let scheduled = false, liveTuning;
const outfitJobs = new Map();
const currentScope = () => String(getContext().groupId ?? '') + ':' + String(getContext().getCurrentChatId?.() ?? '');
export function stageCharacters() {
    const ctx = getContext();
    const group = ctx.groups?.find(g => String(g.id) === String(ctx.groupId));
    if (group) return (group.members || []).filter(a => a !== 'prome-user' && !(group.disabled_members || []).includes(a))
        .map(a => ctx.characters?.find(c => c.avatar === a)).filter(Boolean);
    const character = ctx.characters?.[ctx.characterId];
    return character ? [character] : [];
}
export function slotCenter(index, count, spacing) {
    return 50 + (index - (count - 1) / 2) * (100 / Math.max(1, count)) * bounded(spacing, 20, 160, 100) / 100;
}
function spriteNode(character) {
    if (getContext().groupId != null) return mobileSpritesActive() ? mobileSprite(character) : get(`expression-${character.avatar}`);
    return get('expression-holder');
}
function manualPosition(node) {
    const saved = power_user.movingUIState?.[node.id];
    return Boolean((saved && typeof saved === 'object' && Object.keys(saved).length) || $(node).data('dragged'));
}
export function applySpriteSlots() {
    const active = Boolean(config()?.enableVN_UI && config()?.stableSpriteSlots !== false && getContext().groupId != null);
    const members = stageCharacters();
    const nodes = [...document.querySelectorAll('#visual-novel-wrapper > .expression-holder, #ig-mobile-sprites > .expression-holder')];
    for (const node of nodes) {
        const index = members.findIndex(c => (node.id === `expression-${c.avatar}` || node.id === `ig-expression-${c.avatar}`));
        const enabled = active && index >= 0 && !manualPosition(node);
        node.classList.toggle('prome-stable-slot', enabled);
        if (enabled) {
            const center = `${slotCenter(index, members.length, layoutSettings().spriteSpacingPercent)}%`;
            if (node.style.getPropertyValue('--prome-slot-center') !== center) node.style.setProperty('--prome-slot-center', center);
        } else node.style.removeProperty('--prome-slot-center');
    }
}
// Prome's layer updates must not animate every character on each image mutation.
export async function updateSpriteLayers(container) {
    if (!config()?.enableVN_UI || config()?.stableSpriteSlots === false) {await expressions.visualNovelUpdateLayers(container);applySpeakerDimming();return;}
    applySpriteSlots();
    applySpeakerDimming();
}
function overrideKey(character) { return character.avatar.replace(/\.[^/.]+$/, ''); }
function activeFolder(character) {
    const override = extension_settings.expressionOverrides?.find(e => e.name === overrideKey(character));
    return override?.path || character.name;
}
export function currentFolder(character) {
    return packFromSource(spriteNode(character)?.querySelector('img')?.getAttribute('src') || '', activeFolder(character));
}
export function chooseOutfitSprite(sprites, expression = '') {
    const candidates = sprites.filter(s => s && typeof s.path === 'string' && typeof s.label === 'string');
    return candidates.find(s => s.label === expression) || candidates.find(s => s.label === 'neutral') ||
        candidates.find(s => s.label === extension_settings.expressions?.fallback_expression) || candidates[0];
}
function preload(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const timeout = setTimeout(() => done(new Error('Image load timed out')), 15000);
        function done(error) { clearTimeout(timeout); image.onload = image.onerror = null; error ? reject(error) : resolve(); }
        image.onload = () => done();
        image.onerror = () => done(new Error('Outfit image could not load'));
        image.src = src;
    });
}
export async function changeOutfit(avatar, requestedFolder, { source = 'manual', chatId = null, groupId = null } = {}) {
    const character = stageCharacters().find(c => c.avatar === avatar);
    if (!character) throw new Error('Character is no longer active in this chat');
    const folder = requestedFolder.trim();
    if (source === 'automatic' && (String(chatId) !== String(getContext().getCurrentChatId?.()) || String(groupId ?? '') !== String(getContext().groupId ?? '') || !automaticOutfitAllowed(avatar, folder) || isGenerating())) return false;
    if (!folder || folder.length > 200 || /[\r\n\0]/.test(folder)) throw new Error('Enter a sprite folder, such as Character/pyjama');
    const node = spriteNode(character);
    const img = node?.querySelector('img');
    if (!img) throw new Error('No sprite is displayed for this character yet. Enable Character Expressions first.');
    const scope = currentScope(), job = Symbol(); outfitJobs.set(avatar, job);
    const response = await fetch(`/api/sprites/get?name=${encodeURIComponent(folder)}`);
    if (!response.ok) throw new Error(`Could not read outfit folder (${response.status})`);
    const sprites = await response.json();
    if (!Array.isArray(sprites)) throw new Error('Invalid sprite list');
    const sprite = chooseOutfitSprite(sprites, img.getAttribute('data-expression') || img.title || 'neutral');
    if (!sprite) throw new Error('This folder has no sprites');
    const url = new URL(sprite.path, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/characters/')) throw new Error('Invalid sprite image path');
    await preload(url.href);
    if (outfitJobs.get(avatar) !== job || currentScope() !== scope || spriteNode(character) !== node || node.querySelector('img') !== img || !node.isConnected) return false;
    if (source === 'automatic' && !automaticOutfitAllowed(avatar, folder)) return false;
    // Update the native override keyed by avatar filename, without running the
    // native override button (which empties the entire VN wrapper).
    if (!Array.isArray(extension_settings.expressionOverrides)) extension_settings.expressionOverrides = [];
    const key = overrideKey(character);
    const override = extension_settings.expressionOverrides.find(e => e.name === key);
    if (override) override.path = folder;
    else extension_settings.expressionOverrides.push({ name: key, path: folder });
    if (expressions.lastExpression && typeof expressions.lastExpression === 'object') expressions.lastExpression[folder.split('/')[0]] = sprite.label;
    img.setAttribute('src', sprite.path);
    img.setAttribute('data-expression', sprite.label);
    img.setAttribute('data-sprite-folder-name', folder);
    img.setAttribute('data-sprite-filename', url.pathname.split('/').pop());
    img.title = sprite.label;
    // Keep settings and .data() readers in agreement on native jQuery versions.
    $(img).data('expression', sprite.label).data('sprite-folder-name', folder);
    const folders = config().outfitFolders;
    const known = owns(folders, avatar) && Array.isArray(folders[avatar]) ? folders[avatar] : [];
    Object.defineProperty(folders, avatar, { value: [...new Set([...known, folder])], enumerable: true, writable: true, configurable: true });
    rememberOutfit(character, folder, { explicit: source !== 'automatic' });
    saveSettingsDebounced(); // Extension settings only; never save/reload a chat.
    applyScale(node);
    refreshStageControls();
    return true;
}
const cards = new Map();
const pendingOutfits = new Map();
let speaking = false, lastAvatar = '', discoveryScope = '';
function message(text) { const node = get('prome-stage-status'); if (node && node.textContent !== text) node.textContent = text; }
function iconButton(title, icon, callback) {
    const button = document.createElement('button'); button.type='button'; button.className='prome-stage-button'; button.title=title; button.setAttribute('aria-label',title);
    const glyph=document.createElement('i');glyph.className=`fa-solid ${icon}`;glyph.setAttribute('aria-hidden','true');button.append(glyph);
    button.addEventListener('click',callback);return button;
}
function createCard(character) {
    const avatar=character.avatar;
    const root=document.createElement('div');root.className='prome-character-chip';root.dataset.avatar=avatar;
    const speak=iconButton(`Ask ${character.name} to speak (sends your draft if present)`,'fa-comment-dots',async()=>{
        if(speaking||isGenerating())return;
        const c=stageCharacters().find(c=>c.avatar===avatar);if(!c)return;
        const chid=getContext().characters.findIndex(c=>c.avatar===avatar);if(chid<0)return;
        speaking=true;setActiveSpeaker(avatar);message('');refreshStageControls();
        try{await Generate('normal',{force_chid:chid});}catch(error){message(error.message);}finally{speaking=false;setActiveSpeaker();refreshStageControls();}
    });speak.classList.add('prome-stage-talk');
    const speakName=document.createElement('span');speak.append(speakName);
    const name=document.createElement('span');name.className='prome-character-label';
    const picker=createOutfitPicker(`${character.name} outfit`,()=>({entries:outfitOptions(character),value:pendingOutfits.get(avatar)?.folder||currentFolder(character)})),outfit=picker.button;
    outfit.addEventListener('change',async()=>{
        const folder=outfit.value;if(!folder||isGenerating())return;
        const job=Symbol();pendingOutfits.set(avatar,{folder,job});lastAvatar=avatar;
        root.classList.add('prome-outfit-loading');message(`Changing ${character.name}’s outfit…`);
        try {const changed=await changeOutfit(avatar,folder);if(pendingOutfits.get(avatar)?.job===job)message(changed?'':'Outfit change cancelled: the chat or sprite changed.');}
        catch(error){if(pendingOutfits.get(avatar)?.job===job)message(error.message);}
        finally{if(pendingOutfits.get(avatar)?.job===job){pendingOutfits.delete(avatar);root.classList.remove('prome-outfit-loading');refreshStageControls();}}
    });
    const lock=iconButton('Lock automatic outfit changes; manual changes still work','fa-lock-open',()=>{lastAvatar=avatar;setOutfitLock(avatar,!catalogFor(avatar).locked);});lock.classList.add('prome-stage-lock');
    root.addEventListener('focusin',()=>{lastAvatar=avatar;});root.append(speak,name,outfit,lock);
    return {root,speak,speakName,name,outfit,lock,picker};
}
function captureOutfits(characters) {
    for(const c of characters) {
        seedOutfits(c,activeFolder(c));
        const displayed=currentFolder(c);if(displayed)rememberOutfit(c,displayed);
    }
}
export function refreshStageControls() {
    const characters=stageCharacters();
    syncMobileSprites(characters,activeFolder,()=>{applySpriteSlots();applyScale();applySpeakerDimming();schedule();});
    applySpriteSlots();applySpeakerDimming();captureOutfits(characters);
    const bar=get('prome-stage-controls');if(!bar)return;
    applyScale();
    const settings=layoutSettings();bar.hidden=!settings.enableVN_UI||settings.sheldCharacterControls===false;
    const appearance={
        '--ig-controls-x':`${Number(settings.stageOffsetX)||0}px`,
        '--ig-controls-y':`${Number(settings.stageOffsetY)||0}px`,
        '--prome-control-height':`${bounded(settings.stageControlHeight,24,56,32)}px`,
        '--prome-control-font':`${bounded(settings.stageFontSize,10,22,13)}px`,
        '--prome-outfit-width':`${bounded(settings.stageOutfitWidth,80,260,130)}px`,
        '--prome-control-gap':`${bounded(settings.stageGap,2,16,6)}px`,
        '--prome-control-idle':String(bounded(settings.stageIdleOpacity,20,100,75)/100),
    };
    for(const [key,value] of Object.entries(appearance))if(bar.style.getPropertyValue(key)!==value)bar.style.setProperty(key,value);
    bar.dataset.flow=['scroll','wrap','stack'].includes(settings.stageFlow)?settings.stageFlow:'scroll';
    bar.dataset.fade=settings.stageFadeTarget==='all'?'all':'outfits';
    const bottom=get('ig-stage-bottom');
    bottom.hidden=bar.hidden;
    for(const host of [bar,bottom]) {
        for(const [key,value] of Object.entries(appearance))if(host.style.getPropertyValue(key)!==value)host.style.setProperty(key,value);
        host.dataset.flow=bar.dataset.flow;host.dataset.fade=bar.dataset.fade;host.dataset.names=settings.stageNamesAbove?'above':'beside';host.dataset.center=String(Boolean(settings.stageCenterCards));
    }
    const shared=get('prome-stage-shared');shared.hidden=settings.stageLayout!=='shared';
    const signature=JSON.stringify(characters.map(c=>[c.avatar,c.name]));
    if(shared.dataset.signature!==signature){const old=shared.value;shared.replaceChildren();for(const c of characters){const option=document.createElement('option');option.value=c.avatar;option.textContent=characters.filter(v=>v.name===c.name).length>1?`${c.name} (${c.avatar})`:c.name;shared.append(option);}shared.value=characters.some(c=>c.avatar===old)?old:characters[0]?.avatar||'';shared.dataset.signature=signature;}
    const roster=get('prome-stage-roster'),busy=speaking||isGenerating();
    for(const [avatar,card] of cards)if(!characters.some(c=>c.avatar===avatar)){card.picker.destroy();for(const node of [card.root,card.speak,card.name,card.outfit,card.lock])node.remove();cards.delete(avatar);}
    for(const [index,c] of characters.entries()){
        let card=cards.get(c.avatar);if(!card){card=createCard(c);cards.set(c.avatar,card);}
        if(roster.children[index]!==card.root)roster.insertBefore(card.root,roster.children[index]||null);
        card.root.hidden=(settings.stageLayout==='shared'&&shared.value!==c.avatar)||(settings.stageShowSpeak===false&&settings.stageShowNames===false&&settings.stageShowOutfits===false);
        card.speak.hidden=settings.stageShowSpeak===false;
        card.speak.disabled=busy;
        const named=characters.filter(other=>other.name===c.name).length>1?`${c.name} (${c.avatar})`:c.name;
        card.speakName.textContent=settings.stageLayout==='shared'?'Speak':named;
        card.speak.title=`Ask ${named} to speak (sends your draft if present)`;card.speak.setAttribute('aria-label',`Ask ${named} to speak`);card.name.title=named;
        card.speakName.hidden=settings.stageShowNames===false;
        card.name.textContent=named;card.name.hidden=settings.stageShowSpeak!==false||settings.stageShowNames===false;
        card.outfit.hidden=settings.stageShowOutfits===false;card.outfit.disabled=busy;
        const locked=Boolean(catalogFor(c.avatar).locked);card.lock.hidden=settings.stageShowLocks===false||settings.stageShowOutfits===false;
        card.lock.setAttribute('aria-pressed',String(locked));card.lock.classList.toggle('is-locked',locked);
        card.lock.querySelector('i').className=`fa-solid ${locked?'fa-lock':'fa-lock-open'}`;
        card.lock.title=locked?'Automatic outfit changes locked. Manual changes still work.':'Allow automatic outfit changes (future automation).';
        const current=currentFolder(c),options=outfitOptions(c);
        const desired=pendingOutfits.get(c.avatar)?.folder||current;
        card.picker.update(options,options.some(o=>o.folder===desired)?desired:'');
        const colors=catalogFor(c.avatar).colors||{};
        for(const node of [card.root,card.speak,card.outfit,card.lock,card.name]){
            for(const [property,value] of [['--ig-card-color',colors.background],['--ig-speak-color',colors.speak],['--ig-button-text',colors.text],['--ig-outfit-text',options.find(o=>o.folder===desired)?.fontColor]]){
                if(/^#[a-f0-9]{6}$/i.test(value||''))node.style.setProperty(property,value);else node.style.removeProperty(property);
            }
        }
        card.outfit.title=`${c.name}: ${options.find(o=>o.folder===current)?.label||'current outfit hidden'}\n${current}\nScroll over this button to cycle outfits.`;
    }
    // Move existing controls; keep each character's picker and handlers together.
    for(const card of cards.values()){
        const outfitTarget=settings.stageOutfitPlacement==='bottom'?get('ig-bottom-outfits'):card.root;
        const speakTarget=settings.stageSpeakPlacement==='bottom'?get('ig-bottom-speak'):card.root;
        for(const node of [card.speak,card.name])if(node.parentElement!==speakTarget){if(speakTarget===card.root)card.root.prepend(node);else speakTarget.append(node);}
        for(const node of [card.outfit,card.lock])if(node.parentElement!==outfitTarget)outfitTarget.append(node);
        // Shared mode must hide controls after moving them outside their card.
        for(const node of [card.speak,card.name,card.outfit,card.lock])if(node.parentElement!==card.root)node.hidden=card.root.hidden||(node===card.speak?settings.stageShowSpeak===false:node===card.name?settings.stageShowSpeak!==false||settings.stageShowNames===false:node===card.outfit?settings.stageShowOutfits===false:settings.stageShowLocks===false||settings.stageShowOutfits===false);
    }
    refreshBackgrounds(settings);
    balanceControls(bar,settings.stageCenterCards);
    bottom.hidden=bar.hidden||![...bottom.querySelectorAll('button,select,span')].some(n=>!n.hidden&&n.getClientRects().length);
    get('prome-stage-manage').hidden=settings.stageShowManager===false;
    get('prome-stage-empty').hidden=characters.length>0;
    for(const card of cards.values())card.picker.popup.position();
    liveTuning?.position();
}
function balanceControls(bar,centered) {
    const roster=get('prome-stage-roster'),left=get('prome-stage-shared'),tools=get('ig-stage-tools');
    if(!roster||!tools)return;
    const gap=parseFloat(getComputedStyle(bar).columnGap)||0;
    const leftWidth=left.hidden?0:left.getBoundingClientRect().width+gap;
    const rightWidth=tools.getBoundingClientRect().width+gap;
    const cards=[...roster.children].filter(node=>!node.hidden);
    const content=cards.reduce((sum,node)=>sum+node.getBoundingClientRect().width,0)+Math.max(0,cards.length-1)*gap+2;
    const available=bar.clientWidth-16-2*Math.max(leftWidth,rightWidth);
    const balance=centered&&content<=available;
    const start=balance?Math.max(0,rightWidth-leftWidth):0,end=balance?Math.max(0,leftWidth-rightWidth):0;
    if(roster.style.marginInlineStart!==`${start}px`)roster.style.marginInlineStart=`${start}px`;
    if(roster.style.marginInlineEnd!==`${end}px`)roster.style.marginInlineEnd=`${end}px`;
}
function schedule() {
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;refreshStageControls();});
}
async function autoDiscover() {
    const scope=currentScope();discoveryScope=scope;
    if(config().autoDiscoverOutfits===false)return;
    for(const c of stageCharacters()){
        if(discoveryScope!==scope||currentScope()!==scope)return;
        await discoverOutfits(c,activeFolder(c));
    }
}
function bindSettings() {
    const settings=layoutSettings(editingLayout());
    for(const control of document.querySelectorAll('[data-prome-stage-setting]')){
        const key=control.dataset.promeStageSetting;
        control.checked=Boolean(settings[key]);if(control.type!=='checkbox')control.value=Number.isFinite(Number(settings[key]))?Number(settings[key])-(Number(control.dataset.promeOffset)||0):settings[key];
        control.addEventListener(control.type==='range'?'input':'change',()=>{
            const value=control.type==='checkbox'?control.checked:control.type==='range'||control.type==='number'?bounded(control.value,Number(control.min),Number(control.max),defaultSettings[key]-(Number(control.dataset.promeOffset)||0))+(Number(control.dataset.promeOffset)||0):control.value;
            writeLayoutSetting(key,value);
            // Keep slider / typed pairs synchronized.
            for(const pair of document.querySelectorAll('[data-prome-stage-setting]'))if(pair!==control&&pair.dataset.promeStageSetting===key){if(pair.type==='checkbox')pair.checked=Boolean(value);else pair.value=Number.isFinite(Number(value))?Number(value)-(Number(pair.dataset.promeOffset)||0):value;}
            schedule();
        });
    }
    for(const [id,key] of [['prome-stage-enabled','sheldCharacterControls'],['prome-stable-slots','stableSpriteSlots']]){
        const control=get(id);if(!control)continue;control.checked=settings[key]!==false;
        control.addEventListener('change',()=>{writeLayoutSetting(key,control.checked);schedule();if(key==='stableSpriteSlots'&&!control.checked&&getContext().groupId!=null)expressions.visualNovelUpdateLayers($('#visual-novel-wrapper'));});
    }
    const spacing=value=>{const number=bounded(value,20,160,100);writeLayoutSetting('spriteSpacingPercent',number);get('prome-sprite-spacing').value=get('prome-sprite-spacing-number').value=number;applySpriteSlots();};
    for(const id of ['prome-sprite-spacing','prome-sprite-spacing-number']){get(id).value=settings.spriteSpacingPercent;get(id).addEventListener('input',event=>spacing(event.target.value));}
    get('prome-sprite-spacing-reset').addEventListener('click',()=>spacing(100));
    get('prome-stage-style-reset')?.addEventListener('click',()=>{
        for(const key of ['stageNamesAbove','stageCenterCards','stageSpeakPlacement','stageOutfitPlacement','stageBackgroundPlacement','stageLayout','stageFlow','stageShowSpeak','stageShowOutfits','stageShowNames','stageShowLocks','stageShowManager','stageControlHeight','stageFontSize','stageOutfitWidth','stageGap','stageIdleOpacity','stageFadeTarget'])writeLayoutSetting(key,defaultSettings[key]);
        window.dispatchEvent(new Event('ig-editor-layout-change'));
        saveSettingsDebounced();schedule();
    });
    const syncEditor=()=>{const selected=layoutSettings(editingLayout());for(const control of document.querySelectorAll('[data-prome-stage-setting]')){const key=control.dataset.promeStageSetting;if(control.type==='checkbox')control.checked=Boolean(selected[key]);else control.value=Number.isFinite(Number(selected[key]))?Number(selected[key])-(Number(control.dataset.promeOffset)||0):selected[key];}get('prome-sprite-spacing').value=get('prome-sprite-spacing-number').value=selected.spriteSpacingPercent;};
    window.addEventListener('ig-editor-layout-change',syncEditor);
    window.addEventListener('ig-layout-change',()=>{syncEditor();applyScale();schedule();});
    get('prome-open-outfit-editor')?.addEventListener('click',()=>openOutfitEditor());
}
export function getSceneContext() {
    return { chatId:getContext().getCurrentChatId?.(),groupId:getContext().groupId,
        capabilities:{outfits:true,backgrounds:false,localImages:false},
        characters:sceneOutfitContext(stageCharacters(),currentFolder),
        backgrounds:backgroundSceneContext() };
}
// Adapter for a future planner. No model calls run here. Requests must carry
// the chat ID they were planned for; locks are checked again after preloading.
export async function requestAutomaticOutfit({avatar,folder,chatId,groupId}={}) {
    if(typeof avatar!=='string'||typeof folder!=='string'||chatId==null)return false;
    return changeOutfit(avatar,folder,{source:'automatic',chatId,groupId});
}
export function setupStageControls() {
    setupSpeakerTracking();
    const settings=config();
    if(!settings.outfitFolders||typeof settings.outfitFolders!=='object'||Array.isArray(settings.outfitFolders))settings.outfitFolders={};
    const chat=get('chat');if(!chat||get('prome-stage-controls'))return;
    const bar=document.createElement('div');bar.id='prome-stage-controls';
    bar.innerHTML=`<select id="prome-stage-shared" class="prome-stage-shared" aria-label="Character" hidden></select><div id="prome-stage-roster" class="prome-stage-roster"></div><span id="prome-stage-empty" class="prome-help">Open a character or group chat</span><div id="ig-stage-tools"><button type="button" id="prome-stage-manage" class="prome-stage-button prome-stage-manager" title="Scene tuning &amp; outfits" aria-label="Scene tuning and outfits"><i class="fa-solid fa-sliders" aria-hidden="true"></i></button></div><small id="prome-stage-status" role="status" aria-live="polite"></small>`;
    chat.before(bar);
    const bottom=document.createElement('div');bottom.id='ig-stage-bottom';bottom.className='ig-stage-bottom';bottom.innerHTML='<div id="ig-bottom-speak" class="ig-bottom-group"></div><div id="ig-bottom-outfits" class="ig-bottom-group"></div><div id="ig-bottom-background" class="ig-bottom-group"></div>';
    const form=get('send_form');if(form)form.after(bottom);else chat.after(bottom);
    setupBackgrounds({characters:stageCharacters,top:get('ig-stage-tools'),bottom:get('ig-bottom-background')});
    setupOutfitEditor({characters:stageCharacters,currentFolder});
    liveTuning=setupLiveTuning(get('prome-stage-manage'),()=>openOutfitEditor(lastAvatar));
    const resize=new ResizeObserver(schedule);resize.observe(bar);resize.observe(get('ig-stage-tools'));resize.observe(get('prome-stage-roster'));
    get('prome-stage-shared').addEventListener('change',schedule);
    onCatalogChange(schedule);bindSettings();setupSettingsDependencies();
    for(const name of ['CHAT_CHANGED','GROUP_UPDATED','CHARACTER_MESSAGE_RENDERED','MESSAGE_SWIPED','MESSAGE_DELETED','GENERATION_STARTED','GENERATION_ENDED','GROUP_MEMBER_DRAFTED','SETTINGS_UPDATED'])if(event_types[name])eventSource.on(event_types[name],schedule);
    if(event_types.CHAT_CHANGED)eventSource.on(event_types.CHAT_CHANGED,()=>{window.dispatchEvent(new Event('ig-close-scene-panels'));autoDiscover().catch(error=>console.warn('[Prome] Outfit discovery',error));});
    new MutationObserver(records=>{
        // Capture each displayed outfit immediately, even if a Quick Reply moves
        // through several folders before the next animation frame.
        for(const record of records){
            const node=record.target?.closest?.('.expression-holder');
            const c=stageCharacters().find(c=>(node?.id===`expression-${c.avatar}`||node?.id===`ig-expression-${c.avatar}`)||(node?.id==='expression-holder'&&getContext().characters?.[getContext().characterId]?.avatar===c.avatar));
            if(c&&record.type==='attributes'&&record.attributeName==='src'){
                const old=packFromSource(record.oldValue||'','');if(old)rememberOutfit(c,old);
                const now=currentFolder(c);if(now)rememberOutfit(c,now);
            }
        }
        if(records.some(r=>r.target?.closest?.('#visual-novel-wrapper, #expression-wrapper, #ig-mobile-sprites')||[...(r.addedNodes||[]),...(r.removedNodes||[])].some(n=>n.nodeType===1&&(n.matches?.('#visual-novel-wrapper, #expression-wrapper, #ig-mobile-sprites')||n.querySelector?.('#visual-novel-wrapper, #expression-wrapper, #ig-mobile-sprites')))))schedule();
    }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src'],attributeOldValue:true});
    new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
    document.addEventListener('pointerdown',event=>{
        const node=event.target.closest?.('.drag-grabber')?.closest?.('.expression-holder');if(!node?.classList.contains('prome-stable-slot'))return;
        const left=node.offsetLeft-node.offsetWidth/2;node.classList.remove('prome-stable-slot');node.style.left=`${left}px`;$(node).data('dragged',true);
    },true);
    window.addEventListener('resize',schedule);
    window.visualViewport?.addEventListener('resize',schedule);
    refreshStageControls();autoDiscover().catch(error=>console.warn('[Prome] Outfit discovery',error));
}
