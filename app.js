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
const cv=$('sky'),R=new THREE.WebGLRenderer({canvas:cv,antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(75,4/3,.1,100);scene.fog=null;
const N=STARS.length,pos=new Float32Array(N*3),tgt=new Float32Array(N*3),size=new Float32Array(N);
for(let i=0;i<N;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(30);pos.set([v.x,v.y,v.z],i*3);size[i]=Math.max(1.2,(5.2-STARS[i][2])*2.8)}
const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('size',new THREE.BufferAttribute(size,1));
const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{pr:{value:R.getPixelRatio()}},
 vertexShader:'attribute float size;uniform float pr;varying float a;void main(){vec4 p=modelViewMatrix*vec4(position,1.);a=smoothstep(-2.,1.,position.y);gl_PointSize=size*pr;gl_Position=projectionMatrix*p;}',
 fragmentShader:'varying float a;void main(){float d=length(gl_PointCoord-.5);float k=smoothstep(.5,0.,d);gl_FragColor=vec4(vec3(.81,.89,1.)*(1.+k),k*a);}'});
scene.add(new THREE.Points(g,mat));
const lg=new THREE.BufferGeometry(),lmat=new THREE.LineBasicMaterial({color:0x7CFFB2,transparent:true,opacity:.45});const lines=new THREE.LineSegments(lg,lmat);scene.add(lines);
const ground=new THREE.Mesh(new THREE.CircleGeometry(40,48),new THREE.MeshBasicMaterial({color:0x05070a}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.5;scene.add(ground);
let yaw=0,pitch=.55,drag=null;
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
 lineA+=(((m<1&&$('lines').checked)?.45:0)-lineA)*.08;lmat.opacity=lineA;
 if(!drag&&!RM)yaw+=.0004;cam.lookAt(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));R.render(scene,cam)}
// ---- static
const sc=$('static'),sx=sc.getContext('2d');sc.width=160;sc.height=120;
(function st(){if(body.dataset.scene==='off'||RM){const im=sx.createImageData(160,120);for(let i=0;i<im.data.length;i+=4){const v=Math.random()*255;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}sx.putImageData(im,0,0)}if(!RM)requestAnimationFrame(st)})();
// ---- poster (2D stereographic from zenith)
const STY={midnatt:['#0B0D12','#F2EDE3','#7CFFB2'],dyp:['#0E1F3D','#FFFFFF','#FFB54A'],lys:['#F2EDE3','#14161c','#9a7b4f']};
let style='midnatt',sz=['30×40',399],ship=99;
function drawPoster(){const p=$('poster'),x=p.getContext('2d'),[bg,fg,ac]=STY[style],{c,d}=when(),f=horizon(c[1],c[2],d),cx=300,cy=330,r=240;
 x.fillStyle=bg;x.fillRect(0,0,600,800);x.save();x.beginPath();x.arc(cx,cy,r,0,7);x.clip();x.fillStyle=style==='lys'?'#e8e1d3':bg;x.fill();
 const P=(ra,de)=>{const v=f(ra,de);if(v[1]<0)return null;const k=r/(1+v[1]);return[cx+v[0]*k,cy+v[2]*k]};
 if($('lines').checked){x.strokeStyle=ac;x.globalAlpha=.6;x.lineWidth=1;for(const L of LINES)for(let k=0;k<L.length-1;k++){const a=P(...L[k]),b=P(...L[k+1]);if(a&&b){x.beginPath();x.moveTo(...a);x.lineTo(...b);x.stroke()}}x.globalAlpha=1}
 x.fillStyle=fg;for(const s of STARS){const q=P(s[0],s[1]);if(q){x.beginPath();x.arc(q[0],q[1],Math.max(.5,(5-s[2])*.9),0,7);x.fill()}}
 x.restore();x.strokeStyle=fg;x.lineWidth=2;x.beginPath();x.arc(cx,cy,r,0,7);x.stroke();
 x.textAlign='center';x.fillStyle=fg;x.font='34px AB';x.fillText(($('cap').value||'Vår himmel').toUpperCase(),300,640);
 x.font='16px In';x.globalAlpha=.75;x.fillText(`${c[0]} · ${d.toLocaleDateString('no-NO',{day:'numeric',month:'long',year:'numeric'})} · ${$('time').value}`,300,680);
 x.fillText(`${Math.abs(c[1]).toFixed(2)}°${c[1]>=0?'N':'S'}  ${Math.abs(c[2]).toFixed(2)}°${c[2]>=0?'Ø':'V'}`,300,706);x.globalAlpha=1;}
// ---- flow
function turnOn(){if(body.dataset.scene!=='off')return;go('sky');if(!RM)for(let i=0;i<pos.length;i++)pos[i]=(Math.random()-.5)*80;update(RM);
 if(!RM){$('ident').classList.add('show');setTimeout(()=>$('ident').classList.remove('show'),1400)}}
$('knob').onclick=$('on').onclick=turnOn;$('screen').addEventListener('click',()=>body.dataset.scene==='off'&&turnOn());
['place','date','time','lines'].forEach(i=>$(i).addEventListener('change',()=>update()));$('cap').addEventListener('input',()=>{$('capShow').textContent=$('cap').value;drawPoster()});
const seg=(id,fn)=>$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$(id).children].forEach(x=>x.classList.toggle('on',x===b));fn(b.dataset);price()});
seg('styles',d=>{style=d.s;drawPoster()});seg('sizes',d=>sz=[d.z,+d.p]);seg('ship',d=>ship=+d.c);
function price(){$('barTxt').textContent=`${sz[1]} NOK + ~${ship} frakt`;$('tot').textContent=sz[1]+ship;
 $('sum').textContent=`Stjernekart ${sz[0]} · ${$('styles').querySelector('.on').textContent} · ${CITIES[$('place').value][0]}`;
 $('next').textContent=(body.dataset.scene==='print'||body.classList.contains('simple'))?'Bestill':'Se plakaten'}
$('next').onclick=()=>{if(body.dataset.scene==='sky'&&!body.classList.contains('simple')){go('print');drawPoster()}else go('checkout');price();scrollTo(0,0)};
$('back').onclick=()=>{go(body.classList.contains('simple')?'sky':'print');price()};
$('order').onclick=()=>{const n=(+localStorage.k0no||0)+1;localStorage.k0no=n;const no=String(n).padStart(4,'0');
 console.log('[KANAL 0 DEMO order]',{no,place:CITIES[$('place').value][0],date:$('date').value,time:$('time').value,caption:$('cap').value,style,size:sz[0],total:sz[1]+ship});
 $('no').textContent=no;const fin=()=>{go('done');scrollTo(0,0)};
 if(RM||body.classList.contains('simple'))return fin();go('sky');scrollTo(0,0);$('dot').classList.remove('go');void $('dot').offsetWidth;$('dot').classList.add('go');setTimeout(fin,1150)};
$('again').onclick=()=>{$('dot').classList.remove('go');go(body.classList.contains('simple')?'sky':'off');price()};
$('mode').onclick=()=>{const s=body.classList.toggle('simple');$('mode').textContent=s?'KANAL 0-opplevelse':'Enkel visning';if(s&&['off','done'].includes(body.dataset.scene)){go('sky');update(true)}else if(s&&body.dataset.scene==='print')go('sky');drawPoster();price()};
update(true);go('off');price();loop();
