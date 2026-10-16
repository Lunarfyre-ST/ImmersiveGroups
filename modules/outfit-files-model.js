// SPDX-License-Identifier: AGPL-3.0-only
export const spriteImageName=name=>/\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(name)&&!String(name).startsWith('.')&&!/[\r\n\0]/.test(name);
export function uniqueSpriteName(filename,used){
    const leaf=String(filename).split(/[\\/]/).pop(),match=leaf.match(/^(.*)(\.[^.]+)$/);
    if(!match||!spriteImageName(leaf))throw new Error('Unsupported sprite image.');
    let stem=match[1].replace(/[^\p{L}\p{N}_ .-]/gu,'_').replace(/^\.+/,'').slice(0,100)||'sprite';
    const root=stem.replace(/-\d+$/,''),ext=match[2].toLowerCase();let number=Number(stem.match(/-(\d+)$/)?.[1]||0);
    while(used.has(stem.toLowerCase()))stem=`${root}-${++number}`;
    used.add(stem.toLowerCase());return {stem,filename:stem+ext,label:stem.match(/^(.+?)(?:[-.].*)?$/)?.[1]||stem};
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
