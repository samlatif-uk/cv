const $=id=>document.getElementById(id);
async function get(path){const response=await fetch(path);if(response.status===401){location.replace('/insights/login');throw Error('Session expired');}if(!response.ok)throw Error('Unable to load data');return response.json();}
async function refresh(){
 $('refresh').disabled=true;$('status').textContent='Refreshing…';
 const results=await Promise.allSettled([get('/insights/stats?days=7'),get('/insights/site-status')]);
 if(results[0].status==='fulfilled'){const data=results[0].value;for(const [id,value] of Object.entries({total:data.total,uniques:data.daily_uniques,sessions:data.sessions,countries:data.country.filter(c=>c.label!=='Unknown').length}))$(id).textContent=Number(value).toLocaleString();$('database').textContent='Reporting available';}
 else{$('database').textContent='Could not load report';for(const id of ['total','uniques','sessions','countries'])$(id).textContent='—';}
 if(results[1].status==='fulfilled'){const data=results[1].value;$('pages').replaceChildren();for(const page of data.pages){const row=document.createElement('div');row.className='metric-row';const link=document.createElement('a');link.href=page.path;link.textContent=page.name+' ↗';const state=document.createElement('strong');state.textContent=page.available?'Responding':'Check failed';const timing=document.createElement('small');timing.textContent=page.ms===null?'—':page.ms+' ms';row.append(link,state,timing);$('pages').append(row);}$('geo').textContent=data.geo_available?'Available':'Country database unavailable';$('checked').textContent='Checked '+new Date(data.checked_at).toLocaleTimeString();}
 else{$('pages').textContent='Availability checks could not be loaded. Try refreshing.';$('geo').textContent='Unknown';$('checked').textContent='';}
 $('status').textContent=results.every(r=>r.status==='fulfilled')?'Updated '+new Date().toLocaleTimeString():'Some data is unavailable';$('refresh').disabled=false;
}
$('refresh').addEventListener('click',refresh);refresh();