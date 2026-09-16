export const defaultAccess = Object.freeze({contrast:false,textOnly:false,screenReader:false,reduceMotion:false,vibration:false,stepFree:false,textSize:'normal'});
export function parseAccess(value) {
  const result={...defaultAccess};
  if(!value||typeof value!=='object')return result;
  for(const key of ['contrast','textOnly','screenReader','reduceMotion','vibration','stepFree'])if(typeof value[key]==='boolean')result[key]=value[key];
  if(['normal','large','largest'].includes(value.textSize))result.textSize=value.textSize;
  return result;
}
export function canSpeak(preferences){return !preferences.textOnly&&!preferences.screenReader;}
export function routeAnnouncement({stepFree,area,routes}) {
  if(stepFree)return '계단 없는 이동이 필요하도록 설정했습니다. 저상버스와 엘리베이터 정보가 연결되지 않아 이용 가능한 경로를 확인할 수 없습니다.';
  if(area==='aileen')return '동탄역 에일린의뜰 경로 안내입니다. 실시간 도착과 승차 위치는 아직 확인할 수 없습니다.';
  if(!routes.length)return '현재 조건에 맞는 시연 버스가 없습니다.';
  const route=routes[0];return `시연 추천이 갱신되었습니다. ${route.id} 버스, ${route.eta}분 후 도착, 승차장까지 이동 ${route.walk}분. 실제 운행 정보가 아닙니다.`;
}
