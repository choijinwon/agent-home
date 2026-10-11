import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRoutes,routingResponse} from '../server/routing.js';
test('routing does not turn provider failures into successful empty results',()=>{
 assert.deepEqual(normalizeRoutes({status:'NO_RESULTS'}),[]);
 assert.throws(()=>normalizeRoutes({status:'INVALID_REQUEST'}));
 const routes=normalizeRoutes({status:'OK',routes:[{properties:{totalTime:1200,transfers:0},steps:[{properties:{type:'BUS',vehicles:[{name:'H2'}]},path:{points:[[127,37],[NaN,37],[0,0]]}}]}]});
 assert.deepEqual(routes[0].steps[0].points,[[127,37]]);assert.equal(routes[0].seconds,1200);
});
test('route endpoint requires server key and validates input before any upstream call',async()=>{
 const req=body=>new Request('http://local/api/routes',{method:'POST',body:JSON.stringify(body)});
 assert.equal((await routingResponse(req({}),{})).status,503);
 assert.equal((await routingResponse(req({from:[0,0],to:[127,37]}),{KAKAO_REST_API_KEY:'test'})).status,400);
 assert.equal((await routingResponse(new Request('http://local/api/routes'),{})).status,405);
});
