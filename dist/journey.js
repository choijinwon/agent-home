export function buildJourney({settings,route,stationMinutes=0,stepFree=false}) {
  const base={destination:settings.home,mode:'simulation',steps:[],total:null};
  if(stepFree)return {...base,mode:'unverified',message:'계단 없는 이동 경로를 확인할 수 없어요. 저상버스와 승강기 정보가 연결되기 전에는 이용 가능한 경로로 표시하지 않습니다.'};
  if(settings.area==='aileen')return {...base,mode:'reference',message:'2025년 교육청 안내를 바탕으로 이동 순서를 보여주는 예시입니다. 현재 운행, 승차 위치, 소요 시간은 확인되지 않았습니다.',steps:[
    {label:'출발',title:'동탄역',detail:'동탄역에서 출발하는 경로 예시입니다. 실제 승차 출구와 정류장 위치는 아직 연결되지 않았습니다.'},
    {label:'승차 확인',title:'206 · H2 후보 확인',detail:'교육청 안내에 나온 버스 후보입니다. 현재 운행 방향과 승차 정류장을 현장 안내 또는 교통 운영기관에서 확인해야 합니다.'},
    {label:'하차 확인',title:'에일린의뜰 정류장',detail:'자료에 안내된 하차 정류장입니다. 실제 정류장 위치와 아파트 출입구까지의 보행 경로는 확인되지 않았습니다.'},
    {label:'목적지',title:settings.home,detail:'목적지는 동탄역 에일린의뜰입니다. 이 화면은 경로 순서를 보여주는 데모이며 실시간 길안내가 아닙니다.'}
  ]};
  if(!route)return {...base,mode:'unavailable',message:'현재 조건에 맞는 시연 경로가 없어요. 도보 조건을 바꾸거나 시연을 초기화한 뒤 다시 확인해 주세요.'};
  return {...base,total:route.total,message:'실제 지도나 AI가 계산한 경로가 아닙니다. 가상 노선과 시간을 사용한 클릭형 데모입니다.',steps:[
    {label:'출발',title:stationMinutes>0?'현재 출발 위치':'동탄역',minutes:route.walk,detail:`시연 승차장까지 이동 ${route.walk}분입니다.${stationMinutes>0?' 직접 입력한 동탄역까지의 이동 시간이 포함돼요.':''} 실제 보행 길찾기는 아닙니다.`},
    {label:'승차',title:route.platform,minutes:Math.max(0,route.eta-route.walk),detail:`가상 버스 ${route.id}를 타는 예시입니다. 지금부터 ${route.eta}분 후 버스가 도착하고, 승차장 이동 후 ${Math.max(0,route.eta-route.walk)}분 기다리는 시나리오입니다.`},
    {label:'버스 이동',title:route.id+' 시연 버스',minutes:route.ride,detail:`버스로 ${route.ride}분 이동하는 예시입니다. 실제 운행 경로나 정류장 수를 나타내지 않습니다.`},
    {label:'하차',title:route.stop,minutes:route.homeWalk,detail:`가상의 하차 지점에서 목적지까지 ${route.homeWalk}분 걸어가는 예시입니다. 실제 횡단보도·계단·경사 정보는 포함되지 않았습니다.`},
    {label:'도착',title:settings.home,minutes:0,detail:`시연 기준 전체 ${route.total}분 후 도착입니다. 이 표시는 실제 위치 도착 확인이나 하차 알림이 아닙니다.`}
  ]};
}
export function boundedStep(index,length){return Math.max(0,Math.min(Math.max(0,length-1),Number.isFinite(index)?Math.trunc(index):0));}
