from flask import Flask, render_template, jsonify, request, send_file
from gtts import gTTS
import os
import json
import hashlib

app = Flask(__name__)

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
