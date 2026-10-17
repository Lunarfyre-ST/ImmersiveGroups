// SPDX-License-Identifier: AGPL-3.0-only
const versionPattern=/^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){0,3}(?:-[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*)?$/;
export function validatePackMetadata(value){
    if(value===undefined)return undefined;
    if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.id!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(value.id)||typeof value.version!=='string'||value.version.length>80||!versionPattern.test(value.version))throw Error('Enter a pack version such as 1.0.0 or 1.2-beta.1 and a valid pack identity.');
    return {id:value.id,version:value.version};
}
export function comparePackVersions(incoming,existing){
    validatePackMetadata({id:'comparison',version:incoming});validatePackMetadata({id:'comparison',version:existing});
    const split=value=>{const index=value.indexOf('-');return index<0?[value,'']:[value.slice(0,index),value.slice(index+1)];};
    const [a,preA]=split(incoming),[b,preB]=split(existing),numbersA=a.split('.').map(BigInt),numbersB=b.split('.').map(BigInt);
    for(let index=0;index<4;index++){const left=numbersA[index]||0n,right=numbersB[index]||0n;if(left!==right)return left>right?1:-1;}
    if(preA===preB)return 0;if(!preA)return 1;if(!preB)return -1;
    const partsA=preA.split('.'),partsB=preB.split('.');
    for(let index=0;index<Math.max(partsA.length,partsB.length);index++){
        const left=partsA[index],right=partsB[index];if(left===right)continue;if(left===undefined)return -1;if(right===undefined)return 1;
        const numericA=/^\d+$/.test(left),numericB=/^\d+$/.test(right);
        if(numericA&&numericB){if(BigInt(left)===BigInt(right))continue;return BigInt(left)>BigInt(right)?1:-1;}
        if(numericA!==numericB)return numericA?-1:1;return left>right?1:-1;
    }return 0;
}
export function packRevisionNotice(pack,origin){
    if(!pack)return {status:'unversioned',text:'No pack version in this older bundle. File checks still apply.'};
    if(!origin||origin.packId!==pack.id)return {status:'unknown',text:`Pack ${pack.version} · no matching previous pack import recorded.`};
    let comparison;try{comparison=comparePackVersions(pack.version,origin.version);}catch{return {status:'unknown',text:`Pack ${pack.version} · previous version unavailable.`};}
    return {status:comparison>0?'newer':comparison<0?'older':'same',text:`Pack ${pack.version} · ${comparison>0?'newer than':comparison<0?'older than':'same as'} last processed version ${origin.version}. Partial selections and kept files may differ from that revision.`};
}
