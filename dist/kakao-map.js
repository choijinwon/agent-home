import {routeForDestination} from './transit-map.js';
import {places,destinationFor} from './map-places.js';
let sdkPromise;
function loadSDK(){
 if(globalThis.kakao?.maps?.Map)return Promise.resolve(globalThis.kakao.maps);
 if(sdkPromise)return sdkPromise;
 sdkPromise=(async()=>{
  const response=await fetch('/api/map-config',{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('config');
  const {kakaoJavaScriptKey:key}=await response.json();
  if(!key)throw new Error('missing');
  return new Promise((resolve,reject)=>{
   const script=document.createElement('script');let settled=false;
   const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=script.onerror=null;if(error){script.remove();reject(error);}else resolve(globalThis.kakao.maps);};
   const timer=setTimeout(()=>finish(new Error('sdk')),15000);
   script.src='https://dapi.kakao.com/v2/maps/sdk.js?'+new URLSearchParams({appkey:key,autoload:'false'});
   script.async=true;script.onerror=()=>finish(new Error('sdk'));
   script.onload=()=>{if(!globalThis.kakao?.maps?.load){finish(new Error('sdk'));return;}globalThis.kakao.maps.load(()=>finish(globalThis.kakao.maps.Map?null:new Error('sdk')));};
   document.head.append(script);
  });
 })().catch(error=>{sdkPromise=null;throw error;});return sdkPromise;
}
export function setupKakaoMap(){
 const el=id=>document.getElementById(id);let routeLines=[],routeRequest=0,routeAbort;
 let map,api,overlays=[],version=0,lastContext={},lastRoute;
 const latLng=point=>new api.LatLng(point[1],point[0]);
 function focus(place){if(!place?.coordinates){el('kakao-status').textContent=(place?.name||'정류장')+' 위치는 아직 확인되지 않았어요.';return;}if(!map)return;map.setCenter(latLng(place.coordinates));map.setLevel(3);el('kakao-status').textContent=place.name+' 위치를 보고 있어요.';}
 async function render(context,route){
  lastContext=context;lastRoute=route;const request=++version;
  clearRoutes();
  el('kakao-status').textContent='카카오지도를 불러오고 있어요…';el('kakao-retry').hidden=true;
  try{
   api=await loadSDK();if(request!==version||el('kakao-pane').hidden)return;
   if(!map){map=new api.Map(el('kakao-map'),{center:latLng(places[0].coordinates),level:5});map.addControl(new api.ZoomControl(),api.ControlPosition.RIGHT);}
   map.relayout();for(const overlay of overlays)overlay.setMap(null);overlays=[];
   const stops=routeForDestination(context,route),destination=destinationFor(context);
   const points=[{...places[0],label:'출발 · 동탄역'},...(stops||[]).filter(s=>s.coordinates).map(s=>({...s,label:(s===stops[0]?'승차 · ':s===stops.at(-1)?'하차 · ':'경유 · ')+s.name+' '+s.number})),...(destination?[{...destination,label:'목적지 · '+destination.name}]:[])];
   const bounds=new api.LatLngBounds();
   for(const point of points){const position=latLng(point.coordinates);bounds.extend(position);const button=document.createElement('button');button.type='button';button.className='kakao-pin';button.textContent=point.label;button.onclick=()=>focus(point);const overlay=new api.CustomOverlay({position,content:button,yAnchor:1.2});overlay.setMap(map);overlays.push(overlay);}
   map.setBounds(bounds,60,65,60,65);
   el('kakao-status').textContent=stops?route+' · 승차 '+stops[0].name+' → 하차 '+stops.at(-1).name+(stops.every(s=>s.coordinates)?' · 확인된 정류장 위치를 표시했어요.':' · 위치가 확인된 정류장만 표시했어요.'):'출발지와 목적지 위치입니다. 이 목적지의 버스 경로는 아직 확인되지 않았어요.';
   if(context.liveRoute){showRoute(context.liveRoute,null);el('real-routing-status').textContent='첫 화면에서 선택한 경로 · 예상 '+Math.ceil(context.liveRoute.seconds/60)+'분 · 환승 '+context.liveRoute.transfers+'회. 실시간 도착정보는 미확인입니다.';}
  }catch(error){if(request!==version)return;el('kakao-status').textContent=error.message==='missing'?'카카오지도 연결 준비 중입니다. 3D 지도를 이용해 주세요.':'카카오지도를 불러오지 못했어요. 네트워크 또는 카카오 앱의 사이트 도메인 설정을 확인해 주세요. 3D 지도는 계속 이용할 수 있어요.';el('kakao-retry').hidden=false;}
 }
 function clearRoutes(){routeRequest++;routeAbort?.abort();for(const line of routeLines)line.setMap(null);routeLines=[];el('real-routing-options').replaceChildren();el('fetch-real-routes').disabled=false;el('real-routing-status').textContent='카카오맵에서 실제 경로와 예상 소요 시간을 조회합니다. 실시간 버스 도착 시간은 포함하지 않아요.';}
 function showRoute(route,button){
  if(!map||!api)return;
  for(const overlay of overlays)overlay.setMap(null);overlays=[];
  for(const line of routeLines)line.setMap(null);routeLines=[];const bounds=new api.LatLngBounds();let count=0;
  for(const step of route.steps){if(step.points.length<2)continue;const path=step.points.map(p=>{const pos=latLng(p);bounds.extend(pos);count++;return pos;});const line=new api.Polyline({map,path,strokeWeight:6,strokeColor:step.type==='WALKING'?'#596b79':'#166eae',strokeOpacity:.9,strokeStyle:step.type==='WALKING'?'shortdash':'solid'});routeLines.push(line);}
  if(count)map.setBounds(bounds,60,60,60,60);
  for(const b of el('real-routing-options').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));
  el('kakao-status').textContent=route.steps.map(s=>s.guidance).filter(Boolean).join(' → ')+(count?' · 파란 실선: 교통수단 / 회색 점선: 도보':' · 지도 경로 좌표 없음');
 }
 el('fetch-real-routes').onclick=async()=>{
  const destination=destinationFor(lastContext);if(!destination){el('real-routing-status').textContent='목적지 위치를 먼저 지정해 주세요.';return;}
  const id=++routeRequest;routeAbort?.abort();routeAbort=new AbortController();el('fetch-real-routes').disabled=true;el('real-routing-status').textContent='실제 버스 경로를 조회하고 있어요…';
  try{
   const response=await fetch('/api/routes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from:places[0].coordinates,to:destination.coordinates}),signal:routeAbort.signal});const data=await response.json();if(id!==routeRequest)return;if(!response.ok)throw new Error(data.message||'경로 조회에 실패했어요.');
   el('real-routing-options').replaceChildren();
   el('real-routing-status').textContent=data.routes.length?data.routes.length+'개 경로 · '+new Date(data.updatedAt).toLocaleTimeString('ko-KR')+' 조회 · 예상 소요 시간이며 버스 실시간 도착·탑승 가능 여부는 미확인입니다. 지도는 아래에서 선택한 조회 경로를 표시합니다.':'조회 가능한 경로가 없어요. 목적지를 확인해 주세요.';
   data.routes.forEach((route,index)=>{const b=document.createElement('button');b.type='button';b.className='secondary';b.setAttribute('aria-pressed','false');const lines=[...new Set(route.steps.flatMap(s=>s.vehicles))];b.textContent=(lines.join(' · ')||'이동 경로')+' / 약 '+Math.ceil(route.seconds/60)+'분 / 환승 '+route.transfers+'회';b.onclick=()=>showRoute(route,b);el('real-routing-options').append(b);if(index===0)showRoute(route,b);});
  }catch(error){if(id===routeRequest&&error.name!=='AbortError')el('real-routing-status').textContent=error.message;}
  finally{if(id===routeRequest)el('fetch-real-routes').disabled=false;}
 };
 el('kakao-retry').onclick=()=>render(lastContext,lastRoute);
 new ResizeObserver(()=>{if(map&&!el('kakao-pane').hidden)map.relayout();}).observe(el('kakao-map'));
 return {render,focus};
}
