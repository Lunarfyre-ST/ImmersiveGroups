// SPDX-License-Identifier: AGPL-3.0-only
// JSZip exposes a map, so duplicate central-directory names would otherwise be
// collapsed before the bundle allowlist can inspect them. Audit before loading.
export function checkTransferZipIndex(buffer,maxEntries=10000) {
    const bytes=new Uint8Array(buffer),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===bytes.length){end=i;break;}
    if(end<0)throw Error('Incomplete ZIP: end-of-directory record is missing.');
    const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),start=view.getUint32(end+16,true);
    if(view.getUint16(end+4,true)||view.getUint16(end+6,true)||view.getUint16(end+8,true)!==count||count===0xffff||size===0xffffffff||start===0xffffffff)throw Error('Split and ZIP64 bundles are not supported.');
    if(count>maxEntries||start+size!==end)throw Error('Invalid ZIP directory or too many entries.');
    const names=new Set(),decoder=new TextDecoder('utf-8',{fatal:true});let at=start;
    for(let i=0;i<count;i++){
        if(at+46>end||view.getUint32(at,true)!==0x02014b50)throw Error('Invalid ZIP directory entry.');
        const flags=view.getUint16(at+8,true),method=view.getUint16(at+10,true),length=view.getUint16(at+28,true),extra=view.getUint16(at+30,true),comment=view.getUint16(at+32,true),local=view.getUint32(at+42,true),next=at+46+length+extra+comment;
        if(flags&1||![0,8].includes(method)||next>end||view.getUint16(at+34,true))throw Error('Unsupported ZIP entry.');
        let name;try{name=decoder.decode(bytes.subarray(at+46,at+46+length));}catch{throw Error('Bundle ZIP filenames must use UTF-8.');}
        if(names.has(name))throw Error('Duplicate ZIP entry name.');names.add(name);
        if(local+30>start||view.getUint32(local,true)!==0x04034b50)throw Error('Invalid ZIP local header.');
        const localLength=view.getUint16(local+26,true),localExtra=view.getUint16(local+28,true),dataStart=local+30+localLength+localExtra;
        if(dataStart+view.getUint32(at+20,true)>start||decoder.decode(bytes.subarray(local+30,local+30+localLength))!==name)throw Error('ZIP local entry does not match its directory.');
        at=next;
    }
    if(at!==end)throw Error('ZIP directory size mismatch.');return names;
}
