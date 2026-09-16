import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocationController,mapLinks,normalizePosition} from '../dist/location.js';
const sample={coords:{latitude:37,longitude:127,accuracy:25},timestamp:1000};
test('permission denied and unavailable browsers allow fallback',()=>{
 let state;const c=createLocationController({geolocation:{getCurrentPosition(ok,fail){fail({code:1});}},onChange:s=>state=s});c.locate();assert.equal(state.status,'error');assert.match(state.message,/권한/);
 createLocationController({onChange:s=>state=s}).locate();assert.match(state.message,/지원하지/);
});
test('clearing location ignores a late successful permission response',()=>{
 let ok,state;const c=createLocationController({geolocation:{getCurrentPosition(fn){ok=fn;}},onChange:s=>state=s,now:()=>1000});c.locate();c.clear();ok(sample);assert.equal(state.status,'idle');assert.equal(state.position,null);
});
test('fresh position generates encoded map links; stale position cannot be shared',()=>{
 let state;const c=createLocationController({geolocation:{getCurrentPosition(ok){ok(sample);}},onChange:s=>state=s,now:()=>1000});c.locate();assert.equal(state.status,'success');const url=new URL(mapLinks(state.position,1000).walk);assert.equal(url.searchParams.get('origin'),'37,127');assert.equal(url.searchParams.get('travelmode'),'walking');assert.equal(mapLinks(state.position,302000),null);
 assert.throws(()=>normalizePosition({...sample,coords:{latitude:100,longitude:127,accuracy:2}}));
});
