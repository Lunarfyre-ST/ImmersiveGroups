// SPDX-License-Identifier: AGPL-3.0-only
// Pure helpers for the per-folder gallery (character, persona, General and group galleries).
import { safeImageSource, editableName } from './gallery-model.js';
import { imageMatchesSearch } from './library-model.js';

const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
export const assignmentValue=value=>typeof value==='string'?{path:value}:value&&typeof value==='object'?value:null;

/** Every command name in this gallery that points at the image source (aliases of one file). */
export function namesForImage(assignments,src){
    if(!src)return [];
    return Object.keys(assignments||{}).filter(name=>safeImageSource(assignmentValue(assignments[name])?.path)===src);
}
export function assignmentInfo(assignments,src){
    const names=namesForImage(assignments,src),name=names[0]||null,value=name?assignmentValue(assignments[name]):null;
    return {name,names,description:typeof value?.description==='string'?value.description:''};
}
/** Command names use no whitespace or colons; returns '' when nothing usable remains. */
export function normalizeImageName(name){
    const value=String(name??'').trim().replace(/\s+/g,'_').replace(/:+/g,'_').slice(0,120);
    return editableName(value)?value:'';
}
export function imageNameFromFile(filename){
    return normalizeImageName(String(filename||'').split('/').pop().replace(/\.[^/.]+$/,''))||'image';
}
/** Keeps a name unless another file already owns it; then appends _2, _3… */
export function uniqueImageName(base,assignments,path){
    const src=safeImageSource(path),free=name=>!own(assignments,name)||safeImageSource(assignmentValue(assignments[name])?.path)===src;
    if(free(base))return base;
    for(let index=2;index<10000;index++){const suffix=`_${index}`,name=base.slice(0,120-suffix.length)+suffix;if(free(name))return name;}
    return `${base.slice(0,100)}_${Date.now()}`;
}
export function filterFolderImages(images,assignments,{search='',status='all'}={}){
    return images.filter(image=>{
        const info=assignmentInfo(assignments,image.src);
        if(status==='named'&&!info.name)return false;
        if(status==='unnamed'&&info.name)return false;
        return imageMatchesSearch(image,info,search);
    });
}
/** Converts a server file list into safe image records for one folder. */
export function folderImages(folder,files,owner){
    if(!Array.isArray(files))throw new Error('Invalid gallery file list');
    return files.filter(file=>typeof file==='string'&&file&&!/[\\/]/.test(file)).map(file=>{const path=`user/images/${folder}/${file}`;return {name:file,path,src:safeImageSource(path),owner};}).filter(image=>image.src);
}
export function sortRequest(sort){
    return {sortField:String(sort||'').startsWith('name')?'name':'date',sortOrder:String(sort||'').endsWith('asc')?'asc':'desc'};
}
