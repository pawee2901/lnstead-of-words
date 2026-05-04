from flask import Flask, render_template, jsonify, request, send_file
from gtts import gTTS
import os
import json
import hashlib

app = Flask(__name__)

# Set paths
BASE_DIR = os.path.dirname(os.path.abspath(__name__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'vocabulary.json')
AUDIO_DIR = os.path.join(BASE_DIR, 'static', 'audio')

# Ensure audio directory exists
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/words')
def get_words():
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/speak')
def speak():
    text = request.args.get('text', '')
    lang = request.args.get('lang', 'th')
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
        
    try:
        # Create a unique filename based on hash to act as a simple cache
        hash_obj = hashlib.md5(f"{text}_{lang}".encode('utf-8'))
        filename = f"{hash_obj.hexdigest()}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        
        # Regenerate missing or broken cache files. A failed gTTS save can leave
        # a 0-byte mp3, which makes the UI look like it played but produces no sound.
        if not os.path.exists(filepath) or os.path.getsize(filepath) < 1024:
            tts = gTTS(text=text, lang=lang)
            tts.save(filepath)
            
        return send_file(filepath, mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
