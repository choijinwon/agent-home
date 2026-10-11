const usableNumber=value=>Number.isFinite(value)&&value>=0?value:Infinity;

// Keep the original index so selecting a route still targets the same API result.
export function rankRouteChoices(routes,preference='transfers'){
 return routes.map((route,index)=>({route,index})).sort((a,b)=>{
  const first=preference==='fastest'?'seconds':'transfers';
  const second=preference==='fastest'?'transfers':'seconds';
  return (usableNumber(a.route[first])-usableNumber(b.route[first])||0)
   ||(usableNumber(a.route[second])-usableNumber(b.route[second])||0)||a.index-b.index;
 });
}

export function routeVehicleGroups(route){
 return (route.steps||[]).map(step=>[...new Set((step.vehicles||[]).filter(Boolean))]).filter(vehicles=>vehicles.length);
}

export function routeVehicleSummary(route){
 const groups=routeVehicleGroups(route);
 return groups.length?groups.map(vehicles=>vehicles.join(' 또는 ')).join(' → '):'상세 이동 안내 확인';
}

export function routeTransferLabel(route){
 return !Number.isFinite(route.transfers)?'환승 정보 미확인':route.transfers===0?'환승 없음':`환승 ${route.transfers}회`;
}

export function routeMinutes(route){
 return Number.isFinite(route.seconds)?String(Math.ceil(route.seconds/60)):'—';
}
