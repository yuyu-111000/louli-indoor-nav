const VENUES={mall:window.LouliSession.bundle.catalog,hosp:window.LouliSession.bundle.catalog};
let vKey=window.LouliSession.bundle.venue.type==='hospital'?'hosp':'mall',V=VENUES[vKey];
const P=id=>({id,...V.poi[id]});
const catOf=p=>{const c=V.cats[p.c]||['','',6];return [c[0],c[1],c[2]>=1&&c[2]<=6?c[2]:6];};
const glyphStyle=p=>{const k=catOf(p)[2];return `--t:var(--t${k});--g:var(--g${k})`;};
