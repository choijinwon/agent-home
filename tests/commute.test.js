import test from 'node:test';import assert from 'node:assert/strict';
import {rankTrips,parseNeeds} from '../dist/commute-core.js';
import {normalizeArrivals} from '../server/transit.js';
const trips=[{id:'a',eta:7,ride:10,lastWalk:2,lowFloor:true,stepFreePath:null},{id:'b',eta:12,ride:10,lastWalk:2,lowFloor:true,stepFreePath:true}];
test('slow walking excludes too-soon arrivals and missed vehicle stays excluded',()=>{
 assert.equal(rankTrips(trips,{walkMinutes:4,pace:'slow',buffer:2})[0].id,'b');
 assert.equal(rankTrips(trips,{missed:['a']})[0].id,'b');
 assert.deepEqual(rankTrips(trips,{missed:['a','b']}),[]);
});
test('low-floor alone never counts as accessible journey',()=>assert.deepEqual(rankTrips(trips,{stepFree:true}).map(t=>t.id),['b']));
test('combined needs are interpreted together without claiming AI',()=>assert.deepEqual(parseNeeds('천천히 걷고 계단은 어려워요'),{pace:'slow',stepFree:true}));
test('missing eta is not converted to zero, zero is accepted and absence is unknown',()=>{
 const result=normalizeArrivals({response:{msgHeader:{resultCode:0},msgBody:{busArrivalList:{routeId:1,routeName:'H2',predictTime1:null,predictTime2:0}}}},123);
 assert.equal(result.arrivals.length,1);assert.equal(result.arrivals[0].eta,0);assert.equal(result.arrivals[0].lowFloor,null);assert.equal(result.updatedAt,123);
});
test('upstream failure never returns empty successful data',()=>assert.throws(()=>normalizeArrivals({response:{msgHeader:{resultCode:30}}})));
test('successful no-result is an empty arrival list',()=>assert.deepEqual(normalizeArrivals({response:{msgHeader:{resultCode:4}}},123).arrivals,[]));
