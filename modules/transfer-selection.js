// SPDX-License-Identifier: AGPL-3.0-only
export const TRANSFER_SECTIONS=[
    ['Outfits',[['outfits','Outfit entries'],['spriteFiles','Sprite images'],['outfitDescriptions','Descriptions'],['outfitOrder','Library order'],['outfitLocks','Automation locks']]],
    ['Character',[['heights','Height & PC/mobile fine tuning'],['colors','UI colors'],['cards','Character card']]],
    ['Extra',[['backgrounds','Linked backgrounds'],['backgroundFiles','Background images'],['backgroundDescriptions','Scene descriptions'],['backgroundRelationships','Relationships & load defaults'],['groups','Preset groups']]],
    ['Gallery',[['gallery','Images / assignments'],['galleryFiles','Image files'],['galleryDescriptions','Descriptions']]],
    ['Settings',[['settings','Layout & extension preferences']]],
];
export const SELECTION_KEYS=TRANSFER_SECTIONS.flatMap(([,items])=>items.map(([key])=>key));
export function transferSelection(options={},media=false,input){
    const legacy={outfits:options.outfits===true,spriteFiles:media&&options.outfits===true,outfitDescriptions:options.outfits===true,outfitOrder:options.outfits===true,outfitLocks:options.outfits===true,heights:options.heights===true,colors:options.colors===true,cards:options.cards===true,backgrounds:options.backgrounds===true,backgroundFiles:media&&options.backgrounds===true,backgroundDescriptions:options.backgrounds===true,backgroundRelationships:options.backgrounds===true,groups:options.groups===true,gallery:options.gallery===true,galleryFiles:media&&options.gallery===true,galleryDescriptions:options.gallery===true,settings:options.settings===true};
    if(input!==undefined&&(!input||typeof input!=='object'||Array.isArray(input)))throw Error('Invalid transfer selection.');const out={};for(const key of SELECTION_KEYS){if(input!==undefined&&key in input&&typeof input[key]!=='boolean')throw Error('Invalid transfer toggle.');out[key]=input===undefined?legacy[key]:input[key]===true;}
    const format=input?.cardFormat??'png';if(!['png','json'].includes(format))throw Error('Choose PNG or JSON character cards.');return {...out,cardFormat:format};
}
export function transferCategories(s){return {outfits:['outfits','spriteFiles','outfitDescriptions','outfitOrder','outfitLocks'].some(k=>s[k]),heights:s.heights,colors:s.colors,cards:s.cards,backgrounds:['backgrounds','backgroundFiles','backgroundDescriptions','backgroundRelationships'].some(k=>s[k]),groups:s.groups,gallery:['gallery','galleryFiles','galleryDescriptions'].some(k=>s[k]),settings:s.settings};}
export function bundleSelection(bundle,categories=bundle.options,input,media=true){
    const available=bundle.selection?transferSelection({},false,bundle.selection):transferSelection(bundle.options,true),requested=input===undefined?transferSelection(categories,media):transferSelection({},false,input),out={};
    const section={outfits:'outfits',spriteFiles:'outfits',outfitDescriptions:'outfits',outfitOrder:'outfits',outfitLocks:'outfits',backgrounds:'backgrounds',backgroundFiles:'backgrounds',backgroundDescriptions:'backgrounds',backgroundRelationships:'backgrounds',gallery:'gallery',galleryFiles:'gallery',galleryDescriptions:'gallery'};
    for(const key of SELECTION_KEYS)out[key]=available[key]&&requested[key]&&categories[section[key]||key]===true;
    if(!media)for(const key of ['spriteFiles','backgroundFiles','galleryFiles'])out[key]=false;
    // Import always uses the card format actually stored in the bundle.
    out.cardFormat=available.cardFormat;return out;
}
