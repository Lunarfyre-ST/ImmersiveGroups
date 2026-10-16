// SPDX-License-Identifier: AGPL-3.0-only
// Hide command text without serializing or replacing the surrounding formatted HTML.
export function renderSceneCommandText(root,hide){
    if(!root)return;
    if(!hide){for(const span of root.querySelectorAll('.ig-scene-command'))span.replaceWith(document.createTextNode(span.textContent));return;}
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){return node.parentElement?.closest('.ig-scene-command,pre,code,a,script,style,textarea,button,[contenteditable="true"]')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
    const nodes=[];let text='',node;
    while((node=walker.nextNode())){nodes.push({node,start:text.length,end:text.length+node.data.length});text+=node.data;}
    const matches=[...text.matchAll(/::(?:outfit|background)\b[^\r\n]{0,2000}?::/g)];if(!matches.length)return;
    for(const item of nodes){
        const segments=matches.map(m=>({start:Math.max(item.start,m.index)-item.start,end:Math.min(item.end,m.index+m[0].length)-item.start})).filter(m=>m.end>m.start);
        if(!segments.length)continue;
        const fragment=document.createDocumentFragment(),original=item.node.data;let at=0;
        for(const range of segments){if(range.start>at)fragment.append(document.createTextNode(original.slice(at,range.start)));const span=document.createElement('span');span.className='ig-scene-command';span.hidden=true;span.setAttribute('aria-hidden','true');span.textContent=original.slice(range.start,range.end);fragment.append(span);at=range.end;}
        if(at<original.length)fragment.append(document.createTextNode(original.slice(at)));item.node.replaceWith(fragment);
    }
}
