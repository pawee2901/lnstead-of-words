# App images

แอปรองรับรูปได้ 2 แบบ:

1. ใช้ลิงก์รูปจากเว็บ ไม่ต้องเก็บไฟล์ในโปรเจกต์
2. เก็บไฟล์รูปไว้ใน `static/images/` สำหรับรูปที่ต้องการให้ใช้งานได้แม้ไม่มีอินเทอร์เน็ต

## แนะนำสำหรับโปรเจกต์นี้

ถ้ารูปมีจำนวนเยอะ ให้ใช้ลิงก์รูปจากเว็บได้เลย เพื่อลดขนาดไฟล์โปรเจกต์

ตัวอย่างใน `data/vocabulary.json`:

```json
{
  "th": "น้ำเปล่า",
  "ms": "Air kosong",
  "img": "https://example.com/images/water.jpg"
}
```

ถ้าเป็นรูปจาก Pexels ให้ใช้ลิงก์ไฟล์รูปโดยตรง เช่นลิงก์ที่ขึ้นต้นด้วย:

```text
https://images.pexels.com/photos/...
```

ไม่ควรใช้ลิงก์หน้าเว็บแบบนี้ใน `img`:

```text
https://www.pexels.com/photo/...
```

เพราะเป็นหน้า HTML ไม่ใช่ไฟล์รูปโดยตรง

## ถ้าต้องการใช้ไฟล์ในเครื่อง

วางรูปไว้ในโฟลเดอร์นี้ เช่น:

```text
static/images/emotions/happy.png
static/images/food/rice.png
static/images/places/hospital.png
```

แล้วใส่ path แบบนี้:

```json
{
  "th": "ดีใจ",
  "ms": "Gembira",
  "img": "/static/images/emotions/happy.png"
}
```

## ขนาดรูปที่แนะนำ

- PNG, WebP, JPG หรือ SVG
- ขนาดประมาณ 512 x 512 px หรือ 800 x 800 px
- เลือกรูปที่วัตถุใหญ่ ชัด พื้นหลังไม่รก
- หลีกเลี่ยงโลโก้ แบรนด์ และใบหน้าคนที่ชัดเจนถ้าไม่จำเป็น
