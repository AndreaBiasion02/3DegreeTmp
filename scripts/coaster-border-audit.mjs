import fs from 'node:fs/promises';
import sharp from 'sharp';

// Detect an image-model frame that is fused to lettering/illustration and
// therefore cannot be replaced as a detached SVG path.
export async function drawnBorderCoverage(paths) {
  const content=paths.filter(p=>p.fill);
  if (!content.length) return 0;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="2 1 96 96">${content.map(p=>`<path d="${p.d}" fill="black" fill-rule="evenodd"/>`).join('')}</svg>`;
  const {data,info}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const opaque=(x,y)=>{const px=Math.round((x-2)*info.width/96),py=Math.round((y-1)*info.height/96);return px>=0&&px<info.width&&py>=0&&py<info.height&&data[(py*info.width+px)*info.channels+3]>120;};
  let best=0;
  for(let radius=31;radius<=43;radius+=.75){
    let hits=0;
    for(let degrees=0;degrees<360;degrees+=3){
      const a=degrees*Math.PI/180;
      for(let offset=-1.5;offset<=1.5;offset+=.5){
        const r=radius+offset;
        if(opaque(50+r*Math.cos(a),49+r*Math.sin(a))){hits++;break;}
      }
    }
    best=Math.max(best,hits/120);
  }
  return best;
}

if(process.argv[1]?.endsWith('coaster-border-audit.mjs')){
  const files=(await fs.readdir('scripts/coaster-artworks')).filter(file=>file.endsWith('.json'));
  for(const file of files){const art=JSON.parse(await fs.readFile(`scripts/coaster-artworks/${file}`));const score=await drawnBorderCoverage(art.paths);console.log(`${file.replace('.json','')} ${score.toFixed(3)}`);}
}
