import * as THREE from './vendor/three.module.min.js';
import {STARS,LINES} from './assets/sky.js';
const $=id=>document.getElementById(id), RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const CITIES=[['Oslo',59.91,10.75],['Bergen',60.39,5.32],['Trondheim',63.43,10.39],['Stavanger',58.97,5.73],['Tromsø',69.65,18.96],['Bodø',67.28,14.4],['Kristiansand',58.15,8.0],['Ålesund',62.47,6.15],['Lofoten',68.23,14.57],['Svalbard',78.22,15.65],['København',55.68,12.57],['Stockholm',59.33,18.07],['London',51.51,-0.13],['Paris',48.86,2.35],['New York',40.71,-74.0],['Tokyo',35.68,139.69],['Sydney',-33.87,151.21],['Cape Town',-33.92,18.42]];
CITIES.forEach((c,i)=>$('place').add(new Option(c[0],i)));
$('date').value=new Date().toISOString().slice(0,10);
const body=document.body, go=s=>body.dataset.scene=s;
// ---- astronomy: RA/Dec -> horizon unit vector
function horizon(lat,lon,d){const jd=d.getTime()/864e5+2440587.5,lst=(280.46061837+360.98564736629*(jd-2451545)+lon)*Math.PI/180,φ=lat*Math.PI/180;
 return (ra,de)=>{ra*=Math.PI/180;de*=Math.PI/180;const H=lst-ra,sa=Math.sin(de)*Math.sin(φ)+Math.cos(de)*Math.cos(φ)*Math.cos(H),alt=Math.asin(sa);
  const az=Math.atan2(-Math.sin(H)*Math.cos(de),Math.sin(de)*Math.cos(φ)-Math.cos(de)*Math.sin(φ)*Math.cos(H));
  return [Math.cos(alt)*Math.sin(az),sa,-Math.cos(alt)*Math.cos(az)];}}
function when(){const[c]=[CITIES[$('place').value]];return{c,d:new Date($('date').value+'T'+($('time').value||'22:00'))}}
// ---- three
const cv=$('sky'),R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});R.setClearColor(0,0);R.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(68,4/3,.1,100);scene.fog=null;
const N=STARS.length,pos=new Float32Array(N*3),tgt=new Float32Array(N*3),size=new Float32Array(N),tint=new Float32Array(N);
for(let i=0;i<N;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(30);pos.set([v.x,v.y,v.z],i*3);size[i]=Math.max(2.2,Math.pow(5.6-STARS[i][2],1.45)*2.4);tint[i]=Math.random()}
const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('size',new THREE.BufferAttribute(size,1));g.setAttribute('tint',new THREE.BufferAttribute(tint,1));
const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{pr:{value:R.getPixelRatio()},t:{value:0}},
 vertexShader:'attribute float size;attribute float tint;uniform float pr;uniform float t;varying float a;varying vec3 c;void main(){vec4 p=modelViewMatrix*vec4(position,1.);a=smoothstep(-1.5,2.,position.y)*(.82+.18*sin(t*2.+tint*40.));c=mix(vec3(.75,.85,1.),vec3(1.,.9,.75),step(.75,tint));gl_PointSize=size*pr;gl_Position=projectionMatrix*p;}',
 fragmentShader:'varying float a;varying vec3 c;void main(){float d=length(gl_PointCoord-.5)*2.;float core=exp(-d*d*18.);float halo=exp(-d*d*3.)*.35;float k=(core+halo)*(1.-smoothstep(.8,1.,d));gl_FragColor=vec4(c*k*a*1.6,1.);}'});
scene.add(new THREE.Points(g,mat));
const lg=new THREE.BufferGeometry(),lmat=new THREE.LineBasicMaterial({color:0x7CFFB2,transparent:true,opacity:0,blending:THREE.AdditiveBlending});const lines=new THREE.LineSegments(lg,lmat);scene.add(lines);
const ground=new THREE.Mesh(new THREE.CircleGeometry(40,48),new THREE.MeshBasicMaterial({color:0x020305}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.5;scene.add(ground);
const dome=new THREE.Mesh(new THREE.SphereGeometry(45,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying float h;void main(){vec3 top=vec3(.012,.016,.035);vec3 hz=vec3(.05,.09,.16);gl_FragColor=vec4(mix(hz,top,smoothstep(-.02,.45,h)),1.);}'}));dome.renderOrder=-1;scene.add(dome);
let yaw=0,pitch=.42,drag=null;
cv.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.005;pitch=Math.min(1.5,Math.max(.05,pitch+(e.clientY-drag[1])*.004));drag=[e.clientX,e.clientY]});
cv.addEventListener('pointerup',()=>drag=null);
function update(instant){const{c,d}=when(),f=horizon(c[1],c[2],d);
 STARS.forEach((s,i)=>{const v=f(s[0],s[1]);tgt.set([v[0]*30,v[1]*30,v[2]*30],i*3)});
 if(instant||RM)pos.set(tgt);
 const lp=[];for(const L of LINES)for(let k=0;k<L.length-1;k++){const a=f(...L[k]),b=f(...L[k+1]);if(a[1]>-.05||b[1]>-.05)lp.push(...a.map(x=>x*29.8),...b.map(x=>x*29.8))}
 lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));
 $('info').innerHTML=`${c[0].toUpperCase()}<br>${d.toLocaleDateString('no-NO')} ${$('time').value}`;
 $('capShow').textContent=$('cap').value;drawPoster();}
let lineA=0;
function loop(){requestAnimationFrame(loop);const w=cv.clientWidth,h=cv.clientHeight;if(!w)return;
 if(cv.width!==Math.round(w*R.getPixelRatio())){R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
 let m=0;for(let i=0;i<pos.length;i++){const dd=tgt[i]-pos[i];pos[i]+=dd*.06;m=Math.max(m,Math.abs(dd))}g.attributes.position.needsUpdate=true;
 lineA+=(((m<1&&$('lines').checked)?.28:0)-lineA)*.08;lmat.opacity=lineA;
 if(!drag&&!RM)yaw+=.0004;cam.lookAt(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));mat.uniforms.t.value=performance.now()/1000;R.render(scene,cam)}
// ---- static
const sc=$('static'),sx=sc.getContext('2d');sc.width=160;sc.height=120;
(function st(){if(body.dataset.scene==='off'||body.classList.contains('tuning')){const im=sx.createImageData(160,120);for(let i=0;i<im.data.length;i+=4){const v=Math.random()*255;im.data[i]=v*.85;im.data[i+1]=v*.92;im.data[i+2]=v;im.data[i+3]=255}sx.putImageData(im,0,0)}if(!RM)requestAnimationFrame(st)})();
// ---- poster (2D stereographic from zenith)
const STY={midnatt:['#0B0D12','#F2EDE3','#7CFFB2'],dyp:['#13264a','#F7F3EA','#FFB54A'],lys:['#F2EDE3','#14161c','#8a6a3f']};
let style='midnatt',sz=['30×40',399],ship=99;
function renderPoster(p){const x=p.getContext('2d'),W=1200,H=1600,[bg,fg,ac]=STY[style],{c,d}=when(),f=horizon(c[1],c[2],d),cx=600,cy=640,r=430;
 x.setTransform(p.width/W,0,0,p.height/H,0,0);x.fillStyle=bg;x.fillRect(0,0,W,H);
 const gr=x.createRadialGradient(cx,cy,0,cx,cy,r*1.3);gr.addColorStop(0,style==='lys'?'#ffffff40':'#ffffff0c');gr.addColorStop(1,'#0000');x.fillStyle=gr;x.fillRect(0,0,W,H);
 x.strokeStyle=fg;x.globalAlpha=.55;x.lineWidth=1.5;x.strokeRect(60,60,W-120,H-120);x.globalAlpha=1;
 x.save();x.beginPath();x.arc(cx,cy,r,0,7);x.clip();
 x.globalAlpha=.12;x.strokeStyle=fg;x.lineWidth=1;for(const k of [.33,.66]){x.beginPath();x.arc(cx,cy,r*k,0,7);x.stroke()}
 for(let i=0;i<12;i++){const t=i*Math.PI/6;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(t)*r,cy+Math.sin(t)*r);x.stroke()}x.globalAlpha=1;
 const P=(ra,de)=>{const v=f(ra,de);if(v[1]<0)return null;const k=r/(1+v[1]);return[cx+v[0]*k,cy+v[2]*k]};
 if($('lines').checked){x.strokeStyle=ac;x.globalAlpha=.5;x.lineWidth=1.6;x.lineCap='round';for(const L of LINES)for(let k=0;k<L.length-1;k++){const a=P(...L[k]),b=P(...L[k+1]);if(a&&b){x.beginPath();x.moveTo(...a);x.lineTo(...b);x.stroke()}}x.globalAlpha=1}
 for(const s of STARS){const q=P(s[0],s[1]);if(!q)continue;const rad=Math.max(1.4,Math.pow(5.4-s[2],1.35)*1.5);
  if(s[2]<2&&style!=='lys'){x.globalAlpha=.09;x.fillStyle=fg;x.beginPath();x.arc(q[0],q[1],rad*2,0,7);x.fill()}x.globalAlpha=1;x.fillStyle=fg;x.beginPath();x.arc(q[0],q[1],rad,0,7);x.fill()}
 x.restore();x.strokeStyle=fg;x.lineWidth=3;x.beginPath();x.arc(cx,cy,r,0,7);x.stroke();x.lineWidth=1;x.globalAlpha=.5;x.beginPath();x.arc(cx,cy,r+14,0,7);x.stroke();x.globalAlpha=1;
 x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';x.font='500 20px Plex';[['N',0,-1],['Ø',-1,0],['S',0,1],['V',1,0]].forEach(([l,dx,dy])=>{x.globalAlpha=.7;x.fillText(l,cx+dx*(r+38),cy+dy*(r+38))});x.globalAlpha=1;
 x.textBaseline='alphabetic';x.font='italic 76px Fr';x.fillText($('cap').value||'Vår himmel',600,1250);
 x.fillStyle=fg;x.globalAlpha=.4;x.fillRect(560,1295,80,2);x.globalAlpha=.85;
 const sp=t=>t.toUpperCase().split('').join(String.fromCharCode(8202));
 x.font='500 24px Plex';x.fillText(sp(`${c[0]} · ${d.toLocaleDateString('no-NO',{day:'numeric',month:'long',year:'numeric'})} · ${$('time').value}`),600,1350);
 x.globalAlpha=.6;x.font='22px Plex';x.fillText(`${Math.abs(c[1]).toFixed(4)}° ${c[1]>=0?'N':'S'}   ${Math.abs(c[2]).toFixed(4)}° ${c[2]>=0?'Ø':'V'}`,600,1395);
 x.globalAlpha=.4;x.font='500 15px Plex';x.fillText(sp('KANAL 0 · NATTSENDING'),600,1490);x.globalAlpha=1;}
function drawPoster(){renderPoster($('poster'));renderPoster($('thumb'))}
// ---- flow
function turnOn(){if(body.dataset.scene!=='off')return;if(!RM){body.classList.add('tuning');setTimeout(()=>body.classList.remove('tuning'),60)}go('sky');if(!RM)for(let i=0;i<pos.length;i++)pos[i]=(Math.random()-.5)*80;update(RM);
 if(!RM){$('ident').classList.add('show');setTimeout(()=>$('ident').classList.remove('show'),1400)}}
$('knob').onclick=$('on').onclick=turnOn;$('screen').addEventListener('click',()=>body.dataset.scene==='off'&&turnOn());
['place','date','time','lines'].forEach(i=>$(i).addEventListener('change',()=>update()));$('cap').addEventListener('input',()=>{$('capShow').textContent=$('cap').value;drawPoster()});
const seg=(id,fn)=>$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$(id).children].forEach(x=>x.classList.toggle('on',x===b));fn(b.dataset);price()});
seg('styles',d=>{style=d.s;drawPoster()});seg('sizes',d=>sz=[d.z,+d.p]);seg('ship',d=>ship=+d.c);
function price(){$('barTxt').textContent=`${sz[0]} cm · ${sz[1]} kr + frakt ${ship} kr`;$('lp').textContent=sz[1]+' kr';$('ls').textContent=ship+' kr';$('tot').textContent=sz[1]+ship;
 $('sum').textContent=`Stjernekart ${sz[0]} · ${$('styles').querySelector('.on').textContent}\n${CITIES[$('place').value][0]} · ${$('date').value}`;
 $('next').textContent=(body.dataset.scene==='print'||body.classList.contains('simple'))?'Til bestilling →':'Se plakaten →'}
$('next').onclick=()=>{if(body.dataset.scene==='sky'&&!body.classList.contains('simple')){go('print');drawPoster()}else go('checkout');price();scrollTo(0,0)};
$('back').onclick=()=>{go(body.classList.contains('simple')?'sky':'print');price()};
$('order').onclick=()=>{const n=(+localStorage.k0no||0)+1;localStorage.k0no=n;const no=String(n).padStart(4,'0');
 console.log('[KANAL 0 DEMO order]',{no,place:CITIES[$('place').value][0],date:$('date').value,time:$('time').value,caption:$('cap').value,style,size:sz[0],total:sz[1]+ship});
 $('no').textContent=no;const fin=()=>{go('done');scrollTo(0,0)};
 if(RM||body.classList.contains('simple'))return fin();go('sky');scrollTo(0,0);$('dot').classList.remove('go');void $('dot').offsetWidth;$('dot').classList.add('go');setTimeout(fin,1150)};
$('again').onclick=()=>{$('dot').classList.remove('go');go(body.classList.contains('simple')?'sky':'off');price()};
$('mode').onclick=()=>{const s=body.classList.toggle('simple');$('mode').textContent=s?'◉ KANAL 0-opplevelse':'Enkel visning';if(s&&['off','done'].includes(body.dataset.scene)){go('sky');update(true)}else if(s&&body.dataset.scene==='print')go('sky');drawPoster();price()};
update(true);go('off');price();loop();
if(RM)$('mode').click();
document.fonts.ready.then(drawPoster);
