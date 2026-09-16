import test from 'node:test';
import assert from 'node:assert/strict';
import {homeStops,routeForDestination,stopConnections,routeBounds} from '../dist/transit-map.js';
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
