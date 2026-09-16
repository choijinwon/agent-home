// Stop order checked on the public GBIS route screens, 2026-09-16.
// Coordinates: OpenStreetMap nodes, retrieved 2026-09-16 (ODbL).
// These lines connect stops; they are NOT provider-supplied road geometry.
export const homeStops=[
 {name:'동탄역(서측)',number:'55398',coordinates:[127.0960506,37.1996501],osm:'6354256843'},
 {name:'린스트라우스.한화',number:'37658',coordinates:[127.0986016,37.1962537],osm:'11548581507'},
 {name:'헤리엇.리베라CC',number:'36502',coordinates:[127.0985225,37.1907414],osm:'11548581505'},
 {name:'공공청사부지',number:'36480',coordinates:[127.1000855,37.1867289],osm:'11548581502'},
 {name:'더샵센트럴시티2차.행복주택',number:'55404',coordinates:[127.0914236,37.1869046],osm:'11548616000'},
 {name:'에일린의뜰.중흥S클래스',number:'55405',coordinates:[127.0868557,37.1871753],osm:'11548616004'}
];
export const eastStops=[
 {name:'동탄역(동측)',number:'55399',coordinates:[127.0962463,37.1996510],osm:'11548581508'},
 {name:'우남퍼스트빌.예미지시그너스(좌회전전용)',number:'36654'},
 {name:'반도유보라6차',number:'55492'},
 {name:'반도8차',number:'37134'},
 {name:'디에트르퍼스티지',number:'55495'},
 {name:'반도5차.파라곤',number:'55491'},
 {name:'신미주아파트',number:'36993'},
 {name:'동탄초교',number:'55403'},
 homeStops[4],homeStops[5]
];
const lotte={name:'롯데캐슬.포스코더샵',number:'36436',coordinates:[127.0985355,37.1994171],osm:'11548615997'};
const posco={name:'포스코더샵.롯데캐슬',number:'36465',coordinates:[127.0990276,37.1996908],osm:'11548615998'};
const shortWest=[homeStops[0],homeStops[1],eastStops[6],eastStops[7],homeStops[4],homeStops[5]];
const h20Stops=[eastStops[0],lotte,...homeStops.slice(1,4),
 {name:'반도3차.금강1차',number:'36488'},{name:'레이크빌.하우스디더레이크',number:'36494'},
 {name:'하우스디더레이크.우미린',number:'55476'},{name:'방교초.레이크자이더테라스',number:'55475'},
 {name:'한국지역난방공사',number:'36669'},{name:'방교동',number:'55257'},{name:'방아다리마을',number:'36704'},...homeStops.slice(4)];
export const homeBusRoutes=[
 {id:'H2',direction:'병점역후문 방면',url:'https://m.gbis.go.kr/routeBusLocation/233000416?seq=34',stationId:'233003084',stops:homeStops},
 {id:'206',direction:'월드마트 방면',url:'https://m.gbis.go.kr/routeBusLocation/233000450?seq=69',stationId:'233003084',stops:homeStops},
 {id:'24',alias:'H24',direction:'센트럴허브시티.송화초교 방면',url:'https://m.gbis.go.kr/routeBusLocation/233000390?seq=60',stationId:'233003084',stops:shortWest},
 {id:'71',direction:'오산교통갈곶영업소 방면',url:'https://m.gbis.go.kr/routeBusLocation/223000019?seq=32',stationId:'233003084',stops:[homeStops[0],posco,...eastStops.slice(2)]},
 {id:'19-3',direction:'병점역사거리 방면',url:'https://m.gbis.go.kr/routeBusLocation/241317008?seq=14',stationId:'233003084',stops:[homeStops[0],homeStops[1],eastStops[6],{name:'이산고등학교',number:'55761'},{name:'에일린의뜰아파트',number:'55446'}],note:'다른 후보와 하차 정류장이 달라요. 하차 위치와 단지 출입구는 외부 지도에서 확인하세요.'},
 {id:'H17',direction:'국민은행(마을) 방면',url:'https://m.gbis.go.kr/routeBusLocation/241317012?seq=28',stationId:'233003085',stops:eastStops},
 {id:'H101',direction:'반정아이파크4단지정문 방면',url:'https://m.gbis.go.kr/routeBusLocation/233000330',stationId:'233003085',stops:[eastStops[0],...eastStops.slice(2)],note:'서측의 동탄2차고지 방면이 아닌 동측에서 타세요.'},
 {id:'67',alias:'H67',direction:'향남환승터미널 방면',url:'https://m.gbis.go.kr/routeBusLocation/233000277?seq=28',stationId:'233003085',stops:[eastStops[0],lotte,...shortWest.slice(1)],note:'동측에 같은 번호가 양방향으로 와요. 향남환승터미널 방면인지 확인하세요.'},
 {id:'H20',direction:'병점역후문 방면',url:'https://m.gbis.go.kr/routeBusLocation/241318006',stationId:'233003085',stops:h20Stops,note:'방교동을 돌아가는 경로예요. 도착 시간뿐 아니라 이동 시간도 확인하세요.'},
 {id:'19-1',direction:'병점역사거리 방면',url:'https://m.gbis.go.kr/routeBusLocation/241317004?seq=19',stationId:'233000137',stops:[lotte,...homeStops.slice(1)]}
];
export const boardingStations=[
 {number:'55398',id:'233003084',name:'동탄역 서측'},
 {number:'55399',id:'233003085',name:'동탄역 동측'},
 {number:'36436',id:'233000137',name:'롯데캐슬.포스코더샵'}
];
// A boarding option exists only if the verified ordered route passes that stop.
export function findHomeBuses(context,{boarding='all',query=''}={}){
 if(context.area!=='aileen'||context.mapPoint)return [];
 const term=query.trim().toLowerCase();
 return homeBusRoutes.flatMap(route=>boardingStations.flatMap(station=>{
  const index=route.stops.findIndex(s=>s.number===station.number);
  if(index<0||index===route.stops.length-1||(boarding!=='all'&&boarding!==station.number))return [];
  if(term&&!`${route.id} ${route.alias||''} ${route.direction} ${station.name} ${route.stops.at(-1).name}`.toLowerCase().includes(term))return [];
  // In the unfiltered list, keep one card per bus; the boarding filter exposes alternatives.
  if(boarding==='all'&&index!==0)return [];
  return [{...route,stationId:station.id,stops:route.stops.slice(index)}];
 }));
}
export function routeForDestination(context,routeId='H2'){
 if(context.area!=='aileen'||context.mapPoint)return null;
 const route=homeBusRoutes.find(r=>r.id===routeId);if(!route)return null;
 if(!context.boardingNumber)return route.stops;
 const index=route.stops.findIndex(s=>s.number===context.boardingNumber);
 return index>=0?route.stops.slice(index):null;
}
export function stopConnections(context,routeId='H2'){
 const stops=routeForDestination(context,routeId);
 return {type:'FeatureCollection',features:stops?.every(s=>s.coordinates)?[{type:'Feature',properties:{kind:'stop-connections'},geometry:{type:'LineString',coordinates:stops.map(s=>s.coordinates)}}]:[]};
}
export function routeBounds(context,destination,origin,routeId='H2'){
 const points=[origin,...(routeForDestination(context,routeId)||[]).filter(s=>s.coordinates).map(s=>s.coordinates),...(destination?[destination.coordinates]:[])];
 return [[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]];
}
