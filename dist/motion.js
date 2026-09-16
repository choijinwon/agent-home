export function setupMotionDemo(reducedPreference) {
  const el=id=>document.getElementById(id);
  const path=el('motion-path'),trail=el('motion-trail'),slider=el('motion-progress'),scene=el('motion-scene');
  const length=path.getTotalLength(),system=matchMedia('(prefers-reduced-motion: reduce)');
  let progress=0,frame=0,lastTime=null,running=false,lastStage=-1;
  const labels=['동탄역에서 출발해요.','승차 정류장까지 걸어가요.','버스로 이동하는 구간이에요.','하차 후 목적지까지 걸어가요.','목적지 도착 시연이 끝났어요.'];
  const reduced=()=>reducedPreference()||system.matches;
  function draw(){
    const point=path.getPointAtLength(length*progress/100);
    el('motion-marker').setAttribute('transform',`translate(${point.x} ${point.y})`);
    for(const line of [trail,el('motion-glow')]){line.style.strokeDasharray=String(length);line.style.strokeDashoffset=String(length*(1-progress/100));}
    const camera=reduced()?0:progress/100;scene.style.setProperty('--camera-x',`${(0.5-camera)*14}px`);scene.style.setProperty('--camera-angle',`${-8+camera*6}deg`);
    el('motion-percent').textContent=String(Math.round(progress)).padStart(2,'0')+'%';
    slider.value=String(Math.round(progress));
    const stage=progress===0?0:progress<12?1:progress<82?2:progress<100?3:4;
    slider.setAttribute('aria-valuetext',`${labels[stage]} ${Math.round(progress)}퍼센트`);
    el('motion-bus-icon').style.display=stage===2?'':'none';el('motion-walk-icon').style.display=stage===2?'none':'';
    if(stage!==lastStage){el('motion-status').textContent=labels[stage];el('motion-phase-label').textContent=['출발 준비','WALK · 정류소로','RIDE · 버스 탑승','WALK · 집 앞으로','도착 완료'][stage];el('motion-phase-number').textContent=stage<2?'01':stage===2?'02':'03';el('motion-scene-label').textContent=['STATION → HOME','WALK TO THE STOP','ON THE WAY HOME','ALMOST HOME','WELCOME HOME'][stage];for(const button of document.querySelectorAll('[data-motion-step]')){const value=Number(button.dataset.motionStep);button.setAttribute('aria-pressed',String(stage<2?value===6:stage===2?value===45:value===90));}lastStage=stage;}
  }
  function pause(){running=false;scene.classList.remove('is-playing');cancelAnimationFrame(frame);lastTime=null;el('motion-play').textContent=reduced()?'다음 단계 보기':progress>=100?'↺ 다시 재생':'▶ 귀갓길 재생';}
  function tick(time){
    if(!running)return;
    if(reduced()){pause();return;}
    if(lastTime!==null)progress=Math.min(100,progress+(time-lastTime)/200);
    lastTime=time;draw();
    if(progress>=100)pause();else frame=requestAnimationFrame(tick);
  }
  function reset(){
    progress=0;pause();lastStage=-1;draw();
    el('motion-note').textContent=reduced()?'움직임 줄이기가 켜져 있어요. 다음 단계 버튼이나 슬라이더로 확인하세요.':'약 20초의 경로 시연 · 언제든 멈추거나 구간을 선택할 수 있어요.';
  }
  el('motion-play').onclick=()=>{
    if(reduced()){pause();progress=[12,50,82,100].find(value=>value>progress)??0;draw();return;}
    if(running){pause();return;}
    if(progress>=100)progress=0;
    running=true;scene.classList.add('is-playing');lastTime=null;el('motion-play').textContent='Ⅱ 일시정지';frame=requestAnimationFrame(tick);
  };
  el('motion-reset').onclick=reset;
  slider.addEventListener('input',()=>{pause();progress=Number(slider.value);draw();});
  el('motion-flat').onclick=()=>{
    const flat=el('motion-scene').classList.toggle('is-flat');
    el('motion-flat').setAttribute('aria-pressed',String(flat));el('motion-flat').textContent=flat?'3D로 보기':'평면으로 보기';
  };
  for(const button of document.querySelectorAll('[data-motion-step]'))button.onclick=()=>{pause();progress=Number(button.dataset.motionStep);draw();};
  system.addEventListener('change',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('pagehide',pause);
  return {reset,pause};
}
