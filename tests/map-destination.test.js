import test from 'node:test';
import assert from 'node:assert/strict';
import {destinationFor} from '../dist/map-places.js';
import {parseSettings} from '../dist/engine.js';
test('each supported destination resolves and unknown names do not become Aileen',()=>{
 for(const area of ['aileen','lake','central','yeongcheon'])assert.equal(destinationFor({area}).coordinates.length,2);
 assert.equal(destinationFor({area:'other',home:'다른 집'}),null);
});
test('saved personal point overrides regional representative and survives preferences parsing',()=>{
 const settings=parseSettings({home:'내 집',area:'other',walk:10,access:0,mapPoint:[127.08,37.19]});
 const destination=destinationFor(settings);assert.deepEqual(destination.coordinates,[127.08,37.19]);assert.equal(destination.name,'내 집');assert.equal(destination.custom,true);
});
test('invalid stored point cannot displace verified destination',()=>{
 for(const mapPoint of [[0,91],['127',37],[NaN,37],null])assert.equal(destinationFor({area:'aileen',mapPoint}).name,'동탄역 에일린의뜰');
});
