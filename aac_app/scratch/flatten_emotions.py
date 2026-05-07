import json

with open('d:/prowom/aac_app/data/vocabulary.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Flatten emotions
new_emotions = []
for item in data['feelings']['emotions']:
    if 'children' in item:
        for child in item['children']:
            # Standardize names
            name_th = child.get('th', '')
            parent_name_th = item.get('th', '')
            
            full_name_th = f"{parent_name_th}{name_th}"
            
            # Standardize phrases
            phrase_th = child.get('phraseTh', f"ฉันรู้สึก{full_name_th}")
            phrase_ms = child.get('phraseMs', child.get('ms', ''))
            
            new_item = {
                "th": full_name_th,
                "ms": child.get('ms', ''),
                "phraseTh": phrase_th,
                "phraseMs": phrase_ms,
                "img": child.get('img', '')
            }
            new_emotions.append(new_item)
    else:
        new_emotions.append(item)

data['feelings']['emotions'] = new_emotions

with open('d:/prowom/aac_app/data/vocabulary.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
