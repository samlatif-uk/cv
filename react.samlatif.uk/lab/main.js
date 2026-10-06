import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { jobs, recommendations, firstYear, lastYear, matchingJobs, commonSkills } from './atlas-data.js';
import './style.css';

const $ = id => document.getElementById(id);
const colors = { Finance: '#edba69', Product: '#94c9b4', Creative: '#b4a4d6' };
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const state = { skill: 'All', sector: 'All', year: lastYear, selected: 0, paused: motionQuery.matches };
let sceneApi;
let visible = jobs;
const element = (tag, text, className) => {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
};

function selectJob(id, focus = false) {
  if (!visible.some(job => job.id === id)) return;
  state.selected = id;
  renderDetails();
  document.querySelectorAll('[data-job]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.job) === id)));
  $('engagement').value = String(id);
  sceneApi?.update();
  sceneApi?.focus(id);
  if (focus) $('project').focus({ preventScroll: false });
}

function renderDetails() {
  const job = jobs[state.selected];
  const hasSelection = visible.some(item => item.id === state.selected);
  $('project-number').textContent = hasSelection ? String(job.id + 1).padStart(2, '0') + ' / ' + jobs.length : '—';
  $('project-sector').textContent = hasSelection ? job.sector + ' / ' + job.year : 'NO MATCHES';
  $('project-name').textContent = hasSelection ? job.co : 'A different connection.';
  $('project-date').textContent = hasSelection ? job.date : 'Adjust the filters to continue exploring.';
  $('project-role').textContent = hasSelection ? job.title : '';
  $('project-description').textContent = hasSelection ? job.desc : '';
  $('project-outcomes').replaceChildren(...(hasSelection ? job.bullets.map(text => element('li', text)) : []));
  $('project-stack').replaceChildren(...(hasSelection ? job.stack.map(text => element('span', text)) : []));
  $('recommendations').replaceChildren();
  if (hasSelection) {
    recommendations.filter(rec => rec.jobCompany === job.co).forEach(rec => {
      const quote = element('blockquote', '“' + rec.quote + '”');
      quote.append(element('cite', rec.by + ' · ' + rec.relationship));
      $('recommendations').append(quote);
    });
  }
  const index = visible.findIndex(item => item.id === state.selected);
  $('position').textContent = hasSelection ? `${index + 1} OF ${visible.length} ENGAGEMENTS` : '0 ENGAGEMENTS';
  $('previous').disabled = $('next').disabled = visible.length < 2;
  document.querySelector('.project-content').scrollTop = 0;
}

function renderFilters() {
  visible = matchingJobs(state.skill, state.sector, state.year);
  if (!visible.some(job => job.id === state.selected)) state.selected = visible[0]?.id ?? -1;
  document.querySelectorAll('[data-skill]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.skill === state.skill)));
  document.querySelectorAll('[data-sector]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sector === state.sector)));
  $('year-label').textContent = state.year === lastYear ? 'All years' : state.year;
  $('year').value = state.year;
  $('count').textContent = `${visible.length} / ${jobs.length} ENGAGEMENTS`;
  $('empty').hidden = visible.length > 0;
  $('engagement').disabled = !visible.length;
  $('timeline-rail').replaceChildren();
  $('engagement').replaceChildren();
  [...visible].reverse().forEach(job => {
    const button = element('button', undefined, 'timeline-item');
    button.dataset.job = job.id;
    button.setAttribute('aria-label', `${job.co}, ${job.date}`);
    button.setAttribute('aria-pressed', String(job.id === state.selected));
    button.append(element('span', String(job.year)), element('strong', job.co));
    button.addEventListener('click', () => selectJob(job.id));
    $('timeline-rail').append(button);
    const option = element('option', `${job.co} · ${job.date}`);
    option.value = job.id;
    $('engagement').append(option);
  });
  $('engagement').value = state.selected;
  renderDetails();
  sceneApi?.update();
}

document.querySelectorAll('[data-skill]').forEach(button => button.addEventListener('click', () => { state.skill = button.dataset.skill; renderFilters(); }));
document.querySelectorAll('[data-sector]').forEach(button => button.addEventListener('click', () => { state.sector = button.dataset.sector; renderFilters(); }));
$('year').min = firstYear;
$('year').max = lastYear;
$('year').addEventListener('input', event => { state.year = Number(event.target.value); renderFilters(); });
$('clear').addEventListener('click', () => { Object.assign(state, { skill: 'All', sector: 'All', year: lastYear, selected: 0 }); renderFilters(); sceneApi?.reset(); });
$('engagement').addEventListener('change', event => selectJob(Number(event.target.value)));
for (const [id, direction] of [['previous', -1], ['next', 1]]) {
  $(id).addEventListener('click', () => {
    const index = visible.findIndex(job => job.id === state.selected);
    const job = visible[(index + direction + visible.length) % visible.length];
    if (job) selectJob(job.id);
  });
}
function syncMotion() {
  $('motion').textContent = state.paused ? 'Resume motion' : 'Pause motion';
  $('motion').setAttribute('aria-pressed', String(state.paused));
}
$('motion').addEventListener('click', () => { state.paused = !state.paused; syncMotion(); });
motionQuery.addEventListener('change', event => { state.paused = event.matches; syncMotion(); });
$('reset').addEventListener('click', () => sceneApi?.reset());
$('zoom-in').addEventListener('click', () => sceneApi?.zoom(.85));
$('zoom-out').addEventListener('click', () => sceneApi?.zoom(1.18));
renderFilters();
syncMotion();

function createAtlas() {
  const host = $('scene');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setClearColor(0x111612, 0);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
  camera.position.set(0, 3.2, 16);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .065;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = .55;
  controls.maxPolarAngle = Math.PI - .55;
  controls.autoRotateSpeed = .22;
  controls.target.set(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xe3efd4, 1.8));
  const key = new THREE.PointLight(0xffd299, 80, 30); key.position.set(2, 5, 7); scene.add(key);
  const fill = new THREE.PointLight(0x7bd9ba, 35, 25); fill.position.set(-5, -2, 4); scene.add(fill);
  const root = new THREE.Group(); scene.add(root);
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const nodes = [];
  const labels = [];
  const sectorIndices = { Finance: 0, Product: 0, Creative: 0 };
  const centers = { Finance: [-2.45, .65, .1], Product: [2.25, .65, -.4], Creative: [.2, -1.9, .3] };
  const anchors = new Set([0, 1, 4, 9, 12, 16, 17, 25]);
  jobs.forEach(job => {
    const ordinal = sectorIndices[job.sector]++;
    const angle = ordinal * 2.39996 + .4;
    const radius = .7 + Math.sqrt(ordinal) * .45;
    const center = centers[job.sector];
    const position = new THREE.Vector3(center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius * .85, center[2] + Math.sin(ordinal * 1.7) * 1.2);
    const material = new THREE.MeshStandardMaterial({ color: colors[job.sector], emissive: colors[job.sector], emissiveIntensity: .25, roughness: .3, metalness: .5, transparent: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    const size = anchors.has(job.id) ? .14 : .085;
    mesh.scale.setScalar(size);
    mesh.userData = { id: job.id, size, targetScale: size };
    root.add(mesh); nodes.push(mesh);
    const label = element('button', job.co, 'node-label');
    label.style.setProperty('--node-color', colors[job.sector]);
    label.dataset.job = job.id;
    label.setAttribute('aria-label', `Explore ${job.co}, ${job.date}`);
    label.addEventListener('click', () => selectJob(job.id));
    $('labels').append(label);
    labels.push(label);
  });

  // Connect only engagements with a real shared skill, keeping the map legible.
  const edges = [];
  jobs.forEach((job, index) => {
    const nearest = jobs.slice(index + 1).map(other => ({ other, skills: commonSkills(job, other) }))
      .filter(item => item.skills.length).sort((a, b) => b.skills.length - a.skills.length).slice(0, 3);
    nearest.forEach(({ other, skills }) => {
      const start = nodes[index].position; const end = nodes[other.id].position;
      const middle = start.clone().add(end).multiplyScalar(.5); middle.z -= .5;
      const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(28)), new THREE.LineBasicMaterial({ color: 0x76947a, transparent: true, opacity: .18 }));
      root.add(line); edges.push({ line, a: index, b: other.id, skills });
    });
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.3, .008, 6, 64), new THREE.MeshBasicMaterial({ color: 0xffd39b, transparent: true, opacity: .8 }));
  root.add(halo);
  // Fine meridians give the field a sculptural form without obscuring the data.
  const scaffold = new THREE.Group(); root.add(scaffold);
  for (let ring = 0; ring < 5; ring++) {
    const points = Array.from({ length: 161 }, (_, index) => {
      const angle = index / 160 * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * (4.75 - ring * .21), Math.sin(angle) * (3.05 + ring * .1), 0);
    });
    const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x60795d, transparent: true, opacity: .09 }));
    orbit.rotation.x = .28 + ring * .33; orbit.rotation.y = ring * .3;
    scaffold.add(orbit);
  }
  const stars = new Float32Array(210 * 3);
  for (let i = 0; i < 210; i++) {
    // Deterministic distribution keeps the composition stable across visits.
    const noise = n => Math.sin(n * 127.1 + 311.7) * 43758.5453 % 1;
    stars[i * 3] = noise(i + 1) * 8;
    stars[i * 3 + 1] = noise(i + 401) * 5;
    stars[i * 3 + 2] = noise(i + 801) * 5 - 2;
  }
  const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  root.add(new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0x95ad88, size: .016, transparent: true, opacity: .4, sizeAttenuation: true })));
  const projected = new THREE.Vector3();
  let width = 1, height = 1, compact = false, disposed = false;
  let targetFocus = null;
  let frame = 0;
  let lastTime = 0;
  const resize = () => {
    width = host.clientWidth; height = host.clientHeight; compact = width < 600;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  };
  const reset = () => {
    targetFocus = null; controls.target.set(0, 0, 0);
    camera.position.set(0, 3.2, compact ? 22 : 16);
    controls.update();
  };
  const observer = new ResizeObserver(() => { const old = compact; resize(); if (old !== compact) reset(); });
  observer.observe(host); resize(); reset();
  const update = () => {
    const ids = new Set(visible.map(job => job.id));
    nodes.forEach((mesh, id) => {
      mesh.userData.active = ids.has(id);
      mesh.material.opacity = ids.has(id) ? 1 : .09;
      mesh.material.emissiveIntensity = id === state.selected ? 1.2 : .25;
      mesh.userData.targetScale = mesh.userData.size * (id === state.selected ? 1.55 : 1);
      labels[id].setAttribute('aria-pressed', String(id === state.selected));
    });
    edges.forEach(edge => {
      const active = ids.has(edge.a) && ids.has(edge.b);
      const selected = state.selected === edge.a || state.selected === edge.b;
      edge.line.material.color.set(selected ? 0xe1b774 : 0x739e81);
      edge.line.material.opacity = !active ? .025 : selected ? .55 : .19;
    });
    halo.visible = state.selected >= 0;
    if (halo.visible) halo.position.copy(nodes[state.selected].position);
  };
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = null;
  const onDown = event => { down = [event.clientX, event.clientY]; targetFocus = null; };
  const onUp = event => {
    if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 8) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(nodes).find(item => item.object.userData.active);
    if (hit) selectJob(hit.object.userData.id);
    down = null;
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  const tick = time => {
    if (disposed || document.hidden || time - lastTime < 30) return;
    const delta = Math.min((time - lastTime) / 1000, .1); lastTime = time;
    controls.autoRotate = !state.paused && !targetFocus;
    if (targetFocus) {
      const offset = targetFocus.clone().sub(controls.target);
      if (offset.length() < .01) targetFocus = null;
      else { offset.multiplyScalar(motionQuery.matches ? 1 : .09); controls.target.add(offset); camera.position.add(offset); }
    }
    controls.update(delta);
    halo.quaternion.copy(camera.quaternion);
    nodes.forEach(mesh => mesh.scale.lerp(new THREE.Vector3().setScalar(mesh.userData.targetScale), .12));
    renderer.render(scene, camera);
    if (frame++ % 2 === 0) {
      const occupied = [];
      const order = [...jobs].sort((a,b) => (b.id === state.selected) - (a.id === state.selected) || Number(anchors.has(b.id)) - Number(anchors.has(a.id)));
      let labelCount = 0;
      for (const job of order) {
        const label = labels[job.id];
        const wanted = nodes[job.id].userData.active && (anchors.has(job.id) || job.id === state.selected || visible.length < 9);
        if (!wanted || labelCount >= (compact ? 4 : 8)) { label.hidden = true; continue; }
        projected.copy(nodes[job.id].position).project(camera);
        const x = (projected.x * .5 + .5) * width;
        const y = (-projected.y * .5 + .5) * height - 26;
        const half = Math.min(150, job.co.length * 3.2 + 17);
        const collision = occupied.some(box => Math.abs(box.x - x) < box.half + half && Math.abs(box.y - y) < 42);
        const outside = projected.z > 1 || x < half + 8 || x > width - half - 8 || y < 60 || y > height - 100;
        label.hidden = collision || outside;
        if (!label.hidden) { label.style.left = x + 'px'; label.style.top = y + 'px'; occupied.push({x,y,half}); labelCount++; }
      }
    }
  };
  renderer.setAnimationLoop(tick);
  const onVisibility = () => { renderer.setAnimationLoop(document.hidden ? null : tick); };
  document.addEventListener('visibilitychange', onVisibility);
  const onLost = event => { event.preventDefault(); showFallback(); };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  $('scene-status').textContent = 'Drag to orbit · Select a point to explore';
  update();
  return {
    update, reset,
    focus(id) { targetFocus = nodes[id].position.clone().multiplyScalar(.3); },
    zoom(factor) { const offset = camera.position.clone().sub(controls.target); offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, 8, 28)); camera.position.copy(controls.target).add(offset); },
    dispose() {
      if (disposed) return; disposed = true;
      renderer.setAnimationLoop(null); observer.disconnect(); controls.dispose();
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      const geometries = new Set(); const materials = new Set();
      scene.traverse(object => { if(object.geometry) geometries.add(object.geometry); if(object.material) materials.add(object.material); });
      geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); renderer.dispose(); renderer.domElement.remove(); $('labels').replaceChildren();
    },
  };
}

function showFallback() {
  sceneApi?.dispose(); sceneApi = null;
  $('scene').replaceChildren(); $('labels').replaceChildren();
  $('fallback').hidden = false;
  $('scene-status').textContent = 'Explore using the timeline and engagement selector';
  document.querySelectorAll('.scene-tools button').forEach(button => button.disabled = true);
}
try { sceneApi = createAtlas(); } catch (error) { console.warn('3D atlas unavailable:', error.message); showFallback(); }
window.addEventListener('pagehide', event => { if (!event.persisted) sceneApi?.dispose(); });
