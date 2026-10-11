import test from 'node:test';
import assert from 'node:assert/strict';
import {rankRouteChoices,routeVehicleGroups,routeVehicleSummary,routeTransferLabel} from '../dist/route-choice.js';

test('default route choice prioritizes fewer transfers and keeps original selection identity',()=>{
 const routes=[{seconds:600,transfers:2},{seconds:1200,transfers:0},{seconds:1000,transfers:0}];
 assert.deepEqual(rankRouteChoices(routes).map(item=>item.index),[2,1,0]);
 assert.deepEqual(rankRouteChoices(routes,'fastest').map(item=>item.index),[0,2,1]);
 assert.equal(rankRouteChoices(routes)[0].route,routes[2]);
 assert.equal(routes[0].seconds,600);
});

test('bus alternatives within one leg are not presented as separate transfers',()=>{
 const route={steps:[{type:'WALK',vehicles:[]},{type:'BUS',vehicles:['H2','206','H2']},{type:'BUS',vehicles:['19-1']}]};
 assert.deepEqual(routeVehicleGroups(route),[['H2','206'],['19-1']]);
 assert.equal(routeVehicleSummary(route),'H2 또는 206 → 19-1');
});

test('unknown transfer information does not win the fewer transfers recommendation',()=>{
 const routes=[{seconds:500},{seconds:1000,transfers:1}];
 assert.equal(rankRouteChoices(routes)[0].index,1);
 assert.equal(routeTransferLabel(routes[0]),'환승 정보 미확인');
 assert.equal(routeTransferLabel({transfers:0}),'환승 없음');
 assert.equal(routeVehicleSummary({steps:[]}), '상세 이동 안내 확인');
});
