// SPDX-License-Identifier: AGPL-3.0-only
import { customEndpoint } from './scene-automation-model.js';
export function extractPlannerText(data){
    if(data?.error)throw new Error(`Automation API: ${String(data.error.message||data.error).slice(0,300)}`);
    const finish=data?.choices?.[0]?.finish_reason??data?.finish_reason;
    if(finish==='length'||finish==='max_tokens')throw new Error('Automation output reached its token limit. Increase Maximum output tokens; no changes were applied.');
    if(finish==='content_filter')throw new Error('Automation response was filtered; no changes were applied.');
    const text=typeof data==='string'?data:data?.content??data?.text??data?.choices?.[0]?.message?.content;
    if(typeof text!=='string')throw new Error('The automation API did not return text.');
    if(text.length>16000)throw new Error('The automation response is too long.');return text;
}
export async function callScenePlanner(ctx,settings,messages,{signal,apiKey=''}={}){
    const tokens=Number(settings.apiMaxTokens);
    if(!Number.isInteger(tokens)||tokens<32||tokens>2048)throw new Error('Maximum output tokens must be an integer from 32 to 2048.');
    if(!Array.isArray(messages)||!messages.length||messages.some(m=>typeof m.content!=='string'))throw new Error('Automation messages must contain text.');
    if(signal?.aborted)throw new Error('Automation request cancelled.');
    if(settings.apiTransport==='main'){
        if(typeof ctx.generateRaw!=='function')throw new Error('This SillyTavern version does not expose generateRaw.');
        return extractPlannerText(await ctx.generateRaw({prompt:messages,responseLength:tokens,trimNames:false}));
    }
    if(settings.apiTransport==='profile'){
        if(!settings.apiProfile)throw new Error('Choose a connection profile.');
        if(typeof ctx.ConnectionManagerRequestService?.sendRequest!=='function')throw new Error('Connection-profile requests are unavailable in this SillyTavern version.');
        return extractPlannerText(await ctx.ConnectionManagerRequestService.sendRequest(settings.apiProfile,messages,tokens,{stream:false,signal,extractData:true,includePreset:true,includeInstruct:true}));
    }
    const endpoint=customEndpoint(settings.apiUrl);if(!settings.apiModel.trim())throw new Error('Enter the model name for the custom API.');
    const headers={'Content-Type':'application/json'};if(apiKey)headers.Authorization=`Bearer ${apiKey}`;
    const response=await fetch(endpoint,{method:'POST',headers,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal,body:JSON.stringify({model:settings.apiModel,messages,stream:false,max_tokens:tokens,temperature:0})});
    if(!response.ok){let detail='';try{const data=await response.json();detail=String(data?.error?.message||data?.message||'').slice(0,300);}catch{}throw new Error(`Automation API returned HTTP ${response.status}.${detail?' '+detail:''}`);}
    return extractPlannerText(await response.json());
}
