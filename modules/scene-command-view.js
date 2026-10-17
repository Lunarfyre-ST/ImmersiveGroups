// SPDX-License-Identifier: AGPL-3.0-only
// Reversible DOM-only command hiding: keep native formatting and stored messages.
const excluded='.ig-scene-command,pre,code,a,script,style,textarea,button,[contenteditable="true"]';
const media='img,video,audio,canvas,svg,iframe,object,embed,hr,table,input,button,textarea,select,pre,code';
function wrapRanges(node,ranges,className){
    const fragment=document.createDocumentFragment(),original=node.data;let at=0;
    for(const {start,end} of ranges.sort((a,b)=>a.start-b.start)){if(start>at)fragment.append(document.createTextNode(original.slice(at,start)));if(end<=at)continue;const span=document.createElement('span');span.className=className;span.hidden=true;span.setAttribute('aria-hidden','true');span.textContent=original.slice(Math.max(at,start),end);fragment.append(span);at=end;}
    if(at<original.length)fragment.append(document.createTextNode(original.slice(at)));node.replaceWith(fragment);
}
function clearGaps(root){
    for(const n of root.querySelectorAll('.ig-scene-command-empty,.ig-scene-command-break'))n.classList.remove('ig-scene-command-empty','ig-scene-command-break');
    for(const n of root.querySelectorAll('.ig-scene-command-gap'))n.replaceWith(document.createTextNode(n.textContent));
}
function collapseCommandLines(root){
    const blocks=new Set();for(const span of root.querySelectorAll('.ig-scene-command')){let p=span.parentElement;while(p&&p!==root){if(p.matches('p,div,li,blockquote'))blocks.add(p);p=p.parentElement;}}
    // A block containing only command text, whitespace and breaks has no visual content.
    for(const block of blocks){if(block.querySelector(media))continue;const clone=block.cloneNode(true);for(const span of clone.querySelectorAll('.ig-scene-command'))span.remove();if(!clone.textContent.trim())block.classList.add('ig-scene-command-empty');}
    const groups=new Map(),walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let n;
    while((n=walker.nextNode())){
        const element=n.nodeType===Node.TEXT_NODE?n.parentElement:n;
        if(element.closest('.ig-scene-command-empty'))continue;
        const protectedNode=element.closest('pre,code,a,script,style,textarea,button,[contenteditable="true"]');if(protectedNode&&(n.nodeType===Node.TEXT_NODE||protectedNode!==n))continue;
        const block=element.closest('p,div,li,blockquote');const key=block&&root.contains(block)?block:root;
        if(!groups.has(key))groups.set(key,[]);const tokens=groups.get(key);
        if(protectedNode){tokens.push({text:'\ufffc'});continue;}
        if(n.nodeType===Node.TEXT_NODE){if(element.closest('.ig-scene-command')){tokens.push({command:true,text:n.data});continue;}let at=0;for(const m of n.data.matchAll(/\r?\n/g)){if(m.index>at)tokens.push({text:n.data.slice(at,m.index)});tokens.push({separator:true,node:n,start:m.index,end:m.index+m[0].length});at=m.index+m[0].length;}if(at<n.data.length)tokens.push({text:n.data.slice(at)});
        }else if(n.tagName==='BR')tokens.push({separator:true,br:n});
        else if(n.matches(media)||n.matches('a,pre,code'))tokens.push({text:'\ufffc'});
    }
    const ranges=new Map();
    for(const tokens of groups.values()){
        const lines=[{tokens:[]}],separators=[];for(const t of tokens){if(t.separator){separators.push(t);lines.push({tokens:[]});}else lines.at(-1).tokens.push(t);}
        const commandOnly=line=>line.tokens.some(t=>t.command)&&!line.tokens.some(t=>!t.command&&t.text.trim());
        const hide=separator=>{if(!separator)return;if(separator.br)separator.br.classList.add('ig-scene-command-break');else{if(!ranges.has(separator.node))ranges.set(separator.node,[]);ranges.get(separator.node).push({start:separator.start,end:separator.end});}};
        const blank=line=>line.tokens.every(t=>!t.command&&!t.text.trim());
        for(let i=0;i<lines.length;){
            if(!commandOnly(lines[i])){i++;continue;}let start=i,end=i,lastCommand=i;
            while(start>0&&blank(lines[start-1]))start--;
            while(end+1<lines.length&&(commandOnly(lines[end+1])||blank(lines[end+1]))){end++;if(commandOnly(lines[end]))lastCommand=end;}
            const before=i-start,after=end-lastCommand,keep=start>0&&end<lines.length-1?Math.max(before,after)+1:0;
            const first=Math.max(0,start-1),last=Math.min(end,separators.length-1);for(let j=first+keep;j<=last;j++)hide(separators[j]);i=end+1;
        }
    }
    for(const [node,parts] of ranges)wrapRanges(node,parts,'ig-scene-command-gap');
}
export function renderSceneCommandText(root,hide){
    if(!root)return;clearGaps(root);
    if(!hide){for(const span of root.querySelectorAll('.ig-scene-command'))span.replaceWith(document.createTextNode(span.textContent));return;}
    let barrier=false;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){if(node.parentElement?.closest(excluded)){barrier=true;return NodeFilter.FILTER_REJECT;}return NodeFilter.FILTER_ACCEPT;}});
    const nodes=[];let text='',node,previousBlock;
    while((node=walker.nextNode())){const block=node.parentElement?.closest('p,div,li,blockquote');if(barrier||(previousBlock&&block!==previousBlock))text+='\n';barrier=false;previousBlock=block;nodes.push({node,start:text.length,end:text.length+node.data.length});text+=node.data;}
    const matches=[...text.matchAll(/::(?:outfit|background)\b[^\r\n]{0,2000}?::/g)];if(!matches.length&&!root.querySelector('.ig-scene-command'))return;
    for(const item of nodes){const segments=matches.map(m=>({start:Math.max(item.start,m.index)-item.start,end:Math.min(item.end,m.index+m[0].length)-item.start})).filter(m=>m.end>m.start);if(segments.length)wrapRanges(item.node,segments,'ig-scene-command');}
    collapseCommandLines(root);
}
