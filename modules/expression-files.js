// SPDX-License-Identifier: AGPL-3.0-only
import { getRequestHeaders } from '../../../../../script.js';
import { queueSpriteMutation } from './outfit-files.js';
import { spriteFolder, spriteImageName } from './outfit-files-model.js';

const reviews=new WeakMap(),limit=20*1024*1024;
export function expressionFile(folder,src,origin=location.href){
    folder=spriteFolder(folder);const url=new URL(src,origin),base=new URL(origin);
    const path=decodeURIComponent(url.pathname),prefix=`/characters/${folder}/`,filename=path.slice(prefix.length);
    if(url.origin!==base.origin||!path.startsWith(prefix)||!filename||/[\\/\x00-\x1f\x7f]/.test(filename)||filename.startsWith('.')||!(spriteImageName(filename)||/\.svg$/i.test(filename)))throw new Error('Choose an image from this outfit folder.');
    return {folder,filename,stem:filename.replace(/\.[^.]+$/,''),src:url.href};
}
async function inventory(file){
    const response=await fetch(`/api/sprites/get?name=${encodeURIComponent(file.folder)}`,{cache:'no-store'});if(!response.ok)throw new Error('The sprite folder could not be checked.');
    const rows=await response.json();if(!Array.isArray(rows))throw new Error('Invalid sprite inventory.');
    const matches=rows.map(row=>{try{return expressionFile(file.folder,row.path);}catch{return null;}}).filter(item=>item?.stem.toLowerCase()===file.stem.toLowerCase());
    if(matches.length!==1||matches[0].filename!==file.filename)throw new Error('This image changed or has an ambiguous filename. Rescan the folder before editing.');
    return matches[0];
}
async function checksum(file){
    const response=await fetch(file.src,{cache:'no-store'});if(!response.ok)throw new Error('The original image could not be read.');
    const declared=Number(response.headers.get('content-length'));if(declared>limit)throw new Error('Review images up to 20 MiB.');
    const reader=response.body.getReader(),chunks=[];let size=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new Error('Review images up to 20 MiB.');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await new Blob(chunks).arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function reviewExpression(folder,src){
    const file=await inventory(expressionFile(folder,src)),hash=await checksum(file),ticket=Object.freeze({...file});reviews.set(ticket,{file,hash});return ticket;
}
export function editExpression(ticket,replacement=null){
    const proof=reviews.get(ticket);if(!proof)return Promise.reject(new Error('Review the image again before editing.'));
    return queueSpriteMutation(proof.file.folder,async()=>{
        if(reviews.get(ticket)!==proof)throw new Error('This image review has already been used.');
        if(replacement&&(!spriteImageName(replacement.name)||replacement.size>limit||replacement.size===0))throw new Error('Choose a supported replacement image, up to 20 MiB.');
        const current=await inventory(proof.file);if(await checksum(current)!==proof.hash)throw new Error('The image changed after review. Rescan and review it again.');
        reviews.delete(ticket);const headers={...getRequestHeaders()};let body,url;
        if(replacement){
            for(const key of Object.keys(headers))if(key.toLowerCase()==='content-type')delete headers[key];
            body=new FormData();body.append('name',current.folder);body.append('label',current.stem);body.append('spriteName',current.stem);body.append('avatar',replacement,current.stem+replacement.name.match(/\.[^.]+$/)[0].toLowerCase());url='/api/sprites/upload';
        }else{body=JSON.stringify({name:current.folder,label:current.stem,spriteName:current.stem});url='/api/sprites/delete';}
        let response;try{response=await fetch(url,{method:'POST',headers,body});}catch{throw new Error(replacement?'Replacement was not confirmed. The native upload may already have removed the original; check the folder and your backup.':'Deletion was not confirmed. Rescan the folder before retrying.');}
        let confirmed=response.ok;if(confirmed&&replacement){try{confirmed=(await response.json())?.ok===true;}catch{confirmed=false;}}
        if(!confirmed)throw new Error(replacement?'Replacement failed. The native upload may already have removed the original; check the folder and your backup.':'Deletion failed. Rescan the folder before retrying.');
        return replacement?'Image replaced.':'Image removed.';
    });
}
