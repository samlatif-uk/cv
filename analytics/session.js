document.getElementById('logout').addEventListener('click',async event=>{
  event.target.disabled=true;
  try{const response=await fetch('/insights/logout',{method:'POST'});if(!response.ok)throw Error();location.replace('/insights/login');}
  catch{event.target.textContent='Sign out failed — retry';event.target.disabled=false;}
});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});