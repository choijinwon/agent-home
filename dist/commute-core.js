export function rankTrips(trips,{walkMinutes=4,pace='normal',buffer=2,stepFree=false,missed=[]}={}){
 const walk=Math.ceil(walkMinutes*({slow:1.5,normal:1,fast:.85}[pace]||1));
 return trips.filter(t=>!missed.includes(t.id)&&Number.isFinite(t.eta)&&t.eta>=walk+buffer&&(!stepFree||(t.lowFloor===true&&t.stepFreePath===true))).map(t=>({...t,walk,leaveIn:t.eta-walk-buffer,total:t.eta+t.ride+t.lastWalk})).sort((a,b)=>a.total-b.total);
}
export function parseNeeds(text){
 const s=String(text).replace(/\s/g,'');const result={};
 if(/천천히|느리게|빨리못|걷기힘/.test(s))result.pace='slow';
 if(/보통속도|평소속도/.test(s))result.pace='normal';
 if(/계단.*(어려|힘|못|피|없이)|휠체어|유모차|엘리베이터/.test(s))result.stepFree=true;
 if(/놓쳤|못탔|다음버스/.test(s))result.action='missed';
 return result;
}
export const tripStages=[
 {title:'승차 정류장으로 이동',body:'정류장 이름과 번호, 버스 진행 방향을 확인하세요. 서두르거나 뛰지 마세요.',button:'정류장에 도착했어요'},
 {title:'버스 기다리기',body:'탈 버스의 번호와 방향을 다시 확인하세요. 저상버스 여부만으로 탑승 가능 여부가 보장되지는 않아요.',button:'버스에 탔어요'},
 {title:'버스에 탑승했어요',body:'이 앱은 버스의 실제 이동 위치를 추적하지 않아요. 차량 안내방송과 전광판에서 하차 정류장을 확인하세요.',button:'내릴 정류장이 가까워요'},
 {title:'내릴 준비',body:'차량 정차 후 안전하게 내려 주세요. 정차 전에는 이동하지 마세요.',button:'버스에서 내렸어요'},
 {title:'목적지까지 이동',body:'횡단보도와 보행 경로를 확인하세요. 목적지에 도착하면 아래 버튼을 눌러 주세요.',button:'목적지에 도착했어요'},
 {title:'귀가 안내 완료',body:'수고하셨어요. 도착 확인은 직접 누른 결과이며 자동 위치 확인이 아니에요.',button:'새 안내 시작'}
];
