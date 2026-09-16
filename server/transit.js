export function normalizeArrivals(data,now=Date.now()){
 const response=data.response||data;
 const code=String(response.msgHeader?.resultCode);
 if(code==='4')return {mode:'live',updatedAt:now,arrivals:[]};
 if(code!=='0')throw new Error('upstream');
 const raw=response.msgBody?.busArrivalList;const list=Array.isArray(raw)?raw:raw?[raw]:[];
 const arrivals=[];
 for(const row of list)for(const n of [1,2]){
  const value=row['predictTime'+n];const minutes=value!==null&&value!==''&&value!==undefined?Number(value):NaN;
  if(!Number.isFinite(minutes)||minutes<0)continue;
  const low=row['lowPlate'+n];
  arrivals.push({id:String(row.routeId)+'-'+n,name:String(row.routeName||row.routeId),direction:String(row.routeDestName||'방향 미확인'),eta:minutes,lowFloor:low===undefined||low===null||low===''?null:Number(low)===1});
 }
 return {mode:'live',updatedAt:now,arrivals};
}
