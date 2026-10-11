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
  if(intent==='help')return '어떤 버스를 탈지, 어디에서 타는지 물어보세요. 현재 선택한 실제 경로를 안내합니다. 버스의 실시간 도착 시간은 아직 확인할 수 없습니다.';
  if(intent==='location')return '위치 탭에서 내 위치 확인 버튼을 눌러 주세요. 위치 사용을 허용하면 지도에서 확인할 수 있습니다. 허용하지 않아도 동탄역 출발 경로를 이용할 수 있습니다.';
  if(intent==='arrival')return '버스의 실시간 도착 시간은 아직 확인할 수 없습니다. 화면의 분 표시는 전체 경로의 예상 소요 시간이며 버스가 오는 시간이 아닙니다. 정류장 전광판이나 경기버스에서 확인해 주세요.';
  const route=context.route;
  const accessNote=context.stepFree?' 계단 없는 이동이 필요하도록 설정하셨습니다. 저상버스와 엘리베이터 정보가 연결되지 않아 이용 가능한 경로를 확인할 수 없습니다.':'';
  if(!route)return '현재 조회된 실제 경로가 없습니다. 귀가 화면에서 경로 다시 찾기를 눌러 주세요.'+accessNote;
  const steps=(route.steps||[]).map(step=>step.guidance).filter(Boolean).join('. ');
  const duration=Number.isFinite(route.seconds)&&route.seconds>0?' 예상 소요 시간은 약 '+Math.ceil(route.seconds/60)+'분입니다.':'';
  const transfer=Number.isInteger(route.transfers)&&route.transfers>=0?(route.transfers===0?' 갈아타지 않는 경로입니다.':' 환승 '+route.transfers+'회입니다.'):' 환승 횟수는 확인되지 않았습니다.';
  const prefix='현재 선택한 실제 경로 안내입니다.';
  if(intent==='platform')return prefix+' '+(steps||'이 경로의 자세한 승차 안내가 제공되지 않았어요.')+' 정류장 번호와 버스 진행 방향을 현장에서 확인해 주세요.'+accessNote;
  return prefix+duration+transfer+' '+(steps||'지도에서 이동 구간을 확인해 주세요.')+' 버스 실시간 도착정보는 포함하지 않습니다.'+accessNote;
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
