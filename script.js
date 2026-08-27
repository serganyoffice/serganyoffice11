const SERVICES = [
['الاستشارات الضريبية','استشارة مهنية لفهم الموقف الضريبي وتحديد الإجراء الأنسب.','01'],
['خبير مثمن','أعمال التقييم والتثمين وإعداد الرأي المهني بحسب طبيعة الحالة.','02'],
['مصفي قضائي','خدمات وأعمال التصفية القضائية وفق متطلبات الحالة والإجراءات ذات الصلة.','03'],
['الفواتير الإلكترونية','مساعدة في التعامل مع منظومة الفاتورة الإلكترونية ومتطلبات الامتثال.','04'],
['مراقب حسابات الشركات المساهمة','مراجعة وإبداء الرأي المهني على حسابات الشركات المساهمة وفق الأطر المهنية المعمول بها.','05'],
['ضريبة الدخل','خدمات متعلقة بضريبة الدخل وفهم الالتزامات والإجراءات المطلوبة.','06'],
['ضريبة القيمة المضافة','مساعدة في ملفات وضوابط ضريبة القيمة المضافة والتعامل مع متطلباتها.','07'],
['الإقرارات الضريبية','إعداد ومراجعة الإقرارات الضريبية ومتابعة المتطلبات المرتبطة بها.','08'],
['تأسيس الشركات','خدمات تأسيس الشركات وتجهيز الإجراءات والمستندات بحسب نوع الشركة.','09'],
['افتتاح فروع الشركات المصرية بالدول العربية','استشارات وإجراءات مرتبطة بافتتاح فروع للشركات المصرية في الدول العربية.','10'],
['دراسات الجدوى الاقتصادية','دراسة الجوانب المالية والاقتصادية للمشروع للمساعدة في تقييم القرار.','11'],
['الميزانيات العمومية','إعداد ومراجعة الميزانيات والقوائم المالية بصورة منظمة وواضحة.','12'],
['سجل المستوردين والمصدرين','خدمات وإجراءات مرتبطة بسجل المستوردين والمصدرين.','13'],
['السجلات التجارية','مساعدة في إجراءات السجلات التجارية والتحديثات ذات الصلة.','14'],
['ترخيص المحال والمنشآت','مساعدة في إجراءات ومتطلبات ترخيص المحال والمنشآت.','15'],
['ترخيص المنشآت الصناعية','مساعدة في إجراءات ومتطلبات ترخيص المنشآت الصناعية.','16']
];

const WA='201006906248';
function card([name,desc,num]){return `<article class="service-card reveal" data-num="${num}"><div class="service-top"><span>${num}</span><i>↗</i></div><h3>${name}</h3><p>${desc}</p><a href="appointment.html?service=${encodeURIComponent(name)}">احجز لهذه الخدمة <b>←</b></a></article>`}
function renderServices(){const grid=document.getElementById('serviceGrid');if(grid)grid.innerHTML=SERVICES.map(card).join(''); const select=document.getElementById('service'); if(select) select.innerHTML='<option value="">اختر الخدمة</option>'+SERVICES.map(x=>`<option>${x[0]}</option>`).join('');}
function reveal(){document.querySelectorAll('.reveal').forEach(el=>{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.08});io.observe(el)})}
function nav(){const b=document.getElementById('menu'),n=document.getElementById('navLinks');if(b&&n)b.onclick=()=>n.classList.toggle('open');document.querySelectorAll('#navLinks a').forEach(a=>a.addEventListener('click',()=>n?.classList.remove('open')))}
function progress(){const p=document.getElementById('progress');if(!p)return;addEventListener('scroll',()=>{const h=document.documentElement.scrollHeight-innerHeight;p.style.width=(scrollY/h*100)+'%'},{passive:true})}
function booking(){const form=document.getElementById('bookingForm');if(!form)return;const params=new URLSearchParams(location.search);const s=params.get('service');if(s){const select=document.getElementById('service');if([...select.options].some(o=>o.value===s))select.value=s}
form.addEventListener('submit',e=>{e.preventDefault();const name=document.getElementById('name').value.trim(),phone=document.getElementById('phone').value.trim(),service=document.getElementById('service').value,details=document.getElementById('details').value.trim();if(!name||!phone||!service||!details)return;fetch('/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,phone,service,details})}).then(async r=>{if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||'تعذر حفظ الطلب')} const text=`*طلب استشارة جديد – مكتب محمد السرجاني*%0A%0A👤 الاسم: ${encodeURIComponent(name)}%0A📱 الموبايل: ${encodeURIComponent(phone)}%0A🧾 الخدمة: ${encodeURIComponent(service)}%0A📝 التفاصيل: ${encodeURIComponent(details)}%0A%0A*يرجى التواصل مع العميل وتأكيد موعد الاستشارة.*`;window.open(`https://wa.me/${WA}?text=${text}`,'_blank');alert('تم حفظ طلبك وفتح واتساب لإرساله. انتظر الرد لتأكيد الاستشارة.');form.reset()}).catch(err=>alert(err.message))})}

function normalizeDigits(value){
  return String(value||'').replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x6F0));
}
function normalizeWhatsAppNumber(value){
  let raw=normalizeDigits(value).trim();
  raw=raw.replace(/[^0-9+]/g,'');
  if(raw.startsWith('00')) raw=raw.slice(2);
  else if(raw.startsWith('+')) raw=raw.slice(1);
  // Egyptian local numbers are the only local format we can safely infer.
  if(/^01[0-9]{9}$/.test(raw)) raw='20'+raw.slice(1);
  return raw;
}
function setupPhoneInput(){
  const input=document.getElementById('phone');
  if(!input)return;
  const clean=()=>{
    let v=normalizeDigits(input.value);
    // Allow a leading + for international format, but no other non-digits.
    v=(v.startsWith('+')?'+':'')+v.replace(/\D/g,'');
    input.value=v;
  };
  input.addEventListener('input',clean);
  input.addEventListener('paste',()=>setTimeout(clean,0));
}

function updateOfficeStatus(){
  const now=new Date();
  const day=now.getDay();
  const minutes=now.getHours()*60+now.getMinutes();
  const windows={0:[[600,840],[1140,1380]],1:[[600,840],[1140,1380]],2:[[600,840],[1140,1380]],3:[[600,840],[1140,1380]],4:[[600,840]],5:[[1140,1380]],6:[[600,840],[1140,1380]]};
  const isOpen=(windows[day]||[]).some(([start,end])=>minutes>=start&&minutes<end);
  const status=document.querySelector('#openStatus');
  if(status){status.classList.toggle('open',isOpen);status.classList.toggle('closed',!isOpen);const text=status.querySelector('span');if(text)text.textContent=isOpen?'المكتب مفتوح الآن':'المكتب مغلق الآن';}
  document.querySelectorAll('.schedule-row,.time-item').forEach(row=>{row.classList.remove('today');row.removeAttribute('aria-current')});
  const todayRow=document.querySelector(`.schedule-row[data-day="${day}"], .time-item[data-day="${day}"]`);
  if(todayRow){todayRow.classList.add('today');todayRow.setAttribute('aria-current','date');}
}

document.addEventListener('DOMContentLoaded',()=>{
  renderServices(); reveal(); nav(); progress(); booking(); setupPhoneInput();
  const y=document.getElementById('year'); if(y)y.textContent=new Date().getFullYear();
  updateOfficeStatus(); setInterval(updateOfficeStatus,30000);
});
