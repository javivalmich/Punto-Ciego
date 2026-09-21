/* Punto Ciego · personaje 3D.
   - UN solo contexto WebGL para toda la app (avatares, menú, editor, revelado…).
   - Las vistas vivas se copian a canvas 2D normales; los avatares salen como data: URL (nunca blob:).
   - El bucle de dibujo solo corre si hay una vista 3D visible y la pestaña está activa.
   - Las zonas (capucha, cara, ojos, guantes, ropa) se calculan con la POSICIÓN EN REPOSO (atributo aR),
     no con la posición actual: cuando la malla se deforme con un esqueleto, aP cambiará y aR no.
   API:  PJ.usa() · PJ.estado ('sin'|'cargando'|'listo'|'fallo') · PJ.onCambio
         PJ.avatar(vista, look, estado, anchoCss) -> data:URL | null
         PJ.aplica() (monta/actualiza los <canvas data-v>) · PJ.config({...})                          */
(function(G){
'use strict';
const PJ={estado:'sin',onCambio:null,cfg:{antialias:true,bin:'assets/personaje.bin'}};
G.PJ=PJ;

/* ---------- shaders ---------- */
const VS=`
attribute vec4 aP;   // posición ACTUAL (hoy = reposo; con esqueleto será la malla deformada)
attribute vec4 aR;   // posición en REPOSO (zonas y estampados)
attribute vec4 aN;   // normal (xyz) y oclusión ambiental (w)
uniform mat4 uMV; uniform mat4 uProj; uniform mat3 uNM; uniform vec3 uExt;
varying vec3 vN; varying vec3 vR; varying vec3 vNo; varying float vAO; varying vec3 vV;
void main(){
  vec3 p=aP.xyz*uExt; vR=aR.xyz*uExt;
  vec3 n=aN.xyz*2.0-1.0;
  vN=uNM*n; vNo=n; vAO=aN.w;
  vec4 v=uMV*vec4(p,1.0); vV=v.xyz;
  gl_Position=uProj*v;
}`;
const FS=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vN; varying vec3 vR; varying vec3 vNo; varying float vAO; varying vec3 vV;
uniform vec3 uCloth,uHood,uFace,uEye,uGlove,uRimC; uniform float uPat,uW,uGray,uAlpha,uRimK,uMask; uniform mat3 uNM;
vec3 lin(vec3 c){return pow(c,vec3(2.2));}
float hash(vec3 p){p=fract(p*0.3183099+vec3(.1,.2,.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
  vec3 n=normalize(vN); vec3 V=normalize(-vV);
  float w=uW; vec3 P=vR;
  // zonas por píxel a partir de la posición en reposo
  float qL=length(vec2(P.x/0.44,(P.y-0.43)/0.35)); float sdH=max(P.y-0.27,min((1.0-qL)*0.36,P.z-0.1));
  float qF=length(vec2(P.x/0.385,(P.y-0.43)/0.315)); float sdF=min((1.0-qF)*0.33,(P.z-0.05));
  float ex=abs(P.x)-0.194; float sdE=(1.0-length(vec2(ex/0.052,(P.y-0.355)/0.112)))*0.055; if(P.z<0.2)sdE=-1.0;
  vec2 gp=vec2(abs(P.x)-0.455,P.y+0.545); float sdG=min((1.0-length(vec3(gp.x/0.10,gp.y/0.115,(P.z-0.03)/0.14)))*0.11,-0.455-P.y);
  float mH=smoothstep(-w,w,sdH), mF=smoothstep(-w,w,sdF), mE=smoothstep(-w,w,sdE), mG=smoothstep(-w,w,sdG);
  if(uMask>0.5){ float l=1.0; if(sdH>0.0)l=2.0; if(sdF>0.0)l=3.0; if(sdG>0.0)l=5.0; if(sdE>0.0)l=4.0; gl_FragColor=vec4(vec3(l*50.0/255.0),1.0); return; }
  // la cara es una esfera lisa: su normal exacta evita reflejos rotos por el ruido de la malla
  n=normalize(mix(n,normalize(uNM*normalize(P-vec3(0.0,0.44,-0.017))),mF));
  vec3 cloth=uCloth; float tint=1.0;
  if(uPat>0.5){
    if(uPat<1.5){ float s=floor(P.y*26.0); tint=mod(s,2.0)<0.5?1.0:0.6; }
    else if(uPat<2.5){ vec3 a=abs(vNo); vec2 uv=(a.z>=a.x&&a.z>=a.y)?P.xy:((a.x>=a.y)?P.zy:P.xz); vec2 c=floor(uv*19.0); tint=mod(c.x+c.y,2.0)<0.5?1.0:0.62; }
    else { float q=vnoise(P*7.0)*0.65+vnoise(P*15.0+7.0)*0.35; tint=q>0.62?0.5:(q>0.42?0.8:1.04); }
  }
  cloth*=tint;
  float grain=vnoise(P*260.0)*0.5+vnoise(P*95.0)*0.5; float gr=0.94+0.12*grain;
  vec3 alb=cloth;
  alb=mix(alb,uHood,mH); alb=mix(alb,uFace,mF); alb=mix(alb,uEye,mE); alb=mix(alb,uGlove,mG);
  float isFace=mF*(1.0-mE), isEye=mE, isGlove=mG*(1.0-mF), isHood=mH*(1.0-mF);
  vec3 Lk=normalize(vec3(-0.55,0.75,0.65)), Lf=normalize(vec3(0.85,0.15,0.45)), Lr=normalize(vec3(0.2,0.35,-1.0));
  float ao=mix(1.0,vAO,0.92); ao=ao*ao*(3.0-2.0*ao)*0.35+ao*0.65;
  float wrap=0.35;
  float dk=clamp((dot(n,Lk)+wrap)/(1.0+wrap),0.0,1.0), df=clamp((dot(n,Lf)+0.2)/1.2,0.0,1.0), dr=clamp(dot(n,Lr),0.0,1.0);
  vec3 amb=mix(vec3(0.26,0.22,0.24),vec3(0.62,0.68,0.80),n.y*0.5+0.5);
  vec3 light=amb*0.62*ao + vec3(1.0,0.93,0.84)*dk*1.05*mix(0.35,1.0,ao) + vec3(0.55,0.68,0.95)*df*0.34*ao + vec3(0.9,0.95,1.0)*dr*0.35*ao;
  vec3 col=lin(alb)*light*mix(gr,1.0,mF+mE+mG*0.6);
  float fr=pow(1.0-clamp(dot(n,V),0.0,1.0),3.0);
  col+=lin(mix(alb,vec3(1.0),0.35))*fr*0.16*ao*(1.0-isFace);
  vec3 H=normalize(Lk+V); float sp=pow(clamp(dot(n,H),0.0,1.0),isFace>0.5?90.0:(isGlove>0.5?24.0:12.0));
  col+=vec3(1.0,0.97,0.92)*sp*(isFace*0.6+isGlove*0.10+isHood*0.04+(1.0-isFace-isGlove-isHood)*0.03);
  vec3 R=reflect(-V,n); float env=smoothstep(-0.2,0.9,R.y); col+=vec3(0.30,0.36,0.50)*env*fr*0.8*isFace;
  vec3 H2=normalize(Lf+V); col+=vec3(0.5,0.65,1.0)*pow(clamp(dot(n,H2),0.0,1.0),60.0)*0.35*isFace;
  col=mix(col,lin(uEye)*(0.92+0.25*dk),isEye);
  // estados: muerto (gris) y luz de contorno (impostor: roja, fantasma: azulada)
  float lum=dot(col,vec3(0.3,0.59,0.11)); col=mix(col,vec3(lum),uGray)*mix(1.0,0.78,uGray);
  col+=uRimC*pow(1.0-clamp(dot(n,V),0.0,1.0),2.2)*uRimK*(0.4+0.6*ao);
  col=col/(1.0+col*0.16)*1.06;
  vec3 o=pow(clamp(col,0.0,1.0),vec3(1.0/2.2));
  gl_FragColor=vec4(o*uAlpha,uAlpha);
}`;

/* ---------- matrices (columna-mayor) ---------- */
const I4=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}
const T=(x,y,z)=>{const m=I4();m[12]=x;m[13]=y;m[14]=z;return m};
const Sc=(x,y,z)=>{const m=I4();m[0]=x;m[5]=y;m[10]=z;return m};
const RY=a=>{const c=Math.cos(a),s=Math.sin(a),m=I4();m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m};
const RX=a=>{const c=Math.cos(a),s=Math.sin(a),m=I4();m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m};
const RZ=a=>{const c=Math.cos(a),s=Math.sin(a),m=I4();m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m};
function persp(fovy,asp,n,f){const t=1/Math.tan(fovy/2);return new Float32Array([t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)/(n-f),-1, 0,0,2*f*n/(n-f),0]);}
function hex(h,d){ if(!h) return d; h=String(h).replace('#',''); if(h.length===3)h=h.replace(/./g,'$&$&'); return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255]; }

/* ---------- WebGL compartido ---------- */
const GL={cv:null,gl:null,prog:null,U:null,A:null,vb:null,ib:null,n:0,ext:[1,1,1],buf:null,perdido:false};
const FEET=-0.951;
function creaGL(){
  const cv=GL.cv||(GL.cv=document.createElement('canvas'));
  const gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:PJ.cfg.antialias,depth:true,preserveDrawingBuffer:false,powerPreference:'low-power'})
        ||cv.getContext('experimental-webgl',{alpha:true,premultipliedAlpha:true,antialias:PJ.cfg.antialias,preserveDrawingBuffer:false});
  if(!gl)throw new Error('sin WebGL');
  GL.gl=gl;GL.lose=gl.getExtension('WEBGL_lose_context');
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
  const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr));
  GL.prog=pr;gl.useProgram(pr);
  GL.U={};['uMV','uProj','uNM','uExt','uCloth','uHood','uFace','uEye','uGlove','uRimC','uPat','uW','uGray','uAlpha','uRimK','uMask'].forEach(k=>GL.U[k]=gl.getUniformLocation(pr,k));
  GL.A={aP:gl.getAttribLocation(pr,'aP'),aR:gl.getAttribLocation(pr,'aR'),aN:gl.getAttribLocation(pr,'aN')};
  if(GL.buf)subeMalla();   // al restaurar el contexto la malla ya está descargada
}
function subeMalla(){
  const gl=GL.gl,buf=GL.buf,dv=new DataView(buf);
  if(dv.getUint32(0,true)!==0x44334A50)throw new Error('modelo no válido');
  const nV=dv.getUint32(4,true),nI=dv.getUint32(8,true);
  GL.ext=[dv.getFloat32(16,true),dv.getFloat32(20,true),dv.getFloat32(24,true)];
  const off=32;
  GL.vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,GL.vb);gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(buf,off,nV*12),gl.STATIC_DRAW);
  GL.ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,GL.ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(buf.slice(off+nV*12,off+nV*12+nI*2)),gl.STATIC_DRAW);
  GL.n=nI;
}
let errores=0;
function fallaDibujo(e){console.warn('PJ dibujo',e);if(++errores>=3&&PJ.estado==='listo'){PJ.estado='fallo';notifica()}}
function notifica(){try{PJ.onCambio&&PJ.onCambio(PJ.estado)}catch(e){console.warn('PJ.onCambio',e)}}

PJ.config=o=>Object.assign(PJ.cfg,o||{});
/* Solo para pruebas: simula la pérdida y la vuelta del contexto (iPhone lo hace al ir a segundo plano). */
PJ.simulaPerdida=(volver)=>{const e=GL.lose;if(!e)return false;volver?e.restoreContext():e.loseContext();return true};
let cargando=null;
PJ.usa=function(){
  if(cargando)return cargando;
  PJ.estado='cargando';
  cargando=(async()=>{
    try{
      creaGL();
      GL.cv.addEventListener('webglcontextlost',e=>{e.preventDefault();GL.perdido=true});
      GL.cv.addEventListener('webglcontextrestored',()=>{
        try{creaGL();GL.perdido=false;notifica();arranca()}catch(err){console.warn('PJ restaura',err);PJ.estado='fallo';notifica()}
      });
      const r=await fetch(PJ.cfg.bin);if(!r.ok)throw new Error('modelo '+r.status);
      GL.buf=await r.arrayBuffer();
      subeMalla();
      PJ.estado='listo';
    }catch(e){console.warn('PJ: sin 3D',e);PJ.estado='fallo'}
    notifica();arranca();
    return PJ.estado==='listo';
  })();
  return cargando;
};

/* ---------- dibujo ---------- */
/* p: yaw,pitch,roll,x,y,sx,sy,alpha,gray,rim ('rojo'|'azul'|null)  ·  c: zoom,vy,cx,cp */
function dibuja(w,h,p,c,look){
  const gl=GL.gl;if(!gl||GL.perdido||gl.isContextLost()||PJ.estado!=='listo')return false;
  const cv=GL.cv;if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}
  gl.viewport(0,0,w,h);gl.useProgram(GL.prog);
  gl.disable(gl.BLEND);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
  const fov=22*Math.PI/180,asp=w/h,z=c.zoom||1;
  const dist=Math.max(1.98/2/Math.tan(fov/2),0.66/(Math.tan(fov/2)*asp))/z;
  const sx=p.sx||1,sy=p.sy||1;
  // pie del modelo fijo al suelo aunque se aplaste o se estire
  let M=mul(T(p.x||0,(p.y||0)+FEET*(1-sy),0),mul(RX(p.pitch||0),mul(RY(p.yaw||0),Sc(sx,sy,sx))));
  if(p.roll){ // caída de lado: gira sobre el borde del pie
    const px=0.56,R=mul(T(px,FEET,0),mul(RZ(p.roll),T(-px,-FEET,0)));
    M=mul(T(p.tx||0,0,0),mul(R,M));
  }
  const MV=mul(T(0,0,-dist),mul(RX(c.cp||0),mul(T(-(c.cx||0),-(c.vy||0),0),M)));
  const NM=new Float32Array([MV[0],MV[1],MV[2],MV[4],MV[5],MV[6],MV[8],MV[9],MV[10]]);
  const U=GL.U;
  gl.uniformMatrix4fv(U.uMV,false,MV);gl.uniformMatrix4fv(U.uProj,false,persp(fov,asp,0.5,30));gl.uniformMatrix3fv(U.uNM,false,NM);
  gl.uniform3fv(U.uExt,GL.ext);
  const L=look||{};
  const cl=L.cloth?hex(L.cloth):(L.pat?[0.26,0.26,0.28]:[0.075,0.075,0.085]);
  gl.uniform3fv(U.uCloth,cl);gl.uniform3fv(U.uHood,hex(L.hood,[0.95,0.93,0.89]));gl.uniform3fv(U.uFace,[0.03,0.03,0.04]);
  gl.uniform3fv(U.uEye,hex(L.eye,[0.98,0.98,0.97]));gl.uniform3fv(U.uGlove,hex(L.glove,[0.93,0.92,0.9]));
  gl.uniform1f(U.uPat,L.pat|0);gl.uniform1f(U.uW,1.1*2*dist*Math.tan(fov/2)/h*(PJ.mascara?0.001:1));
  gl.uniform1f(U.uGray,p.gray||0);gl.uniform1f(U.uAlpha,p.alpha==null?1:p.alpha);gl.uniform1f(U.uMask,PJ.mascara?1:0);
  const rim=p.rim==='rojo'?[1.0,0.16,0.10]:p.rim==='azul'?[0.35,0.6,1.0]:[0,0,0];
  gl.uniform3fv(U.uRimC,rim);gl.uniform1f(U.uRimK,p.rim?(p.rim==='rojo'?1.15:0.9):0);
  gl.bindBuffer(gl.ARRAY_BUFFER,GL.vb);
  // aP y aR leen hoy el mismo bloque (malla en reposo). Con esqueleto, aP apuntará a la malla deformada.
  gl.enableVertexAttribArray(GL.A.aP);gl.vertexAttribPointer(GL.A.aP,4,gl.SHORT,true,12,0);
  gl.enableVertexAttribArray(GL.A.aR);gl.vertexAttribPointer(GL.A.aR,4,gl.SHORT,true,12,0);
  gl.enableVertexAttribArray(GL.A.aN);gl.vertexAttribPointer(GL.A.aN,4,gl.UNSIGNED_BYTE,true,12,8);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,GL.ib);gl.drawElements(gl.TRIANGLES,GL.n,gl.UNSIGNED_SHORT,0);
  return true;
}

/* ---------- vistas estáticas (avatares y poses) ---------- */
const VISTAS={
  cabeza:{ar:1,p:{yaw:.35,pitch:.05},c:{zoom:1.6,vy:.36}},
  frente:{ar:.68,p:{yaw:0,pitch:.02},c:{zoom:.96}},
  tresq:{ar:.68,p:{yaw:.6,pitch:.03},c:{zoom:.96}},
  lado:{ar:.68,p:{yaw:1.45,pitch:.03},c:{zoom:.96}},
  espalda:{ar:.68,p:{yaw:3.14,pitch:.03},c:{zoom:.96}},
  movil:{ar:.68,p:{yaw:.45,pitch:.04},c:{zoom:.96}},
  camina:{ar:.68,p:{yaw:.95,pitch:.03,y:.02},c:{zoom:.96}},
  corre:{ar:.68,p:{yaw:1.1,pitch:.13,y:.05},c:{zoom:.9}},
  salta:{ar:.68,p:{yaw:.4,pitch:.02,y:.16,sy:1.03,sx:.98},c:{zoom:.9}},
  sentado:{ar:.68,p:{yaw:.45,pitch:.04,sy:.8,sx:1.06},c:{zoom:.96}},
  agachado:{ar:.68,p:{yaw:.5,pitch:.05,sy:.74,sx:1.08},c:{zoom:.96}},
  feliz:{ar:.68,p:{yaw:.35,pitch:.02,y:.05},c:{zoom:.94}}
};
PJ.VISTAS=VISTAS;
const cubo=n=>n<=96?96:n<=192?192:n<=256?256:n<=340?340:400;
function estadoP(est,p){
  p=Object.assign({},p);
  if(est==='gris')p.gray=1;
  else if(est==='rojo')p.rim='rojo';
  else if(est==='fantasma'){p.alpha=.6;p.gray=.55;p.rim='azul';p.y=(p.y||0)+.05}
  return p;
}
/* Devuelve una data: URL (PNG con transparencia) o null si aún no se puede dibujar. */
PJ.avatar=function(vista,look,est,anchoCss){
  const V=VISTAS[vista];if(!V)return null;
  if(PJ.estado==='sin'){PJ.usa();return null}
  if(PJ.estado!=='listo')return null;
  const w=cubo(Math.round((anchoCss||(vista==='cabeza'?48:150))*2)),h=Math.round(w/V.ar);
  try{
    if(!dibuja(w,h,estadoP(est,V.p),V.c,look))return null;
    return GL.cv.toDataURL('image/png');
  }catch(e){fallaDibujo(e);return null}
};
PJ.tamano=(vista,anchoCss)=>{const V=VISTAS[vista];if(!V)return null;const w=cubo(Math.round((anchoCss||150)*2));return {w,h:Math.round(w/V.ar)}};

/* ---------- animaciones (todas del cuerpo entero) ---------- */
const RM=G.matchMedia?G.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
const ease=t=>t<0?0:t>1?1:1-Math.pow(1-t,3);
const ANIM={
  /* respiración y balanceo suave */
  reposo(v,t,rm){
    if(rm)return {p:{yaw:v.yaw},fin:true};
    const b=Math.sin(t*2.0),sw=v.arrastra||Math.abs(v.vel)>.02?0:1;
    return {p:{yaw:v.yaw+sw*.1*Math.sin(t*.8),roll:0,sy:1+.014*b,sx:1-.007*b,pitch:.02+.01*Math.sin(t*.8+1)},fin:false};
  },
  /* revelar: giro rápido y rebote */
  giro(v,t,rm){
    const dur=1.15,u=Math.min(1,t/dur),fin=rm||t>dur+1.1;
    if(rm)return {p:{yaw:.15},fin:true};
    const yaw=Math.PI*(1-ease(u))*3+.15*ease(u);      // 1,5 vueltas y queda de frente
    const tb=Math.max(0,t-dur*.82),y=.2*Math.abs(Math.sin(tb*6.5))*Math.exp(-tb*3.4);
    const land=tb>0?Math.max(0,1-Math.abs(Math.sin(tb*6.5))*1.6)*Math.exp(-tb*3.4):0;
    const p={yaw:yaw+(u>=1?.08*Math.sin((t-dur)*1.2)*ease((t-dur)/.6):0),y,sy:1-.09*land,sx:1+.05*land,pitch:.02};
    return {p,fin:false};
  },
  /* saltitos */
  salto(v,t,rm){
    if(rm)return {p:{yaw:.35,pitch:.02},fin:true};
    const per=.62,u=(t%per)/per,y=.17*4*u*(1-u);
    const sq=Math.max(0,(.14-u)/.14)+Math.max(0,(u-.9)/.1);
    return {p:{yaw:.35+.3*Math.sin(t*3.1),y,sy:1-.08*sq+.03*Math.sin(u*Math.PI),sx:1+.05*sq,pitch:.03},fin:false};
  },
  /* muerte: cae de lado y queda tumbado, en gris */
  muerte(v,t,rm){
    const dur=1.3,u=Math.min(1,t/dur);
    let f=u<.72?Math.pow(u/.72,2.3):1-.05*Math.exp(-7*(u-.72))*Math.cos(26*(u-.72));
    if(rm||t>dur+.6)f=1;
    const p={yaw:.28,pitch:0,roll:-Math.PI/2*f,tx:-1.5*f,gray:rm?1:Math.min(1,u*1.6)};
    return {p,fin:rm||t>dur+.6};
  },
  /* fantasma: semitransparente y flotando */
  fantasma(v,t,rm){
    const p={yaw:v.yaw+(rm?0:.16*Math.sin(t*.7)),y:rm?.06:.07+.06*Math.sin(t*1.5),alpha:.6,gray:.55,rim:'azul',pitch:.03};
    return {p,fin:rm};
  }
};
const CAM={reposo:{zoom:.95},giro:{zoom:.92,vy:.08},salto:{zoom:.9,vy:.08},muerte:{zoom:1.3,vy:-.42,cp:.14},fantasma:{zoom:.88,vy:.05}};

/* ---------- vistas vivas (<canvas data-v>) ---------- */
const vistas=new Map();
let raf=0,ult=0,cola=false;
function parseLook(s){const a=(s||'').split('|');const f=x=>x?'#'+x:null;return {hood:f(a[0]),cloth:f(a[1]),glove:f(a[2]),eye:f(a[3]),pat:+a[4]||0}}
function visible(el){const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<(G.innerHeight||1e4)&&r.right>0&&r.left<(G.innerWidth||1e4)}
function pintaVista(v,ahora){
  const el=v.el;if(!el||!el.isConnected)return false;
  const t=(ahora-v.t0)/1000,rm=RM.matches;
  if(v.fin&&!v.sucio&&!v.arrastra)return false;   // pose final ya dibujada y sin cambios: no gastes GPU
  const A=(ANIM[v.anim]||ANIM.reposo)(v,t,rm);
  const p=Object.assign({},A.p);
  if(v.est==='rojo'&&!p.rim)p.rim='rojo';
  if(v.est==='gris'&&p.gray==null)p.gray=1;
  const dpr=Math.min(G.devicePixelRatio||1,2),w=Math.max(2,Math.round(v.w*dpr)),h=Math.max(2,Math.round(v.h*dpr));
  if(el.width!==w||el.height!==h){el.width=w;el.height=h}
  const c=Object.assign({},CAM[v.anim]||CAM.reposo,v.cam);
  try{if(!dibuja(w,h,p,c,v.look))return null}catch(e){fallaDibujo(e);return null}
  const x=v.ctx||(v.ctx=el.getContext('2d'));x.clearRect(0,0,w,h);x.drawImage(GL.cv,0,0);
  if(!v.pintado){v.pintado=true;el.parentNode&&el.parentNode.classList.add('ok')}
  v.fin=!!A.fin;v.sucio=false;
  return !A.fin;
}
function tick(ts){
  raf=0;
  if(G.document.hidden||!vistas.size||PJ.estado!=='listo')return;
  let anima=false;
  for(const [n,v] of vistas){
    if(!v.el||!v.el.isConnected){vistas.delete(n);continue}
    if(!visible(v.el))continue;
    // inercia tras soltar
    if(!v.arrastra&&Math.abs(v.vel)>.02){v.yaw+=v.vel*Math.min(.05,(ts-ult)/1000||.016);v.vel*=.94;v.sucio=true;anima=true}
    const suave=(v.anim==='reposo'||v.anim==='fantasma')&&!v.arrastra&&Math.abs(v.vel)<.02&&!v.sucio;
    if(suave&&v.ult&&ts-v.ult<32){anima=true;continue}
    v.ult=ts;
    const r=pintaVista(v,ts);if(r)anima=true;
    if(v.arrastra)anima=true;
  }
  ult=ts;
  if(anima)raf=requestAnimationFrame(tick);
}
function arranca(){if(raf||G.document.hidden||!vistas.size||PJ.estado!=='listo')return;ult=performance.now();raf=requestAnimationFrame(tick)}
PJ.arranca=arranca;
G.document&&G.document.addEventListener('visibilitychange',()=>{if(G.document.hidden){if(raf)cancelAnimationFrame(raf);raf=0}else arranca()});
if(RM.addEventListener)RM.addEventListener('change',()=>{for(const v of vistas.values()){v.t0=performance.now();v.sucio=true}arranca()});

/* Monta o actualiza los <canvas data-v> presentes en el DOM. Se llama tras cada render del HTML. */
PJ.aplica=function(){
  const els=G.document.querySelectorAll('canvas[data-v]'),vistos=new Set();
  els.forEach(el=>{
    const n=el.dataset.v;vistos.add(n);
    let v=vistas.get(n);
    const anim=el.dataset.anim||'reposo',est=el.dataset.est||'',clave=anim+'/'+est+'/'+(el.dataset.k||'');
    if(!v){v={name:n,yaw:+el.dataset.yaw||.3,vel:0,arrastra:false,t0:performance.now(),clave,pintado:false};vistas.set(n,v)}
    if(v.clave!==clave){v.clave=clave;v.t0=performance.now();v.sucio=true}
    if(v.el!==el){v.el=el;v.ctx=null;v.pintado=false;v.sucio=true;if(el.dataset.drag)enlaza(el,v)}
    if(v.lk!==el.dataset.lk){v.lk=el.dataset.lk;v.sucio=true}
    v.anim=anim;v.est=est;v.look=parseLook(el.dataset.lk);v.w=+el.dataset.w||120;v.h=+el.dataset.h||160;
    v.cam=el.dataset.zoom?{zoom:+el.dataset.zoom,vy:+el.dataset.vy||0}:null;
    el.style.width=v.w+'px';el.style.height=v.h+'px';
    if(PJ.estado==='sin')PJ.usa();
    else if(PJ.estado==='listo'&&!v.pintado)pintaVista(v,performance.now());   // dibujo síncrono: sin parpadeo tras el render
  });
  for(const n of [...vistas.keys()])if(!vistos.has(n))vistas.delete(n);
  arranca();
};
function enlaza(el,v){
  let x0=0,id=-1,tprev=0;
  el.addEventListener('pointerdown',e=>{id=e.pointerId;x0=e.clientX;v.arrastra=true;v.vel=0;tprev=e.timeStamp;try{el.setPointerCapture(id)}catch(_){}arranca()});
  el.addEventListener('pointermove',e=>{if(e.pointerId!==id||!v.arrastra)return;const dx=e.clientX-x0;x0=e.clientX;v.yaw+=dx*.011;v.sucio=true;const dt=Math.max(1,e.timeStamp-tprev);tprev=e.timeStamp;v.vel=Math.max(-14,Math.min(14,dx*.011/(dt/1000)));arranca()});
  const fin=e=>{if(e.pointerId!==id)return;v.arrastra=false;id=-1;if(RM.matches)v.vel=0;arranca()};
  el.addEventListener('pointerup',fin);el.addEventListener('pointercancel',fin);
  el.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){v.yaw-=.35;v.sucio=true;arranca()}else if(e.key==='ArrowRight'){v.yaw+=.35;v.sucio=true;arranca()}});
}
})(window);
