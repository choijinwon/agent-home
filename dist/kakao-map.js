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
 const el=id=>document.getElementById(id);let map,api,overlays=[],version=0,lastContext={},lastRoute;
 const latLng=point=>new api.LatLng(point[1],point[0]);
 function focus(place){if(!place?.coordinates){el('kakao-status').textContent=(place?.name||'정류장')+' 위치는 아직 확인되지 않았어요.';return;}if(!map)return;map.setCenter(latLng(place.coordinates));map.setLevel(3);el('kakao-status').textContent=place.name+' 위치를 보고 있어요.';}
 async function render(context,route){
  lastContext=context;lastRoute=route;const request=++version;
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
  }catch(error){if(request!==version)return;el('kakao-status').textContent=error.message==='missing'?'카카오지도 연결 준비 중입니다. 3D 지도를 이용해 주세요.':'카카오지도를 불러오지 못했어요. 네트워크 또는 카카오 앱의 사이트 도메인 설정을 확인해 주세요. 3D 지도는 계속 이용할 수 있어요.';el('kakao-retry').hidden=false;}
 }
 el('kakao-retry').onclick=()=>render(lastContext,lastRoute);
 new ResizeObserver(()=>{if(map&&!el('kakao-pane').hidden)map.relayout();}).observe(el('kakao-map'));
 return {render,focus};
}
