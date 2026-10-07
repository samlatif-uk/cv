import * as THREE from 'three';
import { companyLogos } from './company-logos.js';

export function makeBadge(company) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const logo = companyLogos[company] || (company.includes('HSBC') ? companyLogos.HSBC : null);
  ctx.shadowColor = '#f0a500'; ctx.shadowBlur = 18;
  ctx.fillStyle = '#a87c32'; ctx.beginPath(); ctx.arc(128,128,105,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#080808'; ctx.beginPath(); ctx.arc(128,128,101,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = logo?.color || '#211b12'; ctx.beginPath(); ctx.arc(128,128,90,0,Math.PI*2); ctx.fill();
  if (logo) {
    ctx.save();ctx.translate(62,62);ctx.scale(132/24,132/24);ctx.fillStyle='#ffffff';
    logo.paths.forEach(path=>ctx.fill(new Path2D(path)));ctx.restore();
  } else {
    const initials = company.replace(/\([^)]*\)/g,'').replace(/[^a-zA-Z0-9 ]/g,' ').trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
    ctx.fillStyle='#f0e8d8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 62px Arial';ctx.fillText(initials,128,132);
  }
  const texture = new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}
