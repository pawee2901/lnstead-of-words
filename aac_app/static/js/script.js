let currentLang = 'th';
let vocabularyData = {};
let historyStack = [];
let isPlaying = false;
let hasSelectedLanguage = false;
let lastSpokenSummary = '';
let currentAudio = null;

const uiText = {
    th: {
        appName: 'พูดแทนใจ',
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
        appName: 'Suara Hati',
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

const tones = ['tone-gold', 'tone-teal', 'tone-rose', 'tone-mint', 'tone-peach', 'tone-lilac', 'tone-sky', 'tone-cream'];

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
    return uiText[currentLang][key];
}

function setHeader(title, subtitle) {
    document.getElementById('screen-title').innerText = title;
    document.getElementById('screen-subtitle').innerText = subtitle;
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

    if (historyStack[historyStack.length - 1] !== viewFn) {
        historyStack.push(viewFn);
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

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    isPlaying = true;
    const audio = new Audio(`/speak?text=${encodeURIComponent(text)}&lang=${currentLang}&v=${Date.now()}`);
    currentAudio = audio;
    audio.onended = () => {
        isPlaying = false;
        if (currentAudio === audio) {
            currentAudio = null;
        }
    };
    audio.onerror = () => {
        isPlaying = false;
        currentAudio = null;
        console.error('Audio play failed');
        playBrowserSpeech(text);
    };
    audio.play().catch(error => {
        isPlaying = false;
        currentAudio = null;
        console.error('Audio play blocked/failed:', error);
        playBrowserSpeech(text);
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

function mediaMarkup(img, icon, label) {
    if (img) {
        const mediaType = isPhotoImage(img) ? 'photo' : 'icon-image';
        return `<span class="card-image-wrap ${mediaType}"><img class="card-image" src="${img}" alt="${label}" loading="lazy"></span>`;
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

    const content = setContent(hero(t('categories'), t('homeHero'), t('homeCopy')));
    content.appendChild(renderGrid([
        { th: 'ฉันรู้สึก', ms: 'Saya rasa', icon: '♡', tone: 'tone-rose', subTh: 'อารมณ์ / ความรู้สึก', subMs: 'Gejala / Perasaan', onClick: () => renderFeelingsCategory() },
        { th: 'ฉันต้องการ', ms: 'Saya nak', icon: '＋', tone: 'tone-teal', subTh: 'อาหาร / คน / สถานที่', subMs: 'Makanan / Orang / Tempat', onClick: () => renderNeedsCategory() },
        { th: 'เขียนข้อความ', ms: 'Tulis mesej', icon: '✎', tone: 'tone-gold', subTh: 'พิมพ์แล้วอ่านเสียง', subMs: 'Taip dan main suara', onClick: () => renderTextInput() }
    ]));
}

function renderFeelingsCategory(replace = false) {
    updateNav(true, true, false);
    setTab('feel');
    setHeader(t('feel'), currentLang === 'th' ? 'เลือกหมวดความรู้สึกหรืออาการ' : 'Pilih kategori perasaan atau gejala');
    remember(renderFeelingsCategory, replace);

    const content = setContent(hero(t('categories'), t('feel'), currentLang === 'th' ? 'แตะหมวด แล้วเลือกคำที่ต้องการพูด' : 'Tekan kategori, kemudian pilih perkataan', 'rose'));
    content.appendChild(renderGrid([
        { th: 'อาการเจ็บป่วย', ms: 'Gejala penyakit', icon: '✚', tone: 'tone-rose', onClick: () => renderItems('feelings', 'symptoms') },
        { th: 'อารมณ์ความรู้สึก', ms: 'Perasaan', icon: '♡', tone: 'tone-lilac', onClick: () => renderItems('feelings', 'emotions') }
    ]));
}

function renderNeedsCategory(replace = false) {
    updateNav(true, true, false);
    setTab('need');
    setHeader(t('need'), currentLang === 'th' ? 'เลือกสิ่งที่ต้องการสื่อสาร' : 'Pilih perkara yang diperlukan');
    remember(renderNeedsCategory, replace);

    const content = setContent(hero(t('categories'), t('need'), currentLang === 'th' ? 'จัดหมวดใหญ่ ปุ่มใหญ่ เห็นชัด' : 'Kategori jelas dengan butang besar', 'teal'));
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

    const content = setContent(hero(t('words'), currentLang === 'th' ? titleTh : titleMs, currentLang === 'th' ? 'แตะปุ่มเพื่อให้ระบบอ่านออกเสียง' : 'Tekan butang untuk mainkan suara'));
    const grid = renderGrid(items.map((item, index) => ({
        ...defaultPhrase(group, item),
        th: item.th,
        ms: item.ms,
        img: item.img,
        icon: item.icon || icon,
        tone: item.tone || tones[index % tones.length],
        subTh: item.subTh,
        subMs: item.subMs,
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
        onClick: item.children ? () => renderChildItems(group, categoryId, item) : null
    })));
    content.appendChild(grid);
}

function renderTextInput(replace = false) {
    updateNav(true, true, false);
    setTab('write');
    setHeader(t('write'), currentLang === 'th' ? 'พิมพ์ข้อความแล้วเปิดเสียง' : 'Taip mesej dan main suara');
    remember(renderTextInput, replace);

    const content = setContent(hero(t('write'), currentLang === 'th' ? 'พิมพ์ประโยคของคุณ' : 'Taip ayat anda', currentLang === 'th' ? 'เหมาะสำหรับคำที่ไม่มีในปุ่มลัด' : 'Untuk perkataan yang tiada dalam butang', 'teal'));
    const container = document.createElement('section');
    container.className = 'text-input-container';

    const textarea = document.createElement('textarea');
    textarea.className = 'text-area';
    textarea.placeholder = t('placeholder');

    const actions = document.createElement('div');
    actions.className = 'action-buttons';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'play-btn';
    playBtn.innerText = t('play');
    playBtn.onclick = () => {
        const text = textarea.value.trim();
        if (!text) {
            textarea.focus();
            updateSpokenSummary(currentLang === 'th' ? 'กรุณาพิมพ์ข้อความก่อนเปิดเสียง' : 'Sila taip mesej dahulu');
            return;
        }

        lastSpokenSummary = text;
        updateSpokenSummary(text);
        playAudio(text);
    };

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'clear-btn';
    clearBtn.innerText = t('clear');
    clearBtn.onclick = () => {
        textarea.value = '';
        textarea.focus();
    };

    actions.append(playBtn, clearBtn);
    container.append(textarea, actions);
    content.appendChild(container);
}

