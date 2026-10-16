// SPDX-License-Identifier: AGPL-3.0-only
// Gallery subsystem derived from LocalImage by mechamarmot; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
/* global SillyTavern */
import { createRoot } from 'react-dom/client';
import Gallery from './Gallery';
import GroupGallery from './GroupGallery';
import GalleryStudio from './UnifiedLibrary';
import { DEFAULT_INSTRUCTIONS, PROMPT_DEFAULTS, LIMIT_DEFAULTS, catalogEntries, availableInChat, saveCatalogEntry, buildDisplayPolicy, buildGalleryPrompt, safeImageSource } from './gallery-model';
import { installGallerySettings } from './gallery-settings';
import { mountQuickImageMenu } from './quick-image-menu';

const EXTENSION_NAME = 'ImmersiveGroups Gallery';
const PROMPT_KEY = 'ImmersiveGroups.Gallery';
function gallerySettingsRoot(context) {
    const root=context.extensionSettings.ImmersiveGroups ||= {};
    return root.gallery ||= {};
}
const GENERAL_KEY = '__localimage_general__';
const GENERAL_FOLDER = 'LocalImage-General';
const UI_DEFAULTS = { quickSendPlacement: 'scene', showFloatingButton: false, showCharacterButton: true, showPersonaButton: true, buttonSize: 40, buttonSide: 'right', buttonOffsetX: 20, buttonOffsetBottom: 100, imageMaxHeight: 0 };

const BUTTON_ID = 'local_image_button';
const FLOATING_BUTTON_ID = 'local_image_floating_button';
const FLOATING_PANEL_ID = 'local_image_floating_panel';

let galleryRoot = null;
let galleryViewToken = 0;
let galleryContainer = null;
let floatingPanelExpanded = false;
let floatingQuickMenu=null,sceneShortcutObserver=null;
const sceneImageMenus=new Set();
let localImageUiError = '';
let localImageRendererReady = false;
let localImageUnresolved = [];
let generalImageFiles = [];
let generalIndexRequest = null;

/**
 * Initialize extension settings
 */
function initSettings() {
    const context = SillyTavern.getContext();
    const defaultSettings = {
        enabled: true,
        // assignments: { characterName: { imageName: { path: "...", description: "..." } } }
        assignments: {},
        generalAssignments: {},
        ui: {},
        // characterSettings: { characterName: { injectPrompt: true, selectedPromptId: "default" } }
        characterSettings: {},
        // customPrompts: [{ id: "uuid", name: "My Prompt", template: "..." }]
        customPrompts: [],
        galleryDescriptions: {},
        galleryView: { sort: "name-asc", currentChatOnly: false },
        limits: { ...LIMIT_DEFAULTS },
        prompt: { ...PROMPT_DEFAULTS },
    };


    Object.assign(gallerySettingsRoot(context), {
        ...defaultSettings,
        ...gallerySettingsRoot(context),
    });

    // Normalize invalid legacy settings before migrating string assignments.
    const settings = gallerySettingsRoot(context);
    for (const key of ['assignments', 'characterSettings', 'generalAssignments', 'galleryDescriptions']) {
        if (!settings[key] || typeof settings[key] !== 'object' || Array.isArray(settings[key])) {
            settings[key] = {};
        }
    }
    settings.limits = { ...LIMIT_DEFAULTS, ...(settings.limits || {}) };
    settings.prompt = { ...PROMPT_DEFAULTS, ...(settings.prompt || {}) };
    settings.galleryView = { sort: "name-asc", currentChatOnly: false, ...(settings.galleryView || {}) };
    settings.ui = { ...UI_DEFAULTS, ...(settings.ui && typeof settings.ui === 'object' ? settings.ui : {}) };
    if (!Array.isArray(settings.customPrompts)) settings.customPrompts = [];
    // Migrate old format (string paths) to new format (objects with path/description)
    if (settings.assignments) {
        for (const charName of Object.keys(settings.assignments)) {
            const assignments = settings.assignments[charName];
            if (!assignments || typeof assignments !== 'object' || Array.isArray(assignments)) {
                delete settings.assignments[charName];
                continue;
            }
            for (const imageName of Object.keys(settings.assignments[charName])) {
                const value = settings.assignments[charName][imageName];
                if (typeof value === 'string') {
                    settings.assignments[charName][imageName] = {
                        path: value,
                        description: ''
                    };
                }
            }
        }
    }

    return gallerySettingsRoot(context);
}

/**
 * Get extension settings
 */
function getSettings() {
    const context = SillyTavern.getContext();
    return gallerySettingsRoot(context) || {};
}

/**
 * Save extension settings
 */
function saveSettings() {
    const context = SillyTavern.getContext();
    context.saveSettingsDebounced();
    scheduleLocalImageRefresh();
    applyGalleryShortcutSettings();
    updateFloatingPanel();
    updateGalleryPrompt();
    for(const menu of sceneImageMenus)menu.refresh();
    window.dispatchEvent(new Event('ig-gallery-change'));
}

/**
 * Get current character name
 * @returns {string|null} Character name or null
 */
function getCurrentCharacterName() {
    const context = SillyTavern.getContext();
    if (context.characterId !== undefined && context.characters[context.characterId]) {
        return context.characters[context.characterId].name;
    }
    return null;
}

/**
 * Get current persona/user name
 * @returns {string|null} Persona name or null
 */
function getCurrentPersonaName() {
    const context = SillyTavern.getContext();
    // ST stores persona name in name1
    return context.name1 || null;
}

/**
 * Check if currently in a group chat
 * @returns {boolean} True if in group chat
 */
function isGroupChat() {
    const context = SillyTavern.getContext();
    const result = context.groupId !== null && context.groupId !== undefined;

    return result;
}

/**
 * Get current group info
 * @returns {Object|null} Group object with id, name, members, or null
 */
function getCurrentGroup() {
    const context = SillyTavern.getContext();
    if (!isGroupChat()) return null;

    const group = context.groups?.find(g => String(g.id) === String(context.groupId));
    if (!group) return null;

    console.log(`[${EXTENSION_NAME}] getCurrentGroup - raw group object:`, JSON.stringify({
        id: group.id,
        name: group.name,
        chat_id: group.chat_id,
        keys: Object.keys(group)
    }));

    return {
        id: group.id,
        name: group.name || `Group ${group.id}`,
        members: group.members || []
    };
}

/**
 * Get character names for group members
 * @param {Array} memberIds - Array of member avatar identifiers
 * @returns {Array} Array of character names
 */
function getGroupMemberNames(memberIds) {
    const context = SillyTavern.getContext();
    const names = [];

    for (const memberId of memberIds) {
        const char = context.characters.find(c => c.avatar === memberId);
        if (char) {
            names.push(char.name);
        }
    }

    return names;
}

/**
 * Resolve entity name from tag (handles {{user}}, {{char}}, {{group}} macros)
 * Uses ST's built-in macro system if available
 * @param {string} entityName - Name from tag (could be actual name or macro)
 * @returns {string} Resolved entity name
 */
function resolveEntityName(entityName) {
    const context = SillyTavern.getContext();

    // Try to use ST's built-in macro replacement
    if (context.substituteParams) {
        const resolved = context.substituteParams(entityName);
        if (resolved !== entityName) {
            return resolved;
        }
    }

    // Fallback to manual resolution
    const lowerName = entityName.toLowerCase();

    // Handle {{user}} macro
    if (lowerName === '{{user}}' || lowerName === 'user') {
        return getCurrentPersonaName() || entityName;
    }

    // Handle {{char}} macro
    if (lowerName === '{{char}}' || lowerName === 'char') {
        return getCurrentCharacterName() || entityName;
    }

    // Handle {{group}} macro
    if (lowerName === '{{group}}' || lowerName === 'group') {
        const group = getCurrentGroup();
        return group ? group.name : entityName;
    }

    return entityName;
}

/**
 * Get assignments for a character
 * @param {string} charName - Character name
 * @returns {Object} Assignments object { name: { path, description } }
 */
function getCharacterAssignments(charName) {
    const settings = getSettings();
    if (charName === GENERAL_KEY) return settings.generalAssignments || {};
    return Object.hasOwn(settings.assignments || {}, charName) ? settings.assignments[charName] : {};
}

/**
 * Get character-specific settings
 * @param {string} charName - Character name
 * @returns {Object} Settings object { injectPrompt, customPrefix }
 */
function getCharacterSettings(charName) {
    const settings = getSettings();
    const map = settings.characterSettings || {};
    return (Object.hasOwn(map, charName) && map[charName]) || { injectPrompt: false, selectedPromptId: 'default' };
}

/**
 * Save character-specific settings
 * @param {string} charName - Character name
 * @param {Object} charSettings - Settings to save
 */
function saveCharacterSettings(charName, charSettings) {
    const context = SillyTavern.getContext();
    const settings = gallerySettingsRoot(context);

    if (!settings.characterSettings) {
        settings.characterSettings = {};
    }
    Object.defineProperty(settings.characterSettings, charName, { value: charSettings, writable: true, enumerable: true, configurable: true });
    saveSettings();
}

/**
 * Assign a name to an image for a character
 * @param {string} charName - Character name
 * @param {string} imageName - Name to assign
 * @param {string} imagePath - Path to the image
 * @param {string} description - Description of the image
 */
function assignImage(charName, imageName, imagePath, description = '') {
    const context = SillyTavern.getContext();
    const settings = gallerySettingsRoot(context);

    if (charName === GENERAL_KEY) {
        Object.defineProperty(settings.generalAssignments, imageName, { value: { ...(typeof getCharacterAssignments(charName)[imageName] === 'object' ? getCharacterAssignments(charName)[imageName] : {}), path: imagePath, description }, writable: true, enumerable: true, configurable: true });
        saveSettings();
        return;
    }
    if (!settings.assignments) {
        settings.assignments = {};
    }
    if (!Object.hasOwn(settings.assignments, charName)) {
        Object.defineProperty(settings.assignments, charName, { value: {}, writable: true, enumerable: true, configurable: true });
    }

    Object.defineProperty(settings.assignments[charName], imageName, {
        value: { ...(typeof getCharacterAssignments(charName)[imageName] === 'object' ? getCharacterAssignments(charName)[imageName] : {}), path: imagePath, description }, writable: true, enumerable: true, configurable: true,
    });
    saveSettings();
    console.log(`[${EXTENSION_NAME}] Assigned "${imageName}" to "${imagePath}" for ${charName}`);
}

/**
 * Update description for an existing assignment
 * @param {string} charName - Character name
 * @param {string} imageName - Image name
 * @param {string} description - New description
 */
function updateImageDescription(charName, imageName, description) {
    const context = SillyTavern.getContext();
    const settings = gallerySettingsRoot(context);

    if (charName === GENERAL_KEY) {
        const assignment = getCharacterAssignments(GENERAL_KEY)[imageName];
        if (assignment && typeof assignment === 'object') assignment.description = description;
        saveSettings();
        return;
    }
    if (settings.assignments?.[charName]?.[imageName]) {
        settings.assignments[charName][imageName].description = description;
        saveSettings();
    }
}

/**
 * Remove an assignment
 * @param {string} charName - Character name
 * @param {string} imageName - Name to unassign
 */
function unassignImage(charName, imageName) {
    const context = SillyTavern.getContext();
    const settings = gallerySettingsRoot(context);

    if (charName === GENERAL_KEY) {
        delete settings.generalAssignments[imageName];
        saveSettings();
        return;
    }
    if (settings.assignments?.[charName]?.[imageName]) {
        delete settings.assignments[charName][imageName];
        saveSettings();
        console.log(`[${EXTENSION_NAME}] Unassigned "${imageName}" for ${charName}`);
    }
}

/**
 * Get image path by character and name
 * @param {string} charName - Character name
 * @param {string} imageName - Image name
 * @returns {string} Image path or empty string
 */
function getImagePath(charName, imageName) {
    const assignments = getCharacterAssignments(charName);
    // Prefer exact aliases. Accept a unique case-insensitive match, never guess
    // when two intentionally distinct names differ only in capitalization.
    const keys = Object.keys(assignments).filter(key => key.toLowerCase() === imageName.toLowerCase());
    const key = Object.hasOwn(assignments, imageName) ? imageName : keys.length === 1 ? keys[0] : null;
    const aliasKeys = key === null ? Object.keys(assignments).filter(k => Array.isArray(assignments[k]?.aliases) && assignments[k].aliases.some(a => a.toLowerCase() === imageName.toLowerCase())) : [];
    const assignment = key !== null ? assignments[key] : aliasKeys.length === 1 ? assignments[aliasKeys[0]] : null;
    if (!assignment) {
        return '';
    }
    // Handle both old format (string) and new format (object)
    return typeof assignment === 'string' ? assignment : assignment.path || '';
}

/**
 * Get the default prompt template
 * @param {string} charName - Character name
 * @returns {string} Default template
 */
function getDefaultPromptTemplate(charName) {
    return `Available images for ${charName} (use ::img ${charName} name:: to display):`;
}

/**
 * Get all custom prompts
 * @returns {Array} Array of custom prompt objects
 */
function getCustomPrompts() {
    const settings = getSettings();
    return settings.customPrompts || [];
}

/**
 * Add a custom prompt
 * @param {string} name - Prompt name
 * @param {string} template - Prompt template
 * @returns {string} The new prompt's ID
 */
function addCustomPrompt(name, template) {
    const context = SillyTavern.getContext();
    const settings = gallerySettingsRoot(context);

    if (!settings.customPrompts) {
        settings.customPrompts = [];
    }

    const id = 'prompt_' + crypto.randomUUID();
    settings.customPrompts.push({ id, name, template });
    saveSettings();
    return id;
}

/**
 * Update a custom prompt
 * @param {string} id - Prompt ID
 * @param {string} name - New name
 * @param {string} template - New template
 */
function updateCustomPrompt(id, name, template) {
    const context = SillyTavern.getContext();
    const settings = gallerySettingsRoot(context);

    const prompt = settings.customPrompts?.find(p => p.id === id);
    if (prompt) {
        prompt.name = name;
        prompt.template = template;
        saveSettings();
    }
}

/**
 * Delete a custom prompt
 * @param {string} id - Prompt ID
 */
function deleteCustomPrompt(id) {
    const context = SillyTavern.getContext();
    const settings = gallerySettingsRoot(context);

    if (settings.customPrompts) {
        settings.customPrompts = settings.customPrompts.filter(p => p.id !== id);
        saveSettings();
    }
}

/**
 * Get a prompt template by ID
 * @param {string} id - Prompt ID ('default' or custom ID)
 * @param {string} charName - Character name (for default template)
 * @returns {string} The prompt template
 */
function getPromptTemplate(id, charName) {
    if (!id || id === 'default') {
        return getDefaultPromptTemplate(charName);
    }

    const customPrompts = getCustomPrompts();
    const prompt = customPrompts.find(p => p.id === id);
    return prompt ? prompt.template : getDefaultPromptTemplate(charName);
}

/**
 * Generate the image list prompt for a character
 * @param {string} charName - Character name
 * @returns {string} Formatted prompt text
 */
function generateImageListPrompt(charName) {
    const assignments = getCharacterAssignments(charName);
    const charSettings = getCharacterSettings(charName);

    const imageNames = Object.keys(assignments);
    if (imageNames.length === 0) return '';

    const lines = imageNames.map(name => {
        const assignment = assignments[name];
        const desc = assignment && typeof assignment === 'object' ? assignment.description : '';
        return desc ? `- ${name}: ${desc}` : `- ${name}`;
    });

    // Get the selected prompt template
    const template = getPromptTemplate(charSettings.selectedPromptId, charName);

    // Replace {{char}} placeholder with character name
    const prefix = template.replace(/\{\{char\}\}/gi, charName);

    return `[${prefix}\n${lines.join('\n')}]`;
}

/** Remove image commands without altering paragraphs, indentation or spacing. */
function stripImageTags(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/::img[ \t]+([^\r\n]*?)::/gi, '');
}

const localImageTagPattern = /::img[ \t]+([^\r\n]*?)::/gi;
const localImageNodeState = new WeakMap();
const localImageTimers = new Map();
let localImageObserver = null;
let localImageChatContainer = null;

function scheduleLocalImageRefresh(delay = 100) {
    if (localImageTimers.has(delay)) clearTimeout(localImageTimers.get(delay));
    localImageTimers.set(delay, setTimeout(() => {
        localImageTimers.delete(delay);
        processAllMessages();
    }, delay));
}

function scheduleLocalImageFinalRefresh() {
    // Events can precede the final DOM update. The observer also handles later updates.
    for (const delay of [0, 100, 500]) scheduleLocalImageRefresh(delay);
}

// Shared file fallback is restricted to the General folder. It never searches
// character galleries or modifies saved assignments or chat messages.
async function refreshGeneralFileIndex() {
    if (generalIndexRequest) return generalIndexRequest;
    generalIndexRequest = (async () => {
        try {
            const response = await fetch('/api/images/list', {
                method: 'POST', headers: SillyTavern.getContext().getRequestHeaders(),
                body: JSON.stringify({ folder: GENERAL_FOLDER }),
            });
            if (!response.ok) return;
            const files = await response.json();
            if (Array.isArray(files)) generalImageFiles = files.filter(file => typeof file === 'string' && !/[\\/]/.test(file));
        } catch (error) { console.warn(`[${EXTENSION_NAME}] Could not index General images`, error); }
    })();
    try { await generalIndexRequest; } finally { generalIndexRequest = null; }
}
function sharedFilePath(name) {
    const stem = file => file.replace(/\.[^/.]+$/, '');
    const exact = generalImageFiles.filter(file => stem(file) === name);
    const matches = exact.length ? exact : generalImageFiles.filter(file => stem(file).toLowerCase() === name.toLowerCase());
    return matches.length === 1 ? `user/images/${GENERAL_FOLDER}/${matches[0]}` : '';
}
function applyImageHeight(img) {
    const height = normalizeShortcutSettings(getSettings().ui).imageMaxHeight;
    img.style.maxHeight = height > 0 ? `${height}px` : 'none';
}

function describeUnresolvedCommand(command) {
    const parts = command.match(/^::img\s+(.+?)\s+(\S+)::$/i);
    if (!parts) return command;
    const [, entity, name] = parts;
    const general = /^(?:general|\{\{general\}\})$/i.test(entity);
    if (!general) return command;
    const settings = getSettings();
    const galleries = Object.keys(settings.assignments || {}).filter(key => getImagePath(key, name));
    const shared = Object.keys(getCharacterAssignments(GENERAL_KEY));
    if (galleries.length) return `${command} — this name is assigned in: ${galleries.join(', ')}. Use that gallery's command, or assign the image in General Gallery.`;
    return `${command} — General Gallery has ${shared.length} assigned image(s). Open General Gallery and assign this exact name; or use a unique filename without its extension from that folder.`;
}

function resolveLocalImage(content, message) {
    const parts = content.trim().match(/^(.+?)\s+(\S+)$/);
    if (!parts) return null;
    let entity = parts[1].trim();
    const name = parts[2];
    const isGeneral = /^(?:general|\{\{general\}\})$/i.test(entity);
    if (isGeneral) entity = GENERAL_KEY;
    // In a group, {{char}} refers to the speaker of this message.
    if (isGeneral) {
        // Explicit shared namespace must never fall back to a character/persona.
    } else if (/^(?:\{\{char\}\}|char)$/i.test(entity) && !message.is_user && message.name) {
        entity = message.name;
    } else {
        entity = resolveEntityName(entity);
    }
    let path = getImagePath(entity, name);
    if (!path && isGeneral) path = sharedFilePath(name);
    if (!path && !isGeneral && !message.is_user && message.name) path = getImagePath(message.name, name);
    if (!path && !isGeneral) {
        const current = getCurrentCharacterName();
        if (current) path = getImagePath(current, name);
    }
    if (!path && !isGeneral) {
        const persona = getCurrentPersonaName();
        if (persona) path = getImagePath(persona, name);
    }
    const src = safeImageSource(path);
    return src ? { name, src } : null;
}

function createLocalImage(command, image, suppressed = '') {
    const wrapper = document.createElement('span');
    wrapper.className = 'localimage-command';
    if (suppressed) {
        wrapper.className += ' localimage-suppressed';
        wrapper.setAttribute('aria-hidden','true');
        localImageNodeState.set(wrapper,{command,src:image.src,name:image.name,suppressed});
        return wrapper;
    }
    const img = document.createElement('img');
    img.src = image.src;
    img.alt = image.name;
    img.className = 'localimage-inserted';
    img.loading = 'eager';
    img.style.cssText = 'border-radius: 8px; margin: 5px 0; display: block;';
    applyImageHeight(img);
    img.addEventListener('error', () => {
        img.title = `Image could not load: ${image.src}`;
        console.warn(`[${EXTENSION_NAME}] Image request failed`, image.src);
    });
    wrapper.appendChild(img);
    localImageNodeState.set(wrapper, { command, src: image.src, name: image.name, suppressed: '' });
    return wrapper;
}

function currentDisplayPolicy() {
    return buildDisplayPolicy(SillyTavern.getContext().chat || [],getSettings(),resolveLocalImage);
}
function updateGalleryPrompt(skip = false) {
    const ctx=SillyTavern.getContext();
    if(typeof ctx.setExtensionPrompt!=='function')return;
    const prompt=skip?'':buildGalleryPrompt(getSettings(),ctx,generalImageFiles,currentDisplayPolicy());
    // IN_CHAT, depth 0, SYSTEM. Never append a message or save the chat.
    try {ctx.setExtensionPrompt(PROMPT_KEY,prompt,1,0,false,0);}
    catch(error){console.warn(`[${EXTENSION_NAME}] Could not update gallery prompt`,error);}
}
function processMessageElement(mesElement, policy = currentDisplayPolicy()) {
    const mesText = mesElement.querySelector('.mes_text');
    const id = mesElement.getAttribute('mesid');
    if (!mesText || id === null || !/^\d+$/.test(id)) return;
    if (mesElement.querySelector('.mes_edit_textarea') || mesText.isContentEditable) return;
    const message = SillyTavern.getContext().chat?.[Number(id)];
    if (!message) return;
    const enabled = getSettings().enabled !== false;
    const occurrences=new Map();
    const reasonFor=image=>{
        const occurrence=occurrences.get(image.src)||0;occurrences.set(image.src,occurrence+1);
        return policy.decisions.get(Number(id))?.get(image.src)?.[occurrence] || '';
    };
    // Existing wrappers and new streaming text share one document-order sequence.
    const records=[...mesText.querySelectorAll('.localimage-command')].filter(node=>localImageNodeState.has(node)).map(node=>({node,wrapper:true}));
    for(const run of collectLocalImageTextRuns(mesText))records.push({node:run[0],run});
    records.sort((a,b)=>a.node.compareDocumentPosition?.(b.node)&2?1:a.node.compareDocumentPosition?.(b.node)&4?-1:0);
    for(const record of records){
        if(record.wrapper){
            const wrapper=record.node,state=localImageNodeState.get(wrapper);
            const match=[...state.command.matchAll(localImageTagPattern)][0];
            const image=enabled&&match?resolveLocalImage(match[1],message):null;
            if(!image){wrapper.replaceWith(document.createTextNode(state.command));continue;}
            const suppressed=reasonFor(image);
            if(state.src!==image.src||state.name!==image.name||state.suppressed!==suppressed||(!suppressed&&!wrapper.querySelector('img')))wrapper.replaceWith(createLocalImage(state.command,image,suppressed));
            continue;
        }
        if(!enabled)continue;
        const run=record.run,text=run.map(node=>node.nodeValue).join('');
        const segments=[];let offset=0;
        for(const node of run){segments.push({node,start:offset,end:offset+node.nodeValue.length});offset+=node.nodeValue.length;}
        // Assign limits in reading order; replace backwards to preserve text offsets.
        const replacements=[...text.matchAll(localImageTagPattern)].map(match=>{
            const image=resolveLocalImage(match[1],message);
            return {match,image,suppressed:image?reasonFor(image):''};
        });
        for(const {match,image,suppressed} of replacements.reverse()){
            if(!image){if(localImageUnresolved.length<3&&!localImageUnresolved.includes(match[0]))localImageUnresolved.push(match[0]);continue;}
            const start=match.index,end=start+match[0].length;
            const covered=segments.filter(part=>part.end>start&&part.start<end);if(!covered.length)continue;
            const first=covered[0],last=covered[covered.length-1],startOffset=start-first.start,endOffset=end-last.start;
            const prefix=first.node.nodeValue.slice(0,startOffset);
            const insertions=[createLocalImage(match[0],image,suppressed)];
            if(first===last)insertions.push(document.createTextNode(first.node.nodeValue.slice(endOffset)));
            else {for(const part of covered.slice(1,-1))part.node.nodeValue='';last.node.nodeValue=last.node.nodeValue.slice(endOffset);}
            first.node.nodeValue=prefix;first.node.after(...insertions);
        }
    }
}

function collectLocalImageTextRuns(root) {
    const runs = [];
    let run = [];
    const flush = () => {
        if (run.length) runs.push(run);
        run = [];
    };
    const excluded = 'pre, a, script, style, textarea, button, .localimage-command, [contenteditable="true"]';
    const blocks = new Set(['P', 'DIV', 'BR', 'HR', 'BLOCKQUOTE', 'LI', 'UL', 'OL',
        'TABLE', 'TR', 'TD', 'TH', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
    const visit = node => {
        if (node.nodeType === Node.TEXT_NODE) {
            run.push(node);
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        // A standalone inline-code command is commonly emitted by models.
        // Render it when assigned; keep prose/code examples and fenced code literal.
        if (node.tagName === 'CODE' && !/^::img[ \t]+[^\r\n]+?::$/i.test(node.textContent.trim())) { flush(); return; }
        if (node.matches(excluded) || node.tagName === 'IMG') {
            flush();
            return;
        }
        const block = blocks.has(node.tagName);
        if (block) flush();
        for (const child of node.childNodes) visit(child);
        if (block) flush();
    };
    for (const child of root.childNodes) visit(child);
    flush();
    return runs;
}

function observeLocalImageChat() {
    const chat = document.getElementById('chat');
    if (chat === localImageChatContainer) return;
    localImageObserver?.disconnect();
    localImageChatContainer = chat;
    if (!chat) return;
    localImageObserver ??= new MutationObserver(() => {
        scheduleLocalImageRefresh();
    });
    localImageObserver.observe(chat, { childList: true, subtree: true, characterData: true });
    scheduleLocalImageRefresh();
}

function processAllMessages() {
    localImageUnresolved = [];
    observeLocalImageChat();
    // Disconnect during our changes so they cannot schedule an observer feedback loop.
    localImageObserver?.disconnect();
    try {
        const policy=currentDisplayPolicy();
        for (const element of document.querySelectorAll('#chat .mes')) {
            try {
                processMessageElement(element,policy);
            } catch (error) {
                console.error(`[${EXTENSION_NAME}] Could not process message`, error);
            }
        }
    } finally {
        if (localImageChatContainer?.isConnected) {
            localImageObserver?.observe(localImageChatContainer, {
                childList: true, subtree: true, characterData: true,
            });
        }
    }
}

function registerMessageHandler() {
    refreshGeneralFileIndex().then(() => scheduleLocalImageFinalRefresh());
    observeLocalImageChat();
    scheduleLocalImageFinalRefresh();
}


/**
 * Open the gallery modal
 */
function openGallery() {
    galleryViewToken++;
    const charName = getCurrentCharacterName();
    if (!charName) {
        console.warn(`[${EXTENSION_NAME}] No character selected`);
        return;
    }

    // Create container if not exists
    if (!galleryContainer) {
        galleryContainer = document.createElement('div');
        galleryContainer.id = 'local-image-gallery-root';
        document.body.appendChild(galleryContainer);
        galleryRoot = createRoot(galleryContainer);
    }

    const assignments = getCharacterAssignments(charName);
    const charSettings = getCharacterSettings(charName);
    const customPrompts = getCustomPrompts();

    // Render gallery
    galleryRoot.render(
        <Gallery
            characterName={charName}
            onClose={closeGallery}
            onOpenGeneral={openGeneralGallery}
            onOpenExtensionSettings={openExtensionSettings}
            onOpenLibrary={openGalleryStudio}
            assignments={assignments}
            characterSettings={charSettings}
            customPrompts={customPrompts}
            onAssign={(name, path, description) => {
                assignImage(charName, name, path, description);
                // Re-render to update assignments display
                openGallery();
            }}
            onUnassign={(name) => {
                unassignImage(charName, name);
                openGallery();
            }}
            onUpdateDescription={(name, description) => {
                updateImageDescription(charName, name, description);
                openGallery();
            }}
            onSaveSettings={(settings) => {
                saveCharacterSettings(charName, settings);
                openGallery();
            }}
            onAddPrompt={(name, template) => {
                const id = addCustomPrompt(name, template);
                openGallery();
                return id;
            }}
            onEditPrompt={(id, name, template) => {
                updateCustomPrompt(id, name, template);
                openGallery();
            }}
            onDeletePrompt={(id) => {
                deleteCustomPrompt(id);
                openGallery();
            }}
        />
    );
}

/** Shared images are independent of character/persona names and chat selection. */
function openGeneralGallery() {
    galleryViewToken++;
    if (!galleryContainer) {
        galleryContainer = document.createElement('div');
        galleryContainer.id = 'local-image-gallery-root';
        document.body.appendChild(galleryContainer);
        galleryRoot = createRoot(galleryContainer);
    }
    galleryRoot.render(
        <Gallery
            key="general"
            characterName={GENERAL_KEY}
            folderName={GENERAL_FOLDER}
            galleryTitle="General Gallery"
            tagEntity="general"
            onClose={closeGallery}
            onOpenExtensionSettings={openExtensionSettings}
            onOpenLibrary={openGalleryStudio}
            assignments={getCharacterAssignments(GENERAL_KEY)}
            characterSettings={getCharacterSettings(GENERAL_KEY)}
            customPrompts={getCustomPrompts()}
            onAssign={(name, path, description) => { assignImage(GENERAL_KEY, name, path, description); openGeneralGallery(); }}
            onUnassign={(name) => { unassignImage(GENERAL_KEY, name); openGeneralGallery(); }}
            onUpdateDescription={(name, description) => { updateImageDescription(GENERAL_KEY, name, description); openGeneralGallery(); }}
            onSaveSettings={(settings) => { saveCharacterSettings(GENERAL_KEY, settings); openGeneralGallery(); }}
        />
    );
}

/**
 * Open the gallery modal for persona/user
 */
function openPersonaGallery() {
    galleryViewToken++;
    const personaName = getCurrentPersonaName();
    if (!personaName) {
        console.warn(`[${EXTENSION_NAME}] No persona selected`);
        return;
    }

    // Create container if not exists
    if (!galleryContainer) {
        galleryContainer = document.createElement('div');
        galleryContainer.id = 'local-image-gallery-root';
        document.body.appendChild(galleryContainer);
        galleryRoot = createRoot(galleryContainer);
    }

    const assignments = getCharacterAssignments(personaName);
    const charSettings = getCharacterSettings(personaName);
    const customPrompts = getCustomPrompts();

    // Render gallery
    galleryRoot.render(
        <Gallery
            characterName={personaName}
            onClose={closeGallery}
            onOpenGeneral={openGeneralGallery}
            onOpenExtensionSettings={openExtensionSettings}
            onOpenLibrary={openGalleryStudio}
            assignments={assignments}
            characterSettings={charSettings}
            customPrompts={customPrompts}
            onAssign={(name, path, description) => {
                assignImage(personaName, name, path, description);
                openPersonaGallery();
            }}
            onUnassign={(name) => {
                unassignImage(personaName, name);
                openPersonaGallery();
            }}
            onUpdateDescription={(name, description) => {
                updateImageDescription(personaName, name, description);
                openPersonaGallery();
            }}
            onSaveSettings={(settings) => {
                saveCharacterSettings(personaName, settings);
                openPersonaGallery();
            }}
            onAddPrompt={(name, template) => {
                const id = addCustomPrompt(name, template);
                openPersonaGallery();
                return id;
            }}
            onEditPrompt={(id, name, template) => {
                updateCustomPrompt(id, name, template);
                openPersonaGallery();
            }}
            onDeletePrompt={(id) => {
                deleteCustomPrompt(id);
                openPersonaGallery();
            }}
            isPersona={true}
        />
    );
}

/**
 * Close the gallery modal
 */
function closeGallery() {
    galleryViewToken++;
    if (galleryRoot) {
        galleryRoot.render(null);
    }
}

/**
 * Open the group gallery modal
 */
function openGroupGallery() {
    galleryViewToken++;
    const group = getCurrentGroup();
    if (!group) {
        console.warn(`[${EXTENSION_NAME}] No group selected`);
        return;
    }

    // Create container if not exists
    if (!galleryContainer) {
        galleryContainer = document.createElement('div');
        galleryContainer.id = 'local-image-gallery-root';
        document.body.appendChild(galleryContainer);
        galleryRoot = createRoot(galleryContainer);
    }

    const memberNames = getGroupMemberNames(group.members);

    // Gather all member assignments
    const memberAssignments = {};
    for (const memberName of memberNames) {
        memberAssignments[memberName] = getCharacterAssignments(memberName);
    }

    // Group assignments use the group name as the key
    const groupAssignments = getCharacterAssignments(group.name);
    const groupSettings = getCharacterSettings(group.name);
    const customPrompts = getCustomPrompts();

    // Render group gallery
    galleryRoot.render(
        <GroupGallery
            onOpenLibrary={openGalleryStudio}
            groupName={group.name}
            groupId={group.id}
            memberNames={memberNames}
            memberAssignments={memberAssignments}
            groupAssignments={groupAssignments}
            groupSettings={groupSettings}
            customPrompts={customPrompts}
            onClose={closeGallery}
            onAssignGroup={(name, path, description) => {
                assignImage(group.name, name, path, description);
                openGroupGallery();
            }}
            onUnassignGroup={(name) => {
                unassignImage(group.name, name);
                openGroupGallery();
            }}
            onUpdateGroupDescription={(name, description) => {
                updateImageDescription(group.name, name, description);
                openGroupGallery();
            }}
            onSaveGroupSettings={(settings) => {
                saveCharacterSettings(group.name, settings);
                openGroupGallery();
            }}
            onAddPrompt={(name, template) => {
                const id = addCustomPrompt(name, template);
                openGroupGallery();
                return id;
            }}
            onEditPrompt={(id, name, template) => {
                updateCustomPrompt(id, name, template);
                openGroupGallery();
            }}
            onDeletePrompt={(id) => {
                deleteCustomPrompt(id);
                openGroupGallery();
            }}
        />
    );
}

const PERSONA_BUTTON_ID = 'local_image_persona_button';

/**
 * Add the gallery button for persona
 */
function addPersonaGalleryButton() {
    // Remove existing button if any
    const existingButton = document.getElementById(PERSONA_BUTTON_ID);
    if (existingButton) {
        existingButton.remove();
    }

    // Find the persona controls buttons block (in persona management panel)
    const personaButtonsBlock = document.querySelector('.persona_controls_buttons_block');
    if (!personaButtonsBlock) {
        // Retry after a short delay
        setTimeout(addPersonaGalleryButton, 1000);
        return;
    }

    // Create the button
    const button = document.createElement('div');
    button.id = PERSONA_BUTTON_ID;
    button.className = 'menu_button fa-solid fa-images';
    button.title = 'Persona Images';
    button.setAttribute('data-i18n', '[title]Persona Images');

    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPersonaGallery();
    });

    // Add to persona controls
    personaButtonsBlock.appendChild(button);

    applyGalleryShortcutSettings();
    console.log(`[${EXTENSION_NAME}] Persona gallery button added`);
}

/**
 * Remove the persona gallery button
 */
function removePersonaGalleryButton() {
    const button = document.getElementById(PERSONA_BUTTON_ID);
    if (button) {
        button.remove();
    }
}

/**
 * Handle character/group selection change
 */
function onChatChanged() {
    const inGroup = isGroupChat();
    console.log(`[${EXTENSION_NAME}] onChatChanged called, isGroupChat: ${inGroup}`);

    // Remove existing button
    const existingButton = document.getElementById(BUTTON_ID);
    if (existingButton) {
        existingButton.remove();
    }

    // Create the button
    const button = document.createElement('div');
    button.id = BUTTON_ID;
    button.className = 'menu_button fa-solid fa-images interactable';

    if (inGroup) {
        // Group gallery is COMING SOON - don't show button for now
        console.log(`[${EXTENSION_NAME}] Group chat detected - group gallery coming soon`);
        return;
    } else {
        // Single character chat - find the export button
        const exportButton = document.getElementById('export_button');
        if (!exportButton || !exportButton.parentElement) {
            // Retry after a short delay
            setTimeout(onChatChanged, 500);
            return;
        }

        const charName = getCurrentCharacterName();
        if (!charName) return; // No character selected

        button.title = 'Local Images';
        button.setAttribute('data-i18n', '[title]Local Images');
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openGallery();
        });

        // Insert after the export button
        const buttonContainer = exportButton.parentElement;
        if (exportButton.nextSibling) {
            buttonContainer.insertBefore(button, exportButton.nextSibling);
        } else {
            buttonContainer.appendChild(button);
        }
        applyGalleryShortcutSettings();
        console.log(`[${EXTENSION_NAME}] Gallery button added (character mode)`);
    }
}


/**
 * Send a message as /sys (narrator) without triggering AI response
 * @param {string} message - The message to send
 */
function sendAsNarrator(message) {
    const textarea = document.getElementById('send_textarea');
    const sendButton = document.getElementById('send_but');

    if (!textarea || !sendButton || textarea.value.trim()) {
        console.error(`[${EXTENSION_NAME}] Could not find send textarea or button`);
        return false;
    }

    // Set the message with /sys prefix
    textarea.value = `/sys ${message}`;

    // Trigger input event so ST knows the value changed
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    // Click the send button
    sendButton.click();

    return true;
}

/**
 * Keep an image shortcut available when scene controls are switched off.
 */
function sceneShortcutAvailable(){const bar=document.getElementById('prome-stage-controls');return Boolean(bar&&!bar.hidden);}
function observeSceneShortcut(){if(sceneShortcutObserver)return;const bar=document.getElementById('prome-stage-controls');if(bar){sceneShortcutObserver=new MutationObserver(applyGalleryShortcutSettings);sceneShortcutObserver.observe(bar,{attributes:true,attributeFilter:['hidden']});}}
function availableQuickImages() {
    const ctx=SillyTavern.getContext();
    return catalogEntries(getSettings(),generalImageFiles).filter(entry=>availableInChat(entry,ctx));
}
function mountImageMenu(container) {
    return mountQuickImageMenu(container,{readEntries:availableQuickImages,readContext:()=>SillyTavern.getContext(),send:sendAsNarrator,
        openLibrary:()=>{window.dispatchEvent(new Event('ig-close-scene-panels'));floatingPanelExpanded=false;closeFloatingPanel();openGalleryStudio();},
        openGeneral:()=>{window.dispatchEvent(new Event('ig-close-scene-panels'));floatingPanelExpanded=false;closeFloatingPanel();openGeneralGallery();},
        openSettings:()=>{window.dispatchEvent(new Event('ig-close-scene-panels'));floatingPanelExpanded=false;closeFloatingPanel();openExtensionSettings();}});
}
function mountSceneImageMenu(container) {
    const menu=mountImageMenu(container);sceneImageMenus.add(menu);
    return {refresh:menu.refresh,destroy(){sceneImageMenus.delete(menu);menu.destroy();}};
}

/**
 * Create the floating button element
 */
function createFloatingButton() {
    // Remove existing if any
    const existing = document.getElementById(FLOATING_BUTTON_ID);
    if (existing) existing.remove();

    const button = document.createElement('button');button.type='button';button.setAttribute('aria-label','Quick Image Send');button.setAttribute('aria-controls',FLOATING_PANEL_ID);button.setAttribute('aria-expanded','false');
    button.id = FLOATING_BUTTON_ID;
    button.className = 'local-image-floating-button';
    button.innerHTML = '<i class="fa-solid fa-images"></i>';
    button.title = 'Quick Image Send';

    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFloatingPanel();
    });

    document.body.appendChild(button);
    observeSceneShortcut();applyGalleryShortcutSettings();
    window.addEventListener('resize', applyGalleryShortcutSettings);
    window.addEventListener('ig-layout-change',applyGalleryShortcutSettings);
    document.addEventListener('ig-floating-open',()=>closeFloatingPanel());
    document.addEventListener('pointerdown',event=>{const panel=document.getElementById(FLOATING_PANEL_ID);if(panel&&!panel.contains(event.target)&&!button.contains(event.target))closeFloatingPanel();},true);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&floatingPanelExpanded){event.preventDefault();closeFloatingPanel();button.focus({preventScroll:true});}});
    window.visualViewport?.addEventListener('resize', applyGalleryShortcutSettings);
    console.log(`[${EXTENSION_NAME}] Floating button created`);
}

/**
 * Toggle the floating panel open/closed
 */
function toggleFloatingPanel() {
    floatingPanelExpanded = !floatingPanelExpanded;

    if (floatingPanelExpanded) {
        createFloatingPanel();
    } else {
        closeFloatingPanel();
    }
}

/**
 * Create and show the floating panel
 */
function createFloatingPanel() {
    // Remove existing if any; preserve this requested open state.
    closeFloatingPanel(true);
    window.dispatchEvent(new Event('ig-close-scene-panels'));
    document.getElementById(FLOATING_BUTTON_ID)?.setAttribute('aria-expanded','true');

    const panel = document.createElement('div');
    panel.id = FLOATING_PANEL_ID;
    panel.className = 'local-image-floating-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Quick Image Send');

    // Header with close button
    const header = document.createElement('div');
    header.className = 'floating-panel-header';
    header.innerHTML = `
        <span>Quick Image Send</span>
        <button class="floating-panel-close" title="Close">
            <i class="fa-solid fa-times"></i>
        </button>
    `;
    panel.appendChild(header);

    // Close button handler
    header.querySelector('.floating-panel-close').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        floatingPanelExpanded = false;
        closeFloatingPanel();
    });

    const content=document.createElement('div');panel.append(content);floatingQuickMenu=mountImageMenu(content);
    document.body.appendChild(panel);
    // Position using top instead of bottom to avoid transform issues
    positionFloatingPanel(panel);

    console.log(`[${EXTENSION_NAME}] Quick Image Send opened`);
}

/**
 * Close and remove the floating panel
 */
function closeFloatingPanel(keepExpanded=false) {
    if(!keepExpanded)floatingPanelExpanded=false;
    document.getElementById(FLOATING_BUTTON_ID)?.setAttribute('aria-expanded','false');
    floatingQuickMenu?.destroy();floatingQuickMenu=null;
    const panel = document.getElementById(FLOATING_PANEL_ID);
    if (panel) {
        panel.remove();
    }
}

/**
 * Update the floating panel content (called on chat change)
 */
function updateFloatingPanel() {
    if (floatingPanelExpanded) {
        if(document.getElementById(FLOATING_PANEL_ID))floatingQuickMenu?.refresh();else createFloatingPanel();
    }
    for(const menu of sceneImageMenus)menu.refresh();
}

/**
 * Initialize the extension
 */
function normalizeShortcutSettings(value = {}) {
    const number = (key, min, max) => {
        const raw = value[key];
        const parsed = raw === '' || raw === null || raw === undefined ? NaN : Number(raw);
        return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : UI_DEFAULTS[key];
    };
    return {
        // New combined installs use the scene menu; legacy icon preferences remain
        // available by selecting Floating or Both. No saved positioning values are lost.
        quickSendPlacement: ['scene','floating','both','hidden'].includes(value.quickSendPlacement)?value.quickSendPlacement:'scene',
        showFloatingButton: ['floating','both'].includes(value.quickSendPlacement),
        showCharacterButton: value.showCharacterButton !== false,
        showPersonaButton: value.showPersonaButton !== false,
        buttonSize: number('buttonSize', 24, 80),
        buttonSide: value.buttonSide === 'left' ? 'left' : 'right',
        buttonOffsetX: number('buttonOffsetX', 0, 300),
        buttonOffsetBottom: number('buttonOffsetBottom', 0, 600),
        imageMaxHeight: number('imageMaxHeight', 0, 4000),
    };
}

function positionFloatingPanel(panel) {
    const button = document.getElementById(FLOATING_BUTTON_ID);
    const anchor = button?.getBoundingClientRect();
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    panel.style.maxWidth = `${Math.max(0, viewportWidth - 16)}px`;
    panel.style.maxHeight = `${Math.max(0, viewportHeight - 16)}px`;
    const left = anchor ? anchor.right - panel.offsetWidth : viewportWidth - panel.offsetWidth - 16;
    const top = anchor ? anchor.top - panel.offsetHeight - 8 : viewportHeight - panel.offsetHeight - 16;
    panel.style.left = `${Math.max(8, Math.min(left, viewportWidth - panel.offsetWidth - 8))}px`;
    panel.style.right = 'auto';
    panel.style.top = `${Math.max(8, Math.min(top, viewportHeight - panel.offsetHeight - 8))}px`;
    panel.style.bottom = 'auto';
}

function applyGalleryShortcutSettings() {
    const ui = normalizeShortcutSettings(getSettings().ui);
    for (const img of document.querySelectorAll('#chat img.localimage-inserted')) applyImageHeight(img);
    const floating = document.getElementById(FLOATING_BUTTON_ID);
    const showFloating=ui.showFloatingButton||(ui.quickSendPlacement==='scene'&&!sceneShortcutAvailable());
    if (floating) {
        floating.style.display = showFloating ? '' : 'none';
        const width = window.visualViewport?.width || window.innerWidth;
        const height = window.visualViewport?.height || window.innerHeight;
        const horizontal = Math.min(ui.buttonOffsetX, Math.max(0, width - ui.buttonSize - 4));
        const bottom = Math.min(ui.buttonOffsetBottom, Math.max(0, height - ui.buttonSize - 4));
        floating.style.width = floating.style.height = `${ui.buttonSize}px`;
        floating.style.fontSize = `${Math.round(ui.buttonSize * 0.45)}px`;
        floating.style.top = `${Math.max(0, height - bottom - ui.buttonSize)}px`;
        floating.style.bottom = 'auto';
        floating.style.left = ui.buttonSide === 'left' ? `${horizontal}px` : 'auto';
        floating.style.right = ui.buttonSide === 'right' ? `${horizontal}px` : 'auto';
    }
    const character = document.getElementById(BUTTON_ID);
    if (character) character.style.display = ui.showCharacterButton ? '' : 'none';
    const persona = document.getElementById(PERSONA_BUTTON_ID);
    if (persona) persona.style.display = ui.showPersonaButton ? '' : 'none';
    if (!showFloating) {
        floatingPanelExpanded = false;
        closeFloatingPanel();
    } else {
        const panel = document.getElementById(FLOATING_PANEL_ID);
        if (panel) positionFloatingPanel(panel);
    }
    for (const controls of document.querySelectorAll('.localimage-shortcut-controls')) {
        const enabledControl = controls.querySelector('[data-localimage-enabled]');
        if (enabledControl) enabledControl.checked = getSettings().enabled !== false;
        const status = controls.querySelector('[data-localimage-render-status]');
        if (status) status.textContent = localImageUiError ? `Renderer active; settings error: ${localImageUiError}` :
            `Image renderer ${localImageRendererReady ? 'ready' : 'starting'}; image conversion ${getSettings().enabled !== false ? 'enabled' : 'disabled'}.${localImageUnresolved.length ? ' No matching assignment: ' + localImageUnresolved.map(describeUnresolvedCommand).join('; ') : ''}`;

        controls.querySelector('[data-localimage-floating]').disabled=!ui.showFloatingButton;
        for (const control of controls.querySelectorAll('[data-localimage-ui]')) {
            const value = ui[control.dataset.localimageUi];
            if (control.type === 'checkbox') control.checked = value;
            else control.value = value;
        }
    }
}

function createShortcutControls() {
    const controls = document.createElement('div');
    controls.className = 'localimage-shortcut-controls';
    controls.innerHTML = `
        <div class="local-image-panel-toolbar"><button type="button" class="menu_button" data-localimage-action="studio">Open asset library</button></div>
        <label><input type="checkbox" data-localimage-enabled> Render image commands</label>
        <label>Maximum image height (px; 0 = unlimited)<input class="text_pole" type="number" min="0" max="4000" step="1" data-localimage-ui="imageMaxHeight"></label>
        <small>Images fit the message width and keep their proportions.</small>
        <details><summary>Gallery shortcuts</summary>
        <label><input type="checkbox" data-localimage-ui="showCharacterButton"> Show character gallery icon</label>
        <label><input type="checkbox" data-localimage-ui="showPersonaButton"> Show persona gallery icon</label>
        <label>Quick Image Send<select data-localimage-ui="quickSendPlacement" aria-label="Quick Image Send placement"><option value="scene">Backgrounds / images menu</option><option value="both">Scene menu + floating icon</option><option value="floating">Floating icon only</option><option value="hidden">Hide shortcuts</option></select></label>
        <fieldset data-localimage-floating><legend>Floating icon position</legend>
        <label>Icon size (px; default 40)<input class="text_pole" type="number" min="24" max="80" step="1" data-localimage-ui="buttonSize"></label>
        <label>Screen edge<select class="text_pole" data-localimage-ui="buttonSide"><option value="right">Right</option><option value="left">Left</option></select></label>
        <label>Distance from screen edge (px; default 20)<input class="text_pole" type="number" min="0" max="300" step="1" data-localimage-ui="buttonOffsetX"></label>
        <label>Distance from bottom (px; default 100)<input class="text_pole" type="number" min="0" max="600" step="1" data-localimage-ui="buttonOffsetBottom"></label>
        </fieldset><button type="button" class="menu_button" data-localimage-action="reset">Reset image display &amp; shortcuts</button></details>
        <details><summary>Refresh &amp; diagnostics</summary><p data-localimage-render-status></p><button type="button" class="menu_button" data-localimage-action="refresh">Refresh chat images</button><small>Shared image command: <code>::img general image-name::</code></small></details>
        <details><summary>Individual gallery folders</summary><div class="local-image-panel-toolbar"><button type="button" class="menu_button" data-localimage-action="general">General Gallery</button><button type="button" class="menu_button" data-localimage-action="character">Character Gallery</button><button type="button" class="menu_button" data-localimage-action="persona">My Gallery</button></div></details>`;
    const enabledControl = controls.querySelector('[data-localimage-enabled]');
    enabledControl.checked = getSettings().enabled !== false;
    enabledControl.addEventListener('change', () => { getSettings().enabled = enabledControl.checked; saveSettings(); });
    for (const control of controls.querySelectorAll('[data-localimage-ui]')) {
        control.addEventListener('change', () => {
            const key = control.dataset.localimageUi;
            const ui = normalizeShortcutSettings(getSettings().ui);
            ui[key] = control.type === 'checkbox' ? control.checked : control.value;
            getSettings().ui = normalizeShortcutSettings(ui);
            saveSettings();
        });
    }
    const actions = {
        studio: () => { closeShortcutSettings(); openGalleryStudio(); },
        general: () => { closeShortcutSettings(); openGeneralGallery(); },
        character: () => { closeShortcutSettings(); isGroupChat()?openGroupGallery():openGallery(); },
        persona: () => { closeShortcutSettings(); openPersonaGallery(); },
        reset: () => { getSettings().ui = { ...UI_DEFAULTS }; saveSettings(); },
        refresh: async () => { await refreshGeneralFileIndex(); processAllMessages(); applyGalleryShortcutSettings(); },
    };
    for (const button of controls.querySelectorAll('[data-localimage-action]')) {
        button.addEventListener('click', actions[button.dataset.localimageAction]);
    }
    return controls;
}

function closeShortcutSettings() {
    document.getElementById('localimage-shortcut-modal')?.remove();
}

function openExtensionSettings() {
    closeGallery();
    closeShortcutSettings();
    floatingPanelExpanded = false;
    closeFloatingPanel();
    const backdrop = document.createElement('div');
    backdrop.id = 'localimage-shortcut-modal';
    backdrop.className = 'local-image-modal-backdrop';
    const modal = document.createElement('div');
    modal.className = 'local-image-modal localimage-settings-modal';
    const header = document.createElement('div');
    header.className = 'local-image-modal-header';
    const title = document.createElement('h3');
    title.textContent = 'ImmersiveGroups Gallery';
    const close = document.createElement('button');
    close.className = 'menu_button';
    close.textContent = 'Close';
    close.addEventListener('click', closeShortcutSettings);
    header.append(title, close);
    modal.append(header, createShortcutControls());
    backdrop.appendChild(modal);
    backdrop.addEventListener('click', event => { if (event.target === backdrop) closeShortcutSettings(); });
    document.body.appendChild(backdrop);
    applyGalleryShortcutSettings();
}

function installExtensionSettings() {
    installGallerySettings({getSettings,saveSettings,createShortcutControls,openGalleryStudio,preview:()=>buildGalleryPrompt({...getSettings(),prompt:{...getSettings().prompt,enabled:true}},SillyTavern.getContext(),generalImageFiles,currentDisplayPolicy())});
}
function openGalleryStudio(options={}) {
    const token=++galleryViewToken;
    const type=['outfit','background','image'].includes(options?.type)?options.type:'all';
    const initialView={type,character:typeof options?.character==='string'?options.character:'',search:'',gallery:'',description:'all',visibility:'all',outfitImages:'all',backgrounds:'all',...(type!=='all'?{currentOnly:false}:{})};
    window.dispatchEvent(new Event('ig-close-scene-panels'));
    closeShortcutSettings();
    if(!galleryContainer){galleryContainer=document.createElement('div');galleryContainer.id='local-image-gallery-root';document.body.appendChild(galleryContainer);galleryRoot=createRoot(galleryContainer);}
    const render=()=>{if(token!==galleryViewToken)return;galleryRoot.render(<GalleryStudio key={token} initialView={initialView} getSceneLibrary={()=>window.ImmersiveGroupsSceneLibrary} onRefresh={async()=>{await refreshGeneralFileIndex();await window.ImmersiveGroupsSceneLibrary?.refresh(true);}} getSettings={getSettings} getEntries={()=>catalogEntries(getSettings(),generalImageFiles)} getContext={()=>SillyTavern.getContext()} onClose={closeGallery} onSave={(entry,patch)=>{saveCatalogEntry(getSettings(),entry,patch);saveSettings();render();}} onSaveView={view=>{getSettings().libraryView={...view,search:'',character:''};getSettings().galleryView={sort:view.sort,currentChatOnly:view.currentOnly};saveSettings();}} onSaveGalleryDescription={(gallery,note)=>{Object.defineProperty(getSettings().galleryDescriptions,gallery,{value:note.slice(0,1000),enumerable:true,writable:true,configurable:true});saveSettings();render();}} onOpenFolder={folder=>{closeGallery();openGalleryFolder(folder);}} />);};
    render();refreshGeneralFileIndex().then(render);
}
function openGalleryFolder(entity) {
    galleryViewToken++;
    const ctx=SillyTavern.getContext(),group=getCurrentGroup();
    if(entity===GENERAL_KEY){openGeneralGallery();return;}
    if(group&&entity===group.name){openGroupGallery();return;}
    if(entity===getCurrentPersonaName()){openPersonaGallery();return;}
    if(!galleryContainer){galleryContainer=document.createElement('div');galleryContainer.id='local-image-gallery-root';document.body.appendChild(galleryContainer);galleryRoot=createRoot(galleryContainer);}
    galleryRoot.render(<Gallery key={entity} characterName={entity} assignments={getCharacterAssignments(entity)} characterSettings={getCharacterSettings(entity)} customPrompts={getCustomPrompts()} onClose={closeGallery} onOpenGeneral={openGeneralGallery} onOpenExtensionSettings={openExtensionSettings} onOpenLibrary={openGalleryStudio} onAssign={(name,path,description)=>{assignImage(entity,name,path,description);openGalleryFolder(entity);}} onUnassign={name=>{unassignImage(entity,name);openGalleryFolder(entity);}} onUpdateDescription={(name,description)=>{updateImageDescription(entity,name,description);openGalleryFolder(entity);}} onSaveSettings={settings=>saveCharacterSettings(entity,settings)} />);
}
function gallerySceneContext() {
    const ctx=SillyTavern.getContext(),policy=currentDisplayPolicy();
    const result={version:1,chatId:ctx.getCurrentChatId?.(),groupId:ctx.groupId,round:policy.round,galleries:{...getSettings().galleryDescriptions},images:catalogEntries(getSettings(),generalImageFiles).filter(e=>availableInChat(e,ctx)).map(({virtual,...entry})=>({...entry,availableNow:!(policy.limits.repeatEnabled&&policy.lastShown.has(entry.src)&&policy.round-policy.lastShown.get(entry.src)<=policy.limits.cooldownRounds)&&(!policy.limits.perRoundEnabled||(policy.roundCounts.get(policy.round)||0)<policy.limits.maxPerRound)}))};
    return JSON.parse(JSON.stringify(result));
}

let galleryStarted = false;
export function initGallery() {
    if (galleryStarted) return;
    galleryStarted = true;
    document.documentElement?.setAttribute('data-localimage-patch', 'v17');
    console.log(`[${EXTENSION_NAME}] Loaded Gallery v17 (native formatting preserved)`);
    initSettings();
    // Start the renderer before the auxiliary settings panel. A UI error must
    // never prevent native render/swipe subscriptions from being installed.
    registerMessageHandler();
    updateGalleryPrompt();
    window.ImmersiveGroupsGallery=Object.freeze({version:1,getSceneContext:gallerySceneContext,openLibrary:openGalleryStudio,mountQuickSend:mountSceneImageMenu,getShortcutState:()=>({showInScene:['scene','both'].includes(normalizeShortcutSettings(getSettings().ui).quickSendPlacement)})});
    window.dispatchEvent(new Event('ig-gallery-change'));
    document.addEventListener('immersivegroups:ready',()=>{observeSceneShortcut();applyGalleryShortcutSettings();},{once:true});
    setTimeout(() => {
        try { installExtensionSettings(); }
        catch (error) {
            localImageUiError = String(error?.message || error);
            console.error(`[${EXTENSION_NAME}] Settings UI failed; renderer is still active`, error);
        }
    }, 0);

    const context = SillyTavern.getContext();

    // Subscribe to chat events
    console.log(`[${EXTENSION_NAME}] eventSource exists:`, !!context.eventSource, 'eventTypes exists:', !!context.eventTypes);
    if (context.eventSource && context.eventTypes) {
        // Regular chat changed
        context.eventSource.on(context.eventTypes.CHAT_CHANGED, () => {
            observeLocalImageChat();
            const ctx = SillyTavern.getContext();
            console.log(`[${EXTENSION_NAME}] CHAT_CHANGED event received - groupId: ${ctx.groupId}, characterId: ${ctx.characterId}`);
            onChatChanged();
            updateFloatingPanel();
            setTimeout(processAllMessages, 500);
        });

        // Group chat specific event
        if (context.eventTypes.GROUP_CHAT_CHANGED) {
            context.eventSource.on(context.eventTypes.GROUP_CHAT_CHANGED, () => {
                console.log(`[${EXTENSION_NAME}] GROUP_CHAT_CHANGED event received`);
                onChatChanged();
                updateFloatingPanel();
                setTimeout(processAllMessages, 500);
            });
        }

        // Also try listening to chatLoaded if available
        if (context.eventTypes.CHAT_LOADED) {
            context.eventSource.on(context.eventTypes.CHAT_LOADED, () => {
                console.log(`[${EXTENSION_NAME}] CHAT_LOADED event received`);
                onChatChanged();
                updateFloatingPanel();
                setTimeout(processAllMessages, 500);
            });
        }

        console.log(`[${EXTENSION_NAME}] Event subscriptions registered`);

        // DOM-only insertion is safe after each native render. Do not gate it on
        // generation events: dry runs/aborts may emit STARTED without an end event.
        const refreshAfterRender = () => scheduleLocalImageFinalRefresh();
        for (const eventName of [
            'MESSAGE_RECEIVED', 'MESSAGE_SENT', 'MESSAGE_RENDERED', 'USER_MESSAGE_RENDERED',
            'CHARACTER_MESSAGE_RENDERED', 'MESSAGE_SWIPED',
            'MESSAGE_UPDATED', 'MESSAGE_EDITED', 'MORE_MESSAGES_LOADED', 'MESSAGE_DELETED',
            'GENERATION_STARTED', 'GENERATION_ENDED', 'GENERATION_STOPPED',
        ]) {
            if (context.eventTypes[eventName]) {
                context.eventSource.on(context.eventTypes[eventName], refreshAfterRender);
            }
        }
        // Refresh before prompt construction on both text and chat-completion APIs.
        for(const name of ['GENERATION_STARTED','GENERATION_AFTER_COMMANDS','CHAT_CHANGED','GROUP_CHAT_CHANGED','SETTINGS_UPDATED','MESSAGE_DELETED','MESSAGE_EDITED','MESSAGE_SWIPED']){
            if(context.eventTypes[name])context.eventSource.on(context.eventTypes[name],type=>updateGalleryPrompt(name.startsWith('GENERATION_')&&['quiet','impersonate'].includes(type)));
        }

        // Strip ::img:: tags from chat messages before sending to AI
        // Preserve system instructions describing how to use the commands.
        if (context.eventTypes.CHAT_COMPLETION_PROMPT_READY) {
            context.eventSource.on(context.eventTypes.CHAT_COMPLETION_PROMPT_READY, (data) => {
                const messages=Array.isArray(data?.chat)?data.chat:data?.messages;
                if (getSettings().enabled === false || !Array.isArray(messages)) return;

                // Strip commands from conversation content, preserving prompt instructions.
                for (const message of messages) {
                    if (!message || typeof message !== 'object') continue;
                    // System/developer instructions contain the image command usage examples.
                    if (message.role === 'system' || message.role === 'developer') continue;
                    if (typeof message.content === 'string') {
                        message.content = stripImageTags(message.content);
                    }
                    // Handle array content (for multimodal messages)
                    if (Array.isArray(message.content)) {
                        for (const part of message.content) {
                            if (part?.type === 'text' && typeof part.text === 'string') {
                                part.text = stripImageTags(part.text);
                            }
                        }
                    }
                }
                console.log(`[${EXTENSION_NAME}] Stripped ::img:: tags from prompt`);
            });
        }
    }

    // Add buttons if chat already active
    setTimeout(() => {
        onChatChanged();
        // Always try to add persona button
        addPersonaGalleryButton();
        // Create floating button for quick image send
        createFloatingButton();
    }, 100);

    // Fallback: Use MutationObserver to detect chat changes
    // This helps when CHAT_CHANGED event doesn't fire for our extension
    let lastGroupId = null;
    let lastCharacterId = null;

    const checkAndUpdateButton = () => {
        try {
            observeLocalImageChat();
            const context = SillyTavern.getContext();
            const currentGroupId = context.groupId;
            const currentCharacterId = context.characterId;

            // Check if context changed
            if (currentGroupId !== lastGroupId || currentCharacterId !== lastCharacterId) {
                console.log(`[${EXTENSION_NAME}] Context changed - groupId: ${lastGroupId} -> ${currentGroupId}, characterId: ${lastCharacterId} -> ${currentCharacterId}`);
                lastGroupId = currentGroupId;
                lastCharacterId = currentCharacterId;
                onChatChanged();
            } else {
                // Also check if button is missing
                const existingButton = document.getElementById(BUTTON_ID);
                if (!existingButton && !isGroupChat() && getCurrentCharacterName()) {
                    const chatElement = document.getElementById('chat');
                    if (chatElement && chatElement.children.length > 0) {
                        console.log(`[${EXTENSION_NAME}] Button missing, re-adding`);
                        onChatChanged();
                    }
                }
            }
        } catch (e) {
            console.error(`[${EXTENSION_NAME}] Error in checkAndUpdateButton:`, e);
        }
    };

    // Run immediately on init
    console.log(`[${EXTENSION_NAME}] Setting up polling and observers`);
    setTimeout(checkAndUpdateButton, 500);

    const chatObserver = new MutationObserver(() => {
        checkAndUpdateButton();
    });

    // Observe the chat container for changes
    const chatContainer = document.getElementById('chat');
    if (chatContainer) {
        chatObserver.observe(chatContainer, { childList: true });
        console.log(`[${EXTENSION_NAME}] MutationObserver watching chat container`);
    }

    // Also observe the sheld container which changes when switching chat types
    const sheldContainer = document.getElementById('sheld');
    if (sheldContainer) {
        chatObserver.observe(sheldContainer, { childList: true, attributes: true, attributeFilter: ['class'] });
        console.log(`[${EXTENSION_NAME}] MutationObserver watching sheld container`);
    }

    // Retry after DOM is more ready if containers weren't found
    setTimeout(() => {
        if (!chatContainer) {
            const delayedChat = document.getElementById('chat');
            if (delayedChat) {
                chatObserver.observe(delayedChat, { childList: true });
                console.log(`[${EXTENSION_NAME}] MutationObserver watching chat container (delayed)`);
            }
        }
        if (!sheldContainer) {
            const delayedSheld = document.getElementById('sheld');
            if (delayedSheld) {
                chatObserver.observe(delayedSheld, { childList: true, attributes: true, attributeFilter: ['class'] });
                console.log(`[${EXTENSION_NAME}] MutationObserver watching sheld container (delayed)`);
            }
        }
        // Do an initial check
        checkAndUpdateButton();
    }, 1000);

    // Also poll every 2 seconds as ultimate fallback
    setInterval(checkAndUpdateButton, 2000);

    localImageRendererReady = true;
    console.log(`[${EXTENSION_NAME}] Extension initialized`);
}

