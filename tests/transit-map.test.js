import test from 'node:test';
import assert from 'node:assert/strict';
import {homeStops,homeBusRoutes,findHomeBuses,routeForDestination,stopConnections,routeBounds} from '../dist/transit-map.js';
test('a different destination never inherits the Aileen route',()=>{
 for(const context of [{area:'lake'},{area:'other'},{area:'aileen',mapPoint:[127,37]},{}]){
  assert.equal(routeForDestination(context),null);
  assert.deepEqual(stopConnections(context).features,[]);
 }
 assert.equal(routeForDestination({area:'aileen'}).length,6);
});
test('route overview includes the southern detour as well as both endpoints',()=>{
 const context={area:'aileen'},origin=[127.0955764,37.2003594],destination={coordinates:[127.0866271,37.189115]};
 const [sw,ne]=routeBounds(context,destination,origin);
 for(const p of [origin,destination.coordinates,...homeStops.map(s=>s.coordinates)]){
  assert.ok(p[0]>=sw[0]&&p[0]<=ne[0]&&p[1]>=sw[1]&&p[1]<=ne[1]);
 }
 assert.equal(stopConnections(context).features[0].geometry.coordinates.length,6);
});

test('H17 uses the east platform and never invents missing map segments',()=>{
 const context={area:'aileen'},stops=routeForDestination(context,'H17');
 assert.equal(stops[0].number,'55399');assert.equal(stops.at(-1).number,'55405');assert.equal(stops.length-1,9);
 assert.deepEqual(stopConnections(context,'H17').features,[]);
 assert.equal(routeForDestination(context,'H2')[0].number,'55398');
 assert.equal(routeForDestination(context,'unknown'),null);
});

test('catalog filters verified boarding directions and exposes nearby alternatives',()=>{
 const context={area:'aileen'};
 assert.equal(findHomeBuses(context).length,10);
 assert.equal(findHomeBuses(context,{boarding:'55398',query:'H101'}).length,0);
 assert.equal(findHomeBuses(context,{boarding:'55399',query:'H101'})[0].direction,'반정아이파크4단지정문 방면');
 const lotte=findHomeBuses(context,{boarding:'36436',query:'67'})[0];
 assert.equal(lotte.stationId,'233000137');assert.equal(lotte.stops[0].number,'36436');
 assert.equal(lotte.stops.at(-1).number,'55405');
 assert.equal(findHomeBuses(context,{query:'H24'})[0].id,'24');
 assert.equal(findHomeBuses(context,{query:'없는버스'}).length,0);
 assert.equal(findHomeBuses({area:'other'}).length,0);
 assert.equal(findHomeBuses({area:'aileen',mapPoint:[127,37]}).length,0);
});

test('selected boarding and different alighting stops never inherit default geometry',()=>{
 const context={area:'aileen',boardingNumber:'36436'};
 assert.equal(routeForDestination(context,'67')[0].number,'36436');
 assert.equal(routeForDestination(context,'H2'),null);
 assert.equal(routeForDestination({area:'aileen'},'19-3').at(-1).number,'55446');
 assert.deepEqual(stopConnections({area:'aileen'},'19-3').features,[]);
 for(const route of homeBusRoutes){
  assert.ok(route.stops.length>1);
  const bounds=routeBounds({area:'aileen'},null,[127.0955764,37.2003594],route.id);
  assert.ok(bounds.flat().every(Number.isFinite));
 }
});
