export function validCoordinates(lat,lon){return typeof lat==='number'&&typeof lon==='number'&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;}
export function distanceMeters(lat,lon,a,b){const rad=Math.PI/180;const h=Math.sin((a-lat)*rad/2)**2+Math.cos(lat*rad)*Math.cos(a*rad)*Math.sin((b-lon)*rad/2)**2;return Math.round(6371000*2*Math.asin(Math.sqrt(Math.min(1,h))));}
export function normalizeStops(data,lat,lon){
 if(data.remark||!Array.isArray(data.elements))throw new Error('incomplete');
 return data.elements.filter(x=>x.type==='node'&&x.tags?.highway==='bus_stop'&&validCoordinates(x.lat,x.lon)).map(x=>({id:String(x.id),name:String(x.tags['name:ko']||x.tags.name||'이름 미등록 정류소'),ref:String(x.tags['ref:local']||x.tags.ref||''),lat:x.lat,lon:x.lon,distance:distanceMeters(lat,lon,x.lat,x.lon)})).filter(x=>x.distance<=800).sort((a,b)=>a.distance-b.distance).slice(0,30);
}
export async function nearbyResponse(request){
 const respond=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return respond({error:'method'},405);
 let input;try{const text=await request.text();if(text.length>256)throw new Error();input=JSON.parse(text);}catch{return respond({error:'invalid'},400);}
 if(!validCoordinates(input?.lat,input?.lon))return respond({error:'invalid'},400);
 const lat=Number(input.lat.toFixed(4)),lon=Number(input.lon.toFixed(4));
 try{
  const result=await fetch('https://overpass.private.coffee/api/interpreter',{method:'POST',body:new URLSearchParams({data:`[out:json][timeout:12];node["highway"="bus_stop"](around:800,${lat},${lon});out body;`}),signal:AbortSignal.timeout(16000)});
  if(!result.ok)throw new Error();const data=await result.json();
  return respond({stops:normalizeStops(data,lat,lon),updatedAt:Date.now(),source:'OpenStreetMap'});
 }catch{return respond({error:'unavailable',message:'주변 정류소 조회가 지연되고 있어요. 다시 시도하거나 아래 지도 검색을 이용하세요.'},502);}
}
