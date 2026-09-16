export function normalizePosition(position) {
  const { latitude, longitude, accuracy } = position.coords || {};
  if (![latitude, longitude, accuracy, position.timestamp].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) throw new Error('위치 값을 확인할 수 없어요. 다시 시도해 주세요.');
  return { latitude, longitude, accuracy, timestamp: position.timestamp };
}

export function locationError(error) {
  return ({1:'위치 권한이 꺼져 있어요. 브라우저 사이트 설정에서 허용하거나 아래에서 출발 위치를 직접 선택하세요.',2:'위치를 찾을 수 없어요. 기기의 위치 서비스를 켜고 다시 시도하거나 출발 위치를 직접 선택하세요.',3:'위치 확인 시간이 초과됐어요. 다시 시도하거나 출발 위치를 직접 선택하세요.'})[error?.code] || '위치 확인에 실패했어요. 출발 위치를 직접 선택할 수 있어요.';
}

// No coordinates leave the page until the visitor explicitly opens a map link.
export function mapLinks(position, now = Date.now()) {
  if (!position || now - position.timestamp > 300000 || position.timestamp > now + 10000) return null;
  const origin = `${position.latitude},${position.longitude}`;
  return {
    map: 'https://www.google.com/maps/search/?' + new URLSearchParams({api:'1',query:origin}),
    walk: 'https://www.google.com/maps/dir/?' + new URLSearchParams({api:'1',origin,destination:'동탄역, 경기도 화성시 동탄역로 151',travelmode:'walking'})
  };
}

export function createLocationController({geolocation,secure=true,onChange,now=Date.now}) {
  let request=0, timer;
  const clear=()=>{request++;clearTimeout(timer);onChange({status:'idle',position:null});};
  const locate=()=>{
    const id=++request;clearTimeout(timer);
    if(!secure){onChange({status:'error',message:'위치 확인은 보안 연결(HTTPS)에서 사용할 수 있어요.',position:null});return;}
    if(!geolocation){onChange({status:'error',message:'이 브라우저는 위치 확인을 지원하지 않아요. 출발 위치를 직접 선택하세요.',position:null});return;}
    onChange({status:'loading',position:null});
    const fail=error=>{if(id!==request)return;request++;clearTimeout(timer);onChange({status:'error',position:null,message:locationError(error)});};
    timer=setTimeout(()=>fail({code:3}),16000);
    try {geolocation.getCurrentPosition(position=>{
      if(id!==request)return;
      try {
        const value=normalizePosition(position);
        if(now()-value.timestamp>60000||value.timestamp>now()+10000)throw new Error('위치 정보가 오래됐어요. 다시 확인해 주세요.');
        request++;clearTimeout(timer);onChange({status:'success',position:value});
      }catch(error){request++;clearTimeout(timer);onChange({status:'error',position:null,message:error.message});}
    },fail,{enableHighAccuracy:true,timeout:12000,maximumAge:0});}catch{fail();}
  };
  return {locate,clear};
}
