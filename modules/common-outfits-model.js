// SPDX-License-Identifier: AGPL-3.0-only
export function commonOutfitKey(value){
    const key=String(value||'').normalize('NFKC').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').slice(0,80);
    return /^(?:pyjamas?|pajamas?)$/.test(key)?'pyjama':key;
}
export function commonOutfitName(outfit){return commonOutfitKey(outfit.commonName||outfit.label||outfit.name||outfit.folder?.split('/').pop());}
export function commonOutfitMatch(outfits,name){
    const matches=outfits.filter(o=>commonOutfitName(o)===commonOutfitKey(name)),preferred=matches.filter(o=>o.commonPreferred===true);
    return preferred.length===1?preferred[0]:matches.length===1?matches[0]:null;
}
export function commonOutfitChoices(characters){
    if(!characters.length)return [];
    const maps=characters.map(c=>new Map([...new Set((c.outfits||[]).map(commonOutfitName).filter(Boolean))].map(key=>[key,commonOutfitMatch(c.outfits,key)])));
    return [...maps[0].keys()].filter(key=>maps.every(m=>m.get(key))).map(key=>({key,label:key.charAt(0).toUpperCase()+key.slice(1),targets:characters.map((c,i)=>({avatar:c.avatar,folder:maps[i].get(key).folder}))}));
}
export function commonOutfitTargets(characters,name,{respectLocks=false}={}){
    const key=commonOutfitKey(name),targets=[],skipped=[];
    for(const c of characters){
        const match=commonOutfitMatch(c.outfits||[],key);
        if((respectLocks&&c.outfitLocked)||!match){skipped.push(c.avatar);continue;}
        if(match.folder!==c.currentOutfit)targets.push({avatar:c.avatar,folder:match.folder});
    }
    return {targets,skipped};
}
export function expressionInventory(sprites,origin){
    const found=new Set(),result=[];
    for(const sprite of sprites||[])try{
        const url=new URL(sprite?.path,origin);if(url.origin!==new URL(origin).origin||!url.pathname.startsWith('/characters/')||!/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(url.pathname)||found.has(url.href))continue;
        const label=typeof sprite.label==='string'?sprite.label:decodeURIComponent(url.pathname.split('/').pop()).replace(/\.[^.]+$/,'');
        const emotion=label.replace(/[-_ ]\d+$/,'').toLowerCase()||'unknown';found.add(url.href);result.push({src:url.href,label,emotion});
    }catch{}
    return result.sort((a,b)=>Number(b.emotion==='neutral')-Number(a.emotion==='neutral')||a.emotion.localeCompare(b.emotion)||a.label.localeCompare(b.label,undefined,{numeric:true})||a.src.localeCompare(b.src));
}
