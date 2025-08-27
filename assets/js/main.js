// 主題相關功能
function initTheme() {
    // 檢查本地存儲中的主題設置
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // 設置文檔屬性
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // 更新圖標
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // 更新文檔屬性
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // 保存到本地存儲
    localStorage.setItem('theme', newTheme);
    
    // 更新圖標
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = theme === 'dark' ? 'ri-moon-line' : 'ri-sun-line';
    }
}

// 頁面加載和導航
document.addEventListener('DOMContentLoaded', function() {
    // 初始化主題
    initTheme();

    // 初始化導航切換功能
    function initNavToggle() {
        // 檢查是否已存在 nav-toggle
        if (document.querySelector('.nav-toggle')) {
            return;
        }

        const navToggle = document.createElement('button');
        navToggle.className = 'nav-toggle';
        navToggle.setAttribute('aria-label', '切換導航');
        navToggle.setAttribute('type', 'button');
    
        // 使用 Remix Icon 的箭頭圖標
        navToggle.innerHTML = '<i class="ri-arrow-down-s-line"></i>';

        const navContainer = document.querySelector('.nav-container');
        const navLeft = document.querySelector('.nav-left');
    
        // 創建新的頂部容器
        const navTop = document.createElement('div');
        navTop.className = 'nav-top';
    
        // 重組導航結構
        if (navContainer && navLeft) {
            // 移除可能已存在的 navTop
            const existingNavTop = navContainer.querySelector('.nav-top');
            if (existingNavTop) {
                existingNavTop.remove();
            }

            navTop.appendChild(navLeft.cloneNode(true));
            navTop.appendChild(navToggle);
            navContainer.insertBefore(navTop, navContainer.firstChild);
            navLeft.remove();

            const navLinks = document.querySelector('.nav-links');
            if (navLinks) {
                // 移除可能存在的類別
                navLinks.classList.remove('show');
                navToggle.classList.remove('active');

                // 設置初始狀態 - 預設展開
                navLinks.classList.add('show');
                navToggle.classList.add('active');

                // 添加點擊事件
                navToggle.addEventListener('click', () => {
                    navLinks.classList.toggle('show');
                    navToggle.classList.toggle('active');
                });
            }
        }
    }

    // 如果是移動設備，初始化導航切換
    if (window.innerWidth <= 768) {
        initNavToggle();
    }

    // 監聽視窗大小變化
    window.addEventListener('resize', debounce(() => {
        const navToggle = document.querySelector('.nav-toggle');
        if (window.innerWidth <= 768) {
            if (!navToggle) {
                initNavToggle();
            }
        } else {
            const navTop = document.querySelector('.nav-top');
            if (navTop) {
                const navContainer = document.querySelector('.nav-container');
                const navLeft = navTop.querySelector('.nav-left');
                if (navContainer && navLeft) {
                    navContainer.insertBefore(navLeft, navContainer.firstChild);
                    navTop.remove();
                }
            }
        }
    }, 250));

    // 監聽系統主題變化
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addListener((e) => {
            if (!localStorage.getItem('theme')) {
                const theme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', theme);
                updateThemeIcon(theme);
            }
        });
    }

    // 獲取當前頁面的相對路徑
    const currentPath = window.location.pathname;
    let headerPath, footerPath;
    let prefix = '';

    // 根據當前頁面路徑設置相對路徑
    if (currentPath.includes('/entries/')) {
        // 筆記內容頁面
        headerPath = '../../shared/header.html';
        footerPath = '../../shared/footer.html';
        prefix = '../../';
    } else if (currentPath.includes('/notes/') || 
               currentPath.includes('/papers/') || 
               currentPath.includes('/dashboard/') ||
               currentPath.includes('/projects/')) {
        // 各個分區的主頁
        headerPath = '../shared/header.html';
        footerPath = '../shared/footer.html';
        prefix = '../';
    }

    // 載入頁首
    fetch(headerPath)
        .then(response => response.text())
        .then(html => {
            // 修改導航連結
            const modifiedHtml = html.replace(/href="(.*?)"/g, (match, p1) => {
                if (!p1.startsWith('http')) {
                    return `href="${prefix}${p1}"`;
                }
                return match;
            });
            document.getElementById('header-placeholder').innerHTML = modifiedHtml;
            setActiveNavItem();
            
            // 重新初始化主題圖標
            updateThemeIcon(document.documentElement.getAttribute('data-theme'));

            // 如果是移動設備，初始化導航切換
            if (window.innerWidth <= 768) {
                initNavToggle();
            }
        })
        .catch(err => console.error('載入頁首失敗:', err));

    // 載入頁尾
    fetch(footerPath)
        .then(response => response.text())
        .then(html => {
            const modifiedHtml = html.replace(/href="(.*?)"/g, (match, p1) => {
                if (!p1.startsWith('http')) {
                    return `href="${prefix}${p1}"`;
                }
                return match;
            });
            document.getElementById('footer-placeholder').innerHTML = modifiedHtml;
        })
        .catch(err => console.error('載入頁尾失敗:', err));
});

// 設置當前頁面的導航項目為活動狀態
function setActiveNavItem() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const section = item.dataset.section;
        if (currentPath.includes(`/${section}/`)) {
            item.classList.add('active');
        }
    });
}

// 防抖動函數
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 日期格式化函數
function formatDate(dateString) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('zh-TW', options);
}

// 複製文字到剪貼簿
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('已複製到剪貼簿', 'success');
        return true;
    } catch (err) {
        console.error('複製失敗:', err);
        showNotification('複製失敗', 'error');
        return false;
    }
}

// 顯示通知
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // 添加自定義樣式
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.padding = '12px 24px';
    notification.style.borderRadius = '8px';
    notification.style.backgroundColor = type === 'success' ? 'var(--success)' : 'var(--error)';
    notification.style.color = 'white';
    notification.style.boxShadow = 'var(--shadow-lg)';
    notification.style.zIndex = '9999';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease-in-out';
    
    document.body.appendChild(notification);
    
    // 淡入效果
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
    });
    
    // 3秒後淡出並移除
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// 載入 JSON 數據
async function loadJsonData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('載入數據失敗:', error);
        showNotification('載入數據失敗', 'error');
        return null;
    }
}

// 添加動畫效果
function addFadeInAnimation(element) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    
    requestAnimationFrame(() => {
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    });
}

// 搜索過濾器
function setupSearch(items, filterCallback) {
    const searchBox = document.querySelector('.search-box');
    if (!searchBox) return;

    const debouncedSearch = debounce((e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterCallback(searchTerm, items);
    }, 300);

    searchBox.addEventListener('input', debouncedSearch);
}

// 處理圖片載入錯誤
function handleImageError(img) {
    img.onerror = null; // 防止無限遞迴
    img.src = '../assets/images/placeholder.png'; // 設置預設圖片
    img.alt = '圖片載入失敗';
}

// 檢查路徑是否有效
function isValidPath(path) {
    return path && typeof path === 'string' && path.length > 0;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 生成唯一ID
function generateUniqueId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// 驗證URL格式
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// 深度合併對象
function deepMerge(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    return { ...target, ...source };
}

// 處理API請求錯誤
function handleApiError(error) {
    console.error('API錯誤:', error);
    showNotification(
        error.response?.data?.message || '操作失敗，請稍後重試',
        'error'
    );
    return null;
}

// 本地存儲包裝器
const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('存儲數據失敗:', e);
        }
    },
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('讀取數據失敗:', e);
            return null;
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('刪除數據失敗:', e);
        }
    }
};

// 檢查設備類型
const device = {
    isMobile: () => window.innerWidth <= 768,
    isTablet: () => window.innerWidth > 768 && window.innerWidth <= 1024,
    isDesktop: () => window.innerWidth > 1024
};