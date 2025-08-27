/* =================================
   現代化儀表板 JavaScript
   研究資訊平台 - 網頁導航功能
   ================================= */

class ModernDashboard {
    constructor() {
        this.widgets = [];
        this.categories = [];
        this.currentView = 'grid';
        this.currentCategory = '常用';
        this.searchQuery = '';
        this.isLoading = false;
        
        // "其他" 分類特殊功能的狀態
        this.otherClickCount = 0;
        this.isHiddenMode = false;
        this.clickTimeout = null;
        
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.loadData();
            this.initializeComponents();
            this.setupEventListeners();
            this.updateThemeIcon();
            this.renderCategories();
            this.renderWidgets();
            this.hideLoading();
        } catch (error) {
            console.error('初始化失敗:', error);
            this.showError('載入失敗，請重新整理頁面');
        }
    }

    async loadData() {
        try {
            const response = await fetch('../assets/data/widgets.json');
            if (!response.ok) throw new Error('Failed to load data');
            
            const data = await response.json();
            this.widgets = data.widgets || [];
            this.categories = data.categories || [];
            
            // 確保每個 widget 都有必要的屬性
            this.widgets = this.widgets.map(widget => ({
                ...widget,
                description: widget.description || '',
                icon: widget.icon || 'ri-link-line',
                categories: widget.categories || ['其他']
            }));
            
        } catch (error) {
            console.error('數據載入失敗:', error);
            throw error;
        }
    }

    initializeComponents() {
        this.elements = {
            searchContainer: document.getElementById('search-container'),
            searchInput: document.getElementById('search-input'),
            searchClear: document.getElementById('search-clear'),
            viewToggle: document.getElementById('view-toggle'),
            categoryFilter: document.getElementById('category-filter'),
            cardsContainer: document.getElementById('cards-container'),
            widgetsGrid: document.getElementById('widgets-grid'),
            emptyState: document.getElementById('empty-state'),
            loadingCards: document.getElementById('loading-cards'),
            loadingOverlay: document.getElementById('loading-overlay'),
            themeIcon: document.getElementById('theme-icon')
        };
    }

    setupEventListeners() {
        // 搜尋功能
        this.elements.searchInput.addEventListener('input', this.debounce((e) => {
            this.handleSearch(e.target.value);
        }, 300));

        this.elements.searchClear.addEventListener('click', () => {
            this.clearSearch();
        });

        // 檢視切換
        this.elements.viewToggle.addEventListener('click', (e) => {
            if (e.target.closest('.view-btn')) {
                this.handleViewToggle(e.target.closest('.view-btn'));
            }
        });

        // 主題更新
        document.addEventListener('DOMContentLoaded', () => {
            this.updateThemeIcon();
        });

        // 鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSearch();
            } else if (e.key === '/' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.elements.searchInput.focus();
            }
        });
    }

    renderCategories() {
        const filterHtml = this.categories.map(category => {
            const isActive = category.name === this.currentCategory;
            const isVisible = category.visible !== false;
            
            if (!isVisible && !this.isHiddenMode) return '';
            
            return `
                <button 
                    class="category-btn ${isActive ? 'active' : ''}" 
                    data-category="${category.name}"
                    onclick="dashboard.handleCategoryClick('${category.name}')"
                >
                    <i class="${category.icon}"></i>
                    <span>${category.name}</span>
                </button>
            `;
        }).join('');

        this.elements.categoryFilter.innerHTML = filterHtml;
    }

    renderWidgets() {
        const filteredWidgets = this.getFilteredWidgets();
        
        if (filteredWidgets.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        
        const viewClass = this.currentView === 'grid' ? 'cards-grid' : 'cards-list';
        this.elements.widgetsGrid.className = viewClass;

        const widgetsHtml = filteredWidgets.map(widget => 
            this.createWidgetCard(widget)
        ).join('');

        this.elements.widgetsGrid.innerHTML = widgetsHtml;
        
        // 添加動畫效果
        requestAnimationFrame(() => {
            const cards = this.elements.widgetsGrid.querySelectorAll('.modern-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.animation = `fadeIn 0.4s ease-out ${index * 0.05}s forwards`;
                }, 0);
            });
        });
    }

    createWidgetCard(widget) {
        const url = widget.url.startsWith('http') ? widget.url : `https://${widget.url}`;
        const title = this.highlightSearchTerm(widget.title);
        const description = this.highlightSearchTerm(widget.description);
        
        return `
            <div class="modern-card" onclick="dashboard.openWidget('${url}', '${widget.title}')">
                <div class="card-content">
                    <div class="card-icon">
                        <i class="${widget.icon}"></i>
                    </div>
                    
                    <h3 class="card-title">${title}</h3>
                    
                    <p class="card-description">${description}</p>
                    
                    <div class="card-tags">
                        ${widget.categories.map(cat => 
                            `<span class="card-tag">${cat}</span>`
                        ).join('')}
                    </div>
                    
                    <div class="card-meta">
                        <span class="card-url">${widget.url}</span>
                        <span class="card-priority">優先級 ${widget.priority || '∞'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getFilteredWidgets() {
        let filtered = this.widgets;

        // 分類篩選
        if (this.currentCategory !== '全部') {
            if (this.currentCategory === '其他' && !this.isHiddenMode) {
                // 正常模式下顯示 "其他" 分類
                filtered = filtered.filter(widget => 
                    widget.categories.includes('其他') && !widget.categories.includes('其他2')
                );
            } else if (this.currentCategory === '其他' && this.isHiddenMode) {
                // 隱藏模式下顯示 "其他2" 分類
                filtered = filtered.filter(widget => 
                    widget.categories.includes('其他2')
                );
            } else {
                // 其他分類的正常篩選
                const categoryMapping = {
                    '常用': '常用',
                    '金融投資': '金融投資',
                    '氣象': '氣象環境',
                    '人工智能': '期刊論文',
                    '期刊論文': '期刊論文'
                };
                
                const targetCategory = categoryMapping[this.currentCategory] || this.currentCategory;
                filtered = filtered.filter(widget => 
                    widget.categories.includes(targetCategory)
                );
            }
        }

        // 搜尋篩選
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(widget =>
                widget.title.toLowerCase().includes(query) ||
                widget.description.toLowerCase().includes(query) ||
                widget.url.toLowerCase().includes(query) ||
                widget.categories.some(cat => cat.toLowerCase().includes(query))
            );
        }

        // 按優先級排序
        return filtered.sort((a, b) => (a.priority || 999) - (b.priority || 999));
    }

    handleSearch(query) {
        this.searchQuery = query.trim();
        
        // 更新搜尋容器狀態
        if (this.searchQuery) {
            this.elements.searchContainer.classList.add('has-content');
        } else {
            this.elements.searchContainer.classList.remove('has-content');
        }

        this.renderWidgets();
    }

    handleCategoryClick(categoryName) {
        // "其他" 分類的特殊處理
        if (categoryName === '其他') {
            this.handleOtherCategoryClick();
            return;
        }

        // 重置 "其他" 分類狀態
        this.resetOtherCategoryState();
        
        this.currentCategory = categoryName;
        this.renderCategories();
        this.renderWidgets();
    }

    handleOtherCategoryClick() {
        this.otherClickCount++;
        
        // 清除之前的定時器
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
        }

        // 設置新的定時器，3秒後重置點擊計數
        this.clickTimeout = setTimeout(() => {
            this.otherClickCount = 0;
        }, 3000);

        if (this.otherClickCount >= 5 && !this.isHiddenMode) {
            // 進入隱藏模式
            this.isHiddenMode = true;
            this.showNotification('已進入隱藏模式', 'success');
        } else if (this.otherClickCount >= 3 && this.isHiddenMode) {
            // 退出隱藏模式
            this.isHiddenMode = false;
            this.otherClickCount = 0;
            this.showNotification('已退出隱藏模式', 'info');
        }

        this.currentCategory = '其他';
        this.renderCategories();
        this.renderWidgets();
    }

    resetOtherCategoryState() {
        this.otherClickCount = 0;
        this.isHiddenMode = false;
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
        }
    }

    handleViewToggle(button) {
        const view = button.dataset.view;
        if (view === this.currentView) return;

        // 更新按鈕狀態
        this.elements.viewToggle.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        this.currentView = view;
        this.renderWidgets();

        // 儲存使用者偏好
        localStorage.setItem('dashboard-view', view);
    }

    openWidget(url, title) {
        // 添加點擊動畫效果
        const clickedCard = event.currentTarget;
        clickedCard.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            clickedCard.style.transform = '';
        }, 150);

        // 記錄訪問統計（可選）
        this.logWidgetAccess(title);

        // 打開連結
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    logWidgetAccess(title) {
        // 這裡可以實現訪問統計功能
        console.log(`Widget accessed: ${title} at ${new Date().toISOString()}`);
    }

    clearSearch() {
        this.elements.searchInput.value = '';
        this.handleSearch('');
        this.elements.searchInput.focus();
    }

    showEmptyState() {
        this.elements.widgetsGrid.style.display = 'none';
        this.elements.emptyState.style.display = 'block';
    }

    hideEmptyState() {
        this.elements.widgetsGrid.style.display = 'grid';
        this.elements.emptyState.style.display = 'none';
    }

    showLoading() {
        this.isLoading = true;
        this.elements.loadingOverlay.classList.add('show');
        this.elements.loadingCards.style.display = 'grid';
        this.elements.widgetsGrid.style.display = 'none';
    }

    hideLoading() {
        this.isLoading = false;
        this.elements.loadingOverlay.classList.remove('show');
        this.elements.loadingCards.style.display = 'none';
        this.elements.widgetsGrid.style.display = 'grid';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // 創建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="ri-information-line"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="ri-close-line"></i>
            </button>
        `;

        // 添加樣式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--surface-primary);
            border: 1px solid var(--border-primary);
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            box-shadow: var(--shadow-lg);
            display: flex;
            align-items: center;
            gap: var(--space-2);
            z-index: var(--z-toast);
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // 自動移除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    highlightSearchTerm(text) {
        if (!this.searchQuery || !text) return text;
        
        const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    updateThemeIcon() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (this.elements.themeIcon) {
            this.elements.themeIcon.className = currentTheme === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
        }
    }

    debounce(func, wait) {
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
}

// 全域函數
window.clearSearch = function() {
    if (window.dashboard) {
        window.dashboard.clearSearch();
    }
};

window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (window.dashboard) {
        window.dashboard.updateThemeIcon();
    }
};

// 初始化儀表板
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new ModernDashboard();
});

// 通知樣式
const notificationStyles = `
    <style>
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .notification {
            font-family: var(--font-sans);
            font-size: var(--text-sm);
            color: var(--text-primary);
        }
        
        .notification-success {
            border-left: 4px solid var(--success-500);
        }
        
        .notification-error {
            border-left: 4px solid var(--error-500);
        }
        
        .notification-info {
            border-left: 4px solid var(--info-500);
        }
        
        .notification-close {
            background: none;
            border: none;
            color: var(--text-tertiary);
            cursor: pointer;
            padding: var(--space-1);
            border-radius: var(--radius-sm);
            transition: var(--transition-fast);
        }
        
        .notification-close:hover {
            color: var(--text-secondary);
            background-color: var(--surface-secondary);
        }
        
        mark {
            background-color: var(--primary-light);
            color: var(--primary-dark);
            padding: 0 var(--space-1);
            border-radius: var(--radius-sm);
        }
    </style>
`;

document.head.insertAdjacentHTML('beforeend', notificationStyles);
