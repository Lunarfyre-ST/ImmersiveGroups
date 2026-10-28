// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {backgroundPaintFrames} from '../modules/background-motion-model.js';

test('mobile background zoom preserves cover/contain and paints without box transforms',()=>{
    const frame={backgroundPosition:'100% 50%',scale:1.2,translate:'5% 0%'};
    const geometry={width:390,height:844,naturalWidth:900,naturalHeight:600};
    assert.deepEqual(backgroundPaintFrames([frame],geometry),[{backgroundPosition:'100% 50%',backgroundSize:'1519.2px 1012.8px'}]);
    assert.deepEqual(backgroundPaintFrames([frame],{...geometry,size:'contain'}),[{backgroundPosition:'100% 50%',backgroundSize:'468px 312px'}]);
    assert.deepEqual(frame,{backgroundPosition:'100% 50%',scale:1.2,translate:'5% 0%'});
});
test('mobile background fitting supports stretched, auto and fixed sizes with safe unloaded fallback',()=>{
    const frames=[{backgroundPosition:'50% 0%',scale:1.1},{backgroundPosition:'50% 100%',scale:1.1}],geometry={width:100,height:200,naturalWidth:400,naturalHeight:200};
    for(const [size,width,height] of [['100% 100%',100,200],['auto',400,200],['50px auto',50,25],['auto 50px',100,50]]){
        const result=backgroundPaintFrames(frames,{...geometry,size});
        assert.equal(result[0].backgroundSize,`${width*1.1}px ${height*1.1}px`);
        assert.equal(result[1].backgroundPosition,'50% 100%');
    }
    for(const geometry of [{},{width:100,height:200,naturalWidth:0,naturalHeight:0},{width:100,height:200,naturalWidth:400,naturalHeight:200,size:'calc(100% + 2px) auto'}]){
        assert.deepEqual(backgroundPaintFrames(frames,geometry),[{backgroundPosition:'50% 0%'},{backgroundPosition:'50% 100%'}]);
    }
});
