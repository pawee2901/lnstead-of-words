from flask import Flask, render_template, jsonify, request, send_file
from gtts import gTTS
import os
import json
import hashlib
import re
import time
import threading
import base64
import urllib.request
import urllib.error
import urllib.parse
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Set paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'vocabulary.json')
AUDIO_DIR = os.path.join(BASE_DIR, 'static', 'audio')

GITHUB_API_VERSION = '2022-11-28'
GITHUB_DATA_REPO = os.environ.get('GITHUB_DATA_REPO', 'pawee2901/lnstead-of-words')
GITHUB_IMAGE_REPO = os.environ.get('GITHUB_IMAGE_REPO', 'pawee2901/imgbucket')
GITHUB_BRANCH = os.environ.get('GITHUB_BRANCH', 'main')
GITHUB_DATA_PATH = os.environ.get('GITHUB_DATA_PATH', 'aac_app/data/vocabulary.json')

# Ensure audio directory exists
os.makedirs(AUDIO_DIR, exist_ok=True)

class GitHubUploadError(RuntimeError):
    pass


def _github_request(url, pat, data=None, method=None):
    req = urllib.request.Request(url, data=data, method=method)
    if pat:
        req.add_header('Authorization', f'Bearer {pat}')
    req.add_header('Accept', 'application/vnd.github+json')
    req.add_header('X-GitHub-Api-Version', GITHUB_API_VERSION)
    req.add_header('Content-Type', 'application/json')
    req.add_header('User-Agent', 'AAC-App')
    return req


def upload_file_to_github(repo_path, file_path_in_repo, local_file_path, pat, message):
    try:
        # Read local file content and encode to base64
        with open(local_file_path, "rb") as f:
            file_data = f.read()
        encoded_content = base64.b64encode(file_data).decode("utf-8")
        
        # API URL
        encoded_path = urllib.parse.quote(file_path_in_repo.strip('/'), safe='/')
        api_url = f'https://api.github.com/repos/{repo_path}/contents/{encoded_path}'
        
        # Check if file already exists to get its SHA (needed for updates)
        sha = None
        req_get = _github_request(api_url, pat)
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
            "branch": GITHUB_BRANCH
        }
        if sha:
            payload["sha"] = sha
            
        data_json = json.dumps(payload).encode("utf-8")
        
        req_put = _github_request(api_url, pat, data=data_json, method='PUT')
        
        with urllib.request.urlopen(req_put) as response:
            print(f"Successfully uploaded {file_path_in_repo} to GitHub! Status: {response.status}")
            return True
    except urllib.error.HTTPError as e:
        try:
            response_body = json.loads(e.read().decode('utf-8'))
            detail = response_body.get('message', str(e))
        except Exception:
            detail = str(e)
        raise GitHubUploadError(
            f'GitHub ปฏิเสธการบันทึก {repo_path}/{file_path_in_repo} '
            f'(HTTP {e.code}: {detail})'
        ) from e
    except Exception as e:
        raise GitHubUploadError(
            f'เชื่อมต่อ GitHub เพื่อบันทึก {repo_path}/{file_path_in_repo} ไม่สำเร็จ: {e}'
        ) from e


def refresh_data_from_github():
    """Restore the latest vocabulary when an ephemeral Render instance starts."""
    pat = os.environ.get('GITHUB_PAT', '').strip()
    encoded_path = urllib.parse.quote(GITHUB_DATA_PATH.strip('/'), safe='/')
    encoded_branch = urllib.parse.quote(GITHUB_BRANCH, safe='')
    api_url = (
        f'https://api.github.com/repos/{GITHUB_DATA_REPO}/contents/'
        f'{encoded_path}?ref={encoded_branch}'
    )

    try:
        with urllib.request.urlopen(_github_request(api_url, pat), timeout=20) as response:
            response_data = json.loads(response.read().decode('utf-8'))

        encoded_content = response_data.get('content', '').replace('\n', '')
        if not encoded_content:
            raise ValueError('GitHub response does not contain vocabulary data')

        file_content = base64.b64decode(encoded_content)
        json.loads(file_content.decode('utf-8'))

        temp_file = f'{DATA_FILE}.{os.getpid()}.tmp'
        with open(temp_file, 'wb') as handle:
            handle.write(file_content)
        os.replace(temp_file, DATA_FILE)
        print(f'Loaded latest vocabulary from GitHub: {GITHUB_DATA_REPO}/{GITHUB_DATA_PATH}')
        return True
    except Exception as error:
        print(f'Could not refresh vocabulary from GitHub; using bundled data: {error}')
        return False


sync_on_startup = os.environ.get(
    'GITHUB_SYNC_ON_STARTUP', os.environ.get('RENDER', '')
).strip().lower() in {'1', 'true', 'yes'}
if sync_on_startup:
    refresh_data_from_github()

git_lock = threading.Lock()

last_sync_status = {
    "status": "idle",
    "message": "ยังไม่มีการเริ่มอัปโหลดสำรองข้อมูล",
    "timestamp": 0
}

def push_changes_to_github(local_image_path=None):
    global last_sync_status
    with git_lock:
        try:
            last_sync_status['status'] = 'syncing'
            last_sync_status['message'] = 'กำลังส่งข้อมูลรูปภาพและไฟล์ไปที่ GitHub...'
            last_sync_status['timestamp'] = int(time.time())

            pat = os.environ.get('GITHUB_PAT', '').strip()
            if not pat:
                raise GitHubUploadError(
                    'ไม่พบ GITHUB_PAT ใน Environment Variables ของ Render; '
                    'ยังไม่ได้บันทึกข้อมูลแบบถาวร'
                )
            image_pat = os.environ.get('GITHUB_IMAGE_PAT', '').strip() or pat

            if local_image_path and os.path.exists(local_image_path):
                filename = os.path.basename(local_image_path)
                print(f'Uploading image {filename} to GitHub repo {GITHUB_IMAGE_REPO}...')
                upload_file_to_github(
                    repo_path=GITHUB_IMAGE_REPO,
                    file_path_in_repo=filename,
                    local_file_path=local_image_path,
                    pat=image_pat,
                    message=f'upload image {filename}'
                )

            print('Uploading vocabulary.json to GitHub...')
            upload_file_to_github(
                repo_path=GITHUB_DATA_REPO,
                file_path_in_repo=GITHUB_DATA_PATH,
                local_file_path=DATA_FILE,
                pat=pat,
                message='admin: update vocabulary.json'
            )

            print('GitHub API sync completed!')
            last_sync_status['status'] = 'success'
            last_sync_status['message'] = 'สำรองและบันทึกข้อมูลรูปภาพบน GitHub เรียบร้อยแล้ว (ถาวร)'
            return True, last_sync_status['message']
        except Exception as e:
            err_msg = f'บันทึกไป GitHub ไม่สำเร็จ: {e}'
            print(err_msg)
            last_sync_status['status'] = 'error'
            last_sync_status['message'] = err_msg
            return False, err_msg

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
    """Test token validity and actual write access to both repositories."""
    pat = os.environ.get('GITHUB_PAT', '').strip()
    if not pat:
        return jsonify({'ok': False, 'error': 'ไม่พบ GITHUB_PAT ใน Environment Variables ของ Render'})

    image_pat = os.environ.get('GITHUB_IMAGE_PAT', '').strip() or pat

    def get_repo(repo_path, token):
        url = f'https://api.github.com/repos/{repo_path}'
        with urllib.request.urlopen(_github_request(url, token)) as response:
            return json.loads(response.read().decode('utf-8'))

    try:
        with urllib.request.urlopen(_github_request('https://api.github.com/user', pat)) as response:
            user_data = json.loads(response.read().decode('utf-8'))
            username = user_data.get('login', 'unknown')

        data_repo = get_repo(GITHUB_DATA_REPO, pat)
        image_repo = get_repo(GITHUB_IMAGE_REPO, image_pat)
        missing_write = []
        if not data_repo.get('permissions', {}).get('push', False):
            missing_write.append(GITHUB_DATA_REPO)
        if not image_repo.get('permissions', {}).get('push', False):
            missing_write.append(GITHUB_IMAGE_REPO)
        if missing_write:
            return jsonify({
                'ok': False,
                'error': (
                    'Token อ่าน repo ได้ แต่ไม่มีสิทธิ์เขียน Contents: '
                    + ', '.join(missing_write)
                )
            })
        return jsonify({
            'ok': True,
            'message': f'เชื่อมต่อสำเร็จในชื่อ {username} และเขียนได้ทั้ง 2 repositories'
        })
    except urllib.error.HTTPError as e:
        return jsonify({'ok': False, 'error': f'Token หรือสิทธิ์ repository ไม่ถูกต้อง: HTTP {e.code}'})
    except Exception as ex:
        return jsonify({'ok': False, 'error': f'เกิดข้อผิดพลาด: {ex}'})

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
            
        synced, sync_message = push_changes_to_github()
        if not synced:
            return jsonify({'error': sync_message}), 502
            
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
            filename_orig = secure_filename(uploaded_file.filename) or 'image'
            filename = f'uploaded_{time.time_ns()}_{filename_orig}'
            
            images_dir = os.path.join(BASE_DIR, 'static', 'images')
            os.makedirs(images_dir, exist_ok=True)
            save_path = os.path.join(images_dir, filename)
            
            uploaded_file.save(save_path)
            raw_filename = urllib.parse.quote(filename)
            item['img'] = (
                f'https://raw.githubusercontent.com/{GITHUB_IMAGE_REPO}/'
                f'{GITHUB_BRANCH}/{raw_filename}'
            )
        elif img_url:
            item['img'] = img_url
            
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            
        synced, sync_message = push_changes_to_github(local_image_path=save_path)
        if not synced:
            return jsonify({'error': sync_message}), 502
            
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
