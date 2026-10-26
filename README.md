# Candidate Pool

เว็บตลาดกลางผู้สมัครสำหรับ Line Manager แทนไฟล์ `Candidate_Marketplace_AUTO.xlsm`
เป็นเว็บ static (HTML/CSS/JavaScript ล้วน ไม่ต้อง build) วางบน GitHub Pages ได้ทันที และใช้ [anime.js](https://animejs.com) v4 ทำแอนิเมชัน

## ใครทำอะไรได้

| การทำงาน | Admin (HR) | บัญชี PJT-PD-1…4 |
|---|---|---|
| ดูผู้สมัคร | ทุก Pool | คลังกลาง + Pool ของตนเอง |
| เลือกผู้สมัครเข้า Pool | ส่งเข้า Pool ใดก็ได้ | เฉพาะ Pool ตนเอง |
| คืนผู้สมัครกลับคลังกลาง | ทุก Pool | เฉพาะ Pool ตนเอง |
| ย้ายข้าม Pool หน่วยงาน | ได้ | ไม่ได้ |
| Executive Decision / นัดสัมภาษณ์ | ทุกรายการ | เฉพาะ Pool ตนเอง |
| เพิ่ม/แก้ไข/ลบ/นำเข้า Excel | ได้ | ไม่ได้ |
| เปิด/ปิดบัญชี, รีเซ็ตรหัสผ่าน | ได้ | ไม่ได้ |

เมื่อผู้สมัครถูกเลือกเข้า Pool, คืนคลังกลาง หรือถูกย้าย สถานะจะกลับเป็น "รอพิจารณา" และล้างข้อมูลนัดสัมภาษณ์

## โหมดการทำงาน (`js/config.js`)

- **`demo`** (ค่าเริ่มต้น): ข้อมูลเก็บใน localStorage ของเบราว์เซอร์แต่ละเครื่อง ไม่ตรวจรหัสผ่าน มีข้อมูลตัวอย่างจากไฟล์ Excel
  ใช้ทดลองเท่านั้น **ห้ามใส่ข้อมูลผู้สมัครจริง** เพราะใครเปิดเว็บก็เข้าได้
- **`supabase`**: เข้าสู่ระบบด้วยอีเมลและรหัสผ่านจริง ข้อมูลอยู่ฐานข้อมูลกลาง สิทธิ์ทั้งหมดในตารางด้านบนบังคับที่ฐานข้อมูล
  (row-level security ใน `supabase/schema.sql`) แม้มีคนแก้โค้ดหน้าเว็บก็ข้ามสิทธิ์ไม่ได้

> GitHub Pages เป็นเว็บสาธารณะ ไฟล์ทุกไฟล์ใน repo ใครก็อ่านได้ จึงห้ามเก็บข้อมูลผู้สมัครหรือรหัสผ่านไว้ใน repo
> ข้อมูลจริงต้องอยู่ใน Supabase เท่านั้น

## ทดลองในเครื่อง

เปิดผ่านเว็บเซิร์ฟเวอร์ใดก็ได้ (เปิดไฟล์ `index.html` ตรง ๆ ไม่ได้ เพราะใช้ ES modules) เช่น

```bash
npx serve .
```

## นำขึ้น GitHub Pages

1. สร้าง repository ใหม่บน GitHub แล้วอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ (ยกเว้น `.claude/`)
2. ไปที่ **Settings › Pages** เลือก Source = *Deploy from a branch*, Branch = `main`, Folder = `/ (root)` แล้วกด Save
3. รอประมาณ 1 นาที เว็บจะอยู่ที่ `https://<ชื่อผู้ใช้>.github.io/<ชื่อ-repo>/`

ถ้าใช้ GitHub แบบองค์กร (Enterprise) สามารถตั้ง Pages เป็น private ให้เห็นเฉพาะคนในองค์กรได้

## เปิดใช้ Supabase (ข้อมูลจริง)

1. สมัคร [supabase.com](https://supabase.com) สร้าง Project ใหม่ (เลือก region Singapore)
2. **SQL Editor** › วางเนื้อหา `supabase/schema.sql` แล้วกด Run
3. **Authentication › Providers › Email**: ปิด "Allow new users to sign up" เพื่อไม่ให้ใครสมัครเองได้
4. **Authentication › URL Configuration**: ใส่ Site URL เป็นที่อยู่ GitHub Pages ของคุณ (ใช้กับลิงก์รีเซ็ตรหัสผ่าน)
5. สร้างบัญชี: **Authentication › Users › Add user** (อีเมล + รหัสผ่าน, ติ๊ก Auto Confirm) แล้วผูกสิทธิ์ใน SQL Editor:
   ```sql
   insert into public.profiles (id, email, role)
   select id, email, 'admin' from auth.users where email = 'hr@company.co.th';

   insert into public.profiles (id, email, role, unit)
   select id, email, 'pjt', 'PJT-PD-1' from auth.users where email = 'pjt1@company.co.th';
   ```
6. **Project Settings › API**: คัดลอก Project URL และ `anon public` key ใส่ใน `js/config.js` แล้วเปลี่ยน `mode: 'supabase'`
   (anon key ออกแบบมาให้เปิดเผยได้ ความปลอดภัยมาจาก row-level security แต่ **ห้ามใส่ `service_role` key เด็ดขาด**)
7. เข้าสู่ระบบด้วยบัญชี Admin › Candidate Pool › **นำเข้าจาก Excel** แล้วเลือกไฟล์ `.xlsm` เดิม
   ระบบอ่านชีต `Candidate Database` (= คลังกลาง) และ `PJT-PD-1…4` ข้ามชีตที่ซ่อนไว้ และแจ้ง Candidate ID ที่ซ้ำกัน

## โครงสร้างไฟล์

```
index.html            หน้าเดียว (hash routing: #/login, #/pjt, #/admin)
css/styles.css        สไตล์ทั้งหมด
js/config.js          โหมดและค่าการเชื่อมต่อ Supabase
js/app.js             router + ตรวจสิทธิ์ก่อนเข้าแต่ละหน้า
js/anim.js            anime.js v4 (โหลดจาก CDN, ปิดเองเมื่อผู้ใช้ตั้ง reduce motion)
js/ui.js              ค่าคงที่, format วันที่/เงิน, modal, toast
js/excel.js           นำเข้า/ส่งออก Excel (SheetJS โหลดเมื่อใช้)
js/views/*.js         หน้าเข้าสู่ระบบ, หน้า PJT, หลังบ้าน Admin
js/data/*.js          demo store, Supabase store, กฎธุรกิจที่ใช้ร่วมกัน
supabase/schema.sql   ตาราง + row-level security + ฟังก์ชันสำหรับบัญชี PJT
```
