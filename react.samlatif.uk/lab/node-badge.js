import * as THREE from 'three';
import { companyLogos } from './company-logos.js';

export function makeBadge(company) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const known = Object.keys(companyLogos).find(name => company.includes(name));
  const aliases = {
    'Thought Machine': ['TM', '#ed6a3a'],
    'Deloitte Digital': ['D', '#86bc25'],
    'The Stars Group': ['TS', '#f0e8d8'],
    'UBS': ['UBS', '#e60000'],
    'Future Platforms': ['FP', '#f0a500'],
    'CACI / Chelsea FC': ['CFC', '#6cabdd'],
    'Goldsmiths, University of London': ['GU', '#f0a500'],
    'CompareTheMarket.com': ['CTM', '#f0e8d8'],
  };
  const logo = known ? companyLogos[known] : (company.includes('HSBC') ? companyLogos.HSBC : null);
  const alias = aliases[company];
  ctx.shadowColor = '#f0a500'; ctx.shadowBlur = 18;
  ctx.fillStyle = '#a87c32'; ctx.beginPath(); ctx.arc(128,128,105,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#080808'; ctx.beginPath(); ctx.arc(128,128,101,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = logo?.color || alias?.[1] || '#211b12'; ctx.beginPath(); ctx.arc(128,128,90,0,Math.PI*2); ctx.fill();
  if (logo) {
    ctx.save();ctx.translate(62,62);ctx.scale(132/24,132/24);ctx.fillStyle='#ffffff';
    logo.paths.forEach(path=>ctx.fill(new Path2D(path)));ctx.restore();
  } else {
    const initials = alias?.[0] || company.replace(/\([^)]*\)/g,'').replace(/[^a-zA-Z0-9 ]/g,' ').trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
    const shortName = company.replace(/\([^)]*\)/g,'').replace(/, University of London/i,'').replace(/ Consulting/i,'').trim();
    ctx.fillStyle='#f0e8d8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 58px Arial';ctx.fillText(initials,128,119);
    ctx.font='600 13px Arial';ctx.fillStyle='#080808';ctx.fillText(shortName.slice(0,18).toUpperCase(),128,164);
  }
  const texture = new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  if (company === 'Deloitte Digital') {
    const image = new Image();
    image.onload = () => {
      ctx.save();
      ctx.beginPath(); ctx.arc(128,128,90,0,Math.PI*2); ctx.clip();
      ctx.fillStyle = '#000'; ctx.fillRect(38,38,180,180);
      const scale = Math.min(180 / image.naturalWidth, 180 / image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      ctx.drawImage(image,128-width/2,128-height/2,width,height);
      ctx.restore();
      texture.needsUpdate = true;
    };
    image.src = '/logos/deloitte.png';
  }
  return texture;
}
