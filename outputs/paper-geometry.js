const mix=(a,b,t)=>a+(b-a)*t;
const triangle=x=>1-4*Math.abs((x%1+1)%1-.5);

// A continuous height field keeps the sheet closed and avoids self-intersecting folds.
export function paperPosition(u,v,progress){
  const p=Math.max(0,Math.min(1,progress)),fold=1-p;
  const x=8*u*mix(.12,1,p)*Math.sqrt(1-.48*v*v*fold)*(1+.025*fold*Math.sin(6*v+2*u));
  const y=4.5*v*mix(.19,1,p)*Math.sqrt(1-.48*u*u*fold)*(1+.03*fold*Math.cos(5*u-v));
  const creases=.7*triangle(1.7*u+.5*v+.14*Math.sin(4*v))+.5*triangle(1.3*v-.4*u+.11*Math.sin(3*u))+.25*triangle(2.2*u-1.1*v+.31);
  const dome=Math.sqrt(Math.max(.02,1-.82*(u*u+v*v)));
  const z=.65*fold*dome+.38*fold*(1+.5*Math.sin(Math.PI*p))*creases+.003*p*Math.sin(8*u+3*v)*Math.sin(7*v);
  return [x,y,z];
}
