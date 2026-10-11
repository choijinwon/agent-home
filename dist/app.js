import {destinationFor} from './map-places.js';
import {setupBusCatalog} from './bus-catalog.js';
import {setupNearby} from './nearby.js';
import {setupCommute} from './commute.js';
import {setupMotionDemo} from './motion.js';
import {parseSettings} from './engine.js';
import {createLocationController,mapLinks} from './location.js';
import {interpretQuestion,makeGuidance,createSpeaker,createListener} from './voice.js';
import {parseAccess,canSpeak} from './accessibility.js';
let accessPrefs=parseAccess(null);
try{accessPrefs=parseAccess(JSON.parse(localStorage.getItem('homebus-access')));}catch{}
let notificationItems=[];
let voiceGuide=null,voiceRefresh=null,commute=null,busCatalog=null;
const $=s=>document.querySelector(s);
let settings={home:'동탄역 에일린의뜰',area:'aileen',walk:10,access:0},toastTimer;
try{settings=parseSettings(JSON.parse(localStorage.getItem('homebus-settings')))||settings;}catch{}
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,7000);}
function loadForm(){for(const key of ['home','area','walk','access'])$('#'+key).value=settings[key];$('#walk-value').textContent=settings.walk+'분';$('#walk-number').value=settings.walk;}
function notify(text){toast(text);notificationItems.unshift({text,time:new Date().toLocaleTimeString('ko-KR')});notificationItems=notificationItems.slice(0,5);renderNotificationHistory();if(accessPrefs.vibration&&typeof navigator.vibrate==='function'){try{navigator.vibrate([200,100,200]);}catch{}}if(voiceGuide&&$('#voice-alerts').checked)voiceGuide(text);if(!accessPrefs.textOnly&&'Notification'in window&&Notification.permission==='granted'){try{new Notification('집으로 · 안내',{body:text,tag:'homebus-guidance'});}catch{}}}
function render(){busCatalog?.render();commute?.render();voiceRefresh?.();}
function save(input){const parsed=parseSettings({...input,...(input.mapPoint===undefined&&input.area===settings.area&&input.home===settings.home&&settings.mapPoint?{mapPoint:settings.mapPoint}:{})});if(!parsed)throw new Error('목적지와 이동 조건을 확인해 주세요.');settings=parsed;loadForm();let saved=true;try{localStorage.setItem('homebus-settings',JSON.stringify(settings));}catch{saved=false;}$('#save-status').textContent=saved?'저장했어요. 다음 방문에도 이 기기에서 기억해요.':'현재 화면에 적용했어요. 이 브라우저에서는 저장할 수 없어요.';render();return settings;}
$('#settings').addEventListener('submit',e=>{e.preventDefault();try{save(Object.fromEntries(['home','area','walk','access'].map(k=>[k,$('#'+k).value])));activateView('route');toast('목적지에 맞춰 추천을 갱신했어요.');}catch(e){toast(e.message);}});
$('#area').addEventListener('change',e=>{if(e.target.value==='aileen')$('#home').value='동탄역 에일린의뜰';});
$('#walk').addEventListener('input',e=>{$('#walk-value').textContent=e.target.value+'분';$('#walk-number').value=e.target.value;});$('#walk-number').addEventListener('input',e=>{if(e.target.validity.valid&&e.target.value!==''){$('#walk').value=e.target.value;$('#walk-value').textContent=e.target.value+'분';}});
loadForm();render();
if(document.modelContext?.registerTool){const lifecycle=new AbortController();for(const tool of [{name:'read_bus_recommendations',description:'Read the selected actual route for the current destination.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({mode:'actual_routes',settings,route:commute?.getRoute()||null,liveArrivals:false})},{name:'configure_commute',description:'Save device-local destination preferences and request actual route information.',inputSchema:{type:'object',properties:{home:{type:'string',maxLength:50},area:{type:'string',enum:['lake','central','yeongcheon','aileen','other']},walk:{type:'integer',minimum:3,maximum:20},access:{type:'integer',enum:[0,2,5]}},required:['home','area','walk','access'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>({settings:save(input),mode:'actual_routes',status:'loading',liveArrivals:false})}]){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}

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
 $('#origin-status').textContent=nearby?`동탄역까지 직접 입력한 이동 시간은 ${value}분입니다. 실제 경로는 동탄역부터 조회하며, 이 시간은 경로 예상 시간에 포함되지 않아요.`:'동탄역에서 출발하는 실제 경로를 조회해요.';
}
$('#origin-mode').onchange=()=>{$('#station-minutes-wrap').hidden=$('#origin-mode').value!=='nearby';applyOrigin();};
$('#apply-origin').onclick=applyOrigin;
window.addEventListener('pagehide',()=>locationController.clear());

// Voice UI reads only route state, never raw coordinates or private transcripts.
let pendingVoiceAction=null,lastVoiceIntent='recommend',listening=false;
const voiceStatus=text=>$('#voice-status').textContent=text;
const speaker=createSpeaker({synthesis:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,onStatus:voiceStatus});
const listener=createListener({Recognition:window.SpeechRecognition||window.webkitSpeechRecognition,onStatus:voiceStatus,onListening(value){listening=value;$('#voice-mic').setAttribute('aria-pressed',String(value));$('#voice-mic').textContent=value?'● 듣는 중 · 누르면 취소':'● 말로 물어보기';},onText(text){$('#voice-transcript').hidden=false;$('#voice-transcript').textContent='이렇게 들었어요: '+text;if(!commute?.handleText(text))answerVoice(interpretQuestion(text));}});
function speakAnswer(text){listener.cancel();$('#voice-answer').textContent=text;if(canSpeak(accessPrefs))speaker.speak(text,Number($('#voice-rate').value));else{speaker.stop();voiceStatus('글로 안내했어요. 음성 재생은 꺼져 있어요.');}}
voiceGuide=speakAnswer;
function closeVoiceConfirmation(){pendingVoiceAction=null;$('#voice-confirm').hidden=true;}
function currentGuidance(intent=lastVoiceIntent){return makeGuidance(intent,{destination:settings.home,route:commute?.getRoute()||null,stepFree:accessPrefs.stepFree});}
function answerVoice(intent){
 listener.cancel();
 if(intent==='stop'){closeVoiceConfirmation();speaker.stop();return;}
 if(intent==='repeat'){if(pendingVoiceAction){speakAnswer($('#voice-confirm-text').textContent);return;}speakAnswer(currentGuidance());return;}
 if(intent==='slow'){$('#voice-rate').value='0.7';speakAnswer(pendingVoiceAction?$('#voice-confirm-text').textContent:currentGuidance());return;}
 closeVoiceConfirmation();
 if(intent==='missed'){commute?.handleText('버스를 놓쳤어요');return;}
 if(intent==='aileen'){
   pendingVoiceAction={intent};
   const text='목적지를 동탄역 에일린의뜰로 바꿀까요? 아래의 네, 변경해 주세요 버튼을 눌러 주세요.';
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
 syncSimplePreferences();
}
function updateAccess(){
 accessPrefs=parseAccess(Object.fromEntries([...['contrast','textOnly','screenReader','reduceMotion','vibration','stepFree'].map(k=>[k,$('#access-'+k).checked]),['textSize',$('#access-textSize').value]]));
 applyAccess();render();let saved=true;try{localStorage.setItem('homebus-access',JSON.stringify(accessPrefs));}catch{saved=false;}
 $('#access-status').textContent=(saved?'이용 설정을 저장했어요.':'설정을 적용했어요. 이 브라우저에서는 저장할 수 없어요.')+(accessPrefs.vibration&&typeof navigator.vibrate!=='function'?' 이 기기는 진동을 지원하지 않아 화면 알림을 사용해요.':'')+(accessPrefs.screenReader?' 앱 음성을 끄고 화면낭독기로 안내합니다.':'');
}
for(const control of document.querySelectorAll('#a11y-settings input,#a11y-settings select'))control.addEventListener('change',updateAccess);
$('#text-question-form').onsubmit=e=>{e.preventDefault();const text=$('#text-question').value.trim();if(!text){$('#text-question').focus();return;}$('#voice-transcript').hidden=false;$('#voice-transcript').textContent='질문: '+text;if(!commute?.handleText(text))answerVoice(interpretQuestion(text));};
for(const link of document.querySelectorAll('.skip-links a'))link.addEventListener('click',e=>{e.preventDefault();const target=link.getAttribute('href');if(target==='#commute-result')activateView('route');if(target==='#a11y-settings')activateView('settings');document.querySelector(target).focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const confirmationFocused=$('#voice-confirm').contains(document.activeElement);stopVoice();closeVoiceConfirmation();if(confirmationFocused)$('#voice-read').focus();}});
applyAccess();render();

function activateView(name,{focusTab=false}={}){
 const tab=$('#tab-'+name);if(!tab)return;
 stopVoice();closeVoiceConfirmation();
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

// Reserve exactly the space occupied by navigation, including text enlargement.
function updateMobileNavSpace(){
 const mobile=window.matchMedia('(max-width: 640px)').matches;
 document.documentElement.style.setProperty('--mobile-nav-height',mobile?Math.ceil($('.app-tabs').getBoundingClientRect().height)+'px':'0px');
}
if('ResizeObserver' in window){const navObserver=new ResizeObserver(updateMobileNavSpace);navObserver.observe($('.app-tabs'));}
window.addEventListener('resize',updateMobileNavSpace);updateMobileNavSpace();

const motionDemo=setupMotionDemo(()=>accessPrefs.reduceMotion,point=>{save({...settings,mapPoint:point});return settings;});
let mapOpener=null,pendingMapRoute=null;
busCatalog=setupBusCatalog(()=>settings,(routeId,boardingNumber)=>{pendingMapRoute={routeId,boardingNumber};$('#open-map').click();});
$('#open-map').onclick=()=>{
 stopVoice();mapOpener=document.activeElement;
 const names={aileen:'동탄역 에일린의뜰, 경기도 화성시 동탄기흥로353번길 77',lake:'동탄호수공원, 화성시',central:'동탄 센트럴파크, 화성시',yeongcheon:'영천동, 화성시'};
 const destination=names[settings.area]||settings.home;
 $('#map-destination').textContent='동탄역 → '+destination;
 renderBoarding();
 const searchTerm=settings.area==='aileen'?'동탄역에일린의뜰':destination;
 $('#destination-map').href='https://map.kakao.com/link/search/'+encodeURIComponent(searchTerm);
 $('#destination-directions').href='https://map.naver.com/p/search/'+encodeURIComponent(searchTerm);
 $('#bus-search-help').textContent=settings.area==='aileen'?'위 버튼에서 동탄역(서측) 55398의 실제 도착정보를 확인하세요. 206·H2의 운행 방향과 에일린의뜰 경유 여부도 확인해 주세요.':'위 버튼은 선택한 정류장 정보예요. 목적지와 버스 진행 방향에 맞는 승차 정류장을 확인해 주세요.';
 $('#area-map').src='https://www.openstreetmap.org/export/embed.html?bbox=127.075%2C37.182%2C127.110%2C37.209&layer=mapnik';
 $('#map-dialog').showModal();motionDemo.reset({...settings,...pendingMapRoute});pendingMapRoute=null;$('#close-map').focus();
};
$('#close-map').onclick=()=>$('#map-dialog').close();
$('#map-dialog').addEventListener('close',()=>{motionDemo.pause(); $('#area-map').removeAttribute('src');if(mapOpener?.isConnected)mapOpener.focus();});

function renderBoarding(){
 const known=settings.area==='aileen'&&!settings.mapPoint;
 $('#boarding-card').hidden=!known;
 if(!known)return;
 $('#boarding-details').innerHTML='<p><strong>승차: 동탄역(서측) · 55398</strong></p><p>H2 · 병점역후문 방면<br>206 · 린스트라우스.한화 → 에일린의뜰 방향<br>하차: 에일린의뜰.중흥S클래스 · 55405</p><p class="small">두 노선의 정류장 순서를 경기버스 공식 화면에서 2026년 9월 16일 확인했어요. 도착정보와 운행 변경 여부는 탑승 전에 확인하세요.</p>';
 const stop='동탄역 서측 정류장';
 $('#boarding-search').href='https://map.kakao.com/link/search/'+encodeURIComponent(stop);
 $('#boarding-walk').href='https://map.naver.com/p/search/'+encodeURIComponent(stop);
 $('#boarding-origin-note').textContent='검색 결과에서 정류장 번호 55398을 확인한 뒤 도착지로 선택하고, 출발지를 현재 위치로 지정해 도보 길찾기를 시작하세요.';
 if(accessPrefs.stepFree)$('#boarding-origin-note').textContent+=' 계단 없는 경로와 저상버스 탑승 가능 여부는 별도 확인이 필요해요.';
}


commute=setupCommute({getContext:()=>({destination:settings.home,coordinates:destinationFor(settings)?.coordinates,stepFree:accessPrefs.stepFree}),openMap:route=>{if(route)pendingMapRoute={liveRoute:route};$('#open-map').click();},speak:speakAnswer,notify,applyNeeds:needs=>{accessPrefs={...accessPrefs,...needs};try{localStorage.setItem('homebus-access',JSON.stringify(accessPrefs));}catch{}applyAccess();}});

setupNearby();

$('#open-nearby').onclick=()=>{activateView('location');$('#nearby-me').focus();};

function syncSimplePreferences(){
 $('#simple-large').setAttribute('aria-pressed',String(accessPrefs.textSize!=='normal'));
 $('#simple-text').setAttribute('aria-pressed',String(!canSpeak(accessPrefs)));
 $('#simple-sound').setAttribute('aria-pressed',String(canSpeak(accessPrefs)));
 $('#simple-slow').setAttribute('aria-pressed',String($('#commute-pace').value==='slow'));
}
$('#home-edit').onclick=()=>{activateView('settings');$('#home').focus();};
$('#home-preferences').onclick=()=>{syncSimplePreferences();activateView('settings');$('#simple-preferences-title').focus();};
$('#home-voice').onclick=()=>{activateView('voice');($('#voice-mic').disabled?$('#text-question'):$('#voice-mic')).focus();};
$('#preferences-home').onclick=()=>{activateView('route');$('#commute-result').focus();};
$('#simple-large').onclick=()=>{$('#access-textSize').value=accessPrefs.textSize==='normal'?'large':'normal';updateAccess();$('#simple-preferences-status').textContent=accessPrefs.textSize==='normal'?'기본 글씨로 바꿨어요.':'큰 글씨로 바꿨어요.';};
function chooseSimpleAudio(textOnly){
 $('#access-textOnly').checked=textOnly;
 if(!textOnly)$('#access-screenReader').checked=false;
 updateAccess();$('#simple-preferences-status').textContent=textOnly?'소리를 끄고 글로 안내해요.':'안내 듣기 버튼을 누르면 소리로 안내해요.';
}
$('#simple-text').onclick=()=>chooseSimpleAudio(true);
$('#simple-sound').onclick=()=>chooseSimpleAudio(false);
$('#simple-slow').onclick=()=>{
 const slow=$('#commute-pace').value!=='slow';commute.setPace(slow?'slow':'normal');syncSimplePreferences();
 $('#simple-preferences-status').textContent=slow?'천천히 걷기로 설정했어요. 경로 예상 시간에는 개인별 보행 속도가 반영되지 않아요.':'보통 걷는 속도로 설정했어요. 경로 예상 시간에는 개인별 보행 속도가 반영되지 않아요.';
};
$('#commute-options').addEventListener('submit',syncSimplePreferences);
syncSimplePreferences();

// Reference bus catalog stays collapsed until explicitly opened.
