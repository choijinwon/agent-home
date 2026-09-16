import {getRoutes,parseSettings} from './engine.js';
import {createLocationController,mapLinks} from './location.js';
import {interpretQuestion,makeGuidance,createSpeaker,createListener} from './voice.js';
import {parseAccess,canSpeak,routeAnnouncement} from './accessibility.js';
import {buildJourney,boundedStep} from './journey.js';
let accessPrefs=parseAccess(null);
try{accessPrefs=parseAccess(JSON.parse(localStorage.getItem('homebus-access')));}catch{}
let notificationItems=[];
let voiceGuide=null,voiceRefresh=null;
let stationMinutes=0;
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let settings={home:'우리 집',area:'lake',walk:10,access:0},elapsed=0,missed=[],alarm=false,notified=new Set(),toastTimer;
try{settings=parseSettings(JSON.parse(localStorage.getItem('homebus-settings')))||settings;}catch{}
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,7000);}
function loadForm(){for(const key of ['home','area','walk','access'])$('#'+key).value=settings[key];$('#walk-value').textContent=settings.walk+'분';$('#walk-number').value=settings.walk;}
function routes(){if(accessPrefs.stepFree)return [];return getRoutes(settings,elapsed,missed,stationMinutes)}
function clock(min){return `${String(19+Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;}
function notify(text){toast(text);notificationItems.unshift({text,time:new Date().toLocaleTimeString('ko-KR')});notificationItems=notificationItems.slice(0,5);renderNotificationHistory();if(accessPrefs.vibration&&typeof navigator.vibrate==='function'){try{navigator.vibrate([200,100,200]);}catch{}}if(voiceGuide&&$('#voice-alerts').checked)voiceGuide(text);if(!accessPrefs.textOnly&&'Notification'in window&&Notification.permission==='granted'){try{new Notification('집으로 · 시연 알림',{body:text,tag:'homebus-demo'});}catch{}}}
function checkAlarm(){const r=routes()[0];if(alarm&&r&&r.eta-r.walk<=Number($('#lead').value)&&!notified.has(r.id)){notified.add(r.id);notify(`시연: ${r.id} 버스까지 ${r.eta}분, ${r.platform}까지 도보 ${r.walk}분이에요. 지금 이동하세요.`);}}
function render(){if($('#route-dialog').open)$('#route-dialog').close();const focusWasInResult=$('#recommendation').contains(document.activeElement);voiceRefresh?.();const list=routes(),r=list[0];const reference=settings.area==='aileen';$('.simulation').hidden=reference;$('.alternatives').hidden=reference;$('#alarm-toggle').disabled=reference||accessPrefs.stepFree;if(reference||accessPrefs.stepFree){alarm=false;$('#alarm-toggle').setAttribute('aria-pressed','false');$('#alarm-toggle').textContent='알림 켜기';$('#alarm-status').textContent='이 경로는 실시간 도착 정보가 없어 출발 알림을 켤 수 없어요. 알림 체험만 가능합니다.';}else if(!alarm){$('#alarm-status').textContent='알림은 이 페이지가 열려 있을 때 작동해요. 화면 잠금·종료 후 알림은 지원하지 않아요.';}$('#home-title').textContent=settings.home;$('#sim-time').textContent=clock(elapsed);$('#advance').disabled=elapsed>=60;$('#route-count').textContent=`${Math.max(list.length-1,0)}개 대안`;$('#recommendation').innerHTML=accessPrefs.stepFree?`<div class="empty"><h3>계단 없는 경로를 아직 확인할 수 없어요</h3><p>저상버스, 휠체어 탑승 공간, 승강기 운영 정보가 연결되지 않았어요. 확인되지 않은 경로를 이용 가능하다고 추천하지 않습니다.</p><p>현재 정류장 안내나 교통 운영기관에서 접근 가능한 이동 방법을 확인해 주세요.</p></div>`:settings.area==='aileen'?`<article class="panel"><span class="badge">자료 기반 버스 후보 · 도착 시간은 공식 서비스에서 확인</span><h2 style="margin-top:20px">동탄역 → 동탄역 에일린의뜰</h2><p>동탄기흥로353번길 77</p><div class="route-row"><div class="route-label"><strong>206 · H2</strong><span>에일린의뜰 정류장 하차 후보</span></div></div><p class="dialog-note">경기도교육청의 2025년 11월 이산고등학교 교통편 안내에서 확인한 구간이에요. 현재 운행 여부, 승차 방향과 정확한 정류장 위치는 추가 확인이 필요해요.</p><p class="dialog-note">도착 정보가 연결되지 않아 지금 탈 버스의 순위와 출발 알림은 제공하지 않아요. 설정 탭에서 다른 시연 경로를 선택하면 추천·알림을 체험할 수 있어요.</p><a class="text-button" href="https://www.goe.go.kr/resource/goe/na/bbs_2583/2025/11/67978b1b-2671-4dd5-97f2-b5a76c89f77d.pdf" target="_blank" rel="noopener noreferrer">교육청 교통편 안내 원문 ↗</a></article>`:r?`<article class="recommend"><div class="recommend-top"><span class="badge">가장 빨리 집에 도착</span><span>가상 노선 · 도보 1분 안전 여유</span></div><div class="recommend-main"><div class="bus-name">${r.id}<small>시연 버스</small></div><div class="arrival"><strong>${r.eta}분 후</strong><p>버스 도착 예정</p></div></div><div class="trip-stats"><div>승차장까지<strong>도보 ${r.walk}분</strong></div><div>버스 이동<strong>${r.ride}분</strong></div><div>하차 후 집까지<strong>도보 ${r.homeWalk}분</strong></div><div>집 도착<strong>${clock(elapsed+r.total)}</strong></div></div><p class="departure">${r.eta-r.walk-1<=0?'지금 출발하세요.':`${r.eta-r.walk-1}분 안에 출발하세요.`} <span style="color:#b8cdbd">${r.platform}</span></p><div class="recommend-actions"><button data-detail="${r.id}">승차 위치 · 경로 보기 ↗</button><button id="missed">이 버스를 놓쳤어요</button></div></article>`:`<div class="empty"><h3>${settings.area==='other'?'아직 시연 경로가 없는 지역이에요':'지금 조건에 맞는 버스가 없어요'}</h3><p>${settings.area==='other'?'목적지 이름은 자유롭게 저장할 수 있어요. 현재는 세 지역의 가상 경로를 체험할 수 있으며 실제 지역 검색·환승 경로는 아직 연결되지 않았어요.':'최대 도보 시간을 늘리거나 시연을 초기화해 다른 버스를 확인하세요. 다음 운행 정보는 이 데모에서 제공하지 않아요.'}</p><button class="secondary" id="empty-reset">시연 초기화</button></div>`;
$('#route-list').innerHTML=list.slice(1).map(x=>`<article class="route-row"><div class="route-label"><strong>${x.id}</strong><span>${x.platform} · 도보 ${x.walk}분</span></div><div class="route-timing"><strong>${x.eta}분 후 도착</strong><span>집 도착 ${clock(elapsed+x.total)} · 총 ${x.total}분</span></div><button data-detail="${x.id}" aria-label="${x.id} 경로 상세 보기">↗</button></article>`).join('')||'<p class="small">조건에 맞는 다른 버스가 없어요.</p>';$('#route-status').textContent=routeAnnouncement({stepFree:accessPrefs.stepFree,area:settings.area,routes:list});if(focusWasInResult)$('#recommendation').focus();checkAlarm();}
function reset(){elapsed=0;missed=[];notified.clear();render();toast('시연 시간을 19:00으로 되돌렸어요.');}
function save(input){const parsed=parseSettings(input);if(!parsed)throw new Error('목적지와 이동 조건을 확인해 주세요.');settings=parsed;elapsed=0;missed=[];notified.clear();loadForm();let saved=true;try{localStorage.setItem('homebus-settings',JSON.stringify(settings));}catch{saved=false;}$('#save-status').textContent=saved?'저장했어요. 다음 방문에도 이 기기에서 기억해요.':'현재 화면에 적용했어요. 이 브라우저에서는 저장할 수 없어요.';render();return settings;}
$('#settings').addEventListener('submit',e=>{e.preventDefault();try{save(Object.fromEntries(['home','area','walk','access'].map(k=>[k,$('#'+k).value])));activateView('route');toast('목적지에 맞춰 추천을 갱신했어요.');}catch(e){toast(e.message);}});
$('#area').addEventListener('change',e=>{if(e.target.value==='aileen')$('#home').value='동탄역 에일린의뜰';});
$('#walk').addEventListener('input',e=>{$('#walk-value').textContent=e.target.value+'분';$('#walk-number').value=e.target.value;});$('#walk-number').addEventListener('input',e=>{if(e.target.validity.valid&&e.target.value!==''){$('#walk').value=e.target.value;$('#walk-value').textContent=e.target.value+'분';}});$('#advance').onclick=()=>{elapsed=Math.min(60,elapsed+1);render();};$('#reset').onclick=reset;
document.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.id==='empty-reset')reset();if(button.id==='missed'){const r=routes()[0];if(r){missed.push(r.id);render();toast(routes().length?'다음으로 빨리 도착하는 버스를 추천했어요.':'다른 버스가 없어요. 조건을 바꾸거나 시연을 초기화해 주세요.');}}if(button.dataset.detail){const r=routes().find(x=>x.id===button.dataset.detail);if(r)openJourney(r);}});
$('#close-dialog').onclick=()=>$('#route-dialog').close();$('#route-dialog').addEventListener('click',e=>{if(e.target===$('#route-dialog'))$('#route-dialog').close();});
$('#alarm-toggle').onclick=async()=>{alarm=!alarm;$('#alarm-toggle').setAttribute('aria-pressed',String(alarm));$('#alarm-toggle').textContent=alarm?'알림 끄기':'알림 켜기';if(alarm&&!accessPrefs.textOnly&&'Notification'in window&&Notification.permission==='default'){try{await Notification.requestPermission();}catch{}}$('#alarm-status').textContent=alarm?`알림이 켜졌어요. ${!accessPrefs.textOnly&&'Notification'in window&&Notification.permission==='granted'?'브라우저 알림과 화면 알림을 사용해요.':'화면과 알림 목록에서 글로 알려드려요.'} 시연 시간이 진행되면 알림을 확인해요. 화면 잠금·종료 후에는 지원하지 않아요.`:'알림을 껐어요. 화면 잠금·종료 후 알림은 지원하지 않아요.';checkAlarm();};
$('#test-alarm').onclick=()=>{const r=routes()[0];notify(r?`[알림 체험] ${r.id} 버스의 ${r.platform}까지 도보 ${r.walk}분이에요. 실제 운행 알림이 아닙니다.`:'[알림 체험] 목적지에 맞는 버스를 선택하면 출발할 시간을 알려드려요.');};$('#lead').onchange=checkAlarm;
loadForm();render();
if(document.modelContext?.registerTool){const lifecycle=new AbortController();for(const tool of [{name:'read_bus_recommendations',description:'Read simulated bus recommendations for the current destination.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({mode:'simulation',settings,routes:routes()})},{name:'configure_commute',description:'Save device-local destination preferences and reset simulated bus time to 19:00.',inputSchema:{type:'object',properties:{home:{type:'string',maxLength:50},area:{type:'string',enum:['lake','central','yeongcheon','aileen','other']},walk:{type:'integer',minimum:3,maximum:20},access:{type:'integer',enum:[0,2,5]}},required:['home','area','walk','access'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>({settings:save(input),mode:'simulation',routes:routes()})}]){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}

let currentPosition=null;
const locationController=createLocationController({geolocation:navigator.geolocation,secure:window.isSecureContext,onChange(state){
 currentPosition=state.position;
 $('#locate').disabled=state.status==='loading';
 $('#locate').textContent=state.status==='loading'?'위치 확인 중…':'◎ 내 위치 다시 확인';
 $('#location-result').hidden=true;
 $('#location-map').removeAttribute('href');$('#location-walk').removeAttribute('href');
 if(state.status==='success'){
   const p=state.position,links=mapLinks(p);
   $('#location-status').textContent=p.accuracy>100?'위치를 확인했지만 오차가 커요. 지도에서 실제 위치를 확인하세요.':'현재 위치를 확인했어요. 이동했다면 다시 확인해 주세요.';
   $('#location-coordinates').textContent=`위도 ${p.latitude.toFixed(5)} · 경도 ${p.longitude.toFixed(5)} · 정확도 약 ${Math.round(p.accuracy)}m · ${new Date(p.timestamp).toLocaleTimeString('ko-KR')} 확인`;
   if(links){$('#location-map').href=links.map;$('#location-walk').href=links.walk;$('#location-result').hidden=false;}
 }else{$('#location-coordinates').textContent='';$('#location-status').textContent=state.status==='loading'?'기기의 현재 위치를 확인하고 있어요. 최대 16초가 걸릴 수 있어요.':state.message||'위치 정보를 지웠어요. 아래에서 출발 위치를 직접 선택할 수 있어요.';}
}});
$('#locate').onclick=()=>locationController.locate();
$('#clear-location').onclick=()=>locationController.clear();
for(const id of ['location-map','location-walk'])$('#'+id).addEventListener('click',e=>{if(!mapLinks(currentPosition)){e.preventDefault();locationController.clear();$('#location-status').textContent='위치를 확인한 지 5분이 지났어요. 내 위치를 다시 확인해 주세요.';}});
function applyOrigin(){
 const nearby=$('#origin-mode').value==='nearby';
 const value=nearby?Number($('#station-minutes').value):0;
 if(nearby&&($('#station-minutes').value.trim()===''||!Number.isInteger(value)||value<0||value>120)){$('#origin-status').textContent='이동 시간은 0~120분의 정수로 입력해 주세요.';return;}
 stationMinutes=value;notified.clear();render();$('#origin-status').textContent=nearby?`직접 입력한 ${value}분을 동탄역에서 시연 승차장까지의 도보 시간에 더해 추천해요. GPS로 자동 계산한 시간이 아니에요.`:'동탄역에서 출발하는 조건으로 추천해요.';
}
$('#origin-mode').onchange=()=>{$('#station-minutes-wrap').hidden=$('#origin-mode').value!=='nearby';applyOrigin();};
$('#apply-origin').onclick=applyOrigin;
window.addEventListener('pagehide',()=>locationController.clear());

// Voice UI reads only route state, never raw coordinates or private transcripts.
let pendingVoiceAction=null,lastVoiceIntent='recommend',listening=false;
const voiceStatus=text=>$('#voice-status').textContent=text;
const speaker=createSpeaker({synthesis:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,onStatus:voiceStatus});
const listener=createListener({Recognition:window.SpeechRecognition||window.webkitSpeechRecognition,onStatus:voiceStatus,onListening(value){listening=value;$('#voice-mic').setAttribute('aria-pressed',String(value));$('#voice-mic').textContent=value?'● 듣는 중 · 누르면 취소':'● 말로 물어보기';},onText(text){$('#voice-transcript').hidden=false;$('#voice-transcript').textContent='이렇게 들었어요: '+text;answerVoice(interpretQuestion(text));}});
function speakAnswer(text){listener.cancel();$('#voice-answer').textContent=text;if(canSpeak(accessPrefs))speaker.speak(text,Number($('#voice-rate').value));else{speaker.stop();voiceStatus('글로 안내했어요. 음성 재생은 꺼져 있어요.');}}
voiceGuide=speakAnswer;
function closeVoiceConfirmation(){pendingVoiceAction=null;$('#voice-confirm').hidden=true;}
function currentGuidance(intent=lastVoiceIntent){return makeGuidance(intent,{area:settings.area,routes:routes(),stepFree:accessPrefs.stepFree});}
function answerVoice(intent){
 listener.cancel();
 if(intent==='stop'){closeVoiceConfirmation();speaker.stop();return;}
 if(intent==='repeat'){if(pendingVoiceAction){speakAnswer($('#voice-confirm-text').textContent);return;}speakAnswer(currentGuidance());return;}
 if(intent==='slow'){$('#voice-rate').value='0.7';speakAnswer(pendingVoiceAction?$('#voice-confirm-text').textContent:currentGuidance());return;}
 closeVoiceConfirmation();
 if(intent==='missed'||intent==='aileen'){
   const r=routes()[0];if(intent==='missed'&&!r){speakAnswer(currentGuidance('recommend'));return;}
   pendingVoiceAction={intent,routeId:r?.id};
   const text=intent==='missed'?`시연 버스 ${r.id}를 놓치셨나요? 다음 버스를 보려면 아래의 네, 변경해 주세요 버튼을 눌러 주세요.`:'목적지를 동탄역 에일린의뜰로 바꿀까요? 아래의 네, 변경해 주세요 버튼을 눌러 주세요.';
   $('#voice-confirm-text').textContent=text;$('#voice-confirm').hidden=false;speakAnswer(text);$('#voice-confirm-yes').focus();return;
 }
 lastVoiceIntent=intent;speakAnswer(currentGuidance(intent));
}
voiceRefresh=()=>{listener.cancel();speaker.stop();closeVoiceConfirmation();$('#voice-answer').textContent='이동 조건이 바뀌었어요. 버스 안내 듣기를 눌러 새로운 안내를 확인해 주세요.';voiceStatus('이동 조건에 맞춰 안내를 갱신했어요.');};
$('#voice-read').onclick=()=>answerVoice('recommend');
$('#voice-repeat').onclick=()=>answerVoice('repeat');
$('#voice-stop').onclick=()=>{listener.cancel();closeVoiceConfirmation();speaker.stop();};
$('#voice-mic').onclick=()=>{speaker.stop();if(listening){listener.cancel();voiceStatus('마이크를 껐어요.');}else{closeVoiceConfirmation();listener.start();}};
for(const button of document.querySelectorAll('[data-question]'))button.onclick=()=>answerVoice(button.dataset.question);
$('#voice-confirm-no').onclick=()=>{closeVoiceConfirmation();speakAnswer('취소했어요. 기존 설정을 유지합니다.');$('#voice-read').focus();};
$('#voice-confirm-yes').onclick=()=>{
 const action=pendingVoiceAction;closeVoiceConfirmation();if(!action)return;
 if(action.intent==='aileen')save({...settings,area:'aileen',home:'동탄역 에일린의뜰'});
 else if(routes()[0]?.id===action.routeId){missed.push(action.routeId);render();}
 else{speaker.stop();voiceStatus('추천 버스가 바뀌었어요. 다시 확인해 주세요.');return;}
 lastVoiceIntent='recommend';speakAnswer(currentGuidance());$('#voice-read').focus();
};
$('#voice-rate').onchange=()=>speaker.stop();
let senior=true;try{senior=localStorage.getItem('homebus-large-text')!=='false';}catch{}
function applySenior(){document.body.classList.toggle('senior-mode',senior);$('#senior-toggle').setAttribute('aria-pressed',String(senior));$('#senior-toggle').textContent=senior?'큰 글씨 켜짐':'큰 글씨 켜기';}
applySenior();$('#senior-toggle').onclick=()=>{senior=!senior;applySenior();try{localStorage.setItem('homebus-large-text',String(senior));}catch{}};
if(!(window.SpeechRecognition||window.webkitSpeechRecognition)){$('#voice-mic').disabled=true;voiceStatus('이 브라우저에서는 말로 묻기를 지원하지 않아요. 안내 듣기와 질문 버튼을 이용해 주세요.');}
const stopVoice=()=>{listener.cancel();speaker.stop();};
window.addEventListener('pagehide',stopVoice);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopVoice();});

function renderNotificationHistory(){
 const list=$('#notification-history');list.replaceChildren();
 if(!notificationItems.length){const li=document.createElement('li');li.textContent='아직 알림이 없어요.';list.append(li);return;}
 for(const item of notificationItems){const li=document.createElement('li');const time=document.createElement('strong');time.textContent=item.time+' ';const text=document.createElement('span');text.textContent=item.text;li.append(time,text);list.append(li);}
}
$('#clear-notifications').onclick=()=>{notificationItems=[];renderNotificationHistory();toast('알림을 모두 지웠어요.');};
function applyAccess(){
 document.body.classList.toggle('high-contrast',accessPrefs.contrast);
 document.body.classList.toggle('reduce-motion',accessPrefs.reduceMotion);
 document.body.dataset.textSize=accessPrefs.textSize;
 $('#voice-answer').setAttribute('aria-live',accessPrefs.screenReader?'polite':'off');
 $('#voice-status').setAttribute('aria-live',accessPrefs.screenReader?'off':'polite');
 $('#voice-alerts').disabled=!canSpeak(accessPrefs);
 if(!canSpeak(accessPrefs)){$('#voice-alerts').checked=false;speaker.stop();}
 $('#voice-read').textContent=canSpeak(accessPrefs)?'▶ 버스 안내 듣기':'버스 안내 글로 보기';
 $('#voice-repeat').textContent=canSpeak(accessPrefs)?'다시 들려주세요':'안내 다시 보기';
 for(const key of ['contrast','textOnly','screenReader','reduceMotion','vibration','stepFree'])$('#access-'+key).checked=accessPrefs[key];
 $('#access-textSize').value=accessPrefs.textSize;
}
function updateAccess(){
 accessPrefs=parseAccess(Object.fromEntries([...['contrast','textOnly','screenReader','reduceMotion','vibration','stepFree'].map(k=>[k,$('#access-'+k).checked]),['textSize',$('#access-textSize').value]]));
 applyAccess();render();let saved=true;try{localStorage.setItem('homebus-access',JSON.stringify(accessPrefs));}catch{saved=false;}
 $('#access-status').textContent=(saved?'이용 설정을 저장했어요.':'설정을 적용했어요. 이 브라우저에서는 저장할 수 없어요.')+(accessPrefs.vibration&&typeof navigator.vibrate!=='function'?' 이 기기는 진동을 지원하지 않아 화면 알림을 사용해요.':'')+(accessPrefs.screenReader?' 앱 음성을 끄고 화면낭독기로 안내합니다.':'');
}
for(const control of document.querySelectorAll('#a11y-settings input,#a11y-settings select'))control.addEventListener('change',updateAccess);
$('#text-question-form').onsubmit=e=>{e.preventDefault();const text=$('#text-question').value.trim();if(!text){$('#text-question').focus();return;}$('#voice-transcript').hidden=false;$('#voice-transcript').textContent='질문: '+text;answerVoice(interpretQuestion(text));};
for(const link of document.querySelectorAll('.skip-links a'))link.addEventListener('click',e=>{e.preventDefault();const target=link.getAttribute('href');if(target==='#recommendation')activateView('route');if(target==='#a11y-settings')activateView('settings');document.querySelector(target).focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const confirmationFocused=$('#voice-confirm').contains(document.activeElement);stopVoice();closeVoiceConfirmation();if(confirmationFocused)$('#voice-read').focus();}});
applyAccess();render();

let activeJourney=null,journeyStep=0,journeyOpener=null;
const journeySpeaker=createSpeaker({synthesis:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,onStatus:text=>$('#journey-audio-status').textContent=text});
function renderJourneyStep(index){
 journeySpeaker.stop();journeyStep=boundedStep(index,activeJourney.steps.length);
 for(const [i,button] of [...$('#journey-stops').querySelectorAll('button')].entries()){
  if(i===journeyStep)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
 }
 const step=activeJourney.steps[journeyStep];if(!step)return;
 $('#journey-step-number').textContent=`${journeyStep+1} / ${activeJourney.steps.length} · ${step.label}`;
 $('#journey-step-title').textContent=step.title;
 $('#journey-step-detail').textContent=step.detail;
 $('#journey-prev').disabled=journeyStep===0;$('#journey-next').disabled=journeyStep===activeJourney.steps.length-1;
 $('#journey-read').textContent=canSpeak(accessPrefs)?'이 구간 듣기':'이 구간 글로 안내 중';$('#journey-read').disabled=!canSpeak(accessPrefs);
 $('#journey-audio-status').textContent='';
}
function openJourney(route=routes()[0]){
 stopVoice();journeyOpener=document.activeElement;
 activeJourney=buildJourney({settings:{...settings},route,stationMinutes,stepFree:accessPrefs.stepFree});
 $('#route-dialog-title').textContent='동탄역 → '+activeJourney.destination;
 $('#journey-disclaimer').textContent=activeJourney.message;
 $('#journey-summary').textContent=activeJourney.total===null?'소요 시간 미확인 · 실제 지도 아님':`시연 총 ${activeJourney.total}분 · 도보 + 대기 + 버스 이동 · 실제 지도 아님`;
 const stops=$('#journey-stops');stops.replaceChildren();
 activeJourney.steps.forEach((step,index)=>{
  const li=document.createElement('li'),button=document.createElement('button'),number=document.createElement('span'),label=document.createElement('strong'),title=document.createElement('span');
  button.type='button';button.setAttribute('aria-controls','journey-current');number.className='journey-number';number.textContent=String(index+1);label.textContent=step.label;title.textContent=step.title;
  button.append(number,label,title);button.onclick=()=>renderJourneyStep(index);li.append(button);stops.append(li);
 });
 const hasSteps=activeJourney.steps.length>0;
 for(const id of ['journey-stops','journey-current','journey-navigation','journey-instruction','journey-audio-stop'])$('#'+id).hidden=!hasSteps;
 if(hasSteps)renderJourneyStep(0);else $('#journey-audio-status').textContent='';
 $('#route-dialog').showModal();$('#close-dialog').focus();
}
$('#open-journey').onclick=()=>openJourney();
const destinationPresets={aileen:'동탄역 에일린의뜰',lake:'동탄호수공원',central:'센트럴파크',yeongcheon:'영천동'};
for(const button of document.querySelectorAll('[data-destination]'))button.onclick=()=>{save({...settings,home:destinationPresets[button.dataset.destination],area:button.dataset.destination});openJourney();};
$('#journey-prev').onclick=()=>{renderJourneyStep(journeyStep-1);if($('#journey-prev').disabled)$('#journey-stops button[aria-current="step"]').focus();};
$('#journey-next').onclick=()=>{renderJourneyStep(journeyStep+1);if($('#journey-next').disabled)$('#journey-stops button[aria-current="step"]').focus();};
$('#journey-read').onclick=()=>{if(canSpeak(accessPrefs)){const step=activeJourney.steps[journeyStep];const safeDetails=step.label==='도착'||step.label==='목적지'?'설정한 목적지까지의 마지막 구간 예시입니다. 실제 위치 도착 확인이 아닙니다.':step.detail;journeySpeaker.speak('이동 경로 데모입니다. '+safeDetails,Number($('#voice-rate').value));}};
$('#journey-audio-stop').onclick=()=>journeySpeaker.stop();
$('#route-dialog').addEventListener('close',()=>{journeySpeaker.stop();if(journeyOpener?.isConnected)journeyOpener.focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')journeySpeaker.stop();});
window.addEventListener('pagehide',()=>journeySpeaker.stop());document.addEventListener('visibilitychange',()=>{if(document.hidden)journeySpeaker.stop();});

function activateView(name,{focusTab=false}={}){
 const tab=$('#tab-'+name);if(!tab)return;
 stopVoice();closeVoiceConfirmation();journeySpeaker.stop();
 for(const button of document.querySelectorAll('[role="tab"][data-view]')){
  const selected=button.dataset.view===name;
  button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
  $('#view-'+button.dataset.view).hidden=!selected;
 }
 if(focusTab)tab.focus();
 // Mobile navigation stays in thumb reach; show the chosen panel from its start.
 if(window.matchMedia('(max-width: 640px)').matches)$('#view-'+name).scrollIntoView({block:'start',behavior:'instant'});
 else $('.app-tabs').scrollIntoView({block:'start',behavior:'instant'});
}
const viewTabs=[...document.querySelectorAll('[role="tab"][data-view]')];
for(const [index,tab] of viewTabs.entries()){
 tab.onclick=()=>activateView(tab.dataset.view,{focusTab:true});
 tab.addEventListener('keydown',event=>{
  let next;if(event.key==='ArrowRight')next=(index+1)%viewTabs.length;
  if(event.key==='ArrowLeft')next=(index+viewTabs.length-1)%viewTabs.length;
  if(event.key==='Home')next=0;if(event.key==='End')next=viewTabs.length-1;
  if(next!==undefined){event.preventDefault();activateView(viewTabs[next].dataset.view,{focusTab:true});}
 });
}
$('#edit-destination').onclick=()=>{activateView('settings');$('#home').focus();};
$('#quick-voice').onclick=()=>{activateView('voice');$('#voice-read').focus();};

// Reserve exactly the space occupied by navigation, including text enlargement.
function updateMobileNavSpace(){
 const mobile=window.matchMedia('(max-width: 640px)').matches;
 document.documentElement.style.setProperty('--mobile-nav-height',mobile?Math.ceil($('.app-tabs').getBoundingClientRect().height)+'px':'0px');
}
if('ResizeObserver' in window){const navObserver=new ResizeObserver(updateMobileNavSpace);navObserver.observe($('.app-tabs'));}
window.addEventListener('resize',updateMobileNavSpace);updateMobileNavSpace();

let mapOpener=null;
$('#open-map').onclick=()=>{
 stopVoice();journeySpeaker.stop();mapOpener=document.activeElement;
 const names={aileen:'동탄역 에일린의뜰, 경기도 화성시 동탄기흥로353번길 77',lake:'동탄호수공원, 화성시',central:'동탄 센트럴파크, 화성시',yeongcheon:'영천동, 화성시'};
 const destination=names[settings.area]||settings.home;
 $('#map-destination').textContent='동탄역 → '+destination;
 const query=new URL('https://www.google.com/maps/search/');query.search=new URLSearchParams({api:'1',query:destination});$('#destination-map').href=query.href;
 const directions=new URL('https://www.google.com/maps/dir/');directions.search=new URLSearchParams({api:'1',origin:'동탄역, 경기도 화성시 동탄역로 151',destination,travelmode:'transit'});$('#destination-directions').href=directions.href;
 $('#bus-search-help').textContent=settings.area==='aileen'?'경기버스에서 동탄역을 검색하고 206·H2 후보의 현재 운행과 목적지 방향을 확인하세요. 같은 이름의 정류장도 방향이 다를 수 있어요.':'경기버스에서 동탄역을 검색한 후 목적지 방향의 정류장과 노선을 확인하세요. A1·B1·C1 같은 시연 번호는 실제 노선이 아니에요.';
 $('#area-map').src='https://www.openstreetmap.org/export/embed.html?bbox=127.075%2C37.182%2C127.110%2C37.209&layer=mapnik';
 $('#map-dialog').showModal();$('#close-map').focus();
};
$('#close-map').onclick=()=>$('#map-dialog').close();
$('#map-dialog').addEventListener('close',()=>{ $('#area-map').removeAttribute('src');if(mapOpener?.isConnected)mapOpener.focus();});
