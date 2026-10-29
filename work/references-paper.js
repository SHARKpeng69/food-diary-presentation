import * as THREE from './vendor/three.module.js';
import {gsap} from './vendor/gsap-core.js';
import {paperPosition} from './paper-geometry.js';

export function createReferencePaper(view,{wake,reduced=false}){
  const host=view.querySelector('.references-stage'),canvas=host.querySelector('canvas'),sheet=view.querySelector('.references-sheet');
  const heading=sheet.querySelector('h2'),list=sheet.querySelector('ol'),replay=view.querySelector('.references-replay'),skip=view.querySelector('.references-skip');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,16/9,.1,100);camera.position.z=(9/.85)/2/Math.tan(16*Math.PI/180);
  scene.add(new THREE.HemisphereLight(0xffffff,0x8c8070,2));
  const key=new THREE.DirectionalLight(0xfff5e8,2.4);key.position.set(-7,9,12);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-11;key.shadow.camera.right=11;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.normalBias=.025;key.shadow.radius=4;scene.add(key);
  const fill=new THREE.DirectionalLight(0xe8efff,.7);fill.position.set(6,-3,8);scene.add(fill);
  const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=128;
  const textureContext=textureCanvas.getContext('2d'),pixels=textureContext.createImageData(128,128);
  for(let i=0;i<pixels.data.length;i+=4){const grain=((i*1664525+1013904223)>>>0)%9-4;pixels.data[i]=244+grain;pixels.data[i+1]=240+grain;pixels.data[i+2]=231+grain;pixels.data[i+3]=255;}
  textureContext.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(textureCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(6,3.375);
  const columns=64,rows=36,count=(columns+1)*(rows+1),positions=new Float32Array(count*6),indices=[];
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;indices.push(a,d,b,a,c,d,count+a,count+b,count+d,count+a,count+d,count+c);}
  const border=[];for(let x=0;x<=columns;x++)border.push(x);for(let y=1;y<=rows;y++)border.push(y*(columns+1)+columns);for(let x=columns-1;x>=0;x--)border.push(rows*(columns+1)+x);for(let y=rows-1;y>0;y--)border.push(y*(columns+1));
  for(let i=0;i<border.length;i++){const a=border[i],b=border[(i+1)%border.length];indices.push(a,count+a,b,b,count+a,count+b);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setIndex(indices);
  const uvs=new Float32Array(count*4);for(let side=0;side<2;side++)for(let i=0;i<count;i++){uvs[(side*count+i)*2]=(i%(columns+1))/columns;uvs[(side*count+i)*2+1]=Math.floor(i/(columns+1))/rows;}geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
  const material=new THREE.MeshStandardMaterial({color:0xe8e0d1,map:texture,roughness:1,metalness:0,flatShading:true});
  const paper=new THREE.Mesh(geometry,material);paper.castShadow=true;paper.frustumCulled=false;scene.add(paper);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(36,24),new THREE.ShadowMaterial({opacity:.22}));shadow.position.z=-1.6;shadow.receiveShadow=true;scene.add(shadow);
  const values={unfold:0,tilt:1,heading:0,text:0};let active=false,failed=false,dirty=true,elapsed=0,last=0,width=0,height=0;
  const timeline=gsap.timeline({paused:true}).to(values,{unfold:.4,tilt:.4,duration:1.1,ease:'power2.inOut'},1).to(values,{unfold:1,tilt:0,duration:1.3,ease:'power2.inOut'},2.1).to(values,{heading:1,duration:.45,ease:'sine.out'},3.4).to(values,{text:1,duration:.8,ease:'sine.out'},3.7);
  gsap.ticker.sleep();
  // Drive the paused timeline from the presentation's existing RAF, without a second ticker.
  function seek(time){timeline.time(time);gsap.ticker.sleep();}
  function showText(){heading.style.opacity=values.heading;list.style.opacity=values.text;sheet.inert=values.text<.99;sheet.setAttribute('aria-hidden',String(values.text<.01));replay.hidden=elapsed<4.5;skip.hidden=elapsed>=4.5;view.dataset.paperPhase=elapsed<1?'crumpled':elapsed<3.4?'unfolding':elapsed<4.5?'revealing':'complete';}
  function deform(){
    for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){const i=y*(columns+1)+x,[px,py,pz]=paperPosition(x/columns*2-1,1-y/rows*2,values.unfold);for(let side=0;side<2;side++){const j=(side*count+i)*3;positions[j]=px;positions[j+1]=py;positions[j+2]=pz+(side===0?.006:-.006);}}
    geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();paper.rotation.set(.35*values.tilt,-.25*values.tilt,.08*values.tilt);showText();
  }
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;}}
  function finish(){elapsed=4.5;seek(4.5);dirty=true;showText();wake();}
  function start(){elapsed=reduced?4.5:0;last=0;seek(elapsed);dirty=true;heading.style.opacity=0;list.style.opacity=0;showText();wake();}
  function fail(){failed=true;view.dataset.paperState='fallback';sheet.inert=false;sheet.removeAttribute('aria-hidden');heading.style.opacity=list.style.opacity=1;replay.hidden=skip.hidden=true;}
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail();});
  replay.addEventListener('click',start);skip.addEventListener('click',finish);
  skip.disabled=false;
  const observer=new ResizeObserver(()=>{dirty=true;if(active)wake();});observer.observe(host);
  view.dataset.paperState='ready';deform();
  return {
    setActive(value){if(active===value)return;active=value;last=0;if(value)start();else{elapsed=0;seek(0);dirty=true;}},
    setReduced(value){if(reduced===value)return;reduced=value;if(active&&value)finish();},
    update(time){
      if(!active||failed||document.hidden){last=0;return false;}resize();
      const moving=elapsed<4.5;if(moving){if(last)elapsed=Math.min(4.5,elapsed+Math.min(80,time-last)/1000);last=time;seek(elapsed);dirty=true;}
      if(dirty){deform();renderer.render(scene,camera);dirty=false;}
      return elapsed<4.5;
    }
  };
}
