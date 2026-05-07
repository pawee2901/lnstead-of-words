import json
import os

with open('d:/prowom/aac_app/data/vocabulary.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# List of files in static/images
image_files = [
    "ฉันรู้สึกกลืนลำบาก.png", "ฉันรู้สึกคลื่นไส้.png", "ฉันรู้สึกง่วงนอน.png", 
    "ฉันรู้สึกชาซีขวา.png", "ฉันรู้สึกตาพร่ามัว.png", "ฉันรู้สึกท้องอืด.png", 
    "ฉันรู้สึกท้องเสีย.png", "ฉันรู้สึกนอนไม่หลับ.png", "ฉันรู้สึกปัสสาวะมีเลือด.png", 
    "ฉันรู้สึกปัสสาวะไม่สุด.png", "ฉันรู้สึกปากเบี้ยว.png", "ฉันรู้สึกพูดไม่ชัด.png", 
    "ฉันรู้สึกมีไข้.png", "ฉันรู้สึกร้อน.png", "ฉันรู้สึกลิ้นแข็ง.png", 
    "ฉันรู้สึกหนาว.png", "ฉันรู้สึกหายใจเหนื่อย.png", "ฉันรู้สึกหิว.png", 
    "ฉันรู้สึกอาเจียน.png", "ฉันรู้สึกเจ็บคอ.png", "ฉันรู้สึกเจ็บหน้าอก.png", 
    "ฉันรู้สึกเดินเซ.png", "ฉันรู้สึกเบื่ออาหาร.png", "ฉันรู้สึกเป็นหวัด.png", 
    "ฉันรู้สึกเวียนหัว.png", "ฉันรู้สึกเหนื่อย.png", "ฉันรู้สึกเห็นภาพซ้อน.png", 
    "ฉันรู้สึกใจสั่น.png", "ฉันรู้สึกไอ.png", "ชา.png", "ชาที่ใบหน้า.png", 
    "ปาก.png", "ลิ้น.png"
]

# Map common patterns
def find_image(th_name):
    # Try exact match with "ฉันรู้สึก"
    for img in image_files:
        if f"ฉันรู้สึก{th_name}" in img:
            return f"/static/images/{img}"
        if th_name in img:
            return f"/static/images/{img}"
    return None

# Update symptoms
for item in data['feelings']['symptoms']:
    th = item.get('th', '')
    
    # Manual overrides or specific logic
    img = find_image(th)
    
    if th == "ชาซีกขวา":
        img = "/static/images/ฉันรู้สึกชาซีขวา.png"
    elif th == "ชาใบหน้า":
        img = "/static/images/ชาที่ใบหน้า.png"
    elif th == "ชาปาก":
        img = "/static/images/ปาก.png"
    elif th == "ชาลิ้น":
        img = "/static/images/ลิ้น.png"
    
    if img:
        item['img'] = img

with open('d:/prowom/aac_app/data/vocabulary.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
