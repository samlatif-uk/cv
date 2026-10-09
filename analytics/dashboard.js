const $ = id => document.getElementById(id);
const colors = ['#f0a500','#f0e8d8','#a67c42','#796344','#5b5244'];
const names = {'/':'CV landing','/lab/':'Career atlas','/lab/stories/':'Work in practice'};
const element = (tag, text, cls) => {const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
const svgEl = (tag, attrs={}) => {const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));return el;};
const countryNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], {type:'region'}) : null;
const number = value => value.toLocaleString();
const share = (count,total) => total ? (count/total*100).toFixed(1)+'%' : '0%';
function rows(key, values, total) {
  const host=$(key);host.replaceChildren();
  if(!values.length){host.append(element('p','No views recorded in this period.','empty'));return;}
  values.forEach((item,index)=>{
    const row=element('div',undefined,'metric-row');
    const label=element('span',(key === 'country' && /^[A-Z]{2}$/.test(item.label) ? countryNames?.of(item.label) : names[item.label]) || item.label);
    const bar=svgEl('svg',{viewBox:'0 0 300 5',preserveAspectRatio:'none',class:'bar','aria-hidden':'true'});
    bar.append(svgEl('rect',{width:300,height:5,fill:'#262018'}),svgEl('rect',{width:total?300*item.count/total:0,height:5,fill:colors[index%colors.length]}));label.append(bar);
    row.append(label,element('strong',number(item.count)),element('small',share(item.count,total)));host.append(row);
  });
}
function drawTrend(data) {
  const today=new Date();today.setUTCHours(0,0,0,0);
  const unique = $('metric').value === 'unique';
  const metricName = unique ? 'estimated unique visitors' : 'page views';
  const counts=new Map((unique ? data.unique_day : data.day).map(item=>[item.label,item.count]));
  const days=Array.from({length:data.days},(_,i)=>{const date=new Date(today);date.setUTCDate(date.getUTCDate()-(data.days-1-i));const label=date.toISOString().slice(0,10);return {label,count:unique && (!data.audience_since || label < data.audience_since.slice(0,10)) ? null : counts.get(label)||0};});
  $('range').textContent=days[0].label+' — '+days.at(-1).label+' · UTC';
  const svg=svgEl('svg',{viewBox:'0 0 960 280',role:'group','aria-label':'Daily '+metricName+'. Focus a point to read its date and total.'});
  const max=Math.max(4,...days.map(d=>d.count));const ceiling=Math.ceil(max/4)*4;
  for(let i=0;i<=4;i++){const y=20+i*54;svg.append(svgEl('line',{x1:46,x2:940,y1:y,y2:y,class:'gridline'}));const text=svgEl('text',{x:36,y:y+4,'text-anchor':'end',class:'axis'});text.textContent=number(ceiling*(4-i)/4);svg.append(text);}
  const points=days.map((day,i)=>({x:46+i*894/(days.length-1),y:236-day.count/ceiling*216,...day}));
  const visiblePoints = points.filter(p=>p.count !== null);
  const path=visiblePoints.map((p,i)=>(i?'L':'M')+p.x+','+p.y).join(' ');
  if (visiblePoints.length) svg.append(svgEl('path',{d:path+' L'+visiblePoints.at(-1).x+',236 L'+visiblePoints[0].x+',236 Z',class:'trend-area'}),svgEl('path',{d:path,class:'trend-line'}));
  points.forEach((p,i)=>{if(p.count === null) return; const dot=svgEl('circle',{cx:p.x,cy:p.y,r:4,tabindex:0,role:'img','aria-label':p.label+': '+p.count+' '+metricName,class:'point'});const title=svgEl('title');title.textContent=p.label+': '+p.count+' '+metricName;dot.append(title);const show=()=>{$('chart-detail').textContent=p.label+' · '+number(p.count)+' '+metricName;};dot.addEventListener('focus',show);dot.addEventListener('pointerenter',show);dot.addEventListener('click',show);svg.append(dot);if([0,Math.floor(days.length/2),days.length-1].includes(i)){const label=svgEl('text',{x:p.x,y:263,'text-anchor':i===0?'start':i===days.length-1?'end':'middle',class:'axis'});label.textContent=p.label.slice(5);svg.append(label);}});
  $('chart').replaceChildren(svg);$('chart-detail').textContent=data.total?'Focus or hover a point for daily totals.':'No views recorded in this period.';
  const table=element('table');const head=element('tr');head.append(element('th','Date (UTC)'),element('th',unique?'Estimated unique visitors':'Page views'));const thead=element('thead');thead.append(head);const body=element('tbody');days.forEach(day=>{const row=element('tr');row.append(element('td',day.label),element('td',day.count === null ? 'Not collected' : number(day.count)));body.append(row);});table.append(thead,body);$('day').replaceChildren(table);
}
function devices(data) {
  const host=$('device');host.replaceChildren();
  if(!data.total){host.append(element('p','No device data yet.','empty'));return;}
  const layout=element('div',undefined,'donut-layout');const svg=svgEl('svg',{viewBox:'0 0 160 160',class:'donut',role:'img','aria-label':data.device.map(d=>d.label+' '+share(d.count,data.total)).join(', ')});
  let offset=0;const circumference=2*Math.PI*60;
  data.device.forEach((item,i)=>{const length=item.count/data.total*circumference;svg.append(svgEl('circle',{cx:80,cy:80,r:60,fill:'none',stroke:colors[i%colors.length],'stroke-width':18,'stroke-dasharray':length+' '+(circumference-length),'stroke-dashoffset':-offset,transform:'rotate(-90 80 80)'}));offset+=length;});
  const total=svgEl('text',{x:80,y:80,'text-anchor':'middle',class:'donut-total'});total.textContent=number(data.total);const caption=svgEl('text',{x:80,y:99,'text-anchor':'middle',class:'donut-caption'});caption.textContent='PAGE VIEWS';svg.append(total,caption);
  const legend=element('div');data.device.forEach((item,i)=>{const row=element('div',undefined,'metric-row');const label=element('span');const dot=svgEl('svg',{viewBox:'0 0 8 8',class:'legend-dot','aria-hidden':'true'});dot.append(svgEl('circle',{cx:4,cy:4,r:4,fill:colors[i%colors.length]}));label.append(dot,document.createTextNode(item.label));row.append(label,element('strong',number(item.count)),element('small',share(item.count,data.total)));legend.append(row);});layout.append(svg,legend);host.append(layout);
}
let request=0;
let report=null;
$('metric').addEventListener('change',()=>{if(report)drawTrend(report);});
async function refresh(){
  const current=++request;$('status').textContent='Loading report…';
  try{
    const response=await fetch('/insights/stats?days='+$('period').value);
    if(response.status===401){location.replace('/insights/login');return;}
    if(!response.ok)throw Error('Unable to load report. Check your login and refresh.');
    const data=await response.json();if(current!==request)return;report=data;
    $('uniques').textContent=data.audience_since?number(data.daily_uniques):'—';
    $('sessions').textContent=data.audience_since?number(data.sessions):'—';
    $('views-per-visit').textContent=data.sessions?(data.audience_views/data.sessions).toFixed(1):'—';
    $('countries').textContent=data.audience_since?number(data.country.filter(c=>c.label!=='Unknown').length):'—';
    $('coverage').textContent=data.audience_since?'Visitor estimates began '+data.audience_since.slice(0,10)+' (UTC). '+number(data.audience_views)+' of '+number(data.total)+' page views have visitor estimates; earlier data is not backfilled.':'Visitor and location estimates will appear after the first visit through the updated collector.';
    $('geo-status').textContent=data.geo_available?'Country estimates can reflect a VPN or network provider rather than the visitor’s actual location.':'Country database unavailable. Visits are counted under Unknown until it is installed.';
    rows('country',data.country,data.daily_uniques);
    $('total').textContent=number(data.total);$('average').textContent=(data.total/data.days).toFixed(1);
    $('external').textContent=number(data.referrer.filter(d=>!['Internal','Direct / unknown','Other sources'].includes(d.label)).reduce((sum,d)=>sum+d.count,0));
    const top=[...data.path].sort((a,b)=>b.count-a.count)[0];$('top-page').textContent=top?(names[top.label]||top.label):'No data';$('top-share').textContent=top?share(top.count,data.total)+' of all page views':'No page views recorded';
    drawTrend(data);for(const key of ['referrer','path','browser'])rows(key,data[key],data.total);devices(data);
    $('status').textContent='Updated '+new Date().toLocaleTimeString();
  }catch(error){if(current===request)$('status').textContent=error.message+' Any displayed data is from the last successful load.';}
}
$('period').addEventListener('change',refresh);$('refresh').addEventListener('click',refresh);refresh();
