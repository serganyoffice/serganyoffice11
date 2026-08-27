const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-now';
const DATABASE_URL = process.env.DATABASE_URL || '';
const pool = new Pool({ connectionString: DATABASE_URL || undefined, ssl: DATABASE_URL ? { rejectUnauthorized: false } : false });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname, { extensions: ['html'] }));

function normalizeDigits(value){
  return String(value||'').replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x6F0));
}
function cleanPhone(value){
  let v=normalizeDigits(value).trim().replace(/[^0-9+]/g,'');
  if(v.startsWith('00')) v=v.slice(2);
  return v;
}
function whatsappNumber(value){
  let v=cleanPhone(value);
  if(v.startsWith('+')) v=v.slice(1);
  if(/^01[0-9]{9}$/.test(v)) v='20'+v.slice(1);
  return v;
}
function validPhone(value){
  const v=cleanPhone(value);
  return /^\+?[0-9]{7,15}$/.test(v);
}

async function initDb(){
  if(!DATABASE_URL){ console.warn('DATABASE_URL is missing. Add it to Railway Variables.'); return false; }
  await pool.query(`CREATE TABLE IF NOT EXISTS requests (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid NUMERIC(12,2) NOT NULL DEFAULT 0
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  return true;
}

function auth(req,res,next){
  const h=req.headers.authorization||'';
  const token=h.startsWith('Bearer ')?h.slice(7):'';
  try{ req.admin=jwt.verify(token,JWT_SECRET); next(); }
  catch{ res.status(401).json({error:'غير مصرح'}); }
}

app.get('/api/health', async (_req,res)=>{
  if(!DATABASE_URL) return res.status(503).json({ok:false,database:false,error:'DATABASE_URL missing'});
  try{ await pool.query('SELECT 1'); res.json({ok:true,database:true}); }
  catch(err){ res.status(503).json({ok:false,database:false,error:err.message}); }
});

app.post('/api/auth/login', async (req,res)=>{
  const {username,password}=req.body||{};
  if(username!==ADMIN_USER || password!==ADMIN_PASSWORD) return res.status(401).json({error:'اسم المستخدم أو كلمة المرور غير صحيحة'});
  const token=jwt.sign({sub:username,role:'admin'},JWT_SECRET,{expiresIn:'8h'});
  res.json({token});
});

app.get('/api/requests', auth, async (_req,res)=>{
  try{
    const {rows}=await pool.query(`SELECT id, created_at AS "createdAt", name, phone, service, details, status, total_price AS "totalPrice", paid FROM requests ORDER BY created_at DESC`);
    res.json(rows.map(x=>({...x,totalPrice:Number(x.totalPrice||0),paid:Number(x.paid||0),date:new Date(x.createdAt).toLocaleString('ar-EG')})));
  }catch(err){res.status(500).json({error:'تعذر تحميل الحجوزات: '+err.message});}
});

app.post('/api/requests', async (req,res)=>{
  try{
    const {name,phone,service,details}=req.body||{};
    const n=String(name||'').trim(), ph=cleanPhone(phone), s=String(service||'').trim(), d=String(details||'').trim();
    if(!n||!ph||!s||!d) return res.status(400).json({error:'كل البيانات مطلوبة'});
    if(!validPhone(ph)) return res.status(400).json({error:'رقم الموبايل غير صحيح. استخدم 7 إلى 15 رقمًا، ويمكن وضع + في البداية.'});
    const {rows}=await pool.query(`INSERT INTO requests(name,phone,service,details) VALUES($1,$2,$3,$4) RETURNING id,created_at AS "createdAt",name,phone,service,details,status,total_price AS "totalPrice",paid`,[n,ph,s,d]);
    res.status(201).json({...rows[0],totalPrice:Number(rows[0].totalPrice||0),paid:Number(rows[0].paid||0),whatsapp:whatsappNumber(ph)});
  }catch(err){res.status(500).json({error:'تعذر حفظ الطلب: '+err.message});}
});

app.put('/api/requests/:id', auth, async (req,res)=>{
  try{
    const {name,phone,service,details,status,totalPrice,paid}=req.body||{};
    const ph=cleanPhone(phone);
    if(!validPhone(ph)) return res.status(400).json({error:'رقم الموبايل غير صحيح'});
    if(!['pending','confirmed','cancelled'].includes(status)) return res.status(400).json({error:'حالة الحجز غير صحيحة'});
    const total=Math.max(0,Number(totalPrice)||0), payment=Math.max(0,Number(paid)||0);
    const {rows}=await pool.query(`UPDATE requests SET name=$1,phone=$2,service=$3,details=$4,status=$5,total_price=$6,paid=$7 WHERE id=$8 RETURNING id,created_at AS "createdAt",name,phone,service,details,status,total_price AS "totalPrice",paid`,[String(name||'').trim(),ph,String(service||'').trim(),String(details||'').trim(),status,total,payment,req.params.id]);
    if(!rows[0]) return res.status(404).json({error:'الحجز غير موجود'});
    res.json({...rows[0],totalPrice:Number(rows[0].totalPrice||0),paid:Number(rows[0].paid||0)});
  }catch(err){res.status(500).json({error:'تعذر حفظ التعديل: '+err.message});}
});

app.delete('/api/requests/:id', auth, async (req,res)=>{try{const r=await pool.query('DELETE FROM requests WHERE id=$1',[req.params.id]);if(!r.rowCount)return res.status(404).json({error:'الحجز غير موجود'});res.status(204).end();}catch(err){res.status(500).json({error:err.message});}});
app.delete('/api/requests', auth, async (_req,res)=>{try{await pool.query('DELETE FROM requests');res.status(204).end();}catch(err){res.status(500).json({error:err.message});}});

app.get('/api/settings/availability', auth, async (_req,res)=>{try{const {rows}=await pool.query('SELECT value FROM settings WHERE key=$1',['availability']);res.json({value:rows[0]?.value||''});}catch(err){res.status(500).json({error:err.message});}});
app.put('/api/settings/availability', auth, async (req,res)=>{try{const value=String(req.body?.value||'').trim();await pool.query(`INSERT INTO settings(key,value) VALUES('availability',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`,[value]);res.json({value});}catch(err){res.status(500).json({error:err.message});}});

app.get('/', (_req,res)=>res.sendFile(path.join(__dirname,'index.html')));

app.listen(PORT,()=>console.log(`Sergany backend running on ${PORT}`));
initDb().then(ok=>console.log(ok?'Database initialized':'Database initialization skipped')).catch(err=>console.error('Database initialization error:',err.message));
