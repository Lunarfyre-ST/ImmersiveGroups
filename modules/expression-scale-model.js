// SPDX-License-Identifier: AGPL-3.0-only
// Image adjustments are scoped to a character and the exact sprite file.
export function expressionImageKey(avatar,folder,src,origin){
    if(typeof avatar!=='string'||!avatar||typeof folder!=='string'||!folder||typeof src!=='string'||!src)return '';
    try{
        const url=new URL(src,origin),base=new URL(origin);
        if(url.origin!==base.origin||!url.pathname.startsWith('/characters/'))return '';
        const parts=url.pathname.slice('/characters/'.length).split('/').map(decodeURIComponent),filename=parts.pop();
        if(parts.join('/')!==folder||!filename||filename==='.'||filename==='..'||/[\\/\x00-\x1f]/.test(filename))return '';
        return JSON.stringify([avatar,folder,filename]);
    }catch{return '';}
}
export function expressionImagePercent(scales,key){
    if(!key||!scales||!Object.hasOwn(scales,key))return 100;
    const percent=Number(scales[key]);return Number.isFinite(percent)&&percent>=1&&percent<=400?percent:100;
}
export const expressionImageFactor=(scales,key)=>expressionImagePercent(scales,key)/100;
