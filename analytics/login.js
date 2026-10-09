document.getElementById('login-form').addEventListener('submit',async event=>{
  event.preventDefault(); const button=event.target.querySelector('button'); const status=document.getElementById('login-status');
  button.disabled=true;status.textContent='Signing in…';
  try { const response=await fetch('/insights/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('password').value})});
    if(response.ok){location.replace('/insights/home');return;}
    status.textContent=response.status===401?'Password not recognised. Try again.':response.status===429||response.status===503?'Too many requests. Please wait a minute and try again.':'Unable to sign in. Please try again.';
  }catch{status.textContent='Could not connect. Check your connection and try again.';}finally{button.disabled=false;}
});