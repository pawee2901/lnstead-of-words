let currentLang = 'th';
let vocabularyData = {};
let historyStack = [];
let isPlaying = false;
let hasSelectedLanguage = false;
let lastSpokenSummary = '';
let currentAudio = null;

const uiText = {
    th: {
        appName: 'Thai-Malayu For Aphasia',
        appSub: 'ไทย - มลายู สำหรับผู้สูงอายุ',
        homeHero: 'แตะภาพเพื่อพูดแทนใจ',
        homeCopy: 'ปุ่มใหญ่ สีชัด เสียงอ่านไทยและมลายู',
        feel: 'ฉันรู้สึก',
        need: 'ฉันต้องการ',
        write: 'เขียนข้อความ',
        categories: 'หมวดหมู่',
        words: 'เลือกคำที่ต้องการพูด',
        loading: 'กำลังโหลดคำศัพท์...',
        error: 'โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบระบบ',
        placeholder: 'พิมพ์ข้อความที่นี่...',
        play: 'เปิดเสียง',
        clear: 'ล้าง'
    },
    ms: {
        appName: 'Thai-Malayu For Aphasia',
        appSub: 'Thai - Melayu untuk warga emas',
        homeHero: 'Tekan gambar untuk bercakap',
        homeCopy: 'Butang besar, warna jelas, suara Thai dan Melayu',
        feel: 'Saya rasa',
        need: 'Saya nak',
        write: 'Tulis mesej',
        categories: 'Kategori',
        words: 'Pilih perkataan',
        loading: 'Memuatkan perkataan...',
        error: 'Data tidak dapat dimuatkan',
        placeholder: 'Taip mesej di sini...',
        play: 'Main suara',
        clear: 'Padam'
    }
};

const tones = [
    'tone-rose',
    'tone-gold',
    'tone-peach',
    'tone-lilac',
    'tone-mint',
    'tone-sky',
    'tone-coral',
    'tone-lemon',
    'tone-sage',
    'tone-blush',
    'tone-apricot',
    'tone-cream'
];

document.addEventListener('DOMContentLoaded', () => {
    renderLanguageSelect();

    fetch('/words')
        .then(res => res.json())
        .then(data => {
            vocabularyData = data;
            if (hasSelectedLanguage) {
                renderHome(true);
            }
        })
        .catch(err => {
            console.error('Error loading vocabulary:', err);
            if (hasSelectedLanguage) {
                setContent(`<div class="error-state">${uiText[currentLang].error}</div>`);
            }
        });
});

function t(key) {
    if (key === 'appName') {
        if (currentLang === 'th' && vocabularyData.site_title_th) return vocabularyData.site_title_th;
        if (currentLang === 'ms' && vocabularyData.site_title_ms) return vocabularyData.site_title_ms;
    }
    if (key === 'appSub') {
        if (currentLang === 'th' && vocabularyData.site_subtitle_th) return vocabularyData.site_subtitle_th;
        if (currentLang === 'ms' && vocabularyData.site_subtitle_ms) return vocabularyData.site_subtitle_ms;
    }
    return uiText[currentLang][key];
}

function setHeader(title, subtitle) {
    document.getElementById('screen-title').innerText = title;
    document.getElementById('screen-subtitle').innerText = subtitle;
    // Update browser tab title
    document.title = t('appName');
}

function setContent(markup = '') {
    const content = document.getElementById('app-content');
    content.innerHTML = markup;
    content.scrollTop = 0;
    return content;
}

function setTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const active = document.getElementById(`tab-${tab}`);
    if (active) active.classList.add('active');
}

function setLang(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    const currentView = historyStack[historyStack.length - 1] || renderHome;
    currentView(true);
}

function updateNav(showBack, showHome, showLang) {
    document.getElementById('back-btn').classList.toggle('hidden', !showBack);
    document.getElementById('home-btn').classList.toggle('hidden', !showHome);
    document.getElementById('lang-switcher').classList.toggle('hidden', !showLang);
}

function setAppChrome(hidden) {
    document.querySelector('.phone-shell').classList.toggle('language-mode', hidden);
}

function remember(viewFn, replace = false) {
    if (replace && historyStack.length) {
        historyStack[historyStack.length - 1] = viewFn;
        return;
    }

    const last = historyStack[historyStack.length - 1];
    // Check if we are trying to push the same view to prevent stack overflow/leak
    if (last && last.toString() === viewFn.toString()) {
        return;
    }

    historyStack.push(viewFn);
    
    // Limit history stack size to 50 items to prevent memory issues
    if (historyStack.length > 50) {
        historyStack.shift();
    }
}

function goBack() {
    if (historyStack.length > 1) {
        historyStack.pop();
        const prevView = historyStack.pop();
        prevView();
        return;
    }

    goHome();
}

function goHome() {
    historyStack = [];
    renderHome(true);
}

function chooseLanguage(lang) {
    currentLang = lang;
    hasSelectedLanguage = true;
    
    // Unlock audio for mobile browsers
    const silent = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    silent.play().catch(() => {});

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    renderHome(true);
}

function renderLanguageSelect() {
    setAppChrome(true);
    updateNav(false, false, false);
    setTab('');
    historyStack = [];

    const content = setContent(`
        <section class="language-select">
            <h1>เลือกภาษา / Pilih Bahasa</h1>
            <p>กรุณาเลือกภาษาที่ต้องการใช้งาน</p>
            <div class="language-choice-grid">
                <button type="button" class="language-choice-btn primary" onclick="chooseLanguage('th')">
                    <span>ภาษาไทย</span>
                    <small>Thai</small>
                </button>
                <button type="button" class="language-choice-btn" onclick="chooseLanguage('ms')">
                    <span>Bahasa Melayu</span>
                    <small>Malay</small>
                </button>
            </div>
        </section>
    `);
    content.removeAttribute('tabindex');
}

function playAudio(text) {
    if (!text) return;

    console.log('Attempting to play audio:', text);

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    isPlaying = true;
    
    // Try server-side TTS first
    const audio = new Audio(`/speak?text=${encodeURIComponent(text)}&lang=${currentLang}&v=${Date.now()}`);
    currentAudio = audio;
    
    let didStart = false;
    let didFallback = false;

    const fallbackToBrowser = () => {
        if (didFallback || didStart) return;
        didFallback = true;
        console.warn('Server TTS slow or failed, falling back to Browser TTS');
        if (currentAudio === audio) {
            audio.pause();
            currentAudio = null;
        }
        isPlaying = false;
        playBrowserSpeech(text);
    };

    // If server doesn't respond in 1.5s, fallback to browser TTS for better UX
    const fallbackTimer = window.setTimeout(fallbackToBrowser, 1500);

    audio.onplaying = () => {
        didStart = true;
        window.clearTimeout(fallbackTimer);
        console.log('Server audio playing');
    };
    
    audio.onended = () => {
        window.clearTimeout(fallbackTimer);
        isPlaying = false;
        if (currentAudio === audio) currentAudio = null;
    };
    
    audio.onerror = (err) => {
        console.error('Server audio error:', err);
        window.clearTimeout(fallbackTimer);
        fallbackToBrowser();
    };

    audio.play().catch(error => {
        console.warn('Audio play blocked or failed:', error);
        window.clearTimeout(fallbackTimer);
        fallbackToBrowser();
    });
}

function playBrowserSpeech(text) {
    if (!text || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang === 'th' ? 'th-TH' : 'ms-MY';
    utterance.rate = 0.85;
    utterance.onend = () => { isPlaying = false; };
    utterance.onerror = () => { isPlaying = false; };
    isPlaying = true;
    window.speechSynthesis.speak(utterance);
}

function playEmergencyTone() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    const audioCtx = new AudioContextClass();
    const now = audioCtx.currentTime;
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.34, now + 0.04);
    masterGain.connect(audioCtx.destination);

    const playTone = (start, duration) => {
        const osc = audioCtx.createOscillator();
        const toneGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, start);
        toneGain.gain.setValueAtTime(0.0001, start);
        toneGain.gain.exponentialRampToValueAtTime(1, start + 0.02);
        toneGain.gain.setValueAtTime(1, start + duration - 0.03);
        toneGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(toneGain);
        toneGain.connect(masterGain);
        osc.start(start);
        osc.stop(start + duration + 0.02);
    };

    const shortTone = 0.18;
    const longTone = 0.54;
    const gap = 0.14;
    const letterGap = 0.32;
    let cursor = now + 0.08;

    const playGroup = (durations) => {
        durations.forEach(duration => {
            playTone(cursor, duration);
            cursor += duration + gap;
        });
        cursor += letterGap;
    };

    playGroup([shortTone, shortTone, shortTone]);
    playGroup([longTone, longTone, longTone]);
    playGroup([shortTone, shortTone, shortTone]);

    masterGain.gain.setValueAtTime(0.34, cursor);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, cursor + 0.2);

    window.setTimeout(() => audioCtx.close().catch(() => {}), Math.ceil((cursor - now + 0.4) * 1000));
    return true;
}

function playSos() {
    const text = currentLang === 'th'
        ? 'สัญญาณฉุกเฉิน'
        : 'Isyarat kecemasan';
    lastSpokenSummary = text;
    updateSpokenSummary(text);
    if (!playEmergencyTone()) {
        playAudio(text);
    }
}

function updateSpokenSummary(text) {
    const content = document.getElementById('app-content');
    let summary = content.querySelector('.spoken-summary');

    if (!summary) {
        summary = document.createElement('button');
        summary.type = 'button';
        summary.className = 'spoken-summary';
        summary.onclick = () => playAudio(lastSpokenSummary);
        content.prepend(summary);
    }

    summary.innerText = text;
}

function hero(kicker, title, copy, tone = '') {
    return '';
}

function isPhotoImage(img) {
    return /\.(jpg|jpeg|png|webp)(\?|#|$)/i.test(img || '');
}

function getOptimizedImg(url) {
    if (!url) return '';
    if (url.includes('pexels.com')) {
        const cleanUrl = url.split('?')[0];
        // Reduced to 400px for better memory safety on all devices
        return `${cleanUrl}?auto=compress&cs=tinysrgb&w=400`;
    }
    return url;
}

function mediaMarkup(img, icon, label) {
    if (img) {
        const mediaType = isPhotoImage(img) ? 'photo' : 'icon-image';
        return `<span class="card-image-wrap ${mediaType}"><img class="card-image" src="${getOptimizedImg(img)}" alt="${label}" loading="lazy"></span>`;
    }

    return `<span class="card-icon-wrap" aria-hidden="true"><span class="card-icon">${icon}</span></span>`;
}

function createCard({ th, ms, img = '', icon = '●', tone = 'tone-gold', subTh = '', subMs = '', phraseTh = '', phraseMs = '', speak = true, onClick = null }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `card-btn ${tone}${isPhotoImage(img) ? ' photo-card' : ''}`;

    const label = currentLang === 'th' ? th : ms;
    const subLabel = currentLang === 'th' ? subTh : subMs;
    const spokenText = currentLang === 'th' ? (phraseTh || label) : (phraseMs || label);

    button.innerHTML = `
        ${mediaMarkup(img, icon, label)}
        <span class="card-text">${label}</span>
        ${subLabel ? `<span class="card-subtext">${subLabel}</span>` : ''}
    `;

    const image = button.querySelector('.card-image');
    if (image) {
        image.addEventListener('error', () => {
            const media = button.querySelector('.card-image-wrap');
            if (media) {
                media.outerHTML = mediaMarkup('', icon, label);
            }
        }, { once: true });
    }

    button.addEventListener('click', () => {
        if (speak) {
            lastSpokenSummary = spokenText;
            updateSpokenSummary(spokenText);
            playAudio(spokenText);
        }
        if (onClick) {
            window.setTimeout(onClick, 140);
        }
    });

    return button;
}

function renderGrid(items) {
    const grid = document.createElement('div');
    grid.className = 'menu-grid';
    items.forEach((item, index) => {
        grid.appendChild(createCard({
            ...item,
            tone: item.tone || tones[index % tones.length]
        }));
    });
    return grid;
}

function renderSummary() {
    if (!lastSpokenSummary) return '';
    return `<button type="button" class="spoken-summary" onclick="playAudio(lastSpokenSummary)">${lastSpokenSummary}</button>`;
}

function defaultPhrase(group, item) {
    const phraseTh = item.phraseTh || (group === 'feelings' ? `ฉันรู้สึก${item.th}` : `ฉันต้องการ${item.th}`);
    const msPrefix = group === 'feelings' ? 'Saya rasa' : 'Saya nak';
    const phraseMs = item.phraseMs || `${msPrefix} ${item.ms.toLowerCase()}`;
    return { phraseTh, phraseMs };
}

function renderHome(replace = false) {
    setAppChrome(false);
    updateNav(false, false, true);
    setTab('home');
    setHeader(t('appName'), t('appSub'));
    remember(renderHome, replace);

    const content = setContent(renderSummary() + hero(t('categories'), t('homeHero'), t('homeCopy')));
    content.appendChild(renderGrid([
        { th: 'ฉันรู้สึก', ms: 'Saya rasa', icon: '♡', tone: 'tone-rose', subTh: 'อารมณ์ / ความรู้สึก', subMs: 'Gejala / Perasaan', onClick: () => renderFeelingsCategory() },
        { th: 'ฉันต้องการ', ms: 'Saya nak', icon: '＋', tone: 'tone-teal', subTh: 'อาหาร / คน / สถานที่', subMs: 'Makanan / Orang / Tempat', onClick: () => renderNeedsCategory() },
        { th: 'เขียนข้อความ', ms: 'Tulis mesej', icon: '✎', tone: 'tone-gold', subTh: 'พิมพ์ / วาด', subMs: 'Taip / Lukis', onClick: () => renderTextInput() },
        { th: 'SOS', ms: 'SOS', icon: '!', tone: 'tone-sos', subTh: 'ขอความช่วยเหลือด่วน', subMs: 'Bantuan segera', speak: false, onClick: () => playSos() }
    ]));
}

function renderFeelingsCategory(replace = false) {
    updateNav(true, true, false);
    setTab('feel');
    setHeader(t('feel'), currentLang === 'th' ? 'เลือกหมวดความรู้สึกหรืออาการ' : 'Pilih kategori perasaan atau gejala');
    remember(renderFeelingsCategory, replace);

    const content = setContent(renderSummary() + hero(t('categories'), t('feel'), currentLang === 'th' ? 'แตะหมวด แล้วเลือกคำที่ต้องการพูด' : 'Tekan kategori, kemudian pilih perkataan', 'rose'));
    const categories = vocabularyData.feelings?.categories || [];
    content.appendChild(renderGrid(categories.map(category => ({
        th: category.th,
        ms: category.ms,
        img: category.img,
        icon: category.icon,
        tone: category.tone,
        onClick: () => renderItems('feelings', category.id)
    }))));
}

function renderNeedsCategory(replace = false) {
    updateNav(true, true, false);
    setTab('need');
    setHeader(t('need'), currentLang === 'th' ? 'เลือกสิ่งที่ต้องการสื่อสาร' : 'Pilih perkara yang diperlukan');
    remember(renderNeedsCategory, replace);

    const content = setContent(renderSummary() + hero(t('categories'), t('need'), currentLang === 'th' ? 'จัดหมวดใหญ่ ปุ่มใหญ่ เห็นชัด' : 'Kategori jelas dengan butang besar', 'teal'));
    const categories = vocabularyData.needs?.categories || [];
    content.appendChild(renderGrid(categories.map(category => ({
        th: category.th,
        ms: category.ms,
        img: category.img,
        icon: category.icon,
        tone: category.tone,
        phraseTh: defaultPhrase('needs', category).phraseTh,
        phraseMs: defaultPhrase('needs', category).phraseMs,
        onClick: () => renderItems('needs', category.id)
    }))));
}

function renderItems(group, categoryId, replace = false) {
    const category = vocabularyData[group]?.categories?.find(item => item.id === categoryId);
    const items = vocabularyData[group]?.[categoryId] || [];
    const titleTh = category?.th || '';
    const titleMs = category?.ms || '';
    const icon = category?.icon || '●';
    const view = () => renderItems(group, categoryId, true);

    updateNav(true, true, false);
    setTab(group === 'feelings' ? 'feel' : 'need');
    setHeader(currentLang === 'th' ? titleTh : titleMs, t('words'));
    remember(view, replace);

    const content = setContent(renderSummary() + hero(t('words'), currentLang === 'th' ? titleTh : titleMs, currentLang === 'th' ? 'แตะปุ่มเพื่อให้ระบบอ่านออกเสียง' : 'Tekan butang untuk mainkan suara'));
    const grid = renderGrid(items.map((item, index) => ({
        ...defaultPhrase(group, item),
        th: item.th,
        ms: item.ms,
        img: item.img,
        icon: item.icon || icon,
        tone: item.tone || tones[index % tones.length],
        subTh: item.subTh,
        subMs: item.subMs,
        speak: item.speak !== false,
        onClick: item.children ? () => renderChildItems(group, categoryId, item) : null
    })));
    content.appendChild(grid);
}

function renderChildItems(group, categoryId, parentItem, replace = false) {
    const items = parentItem.children || [];
    const title = currentLang === 'th' ? parentItem.th : parentItem.ms;
    const icon = parentItem.icon || '●';
    const view = () => renderChildItems(group, categoryId, parentItem, true);

    updateNav(true, true, false);
    setTab(group === 'feelings' ? 'feel' : 'need');
    setHeader(title, t('words'));
    remember(view, replace);

    const content = setContent(renderSummary());
    const grid = renderGrid(items.map((item, index) => ({
        ...defaultPhrase(group, item),
        th: item.th,
        ms: item.ms,
        img: item.img,
        icon: item.icon || icon,
        tone: item.tone || parentItem.tone || tones[index % tones.length],
        subTh: item.subTh,
        subMs: item.subMs,
        speak: item.speak !== false,
        onClick: item.children ? () => renderChildItems(group, categoryId, item) : null
    })));
    content.appendChild(grid);
}

function setupDrawingBoard(canvas) {
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let hasDrawing = false;

    const resizeCanvas = () => {
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const snapshot = hasDrawing ? canvas.toDataURL('image/png') : '';
        canvas.width = Math.max(1, Math.floor(rect.width * ratio));
        canvas.height = Math.max(1, Math.floor(rect.height * ratio));
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 9;
        ctx.strokeStyle = '#111111';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);

        if (snapshot) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
            img.src = snapshot;
        }
    };

    const point = (event) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    };

    const start = (event) => {
        event.preventDefault();
        drawing = true;
        hasDrawing = true;
        const p = point(event);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        canvas.setPointerCapture?.(event.pointerId);
    };

    const move = (event) => {
        if (!drawing) return;
        event.preventDefault();
        const p = point(event);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    };

    const stop = (event) => {
        if (!drawing) return;
        event.preventDefault();
        drawing = false;
        ctx.closePath();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('pointerleave', stop);

    return {
        clear() {
            const rect = canvas.getBoundingClientRect();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, rect.width, rect.height);
            hasDrawing = false;
        },
        hasDrawing() {
            return hasDrawing;
        }
    };
}

function getWritePageSpeechText(textarea) {
    const text = textarea.value.trim();
    if (text) return text;

    return '';
}

function renderTextInput(replace = false) {
    updateNav(true, true, false);
    setTab('write');
    setHeader(t('write'), currentLang === 'th' ? 'พิมพ์หรือวาดเพื่อสื่อสาร' : 'Taip atau lukis');
    remember(renderTextInput, replace);

    const content = setContent(hero(t('write'), currentLang === 'th' ? 'สื่อสารด้วยข้อความหรือภาพวาด' : 'Berkomunikasi dengan teks atau lukisan', currentLang === 'th' ? 'เหมาะสำหรับผู้ที่พิมพ์ไม่ถนัด' : 'Sesuai untuk pengguna yang sukar menaip', 'teal'));
    const container = document.createElement('section');
    container.className = 'text-input-container';

    const writePanel = document.createElement('section');
    writePanel.className = 'write-panel';
    writePanel.innerHTML = `
        <div class="write-header">
            <h2>${currentLang === 'th' ? 'เขียนข้อความ' : 'Tulis mesej'}</h2>
            <div class="write-tools">
                <button type="button" class="small-tool-btn play-writing-btn" id="play-writing-btn">${currentLang === 'th' ? 'อ่านที่เขียน' : 'Baca tulisan'}</button>
                <button type="button" class="small-tool-btn" id="clear-writing-btn">${currentLang === 'th' ? 'ลบข้อความ' : 'Padam teks'}</button>
            </div>
        </div>
    `;

    const textarea = document.createElement('textarea');
    textarea.className = 'text-area';
    textarea.placeholder = t('placeholder');
    writePanel.appendChild(textarea);

    const drawPanel = document.createElement('section');
    drawPanel.className = 'draw-panel';
    drawPanel.innerHTML = `
        <div class="draw-header">
            <h2>${currentLang === 'th' ? 'วาดแทนคำพูด' : 'Lukis mesej'}</h2>
            <div class="draw-tools">
                <button type="button" class="small-tool-btn" id="clear-drawing-btn">${currentLang === 'th' ? 'ลบภาพวาด' : 'Padam lukisan'}</button>
            </div>
        </div>
        <canvas class="draw-canvas" id="message-drawing" aria-label="${currentLang === 'th' ? 'พื้นที่วาดภาพ' : 'Ruang melukis'}"></canvas>
    `;

    container.append(writePanel, drawPanel);
    content.appendChild(container);

    const drawing = setupDrawingBoard(container.querySelector('#message-drawing'));

    const speakWrittenText = () => {
        const spokenText = getWritePageSpeechText(textarea);
        if (!spokenText) {
            textarea.focus();
            updateSpokenSummary(currentLang === 'th' ? 'กรุณาเขียนข้อความก่อนเปิดเสียง' : 'Sila tulis mesej dahulu sebelum main suara');
            return;
        }

        lastSpokenSummary = spokenText;
        updateSpokenSummary(spokenText);
        playAudio(spokenText);
    };

    container.querySelector('#play-writing-btn').onclick = speakWrittenText;
    container.querySelector('#clear-writing-btn').onclick = () => {
        textarea.value = '';
        textarea.focus();
    };

    container.querySelector('#clear-drawing-btn').onclick = () => drawing.clear();
}

