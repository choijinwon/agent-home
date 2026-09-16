import test from 'node:test';import assert from 'node:assert/strict';import {getRoutes,parseSettings} from '../dist/engine.js';
const s={home:'우리 집',area:'lake',walk:10,access:0};
test('rank by complete door-to-door arrival and exclude unreachable bus',()=>{const r=getRoutes(s);assert.deepEqual(r.map(x=>x.id),['A1','A2']);assert.equal(r[0].total,30);});
test('missed bus switches recommendation',()=>assert.equal(getRoutes(s,0,['A1'])[0].id,'A2'));
test('walking preference and safety margin filter routes',()=>{assert.equal(getRoutes({...s,walk:3}).length,0);assert.equal(getRoutes(s,3)[0].id,'A2');assert.equal(getRoutes(s,6).length,0);assert.equal(getRoutes({...s,access:5}).length,0);});
test('destination changes itinerary and unsupported regions stay empty',()=>{assert.equal(getRoutes({...s,area:'yeongcheon'})[0].id,'C1');assert.deepEqual(getRoutes({...s,area:'other'}),[]);});
test('reject corrupt preferences',()=>{assert.equal(parseSettings({...s,walk:'bad'}),null);assert.equal(parseSettings({...s,access:-2}),null);assert.equal(parseSettings({...s,home:' '}),null);assert.deepEqual(parseSettings(s),s);});
