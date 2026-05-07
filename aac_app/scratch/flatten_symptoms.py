import json

with open('d:/prowom/aac_app/data/vocabulary.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

new_symptoms = []

for item in data['feelings']['symptoms']:
    if 'children' in item:
        for child in item['children']:
            img_map = {
                "แขน": "/static/images/arm.png",
                "ขา": "/static/images/leg.png",
                "ซีกซ้าย": "/static/images/half-body-left.png",
                "ซีกขวา": "/static/images/half-body-right.png",
                "เบื่ออาหาร": "/static/images/appetite.png",
                "อาเจียน": "/static/images/vomit.png",
                "ท้องเสีย": "/static/images/diarrhea.png",
                "ท้องอืด": "/static/images/stomach.png",
                "ปัสสาวะมีเลือด": "/static/images/urine.png",
                "ปัสสาวะไม่สุด": "/static/images/urine.png",
                "ใจสั่น": "/static/images/heart.png",
                "ปากเบี้ยว": "/static/images/mouth.png",
                "พูดไม่ชัด": "/static/images/speech.png",
                "ลิ้นแข็ง": "/static/images/tongue.png",
                "เดินเซ": "/static/images/walk.png",
                "เห็นภาพซ้อน": "/static/images/eye.png",
                "ตาพร่ามัว": "/static/images/eye.png",
                "หายใจเหนื่อย": "/static/images/breathing.png",
                "เจ็บหน้าอก": "/static/images/chest.png",
                "เวียนหัว": "/static/images/head.png",
                "กลืนลำบาก": "/static/images/throat.png",
                "มีไข้": "/static/images/fever.png",
                "คลื่นไส้": "/static/images/nausea.png",
                "ไอ": "/static/images/cough.png",
                "เจ็บคอ": "/static/images/throat.png",
                "เป็นหวัด": "/static/images/cold.png",
                "ง่วงนอน": "/static/images/sleepy.png",
                "หนาว": "/static/images/cold-feeling.png",
                "ร้อน": "/static/images/hot.png",
                "เหนื่อย": "/static/images/tired.png",
                "นอนไม่หลับ": "/static/images/insomnia.png",
                "หิว": "/static/images/hungry.png"
            }
            
            name_th = child.get('th', '')
            if name_th in ["แขน", "ขา", "ซีกซ้าย", "ซีกขวา"]:
                full_name_th = f"{name_th}อ่อนแรง" if name_th not in ["ซีกซ้าย", "ซีกขวา"] else f"อ่อนแรง{name_th}"
            else:
                full_name_th = name_th
            
            phrase_th = child.get('phraseTh', f"ฉันรู้สึก{full_name_th}")
            phrase_ms = child.get('phraseMs', child.get('ms', ''))
            
            new_item = {
                "th": full_name_th,
                "ms": child.get('ms', ''),
                "phraseTh": phrase_th,
                "phraseMs": phrase_ms,
                "img": img_map.get(name_th, child.get('img', ''))
            }
            new_symptoms.append(new_item)
    else:
        new_symptoms.append(item)

data['feelings']['symptoms'] = new_symptoms

with open('d:/prowom/aac_app/data/vocabulary.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
