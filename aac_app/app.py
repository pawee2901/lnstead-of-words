from flask import Flask, render_template, jsonify, request, send_file
from gtts import gTTS
import os
import json
import hashlib
import re
import time
import subprocess
import threading
import base64
import urllib.request
import urllib.error
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Set paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'vocabulary.json')
AUDIO_DIR = os.path.join(BASE_DIR, 'static', 'audio')

# Ensure audio directory exists
os.makedirs(AUDIO_DIR, exist_ok=True)

def upload_file_to_github(repo_path, file_path_in_repo, local_file_path, pat, message):
    try:
        # Read local file content and encode to base64
        with open(local_file_path, "rb") as f:
            file_data = f.read()
        encoded_content = base64.b64encode(file_data).decode("utf-8")
        
        # API URL
        api_url = f"https://api.github.com/repos/{repo_path}/contents/{file_path_in_repo}"
        
        # Check if file already exists to get its SHA (needed for updates)
        sha = None
        req_get = urllib.request.Request(api_url)
        req_get.add_header("Authorization", f"token {pat}")
        req_get.add_header("Accept", "application/vnd.github.v3+json")
        req_get.add_header("User-Agent", "Flask-App")
        try:
            with urllib.request.urlopen(req_get) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                sha = res_data.get("sha")
        except urllib.error.HTTPError as e:
            if e.code != 404: # 404 means file doesn't exist yet, which is fine
                raise e
        
        # Prepare PUT request payload
        payload = {
            "message": message,
            "content": encoded_content,
            "branch": "main"
        }
        if sha:
            payload["sha"] = sha
            
        data_json = json.dumps(payload).encode("utf-8")
        
        req_put = urllib.request.Request(api_url, data=data_json, method="PUT")
        req_put.add_header("Authorization", f"token {pat}")
        req_put.add_header("Accept", "application/vnd.github.v3+json")
        req_put.add_header("Content-Type", "application/json")
        req_put.add_header("User-Agent", "Flask-App")
        
        with urllib.request.urlopen(req_put) as response:
            print(f"Successfully uploaded {file_path_in_repo} to GitHub! Status: {response.status}")
            return True
    except Exception as e:
        print(f"Failed to upload {file_path_in_repo} to GitHub: {str(e)}")
        return False

git_lock = threading.Lock()

last_sync_status = {
    "status": "idle",
    "message": "ยังไม่มีการเริ่มอัปโหลดสำรองข้อมูล",
    "timestamp": 0
}

def push_changes_to_github(local_image_path=None):
    def _push():
        global last_sync_status
        with git_lock:
            try:
                last_sync_status["status"] = "syncing"
                last_sync_status["message"] = "กำลังส่งข้อมูลรูปภาพและไฟล์ไปที่ GitHub..."
                last_sync_status["timestamp"] = int(time.time())
                
                pat = os.environ.get('GITHUB_PAT')
                if not pat:
                    msg = "ไม่พบตัวแปร GITHUB_PAT ในการตั้งค่า (Environment Variable) ข้อมูลจะบันทึกชั่วคราวเท่านั้นและจะหายไปเมื่อเซิร์ฟเวอร์หลับหรือเริ่มทำงานใหม่"
                    print(msg)
                    last_sync_status["status"] = "warning"
                    last_sync_status["message"] = msg
                    return
                
                print("GITHUB_PAT found. Preparing to sync changes via GitHub API...")
                
                # Get the current repo path (owner/repo)
                repo_path = "pawee2901/lnstead-of-words" # default fallback
                try:
                    res = subprocess.run(["git", "remote", "get-url", "origin"], capture_output=True, text=True, cwd=BASE_DIR)
                    if res.returncode == 0:
                        url = res.stdout.strip()
                        match = re.search(r'github\.com[:/]([^/]+/[^/]+?)(?:\.git)?$', url)
                        if match:
                            repo_path = match.group(1)
                except Exception as ex:
                    print(f"Error getting remote URL: {str(ex)}")

                # 1. If there's an image, upload it first
                img_ok = True
                if local_image_path and os.path.exists(local_image_path):
                    filename = os.path.basename(local_image_path)
                    print(f"Uploading image {filename} to GitHub repo pawee2901/imgbucket...")
                    img_ok = upload_file_to_github(
                        repo_path="pawee2901/imgbucket",
                        file_path_in_repo=filename,
                        local_file_path=local_image_path,
                        pat=pat,
                        message=f"upload image {filename}"
                    )
                
                # 2. Upload vocabulary.json
                print("Uploading vocabulary.json to GitHub...")
                repo_vocab_path = "aac_app/data/vocabulary.json"
                vocab_ok = upload_file_to_github(
                    repo_path=repo_path,
                    file_path_in_repo=repo_vocab_path,
                    local_file_path=DATA_FILE,
                    pat=pat,
                    message="admin: update vocabulary.json [skip render]"
                )
                
                if img_ok and vocab_ok:
                    print("GitHub API sync completed!")
                    last_sync_status["status"] = "success"
                    last_sync_status["message"] = "สำรองและบันทึกข้อมูลรูปภาพบน GitHub เรียบร้อยแล้ว (ถาวร)"
                else:
                    last_sync_status["status"] = "error"
                    last_sync_status["message"] = "อัปโหลดข้อมูลล้มเหลว: การตอบกลับจากเซิร์ฟเวอร์ GitHub ผิดพลาด โปรดตรวจสอบสิทธิ์ของรหัสสิทธิ์ GITHUB_PAT"
            except Exception as e:
                err_msg = f"เกิดข้อผิดพลาดในการเชื่อมต่อ: {str(e)}"
                print(err_msg)
                last_sync_status["status"] = "error"
                last_sync_status["message"] = err_msg

    threading.Thread(target=_push).start()

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

@app.route('/api/sync-status')
def sync_status():
    return jsonify(last_sync_status)

@app.route('/api/test-github')
def test_github():
    """Test GitHub connection and PAT validity"""
    pat = os.environ.get('GITHUB_PAT')
    if not pat:
        return jsonify({"ok": False, "error": "ไม่พบ GITHUB_PAT ใน Environment Variables ของ Render เลย\nวิธีแก้: ไปที่ Render > เลือก Service > Environment > เพิ่ม GITHUB_PAT"})
    try:
        # Test PAT validity
        req = urllib.request.Request("https://api.github.com/user")
        req.add_header("Authorization", f"token {pat}")
        req.add_header("User-Agent", "Flask-App")
        with urllib.request.urlopen(req) as resp:
            user_data = json.loads(resp.read().decode("utf-8"))
            username = user_data.get("login", "unknown")
        
        # Test imgbucket repo access
        req2 = urllib.request.Request("https://api.github.com/repos/pawee2901/imgbucket")
        req2.add_header("Authorization", f"token {pat}")
        req2.add_header("User-Agent", "Flask-App")
        try:
            with urllib.request.urlopen(req2) as resp2:
                repo_data = json.loads(resp2.read().decode("utf-8"))
                repo_name = repo_data.get("full_name", "?")
            return jsonify({"ok": True, "message": f"เชื่อมต่อสำเร็จ! ล็อกอินเป็น: {username} | เข้าถึงคลัง: {repo_name}"})
        except urllib.error.HTTPError as e2:
            return jsonify({"ok": False, "error": f"PAT ถูกต้อง (ล็อกอินเป็น {username}) แต่เข้าคลัง imgbucket ไม่ได้: HTTP {e2.code} - อาจสร้างคลังยังไม่เสร็จ หรือ PAT ไม่มีสิทธิ์ repo"})
    except urllib.error.HTTPError as e:
        return jsonify({"ok": False, "error": f"GITHUB_PAT ไม่ถูกต้องหรือหมดอายุแล้ว: HTTP {e.code}"})
    except Exception as ex:
        return jsonify({"ok": False, "error": f"เกิดข้อผิดพลาด: {str(ex)}"})

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
            
        push_changes_to_github()
            
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
        save_path = None
        if uploaded_file and uploaded_file.filename:
            filename_orig = secure_filename(uploaded_file.filename)
            filename = f"uploaded_{int(time.time())}_{filename_orig}"
            
            images_dir = os.path.join(BASE_DIR, 'static', 'images')
            os.makedirs(images_dir, exist_ok=True)
            save_path = os.path.join(images_dir, filename)
            
            uploaded_file.save(save_path)
            item['img'] = f"https://raw.githubusercontent.com/pawee2901/imgbucket/main/{filename}"
        elif img_url:
            item['img'] = img_url
            
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            
        push_changes_to_github(local_image_path=save_path)
            
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
