/* =================================
   現代化筆記管理 JavaScript
   研究資訊平台 - 筆記展示功能
   ================================= */

class ModernNotes {
    constructor() {
        this.notes = [];
        this.filteredNotes = [];
        this.currentView = 'grid';
        this.currentSort = 'date-desc';
        this.searchQuery = '';
        this.selectedType = '全部';
        this.allTypes = new Set();
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.loadData();
            this.initializeComponents();
            this.setupEventListeners();
            this.updateThemeIcon();
            this.calculateStats();
            this.renderCategoryFilter();
            this.renderNotes();
            this.hideLoading();
        } catch (error) {
            console.error('初始化失敗:', error);
            this.showError('載入失敗，請重新整理頁面');
        }
    }

    async loadData() {
        try {
            const response = await fetch('../assets/data/notes.json');
            if (!response.ok) throw new Error('Failed to load notes data');
            
            const data = await response.json();
            this.notes = data.notes || [];
            
            // 處理筆記數據
            this.notes = this.notes.map(note => ({
                ...note,
                keywords: note.keywords || [],
                content: note.content || { text: '', images: [] },
                date: note.date || '',
                url: note.url || '',
                type: note.type || '其他'
            }));
            
            // 收集所有類型
            this.notes.forEach(note => {
                if (note.type) {
                    this.allTypes.add(note.type);
                }
            });
            
            this.filteredNotes = [...this.notes];
            
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
            sortSelect: document.getElementById('sort-select'),
            viewToggle: document.getElementById('view-toggle'),
            categoryFilter: document.getElementById('category-filter'),
            notesContainer: document.getElementById('notes-container'),
            notesGrid: document.getElementById('notes-grid'),
            emptyState: document.getElementById('empty-state'),
            loadingCards: document.getElementById('loading-cards'),
            loadingOverlay: document.getElementById('loading-overlay'),
            themeIcon: document.getElementById('theme-icon'),
            totalNotes: document.getElementById('total-notes'),
            totalCategories: document.getElementById('total-categories'),
            recentNotes: document.getElementById('recent-notes'),
            totalKeywords: document.getElementById('total-keywords')
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

        // 排序功能
        this.elements.sortSelect.addEventListener('change', (e) => {
            this.handleSort(e.target.value);
        });

        // 檢視切換
        this.elements.viewToggle.addEventListener('click', (e) => {
            if (e.target.closest('.view-btn')) {
                this.handleViewToggle(e.target.closest('.view-btn'));
            }
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

    calculateStats() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        const totalNotes = this.notes.length;
        const totalCategories = this.allTypes.size;
        const recentNotes = this.notes.filter(note => {
            const noteDate = new Date(note.date);
            return noteDate.getMonth() === currentMonth && noteDate.getFullYear() === currentYear;
        }).length;
        
        const allKeywords = new Set();
        this.notes.forEach(note => {
            if (note.keywords) {
                note.keywords.forEach(keyword => allKeywords.add(keyword));
            }
        });
        const totalKeywords = allKeywords.size;

        this.elements.totalNotes.textContent = totalNotes;
        this.elements.totalCategories.textContent = totalCategories;
        this.elements.recentNotes.textContent = recentNotes;
        this.elements.totalKeywords.textContent = totalKeywords;
    }

    renderCategoryFilter() {
        const types = Array.from(this.allTypes).sort();
        
        const filterHtml = `
            <button 
                class="category-btn ${this.selectedType === '全部' ? 'active' : ''}" 
                onclick="notes.handleTypeClick('全部')"
            >
                <i class="ri-file-list-3-line"></i>
                <span>全部類型</span>
            </button>
            ${types.map(type => `
                <button 
                    class="category-btn ${this.selectedType === type ? 'active' : ''}" 
                    onclick="notes.handleTypeClick('${type}')"
                >
                    <i class="ri-hashtag"></i>
                    <span>${type}</span>
                </button>
            `).join('')}
        `;

        this.elements.categoryFilter.innerHTML = filterHtml;
    }

    renderNotes() {
        if (this.filteredNotes.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        
        const viewClass = this.currentView === 'grid' ? 'cards-grid' : 'cards-list';
        this.elements.notesGrid.className = viewClass;

        const notesHtml = this.filteredNotes.map(note => 
            this.createNoteCard(note)
        ).join('');

        this.elements.notesGrid.innerHTML = notesHtml;
        
        // 添加動畫效果
        requestAnimationFrame(() => {
            const cards = this.elements.notesGrid.querySelectorAll('.modern-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.animation = `fadeIn 0.4s ease-out ${index * 0.05}s forwards`;
                }, 0);
            });
        });
    }

    createNoteCard(note) {
        const title = this.highlightSearchTerm(note.title);
        const content = this.highlightSearchTerm(note.content.text);
        const formattedDate = new Date(note.date).toLocaleDateString('zh-TW');
        
        return `
            <div class="modern-card" onclick="notes.openNote('${note.url}', '${note.title}')">
                <div class="card-content">
                    <div class="card-icon">
                        <i class="ri-file-text-line"></i>
                    </div>
                    
                    <h3 class="card-title">${title}</h3>
                    
                    <div class="card-meta">
                        <span class="card-type">${note.type}</span>
                        <span class="card-date">${formattedDate}</span>
                    </div>
                    
                    <p class="card-description">${content}</p>
                    
                    <div class="card-tags">
                        ${(note.keywords || []).map(keyword => 
                            `<span class="card-tag">${keyword}</span>`
                        ).join('')}
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); notes.openNote('${note.url}', '${note.title}')">
                            <i class="ri-external-link-line"></i>
                            查看詳情
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    handleSearch(query) {
        this.searchQuery = query.trim();
        
        // 更新搜尋容器狀態
        if (this.searchQuery) {
            this.elements.searchContainer.classList.add('has-content');
        } else {
            this.elements.searchContainer.classList.remove('has-content');
        }

        this.filterAndRenderNotes();
    }

    handleTypeClick(type) {
        this.selectedType = type;
        this.renderCategoryFilter();
        this.filterAndRenderNotes();
    }

    handleSort(sortType) {
        this.currentSort = sortType;
        this.filterAndRenderNotes();
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
        this.renderNotes();

        // 儲存使用者偏好
        localStorage.setItem('notes-view', view);
    }

    filterAndRenderNotes() {
        let filtered = [...this.notes];

        // 搜尋篩選
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(note =>
                note.title.toLowerCase().includes(query) ||
                note.content.text.toLowerCase().includes(query) ||
                note.type.toLowerCase().includes(query) ||
                (note.keywords && note.keywords.some(keyword => keyword.toLowerCase().includes(query)))
            );
        }

        // 類型篩選
        if (this.selectedType !== '全部') {
            filtered = filtered.filter(note => note.type === this.selectedType);
        }

        // 排序
        this.sortNotes(filtered);

        this.filteredNotes = filtered;
        this.renderNotes();
    }

    sortNotes(notes) {
        notes.sort((a, b) => {
            switch (this.currentSort) {
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'title':
                    return a.title.localeCompare(b.title, 'zh-TW');
                case 'type':
                    return a.type.localeCompare(b.type, 'zh-TW');
                default:
                    return 0;
            }
        });
    }

    openNote(url, title) {
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            this.showNotification(`${title} 的詳細內容暫時不可用`, 'info');
        }
    }

    clearSearch() {
        this.elements.searchInput.value = '';
        this.handleSearch('');
        this.elements.searchInput.focus();
    }

    showEmptyState() {
        this.elements.notesGrid.style.display = 'none';
        this.elements.emptyState.style.display = 'block';
    }

    hideEmptyState() {
        this.elements.notesGrid.style.display = 'grid';
        this.elements.emptyState.style.display = 'none';
    }

    showLoading() {
        this.isLoading = true;
        this.elements.loadingOverlay.classList.add('show');
        this.elements.loadingCards.style.display = 'grid';
        this.elements.notesGrid.style.display = 'none';
    }

    hideLoading() {
        this.isLoading = false;
        this.elements.loadingOverlay.classList.remove('show');
        this.elements.loadingCards.style.display = 'none';
        this.elements.notesGrid.style.display = 'grid';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="ri-information-line"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="ri-close-line"></i>
            </button>
        `;

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
    if (window.notes) {
        window.notes.clearSearch();
    }
};

window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (window.notes) {
        window.notes.updateThemeIcon();
    }
};

// 初始化筆記管理系統
document.addEventListener('DOMContentLoaded', () => {
    window.notes = new ModernNotes();
});
