import test from 'node:test';import assert from 'node:assert/strict';
import {interpretQuestion,makeGuidance,createListener,createSpeaker} from '../dist/voice.js';
test('Korean questions map to bounded intents',()=>{assert.equal(interpretQuestion('어떤 버스를 타야 해요?'),'recommend');assert.equal(interpretQuestion('버스를 놓쳤어요'),'missed');assert.equal(interpretQuestion('에일린의뜰로 가고 싶어'),'aileen');assert.equal(interpretQuestion('무슨 약을 먹을까'),'help');});
test('real destination never claims a live bus time',()=>{const text=makeGuidance('arrival',{area:'aileen',routes:[{id:'FAKE',eta:1}]});assert.match(text,/아직 확인할 수 없습니다/);assert.doesNotMatch(text,/FAKE|1분/);});
test('live voice reads the selected API route and never uses legacy fixtures',()=>{
 const text=makeGuidance('recommend',{route:{seconds:1200,transfers:0,steps:[{guidance:'동탄역에서 H2 탑승 후 에일린의뜰 하차'}]},routes:[{id:'A1',eta:6}]});
 assert.match(text,/20분/);assert.match(text,/H2/);assert.match(text,/실시간 도착정보는 포함하지 않습니다/);assert.doesNotMatch(text,/A1|시연|6분/);
 assert.match(makeGuidance('recommend',{area:'lake',routes:[{id:'A1',eta:6}]}),/현재 조회된 실제 경로가 없습니다/);
});
test('arrival answers never confuse journey duration with bus ETA',()=>{
 const text=makeGuidance('arrival',{route:{seconds:1200,transfers:0,steps:[]}});
 assert.match(text,/실시간 도착 시간은 아직 확인할 수 없습니다/);assert.doesNotMatch(text,/20분/);
});
test('cancelled recognition cannot execute late commands',()=>{let instance,spoken;class Recognition{constructor(){instance=this;}start(){}abort(){}}const l=createListener({Recognition,onStatus(){},onListening(){},onText:x=>spoken=x});l.start();l.cancel();instance.onresult({results:[[{transcript:'버스 놓쳤어'}]]});assert.equal(spoken,undefined);});
test('unsupported speech and denied microphone have readable fallback',()=>{let status;createSpeaker({onStatus:s=>status=s}).speak('안내');assert.match(status,/지원하지/);class Recognition{start(){this.onerror({error:'not-allowed'});}abort(){}}const l=createListener({Recognition,onStatus:s=>status=s,onListening(){},onText(){}});l.start();assert.match(status,/권한/);l.cancel();});
