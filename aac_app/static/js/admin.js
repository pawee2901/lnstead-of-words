let vocabularyData = {};
let pathStack = [
    { th: 'หน้าหลักแอดมิน', ms: 'Utama', type: 'home', path: '' }
];
let editingPath = '';
let editingItem = null;

document.addEventListener('DOMContentLoaded', () => {
    // Fetch current vocabulary
    fetch('/words')
        .then(res => res.json())
        .then(data => {
            vocabularyData = data;
            initSettingsForm();
            initSearch();
            initModal();
            renderCurrentLevel();
            
            // Sync status polling
            updateSyncStatus();
            setInterval(updateSyncStatus, 3000);
        })
        .catch(err => {
            console.error('Error loading vocabulary:', err);
            const grid = document.getElementById('vocab-grid');
            if (grid) {
                grid.innerHTML = '<div class="loading">ไม่สามารถโหลดข้อมูลคำศัพท์ได้ / Gagal memuatkan data</div>';
            }
        });
});

function updateSyncStatus() {
    fetch('/api/sync-status')
        .then(res => res.json())
        .then(data => {
            const banner = document.getElementById('sync-status-banner');
            const text = document.getElementById('sync-status-text');
            if (banner && text) {
                banner.className = 'sync-banner ' + 'status-' + data.status;
                text.innerText = data.message;
            }
        })
        .catch(err => {
            console.error('Error fetching sync status:', err);
        });
}

function initSettingsForm() {
    document.getElementById('site-title-th').value = vocabularyData.site_title_th || '';
    document.getElementById('site-subtitle-th').value = vocabularyData.site_subtitle_th || '';
    document.getElementById('site-title-ms').value = vocabularyData.site_title_ms || '';
    document.getElementById('site-subtitle-ms').value = vocabularyData.site_subtitle_ms || '';
    
    const settingsForm = document.getElementById('settings-form');
    const statusMsg = document.getElementById('settings-status');
    
    settingsForm.onsubmit = (e) => {
        e.preventDefault();
        
        statusMsg.innerText = 'กำลังบันทึก...';
        statusMsg.className = 'status-msg loading';
        
        const payload = {
            site_title_th: document.getElementById('site-title-th').value.trim(),
            site_subtitle_th: document.getElementById('site-subtitle-th').value.trim(),
            site_title_ms: document.getElementById('site-title-ms').value.trim(),
            site_subtitle_ms: document.getElementById('site-subtitle-ms').value.trim()
        };
        
        fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(resData => {
            if (resData.error) {
                statusMsg.innerText = 'เกิดข้อผิดพลาด: ' + resData.error;
                statusMsg.className = 'status-msg error';
            } else {
                statusMsg.innerText = 'บันทึกสำเร็จ';
                statusMsg.className = 'status-msg success';
                
                // Update local memory settings
                vocabularyData.site_title_th = payload.site_title_th;
                vocabularyData.site_subtitle_th = payload.site_subtitle_th;
                vocabularyData.site_title_ms = payload.site_title_ms;
                vocabularyData.site_subtitle_ms = payload.site_subtitle_ms;
                
                setTimeout(() => {
                    if (statusMsg.innerText === 'บันทึกสำเร็จ') statusMsg.innerText = '';
                }, 3000);
            }
        })
        .catch(err => {
            statusMsg.innerText = 'บันทึกไม่สำเร็จ';
            statusMsg.className = 'status-msg error';
            console.error(err);
        });
    };
}

function initSearch() {
    const searchInput = document.getElementById('vocab-search');
    searchInput.oninput = () => {
        const query = searchInput.value.trim().toLowerCase();
        const cards = document.querySelectorAll('.vocab-grid .vocab-card');
        
        cards.forEach(card => {
            const th = card.querySelector('.card-text').innerText.toLowerCase();
            const sub = card.querySelector('.card-subtext')?.innerText.toLowerCase() || '';
            if (th.includes(query) || sub.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    };
}

function initModal() {
    const modal = document.getElementById('edit-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const form = document.getElementById('edit-form');
    const fileInput = document.getElementById('modal-file-input');
    const urlInput = document.getElementById('modal-url-input');
    const statusMsg = document.getElementById('modal-status');
    
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    fileInput.onchange = () => {
        if (fileInput.files[0]) {
            urlInput.value = ''; // Clear URL if local file chosen
        }
        updateModalPreview();
    };
    
    urlInput.oninput = () => {
        if (urlInput.value.trim()) {
            fileInput.value = ''; // Clear file if URL specified
        }
        updateModalPreview();
    };
    
    form.onsubmit = (e) => {
        e.preventDefault();
        
        const thVal = document.getElementById('modal-th-input').value.trim();
        const msVal = document.getElementById('modal-ms-input').value.trim();
        const urlVal = urlInput.value.trim();
        
        if (!thVal) {
            statusMsg.innerText = 'กรุณากรอกชื่อภาษาไทย';
            statusMsg.className = 'status-msg error';
            return;
        }
        
        statusMsg.innerText = 'กำลังบันทึก...';
        statusMsg.className = 'status-msg loading';
        
        const formData = new FormData();
        formData.append('path', editingPath);
        formData.append('th', thVal);
        formData.append('ms', msVal);
        formData.append('img_url', urlVal);
        
        if (fileInput.files[0]) {
            formData.append('img_file', fileInput.files[0]);
        }
        
        fetch('/api/update-item', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(resData => {
            if (resData.error) {
                statusMsg.innerText = 'เกิดข้อผิดพลาด: ' + resData.error;
                statusMsg.className = 'status-msg error';
            } else {
                statusMsg.innerText = 'บันทึกสำเร็จ';
                statusMsg.className = 'status-msg success';
                
                // Update local memory object
                updateLocalItem(editingPath, thVal, msVal, resData.img);
                
                // Sync the stack if it was children item to keep it updated
                const current = pathStack[pathStack.length - 1];
                if (current.type === 'children' && current.path === editingPath.substring(0, editingPath.lastIndexOf('.'))) {
                    const idx = parseInt(editingPath.substring(editingPath.lastIndexOf('.') + 1));
                    if (current.data && current.data[idx]) {
                        current.data[idx].th = thVal;
                        current.data[idx].ms = msVal;
                        if (resData.img) current.data[idx].img = resData.img;
                    }
                }
                
                setTimeout(() => {
                    modal.style.display = 'none';
                    renderCurrentLevel();
                }, 1000);
            }
        })
        .catch(err => {
            statusMsg.innerText = 'บันทึกไม่สำเร็จ';
            statusMsg.className = 'status-msg error';
            console.error(err);
        });
    };
}

function openEditModal(path, item) {
    editingPath = path;
    editingItem = item;
    
    document.getElementById('modal-title').innerText = `แก้ไข: ${item.th}`;
    document.getElementById('modal-th-input').value = item.th;
    document.getElementById('modal-ms-input').value = item.ms || '';
    
    const urlInput = document.getElementById('modal-url-input');
    const fileInput = document.getElementById('modal-file-input');
    const statusMsg = document.getElementById('modal-status');
    
    fileInput.value = '';
    statusMsg.innerText = '';
    statusMsg.className = 'status-msg';
    
    if (item.img && !item.img.startsWith('/static/images/uploaded_') && item.img.startsWith('http')) {
        urlInput.value = item.img;
    } else {
        urlInput.value = '';
    }
    
    updateModalPreview();
    
    document.getElementById('edit-modal').style.display = 'flex';
    document.getElementById('modal-th-input').focus();
}

function updateModalPreview() {
    const previewContainer = document.getElementById('modal-img-container');
    const fileInput = document.getElementById('modal-file-input');
    const urlInput = document.getElementById('modal-url-input');
    
    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else if (urlInput.value.trim()) {
        const url = urlInput.value.trim();
        previewContainer.innerHTML = `<img src="${url}" alt="Preview" onerror="this.src=''; this.parentElement.innerHTML='<div class=&quot;fallback-icon&quot;>⚠</div>'">`;
    } else if (editingItem.img) {
        previewContainer.innerHTML = `<img src="${editingItem.img}" alt="Current">`;
    } else {
        previewContainer.innerHTML = `<div class="fallback-icon">${editingItem.icon || '●'}</div>`;
    }
}

function updateLocalItem(path, th, ms, img) {
    const parts = path.split('.');
    let curr = vocabularyData;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
            curr[part].th = th;
            curr[part].ms = ms;
            if (img) curr[part].img = img;
        } else {
            curr = curr[part];
        }
    }
}

function renderBreadcrumbs() {
    const nav = document.getElementById('breadcrumbs-nav');
    nav.innerHTML = '';
    
    pathStack.forEach((crumb, idx) => {
        const span = document.createElement('span');
        span.className = 'crumb';
        span.innerText = crumb.th;
        if (idx === pathStack.length - 1) {
            span.classList.add('active');
        } else {
            span.onclick = () => {
                pathStack = pathStack.slice(0, idx + 1);
                document.getElementById('vocab-search').value = '';
                renderCurrentLevel();
            };
        }
        nav.appendChild(span);
    });
}

function renderCard({ labelTh, labelMs, img, icon, tone, onClick, onEditClick }) {
    const card = document.createElement('div');
    card.className = `vocab-card ${tone || 'tone-gold'}`;
    
    let mediaMarkup = '';
    if (img) {
        mediaMarkup = `<div class="card-img-wrap"><img src="${img}" class="card-img" alt="${labelTh}"></div>`;
    } else {
        mediaMarkup = `<div class="card-img-wrap"><span class="card-icon">${icon || '●'}</span></div>`;
    }
    
    card.innerHTML = `
        ${mediaMarkup}
        <div class="card-text">${labelTh}</div>
        ${labelMs ? `<div class="card-subtext">${labelMs}</div>` : ''}
    `;
    
    card.onclick = (e) => {
        if (e.target.closest('.card-edit-btn')) return;
        if (onClick) onClick();
    };
    
    if (onEditClick) {
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'card-edit-btn';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'แก้ไขข้อมูลปุ่มนี้ / Edit this button';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            onEditClick();
        };
        card.appendChild(editBtn);
    }
    
    return card;
}

function renderCurrentLevel() {
    const current = pathStack[pathStack.length - 1];
    renderBreadcrumbs();
    
    const settingsPane = document.getElementById('pane-settings');
    const vocabPane = document.getElementById('pane-vocab');
    const vocabHeaderRow = document.getElementById('vocab-header-row');
    const grid = document.getElementById('vocab-grid');
    
    if (current.type === 'settings') {
        settingsPane.style.display = 'block';
        vocabPane.style.display = 'none';
        return;
    }
    
    settingsPane.style.display = 'none';
    vocabPane.style.display = 'block';
    
    // Toggle search bar/headers visibility
    if (current.type === 'home' || current.type === 'feelings' || current.type === 'needs' || current.type === 'needs-food-drink') {
        vocabHeaderRow.style.display = 'none';
    } else {
        vocabHeaderRow.style.display = 'flex';
        document.getElementById('current-section-title').innerText = current.th;
        
        const descMap = {
            'symptoms': 'หมวดหลักอาการเจ็บป่วย (สามารถคลิกเพื่อเลือกดูหัวข้อย่อยได้)',
            'emotions': 'หมวดหลักอารมณ์ความรู้สึก (สามารถคลิกดูหัวข้อย่อยได้)',
            'children': 'รายการคำศัพท์ย่อยในกลุ่มนี้',
            'entertainment': 'คำศัพท์กลุ่มความบันเทิง',
            'people': 'คำศัพท์กลุ่มพบบุคคล',
            'places': 'คำศัพท์กลุ่มสถานที่',
            'personal': 'คำศัพท์กลุ่มธุระส่วนตัว'
        };
        const descKey = current.type === 'children' ? 'children' : current.id;
        document.getElementById('current-section-desc').innerText = descMap[descKey] || 'คลิกที่การ์ดเพื่อแก้ไขข้อมูล';
    }
    
    grid.innerHTML = '';
    
    if (current.type === 'home') {
        grid.appendChild(renderCard({
            labelTh: '⚙ ตั้งค่าชื่อเว็บ',
            labelMs: 'Website Settings',
            icon: '⚙',
            tone: 'tone-gold',
            onClick: () => {
                pathStack.push({ th: '⚙ ตั้งค่าชื่อเว็บ', ms: 'Settings', type: 'settings' });
                renderCurrentLevel();
            }
        }));
        
        grid.appendChild(renderCard({
            labelTh: 'ฉันรู้สึก',
            labelMs: 'Saya Rasa',
            icon: '♡',
            tone: 'tone-rose',
            onClick: () => {
                pathStack.push({ th: 'ฉันรู้สึก', ms: 'Saya Rasa', type: 'feelings', path: 'feelings' });
                renderCurrentLevel();
            }
        }));
        
        grid.appendChild(renderCard({
            labelTh: 'ฉันต้องการ',
            labelMs: 'Saya Nak',
            icon: '＋',
            tone: 'tone-teal',
            onClick: () => {
                pathStack.push({ th: 'ฉันต้องการ', ms: 'Saya Nak', type: 'needs', path: 'needs' });
                renderCurrentLevel();
            }
        }));
    } 
    else if (current.type === 'feelings') {
        const categories = vocabularyData.feelings?.categories || [];
        categories.forEach((cat, idx) => {
            grid.appendChild(renderCard({
                labelTh: cat.th,
                labelMs: cat.ms,
                img: cat.img,
                icon: cat.icon || '✚',
                tone: cat.tone || 'tone-rose',
                onClick: () => {
                    pathStack.push({
                        th: cat.th,
                        ms: cat.ms,
                        type: 'category-feelings',
                        id: cat.id,
                        path: `feelings.categories.${idx}`
                    });
                    renderCurrentLevel();
                },
                onEditClick: () => {
                    openEditModal(`feelings.categories.${idx}`, cat);
                }
            }));
        });
    } 
    else if (current.type === 'category-feelings') {
        const items = vocabularyData.feelings?.[current.id] || [];
        items.forEach((item, idx) => {
            const hasChildren = !!item.children;
            const itemPath = `feelings.${current.id}.${idx}`;
            
            grid.appendChild(renderCard({
                labelTh: item.th,
                labelMs: item.ms,
                img: item.img,
                icon: item.icon || '●',
                tone: item.tone || 'tone-rose',
                onClick: () => {
                    if (hasChildren) {
                        pathStack.push({
                            th: item.th,
                            ms: item.ms,
                            type: 'children',
                            path: `${itemPath}.children`,
                            parentPath: itemPath,
                            data: item.children
                        });
                        renderCurrentLevel();
                    } else {
                        openEditModal(itemPath, item);
                    }
                },
                onEditClick: hasChildren ? () => {
                    openEditModal(itemPath, item);
                } : null
            }));
        });
    }
    else if (current.type === 'children') {
        const items = current.data || [];
        items.forEach((item, idx) => {
            const itemPath = `${current.path}.${idx}`;
            grid.appendChild(renderCard({
                labelTh: item.th,
                labelMs: item.ms,
                img: item.img,
                icon: item.icon || '●',
                tone: item.tone || 'tone-cream',
                onClick: () => {
                    openEditModal(itemPath, item);
                }
            }));
        });
    }
    else if (current.type === 'needs') {
        const categories = vocabularyData.needs?.categories || [];
        categories.forEach((cat, idx) => {
            const hasSub = cat.id === 'food_drink';
            grid.appendChild(renderCard({
                labelTh: cat.th,
                labelMs: cat.ms,
                img: cat.img,
                icon: cat.icon || '⌂',
                tone: cat.tone || 'tone-teal',
                onClick: () => {
                    if (hasSub) {
                        pathStack.push({
                            th: cat.th,
                            ms: cat.ms,
                            type: 'needs-food-drink',
                            path: 'needs.food_drink'
                        });
                    } else {
                        pathStack.push({
                            th: cat.th,
                            ms: cat.ms,
                            type: 'category-needs',
                            id: cat.id,
                            path: `needs.${cat.id}`
                        });
                    }
                    renderCurrentLevel();
                },
                onEditClick: () => {
                    openEditModal(`needs.categories.${idx}`, cat);
                }
            }));
        });
    }
    else if (current.type === 'needs-food-drink') {
        const subCategories = vocabularyData.needs?.food_drink || [];
        const subTones = {
            0: 'tone-gold',
            1: 'tone-sky',
            2: 'tone-mint',
            3: 'tone-peach'
        };
        
        subCategories.forEach((sub, idx) => {
            const itemPath = `needs.food_drink.${idx}`;
            grid.appendChild(renderCard({
                labelTh: sub.th,
                labelMs: sub.ms,
                img: sub.img,
                icon: sub.icon || '🍚',
                tone: subTones[idx] || 'tone-teal',
                onClick: () => {
                    pathStack.push({
                        th: sub.th,
                        ms: sub.ms,
                        type: 'children',
                        path: `${itemPath}.children`,
                        parentPath: itemPath,
                        data: sub.children
                    });
                    renderCurrentLevel();
                },
                onEditClick: () => {
                    openEditModal(itemPath, sub);
                }
            }));
        });
    }
    else if (current.type === 'category-needs') {
        const items = vocabularyData.needs?.[current.id] || [];
        items.forEach((item, idx) => {
            const itemPath = `needs.${current.id}.${idx}`;
            grid.appendChild(renderCard({
                labelTh: item.th,
                labelMs: item.ms,
                img: item.img,
                icon: item.icon || '●',
                tone: item.tone || 'tone-teal',
                onClick: () => {
                    openEditModal(itemPath, item);
                }
            }));
        });
    }
}
