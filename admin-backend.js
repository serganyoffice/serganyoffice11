(async()=>{
  const box=document.getElementById('requests');
  if(!box)return;
  const token=sessionStorage.getItem('adminToken');
  if(!token){location.href='admin.html';return;}

  const $=id=>document.getElementById(id);
  const money=v=>Number(v||0).toLocaleString('ar-EG',{maximumFractionDigits:2});
  const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const normalize=v=>String(v??'').toLocaleLowerCase('ar-EG').replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[\s\-()]/g,'');
  const api=async(path,opt={})=>{
    const r=await fetch(path,{...opt,headers:{'Content-Type':'application/json',...(opt.headers||{}),Authorization:`Bearer ${token}`}});
    if(r.status===401){sessionStorage.removeItem('adminToken');location.href='admin.html';return null;}
    if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||'حدث خطأ في الطلب');}
    return r.status===204?null:r.json();
  };
  const dateOf=x=>{const d=new Date(x?.createdAt);return Number.isNaN(d.getTime())?new Date(0):d;};
  const sameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const statusLabel=s=>({confirmed:'مؤكد',pending:'قيد الانتظار',cancelled:'ملغي'}[s]||'قيد الانتظار');
  const payment=x=>Number(x.totalPrice||0)>0&&Number(x.paid||0)>=Number(x.totalPrice||0)?'paid':Number(x.paid||0)>0?'partial':'unpaid';
  const payLabel=s=>({paid:'مدفوع بالكامل',partial:'مدفوع جزئيًا',unpaid:'غير مدفوع'}[s]);

  let list=[];
  let availabilityValue='';

  function getFiltered(){
    const now=new Date();
    const yesterday=new Date(now); yesterday.setDate(now.getDate()-1);
    const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
    const q=normalize($('adminSearch')?.value||'');
    const sf=$('statusFilter')?.value||'all';
    const df=$('dateFilter')?.value||'all';
    return list.filter(x=>{
      const d=dateOf(x);
      const ps=payment(x);
      const text=normalize(`${x.name||''} ${x.phone||''} ${x.service||''}`);
      const phone=normalize(x.phone||'');
      if(q&&!text.includes(q)&&!phone.includes(q))return false;
      if(sf!=='all'&&sf!==x.status&&sf!==ps)return false;
      if(df==='today'&&!sameDay(d,now))return false;
      if(df==='yesterday'&&!sameDay(d,yesterday))return false;
      if(df==='month'&&(d<monthStart||d>now))return false;
      return true;
    });
  }

  function fillAvailabilityClients(preserveValue=true){
    const select=$('availabilityClient');
    if(!select)return;
    const current=preserveValue?String(select.value||''):'';
    const seen=new Set();
    const clients=[];
    // Use the newest booking for each phone number, while retaining every real client.
    for(const x of [...list].sort((a,b)=>dateOf(b)-dateOf(a))){
      const phone=String(x.phone||'').replace(/\D/g,'');
      const key=phone||normalize(x.name);
      if(!key||seen.has(key))continue;
      seen.add(key);
      clients.push(x);
    }
    select.innerHTML='<option value="">اختر عميلًا</option>'+clients.map(x=>`<option value="${safe(x.id)}">${safe(x.name)} — ${safe(x.phone)}</option>`).join('');
    if(clients.some(x=>String(x.id)===current))select.value=current;
  }

  function render(){
    const now=new Date();
    const yesterday=new Date(now); yesterday.setDate(now.getDate()-1);
    const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
    $('count').textContent=list.length;
    $('todayCount').textContent=list.filter(x=>sameDay(dateOf(x),now)).length;
    $('yesterdayCount').textContent=list.filter(x=>sameDay(dateOf(x),yesterday)).length;
    $('monthCount').textContent=list.filter(x=>dateOf(x)>=monthStart&&dateOf(x)<=now).length;
    $('totalRevenue').textContent=money(list.reduce((a,x)=>a+Number(x.totalPrice||0),0));
    $('totalPaid').textContent=money(list.reduce((a,x)=>a+Number(x.paid||0),0));
    $('totalRemaining').textContent=money(list.reduce((a,x)=>a+Math.max(0,Number(x.totalPrice||0)-Number(x.paid||0)),0));

    const filtered=getFiltered();
    box.innerHTML=filtered.length?filtered.map(x=>{
      const ps=payment(x);
      return `<article class="request booking-request" data-id="${safe(x.id)}">
        <div class="request-title"><div><b>${safe(x.name)}</b><span>${safe(x.date||'')}</span></div><div class="status-group"><em class="booking-status ${safe(x.status)}">${statusLabel(x.status)}</em><em class="payment-status ${ps}">${payLabel(ps)}</em></div></div>
        <div class="booking-details"><div><small>📱 الموبايل</small><strong>${safe(x.phone)}</strong></div><div><small>🧾 الخدمة</small><strong>${safe(x.service)}</strong></div><div><small>📅 تاريخ الطلب</small><strong>${dateOf(x).toLocaleDateString('ar-EG')}</strong></div><div class="full"><small>📝 تفاصيل الحجز</small><strong>${safe(x.details)}</strong></div></div>
        <div class="edit-box"><label>اسم العميل<input class="edit-name" value="${safe(x.name)}"></label><label>الموبايل<input class="edit-phone" value="${safe(x.phone)}"></label><label>الخدمة<input class="edit-service" value="${safe(x.service)}"></label><label class="full-label">التفاصيل<textarea class="edit-details" rows="3">${safe(x.details)}</textarea></label></div>
        <div class="payment-box"><label>السعر الكلي<input class="total-price" type="number" min="0" value="${Number(x.totalPrice||0)}"></label><label>المدفوع<input class="paid-price" type="number" min="0" value="${Number(x.paid||0)}"></label><label>حالة الحجز<select class="booking-status-select"><option value="pending" ${x.status==='pending'?'selected':''}>قيد الانتظار</option><option value="confirmed" ${x.status==='confirmed'?'selected':''}>مؤكد</option><option value="cancelled" ${x.status==='cancelled'?'selected':''}>ملغي</option></select></label><div class="remaining"><span>المتبقي</span><b class="remaining-value">${money(Math.max(0,Number(x.totalPrice||0)-Number(x.paid||0)))}</b></div></div>
        <div class="request-actions"><button class="save-request" type="button">حفظ كل التعديلات</button><a class="wa-direct" href="https://wa.me/${String(x.phone||'').replace(/\D/g,'')}" target="_blank" rel="noopener">واتساب مباشر ↗</a><button class="delete-request" type="button">حذف الحجز</button></div>
      </article>`;
    }).join(''):'<div class="empty">لا توجد حجوزات مطابقة للبحث أو الفلترة.</div>';

    box.querySelectorAll('.booking-request').forEach(card=>{
      const id=card.dataset.id;
      const total=card.querySelector('.total-price');
      const paid=card.querySelector('.paid-price');
      const rem=card.querySelector('.remaining-value');
      const update=()=>{rem.textContent=money(Math.max(0,Number(total.value||0)-Number(paid.value||0)));};
      total.addEventListener('input',update); paid.addEventListener('input',update);
      card.querySelector('.save-request').onclick=async()=>{
        await api('/api/requests/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({name:card.querySelector('.edit-name').value,phone:card.querySelector('.edit-phone').value,service:card.querySelector('.edit-service').value,details:card.querySelector('.edit-details').value,totalPrice:total.value,paid:paid.value,status:card.querySelector('.booking-status-select').value})});
        await load();
      };
      card.querySelector('.delete-request').onclick=async()=>{
        if(confirm('حذف هذا الحجز؟')){await api('/api/requests/'+encodeURIComponent(id),{method:'DELETE'});await load();}
      };
    });
  }

  async function load(){
    const selectedClient=$('availabilityClient')?.value||'';
    const data=await api('/api/requests');
    list=Array.isArray(data)?data:[];
    fillAvailabilityClients(false);
    if(selectedClient && [...($('availabilityClient')?.options||[])].some(o=>o.value===selectedClient)) $('availabilityClient').value=selectedClient;
    render();
    await loadAvailability();
  }

  async function loadAvailability(){
    const x=await api('/api/settings/availability');
    availabilityValue=x?.value||'';
    const s=$('availableSlots');
    if(s&&document.activeElement!==s)s.value=availabilityValue;
  }

  $('clearRequests')?.addEventListener('click',async()=>{
    if(confirm('مسح كل الحجوزات؟')){await api('/api/requests',{method:'DELETE'});await load();}
  });

  $('saveAvailability')?.addEventListener('click',async()=>{
    const value=String($('availableSlots')?.value||'').trim();
    await api('/api/settings/availability',{method:'PUT',body:JSON.stringify({value})});
    availabilityValue=value;
    const hint=$('availabilityHint');
    if(hint)hint.textContent='تم حفظ المواعيد على السيرفر.';
    setTimeout(()=>{if(hint)hint.textContent='';},2500);
  });

  $('sendAvailability')?.addEventListener('click',()=>{
    const clientId=String($('availabilityClient')?.value||'');
    const raw=String($('availableSlots')?.value||'').trim();
    const hint=$('availabilityHint');
    const x=list.find(r=>String(r.id)===clientId);
    if(!x){if(hint)hint.textContent='اختر العميل أولًا.';return;}
    if(!raw){if(hint)hint.textContent='اكتب المواعيد المتاحة أولًا.';return;}
    const phone=String(x.phone||'').replace(/\D/g,'');
    if(!phone){if(hint)hint.textContent='رقم هاتف العميل غير صالح.';return;}
    const text=`مرحبًا ${x.name} 👋\n\nالمواعيد المتاحة لحجزك في مكتب Sergany:\n\n${raw}\n\nاختر الموعد المناسب لك وأرسل لي تأكيدك. شكرًا لك.`;
    const url=`https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    const win=window.open(url,'_blank','noopener');
    if(!win)location.href=url;
    if(hint)hint.textContent='تم تجهيز رسالة واتساب بالمواعيد المتاحة.';
  });

  ['adminSearch','statusFilter','dateFilter'].forEach(id=>{
    const el=$(id);
    if(!el)return;
    el.addEventListener(id==='adminSearch'?'input':'change',render);
  });

  window.adminLogout=()=>{sessionStorage.removeItem('adminToken');location.href='admin.html';};

  try{
    const data=await api('/api/requests');
    list=Array.isArray(data)?data:[];
    fillAvailabilityClients(false);
    render();
    await loadAvailability();
  }catch(e){console.error(e);alert(e.message||'تعذر تحميل بيانات الأدمن');}
})();
