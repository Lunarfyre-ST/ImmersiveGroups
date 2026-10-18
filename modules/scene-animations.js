// SPDX-License-Identifier: AGPL-3.0-only
import { diagnostic, diagnosticOperation } from './diagnostics.js';
import { extension_settings, getContext } from '../../../../extensions.js';
import { extensionName, defaultSettings } from '../constants.js';
import { motionOptions } from './motion-model.js';

const running = new WeakMap(), active = new Set(), backgroundDiagnostics = new WeakMap();
// Called immediately after the native selection handler. Its synchronous style
// mutation already queued the observer, so this explicit association expires
// after that observer; later unrelated background changes cannot inherit it.
export function bindBackgroundDiagnostic(node, trace) {
    if (!node) return;
    backgroundDiagnostics.set(node, trace);
    queueMicrotask(() => { if (backgroundDiagnostics.get(node) === trace) backgroundDiagnostics.delete(node); });
}
const preferences = () => extension_settings[extensionName] || {};
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export function animationOptions(kind) {
    const s = preferences(), duration = key => Math.max(0, Math.min(3000, Number(s[key] ?? defaultSettings[key]) || 0));
    return { enabled: s.enableVN_UI && s[`${kind}FadeEnabled`] === true && !reducedMotion(),
        mode: s[`${kind}FadeMode`] === 'sequential' ? 'sequential' : 'cross',
        out: duration(s[`${kind}FadeLinked`] === false ? `${kind}FadeOut` : `${kind}FadeIn`), in: duration(`${kind}FadeIn`) };
}
function jobFor(node, kind, options) {
    cancelSceneFade(node, 'superseded');
    const trace = diagnosticOperation(kind === 'background' ? 'animation.background' : 'animation.swap', { kind:kind==='expression'?'other':kind, mode: options.mode, inMs: options.in, outMs: options.out });
    const job = { kind, reason: 'unknown', cancelled: false, completed: false, failed: false, animations: new Set(), cleanup: () => {} };
    job.cancel = (reason = job.reason) => { if (!job.cancelled) job.reason = reason; trace.finish({ outcome: job.failed ? 'failed' : job.completed ? 'completed' : 'cancelled', reason: job.failed ? 'error' : job.completed ? undefined : job.reason }); job.cancelled = true; for (const animation of job.animations) animation.cancel(); job.cleanup(); active.delete(job); if (running.get(node) === job) running.delete(node); };
    running.set(node, job); active.add(job); return job;
}
export function cancelSceneFade(node, reason = 'unknown') { running.get(node)?.cancel(reason); }
export function cancelExpressionFade(node){if(running.get(node)?.kind==='expression')cancelSceneFade(node,'superseded');}
async function opacity(node, from, to, duration, job) {
    if (!duration || job.cancelled) return;
    const animation = node.animate([{ opacity: from }, { opacity: to }], { duration, easing: 'ease-in-out', fill: 'forwards' });
    job.animations.add(animation);
    await animation.finished.catch(() => {});
}
// Preloading and stale-request checks belong to the caller. Only the selected
// image fades; no wrappers, positioning, expression state or chat data change.
export async function fadeSceneSwap(node, kind, commit, valid = () => true) {
    const options = animationOptions(kind);
    if (!options.enabled || !node.animate || (!options.out && !options.in)) { diagnostic('animation.swap', {kind, outcome:'skipped', reason:'disabled'}); if (!valid()) return false; commit(); return true; }
    const job = jobFor(node, kind, options), base = getComputedStyle(node).opacity;
    try {
        if (options.mode === 'cross' && node instanceof HTMLImageElement) {
            if (!node.isConnected || !valid()) { job.reason = 'stale'; return false; }
            const overlay = outfitOverlay(node);
            job.cleanup = () => overlay.remove();
            commit();
            const incoming = opacity(node, 0, base, options.in, job);
            if (!options.out) overlay.remove();
            await Promise.all([incoming, opacity(overlay, base, 0, options.out, job)]);
            job.completed = !job.cancelled;
            return true;
        }
        await opacity(node, base, 0, options.out, job);
        if (job.cancelled || !node.isConnected || !valid()) { if (!job.cancelled) job.reason = 'stale'; return false; }
        commit();
        for (const animation of job.animations) animation.cancel(); job.animations.clear();
        await opacity(node, 0, base, options.in, job);
        job.completed = !job.cancelled;
        return true;
    } catch (error) { job.failed = true; throw error; } finally { job.cancel(); }
}
function outfitOverlay(node,source=node.currentSrc || node.src) {
    const style = getComputedStyle(node), overlay = document.createElement('div');
    // A visual-only layer keeps native expression/image queries on the real
    // sprite. It shares the sprite's positioned ancestor and parent dimming.
    overlay.className = 'ig-outfit-transition'; overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, { position: 'absolute', left: `${node.offsetLeft}px`, top: `${node.offsetTop}px`,
        width: `${node.offsetWidth}px`, height: `${node.offsetHeight}px`, boxSizing: 'border-box', margin: '0',
        border: style.border, padding: style.padding, borderRadius: style.borderRadius,
        backgroundImage: `url(${JSON.stringify(source)})`, backgroundRepeat: 'no-repeat',
        backgroundSize: ['cover', 'contain'].includes(style.objectFit) ? style.objectFit : '100% 100%',
        backgroundPosition: style.objectPosition, backgroundOrigin: 'content-box', backgroundClip: 'content-box',
        transform: style.transform, transformOrigin: style.transformOrigin, translate:style.translate, scale:style.scale, rotate:style.rotate, filter: style.filter,
        opacity: style.opacity, zIndex: style.zIndex, pointerEvents: 'none' });
    node.after(overlay); return overlay;
}
export async function fadeExpressionChange(node,previousSource,valid=()=>true){
    const settings=motionOptions(preferences(),'expression');
    // An outfit swap owns its opacity channel. Native expression changes do
    // not cancel that swap or rewrite native expression metadata.
    if(running.has(node)||!preferences().enableVN_UI||!settings.enabled||reducedMotion()||!settings.duration||!settings.strength||!node.animate||!node.isConnected||!valid())return false;
    const options={mode:'cross',in:settings.duration,out:settings.duration},job=jobFor(node,'expression',options),base=Number(getComputedStyle(node).opacity),overlay=outfitOverlay(node,previousSource);
    overlay.className='ig-expression-transition';job.cleanup=()=>overlay.remove();
    try{await Promise.all([opacity(overlay,base*settings.strength/100,0,settings.duration,job),opacity(node,base*(1-settings.strength/100),base,settings.duration,job)]);job.completed=!job.cancelled&&node.isConnected&&valid();return job.completed;}
    catch(error){job.failed=true;throw error;}
    finally{job.cancel();}
}
function backgroundImageReady(css, job) {
    // A native single-image background uses a canonical quoted CSS URL.
    const match = /^url\("(.*)"\)$/.exec(css);
    if (!match) return Promise.resolve();
    return new Promise(resolve => {
        const image = new Image(), timer = setTimeout(done, 15000);
        function done() { clearTimeout(timer); image.onload = image.onerror = null; resolve(); }
        const cleanup = job.cleanup;
        job.cleanup = () => { cleanup(); done(); };
        image.onload = image.onerror = done; image.src = match[1].replace(/\\(["\\])/g, '$1');
    });
}
function backgroundOverlay(node, image) {
    const style = getComputedStyle(node), rect = node.getBoundingClientRect(), overlay = document.createElement('div');
    overlay.className = 'ig-background-transition'; overlay.setAttribute('aria-hidden', 'true');
    for (const property of ['background-size','background-position','background-repeat','background-color','background-blend-mode','filter','border-radius','z-index','mix-blend-mode']) overlay.style.setProperty(property, style.getPropertyValue(property));
    Object.assign(overlay.style, { position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, backgroundImage: image, opacity: style.opacity, pointerEvents: 'none' });
    node.after(overlay); return overlay;
}
let installed = false;
export function setupSceneAnimations() {
    if (installed) return; installed = true;
    const cancelAll = reason => () => { for (const job of [...active]) job.cancel(reason); };
    window.addEventListener('ig-layout-change', cancelAll('layout_changed'));
    window.addEventListener('resize', cancelAll('viewport_changed'));
    document.getElementById('prome-enable-vn')?.addEventListener('change', cancelAll('disabled_scene'));
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', cancelAll('motion_changed'));
    const context = getContext();
    if (context.eventTypes?.CHAT_CHANGED) context.eventSource?.on(context.eventTypes.CHAT_CHANGED, cancelAll('chat_changed'));
    function attach(node) {
        let previous = node.style.backgroundImage;
        new MutationObserver(() => {
            const current = node.style.backgroundImage;
            if (current === previous) return;
            const old = previous; previous = current;
            cancelSceneFade(node, 'superseded');
            const parentTrace = backgroundDiagnostics.get(node); backgroundDiagnostics.delete(node);
            const options = animationOptions('background');
            if (!old || old === 'none' || !current || current === 'none' || !options.enabled || !node.animate || (!options.out && !options.in)) return;
            // Keep the old scene visible until the new image is ready. Never
            // rewrite native background styles, metadata, locks or selection.
            const job = parentTrace ? parentTrace.run(() => jobFor(node, 'background', options)) : jobFor(node, 'background', options), base = getComputedStyle(node).opacity, overlay = backgroundOverlay(node, old);
            job.cleanup = () => overlay.remove();
            const hidden = node.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: 'both' }); job.animations.add(hidden);
            void (async () => {
                try {
                    await backgroundImageReady(current, job);
                    if (job.cancelled || !node.isConnected) { if (!job.cancelled) job.reason = 'unavailable'; return; }
                    if (options.mode === 'sequential') {
                        await opacity(overlay, base, 0, options.out, job);
                        if (job.cancelled || !node.isConnected) { if (!job.cancelled) job.reason = 'unavailable'; return; }
                        overlay.remove();
                        const incoming = opacity(node, 0, base, options.in, job);
                        hidden.cancel(); job.animations.delete(hidden);
                        await incoming;
                        job.completed = !job.cancelled;
                        return;
                    }
                    const incoming = opacity(node, 0, base, options.in, job);
                    hidden.cancel(); job.animations.delete(hidden);
                    if (!options.out) overlay.remove();
                    await Promise.all([incoming, opacity(overlay, base, 0, options.out, job)]);
                    job.completed = !job.cancelled;
                } catch (error) { job.failed = true; throw error; } finally { job.cancel(); }
            })().catch(error => console.warn('[ImmersiveGroups] Background animation:', error));
        }).observe(node, { attributes: true, attributeFilter: ['style'] });
    }
    const node = document.getElementById('bg1');
    if (node) attach(node);
    else { const observer = new MutationObserver(() => { const background = document.getElementById('bg1'); if (background) { observer.disconnect(); attach(background); } }); observer.observe(document.body, { childList: true }); }
}
