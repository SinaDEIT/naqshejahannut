(function(){
  var toast=document.getElementById('toast'),t;
  function say(m){toast.textContent=m;toast.classList.add('is-on');clearTimeout(t);t=setTimeout(function(){toast.classList.remove('is-on')},1800)}
  function fallback(v){var a=document.createElement('textarea');a.value=v;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(e){}document.body.removeChild(a)}
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-copy]');if(!b)return;
    var v=b.getAttribute('data-copy');
    function ok(){b.classList.add('is-done');b.querySelector('span').textContent='کپی شد';say('کپی شد: '+v);setTimeout(function(){b.classList.remove('is-done');b.querySelector('span').textContent='کپی'},1600)}
    if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(v).then(ok,function(){fallback(v);ok()})}else{fallback(v);ok()}
  });
})();
