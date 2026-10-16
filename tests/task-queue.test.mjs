import test from 'node:test';
import assert from 'node:assert/strict';
import {taskQueue} from '../modules/task-queue.js';
test('asset lookup queue bounds requests and continues after failures',async()=>{
 const queue=taskQueue(3);let running=0,peak=0,finished=0;
 const results=await Promise.allSettled(Array.from({length:15},(_,i)=>queue(async()=>{running++;peak=Math.max(peak,running);await new Promise(resolve=>setTimeout(resolve,1));running--;finished++;if(i===2)throw Error('unavailable');return i;})));
 assert.equal(peak,3);assert.equal(finished,15);assert.equal(results[2].status,'rejected');assert.equal(results[14].value,14);
});
