/* ============ radio environment ============ */
const APS=[];[18,36,54,70,86,104,122].forEach(x=>{APS.push({x,y:20});APS.push({x,y:64});});
APS.push({x:18,y:34},{x:18,y:50},{x:122,y:34},{x:122,y:50},{x:70,y:28},{x:70,y:58},{x:6,y:20},{x:134,y:20},{x:6,y:66},{x:134,y:66},{x:32,y:33},{x:108,y:51});
for(const p of APS){p.x=p.x*BW/140;p.y=p.y*BH/84;}
const BCN=buildBeaconLayout(MAP,window.LouliSession.bundle.catalog.poi);
const EM=[...APS.map(p=>({...p,k:'ap',P0:-38,n:2.7,sd:4.5,thr:-88})),...BCN.map(p=>({...p,k:'bl',P0:-60,n:2.2,sd:3.5,thr:-94}))];
const AP_IDX=EM.map((e,i)=>e.k==='ap'?i:-1).filter(i=>i>=0), ALL_IDX=EM.map((e,i)=>i);
function walls(x0,y0,x1,y1){const L=hyp(x1-x0,y1-y0),n=Math.ceil(L/.35);let prev=1,c=0;for(let i=1;i<=n;i++){const w=isWalk(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n)?1:0;if(prev&&!w)c++;prev=w;}return Math.min(c,4);}
function rssi(e,x,y){const d=hyp(e.x-x,e.y-y);if(d>46)return -100;return e.P0-10*e.n*Math.log10(Math.max(1,d))-4.5*walls(e.x,e.y,x,y);}
const DB=(()=>{const xs=[],ys=[];for(let y=1;y<BH;y+=2)for(let x=1;x<BW;x+=2)if(isWalk(x,y)){xs.push(x);ys.push(y);}
  const E=EM.length,v=new Float32Array(xs.length*E);
  for(let p=0;p<xs.length;p++)for(let e=0;e<E;e++){const r=rssi(EM[e],xs[p],ys[p]);v[p*E+e]=r<EM[e].thr?-100:r;}
  return {xs,ys,v,E,N:xs.length};})();
function scan(x,y){return EM.map(e=>{const r=rssi(e,x,y);if(r<=-100)return -100;const m=r+gauss()*e.sd;return m<e.thr?-100:m;});}
function wknn(meas,dims,prior){const {xs,ys,v,E,N}=DB;const K=4;const best=[];
  for(let p=0;p<N;p++){if(prior&&hyp(xs[p]-prior.x,ys[p]-prior.y)>30)continue;let d=0;const o=p*E;for(const e of dims){const q=meas[e]-v[o+e];d+=q*q;}
    if(best.length<K||d<best[K-1].d){best.push({p,d});best.sort((a,b)=>a.d-b.d);if(best.length>K)best.pop();}}
  if(!best.length)return prior?wknn(meas,dims,null):null;
  let sw=0,x=0,y=0;for(const b of best){const w=1/(Math.sqrt(b.d)+1e-3);sw+=w;x+=w*xs[b.p];y+=w*ys[b.p];}x/=sw;y/=sw;
  let sp=0;for(const b of best){const w=1/(Math.sqrt(b.d)+1e-3);sp+=w*((xs[b.p]-x)**2+(ys[b.p]-y)**2);}
  return {x,y,spread:Math.sqrt(sp/sw)};}

/* ============ EKF: state [x, y, heading] ============ */
const ekf={ready:false,s:[0,0,0],P:[[1,0,0],[0,1,0],[0,0,1]],rej:0};
function ekfInit(x,y,h){ekf.s=[x,y,h];ekf.P=[[9,0,0],[0,9,0],[0,0,rad(20)**2]];ekf.ready=true;ekf.rej=0;}
function mm(A,B){return A.map(r=>B[0].map((_,j)=>r.reduce((s,v,k)=>s+v*B[k][j],0)));}
const tr=A=>A[0].map((_,j)=>A.map(r=>r[j]));
function ekfPredict(L,dpsi){const s=ekf.s;let th=s[2]+dpsi;const c=Math.cos(th),sn=Math.sin(th);
  const prev={x:s[0],y:s[1]};
  const F=[[1,0,-L*sn],[0,1,L*c],[0,0,1]],G=[[c,-L*sn],[sn,L*c],[0,1]];
  const sL=.08*L+.03,sP=rad(2.5);const Qu=[[sL*sL,0],[0,sP*sP]];
  let P=mm(mm(F,ekf.P),tr(F));const Q=mm(mm(G,Qu),tr(G));
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)P[i][j]+=Q[i][j];P[0][0]+=.01;P[1][1]+=.01;P[2][2]+=rad(.2)**2;
  // map constraint: a step may not cross a wall; slide along it (try nearby headings) and nudge heading toward the free direction
  let nx,ny,ok=false;
  for(const d of [0,15,-15,30,-30,45,-45]){const t=th+rad(d);const b={x:prev.x+L*Math.cos(t),y:prev.y+L*Math.sin(t)};
    if(isWalk(b.x,b.y)&&!crossesWall(prev,b)){nx=b.x;ny=b.y;th+=.3*wrap(t-th);ok=true;break;}}
  if(!ok){const q=nearestWalkPt(prev.x+L*c,prev.y+L*sn);nx=q.x;ny=q.y;}
  ekf.s=[nx,ny,wrap(th)];ekf.P=P;}
function ekfUpdate(zx,zy,sig){const s=ekf.s,P=ekf.P;let r2=sig*sig;
  let S=[[P[0][0]+r2,P[0][1]],[P[1][0],P[1][1]+r2]];let det=S[0][0]*S[1][1]-S[0][1]*S[1][0];let Si=[[S[1][1]/det,-S[0][1]/det],[-S[1][0]/det,S[0][0]/det]];
  const y=[zx-s[0],zy-s[1]];const d2=y[0]*(Si[0][0]*y[0]+Si[0][1]*y[1])+y[1]*(Si[1][0]*y[0]+Si[1][1]*y[1]);
  if(d2>13.8){ekf.rej++;if(ekf.rej<4)return false;r2*=4;S=[[P[0][0]+r2,P[0][1]],[P[1][0],P[1][1]+r2]];det=S[0][0]*S[1][1]-S[0][1]*S[1][0];Si=[[S[1][1]/det,-S[0][1]/det],[-S[1][0]/det,S[0][0]/det]];}
  ekf.rej=0;const K=[0,1,2].map(i=>[P[i][0]*Si[0][0]+P[i][1]*Si[1][0],P[i][0]*Si[0][1]+P[i][1]*Si[1][1]]);
  const nx=s[0]+K[0][0]*y[0]+K[0][1]*y[1],ny=s[1]+K[1][0]*y[0]+K[1][1]*y[1];ekf.s[2]=wrap(s[2]+K[2][0]*y[0]+K[2][1]*y[1]);
  const nP=[0,1,2].map(i=>[0,1,2].map(j=>P[i][j]-K[i][0]*P[0][j]-K[i][1]*P[1][j]));
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const m=(nP[i][j]+nP[j][i])/2;nP[i][j]=nP[j][i]=m;}ekf.P=nP;
  const q=nearestWalkPt(nx,ny);ekf.s[0]=q.x;ekf.s[1]=q.y;return true;}
function crossesWall(a,b){const L=hyp(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(L/.2));for(let i=1;i<n;i++)if(!isWalk(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return true;return false;}
