// SPDX-License-Identifier: AGPL-3.0-only
// Mobile motion changes paint properties, leaving the native element's box,
// parent and stacking context alone. Unknown fitting modes retain crop panning.
export function backgroundPaintFrames(frames,{width,height,naturalWidth,naturalHeight,size='cover'}={}){
    let fitted;
    if(width>0&&height>0&&naturalWidth>0&&naturalHeight>0){
        if(size==='cover'||size==='contain'){
            const ratio=(size==='cover'?Math.max:Math.min)(width/naturalWidth,height/naturalHeight);
            fitted=[naturalWidth*ratio,naturalHeight*ratio];
        }else{
            const parts=size.trim().split(/\s+/),length=(value,total)=>value==='auto'?null:/^\d+(?:\.\d+)?(?:px|%)$/.test(value)?parseFloat(value)*(value.endsWith('%')?total/100:1):NaN;
            let x=length(parts[0],width),y=length(parts[1]||'auto',height);
            if(x===null&&y===null){x=naturalWidth;y=naturalHeight;}
            else if(x===null)x=y*naturalWidth/naturalHeight;
            else if(y===null)y=x*naturalHeight/naturalWidth;
            if(x>0&&y>0&&Number.isFinite(x)&&Number.isFinite(y))fitted=[x,y];
        }
    }
    return frames.map(frame=>({backgroundPosition:frame.backgroundPosition,...(fitted?{backgroundSize:`${fitted[0]*(frame.scale||1)}px ${fitted[1]*(frame.scale||1)}px`}:{})}));
}
