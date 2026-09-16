// Small self-contained WebGL scene. No remote assets or map/API credentials.
const route=[[65,70],[115,70],[115,105],[300,105],[300,260],[485,260],[485,330],[540,330]].map(([x,z])=>[(x-300)/20,(z-200)/20]);
const hex=s=>s.match(/../g).map(v=>parseInt(v,16)/255);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const unit=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
function multiply(a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r;}
function cameraMatrix(eye,target,aspect){const z=unit(sub(eye,target)),x=unit(cross([0,1,0],z)),y=cross(z,x);const v=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];const f=1/Math.tan(Math.PI/7),n=.1,far=150;return multiply([f/aspect,0,0,0,0,f,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0],v);}
function mesh(){
 const values=[];
 const box=(x,y,z,w,h,d,color,angle=0)=>{
  const c=hex(color),ca=Math.cos(angle),sa=Math.sin(angle);
  const faces=[[[0,1,0],[[0,1,0],[0,1,1],[1,1,1],[1,1,0]],1],[[0,0,1],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],.8],[[1,0,0],[[1,0,1],[1,0,0],[1,1,0],[1,1,1]],.65],[[0,0,-1],[[1,0,0],[0,0,0],[0,1,0],[1,1,0]],.72],[[-1,0,0],[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],.86],[[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],.5]];
  for(const [,corners,shade] of faces)for(const i of [0,1,2,0,2,3]){const p=corners[i],px=(p[0]-.5)*w,pz=(p[2]-.5)*d;values.push(x+px*ca+pz*sa,y+p[1]*h,z-px*sa+pz*ca,...c.map(v=>v*shade));}
 };
 return {box,values};
}
export function setupGame3D(canvas,{reduced,onFallback}){
 let gl;try{gl=canvas.getContext('webgl',{antialias:true,alpha:false});}catch{}if(!gl){onFallback();return null;}
 let program;
 try{
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('shader');return s;};
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 p;attribute vec3 c;uniform mat4 m;varying vec3 color;void main(){color=c;gl_Position=m*vec4(p,1.0);}'));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 color;void main(){gl_FragColor=vec4(color,1.0);}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('program');
 }catch{onFallback();return null;}
 gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.clearColor(.64,.79,.82,1);
 const p=gl.getAttribLocation(program,'p'),c=gl.getAttribLocation(program,'c'),matrix=gl.getUniformLocation(program,'m');
 const environment=mesh(),b=environment.box;
 b(0,-.8,0,31,.8,21,'477b60');b(0,-1.15,0,31,.35,21,'294f48');
 for(const z of [-4.75,3]){b(0,.01,z,30,.05,1.5,'334b55');for(let x=-14;x<15;x+=1.4)b(x,.07,z,.6,.012,.055,'becabb');}
 for(const x of [-9.25,0,9.25]){b(x,.02,0,1.5,.05,20,'334b55');for(let z=-9;z<10;z+=1.4)b(x,.08,z,.055,.012,.6,'becabb');}
 // Crossings and bus shelters.
 for(const x of [-9.25,9.25])for(let i=0;i<6;i++)b(x-.6+i*.24,.09,x<0?-3.7:4.1,.12,.012,.8,'e8ede0');
 for(const [x,z] of [[-8.1,-4.2],[10.5,3]]){b(x,.02,z,.7,.08,1.4,'d0c6a6');b(x,.1,z, .07,1.2,.07,'24414d');b(x,1.3,z,.9,.15,1.7,'edbc61');b(x,.45,z,.45,.12,1,'9c6c46');}
 // Apartment blocks, lit windows, rooftop structures.
 for(const [x,z,w,d,h,color] of [[-6,-1.5,2.2,2.2,2.5,'b9d4c9'],[-3,-.8,1.8,3,4,'e7d6ae'],[3,-1.5,2.3,2.5,4.8,'a5c7cb'],[6,-.5,1.7,2,2.9,'d1bbaa'],[-6,7,2.5,2,3.2,'a9c5b3'],[-2.5,7.5,1.8,2.5,4.3,'acc8d2'],[4,-7,2.5,1.7,2.3,'e4d7b9'],[7,-7,1.5,2,3.5,'bfd0c4'],[-13,0,1.6,3,2.7,'d5c9ba']]){
  b(x+.25,.04,z+.4,w+.3,.015,d+.3,'38654f');b(x,0,z,w,h,d,color);b(x,h,z,w+.15,.12,d+.15,'eef0d8');b(x,h+.12,z,.7,.3,.65,'719a98');
  for(let yy=.65;yy<h-.2;yy+=.65)for(let xx=-w/2+.3;xx<w/2-.1;xx+=.55)b(x+xx,yy,z+d/2+.015,.25,.3,.035,'f5e6a5');
 }
 b(-11.8,0,-6.6,3,.95,1.8,'e7e6d2');b(-11.8,.95,-6.6,3.4,.18,2.1,'49a8a0');
 b(12.2,0,7,1.9,1.5,1.6,'ffe3a9');b(12.2,1.5,7,2.2,.45,1.9,'d67c53');b(12.2,.02,7.82,.45,1,.035,'496961');
 for(const [x,z] of [[3,6],[4,8],[6,6.5],[7.5,8],[-13,5],[-12,8],[-5,-7.8],[1.5,-8.3]]){b(x,0,z,.18,.65,.18,'795846');b(x,.6,z,.85,1.1,.85,'5faa73');b(x,.95,z,.6,1,.6,'81bf81');}
 for(const [x,z] of route){b(x,.08,z,.28,.04,.28,'d9f58c');}
 // Destination flag.
 b(13.3,0,6.5,.075,2.4,.075,'315a55');b(13.65,1.8,6.5,.7,.5,.07,'ffdb76');
 const staticBuffer=gl.createBuffer(),dynamicBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(environment.values),gl.STATIC_DRAW);
 let progress=0,stage=0,angle=.62,elevation=.85,distance=34,follow=false,flat=false,lost=false;
 const lengths=route.slice(1).map((v,i)=>Math.hypot(...sub(v,route[i]))),total=lengths.reduce((a,v)=>a+v,0);
 function pointAt(percent){let left=total*percent/100;for(let i=0;i<lengths.length;i++){if(left<=lengths[i]||i===lengths.length-1){const a=route[i],v=route[i+1],t=Math.min(1,left/lengths[i]);return {x:a[0]+(v[0]-a[0])*t,z:a[1]+(v[1]-a[1])*t,heading:Math.atan2(v[0]-a[0],v[1]-a[1])};}left-=lengths[i];}}
 function drawBuffer(buffer,values){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);if(values)gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(c);gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12);gl.drawArrays(gl.TRIANGLES,0,(values||environment.values).length/6);}
 function render(){
  if(lost||!canvas.clientWidth||!canvas.clientHeight)return;const scale=Math.min(devicePixelRatio||1,1.5),w=Math.round(canvas.clientWidth*scale),h=Math.round(canvas.clientHeight*scale);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const pos=pointAt(progress),tracking=follow&&!reduced(),target=tracking?[pos.x,.4,pos.z]:[0,0,0],r=tracking?Math.min(distance,13):distance,e=flat?1.55:elevation;
  const eye=[target[0]+Math.sin(angle)*Math.cos(e)*r,target[1]+Math.sin(e)*r,target[2]+Math.cos(angle)*Math.cos(e)*r];gl.uniformMatrix4fv(matrix,false,cameraMatrix(eye,target,w/h));drawBuffer(staticBuffer);
  const dynamic=mesh(),box=dynamic.box;let remain=total*progress/100;
  for(let i=0;i<lengths.length;i++){const a=route[i],v=route[i+1],part=Math.min(remain,lengths[i]);if(part<=0)break;const t=part/lengths[i],x=a[0]+(v[0]-a[0])*t,z=a[1]+(v[1]-a[1])*t;box((a[0]+x)/2,.105,(a[1]+z)/2,.17,.045,part,'daff83',Math.atan2(x-a[0],z-a[1]));remain-=part;}
  const local=(x,y,z,w,h,d,color)=>{const ca=Math.cos(pos.heading),sa=Math.sin(pos.heading);box(pos.x+x*ca+z*sa,y,pos.z-x*sa+z*ca,w,h,d,color,pos.heading);};
  if(stage===2){local(0,.3,0,.85,.75,1.8,'f9ce68');local(0,1.05,0,.88,.12,1.85,'fff3c4');local(0,.7,.91,.66,.32,.035,'305765');for(const x of [-.44,.44]){for(const z of [-.55,.55]){local(x,.15,z,.14,.3,.35,'22343e');local(x,.68,z,.035,.3,.38,'305765');}}local(-.25,.45,.93,.16,.1,.03,'fff9dc');local(.25,.45,.93,.16,.1,.03,'fff9dc');}
  else {const stride=reduced()?0:Math.sin(progress*4)*.14;local(0,.6,0,.35,.5,.25,'fdc964');local(0,1.1,0,.28,.28,.28,'f9d5b7');local(-.12,.12,stride,.12,.48,.15,'254753');local(.12,.12,-stride,.12,.48,.15,'254753');local(0,.65,-.2,.3,.33,.12,'d5754d');}
  drawBuffer(dynamicBuffer,dynamic.values);
 }
 const change=(action)=>{if(action==='left')angle-=.25;if(action==='right')angle+=.25;if(action==='in')distance=Math.max(9,distance-3);if(action==='out')distance=Math.min(48,distance+3);render();};
 let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;angle-=(e.clientX-drag.x)*.007;elevation=Math.max(.28,Math.min(1.35,elevation+(e.clientY-drag.y)*.005));drag={x:e.clientX,y:e.clientY};render();});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;});
 canvas.addEventListener('keydown',e=>{const actions={ArrowLeft:'left',ArrowRight:'right','+':'in','=':'in','-':'out'};if(actions[e.key]){e.preventDefault();change(actions[e.key]);}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;onFallback();});
 new ResizeObserver(render).observe(canvas);
 render();return {draw(p,s){progress=p;stage=s;render();},change,setFlat(value){flat=value;render();},setFollow(value){follow=value;render();},resetCamera(){angle=.62;elevation=.85;distance=34;render();}};
}
