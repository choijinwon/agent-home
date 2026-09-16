import {places,apartmentBoundary} from './map-places.js';
export function setupMotionDemo(reducedPreference){
 const el=id=>document.getElementById(id),system=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>reducedPreference()||system.matches;
 let map=null,loading=null,ready=false,timer,loadTimer,touring=false,generation=0,area='aileen',selected=0,pitched=true,markers=[];
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
    const lib=await import('./maplibre-gl.mjs');
    map=new lib.Map({container:'real-map',style:'https://tiles.openfreemap.org/styles/liberty',center:places[0].coordinates,zoom:16.5,pitch:55,bearing:-18,attributionControl:{compact:true},locale:{'NavigationControl.ZoomIn':'지도 확대','NavigationControl.ZoomOut':'지도 축소','NavigationControl.ResetBearing':'북쪽 기준으로 보기','AttributionControl.ToggleAttribution':'지도 출처 보기'},canvasContextAttributes:{antialias:true}});
    map.addControl(new lib.NavigationControl({visualizePitch:true}),'top-right');
    map.addControl(new lib.ScaleControl({unit:'metric'}),'bottom-left');
    map.getCanvas().setAttribute('aria-label','동탄역 주변 실제 지도. 화살표로 이동하고 더하기와 빼기로 확대하거나 축소하세요.');
    markers=places.map((place,index)=>{
     const button=document.createElement('button');button.type='button';button.className='real-map-pin pin-'+place.id;button.textContent=String(index+1);button.setAttribute('aria-label',place.name+' 위치 보기');button.onclick=()=>{pause();focus(index);};
     const marker=new lib.Marker({element:button,anchor:'bottom'}).setLngLat(place.coordinates).addTo(map);return marker;
    });
    markers[2].getElement().hidden=area!=='aileen';
    map.on('load',()=>{
     ready=true;clearTimeout(loadTimer);el('real-map-fallback').hidden=true;
     map.addSource('home-boundary',{type:'geojson',data:apartmentBoundary});
     map.addLayer({id:'home-area',type:'fill',source:'home-boundary',paint:{'fill-color':'#15856a','fill-opacity':.17},layout:{visibility:area==='aileen'?'visible':'none'}});
     map.addLayer({id:'home-outline',type:'line',source:'home-boundary',paint:{'line-color':'#14775f','line-width':3},layout:{visibility:area==='aileen'?'visible':'none'}});
     status('실제 도로·건물 지도를 불러왔어요. 번호를 누르면 해당 위치로 이동합니다.');
     el('real-map').setAttribute('aria-busy','false');
    });
    map.on('error',()=>{if(!ready)fallback();else status('지도 일부를 불러오지 못했어요. 기본 지도 보기로 확인할 수 있어요.');});
   }catch{fallback();loading=null;}
  })();return loading;
 }
 function reset(context={}){
  pause();area=context.area||'aileen';el('real-place-home').hidden=area!=='aileen';
  el('real-map-context').textContent=area==='aileen'?'동탄역 → 동탄역 서측 정류소 → 에일린의뜰':'동탄역 주변 실제 지도 · 선택한 목적지 좌표는 아직 연결되지 않았어요.';
  if(map){markers[2].getElement().hidden=area!=='aileen';if(ready)for(const id of ['home-area','home-outline'])map.setLayoutProperty(id,'visibility',area==='aileen'?'visible':'none');map.resize();focus(0);}
  else initialize();
 }
 for(const button of document.querySelectorAll('[data-real-place]'))button.onclick=()=>{pause();focus(Number(button.dataset.realPlace));el('real-map').scrollIntoView({block:'center',behavior:'instant'});};
 el('real-map-flat').onclick=()=>{pause();pitched=!pitched;el('real-map-flat').setAttribute('aria-pressed',String(!pitched));el('real-map-flat').textContent=pitched?'평면으로 보기':'3D로 보기';if(map)map.easeTo({pitch:pitched?55:0,duration:reduced()?0:700});};
 el('real-map-all').onclick=()=>{pause();if(!map)return;if(area==='aileen')map.fitBounds([[127.0838,37.1873],[127.0982,37.202]],{padding:45,pitch:pitched?40:0,bearing:0,duration:reduced()?0:1000});else focus(0);status('전체 위치를 보고 있어요. 선으로 연결된 버스 경로는 아직 제공하지 않아요.');};
 el('real-map-tour').onclick=async()=>{
  if(touring){pause();return;}await initialize();if(!map||!el('map-dialog').open)return;
  if(reduced()){focus((selected+1)%(area==='aileen'?3:2));return;}
  touring=true;const id=++generation;el('real-map-tour').textContent='둘러보기 멈추기';let i=0;
  function next(){if(id!==generation)return;focus(i++);if(i<(area==='aileen'?3:2))timer=setTimeout(next,3500);else timer=setTimeout(pause,1600);}next();
 };
 el('real-map-basic').onclick=()=>{pause();el('real-map-fallback').hidden=false;el('real-map-frame').src='https://www.openstreetmap.org/export/embed.html?bbox=127.079%2C37.183%2C127.105%2C37.203&layer=mapnik';status('기본 실제 지도를 열었어요.');};
 new ResizeObserver(()=>map?.resize()).observe(el('real-map'));
 system.addEventListener('change',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 return {reset,pause};
}
