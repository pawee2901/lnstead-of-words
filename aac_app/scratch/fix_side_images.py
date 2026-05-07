import json
import os

with open('d:/prowom/aac_app/data/vocabulary.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Update symptoms mapping
for item in data['feelings']['symptoms']:
    th = item.get('th', '')
    
    # Fix the ones that are definitely missing
    if th == "ชาซีกขวา":
        item['img'] = "/static/images/ฉันรู้สึกชาซีขวา.png"
    elif th == "อ่อนแรงซีกขวา":
        item['img'] = "/static/images/ฉันรู้สึกชาซีขวา.png" # Fallback to the same 'right' image
    
    # Check for 'ซีกซ้าย'
    if "ซีกซ้าย" in th:
        # If we don't have a specific 'ซ้าย' image, maybe try to find one
        # But we didn't find any in the search.
        pass

with open('d:/prowom/aac_app/data/vocabulary.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
