import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export function createFloor(host) {
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38,1,.1,100);
  const controls = new OrbitControls(camera,renderer.domElement); controls.enableZoom = false; controls.enablePan = false; controls.maxPolarAngle = Math.PI / 2.2;
  const reset = () => { camera.position.set(9,12,13); controls.target.set(0,0,0); controls.update(); draw(); };
  scene.add(new THREE.HemisphereLight(0xffffff,0x405442,3));
  const light = new THREE.DirectionalLight(0xffedce,3); light.position.set(4,10,6); scene.add(light);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(12,.15,8),new THREE.MeshStandardMaterial({color:0x34483a,roughness:1})); floor.position.y=-.15; scene.add(floor);
  const grid = new THREE.GridHelper(12,12,0x71816c,0x465e4a); grid.position.y=-.06; grid.scale.z=.667; scene.add(grid);
  const colors = [0xb7d88e,0x8cc9c7,0xd6b38d];
  const units = [];
  const deskGeometry = new THREE.BoxGeometry(1.25,.15,.75);
  const baseGeometry = new THREE.BoxGeometry(.8,.6,.45);
  const headGeometry = new THREE.SphereGeometry(.17,12,8);
  for(let i=0;i<24;i++) {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({color:colors[i%3],roughness:.55,transparent:true});
    const desk = new THREE.Mesh(deskGeometry,material); desk.position.y=.65;
    const base = new THREE.Mesh(baseGeometry,new THREE.MeshStandardMaterial({color:0x516355,transparent:true})); base.position.y=.25;
    const head = new THREE.Mesh(headGeometry,material); head.position.set(0,.7,.65);
    group.add(desk,base,head); scene.add(group); units.push({group,material,base});
  }
  let active = true; let disposed = false;
  function draw() { if(active && !disposed && !document.hidden) renderer.render(scene,camera); }
  function resize() { const width=host.clientWidth,height=host.clientHeight; if(!width||!height)return; renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();draw(); }
  const observer = new ResizeObserver(resize); observer.observe(host); controls.addEventListener('change',draw);
  document.addEventListener('visibilitychange',draw);
  function onLost(event) { event.preventDefault(); dispose(); host.querySelector('#floor-fallback').hidden=false; }
  renderer.domElement.addEventListener('webglcontextlost',onLost);
  function dispose() { if(disposed)return;disposed=true;observer.disconnect();controls.dispose();document.removeEventListener('visibilitychange',draw);renderer.domElement.removeEventListener('webglcontextlost',onLost);const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove(); }
  reset();resize();
  return { reset,dispose,setActive(value){active=value;if(value)resize();},update(seats,team){seats.forEach((seat,i)=>{units[i].group.position.set((seat.x-2.5)*1.75,0,(seat.z-1.5)*1.65);units[i].material.color.setHex(colors[seat.team]);const opacity=team==='all'||Number(team)===seat.team?1:.16;units[i].material.opacity=opacity;units[i].base.material.opacity=opacity;});draw();} };
}
