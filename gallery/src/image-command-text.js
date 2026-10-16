// SPDX-License-Identifier: AGPL-3.0-only
import { parseFragment } from 'parse5';

const blocked = new Set(['pre', 'a', 'script', 'style', 'textarea', 'button', 'template', 'iframe', 'noscript', 'title', 'xmp', 'plaintext', 'listing']);
const literalCommand = /^::img[ \t]+[^\r\n\0]+::$/i;
const barrier = text => '\0'.repeat(text.length);
function nodeText(root) {
    const parts = [], stack = [root];
    while (stack.length) {
        const node = stack.pop();
        if (node.nodeName === '#text') parts.push(node.value);
        const children = node.childNodes || [];
        for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]);
    }
    return parts.join('');
}
function matches(text, offset, original) {
    return [...text.matchAll(/::img[ \t]+([^\r\n\0]*?)::/gi)].map(match => {
        match.index += offset; match.input = original; return match;
    });
}
// Recognize commands in visible text; this is not an HTML sanitizer. Parsing
// creates a data tree only: no DOM, scripts, resource loads or HTML serialization.
export function commandsInText(text) {
    if (typeof text !== 'string' || !/::img[ \t]/i.test(text)) return [];
    // Barriers preserve offsets and stop a removed example from joining two
    // fragments into a new command. Never delete and reparse markup.
    const masked = text.replace(/```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)/g, barrier)
        .replace(/`([^`\n]*)`/g, (all, inside) => literalCommand.test(inside.trim()) ? all : barrier(all));
    if (!masked.includes('<')) return matches(masked, 0, text);
    const root = parseFragment(masked, { sourceCodeLocationInfo: true }), result = [], stack = [root];
    while (stack.length) {
        const node = stack.pop();
        if (blocked.has(node.tagName) || (node.tagName === 'code' && !literalCommand.test(nodeText(node).trim()))) continue;
        if (node.nodeName === '#text' && node.sourceCodeLocation) {
            const { startOffset, endOffset } = node.sourceCodeLocation;
            // Use original source slices, so entity decoding cannot create a
            // command that the model never actually wrote.
            for (const match of matches(masked.slice(startOffset, endOffset), startOffset, text)) result.push(match);
        }
        const children = node.childNodes || [];
        for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]);
    }
    return result.sort((a, b) => a.index - b.index);
}
