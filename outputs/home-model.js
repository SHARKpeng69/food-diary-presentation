import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { DRACOLoader } from './vendor/DRACOLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const TAU=Math.PI*2,DEG=Math.PI/180,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const MODEL_URL='./assets/home-pad-kra-pao-optimized.glb';

// The presentation owns the only requestAnimationFrame loop, including this viewer.
export function createHomeModel(host,{wake,reduced=false}){
  const canvas=host.querySelector('canvas'),status=host.querySelector('.model-status');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
  renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,20);
  let environment;
  function lightRoom(){
    if(environment)environment.dispose();
    const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
    environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;
    room.dispose();pmrem.dispose();
  }
  lightRoom();scene.environmentIntensity=.65;
  const key=new THREE.DirectionalLight(0xfff4e7,2.4);key.position.set(-3,5,4);scene.add(key);
  const fill=new THREE.HemisphereLight(0xe8f1ff,0x4c4338,1.25);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff,.8);rim.position.set(3,2,-3);scene.add(rim);
  let root=null,radius=.52,distance=2,active=false,ready=false,failed=false,dirty=true,last=0;
  let yaw=0,elevation=45*DEG,shownYaw=0,shownElevation=45*DEG,spinVelocity=0,tiltVelocity=0,idleAfter=0,drag=null;
  let follow={x:0,y:0,tx:0,ty:0},width=0,height=0;
  function resize(){
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;}
    const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect);
    distance=radius/Math.sin(Math.min(vertical,horizontal)/2)*1.1;
    camera.near=Math.max(.001,distance-radius*1.5);camera.far=distance+radius*4;camera.updateProjectionMatrix();
  }
  function placeCamera(){
    const a=shownYaw,b=clamp(shownElevation,20*DEG,70*DEG),flat=distance*Math.cos(b);
    camera.position.set(flat*Math.sin(a),distance*Math.sin(b),flat*Math.cos(a));camera.lookAt(0,0,0);
  }
  function fail(message){failed=true;ready=false;host.dataset.modelState='error';status.textContent=message;wake();}
  const draco=new DRACOLoader().setDecoderPath(new URL('./vendor/draco/',import.meta.url).href).setWorkerLimit(1);
  new GLTFLoader().setDRACOLoader(draco).loadAsync(MODEL_URL,event=>{
    if(event.lengthComputable)status.textContent='Loading 3D dish · '+Math.round(event.loaded/event.total*100)+'%';
  }).then(async gltf=>{
    draco.dispose();root=gltf.scene;root.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(root),centre=box.getCenter(new THREE.Vector3());root.position.sub(centre);root.updateMatrixWorld(true);
    // Use the actual vertex sphere, rather than empty corners of the plate's box.
    const sphere=new THREE.Sphere().makeEmpty();root.traverse(node=>{if(node.isMesh){node.geometry.computeBoundingSphere();sphere.union(node.geometry.boundingSphere.clone().applyMatrix4(node.matrixWorld));}});
    radius=sphere.radius+sphere.center.length();scene.add(root);resize();placeCamera();
    status.textContent='Preparing materials…';await renderer.compileAsync(scene,camera);
    if(failed)return;ready=true;dirty=true;
    if(active){resize();placeCamera();renderer.render(scene,camera);host.dataset.modelState='ready';}
    wake();
  }).catch(()=>{draco.dispose();fail('3D dish unavailable. Check the local model file or WebGL, then reload the preview.');});

  function interact(){idleAfter=performance.now()+3000;dirty=true;wake();}
  function endDrag(event){
    if(!drag||event.pointerId!==drag.id)return;
    drag=null;canvas.classList.remove('dragging');if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    if(event.type!=='pointerup')spinVelocity=tiltVelocity=0;interact();
  }
  canvas.addEventListener('pointerdown',event=>{
    if(!active||!ready||event.pointerType!=='mouse'||event.button!==0)return;
    event.preventDefault();canvas.focus({preventScroll:true});follow.tx=follow.ty=0;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,time:event.timeStamp};spinVelocity=tiltVelocity=0;
    canvas.setPointerCapture(event.pointerId);canvas.classList.add('dragging');interact();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!active||!ready||event.pointerType!=='mouse')return;
    if(drag&&drag.id===event.pointerId){
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y,dt=Math.max(.008,(event.timeStamp-drag.time)/1000),rate=Math.PI/Math.max(450,width);
      yaw-=dx*rate;elevation=clamp(elevation+dy*rate,20*DEG,70*DEG);
      spinVelocity=reduced?0:clamp(-dx*rate/dt,-2,2);tiltVelocity=reduced?0:clamp(dy*rate/dt,-1,1);
      drag.x=event.clientX;drag.y=event.clientY;drag.time=event.timeStamp;
    }else if(!reduced){const r=canvas.getBoundingClientRect();follow.tx=(.5-(event.clientX-r.left)/r.width)*20*DEG;follow.ty=((event.clientY-r.top)/r.height-.5)*20*DEG;}
    interact();
  });
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
  canvas.addEventListener('pointerleave',()=>{follow.tx=follow.ty=0;dirty=true;wake();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail('3D view interrupted. You can return to the gallery or reload this preview.');});
  canvas.addEventListener('webglcontextrestored',()=>{try{lightRoom();failed=false;ready=Boolean(root);dirty=true;wake();}catch{fail('3D view unavailable. Return to the gallery or reload this preview.');}});
  const observer=new ResizeObserver(()=>{if(active){resize();dirty=true;wake();}});observer.observe(host);
  function stopInteraction(){if(drag&&canvas.hasPointerCapture(drag.id))canvas.releasePointerCapture(drag.id);drag=null;canvas.classList.remove('dragging');spinVelocity=tiltVelocity=0;follow.tx=follow.ty=0;}
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden)stopInteraction();else{dirty=true;wake();}});
  window.addEventListener('blur',stopInteraction);
  return {
    setActive(value){
      if(active===value)return;active=value;last=0;dirty=true;
      if(!active)stopInteraction();else{resize();if(ready&&!failed){placeCamera();renderer.render(scene,camera);host.dataset.modelState='ready';}wake();}
    },
    setReduced(value){if(reduced===value)return;reduced=value;follow={x:0,y:0,tx:0,ty:0};spinVelocity=tiltVelocity=0;dirty=true;wake();},
    update(time){
      if(!active||!ready||failed||document.hidden){last=0;return false;}
      const dt=last?Math.min(.1,(time-last)/1000):0;last=time;
      if(!drag){yaw+=spinVelocity*dt;elevation=clamp(elevation+tiltVelocity*dt,20*DEG,70*DEG);const decay=Math.exp(-7*dt);spinVelocity*=decay;tiltVelocity*=decay;if(Math.abs(spinVelocity)<.0001)spinVelocity=0;if(Math.abs(tiltVelocity)<.0001)tiltVelocity=0;
        if(time>=idleAfter){follow.tx=follow.ty=0;if(!reduced)yaw+=TAU/42*dt;}
      }
      const k=reduced?1:1-Math.exp(-dt*9);follow.x+=(follow.tx-follow.x)*k;follow.y+=(follow.ty-follow.y)*k;
      const targetYaw=yaw+follow.x,targetElevation=clamp(elevation+follow.y,20*DEG,70*DEG);
      shownYaw+=(targetYaw-shownYaw)*k;shownElevation+=(targetElevation-shownElevation)*k;
      const moving=!reduced||Boolean(drag)||Math.abs(targetYaw-shownYaw)+Math.abs(targetElevation-shownElevation)>.0001;
      if(dirty||moving){resize();placeCamera();renderer.render(scene,camera);host.dataset.modelState='ready';dirty=false;}
      return moving;
    }
  };
}
