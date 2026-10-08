/* ============ planner ============ */
function dwellOf(p){const D=vKey==='mall'?{food:40,shop:15,kids:30,ent:25,svc:10,fac:3}:{clinic:10,exam:8,pharm:5,svc:4,emerg:15,fac:3};let d=D[p.c]??10;if(p.q&&p.q[2]==='单')d=6;if(p.id==='IW1')d=3;return d;}
function readyOf(id){const t=tickets.find(t=>t.poi===id&&t.status!=='done');if(t)return Math.max(0,t.ahead*t.rate-t.acc);const q=Q[id];return q?q.n*q.rate:0;}
function perms(a){if(a.length<=1)return [a.slice()];const out=[];a.forEach((x,i)=>{const rest=a.slice(0,i).concat(a.slice(i+1));for(const p of perms(rest))out.push([x,...p]);});return out;}
function plan(phases){
  const flat=[];phases.forEach((ph,pi)=>ph.forEach(id=>flat.push({id,pi})));
  const pts=[{x:disp.x,y:disp.y},...flat.map(f=>({x:SL[f.id].tx,y:SL[f.id].ty}))];
  const cells=pts.map(p=>nearestCell(p.x,p.y));const fields=pts.map(p=>distField(p.x,p.y));
  const D=(i,j)=>fields[i][cells[j]]*RES;
  const ev=seq=>{let t=0,cur=0,wait=0,walkM=0,ph=-1,phStart=0;const used=new Set(),rows=[];
    for(const k of seq){if(flat[k].pi!==ph){ph=flat[k].pi;phStart=t;}const node=k+1,d=D(cur,node);walkM+=d;t+=d/1.1/60;const id=flat[k].id,p=P(id);
      // hospital: queue numbers for a phase are issued when that phase starts (e.g. exams after the doctor orders them)
      const hasTk=tickets.some(t=>t.poi===id&&t.status!=='done');const ready=used.has(id)?0:(vKey==='hosp'&&ph>0&&!hasTk?phStart:0)+readyOf(id);
      const arrive=t,w=Math.max(0,ready-t);t+=w;wait+=w;const dw=dwellOf(p);rows.push({id,arrive,wait:w,dwell:dw,walk:d,leftAtArrive:p.q?Math.max(0,Math.ceil((ready-arrive)/p.q[1])):null});t+=dw;used.add(id);cur=node;}
    return {t,wait,walkM,rows};};
  const idx=phases.map((_,pi)=>flat.map((f,k)=>f.pi===pi?k:-1).filter(k=>k>=0));
  const P2=idx.map(perms);let best=null;
  const rec=(i,acc)=>{if(i===P2.length){const r=ev(acc);if(!best||r.t<best.t)best=r;return;}for(const p of P2[i])rec(i+1,acc.concat(p));};
  rec(0,[]);return {best,base:ev(idx.flat())};}
