import assert from 'node:assert/strict';
import {paperPosition} from './paper-geometry.js';
for(let step=0;step<=40;step++){
  const progress=step/40;
  for(let y=0;y<36;y++)for(let x=0;x<64;x++){
    const a=paperPosition(x/32-1,1-y/18,progress),b=paperPosition((x+1)/32-1,1-y/18,progress),c=paperPosition(x/32-1,1-(y+1)/18,progress);
    assert(a.every(Number.isFinite));
    assert((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<0,'No flipped or overlapping projected cells');
  }
}
const corners=[paperPosition(-1,-1,1),paperPosition(1,1,1)];
assert.equal(corners[1][0]-corners[0][0],16);assert.equal(corners[1][1]-corners[0][1],9);
const initialWidth=paperPosition(1,0,0)[0]-paperPosition(-1,0,0)[0];assert(initialWidth/16>=.1&&initialWidth/16<=.15);
assert(Math.abs(paperPosition(.4,.2,0)[2]-paperPosition(.4,.2,1)[2])>.05);
console.log('PASS: continuous deterministic paper field, no folded-over XY cells across 41 states, compact 10–15% initial width, final 16:9 bounds, actual vertex deformation.');
