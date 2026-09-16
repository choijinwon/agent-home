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
export const homeBusRoutes=[
 {id:'H2',direction:'병점역후문 방면',url:'https://m.gbis.go.kr/routeBusLocation/233000416?seq=34',stationId:'233003084',stops:homeStops},
 {id:'206',direction:'린스트라우스.한화 → 에일린의뜰 방향',url:'https://m.gbis.go.kr/routeBusLocation/233000450?seq=69',stationId:'233003084',stops:homeStops},
 {id:'H17',direction:'국민은행(마을) 방면',url:'https://m.gbis.go.kr/routeBusLocation/241317012?seq=28',stationId:'233003085',stops:eastStops}
];
export function routeForDestination(context,routeId='H2'){return context.area==='aileen'&&!context.mapPoint?(homeBusRoutes.find(r=>r.id===routeId)?.stops||null):null;}
export function stopConnections(context,routeId='H2'){
 const stops=routeForDestination(context,routeId);
 return {type:'FeatureCollection',features:stops?.every(s=>s.coordinates)?[{type:'Feature',properties:{kind:'stop-connections'},geometry:{type:'LineString',coordinates:stops.map(s=>s.coordinates)}}]:[]};
}
export function routeBounds(context,destination,origin,routeId='H2'){
 const points=[origin,...(routeForDestination(context,routeId)||[]).filter(s=>s.coordinates).map(s=>s.coordinates),...(destination?[destination.coordinates]:[])];
 return [[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]];
}
