// SPDX-License-Identifier: AGPL-3.0-only
export const spriteImageName=name=>/\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(name)&&!String(name).startsWith('.')&&!/[\r\n\0]/.test(name);
export function uniqueSpriteName(filename,used){
    const leaf=String(filename).split(/[\\/]/).pop(),match=leaf.match(/^(.*)(\.[^.]+)$/);
    if(!match||!spriteImageName(leaf))throw new Error('Unsupported sprite image.');
    let stem=match[1].replace(/[^\p{L}\p{N}_ .-]/gu,'_').replace(/^\.+/,'').slice(0,100)||'sprite';
    const root=stem.replace(/-\d+$/,''),ext=match[2].toLowerCase();let number=BigInt(stem.match(/-(\d+)$/)?.[1]||0);
    while(used.has(stem.toLowerCase()))stem=`${root}-${++number}`;
    used.add(stem.toLowerCase());return {stem,filename:stem+ext,label:stem.match(/^(.+?)(?:[-.].*)?$/)?.[1]||stem};
}
export function spriteFolder(value){
    if(typeof value!=='string')throw new Error('Choose a sprite folder.');
    const folder=value.trim().replace(/\\/g,'/'),parts=folder.split('/');
    if(folder.length>200||parts.length>2||parts.some(p=>!p||p==='.'||p==='..'||p.trim()!==p||p.endsWith('.')||/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\..*)?$/i.test(p)||/[\x00-\x1f\x7f<>:"|?*]/.test(p)))throw new Error('Use a character folder or Character/outfit folder, without absolute paths or special path characters.');
    return folder;
}
// Stop decompression at the actual byte limit, even if ZIP metadata is false.
export function readZipImage(file,maxBytes=20*1024*1024){
    return new Promise((resolve,reject)=>{
        let chunks=[],size=0,done=false;
        const stream=file.internalStream('uint8array');
        const fail=error=>{if(done)return;done=true;chunks=[];stream.pause();reject(error);};
        stream.on('data',chunk=>{if(done)return;size+=chunk.byteLength;if(size>maxBytes){fail(new Error('Decompressed sprite exceeds the image size limit.'));return;}chunks.push(chunk);});
        stream.on('error',fail);stream.on('end',()=>{if(done)return;done=true;resolve(new Blob(chunks));chunks=[];});stream.resume();
    });
}
export function scanFolderCandidates(characters,files){
    const found=new Map();
    for(const file of files){
        const path=String(file.webkitRelativePath||'').replace(/\\/g,'/');if(!spriteImageName(path.split('/').pop()))continue;
        const parts=path.split('/');parts.pop();if(parts.some(p=>p==='.'||p==='..'))continue;
        for(const character of characters){
            const roots=[character.name,character.avatar?.replace(/\.[^/.]+$/,'')].filter(Boolean);
            const index=parts.findIndex(p=>roots.some(root=>root.toLowerCase()===p.toLowerCase()));
            if(index<0||parts.length-index>2)continue;
            const folder=parts.slice(index).join('/');found.set(JSON.stringify([character.avatar,folder]),{character,folder});
        }
    }
    return [...found.values()];
}
