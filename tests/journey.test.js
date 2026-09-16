import test from 'node:test';import assert from 'node:assert/strict';import {buildJourney,boundedStep} from '../dist/journey.js';import {getRoutes} from '../dist/engine.js';
const settings={home:'목적지',area:'lake',walk:10,access:0};
test('demo journey accounts for travel, waiting, riding and last-mile time',()=>{const route=getRoutes(settings)[0],j=buildJourney({settings,route});assert.equal(j.steps.length,5);assert.equal(j.steps.reduce((s,x)=>s+x.minutes,0),route.total);assert.match(j.message,/가상/);});
test('reference destination does not invent durations or boarding positions',()=>{const j=buildJourney({settings:{...settings,area:'aileen'}});assert.equal(j.mode,'reference');assert.equal(j.total,null);assert.ok(j.steps.every(x=>x.minutes===undefined));assert.match(j.message,/확인되지/);});
test('inaccessible or missing routes are not replaced with fake paths',()=>{assert.equal(buildJourney({settings,stepFree:true,route:getRoutes(settings)[0]}).steps.length,0);assert.equal(buildJourney({settings}).mode,'unavailable');});
test('navigation stays within route bounds',()=>{assert.equal(boundedStep(-1,5),0);assert.equal(boundedStep(99,5),4);assert.equal(boundedStep(NaN,0),0);});
