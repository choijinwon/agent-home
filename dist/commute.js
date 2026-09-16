import {rankTrips,parseNeeds,tripStages} from './commute-core.js';
export function setupCommute({getContext,openMap,speak,notify,applyNeeds}){
 const el=id=>document.getElementById(id);
 let mode='demo',snapshot=null,error='',loading=false,generation=0,missed=[],stage=-1,selected=null,expiredAnnounced=false,elapsed=0,lastContext='';
 const fixtures=()=>[
  {id:'demo-1',name:'시연 버스 A',eta:7-elapsed,ride:12,lastWalk:4,lowFloor:true,stepFreePath:true},
  {id:'demo-2',name:'시연 버스 B',eta:12-elapsed,ride:10,lastWalk:5,lowFloor:false,stepFreePath:null},
  {id:'demo-3',name:'시연 버스 C',eta:20-elapsed,ride:11,lastWalk:3,lowFloor:true,stepFreePath:true}
 ];
 function options(){return {walkMinutes:Number(el('commute-walk').value),pace:el('commute-pace').value,buffer:Number(el('commute-buffer').value),stepFree:getContext().stepFree,missed};}
 function valid(){return el('commute-options').reportValidity();}
 function ranked(){return mode==='demo'?rankTrips(fixtures(),options()):[];}
 function render(){
  const ctx=getContext();const signature=JSON.stringify(ctx);if(lastContext&&lastContext!==signature){stage=-1;selected=null;el('commute-stage').hidden=true;}lastContext=signature;el('commute-destination').textContent=ctx.destination;
  el('commute-mode-label').textContent=mode==='demo'?'체험 모드 · 가상 버스와 시간':'실시간 조회 · 동탄역 서측 55398';
  el('commute-demo-note').hidden=mode!=='demo';el('commute-tick').hidden=mode!=='demo';
  el('commute-refresh').hidden=mode==='demo';el('commute-refresh').disabled=loading;
  el('commute-refresh').textContent=loading?'조회 중…':'도착정보 새로고침';
  el('commute-refresh').setAttribute('aria-busy',String(loading));
  const stale=snapshot&&Date.now()-snapshot.updatedAt>120000;
  el('commute-updated').textContent=snapshot?`${mode==='demo'?'시연 시작':'최근 수신'}: ${new Date(snapshot.updatedAt).toLocaleTimeString('ko-KR')}${stale&&mode==='live'?' · 2분이 지나 오래된 정보예요':''}`:'최근 수신: 아직 없음';
  el('commute-error').textContent=error;
  const result=el('commute-result');result.replaceChildren();result.hidden=stage>=0;
  let alternatives=null;
  if(mode==='demo'){
   const rows=ranked();
   if(!rows.length){result.textContent='현재 이동 조건으로 탈 수 있는 시연 버스가 없어요. 더 늦은 버스를 확인하려면 시연을 다시 시작하세요.';}
   for(const [i,r] of rows.entries()){
    const card=document.createElement('article');card.className='commute-bus';
    const title=document.createElement('h3');title.textContent=`${i===0?'추천 · ':''}${r.name} · ${r.eta}분 후`;
    const reason=document.createElement('p');reason.textContent=`정류장까지 ${r.walk}분 + 여유 ${options().buffer}분. ${r.leaveIn}분 안에 출발하는 시연이에요. 전체 ${r.total}분.`;
    const access=document.createElement('p');access.className='small';access.textContent=`시연 접근성: ${r.lowFloor?'저상버스':'일반버스'} · ${r.stepFreePath===true?'계단 없는 경로 가정':'보행 접근성 미확인'}`;
    const start=document.createElement('button');start.className='primary';start.type='button';start.textContent='이 버스로 안내 시작';start.onclick=()=>{selected={...r,destination:ctx.destination};stage=0;renderStage();el('commute-stage-title').focus();};
    card.append(title,reason,access,start);if(i===0)result.append(card);else{if(!alternatives){alternatives=document.createElement('details');const summary=document.createElement('summary');summary.textContent='다른 시연 버스 보기';alternatives.append(summary);result.append(alternatives);}alternatives.append(card);}
   }
  }else if(snapshot){
   if(!snapshot.arrivals.length)result.textContent='제공된 도착정보가 없어요. 운행 종료 여부는 공식 화면에서 확인하세요.';
   for(const r of snapshot.arrivals){
    const card=document.createElement('p');card.className='commute-bus';card.textContent=`${r.name} · ${r.direction} · ${stale?'이전 조회 ':''}${r.eta}분 후 · ${r.lowFloor===null?'저상 여부 미확인':r.lowFloor?'저상버스':'일반 차량'}`;result.append(card);
   }
  }else if(!error)result.textContent=loading?'공식 도착정보를 조회하고 있어요.':'새로고침을 눌러 조회하세요.';
  el('commute-live-note').hidden=mode!=='live';
  el('commute-missed').disabled=mode!=='demo'||!ranked().length||stage>=2;
  el('commute-access').textContent=ctx.stepFree?'계단 없는 이동 필요 · 실제 보행 경로·승강기·탑승 공간은 미확인입니다. 체험 모드에서는 검증된 것으로 가정한 시연 경로만 보여줘요.':'실제 접근성 정보: 정류장 보행 경로·승강기·휠체어 탑승 공간 미확인. 저상버스 정보가 있어도 전체 경로 이용 가능을 뜻하지 않아요.';
 }
 async function refresh(){
  if(mode!=='live')return;
  const token=++generation;loading=true;error='';render();
  try{
   const response=await fetch('/api/arrivals',{signal:AbortSignal.timeout(12000)});const body=await response.json();
   if(token!==generation)return;
   if(!response.ok)throw new Error(body.error==='not_configured'?'실시간 인증키가 아직 연결되지 않았어요. 아래 경기버스 공식 화면에서 확인하거나 체험 모드를 이용하세요.':'도착정보 조회 실패. 잠시 후 다시 시도하세요.');
   if(body.mode!=='live'||!Array.isArray(body.arrivals)||!Number.isFinite(body.updatedAt))throw new Error('응답을 확인할 수 없어요. 다시 조회해 주세요.');
   snapshot=body;expiredAnnounced=false;
  }catch(e){if(token===generation)error=e.name==='TimeoutError'?'조회 시간이 초과됐어요. 다시 시도해 주세요.':e.message;}
  finally{if(token===generation){loading=false;render();}}
 }
 function renderStage(){
  const panel=el('commute-stage');panel.hidden=stage<0;if(stage<0)return;
  const item=tripStages[stage];el('commute-stage-title').textContent=`${stage+1}/6 · ${item.title}`;
  el('commute-stage-body').textContent=`시연 ${selected.name} → ${selected.destination}. ${item.body}`;
  el('commute-stage-next').textContent=item.button;
  el('commute-stage-back').disabled=stage===0;
  render();
 }
 function miss(){
  if(mode!=='demo'||stage>=2)return;
  const r=selected||ranked()[0];if(!r)return;
  missed.push(r.id);selected=null;stage=-1;renderStage();render();
  const next=ranked()[0];notify(next?`시연: ${r.name} 대신 ${next.name}, ${next.eta}분 후 도착으로 바꿨어요.`:'조건에 맞는 다음 시연 버스가 없어요.');
 }
 function reset(){generation++;mode='demo';loading=false;el('commute-mode').value='demo';snapshot={updatedAt:Date.now()};elapsed=0;missed=[];selected=null;stage=-1;error='';renderStage();render();}
 el('commute-mode').onchange=()=>{generation++;loading=false;mode=el('commute-mode').value;snapshot=null;error='';selected=null;stage=-1;renderStage();render();if(mode==='live')refresh();else reset();};
 el('commute-refresh').onclick=refresh;el('commute-reset').onclick=reset;
 el('commute-options').onsubmit=e=>{e.preventDefault();if(valid()){stage=-1;selected=null;renderStage();render();notify('이동 조건으로 추천을 다시 계산했어요.');}};
 el('commute-missed').onclick=miss;
 el('commute-tick').onclick=()=>{elapsed++;render();};
 el('commute-map').onclick=openMap;
 el('commute-stage-next').onclick=()=>{if(stage===5){reset();return;}stage++;renderStage();notify('시연: '+tripStages[stage].title);};
 el('commute-stage-back').onclick=()=>{stage=Math.max(0,stage-1);renderStage();};
 el('commute-stage-stop').onclick=()=>{stage=-1;selected=null;renderStage();render();el('commute-missed').focus();};
 el('commute-stage-read').onclick=()=>speak(el('commute-stage-body').textContent);
 function handleText(text){
  const needs=parseNeeds(text);
  if(needs.pace)el('commute-pace').value=needs.pace;
  if(needs.stepFree)applyNeeds({stepFree:true});
  if(needs.action==='missed'){miss();}
  else{stage=-1;selected=null;renderStage();render();}
  const changed=Object.keys(needs).length;
  el('commute-chat-answer').textContent=changed?'규칙 기반 체험: '+[needs.pace==='slow'?'천천히 걷기로 반영했어요.':'',needs.stepFree?'계단 없는 이동이 필요하도록 반영했어요. 실제 이용 가능 여부는 미확인입니다.':'',needs.action==='missed'?'다음 버스 조건을 확인했어요.':''].join(' '):'AI 대화는 아직 연결되지 않았어요. “천천히 걸어요”, “계단은 어려워요”, “버스를 놓쳤어요”를 입력하거나 이동 조건을 직접 선택하세요.';
  return Boolean(changed);
 }
 el('commute-chat').onsubmit=e=>{e.preventDefault();handleText(el('commute-text').value);};
 const timer=setInterval(()=>{if(mode==='live'&&snapshot&&Date.now()-snapshot.updatedAt>120000&&!expiredAnnounced){expiredAnnounced=true;render();}},15000);
 window.addEventListener('pagehide',()=>{clearInterval(timer);generation++;});
 reset();return {render,handleText,reset};
}
