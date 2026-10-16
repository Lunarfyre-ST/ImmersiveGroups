// SPDX-License-Identifier: AGPL-3.0-only
// Bound concurrent asset lookups while preserving a promise for every caller.
export function taskQueue(limit=3){
    if(!Number.isInteger(limit)||limit<1)throw new Error('Invalid concurrency limit.');
    const pending=[];let running=0;
    function drain(){
        while(running<limit&&pending.length){
            const {task,resolve,reject}=pending.shift();running++;
            Promise.resolve().then(task).then(resolve,reject).finally(()=>{running--;drain();});
        }
    }
    return task=>new Promise((resolve,reject)=>{pending.push({task,resolve,reject});drain();});
}
