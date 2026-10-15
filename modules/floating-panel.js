// SPDX-License-Identifier: AGPL-3.0-only
// Small non-modal panels stay outside transformed chat containers.
let nextId = 0;
export function floatingPanel(anchor, panel, { onClose = () => {} } = {}) {
    panel.id ||= `ig-floating-${++nextId}`;
    panel.classList.add('ig-floating-panel');panel.hidden = true;
    anchor.setAttribute('aria-controls', panel.id);anchor.setAttribute('aria-expanded', 'false');
    document.body.append(panel);
    function position() {
        if (panel.hidden) return;
        if (!anchor.isConnected || !anchor.getClientRects().length) { close(); return; }
        const viewport=window.visualViewport, left=viewport?.offsetLeft||0, top=viewport?.offsetTop||0;
        const width=viewport?.width||innerWidth, height=viewport?.height||innerHeight;
        panel.style.maxWidth=`${Math.max(0,width-16)}px`;
        panel.style.maxHeight=`${Math.max(0,height-24)}px`;
        const rect=anchor.getBoundingClientRect(), box=panel.getBoundingClientRect();
        const above=rect.top-top-8, below=top+height-rect.bottom-8;
        const useAbove=box.height>below&&above>below;
        panel.style.maxHeight=`${Math.max(40,Math.min(height-24,useAbove?above:below))}px`;
        const size=panel.getBoundingClientRect();
        panel.style.left=`${Math.max(left+8,Math.min(rect.right-size.width,left+width-size.width-8))}px`;
        panel.style.top=`${Math.max(top+8,Math.min(useAbove?rect.top-size.height-6:rect.bottom+6,top+height-size.height-8))}px`;
    }
    function close(focus=false) {
        if(panel.hidden)return;
        panel.hidden=true;anchor.setAttribute('aria-expanded','false');onClose();
        if(focus&&anchor.isConnected)anchor.focus({preventScroll:true});
    }
    function open() {
        document.dispatchEvent(new CustomEvent('ig-floating-open',{detail:panel.id}));
        panel.hidden=false;anchor.setAttribute('aria-expanded','true');position();
    }
    const outside=event=>{if(!panel.contains(event.target)&&!anchor.contains(event.target))close();};
    const other=event=>{if(event.detail!==panel.id)close();};
    const closeAll=()=>close();
    const escape=event=>{if(!panel.hidden&&event.key==='Escape'){event.preventDefault();close(true);}};
    const scroll=event=>{if(!panel.contains(event.target))position();};
    document.addEventListener('pointerdown',outside,true);document.addEventListener('ig-floating-open',other);
    document.addEventListener('keydown',escape);document.addEventListener('scroll',scroll,true);
    window.addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);
    window.addEventListener('ig-layout-change',position);
    window.addEventListener('ig-close-scene-panels',closeAll);
    return {panel,open,close,position,get isOpen(){return !panel.hidden;},toggle(){panel.hidden?open():close();},destroy(){close();panel.remove();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('ig-floating-open',other);document.removeEventListener('keydown',escape);document.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',position);window.visualViewport?.removeEventListener('resize',position);window.removeEventListener('ig-layout-change',position);window.removeEventListener('ig-close-scene-panels',closeAll);}};
}
