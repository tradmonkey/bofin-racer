import * as THREE from 'three';
import { ROUTES, buildRoute, crossedCheckpoint, ghostPose, formatTime } from './racing.js';
import { makeVehicle, disposeVehicle } from './vehicles.js';
import { setPalletCargo } from './vehicle-cargo.js';
export function createRaceMode({ scene, roads, starts, heightAt, begin, toast, setCargo = () => {}, leaderboard = null }) {
  const select = document.getElementById('race-route');
  const status = document.getElementById('race-status');
  const countdown = document.getElementById('race-countdown');
  function text(id, value) {
    const element = document.getElementById(id);
    if (element.textContent !== value) element.textContent = value;
  }
  function updateMetrics(r, state) {
    const next = r.course.checkpoints[r.checkpoint];
    text('race-time', formatTime(r.elapsed));
    text('race-gates', `${r.checkpoint}/${r.course.checkpoints.length}`);
    text('race-next', next ? `${Math.round(Math.hypot(state.x - next.x, state.z - next.z))} m` : 'Done');
    text('race-best', formatTime(r.best?.time));
  }
  function showCountdown(text) {
    if (countdown.textContent !== text) {
      countdown.textContent = text;
      countdown.classList?.remove('countdown-pop');
      void countdown.offsetWidth;
      countdown.classList?.add('countdown-pop');
    }
    countdown.hidden = false;
  }
  const startButton = document.getElementById('race-start');
  const cancelButton = document.getElementById('race-cancel');
  const courses = new Map();
  for (const route of ROUTES) {
    const option = new Option(route.name, route.id);
    try { courses.set(route.id, { ...route, ...buildRoute(roads, starts[route.from], starts[route.to]) }); }
    catch { option.disabled = true; option.textContent += ' (unavailable)'; }
    select.add(option);
  }
  const first = courses.has('doonmore-days') ? 'doonmore-days' : [...courses.keys()][0];
  if (first) select.value = first;
  startButton.disabled = !first;
  let race = null, ghost = null, marker = null, line = null;
  const key = (route, vehicle) => `bofin-race-v1:${route}:${vehicle}`;
  function readBest(route, vehicle) {
    try {
      const saved = JSON.parse(localStorage.getItem(key(route, vehicle)));
      if (!saved || !Number.isFinite(saved.time) || saved.time <= 0 || saved.time > 1800 || !Array.isArray(saved.samples) || saved.samples.length > 19000 || saved.samples.length < 2) return null;
      let previous = -1;
      for (const p of saved.samples) {
        if (![p.t, p.x, p.z, p.heading].every(Number.isFinite) || p.t < previous || p.t < 0 || Math.abs(p.x) > 20000 || Math.abs(p.z) > 20000) return null;
        previous = p.t;
      }
      if (Math.abs(previous - saved.time) > 0.01) return null;
      return saved;
    } catch { return null; }
  }
  function cleanup() {
    if (ghost) { scene.remove(ghost); disposeVehicle(ghost); ghost = null; }
    for (const item of [marker, line]) if (item) {
      scene.remove(item);
      item.traverse(o => { o.geometry?.dispose(); if (o.material) o.material.dispose(); });
    }
    marker = line = null;
  }
  function cancel(message = 'Timed run cancelled') {
    if (!race) return;
    race = null; setCargo(null); cleanup(); cancelButton.hidden = true; countdown.hidden = true;
    status.textContent = message;
    document.getElementById("race-panel").hidden = true;
  }
  function updateMarker() {
    const p = race.course.checkpoints[race.checkpoint];
    marker.position.set(p.x, heightAt(p.x, p.z) + 0.45, p.z);
  }
  startButton.onclick = () => {
    if (leaderboard && !leaderboard.beforeRace()) return;
    cancel();
    const course = courses.get(select.value);
    if (!course) return;
    const vehicle = begin(starts[course.from], course.path, course);
    setCargo(course.cargo);
    const best = readBest(course.id, vehicle);
    race = { course, vehicle, best, identity: leaderboard?.identity(), countdown: 3, elapsed: 0, checkpoint: 0, samples: [], previous: null };
    updateMetrics(race, starts[course.from]);
    status.textContent = course.name;
    // Record the actual starting pose at t=0 for server-side movement checks.
    race.samples.push({t:0,x:starts[course.from].x,z:starts[course.from].z,heading:Math.atan2(course.path[1].x-course.path[0].x,course.path[1].z-course.path[0].z)+(course.reverse?Math.PI:0)});
    showCountdown("3");
    ghost = best ? makeVehicle(vehicle) : null;
    if (ghost) {
      setPalletCargo(ghost, course.cargo === "pallets");
      ghost.traverse(o => {
        if (o.material) { o.material.transparent = true; o.material.opacity = 0.28; o.material.depthWrite = false; }
      });
      ghost.visible = false; scene.add(ghost);
    }
    marker = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 0.24, 8, 48), new THREE.MeshBasicMaterial({ color: '#d5ff77', depthTest: true }));
    ring.rotation.x = Math.PI / 2;
    marker.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 9, 8), new THREE.MeshBasicMaterial({ color: '#d5ff77', transparent: true, opacity: 0.65 }));
    beam.position.y = 4.5; marker.add(beam); scene.add(marker); updateMarker();
    const points = [];
    for (let i = 1; i < course.path.length; i++) {
      const a = course.path[i - 1], b = course.path[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 3));
      for (let j = 0; j <= steps; j++) {
        const x = a.x + (b.x - a.x) * j / steps, z = a.z + (b.z - a.z) * j / steps;
        points.push(new THREE.Vector3(x, heightAt(x, z) + 0.3, z));
      }
    }
    line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#d5ff77', transparent: true, opacity: 0.55 }));
    scene.add(line); cancelButton.hidden = false;
    document.getElementById('race-panel').hidden = false;
    toast((course.reverse ? 'Reverse all the way! Hold S / down to accelerate backwards; W / up brakes. ' : '') + (course.cargo === 'pallets' ? 'Deliver the pallets to the beach party! ' : '') + 'Follow the green route through every checkpoint. Press B or tap Boost for extra speed.');
  };
  cancelButton.onclick = () => cancel();
  return {
    get active() { return !!race; },
    get reverse() { return !!race?.course.reverse; },
    get countingDown() { return !!race && race.countdown > 0; },
    cancel,
    tick(dt, state, heading, active) {
      if (!race) return;
      const r = race;
      if (!active) { status.textContent = `Paused · ${formatTime(r.elapsed)}`; return; }
      if (r.countdown > 0) {
        text('race-status', r.course.name);
        r.countdown = Math.max(0, r.countdown - dt);
        showCountdown(r.countdown > 0 ? String(Math.ceil(r.countdown)) : "GO!");
        r.previous = { ...state };
        return;
      }
      r.elapsed += dt;
      if (r.elapsed < 0.85) showCountdown("GO!");
      else countdown.hidden = true;
      if (r.elapsed > 1800) { cancel('Run ended · 30 minute limit'); return; }
      if (!r.samples.length || r.elapsed - r.samples.at(-1).t >= 0.1) {
        r.samples.push({ t: r.samples.length ? r.elapsed : 0, x: state.x, z: state.z, heading });
      }
      const pose = ghostPose(r.best?.samples, r.elapsed);
      if (ghost) {
        ghost.visible = !!pose;
        if (pose) { ghost.position.set(pose.x, heightAt(pose.x, pose.z) + 0.22, pose.z); ghost.rotation.y = pose.heading; }
      }
      if (crossedCheckpoint(r.previous || state, state, r.course.checkpoints[r.checkpoint])) {
        r.checkpoint++;
        if (r.checkpoint === r.course.checkpoints.length) {
          r.samples.push({ t: r.elapsed, x: state.x, z: state.z, heading });
          updateMetrics(r, state);
          const record = !r.best || r.elapsed < r.best.time;
          let saved = true;
          if (record) try { localStorage.setItem(key(r.course.id, r.vehicle), JSON.stringify({ time: r.elapsed, samples: r.samples })); } catch { saved = false; }
          const result = `${record ? 'Personal best!' : 'Finished!'} ${formatTime(r.elapsed)}${r.best ? ` · Previous best ${formatTime(r.best.time)}` : ''}${!saved ? ' · Storage unavailable; record not saved' : ''}`;
          const completed = { identity:r.identity, course:r.course.id, vehicle:r.vehicle, time:r.elapsed, samples:r.samples };
          cancel(result); toast(result);
          if (leaderboard) void leaderboard.submit(completed);
          return;
        }
        updateMarker();
      }
      r.previous = { ...state };
      const next = r.course.checkpoints[r.checkpoint];
      updateMetrics(r, state);
      text('race-status', r.course.name);
    },
    drawMap(ctx, pt) {
      if (!race) return;
      ctx.strokeStyle = '#d5ff77'; ctx.lineWidth = 2.5; ctx.beginPath();
      race.course.path.forEach((p, i) => { const [x, y] = pt([p.x, p.z]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      const p = race.course.checkpoints[race.checkpoint], [x, y] = pt([p.x, p.z]);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    },
  };
}
