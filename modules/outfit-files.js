// SPDX-License-Identifier: AGPL-3.0-only
import JSZip from '../vendor/jszip.js';
import { getRequestHeaders } from '../../../../../script.js';
import { validFolder, rememberOutfit } from './outfit-catalog.js';
import { spriteImageName, uniqueSpriteName, scanFolderCandidates, spriteFolder, readZipImage, expressionSpriteName } from './outfit-files-model.js';
async function sprites(folder){const response=await fetch(`/api/sprites/get?name=${encodeURIComponent(folder)}`);if(!response.ok)throw new Error(`Could not read sprite folder (${response.status}).`);const list=await response.json();if(!Array.isArray(list))throw new Error('Invalid sprite list.');return list;}
export async function scanOutfitFolders(characters,files){
    const candidates=scanFolderCandidates(characters,files);let found=0,added=0,failed=0,index=0;
    if(candidates.length>2000)throw new Error('Select at most 2000 outfit folders per scan.');
    async function worker(){while(index<candidates.length){const {character,folder}=candidates[index++];if(!validFolder(folder))continue;try{const list=await sprites(folder);if(list.some(s=>spriteImageName(String(s.path||'').split('?')[0].split('/').pop()))){found++;if(rememberOutfit(character,folder,{source:'scanned'}))added++;}}catch{failed++;}}}
    await Promise.all([worker(),worker(),worker()]);return {found,added,failed};
}
const uploads=new Map();
export function queueSpriteMutation(folder,action){
    folder=spriteFolder(folder);const key=folder.toLowerCase(),previous=uploads.get(key)||Promise.resolve();
    const job=previous.catch(()=>{}).then(action);uploads.set(key,job);
    const release=()=>{if(uploads.get(key)===job)uploads.delete(key);};job.then(release,release);return job;
}
export function uploadOutfitImages(folder,input,options={}){
    try{folder=spriteFolder(folder);}catch(error){return Promise.reject(error);}
    const files=options.zip?input:Array.from(input||[]),plan={...options,...(Array.isArray(options.expressions)?{expressions:[...options.expressions]}:{})};
    return queueSpriteMutation(folder,()=>performUpload(folder,files,plan));
}
async function performUpload(folder,input,{zip=false,expressions=null}={}){
    const images=[];let skipped=0,total=0;
    if(expressions!==null&&(zip||!Array.isArray(expressions)||expressions.length!==input.length))throw new Error('Choose an expression for every image.');
    if(zip){
        if(input.size>50*1024*1024)throw new Error('Sprite ZIP must be smaller than 50 MiB.');
        const archive=await JSZip.loadAsync(await input.arrayBuffer());
        if(Object.keys(archive.files).length>2000)throw new Error('ZIP contains too many entries.');
        for(const file of Object.values(archive.files)){
            if(file.dir)continue;
            const raw=file.unsafeOriginalName||file.name,leaf=raw.split(/[\\/]/).pop();
            if(raw.split(/[\\/]/).some(p=>p==='..'||p==='__MACOSX')||!spriteImageName(leaf)){skipped++;continue;}
            const size=file._data?.uncompressedSize;
            if(!Number.isSafeInteger(size)||size<0||size>20*1024*1024)throw new Error('Each sprite must be smaller than 20 MiB.');
            total+=size;if(total>250*1024*1024||images.length>=200)throw new Error('Import at most 200 images and 250 MiB per ZIP.');
            images.push({name:leaf,read:()=>readZipImage(file)});
        }
    }else for(const [index,file] of input.entries()){if(!spriteImageName(file.name)){skipped++;continue;}total+=file.size;if(file.size>20*1024*1024||total>250*1024*1024||images.length>=200)throw new Error('Import at most 200 images, 20 MiB each and 250 MiB total.');images.push({name:expressions===null?file.name:expressionSpriteName(file.name,expressions[index]),originalName:file.name,read:async()=>file});}
    if(!images.length)throw new Error('No supported sprite images were found.');
    const existing=await sprites(folder),used=new Set(existing.map(s=>{try{return decodeURIComponent(new URL(s.path,location.href).pathname.split('/').pop()).replace(/\.[^.]+$/,'').toLowerCase();}catch{return '';}}));
    let uploaded=0,renamed=0,actualTotal=0;
    // Native ZIP upload overwrites collisions. Upload individual uniquely named
    // images instead; use the native sprite endpoint and CSRF header each time.
    try{for(const file of images){
        const name=uniqueSpriteName(file.name,used),form=new FormData();
        if(name.filename.toLowerCase()!==(file.originalName||file.name).toLowerCase())renamed++;
        const image=await file.read();actualTotal+=image.size;
        if(image.size>20*1024*1024||actualTotal>250*1024*1024)throw new Error('Decompressed sprites exceed the upload size limit.');
        form.append('name',folder);form.append('label',name.label);form.append('spriteName',name.stem);form.append('avatar',image,name.filename);
        const headers={...getRequestHeaders()};for(const key of Object.keys(headers))if(key.toLowerCase()==='content-type')delete headers[key];
        const response=await fetch('/api/sprites/upload',{method:'POST',headers,body:form});
        if(!response.ok)throw new Error(`${uploaded} images uploaded before HTTP ${response.status}. Retry imports keep existing filenames.`);
        const result=await response.json();if(!result?.ok)throw new Error(`${uploaded} images uploaded; the server did not confirm the next image.`);uploaded++;
    }}finally{if(uploaded)window.dispatchEvent(new Event('ig-scene-library-change'));}
    return {uploaded,renamed,skipped};
}
