import assets from './assets.js';
import {normalizeArrivals} from './transit.js';
let cached=null,pending=null;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {async fetch(request,env={}){
 const url=new URL(request.url);
 if(url.pathname==='/api/arrivals'){
  if(request.method!=='GET')return json({error:'method'},405);
  if(!env.GBIS_SERVICE_KEY)return json({error:'not_configured',message:'실시간 도착정보 연결 준비 중입니다.'},503);
  if(cached&&Date.now()-cached.updatedAt<60000)return json(cached);
  try{
   if(!pending)pending=(async()=>{
    const endpoint=new URL('https://apis.data.go.kr/6410000/busarrivalservice/v2/getBusArrivalListv2');
    endpoint.search=new URLSearchParams({serviceKey:env.GBIS_SERVICE_KEY,stationId:'233003084',format:'json'});
    const result=await fetch(endpoint,{signal:AbortSignal.timeout(10000)});
    if(!result.ok)throw new Error('upstream');
    cached=normalizeArrivals(await result.json());return cached;
   })().finally(()=>{pending=null;});
   return json(await pending);
  }catch{return json({error:'unavailable',message:'도착정보 조회에 실패했어요. 잠시 후 다시 시도해 주세요.'},502);}
 }
 if(url.pathname==='/api/status')return json({transit:Boolean(env.GBIS_SERVICE_KEY),ai:false,walking:false});
 if(url.pathname.startsWith('/api/'))return json({error:'not_found'},404);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const asset=assets[url.pathname==='/'?'/index.html':url.pathname];
 if(!asset)return new Response('Not found',{status:404});
 return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
}};
