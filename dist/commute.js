import {parseNeeds} from './commute-core.js';
import {rankRouteChoices,routeVehicleGroups,routeVehicleSummary,routeTransferLabel,routeMinutes} from './route-choice.js';
export function setupCommute({getContext,openMap,speak,notify,applyNeeds}){
 const el=id=>document.getElementById(id);
 let mode='routes',snapshot=null,error='',loading=false,generation=0,expiredAnnounced=false,lastContext='';
 let routePreference='transfers',selectedRealIndex=null;
 function realChoice(){
  if(mode!=='routes'||!snapshot?.routes?.length)return null;
  const choices=rankRouteChoices(snapshot.routes,routePreference);
  return choices.find(item=>item.index===selectedRealIndex)||choices[0];
 }
 function node(tag,className,text){const item=document.createElement(tag);if(className)item.className=className;if(text!==undefined)item.textContent=text;return item;}
 function renderReal(){
  const result=el('commute-result'),other=el('commute-alternatives');result.replaceChildren();
  el('commute-mode-label').textContent='실제 경로 · 카카오맵';
  el('home-data-note').textContent='예상 소요 시간 · 실시간 도착정보 미포함';
  el('commute-refresh').hidden=false;el('commute-refresh').textContent=loading?'조회 중…':'실제 경로 새로고침';
  el('commute-missed').disabled=loading;el('commute-missed').textContent='경로 다시 찾기';
  if(error){result.append(node('p','route-empty','경로를 불러오지 못했어요. 다시 찾거나 지도에서 길찾기를 확인해 주세요.'));return;}
  if(loading){result.append(node('p','route-empty','집까지 갈 수 있는 경로를 찾고 있어요…'));return;}
  if(!snapshot){result.append(node('p','route-empty','실제 경로 새로고침을 눌러 주세요.'));return;}
  if(!snapshot.routes.length){result.append(node('p','route-empty','조회된 경로가 없어요. 목적지 위치를 확인해 주세요.'));return;}
  const preferences=node('div','route-preferences');preferences.setAttribute('role','group');preferences.setAttribute('aria-label','경로 정렬 기준');
  for(const [value,label] of [['transfers','환승 적게'],['fastest','빠르게']]){
   const button=node('button','route-preference',label);button.type='button';button.dataset.routePreference=value;button.setAttribute('aria-pressed',String(routePreference===value));
   button.onclick=()=>{routePreference=value;selectedRealIndex=null;render();result.querySelector(`[data-route-preference="${value}"]`)?.focus();};preferences.append(button);
  }
  result.append(preferences);
  const choices=rankRouteChoices(snapshot.routes,routePreference),choice=realChoice(),route=choice.route;selectedRealIndex=choice.index;
  const card=node('article','commute-bus route-hero');
  const eyebrow=node('p','route-eyebrow',choice.index!==choices[0].index?'직접 선택한 경로':routePreference==='fastest'?'예상 시간이 가장 짧아요':route.transfers===0?'갈아타지 않고 집으로':'환승이 가장 적어요');
  const title=node('h3','route-duration');title.id='selected-route-title';title.tabIndex=-1;title.append(node('span','','약 '),node('strong','',routeMinutes(route)),node('span','','분'));
  card.setAttribute('aria-labelledby',title.id);
  const meta=node('p','route-meta',routeTransferLabel(route)+(Number.isFinite(route.distance)?' · '+(route.distance>=1000?(route.distance/1000).toFixed(1)+'km':Math.round(route.distance)+'m'):'')+' · 전체 이동 예상');
  card.append(eyebrow,title,meta);
  const groups=routeVehicleGroups(route),legs=node('div','route-legs');if(groups.length===1)card.classList.add('route-hero-single');legs.setAttribute('aria-label','탑승 순서');
  groups.forEach((vehicles,index)=>{const leg=node('div','route-leg');leg.append(node('span','route-step-label',groups.length>1?`${index+1}번째 탑승`:'타고 갈 버스'),node('strong','route-leg-vehicles',vehicles.join(' 또는 ')));legs.append(leg);});
  if(groups.length)card.append(legs);
  const actions=node('div','route-actions');
  const mapButton=node('button','primary','경로 지도 보기');mapButton.type='button';mapButton.onclick=()=>openMap(route);
  const read=node('button','secondary','경로 듣기');read.type='button';read.onclick=()=>speak('예상 '+routeMinutes(route)+'분. '+routeTransferLabel(route)+'. '+route.steps.map(s=>s.guidance).filter(Boolean).join('. ')+'. 버스 도착 시간과 계단 없는 이동 가능 여부는 확인되지 않았어요.');
  actions.append(mapButton,read);card.append(actions);
  const guidance=node('details','route-guidance');guidance.append(node('summary','','승차·하차 순서 보기'));
  const timeline=node('ol','route-timeline');
  route.steps.forEach((step,index)=>{
   const item=node('li','route-step'),vehicles=[...new Set((step.vehicles||[]).filter(Boolean))];
   const heading=vehicles.length?vehicles.join(' 또는 '):/^WALK/i.test(step.type||'')?'걸어서 이동':'이동 안내';
   item.append(node('strong','route-step-label',heading),node('p','',step.guidance||'이 구간의 자세한 안내가 제공되지 않았어요.'));
   if(Number.isFinite(step.seconds)&&step.seconds>0)item.append(node('span','small','예상 '+Math.ceil(step.seconds/60)+'분'));
   timeline.append(item);
  });
  guidance.append(timeline,node('p','small','도보 구간이 생략될 수 있어요. 정류장까지의 보행 경로와 계단·엘리베이터는 별도 확인해 주세요.'));card.append(guidance);
  if(getContext().stepFree)card.append(node('p','route-access-note','계단 없는 이동 가능 여부는 아직 확인되지 않았어요. 이 경로의 승강기와 탑승 공간을 먼저 확인해 주세요.'));
  result.append(card);
  const alternatives=choices.filter(item=>item.index!==choice.index);
  if(!alternatives.length){other.append(node('p','small','현재 조회된 경로는 1개예요.'));return;}
  other.append(node('p','route-comparison-note',`다른 경로 ${alternatives.length}개 · ${routePreference==='fastest'?'예상 시간이 짧은 순서':'환승이 적은 순서'}`));
  const extra=node('details','route-other-options');extra.append(node('summary','',`나머지 경로 ${Math.max(0,alternatives.length-3)}개 보기`));
  alternatives.forEach((item,index)=>{
   const option=node('button','route-option');option.type='button';option.setAttribute('aria-pressed','false');
   option.setAttribute('aria-label',`이 경로 선택: 약 ${routeMinutes(item.route)}분, ${routeTransferLabel(item.route)}, ${routeVehicleSummary(item.route)}`);
   const heading=node('span','route-option-heading');heading.append(node('strong','route-option-time','약 '+routeMinutes(item.route)+'분'),node('span','route-option-meta',routeTransferLabel(item.route)));
   option.append(heading,node('span','route-option-buses',routeVehicleSummary(item.route)),node('span','route-option-action','이 경로 선택 →'));
   option.onclick=()=>{selectedRealIndex=item.index;render();el('selected-route-title')?.focus();};
   (index<3?other:extra).append(option);
  });
  if(alternatives.length>3)other.append(extra);
 }

 function render(){
  const ctx=getContext(),signature=JSON.stringify(ctx);
  if(lastContext&&lastContext!==signature&&mode==='routes'){generation++;snapshot=null;selectedRealIndex=null;error='';loading=false;queueMicrotask(refresh);}
  lastContext=signature;el('commute-destination').textContent=ctx.destination;el('portal-destination').textContent=ctx.destination;
  el('commute-mode-label').textContent='실시간 조회 · 동탄역 서측';
  el('home-data-note').textContent='서측 정류장 도착정보 · 목적지별 경로 추천과 별도';
  el('commute-refresh').disabled=loading;el('commute-refresh').textContent=loading?'조회 중…':'도착정보 새로고침';
  el('commute-refresh').setAttribute('aria-busy',String(loading));
  const stale=snapshot&&Date.now()-snapshot.updatedAt>120000;
  el('commute-updated').textContent=snapshot?`최근 수신: ${new Date(snapshot.updatedAt).toLocaleTimeString('ko-KR')}${stale&&mode==='live'?' · 2분이 지나 오래된 정보예요':''}`:'최근 수신: 아직 없음';
  el('commute-error').textContent=error;
  const result=el('commute-result'),other=el('commute-alternatives');result.replaceChildren();other.replaceChildren();
  if(mode==='live'&&snapshot){
   if(!snapshot.arrivals.length)result.textContent='제공된 도착정보가 없어요. 운행 종료 여부는 공식 화면에서 확인하세요.';
   if(snapshot.arrivals.length)result.textContent='정류장 도착정보를 받았어요. 아래 목록에서 확인하세요.';
   for(const r of snapshot.arrivals){
    const card=node('p','commute-bus',`${r.name} · ${r.direction} · ${stale?'이전 조회 ':''}${r.eta}분 후 · ${r.lowFloor===null?'저상 여부 미확인':r.lowFloor?'저상버스':'일반 차량'}`);other.append(card);
   }
  }else if(!error)result.textContent=loading?'공식 도착정보를 조회하고 있어요.':'새로고침을 눌러 조회하세요.';
  el('commute-live-note').hidden=mode!=='live';
  el('commute-missed').textContent='다시 조회';el('commute-missed').disabled=loading;
  el('commute-access').textContent=ctx.stepFree?'계단 없는 이동 필요 · 실제 보행 경로·승강기·탑승 공간은 미확인입니다.':'정류장 보행 경로·승강기·휠체어 탑승 공간은 미확인입니다. 저상버스 정보만으로 전체 경로 이용 가능 여부를 판단할 수 없어요.';
  if(mode==='routes')renderReal();
  const route=realChoice()?.route;
  el('route-status').textContent=loading?'경로를 조회하고 있어요.':error|| (route?`선택한 실제 경로: 약 ${routeMinutes(route)}분, ${routeTransferLabel(route)}, ${routeVehicleSummary(route)}. 실시간 버스 도착정보는 포함하지 않아요.`:'현재 조회된 경로가 없어요.');
 }
 async function refresh(){
  if(mode==='routes'){
   const token=++generation;loading=true;error='';snapshot=null;selectedRealIndex=null;render();
   try{const to=getContext().coordinates;if(!to)throw new Error('목적지 위치를 먼저 지정해 주세요.');
    const response=await fetch('/api/routes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from:[127.0955764,37.2003594],to}),signal:AbortSignal.timeout(15000)});const body=await response.json();if(token!==generation)return;
    if(!response.ok)throw new Error(body.message||'경로 조회 실패');if(!Array.isArray(body.routes))throw new Error('경로 응답을 확인할 수 없어요.');snapshot={...body,routes:[...body.routes].sort((a,b)=>a.seconds-b.seconds)};
   }catch(e){if(token===generation)error=e.name==='TimeoutError'?'조회 시간이 초과됐어요. 다시 시도해 주세요.':e.message;}
   finally{if(token===generation){loading=false;render();}}return;
  }
  if(mode!=='live')return;
  const token=++generation;loading=true;error='';render();
  try{
   const response=await fetch('/api/arrivals',{signal:AbortSignal.timeout(12000)});const body=await response.json();
   if(token!==generation)return;
   if(!response.ok)throw new Error(body.error==='not_configured'?'실시간 도착정보가 아직 연결되지 않았어요. 카카오 실제 경로를 이용하거나 경기버스 공식 화면에서 도착 시간을 확인해 주세요.':'도착정보 조회 실패. 잠시 후 다시 시도하세요.');
   if(body.mode!=='live'||!Array.isArray(body.arrivals)||!Number.isFinite(body.updatedAt))throw new Error('응답을 확인할 수 없어요. 다시 조회해 주세요.');
   snapshot=body;expiredAnnounced=false;
  }catch(e){if(token===generation)error=e.name==='TimeoutError'?'조회 시간이 초과됐어요. 다시 시도해 주세요.':e.message;}
  finally{if(token===generation){loading=false;render();}}
 }
 function miss(){refresh();notify(mode==='routes'?'실제 경로를 다시 조회해요. 놓친 버스의 다음 도착 시간은 아직 확인할 수 없어요.':'정류장 도착정보를 다시 조회해요.');}
 el('commute-mode').onchange=()=>{generation++;loading=false;mode=el('commute-mode').value==='live'?'live':'routes';snapshot=null;selectedRealIndex=null;error='';render();refresh();};
 el('commute-refresh').onclick=refresh;
 el('commute-options').onsubmit=e=>{e.preventDefault();if(el('commute-options').reportValidity()){render();notify('이동 조건을 기록했어요. 카카오 경로의 예상 시간에는 개인별 보행 속도가 반영되지 않아요.');}};
 el('commute-missed').onclick=miss;
 el('commute-map').onclick=()=>openMap(realChoice()?.route);
 function handleText(text){
  const needs=parseNeeds(text);
  if(needs.pace)el('commute-pace').value=needs.pace;
  if(needs.stepFree)applyNeeds({stepFree:true});
  if(needs.action==='missed'){miss();}
  else render();
  const changed=Object.keys(needs).length;
  el('commute-chat-answer').textContent=changed?[needs.pace?'걷는 속도 설정을 기록했어요. 경로 예상 시간에는 반영되지 않아요.':'',needs.stepFree?'계단 없는 이동이 필요하도록 설정했어요. 실제 이용 가능 여부는 미확인입니다.':'',needs.action==='missed'?'실제 정보를 다시 조회해요. 놓친 버스의 다음 도착 시간은 아직 확인할 수 없어요.':''].filter(Boolean).join(' '):'AI 대화는 아직 연결되지 않았어요. “천천히 걸어요”, “계단은 어려워요”, “버스를 놓쳤어요”를 입력하거나 이동 조건을 직접 선택하세요.';
  if(changed)speak(el('commute-chat-answer').textContent);
  return Boolean(changed);
 }
 el('commute-chat').onsubmit=e=>{e.preventDefault();handleText(el('commute-text').value);};
 const timer=setInterval(()=>{if(mode==='live'&&snapshot&&Date.now()-snapshot.updatedAt>120000&&!expiredAnnounced){expiredAnnounced=true;render();}},15000);
 window.addEventListener('pagehide',()=>{clearInterval(timer);generation++;});
 el('commute-mode').value='routes';render();queueMicrotask(refresh);return {render,handleText,refresh,getRoute:()=>realChoice()?.route||null,setPace(pace){el('commute-pace').value=pace==='slow'?'slow':'normal';render();}};
}
