import test from 'node:test';
import assert from 'node:assert/strict';
import {directionsLink} from '../dist/route-links.js';
import {routeForDestination} from '../dist/transit-map.js';
import {places,destinations} from '../dist/map-places.js';
test('Kakao links carry selected coordinates in latitude longitude order and encode names',()=>{
 assert.equal(directionsLink('walk',{name:'a/b, #',coordinates:[127,37]},{name:'집',coordinates:[128,38]}),'https://map.kakao.com/link/by/walk/a%2Fb%2C%20%23,37,127/%EC%A7%91,38,128');
});
test('boarding links follow east or west selection; unknown alighting location has no invented route',()=>{
 const west=routeForDestination({area:'aileen'},'H2'),east=routeForDestination({area:'aileen'},'H17'),unknown=routeForDestination({area:'aileen'},'19-3');
 assert.notEqual(directionsLink('walk',places[0],west[0]),directionsLink('walk',places[0],east[0]));
 assert.equal(directionsLink('walk',unknown.at(-1),destinations.aileen),null);
 assert.equal(directionsLink('traffic',places[0],null),null);
});
