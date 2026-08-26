مكتب محمد السرجاني — Premium Design + Backend

المشروع Full-Stack جاهز للنشر على Render/Abasthan:
- Node.js + Express API
- PostgreSQL للحجوزات والإعدادات
- JWT لتسجيل دخول لوحة الإدارة
- الحجز يُحفظ في قاعدة البيانات ثم يفتح WhatsApp
- لوحة الإدارة تتعامل مع السيرفر بدل LocalStorage
- render.yaml جاهز لإنشاء Web Service + PostgreSQL

إعدادات الأدمن على الاستضافة:
ADMIN_USER = admin
ADMIN_PASSWORD = استخدم كلمة المرور التي حددتها عند إعداد الخدمة
JWT_SECRET = يتم توليده تلقائيًا من render.yaml
DATABASE_URL = يتم ربطه تلقائيًا بقاعدة PostgreSQL

مهم: لا يتم وضع كلمة مرور الأدمن داخل ملفات المشروع أو Git. ضعها كـ Environment Variable في لوحة الاستضافة.
