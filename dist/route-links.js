import {validMapPoint} from './map-places.js';
export function directionsLink(mode,from,to){
 if(!['walk','traffic'].includes(mode)||!validMapPoint(from?.coordinates)||!validMapPoint(to?.coordinates))return null;
 const place=p=>encodeURIComponent(p.name||'선택 위치')+','+p.coordinates[1]+','+p.coordinates[0];
 return 'https://map.kakao.com/link/by/'+mode+'/'+place(from)+'/'+place(to);
}
export function updateDirectionsLinks(origin,stops,destination){
 const links=[['directions-transit','traffic',origin,destination],['directions-board','walk',origin,stops?.[0]],['directions-home','walk',stops?.at(-1),destination]];
 for(const [id,mode,from,to] of links){const a=document.getElementById(id),href=directionsLink(mode,from,to);a.hidden=!href;if(href)a.href=href;else a.removeAttribute('href');}
 document.getElementById('directions-note').textContent=destination?'카카오맵에서 실제 길찾기를 조회합니다. 선택한 버스가 아닌 다른 경로가 추천될 수 있어요. 도보 길의 계단·엘리베이터와 단지 출입구는 별도 확인하세요.':'목적지 위치를 지정하면 길찾기를 열 수 있어요.';
}
