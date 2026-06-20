# Web-Based AAC App for Elderly Users

This is a complete, working web application tailored for elderly users to assist with communication. It features a simple, mobile-optimized design with large buttons, large text, and high contrast (Yellow background, Black text), along with integrated Text-to-Speech (gTTS) for both Thai and Malay.

## Project Structure
```text
aac_app/
│
├── app.py                   # Main Flask application backend
├── requirements.txt         # Python dependencies
├── data/
│   └── vocabulary.json      # JSON data for words, translations, and images
├── templates/
│   └── index.html           # Main HTML structure
└── static/
    ├── css/
    │   └── style.css        # Stylesheet (Responsive, Mobile-first)
    ├── js/
    │   └── script.js        # Frontend logic (Navigation, Audio playback)
    └── audio/               # Auto-generated folder for caching audio
```

## Setup Instructions

1. **Install Python**: Ensure you have Python 3.8+ installed.
2. **Create a Virtual Environment (Optional but recommended)**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. Start the Flask server:
   ```bash
   python app.py
   ```
2. Open your web browser and go to:
   ```
   http://127.0.0.1:5000/
   ```

## Key Features

- **No Database**: All vocabulary and categories are managed cleanly within `data/vocabulary.json`.
- **Text-to-Speech**: Clicking any card immediately plays audio via the `/speak` endpoint using `gTTS`. Audio files are cached to improve speed on subsequent clicks.
- **Language Support**: Seamlessly toggle between Thai (th) and Malay (ms) from the home page.
- **Elderly-Friendly UI**: Enforces high contrast, large text (28px+), big responsive grid grids, and a persistent "Back" / "Home" navigation flow.
- **Text Input**: Includes a simple screen where users can type any message and press "Play Voice".

---

## Deploying on Render (วิธีติดตั้งขึ้นเว็บบน Render)

คุณสามารถนำเว็บนี้ขึ้นระบบออนไลน์ฟรีผ่าน **Render** โดยทำตามขั้นตอนดังนี้ครับ:

1. **เข้าสู่ระบบ Render**: สมัครสมาชิกและเข้าสู่ระบบที่ [https://render.com](https://render.com) (สามารถล็อกอินผ่านบัญชี GitHub ได้เลย)
2. **สร้างบริการใหม่ (New Web Service)**:
   - คลิกที่ปุ่ม **New +** แล้วเลือก **Web Service**
   - เชื่อมต่อกับบัญชี GitHub ของคุณ และเลือกพื้นที่เก็บโค้ด (Repository) ชื่อ `lnstead-of-words`
3. **ตั้งค่าคอนฟิกูเรชัน (Configuration)**:
   - **Name**: ตั้งชื่อเว็บตามต้องการ (เช่น `thai-malayu-aac`)
   - **Environment**: เลือกเป็น `Python`
   - **Branch**: เลือกเป็น `main`
   - **Region**: เลือกโซนใกล้ที่สุด (เช่น `Singapore`)
   - **Build Command**: พิมพ์ `pip install -r requirements.txt`
   - **Start Command**: พิมพ์ `gunicorn app:app`
   - **Instance Type**: เลือกเป็นแบบ **Free**
4. **คลิก Create Web Service**:
   - ระบบจะใช้เวลาติดตั้งประมาณ 2-3 นาที และจะให้ลิงก์สีฟ้าสำหรับเปิดใช้งานเว็บของคุณ เช่น `https://thai-malayu-aac.onrender.com`

> [!CAUTION]
> **ข้อจำกัดของระดับบริการฟรีบน Render (Render Free Tier Warning):**
> - **ข้อมูลจะถูกรีเซ็ตเมื่อเซิร์ฟเวอร์พักการทำงาน (Ephemeral Storage):** เนื่องจากบริการแบบฟรีของ Render ไม่มีฮาร์ดดิสก์แบบถาวร (Persistent Disk) ข้อมูลการแก้ไขชื่อเว็บ หรือรูปภาพที่อัปโหลดผ่านหน้าแอดมินบนหน้าเว็บออนไลน์ จะหายไปเมื่อเซิร์ฟเวอร์ Sleep (เกิดจากการไม่มีคนเข้าใช้งานเกิน 15 นาที) หรือเซิร์ฟเวอร์รีสตาร์ทประจำวัน
> - **แนวทางปฏิบัติแนะนำ (Recommended Workflow):** แนะนำให้กดตั้งค่า อัปโหลดรูปภาพ หรือแก้ไขข้อมูลคำศัพท์บนเครื่องคอมพิวเตอร์ของคุณในหน้าแอดมินท้องถิ่น (`http://127.0.0.1:5000/admin`) ให้เรียบร้อยก่อน จากนั้นทำการ **Commit และ Push** โค้ดขึ้น GitHub เมื่อ GitHub อัปเดต Render จะดึงข้อมูลคำศัพท์และรูปภาพตัวล่าสุดของคุณไปแสดงผลออนไลน์อย่างถาวรและไม่มีวันหายครับ!

