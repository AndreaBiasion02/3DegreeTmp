import fs from 'node:fs';
import opentype from 'opentype.js';
import {ShapePath} from 'three';
import pc from 'polygon-clipping';
import sharp from 'sharp';
import {faceTriangles,walls,writeGlb,writeStl} from './coaster-geometry.mjs';

// Millimetres. The colored inlay and the base finish together at z = 4.
const fonts={bold:opentype.loadSync('C:/Windows/Fonts/arialbd.ttf'),mono:opentype.loadSync('C:/Windows/Fonts/courbd.ttf')};
const entries=[
 ['110-vodka','110 e vodka',['110','e vodka'],'toast','#dc2626','#ffffff'],
 ['laureato-per-sbaglio','Laureato per sbaglio',['LAUREATO','per sbaglio'],'stamp','#facc15','#222222'],
 ['dottore-linkedin','Dottore su LinkedIn',['Dottore','su LinkedIn'],'profile','#2458b8','#ffffff'],
 ['finalmente-disoccupato','Finalmente disoccupato',['FINALMENTE','disoccupato'],'stamp','#803fa1','#ffffff'],
 ['missione-compiuta','Missione compiuta. Più o meno.',['MISSIONE','COMPIUTA.','Più o meno.'],'mission','#218c45','#ffffff'],
 ['ctrl-alt-laurea','CTRL + ALT + LAUREA',['CTRL + ALT','+ LAUREA'],'keys','#222222','#facc15'],
 ['achievement-dottore','Achievement unlocked: Dottore',['Achievement','unlocked:','DOTTORE'],'game','#803fa1','#ffffff'],
 ['game-over-universita','Game Over: Università',['GAME OVER:','Università'],'game','#222222','#ffffff'],
 ['respawn-lavoro','Respawn: mondo del lavoro',['RESPAWN:','mondo del','lavoro'],'game','#2458b8','#ffffff'],
 ['laureato-exe','Laureato.exe ha smesso di funzionare',['Laureato.exe','ha smesso di','funzionare'],'window','#222222','#ffffff'],
 ['chatgpt-ce-labbiamo-fatta','ChatGPT ce l’abbiamo fatta',['ChatGPT','ce l’abbiamo','fatta'],'chat','#218c45','#ffffff'],
 ['3-anni-in-7','3 anni in 7 comodi anni',['3 anni in','7','comodi anni'],'numbers','#f97316','#222222'],
 ['sotto-pressione','Studiavo meglio sotto pressione',['STUDIAVO','MEGLIO','sotto pressione'],'pressure','#dc2626','#ffffff'],
 ['tesi-mai-sentita','Tesi? Mai sentita.',['TESI?','Mai sentita.'],'chat','#facc15','#222222'],
 ['caffe-ansia','Powered by caffè e ansia',['Powered by','CAFFÈ','e ansia'],'coffee','#222222','#ffffff'],
 ['ctrl-c-ctrl-v','Laureato con CTRL+C / CTRL+V',['Laureato con','CTRL+C','/ CTRL+V'],'keys','#2458b8','#ffffff'],
];
const poly=p=>[p],rect=(x,y,w,h)=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]);
const circle=(x,y,r,n=96)=>poly(Array.from({length:n+1},(_,i)=>[x+r*Math.cos(i*2*Math.PI/n),y+r*Math.sin(i*2*Math.PI/n)]));
const union=(...p)=>pc.union(...p),diff=(a,b)=>pc.difference(a,b);
const line=(a,b,w=1.2)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),x=-dy*w/2/l,y=dx*w/2/l;return poly([[a[0]+x,a[1]+y],[b[0]+x,b[1]+y],[b[0]-x,b[1]-y],[a[0]-x,a[1]-y],[a[0]+x,a[1]+y]]);};
const ring=(r,w=1)=>diff(circle(0,0,r),circle(0,0,r-w));
function textShape(text,y,size,maxWidth,font='bold'){
 const f=fonts[font],s=Math.min(size,maxWidth/f.getAdvanceWidth(text,1)),p=f.getPath(text,0,0,s),box=p.getBoundingBox(),cx=(box.x1+box.x2)/2,cy=(box.y1+box.y2)/2,sp=new ShapePath();
 for(const c of p.commands){const x=v=>v-cx,Y=v=>-v+cy+y;if(c.type==='M')sp.moveTo(x(c.x),Y(c.y));else if(c.type==='L')sp.lineTo(x(c.x),Y(c.y));else if(c.type==='C')sp.bezierCurveTo(x(c.x1),Y(c.y1),x(c.x2),Y(c.y2),x(c.x),Y(c.y));else if(c.type==='Q')sp.quadraticCurveTo(x(c.x1),Y(c.y1),x(c.x),Y(c.y));else if(c.type==='Z')sp.currentPath.closePath();}
 return sp.toShapes().map(s=>{const p=s.extractPoints(5);return [p.shape,...p.holes].map(r=>r.map(v=>[Math.round(v.x*1e5)/1e5,Math.round(v.y*1e5)/1e5]));});
}
function icon(style,y){
 if(style==='toast')return union(poly([[-9,y+7],[9,y+7],[0,y-2],[-9,y+7]]),rect(-.9,y-9,1.8,8),rect(-6,y-10,12,1.8),line([12,y+4],[16,y+7],1.6),line([-12,y+4],[-16,y+7],1.6));
 if(style==='coffee')return union(diff(rect(-8,y-5,14,10),rect(-6,y-3,10,7)),diff(circle(7,y,4),circle(7,y,2)),rect(-10,y-8,22,1.5),line([-4,y+7],[-2,y+11]),line([2,y+7],[4,y+11]));
 if(style==='profile')return union(circle(0,y+4,4),poly([[-8,y-7],[-7,y-1],[0,y+1],[7,y-1],[8,y-7],[-8,y-7]]));
 if(style==='chat')return union(diff(rect(-12,y-7,24,15),rect(-10.5,y-5.5,21,12)),poly([[-8,y-6],[-8,y-11],[-2,y-6],[-8,y-6]]),circle(-6,y+.5,1.2),circle(0,y+.5,1.2),circle(6,y+.5,1.2));
 if(style==='game')return diff(poly([[-10,y+5],[10,y+5],[14,y-6],[9,y-8],[5,y-4],[-5,y-4],[-9,y-8],[-14,y-6],[-10,y+5]]),union(rect(-8,y-2,6,1.5),rect(-5.75,y-4.25,1.5,6),circle(6,y,1.5),circle(9,y-3,1.5)));
 if(style==='mission')return union(line([-8,y],[-2,y-6],3),line([-2,y-6],[9,y+7],3));
 if(style==='pressure')return union(diff(circle(0,y,10),union(circle(0,y,8),rect(-12,y-12,24,12))),line([0,y],[6,y+7],2),circle(0,y,2));
 return union(poly([[0,y+8],[2,y+2],[8,y],[2,y-2],[0,y-8],[-2,y-2],[-8,y],[-2,y+2],[0,y+8]]),circle(-15,y,1.5),circle(15,y,1.5));
}
function design(lines,style){
 let parts=style==='window'?[]:[ring(44,1.1)];
 const tech=['keys','window','game'].includes(style);
 if(style==='window'){
  parts.push(diff(rect(-37,-23,74,50),rect(-35.5,-21.5,71,47)),rect(-36,16,72,1.3),circle(-31,21,1.1),circle(-26,21,1.1),circle(-21,21,1.1));
  lines.forEach((t,i)=>parts.push(textShape(t,8-i*11,9,65,'mono')));
 }else if(style==='numbers'){
  parts.push(textShape(lines[0],23,10,65),textShape(lines[1],0,43,55),textShape(lines[2],-24,10,67));
 }else if(style==='keys'){
  parts.push(textShape(lines[0],lines.length===2?12:22,10,lines.length===2?68:58,'mono'));
  lines.slice(1).forEach((t,i)=>{const y=(lines.length===2?-9:5)-i*22;parts.push(diff(rect(-34,y-8,68,17),rect(-32.5,y-6.5,65,14)),textShape(t,y,12,61,'mono'));});
 }else if(style==='stamp'){
  parts.push(textShape(lines[0],9,12,74),textShape(lines[1],-9,14,69),line([-12,-24],[12,-24],1.5));
 }else{
  parts.push(icon(style,25));
  const ys=style==='mission'||style==='pressure'?[6,-8,-22]:lines.length===2?[0,-18]:[6,-9,-24];
  lines.forEach((t,i)=>parts.push(textShape(t,ys[i],(style==='mission'||style==='pressure')&&i===2?11:style==='toast'&&i===0?25:i===0?12:14, style==='mission'||style==='pressure'?(i===2?60:68):i===lines.length-1?69:74,tech?'mono':'bold')));
  if(lines.length===2)parts.push(line([-12,-31],[12,-31],1.5));
 }
 return union(...parts);
}
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const pathData=shape=>shape.map(p=>p.map(r=>'M'+r.map(([x,y])=>`${x.toFixed(4)},${(-y).toFixed(4)}`).join('L')+'Z').join('')).join('');
const base=union(circle(0,0,50,160)),products=JSON.parse(fs.readFileSync('src/lib/products.json','utf8')).filter(p=>p.kind!=='coaster');
fs.mkdirSync('public/models/sottobicchieri',{recursive:true});
const report=[];
for(const [slug,phrase,lines,style,bg,fg] of entries){
 const art=design(lines,style),top=diff(base,art),pname='sottobicchiere-'+slug;
 if(pc.difference(art,base).length)throw Error('Artwork outside coaster: '+slug);
 const baseTris=[...faceTriangles(top,4),...faceTriangles(art,3.4),...walls(art,3.4,4,true),...walls(base,0,4),...faceTriangles(base,0,true)];
 const inkTris=[...faceTriangles(art,4),...faceTriangles(art,3.4,true),...walls(art,3.4,4)];
 writeGlb([{name:'coaster_base',tris:baseTris,color:rgb(bg)},{name:'coaster_ink',tris:inkTris,color:rgb(fg)}],`public/products/${pname}.glb`);
 writeStl(baseTris,`public/models/sottobicchieri/${slug}-base.stl`);writeStl(inkTris,`public/models/sottobicchieri/${slug}-grafica.stl`);
 // Render the very same polygons as the 3D inlay, with a slight tilt to reveal thickness.
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1860" height="1420" viewBox="0 0 465 355"><rect width="465" height="355" fill="#f0efed"/><ellipse cx="235" cy="302" rx="141" ry="12" fill="#222222" opacity=".10"/><g transform="translate(232.5 177) scale(2.78 2.65)"><circle cy="3" r="50" fill="#222222"/><circle r="50" fill="${bg}"/><path d="${pathData(art)}" fill="${fg}" fill-rule="evenodd"/></g></svg>`;
 for(const [suffix,width] of [['',465],['@2x',930],['@4x',1860]])await sharp(Buffer.from(svg)).resize(width).webp({quality:95}).toFile(`public/products/${pname}${suffix}.webp`);
 products.push({slug:pname,name:phrase,description:`Sottobicchiere di laurea con la frase “${phrase}” e tag NFC integrato. Avvicina lo smartphone per aprire le foto e i ricordi della laurea.`,kind:'coaster',collection:'sottobicchieri-laurea',dimensions:[100,100,4],assembly:'Sottobicchiere rotondo con scritta e grafica a filo della superficie e tag NFC integrato.',image:`/products/${pname}.webp`,model:`/products/${pname}.glb`,openModel:`/products/${pname}.glb`,colors:{structure:bg,accent:fg}});
 report.push({slug:pname,phrase,diameterMm:100,heightMm:4,inlayDepthMm:.6,triangles:baseTris.length+inkTris.length});
 console.log(phrase);
}
fs.writeFileSync('src/lib/products.json',JSON.stringify(products,null,2)+'\n');
fs.writeFileSync('public/models/sottobicchieri/geometry-report.json',JSON.stringify(report,null,2)+'\n');
const thumbs=await Promise.all(products.filter(p=>p.kind==='coaster').map(p=>sharp('public'+p.image).resize(465,355).toBuffer()));
await sharp({create:{width:1860,height:1420,channels:3,background:'#f0efed'}}).composite(thumbs.map((input,i)=>({input,left:i%4*465,top:Math.floor(i/4)*355}))).png().toFile('public/models/sottobicchieri/anteprima-collezione.png');
