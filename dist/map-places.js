// OpenStreetMap way/619948539, retrieved 2026-09-16. ODbL.
export const apartmentBoundary={"type": "Feature", "properties": {"name": "동탄2신도시 에일린의뜰"}, "geometry": {"type": "Polygon", "coordinates": [[[127.0861584, 37.1880616], [127.0878321, 37.1881043], [127.0877945, 37.1903949], [127.0862228, 37.1904248], [127.0862979, 37.1900274], [127.0863515, 37.1894889], [127.0862013, 37.1883564], [127.0861584, 37.1880616]]]}};
export const places=[{"id": "station", "name": "동탄역", "coordinates": [127.0955764, 37.2003594]}, {"id": "stop", "name": "동탄역 서측 정류소", "coordinates": [127.0960506, 37.1996501]}, {"id": "home", "name": "동탄역 에일린의뜰", "coordinates": [127.0866271, 37.189115]}];
// Representative locations verified in OpenStreetMap on 2026-09-16.
export const destinations={
 aileen:{name:'동탄역 에일린의뜰',coordinates:[127.0866271,37.189115],note:'아파트 단지 대표 위치입니다. 출입구는 지도에서 따로 확인하세요.',source:'https://www.openstreetmap.org/way/619948539'},
 lake:{name:'동탄호수공원 주변',coordinates:[127.1065618,37.1671054],note:'동탄호수공원 정류소를 기준으로 표시합니다. 집이나 공원 출입구 위치가 아니므로 필요하면 목적지를 직접 지정하세요.',source:'https://www.openstreetmap.org/node/11548581501'},
 central:{name:'동탄 센트럴파크 주변',coordinates:[127.0629584,37.2037082],note:'공원 대표 위치입니다. 집이나 출입구가 다르면 목적지를 직접 지정하세요.',source:'https://www.openstreetmap.org/way/263567574'},
 yeongcheon:{name:'영천동',coordinates:[127.1058343,37.2103281],note:'영천동 지역 대표 위치입니다. 집 위치는 지도에서 직접 지정하세요.',source:'https://www.openstreetmap.org/node/415156448'}
};
export function validMapPoint(point){return Array.isArray(point)&&point.length===2&&point.every(x=>typeof x==='number'&&Number.isFinite(x))&&Math.abs(point[0])<=180&&Math.abs(point[1])<=85;}
export function destinationFor(context){
 if(validMapPoint(context.mapPoint))return {name:context.home||'내 목적지',coordinates:[...context.mapPoint],note:'이 기기에 저장한 목적지 위치입니다.',custom:true};
 return destinations[context.area]||null;
}
