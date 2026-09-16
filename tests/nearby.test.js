import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStops,validCoordinates,nearbyResponse} from '../server/nearby.js';
test('nearby rejects invalid coordinates and incomplete upstream data',async()=>{
 for(const p of [[null,127],['37',127],[91,127],[37,181]])assert.equal(validCoordinates(...p),false);
 assert.throws(()=>normalizeStops({remark:'timeout',elements:[]},37,127));
 const response=await nearbyResponse(new Request('https://example.test/api/nearby-stops',{method:'POST',body:JSON.stringify({lat:NaN,lon:127})}));assert.equal(response.status,400);
});
test('nearby sorts real stops, excludes far and invalid rows, keeps opposite platforms',()=>{
 const node=(id,lat,lon)=>({type:'node',id,lat,lon,tags:{highway:'bus_stop',name:'정류소'}});
 const rows=normalizeStops({elements:[node(1,37.003,127),node(2,37,127),node(3,38,127),node(4,null,127),node(5,37.0001,127)]},37,127);
 assert.deepEqual(rows.map(x=>x.id),['2','5','1']);assert.equal(rows[0].distance,0);
});
