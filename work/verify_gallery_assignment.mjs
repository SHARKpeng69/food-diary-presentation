import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./index.template.html',import.meta.url),'utf8');
const assign=vm.runInNewContext(source.match(/function assignGalleryPhotos[\s\S]*?(?=\nconst points=)/)[0]+';assignGalleryPhotos');
const count=Number(source.match(/const N=(\d+)/)[1]);
const pointFunction=source.match(/function unitPoint\(i\)\{.*?\}\n/)[0];
const makePoint=vm.runInNewContext('const N='+count+',GA=Math.PI*(3-Math.sqrt(5));'+pointFunction+';unitPoint');
const points=Array.from({length:count},(_,i)=>makePoint(i));
const chapters=vm.runInNewContext('const DETAILS={exterior:""};'+source.match(/const CHAPTERS=(\[[\s\S]*?\]);/)[0]+';CHAPTERS.map(c=>c.photo)');
const eligible=count-chapters.length;
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(const photoCount of [0,1,5,9,15,16,20])for(let seed=1;seed<=10;seed++){
  const photos=Array.from({length:photoCount},(_,i)=>({original:'photo-'+i}));
  const assignment=assign(points,chapters,photos,rng(seed));
  assert.equal(assignment.size,photoCount?eligible:0);
  assert([...assignment.keys()].every(slot=>!chapters.includes(slot)));
  const uses=photos.map(photo=>[...assignment.values()].filter(value=>value===photo).length);
  assert.equal(uses.filter(Boolean).length,Math.min(photoCount,eligible));
  if(photoCount&&photoCount<=eligible)assert(Math.max(...uses)-Math.min(...uses)<=1);
  if(photoCount>=eligible)assert(uses.every(n=>n<=1));
  if(photoCount===9){
    const angles=photos.map(photo=>[...assignment].filter(([,value])=>value===photo).map(([slot])=>slot)).filter(slots=>slots.length===2).map(([a,b])=>Math.acos(Math.max(-1,Math.min(1,points[a].x*points[b].x+points[a].y*points[b].y+points[a].z*points[b].z)))*180/Math.PI);
    assert.equal(angles.length,eligible-9);assert(Math.min(...angles)>120);
  }
}
const photos=Array.from({length:9},(_,i)=>({original:'photo-'+i}));
const a=assign(points,chapters,photos,rng(1)),b=assign(points,chapters,photos,rng(2));
assert.notDeepEqual([...a].map(([i,p])=>[i,p.original]),[...b].map(([i,p])=>[i,p.original]));
console.log(`PASS: ${eligible} eligible slots; 0/1/5/9/15/16/20-photo cases; every image used before repeats; balanced reuse; excess images omitted; repeated pairs >120° apart; different reload seeds change assignments.`);
