from flask import Flask, render_template, jsonify, request, send_file
from gtts import gTTS
import os
import json
import hashlib
import re
import time
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Set paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'vocabulary.json')
AUDIO_DIR = os.path.join(BASE_DIR, 'static', 'audio')

# Ensure audio directory exists
os.makedirs(AUDIO_DIR, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/words')
def get_words():
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": f"Data file not found at {DATA_FILE}"}), 404
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/speak')
def speak():
    text = request.args.get('text', '').strip()
    lang = request.args.get('lang', 'th')
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
        
    try:
        # Create a stable filename using MD5 prefix + sanitized text
        hash_prefix = hashlib.md5(f"{text}_{lang}".encode('utf-8')).hexdigest()[:8]
        # Sanitize text for filename: keep only alphanumeric (includes Thai) and basic spacers
        clean_text = "".join([c for c in text if c.isalnum() or c in (' ', '_', '-')]).strip()
        safe_text = clean_text[:30] # Keep it relatively short
        filename = f"{lang}_{hash_prefix}_{safe_text}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        
        # Check if file exists and is healthy
        if not os.path.exists(filepath) or os.path.getsize(filepath) < 100:
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except:
                    pass
            
            # Generate new TTS
            print(f"Generating audio for: {text} ({lang})")
            tts = gTTS(text=text, lang=lang)
            
            # Save to temporary file first to avoid serving 0-byte files
            temp_path = filepath + ".tmp"
            tts.save(temp_path)
            
            if os.path.exists(temp_path) and os.path.getsize(temp_path) > 100:
                os.rename(temp_path, filepath)
            else:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return jsonify({"error": "Failed to generate valid audio content"}), 502

        return send_file(filepath, mimetype="audio/mpeg")
    except Exception as e:
        print(f"TTS Error: {str(e)}")
        return jsonify({"error": f"TTS generation error: {str(e)}"}), 500

@app.route('/admin')
@app.route('/admin/')
@app.route('/Admin')
@app.route('/Admin/')
@app.route('/ADMIN')
@app.route('/ADMIN/')
def admin():
    return render_template('admin.html')

@app.route('/api/settings', methods=['POST'])
def save_settings():
    try:
        data_req = request.get_json() or {}
        
        # Load existing vocabulary.json
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Data file not found"}), 404
            
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Update settings
        data['site_title_th'] = data_req.get('site_title_th', data.get('site_title_th', ''))
        data['site_subtitle_th'] = data_req.get('site_subtitle_th', data.get('site_subtitle_th', ''))
        data['site_title_ms'] = data_req.get('site_title_ms', data.get('site_title_ms', ''))
        data['site_subtitle_ms'] = data_req.get('site_subtitle_ms', data.get('site_subtitle_ms', ''))
        
        # Save back to file
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/update-item', methods=['POST'])
def update_item():
    try:
        path = request.form.get('path', '').strip()
        new_th = request.form.get('th', '').strip()
        new_ms = request.form.get('ms', '').strip()
        img_url = request.form.get('img_url', '').strip()
        
        if not path:
            return jsonify({"error": "Path is required"}), 400
            
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Data file not found"}), 404
            
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Walk to find item
        parts = path.split('.')
        item = data
        for part in parts:
            if isinstance(item, list):
                try:
                    item = item[int(part)]
                except (ValueError, IndexError):
                    return jsonify({"error": f"Invalid list index in path at {part}"}), 400
            elif isinstance(item, dict):
                if part in item:
                    item = item[part]
                else:
                    return jsonify({"error": f"Key {part} not found in path"}), 400
            else:
                return jsonify({"error": "Invalid path structure"}), 400
                
        if not isinstance(item, dict):
            return jsonify({"error": "Item is not a dictionary"}), 400
            
        # Keep track of old names to update TTS phrases if needed
        old_th = item.get('th')
        old_ms = item.get('ms')
        
        # Determine group (feelings or needs) based on path prefix
        group = 'feelings' if path.startswith('feelings') else 'needs'
        
        # Update text labels
        if new_th:
            item['th'] = new_th
        if new_ms:
            item['ms'] = new_ms
            
        # Update phraseTh / phraseMs automatically to match new name
        if new_th and old_th:
            if 'phraseTh' in item:
                if old_th in item['phraseTh']:
                    item['phraseTh'] = item['phraseTh'].replace(old_th, new_th)
                else:
                    item['phraseTh'] = f"ฉันรู้สึก{new_th}" if group == 'feelings' else f"ฉันต้องการ{new_th}"
            
        if new_ms and old_ms:
            if 'phraseMs' in item:
                if old_ms.lower() in item['phraseMs'].lower():
                    pattern = re.compile(re.escape(old_ms), re.IGNORECASE)
                    item['phraseMs'] = pattern.sub(new_ms, item['phraseMs'])
                else:
                    ms_prefix = "Saya rasa" if group == 'feelings' else "Saya nak"
                    item['phraseMs'] = f"{ms_prefix} {new_ms.lower()}"
                    
        # Handle image upload
        uploaded_file = request.files.get('img_file')
        if uploaded_file and uploaded_file.filename:
            filename_orig = secure_filename(uploaded_file.filename)
            filename = f"uploaded_{int(time.time())}_{filename_orig}"
            
            images_dir = os.path.join(BASE_DIR, 'static', 'images')
            os.makedirs(images_dir, exist_ok=True)
            save_path = os.path.join(images_dir, filename)
            
            uploaded_file.save(save_path)
            item['img'] = f"/static/images/{filename}"
        elif img_url:
            item['img'] = img_url
            
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            
        return jsonify({
            "status": "success",
            "img": item.get('img', ''),
            "th": item.get('th'),
            "ms": item.get('ms')
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
