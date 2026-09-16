import {createLocationController} from './location.js';
export function setupNearby(){
 const el=id=>document.getElementById(id);let generation=0,abort,rows=[],shown=5,originLabel='';
 const status=text=>el('nearby-status').textContent=text;
 const reset=()=>{generation++;abort?.abort();rows=[];el('nearby-list').replaceChildren();el('nearby-selected').hidden=true;el('nearby-more').hidden=true;el('nearby-search').hidden=true;el('nearby-panel').removeAttribute('aria-busy');};
 function render(){
  el('nearby-list').replaceChildren();
  for(const stop of rows.slice(0,shown)){
   const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='nearby-stop';
   button.textContent=`${stop.name} · 직선 ${stop.distance}m${stop.ref?' · 번호 '+stop.ref:''}`;
   button.onclick=()=>{
    el('nearby-selected').hidden=false;el('nearby-selected-name').textContent=stop.name;
    el('nearby-detail').textContent=`${originLabel}에서 직선 약 ${stop.distance}m${stop.ref?' · 지도 등록 번호 '+stop.ref:''}. 승차 방향·운행 노선·접근 가능한 보행 경로는 지도에서 추가 확인하세요. 이 선택은 기존 동탄역 버스 추천을 변경하지 않아요.`;
    el('nearby-stop-map').href=`https://www.openstreetmap.org/?mlat=${stop.lat}&mlon=${stop.lon}#map=19/${stop.lat}/${stop.lon}`;
    el('nearby-stop-search').href='https://map.kakao.com/link/search/'+encodeURIComponent(stop.name+' 버스정류장');
    el('nearby-selected').focus();
   };li.append(button);el('nearby-list').append(li);
  }
  el('nearby-more').hidden=shown>=rows.length;
 }
 async function search(lat,lon,label){
  reset();const id=generation;originLabel=label;shown=5;abort=new AbortController();const requestAbort=abort;const timer=setTimeout(()=>requestAbort.abort(),20000);
  el('nearby-panel').setAttribute('aria-busy','true');status(`${label} 반경 800m의 정류소를 찾고 있어요…`);
  const url=new URL('https://www.google.com/maps/search/');url.search=new URLSearchParams({api:'1',query:`버스 정류장 near ${lat.toFixed(4)},${lon.toFixed(4)}`});
  el('nearby-search').href=url.href;el('nearby-search').hidden=false;
  try{
   const response=await fetch('/api/nearby-stops',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat,lon}),signal:requestAbort.signal});
   const data=await response.json();if(!response.ok)throw new Error();if(id!==generation)return;
   rows=data.stops;render();status(rows.length?`${label} 주변 ${rows.length}곳 · 직선거리순 · ${new Date(data.updatedAt).toLocaleTimeString('ko-KR')} 조회`:'반경 800m에서 지도에 등록된 정류소를 찾지 못했어요. 실제 정류소가 없다는 뜻은 아니에요. 지도 검색을 이용해 주세요.');
  }catch{if(id===generation)status('주변 정류소를 불러오지 못했어요. 잠시 후 다시 시도하거나 지도에서 찾아보세요.');}
  finally{clearTimeout(timer);if(id===generation)el('nearby-panel').removeAttribute('aria-busy');}
 }
 const locator=createLocationController({geolocation:navigator.geolocation,secure:window.isSecureContext,onChange(state){
  if(state.status==='loading'){reset();status('내 위치를 확인하고 있어요…');}
  if(state.status==='success'){const p=state.position;if(p.accuracy>800){status('위치 오차가 800m보다 커서 주변을 정확히 찾기 어려워요. 동탄역 주변 찾기 또는 다시 시도해 주세요.');return;}search(p.latitude,p.longitude,`내 위치${p.accuracy>100?' (위치 오차 약 '+Math.round(p.accuracy)+'m)':''}`);}
  if(state.status==='error')status(state.message);
 }});
 el('nearby-me').onclick=()=>locator.locate();
 el('nearby-dongtan').onclick=()=>{locator.clear();search(37.2000,127.0955,'동탄역 중심');};
 el('nearby-clear').onclick=()=>{locator.clear();reset();status('주변 검색 결과와 위치를 지웠어요.');};
 el('nearby-more').onclick=()=>{shown+=5;render();};
 window.addEventListener('pagehide',()=>{locator.clear();reset();});
}
