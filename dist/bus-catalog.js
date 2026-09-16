import {findHomeBuses,homeBusRoutes} from './transit-map.js';

export function setupBusCatalog(getContext,openRoute){
 const el=id=>document.getElementById(id);
 const text=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
 function render(){
  const context=getContext(),supported=context.area==='aileen'&&!context.mapPoint;
  el('home-bus-count').textContent=supported?'· '+homeBusRoutes.length+'개':'';
  const results=findHomeBuses(context,{boarding:el('bus-boarding-filter').value,query:el('bus-route-query').value});
  el('bus-catalog-list').replaceChildren();
  el('bus-catalog-status').textContent=!supported?'이 목적지의 확인된 노선은 아직 없어요. 목적지를 에일린의뜰로 선택하면 확인한 버스를 볼 수 있어요.':results.length?results.length+'개 노선 · 번호와 승차 방향을 확인하세요.':'조건에 맞는 버스가 없어요. 번호를 지우거나 모든 승차 위치를 선택하세요.';
  for(const route of results){
   const card=document.createElement('article');card.className='bus-catalog-card';
   const first=route.stops[0],last=route.stops.at(-1);
   card.append(text('h3',route.id),text('p',route.direction),text('p','승차 · '+first.name+' '+first.number),text('p','하차 · '+last.name+' '+last.number));
   const detail=text('p',(route.stops.length-1)+'개 정류장 이동 · 도착 시간 미연결');detail.className='small';card.append(detail);
   if(route.note){const note=text('p',route.note);note.className='small';card.append(note);}
   const actions=document.createElement('div');actions.className='catalog-actions';
   const map=text('button','경로 · 승하차 보기');map.type='button';map.className='secondary';map.setAttribute('aria-label',route.id+' 경로와 승하차 보기');map.onclick=()=>openRoute(route.id,first.number);
   const official=text('a','도착정보 ↗');official.href='https://m.gbis.go.kr/station/'+route.stationId;official.target='_blank';official.rel='noopener noreferrer';official.setAttribute('aria-label',route.id+' 승차 정류장 공식 도착정보');
   actions.append(map,official);card.append(actions);el('bus-catalog-list').append(card);
  }
 }
 el('bus-boarding-filter').onchange=render;el('bus-route-query').oninput=render;render();return {render};
}
