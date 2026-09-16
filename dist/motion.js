import {homeBusRoutes,routeForDestination,stopConnections,routeBounds} from './transit-map.js';
import {places as basePlaces,apartmentBoundary,destinationFor} from './map-places.js';
export function setupMotionDemo(reducedPreference,onSaveDestination){
 const el=id=>document.getElementById(id),system=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>reducedPreference()||system.matches;
 let map=null,loading=null,ready=false,timer,loadTimer,touring=false,generation=0,area='aileen',selected=0,pitched=true,markers=[],destination=null,context={},picking=false;
 let routeMarkers=[],mapLibrary=null,selectedRoute='H2';
 let places=basePlaces.map(p=>({...p,coordinates:[...p.coordinates]}));
 function stopPicking(){picking=false;el('destination-crosshair').hidden=true;el('destination-confirm').hidden=true;el('destination-pick').hidden=false;}
 function updateDestination(){
  destination=destinationFor(context);places[2]=destination?{...destination,id:'home'}:{...basePlaces[2]};
  el('real-place-home').hidden=!destination;el('real-place-home').textContent=(routeForDestination(context,selectedRoute)?'④ ':'③ ')+(destination?.name||'목적지');
  el('destination-map-note').textContent=destination?.note||'지도에서 목적지 위치를 직접 지정해 주세요.';
  el('real-map-context').textContent='동탄역 → '+(destination?.name||context.home||'내 목적지');
  if(markers[2]){markers[2].setLngLat(places[2].coordinates);markers[2].getElement().hidden=!destination;markers[2].getElement().setAttribute('aria-label',places[2].name+' 위치 보기');}
  updateTransitRoute();
  if(ready)for(const id of ['home-area','home-outline'])map.setLayoutProperty(id,'visibility',area==='aileen'&&!destination?.custom?'visible':'none');
 }
 function selectRoute(id){
  selectedRoute=id;const route=homeBusRoutes.find(r=>r.id===id)||homeBusRoutes[0];
  el('transit-route-direction').textContent=route.id+' · '+route.direction;
  el('transit-route-official').href=route.url;
  el('transit-arrivals-link').href='https://m.gbis.go.kr/station/'+route.stationId;
  el('transit-route-summary').textContent=route.stops[0].name+' '+route.stops[0].number+' 승차 → '+(route.stops.length-1)+'개 정류장 이동 → 55405 하차';
  el('transit-map-legend').textContent=route.stops.every(s=>s.coordinates)?'┄ 정류장 연결선 · 실제 도로 경로 아님':'경유 위치 일부 미확인 · 연결선 미표시';
  el('transit-map-title').textContent='확인한 귀가 버스 '+homeBusRoutes.length+'개';
  if(routeForDestination(context,selectedRoute))el('bus-search-help').textContent=route.id+' 탑승: '+route.stops[0].name+' '+route.stops[0].number+'. 위 공식 도착정보에서 운행 여부를 확인하세요.';
  for(const button of document.querySelectorAll('[data-home-route]'))button.setAttribute('aria-pressed',String(button.dataset.homeRoute===route.id));
 }
 function focusStop(stop,index){
  pause();if(!map)return;if(!stop.coordinates){status(stop.name+' '+stop.number+' · 경유 순서는 확인했지만 지도 위치는 아직 미확인이에요.');return;}
  map.easeTo({center:stop.coordinates,zoom:17,pitch:pitched?45:0,duration:reduced()?0:1000});
  status((index===0?'승차':index===(routeForDestination(context,selectedRoute)?.length||0)-1?'하차':index+'번째 경유')+' · '+stop.name+' · 정류장 '+stop.number);
  el('real-map').scrollIntoView({block:'center',behavior:'instant'});
 }
 function showAll(){
  if(!map)return;
  map.fitBounds(routeBounds(context,destination,places[0].coordinates,selectedRoute),{padding:{top:65,bottom:55,left:45,right:45},pitch:0,bearing:0,duration:reduced()?0:900,maxZoom:16});
  pitched=false;el('real-map-flat').textContent='3D로 보기';el('real-map-flat').setAttribute('aria-pressed','true');
  status(routeForDestination(context,selectedRoute)?el('transit-route-summary').textContent+'. '+el('transit-map-legend').textContent:'선택한 출발지와 목적지 위치예요. 이 목적지의 버스 경로는 아직 확인되지 않았어요.');
 }
 function updateTransitRoute(){
  const stops=routeForDestination(context,selectedRoute),known=Boolean(stops);
  el('transit-map-known').hidden=!known;el('transit-map-unavailable').hidden=known;
  for(const id of ['transit-map-legend','transit-stop-details','transit-alight','transit-map-extras'])el(id).hidden=!known;
  el('transit-stop-list').replaceChildren();selectRoute(selectedRoute);
  for(const marker of routeMarkers)marker.remove();routeMarkers=[];
  if(markers[2])markers[2].getElement().textContent=known?'4':'3';
  if(markers[1])markers[1].getElement().hidden=!known;
  document.querySelector('[data-real-place="1"]').hidden=!known;
  if(ready)map.getSource('bus-stop-connections')?.setData(stopConnections(context,selectedRoute));
  if(!stops)return;
  places[1]={...stops[0],id:'stop'};
  if(markers[1]){markers[1].setLngLat(stops[0].coordinates);markers[1].getElement().setAttribute('aria-label',stops[0].name+' '+stops[0].number+' 승차 위치 보기');}
  document.querySelector('[data-real-place="1"]').textContent='② '+stops[0].name;
  el('boarding-card').hidden=false;
  const route=homeBusRoutes.find(r=>r.id===selectedRoute);
  const detail=document.createElement('p');detail.textContent=selectedRoute+' · '+route.direction+' / 승차 '+stops[0].name+' '+stops[0].number+' → 하차 '+stops.at(-1).name+' '+stops.at(-1).number;
  el('boarding-details').replaceChildren(detail);
  const query=encodeURIComponent(stops[0].name+' '+stops[0].number);
  el('boarding-search').href='https://map.kakao.com/link/search/'+query;
  el('boarding-walk').href='https://map.naver.com/p/search/'+query;
  el('boarding-origin-note').textContent='정류장 번호 '+stops[0].number+'와 '+route.direction+'인지 확인하세요. 도보 경로와 출입구는 미확인입니다.';
  stops.forEach((stop,index)=>{
   const item=document.createElement('li'),button=document.createElement('button'),label=document.createElement('strong'),number=document.createElement('span');
   button.type='button';label.textContent=(index===0?'승차 · ':index===(routeForDestination(context,selectedRoute)?.length||0)-1?'하차 · ':index+'. ')+stop.name;number.textContent=stop.number+(stop.coordinates?'':' · 위치 미확인');
   button.append(label,number);button.onclick=()=>focusStop(stop,index);item.append(button);el('transit-stop-list').append(item);
   if(!mapLibrary||index===0||!stop.coordinates)return;
   const pin=document.createElement('button');pin.type='button';pin.className=index===(routeForDestination(context,selectedRoute)?.length||0)-1?'real-map-pin pin-alight':'transit-waypoint';pin.textContent=index===(routeForDestination(context,selectedRoute)?.length||0)-1?'3':'•';pin.setAttribute('aria-label',(index===(routeForDestination(context,selectedRoute)?.length||0)-1?'하차 정류장 ':index+'번째 경유 정류장 ')+stop.name+' '+stop.number);pin.onclick=()=>focusStop(stop,index);
   routeMarkers.push(new mapLibrary.Marker({element:pin,anchor:index===(routeForDestination(context,selectedRoute)?.length||0)-1?'bottom':'center'}).setLngLat(stop.coordinates).addTo(map));
  });
 }
 for(const button of document.querySelectorAll('[data-home-route]'))button.onclick=()=>{pause();selectRoute(button.dataset.homeRoute);updateTransitRoute();showAll();};
 el('transit-alight').onclick=()=>{const stops=routeForDestination(context,selectedRoute);if(stops)focusStop(stops.at(-1),stops.length-1);};
 const status=text=>el('real-map-status').textContent=text;
 function pause(){generation++;clearTimeout(timer);touring=false;map?.stop();el('real-map-tour').textContent='위치 순서대로 둘러보기';}
 function focus(index){
  if(!map)return;selected=index;const place=places[index];
  map.easeTo({center:place.coordinates,zoom:index===2?16.6:17,pitch:pitched?55:0,bearing:-18,duration:reduced()?0:1400});
  status(place.name+' 위치를 보고 있어요. 이동 경로 안내가 아닌 지도 시점 이동입니다.');
  for(const button of document.querySelectorAll('[data-real-place]'))button.setAttribute('aria-pressed',String(Number(button.dataset.realPlace)===index));
 }
 function fallback(){
  clearTimeout(loadTimer);el('real-map').setAttribute('aria-busy','false');el('real-map-fallback').hidden=false;
  status('지도를 불러오지 못했어요. 기본 지도 보기나 외부 지도 링크를 이용해 주세요.');
 }
 async function initialize(){
  if(map){map.resize();return;}if(loading)return loading;
  status('실제 도로와 건물 지도를 불러오고 있어요…');loadTimer=setTimeout(fallback,18000);
  loading=(async()=>{
   try{
    const lib=await import('./maplibre-gl.mjs');mapLibrary=lib;
    map=new lib.Map({container:'real-map',style:'https://tiles.openfreemap.org/styles/liberty',center:places[0].coordinates,zoom:16.5,pitch:55,bearing:-18,attributionControl:{compact:true},locale:{'NavigationControl.ZoomIn':'지도 확대','NavigationControl.ZoomOut':'지도 축소','NavigationControl.ResetBearing':'북쪽 기준으로 보기','AttributionControl.ToggleAttribution':'지도 출처 보기'},canvasContextAttributes:{antialias:true}});
    map.addControl(new lib.NavigationControl({visualizePitch:true}),'top-right');
    map.addControl(new lib.ScaleControl({unit:'metric'}),'bottom-left');
    map.getCanvas().setAttribute('aria-label','동탄역 주변 실제 지도. 화살표로 이동하고 더하기와 빼기로 확대하거나 축소하세요.');
    markers=places.map((place,index)=>{
     const button=document.createElement('button');button.type='button';button.className='real-map-pin pin-'+place.id;button.textContent=String(index+1);button.setAttribute('aria-label',place.name+' 위치 보기');button.onclick=()=>{pause();focus(index);};
     const marker=new lib.Marker({element:button,anchor:'bottom',offset:index===0?[-18,-12]:[0,0]}).setLngLat(place.coordinates).addTo(map);return marker;
    });
    updateDestination();
    map.on('load',()=>{
     ready=true;clearTimeout(loadTimer);
     map.addSource('bus-stop-connections',{type:'geojson',data:stopConnections(context,selectedRoute)});
     map.addLayer({id:'bus-stop-connection-outline',type:'line',source:'bus-stop-connections',paint:{'line-color':'#fff','line-width':7,'line-opacity':.85}});
     map.addLayer({id:'bus-stop-connection-line',type:'line',source:'bus-stop-connections',paint:{'line-color':'#245ea0','line-width':4,'line-dasharray':[2,2]}});el('real-map-fallback').hidden=true;
     map.addSource('home-boundary',{type:'geojson',data:apartmentBoundary});
     map.addLayer({id:'home-area',type:'fill',source:'home-boundary',paint:{'fill-color':'#15856a','fill-opacity':.17},layout:{visibility:area==='aileen'&&!destination?.custom?'visible':'none'}});
     map.addLayer({id:'home-outline',type:'line',source:'home-boundary',paint:{'line-color':'#14775f','line-width':3},layout:{visibility:area==='aileen'&&!destination?.custom?'visible':'none'}});
     status('실제 도로·건물 지도를 불러왔어요. 번호를 누르면 해당 위치로 이동합니다.');
     el('real-map').setAttribute('aria-busy','false');if(routeForDestination(context,selectedRoute))showAll();else if(destination)focus(2);
    });
    map.on('error',()=>{if(!ready)fallback();else status('지도 일부를 불러오지 못했어요. 기본 지도 보기로 확인할 수 있어요.');});
   }catch{fallback();loading=null;}
  })();return loading;
 }
 function reset(nextContext={}){
  pause();stopPicking();context=nextContext;area=context.area||'aileen';updateDestination();
  if(map){map.resize();if(routeForDestination(context,selectedRoute))showAll();else focus(destination?2:0);}else initialize();
 }
 for(const button of document.querySelectorAll('[data-real-place]'))button.onclick=()=>{pause();focus(Number(button.dataset.realPlace));el('real-map').scrollIntoView({block:'center',behavior:'instant'});};
 el('real-map-flat').onclick=()=>{pause();pitched=!pitched;el('real-map-flat').setAttribute('aria-pressed',String(!pitched));el('real-map-flat').textContent=pitched?'평면으로 보기':'3D로 보기';if(map)map.easeTo({pitch:pitched?55:0,duration:reduced()?0:700});};
 el('real-map-all').onclick=()=>{pause();showAll();};
 el('real-map-tour').onclick=async()=>{
  if(touring){pause();return;}stopPicking();await initialize();if(!map||!el('map-dialog').open)return;
  const tour=routeForDestination(context,selectedRoute)?[0,1,3,2]:(destination?[0,2]:[0]);
  if(reduced()){const step=tour[(tour.indexOf(selected)+1)%tour.length];if(step===3){const stops=routeForDestination(context,selectedRoute);focusStop(stops.at(-1),stops.length-1);selected=3;}else focus(step);return;}
  touring=true;const id=++generation;el('real-map-tour').textContent='둘러보기 멈추기';let i=0;
  function next(){if(id!==generation)return;const step=tour[i++];if(step===3){selected=3;map.easeTo({center:routeForDestination(context,selectedRoute).at(-1).coordinates,zoom:17,pitch:pitched?55:0,duration:1400});status('③ 하차 · 에일린의뜰.중흥S클래스 55405');}else focus(step);if(i<tour.length)timer=setTimeout(next,3500);else timer=setTimeout(pause,1600);}next();
 };
 el('destination-pick').onclick=async()=>{pause();await initialize();if(!map)return;picking=true;map.easeTo({pitch:0,duration:0});pitched=false;el('real-map-flat').textContent='3D로 보기';el('real-map-flat').setAttribute('aria-pressed','true');el('destination-crosshair').hidden=false;el('destination-confirm').hidden=false;el('destination-pick').hidden=true;el('real-map').scrollIntoView({block:'center',behavior:'instant'});status('지도를 움직여 가운데 십자표시를 목적지에 맞춘 뒤 저장하세요.');};
 el('destination-cancel-pin').onclick=()=>{stopPicking();status('목적지 위치 지정을 취소했어요.');};
 el('destination-save-pin').onclick=()=>{if(!picking||!map)return;pause();const center=map.getCenter().wrap();try{context=onSaveDestination([Number(center.lng.toFixed(6)),Number(Math.max(-85,Math.min(85,center.lat)).toFixed(6))]);stopPicking();updateDestination();focus(2);status('목적지 위치를 연결했어요. 기기에 저장할 수 없는 경우 설정 화면에 안내됩니다.');}catch{status('목적지 위치를 저장하지 못했어요. 다시 시도해 주세요.');}};
 el('real-map-basic').onclick=()=>{pause();el('real-map-fallback').hidden=false;const a=places[0].coordinates,b=destination?.coordinates||a;const bounds=[Math.min(a[0],b[0])-.003,Math.min(a[1],b[1])-.003,Math.max(a[0],b[0])+.003,Math.max(a[1],b[1])+.003];el('real-map-frame').src='https://www.openstreetmap.org/export/embed.html?'+new URLSearchParams({bbox:bounds.join(','),layer:'mapnik'});status('기본 실제 지도를 열었어요.');};
 new ResizeObserver(()=>map?.resize()).observe(el('real-map'));
 system.addEventListener('change',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 return {reset,pause(){pause();stopPicking();}};
}
