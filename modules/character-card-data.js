// SPDX-License-Identifier: AGPL-3.0-only
export function validateCardJson(value){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid JSON character card.');
    const name=value.data?.name||value.name;if(typeof name!=='string'||!name.trim()||name.length>200)throw Error('JSON character card has no valid name.');
    if(value.spec!==undefined&&!['chara_card_v2','chara_card_v3'].includes(value.spec))throw Error('Unsupported character card format.');return value;
}
export function safeCardJson(value){const data=structuredClone(validateCardJson(value));if(data?.data?.extensions?.risuai){delete data.data.extensions.risuai.additionalAssets;delete data.data.extensions.risuai.emotions;}return data;}
