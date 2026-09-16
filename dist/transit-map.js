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
export const homeBusRoutes=[
 {id:'H2',direction:'병점역후문 방면',url:'https://m.gbis.go.kr/routeBusLocation/233000416?seq=34'},
 {id:'206',direction:'린스트라우스.한화 → 에일린의뜰 방향',url:'https://m.gbis.go.kr/routeBusLocation/233000450?seq=69'}
];
export function routeForDestination(context){return context.area==='aileen'&&!context.mapPoint?homeStops:null;}
export function stopConnections(context){
 const stops=routeForDestination(context);
 return {type:'FeatureCollection',features:stops?[{type:'Feature',properties:{kind:'stop-connections'},geometry:{type:'LineString',coordinates:stops.map(s=>s.coordinates)}}]:[]};
}
export function routeBounds(context,destination,origin){
 const points=[origin,...(routeForDestination(context)||[]).map(s=>s.coordinates),...(destination?[destination.coordinates]:[])];
 return [[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]];
}
