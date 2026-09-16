// Deliberately bounded intent handling. This is not a generative AI model.
export function interpretQuestion(input) {
  const text=String(input).replace(/\s/g,'').slice(0,300);
  if(/멈춰|중지|그만|정지/.test(text))return 'stop';
  if(/다시|반복|한번더/.test(text))return 'repeat';
  if(/천천히|느리게/.test(text))return 'slow';
  if(/놓쳤|놓친|못탔|못탔어|다음버스/.test(text))return 'missed';
  if(/에일린|아일린/.test(text)&&/가|목적지|설정|변경/.test(text))return 'aileen';
  if(/내위치|현재위치|어디있|여기가/.test(text))return 'location';
  if(/어디서|정류장|승차|어디로|출구/.test(text))return 'platform';
  if(/몇분|언제|도착|시간/.test(text))return 'arrival';
  if(/어떤버스|무슨버스|몇번|추천|집에|집으로|안내|뭘타/.test(text))return 'recommend';
  return 'help';
}

export function makeGuidance(intent,context) {
  if(intent==='help')return '어떤 버스를 탈지, 언제 오는지, 어디에서 타는지 물어보세요. 화면의 큰 질문 버튼을 눌러도 됩니다.';
  if(intent==='location')return '내 위치 확인 버튼을 눌러 주세요. 위치 사용을 허용하면 지도에서 확인할 수 있습니다. 허용하지 않아도 출발 위치를 직접 선택할 수 있습니다.';
  if(context.stepFree)return '계단 없는 이동이 필요하도록 설정하셨습니다. 저상버스와 엘리베이터 정보가 아직 연결되지 않아 이용 가능한 경로를 확인할 수 없습니다. 현재 정류장 안내나 교통 운영기관에 접근 가능한 이동 방법을 확인해 주세요.';
  if(context.area==='aileen')return '동탄역 에일린의뜰로 가시는군요. 2025년 교육청 안내에는 이백육 번과 에이치 이 번을 타고 에일린의뜰 정류장에서 내리는 경로가 나옵니다. 지금 도착 시간과 정확한 승차 위치는 아직 확인할 수 없습니다. 정류장 전광판이나 현장 안내에서 현재 운행을 확인해 주세요.';
  const r=context.routes[0];
  if(!r)return '현재 조건에 맞는 시연 버스가 없습니다. 걷는 시간을 조정하거나 시연 초기화를 눌러 주세요. 실제 운행 정보는 아직 연결되지 않았습니다.';
  const prefix='실제 운행이 아닌 시연 안내입니다. ';
  if(intent==='arrival')return prefix+`${r.id} 버스는 시연 시간으로 ${r.eta}분 뒤에 도착합니다. 승차장까지 이동에 ${r.walk}분이 필요합니다.`;
  if(intent==='platform')return prefix+`${r.platform}에서 ${r.id} 버스를 타는 예시입니다. 이동 시간은 ${r.walk}분입니다. 이 승차장 이름과 위치는 가상이므로 실제 길찾기에 사용하지 마세요.`;
  return prefix+`${r.id} 버스를 추천합니다. ${r.eta}분 뒤에 도착합니다. 승차장까지 ${r.walk}분이 걸립니다. ${Math.max(0,r.eta-r.walk-1)}분 안에 출발하는 예시입니다. 서두르거나 뛰지 마세요.`;
}

export function createSpeaker({synthesis,Utterance,onStatus}) {
  let generation=0;
  const stop=()=>{generation++;try{synthesis?.cancel();}catch{}onStatus('음성 안내를 멈췄어요.');};
  const speak=(text,rate=.85)=>{
    stop();const id=generation;
    if(!synthesis||!Utterance){onStatus('이 기기에서는 음성 재생을 지원하지 않아요. 아래 큰 글씨 안내를 읽어 주세요.');return;}
    try{
      const u=new Utterance(text);u.lang='ko-KR';u.rate=rate;u.pitch=1;
      const voices=synthesis.getVoices();const voice=voices.find(v=>/^ko/i.test(v.lang)&&v.localService)||voices.find(v=>/^ko/i.test(v.lang));if(voice)u.voice=voice;
      u.onstart=()=>{if(id===generation)onStatus('안내를 읽고 있어요.');};
      u.onend=()=>{if(id===generation)onStatus('안내를 마쳤어요. 다시 듣기를 누르면 한 번 더 읽어 드려요.');};
      u.onerror=()=>{if(id===generation)onStatus('소리를 재생하지 못했어요. 기기 음량을 확인하거나 아래 글씨 안내를 읽어 주세요.');};
      onStatus('음성 안내를 준비하고 있어요.');synthesis.speak(u);
    }catch{onStatus('음성 재생을 사용할 수 없어요. 아래 글씨 안내를 읽어 주세요.');}
  };
  return {speak,stop};
}

export function createListener({Recognition,onStatus,onText,onListening}) {
  let recognition=null,generation=0,timer;
  const cancel=()=>{generation++;clearTimeout(timer);const previous=recognition;recognition=null;try{previous?.abort();}catch{}onListening(false);};
  const start=()=>{
    cancel();if(!Recognition){onStatus('말로 묻기는 이 브라우저에서 지원하지 않아요. 큰 질문 버튼을 눌러 주세요.');return;}
    const id=generation;let gotResult=false,failed=false;
    try{
      recognition=new Recognition();recognition.lang='ko-KR';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1;
      recognition.onresult=event=>{if(id!==generation)return;gotResult=true;const text=event.results?.[0]?.[0]?.transcript||'';cancel();if(text.trim())onText(text.slice(0,300));else onStatus('말씀을 듣지 못했어요. 다시 누르거나 질문 버튼을 이용해 주세요.');};
      recognition.onerror=event=>{if(id!==generation)return;failed=true;cancel();onStatus(({'not-allowed':'마이크 권한이 꺼져 있어요. 큰 질문 버튼으로도 안내받을 수 있어요.','service-not-allowed':'이 기기에서는 음성 인식을 사용할 수 없어요. 질문 버튼을 눌러 주세요.','no-speech':'말씀을 듣지 못했어요. 다시 누르고 천천히 말해 주세요.','audio-capture':'마이크를 사용할 수 없어요. 연결을 확인하거나 질문 버튼을 눌러 주세요.','network':'음성 인식 연결이 끊겼어요. 질문 버튼을 눌러 주세요.'})[event.error]||'음성 인식에 실패했어요. 큰 질문 버튼을 눌러 주세요.');};
      recognition.onend=()=>{if(id!==generation)return;generation++;clearTimeout(timer);recognition=null;onListening(false);if(!gotResult&&!failed)onStatus('말씀을 듣지 못했어요. 다시 누르거나 질문 버튼을 이용해 주세요.');};
      onListening(true);onStatus('듣고 있어요. 짧게 한 문장으로 말해 주세요.');recognition.start();timer=setTimeout(()=>{if(id===generation){cancel();onStatus('마이크를 껐어요. 다시 누르거나 질문 버튼을 이용해 주세요.');}},15000);
    }catch{cancel();onStatus('마이크를 시작하지 못했어요. 큰 질문 버튼을 이용해 주세요.');}
  };
  return {start,cancel};
}
