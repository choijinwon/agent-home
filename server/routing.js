const cache=new Map(),pending=new Map();
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=124&&p[0]<=132&&p[1]>=33&&p[1]<=39;
export function normalizeRoutes(data){
 if(data.status==='NO_RESULTS')return [];
 if(data.status!=='OK'||!Array.isArray(data.routes))throw new Error('invalid result');
 return data.routes.slice(0,15).map(route=>{
  const p=route.properties;
  if(!Number.isFinite(p?.totalTime)||!Array.isArray(route.steps))throw new Error('invalid route');
  return {seconds:p.totalTime,distance:p.totalDistance,transfers:p.transfers,steps:route.steps.map(step=>({type:step.properties?.type,guidance:String(step.properties?.guidance||''),seconds:step.properties?.time,vehicles:(step.properties?.vehicles||[]).map(v=>String(v.name)),points:(step.path?.points||[]).filter(point)}))};
 });
}
export async function routingResponse(request,env){
 if(request.method!=='POST')return json({error:'method'},405);
 if(!env.KAKAO_REST_API_KEY)return json({error:'not_configured',message:'앱 내부 길찾기 연결 준비 중입니다. 아래 카카오맵 길찾기를 이용해 주세요.'},503);
 let body;try{const raw=await request.text();if(raw.length>1024)return json({error:'size'},413);body=JSON.parse(raw);}catch{return json({error:'invalid'},400);}
 if(!point(body?.from)||!point(body?.to))return json({error:'coordinates',message:'국내 출발지와 목적지를 지정해 주세요.'},400);
 const key=JSON.stringify([body.from,body.to]);const hit=cache.get(key);if(hit&&Date.now()-hit.updatedAt<300000)return json(hit);
 try{
  if(!pending.has(key)){
   const promise=(async()=>{
    const url=new URL('https://dapi.kakao.com/v2/routing/publictraffic');url.search=new URLSearchParams({start_x:body.from[0],start_y:body.from[1],end_x:body.to[0],end_y:body.to[1],output_coord:'WGS84'});
    const response=await fetch(url,{headers:{Authorization:'KakaoAK '+env.KAKAO_REST_API_KEY},signal:AbortSignal.timeout(12000)});
    if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(response.status===401&&String(error.message).includes('ip mismatched')?'ip_restricted':response.status===401?'authentication':'upstream');}
    const result={routes:normalizeRoutes(await response.json()),updatedAt:Date.now(),source:'카카오맵',liveArrivals:false};
    if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
   })().finally(()=>pending.delete(key));pending.set(key,promise);
  }
  return json(await pending.get(key));
 }catch(error){return json({error:error.message==='ip_restricted'?'ip_restricted':'unavailable',message:error.message==='ip_restricted'?'카카오 API의 서버 허용 IP 설정으로 조회가 차단됐어요. 아래 카카오맵 길찾기는 이용할 수 있어요.':'실제 경로를 불러오지 못했어요. 잠시 후 다시 조회하거나 카카오맵 길찾기를 이용해 주세요.'},502);}
}
