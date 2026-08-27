(async()=>{
 const box=document.getElementById('requests'); if(!box)return;
 const token=sessionStorage.getItem('adminToken'); if(!token){location.replace('admin.html');return;}
 const money=v=>Number(v||0).toLocaleString('ar-EG',{maximumFractionDigits:2});
 const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
 const digits=v=>String(v??'').replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x6F0));
 const wa=v=>{let x=digits(v).trim().replace(/[^0-9+]/g,'');if(x.startsWith('00'))x=x.slice(2);if(x.startsWith('+'))x=x.slice(1);if(/^01[0-9]{9}$/.test(x))x='20'+x.slice(1);return x;};
 const api=async(path,opt={})=>{const r=await fetch(path,{...opt,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...(opt.headers||{})}});if(r.status===401){sessionStorage.removeItem('adminToken');location.replace('admin.html');throw Error('انتهت الجلسة');}if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||'حدث خطأ');}return r.status===204?null:r.json()};
 const dateOf=x=>{const d=new Date(x.createdAt);return Number.isNaN(d.getTime())?null:d;};
 const same=(a,b)=>a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
 const statusLabel=s=>({confirmed:'مؤكد',pending:'قيد الانتظار',cancelled:'ملغي'}[s]||'قيد الانتظار');
 const payment=x=>x.totalPrice>0&&x.paid>=x.totalPrice?'paid':x.paid>0?'partial':'unpaid';
 const payLabel=s=>({paid:'مدفوع بالكامل',partial:'مدفوع جزئيًا',unpaid:'غير مدفوع'}[s]);
 let list=[];
 const formatDay=d=>d?d.toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long'}):'';
 function renderChart(data){
   const chart=document.getElementById('monthChart'); if(!chart)return;
   const now=new Date();
   const days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
   const counts=Array.from({length:days},(_,i)=>({day:i+1,count:data.filter(x=>{const d=dateOf(x);return d&&d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===i+1}).length}));
   const max=Math.max(1,...counts.map(x=>x.count));
   const label=document.getElementById('monthLabel');
   if(label)label.textContent=now.toLocaleDateString('ar-EG',{month:'long',year:'numeric'});
   chart.innerHTML=counts.map(x=>`<div class="chart-col" title="${x.count} عميل يوم ${x.day}"><div class="chart-bar" style="height:${Math.max(4,(x.count/max)*100)}%"></div><span>${x.day}</span></div>`).join('');
 }
 function renderAlerts(data){
   const el=document.getElementById('upcomingAlerts'); if(!el)return;
   const upcoming=data.filter(x=>x.status!=='cancelled').sort((a,b)=>dateOf(a)-dateOf(b)).slice(0,5);
   if(!upcoming.length){el.innerHTML='<div class="alert-empty">لا توجد حجوزات قادمة حاليًا.</div>';return;}
   el.innerHTML=upcoming.map(x=>`<div class="alert-item"><span class="alert-dot"></span><div><b>${safe(x.name)}</b><small>${safe(x.service)} — ${formatDay(dateOf(x))}</small></div><strong>${safe(x.phone)}</strong></div>`).join('');
 }
 function openWhatsApp(number,text){
   const n=wa(number);
   if(!n || n.length<7) return false;
   const url=`https://wa.me/${n}${text?`?text=${encodeURIComponent(text)}`:''}`;
   const w=window.open(url,'_blank','noopener,noreferrer');
   if(!w) window.location.href=url;
   return true;
 }
 function fillClients(){
   const select=document.getElementById('availabilityClient');if(!select)return;
   const current=select.value;
   const unique=new Map();
   list.forEach(x=>{const key=String(x.id);if(!unique.has(key))unique.set(key,x);});
   select.innerHTML='<option value="">اختر عميلًا</option>'+[...unique.values()].map(x=>`<option value="${safe(x.id)}">${safe(x.name)} — ${safe(x.phone)}</option>`).join('');
   if(unique.has(current))select.value=current;
 }
 function render(){
   const now=new Date(), yesterday=new Date(now);yesterday.setDate(now.getDate()-1);const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
   document.getElementById('count').textContent=list.length;
   document.getElementById('todayCount').textContent=list.filter(x=>same(dateOf(x),now)).length;
   document.getElementById('yesterdayCount').textContent=list.filter(x=>same(dateOf(x),yesterday)).length;
   document.getElementById('monthCount').textContent=list.filter(x=>{const d=dateOf(x);return d&&d>=monthStart&&d<=now}).length;
   document.getElementById('totalRevenue').textContent=money(list.reduce((a,x)=>a+Number(x.totalPrice||0),0));
   document.getElementById('totalPaid').textContent=money(list.reduce((a,x)=>a+Number(x.paid||0),0));
   document.getElementById('totalRemaining').textContent=money(list.reduce((a,x)=>a+Math.max(0,Number(x.totalPrice||0)-Number(x.paid||0)),0));
   fillClients();
   renderChart(list);
   renderAlerts(list);
   const q=digits(document.getElementById('adminSearch')?.value||'').trim().toLowerCase(),sf=document.getElementById('statusFilter')?.value||'all',df=document.getElementById('dateFilter')?.value||'all';
   const filtered=list.filter(x=>{const d=dateOf(x),text=`${x.name} ${digits(x.phone)} ${x.service}`.toLowerCase(),ps=payment(x);if(q&&!text.includes(q))return false;if(sf!=='all'&&sf!==x.status&&sf!==ps)return false;if(df==='today'&&!same(d,now))return false;if(df==='yesterday'&&!same(d,yesterday))return false;if(df==='month'&&!(d&&d>=monthStart&&d<=now))return false;return true;});
   box.innerHTML=filtered.length?filtered.map(x=>{const remaining=Math.max(0,Number(x.totalPrice||0)-Number(x.paid||0)),ps=payment(x),d=dateOf(x),number=wa(x.phone);return `<article class="request booking-request" data-id="${safe(x.id)}"><div class="request-title"><div><b>${safe(x.name)}</b><span>${safe(x.date||'')}</span></div><div class="status-group"><em class="booking-status ${safe(x.status)}">${statusLabel(x.status)}</em><em class="payment-status ${ps}">${payLabel(ps)}</em></div></div><div class="booking-details"><div><small>📱 الموبايل</small><strong>${safe(x.phone)}</strong></div><div><small>🧾 الخدمة</small><strong>${safe(x.service)}</strong></div><div><small>📅 تاريخ الطلب</small><strong>${d?d.toLocaleDateString('ar-EG'):''}</strong></div><div class="full"><small>📝 تفاصيل الحجز</small><strong>${safe(x.details)}</strong></div></div><div class="edit-box"><label>اسم العميل<input class="edit-name" value="${safe(x.name)}"></label><label>الموبايل<input class="edit-phone" inputmode="tel" value="${safe(x.phone)}"></label><label>الخدمة<input class="edit-service" value="${safe(x.service)}"></label><label class="full-label">التفاصيل<textarea class="edit-details" rows="3">${safe(x.details)}</textarea></label></div><div class="payment-box"><label>السعر الكلي<input class="total-price" type="number" min="0" step="0.01" value="${Number(x.totalPrice||0)}"></label><label>المدفوع<input class="paid-price" type="number" min="0" step="0.01" value="${Number(x.paid||0)}"></label><label>حالة الحجز<select class="booking-status-select"><option value="pending" ${x.status==='pending'?'selected':''}>قيد الانتظار</option><option value="confirmed" ${x.status==='confirmed'?'selected':''}>مؤكد</option><option value="cancelled" ${x.status==='cancelled'?'selected':''}>ملغي</option></select></label><div class="remaining"><span>المتبقي</span><b class="remaining-value">${money(remaining)}</b></div></div><div class="request-actions"><button class="save-request" type="button">حفظ كل التعديلات</button><button class="availability-request" type="button">إرسال مواعيد متاحة</button><a class="wa-direct" href="https://wa.me/${number}" target="_blank" rel="noopener">واتساب مباشر ↗</a><button class="delete-request" type="button">حذف الحجز</button></div></article>`}).join(''):'<div class="empty">لا توجد حجوزات مطابقة للبحث أو الفلترة.</div>';
   box.querySelectorAll('.booking-request').forEach(card=>{
     const id=card.dataset.id,x=list.find(r=>String(r.id)===String(id));
     const total=card.querySelector('.total-price'),paid=card.querySelector('.paid-price'),rem=card.querySelector('.remaining-value');
     const update=()=>rem.textContent=money(Math.max(0,Number(total.value||0)-Number(paid.value||0)));total.oninput=update;paid.oninput=update;
     card.querySelector('.edit-phone').addEventListener('input',e=>{e.target.value=digits(e.target.value).replace(/[^0-9+]/g,'');});
     card.querySelector('.save-request').onclick=async()=>{await api('/api/requests/'+id,{method:'PUT',body:JSON.stringify({name:card.querySelector('.edit-name').value,phone:card.querySelector('.edit-phone').value,service:card.querySelector('.edit-service').value,details:card.querySelector('.edit-details').value,totalPrice:total.value,paid:paid.value,status:card.querySelector('.booking-status-select').value})});await load();};
     card.querySelector('.delete-request').onclick=async()=>{if(confirm('حذف هذا الحجز؟')){await api('/api/requests/'+id,{method:'DELETE'});await load();}};
     card.querySelector('.availability-request').onclick=()=>{const sel=document.getElementById('availabilityClient');if(sel)sel.value=String(x.id);document.getElementById('availableSlots')?.focus();document.querySelector('.availability-panel')?.scrollIntoView({behavior:'smooth',block:'center'});};
   });
 }
 async function load(){list=await api('/api/requests');render();await loadAvailability();}
 async function loadAvailability(){const x=await api('/api/settings/availability');const s=document.getElementById('availableSlots');if(s&&!s.value)s.value=x.value||'';}
 document.getElementById('clearRequests')?.addEventListener('click',async()=>{if(confirm('مسح كل الحجوزات؟')){await api('/api/requests',{method:'DELETE'});await load();}});
 document.getElementById('saveAvailability')?.addEventListener('click',async()=>{const value=document.getElementById('availableSlots').value.trim();await api('/api/settings/availability',{method:'PUT',body:JSON.stringify({value})});const h=document.getElementById('availabilityHint');h.textContent='تم حفظ المواعيد على السيرفر.';setTimeout(()=>h.textContent='',2500);});
 document.getElementById('sendAvailability')?.addEventListener('click',()=>{
   const client=document.getElementById('availabilityClient');
   const slots=document.getElementById('availableSlots');
   const hint=document.getElementById('availabilityHint');
   const x=list.find(r=>String(r.id)===String(client?.value||''));
   const raw=slots?.value.trim()||'';
   if(!x){hint.textContent='اختر العميل أولًا.';return;}
   if(!raw){hint.textContent='اكتب المواعيد المتاحة أولًا.';return;}
   const text=`مرحبًا ${x.name} 👋\n\nالمواعيد المتاحة لحجزك في مكتب Sergany:\n\n${raw}\n\nاختر الموعد المناسب لك وأرسل لي تأكيدك. شكرًا لك.`;
   if(openWhatsApp(x.phone,text)){hint.textContent='تم فتح محادثة WhatsApp مع العميل.';}else{hint.textContent='رقم العميل غير صالح للواتساب.';}
 });
 ['adminSearch','statusFilter','dateFilter'].forEach(id=>document.getElementById(id)?.addEventListener(id==='adminSearch'?'input':'change',render));
 window.adminLogout=()=>{sessionStorage.removeItem('adminToken');location.replace('admin.html');};
 try{await load();}catch(e){box.innerHTML=`<div class="empty">تعذر تحميل البيانات: ${safe(e.message)}</div>`;}
})();
