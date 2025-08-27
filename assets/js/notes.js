// 筆記管理類
class NotesManager {
    constructor() {
        this.notes = [];
        this.currentType = '全部';
        this.currentSort = 'date-desc';
        this.searchTerm = '';
        this.currentView = 'grid';
        this.itemsPerPage = 12;
        this.currentPage = 1;
        this.isLoading = false;
    }

    // 初始化
    async initialize() {
        this.showLoading();
        try {
            await this.loadData();
            await this.setupTypeFilter();
            this.setupEventListeners();
            this.setInitialState();
            this.render();
        } catch (error) {
            console.error('初始化筆記系統失敗:', error);
            this.showError('載入筆記失敗');
        } finally {
            this.hideLoading();
        }
    }

    // 載入數據
    async loadData() {
        const data = await loadJsonData('../assets/data/notes.json');
        if (!data) throw new Error('無法載入數據');
        this.notes = data.notes;
        return data.categories;
    }

    // 設置筆記類型過濾器
    async setupTypeFilter() {
        const categories = await this.loadData();
        const typeButtons = document.querySelector('.type-buttons');
        if (!typeButtons) return;

        // 清空現有按鈕
        typeButtons.innerHTML = '';

        // 添加"全部"按鈕
        const allButton = document.createElement('button');
        allButton.className = 'type-btn active';
        allButton.dataset.type = '全部';
        allButton.innerHTML = `
            <i class="ri-apps-line"></i>
            全部
        `;
        typeButtons.appendChild(allButton);

        // 添加類型按鈕
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'type-btn';
            button.dataset.type = category.name;
            button.innerHTML = `
                <i class="${category.icon}"></i>
                ${category.name}
            `;
            typeButtons.appendChild(button);
        });

        // 初始化為"全部"
        this.currentType = '全部';
    }

    // 設置事件監聽器
    setupEventListeners() {
        // 類型按鈕點擊
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleTypeChange(btn);
            });
        });

        // 排序變更
        document.getElementById('sort-select')?.addEventListener('change', (e) => {
            this.handleSortChange(e.target.value);
        });

        // 視圖切換
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleViewChange(btn.dataset.view);
            });
        });

        // 搜索功能
        const searchBox = document.querySelector('.search-box');
        if (searchBox) {
            searchBox.addEventListener('input', debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }

        // 搜索清除按鈕
        document.querySelector('.search-clear')?.addEventListener('click', () => {
            this.clearSearch();
        });
    }

    // 設置初始狀態
    setInitialState() {
        const savedView = localStorage.getItem('notesView') || 'grid';
        this.handleViewChange(savedView);
        this.currentPage = 1;
    }

    // 處理類型變更
    handleTypeChange(button) {
        document.querySelectorAll('.type-btn').forEach(btn => 
            btn.classList.remove('active'));
        button.classList.add('active');
        this.currentType = button.dataset.type;
        this.currentPage = 1;
        this.render();
    }

    // 處理排序變更
    handleSortChange(sortValue) {
        this.currentSort = sortValue;
        this.currentPage = 1;
        this.render();
    }

    // 處理視圖變更
    handleViewChange(view) {
        this.currentView = view;
        localStorage.setItem('notesView', view);

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const container = document.querySelector('.notes-container');
        if (container) {
            container.dataset.view = view;
        }

        this.render();
    }

    // 處理搜索
    handleSearch(value) {
        this.searchTerm = value.toLowerCase();
        this.currentPage = 1;
        this.render();
    }

    // 清除搜索
    clearSearch() {
        const searchBox = document.querySelector('.search-box');
        if (searchBox) {
            searchBox.value = '';
            this.searchTerm = '';
            this.render();
        }
    }

    // 過濾筆記
    filterNotes() {
        return this.notes.filter(note => {
            const matchesType = this.currentType === '全部' || note.type === this.currentType;
            const matchesSearch = !this.searchTerm || 
                                note.title.toLowerCase().includes(this.searchTerm) || 
                                note.content.text.toLowerCase().includes(this.searchTerm) || 
                                note.keywords.some(k => k.toLowerCase().includes(this.searchTerm));
            return matchesType && matchesSearch;
        });
    }

    // 排序筆記
    sortNotes(notes) {
        return [...notes].sort((a, b) => {
            switch(this.currentSort) {
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });
    }

    // 創建筆記卡片
    createNoteCard(note) {
        return `
            <div class="note-card">
                <div class="note-card-content">
                    <div class="note-header">
                        <span class="note-type">${note.type}</span>
                        <span class="note-date">${formatDate(note.date)}</span>
                    </div>
                    <h2 class="note-title">${note.title}</h2>
                    <div class="note-keywords">
                        ${note.keywords.map(keyword => 
                            `<span class="keyword">${keyword}</span>`
                        ).join('')}
                    </div>
                    <div class="note-preview">
                        ${this.createPreviewContent(note)}
                    </div>
                    <div class="note-card-actions">
                        <a href="../${note.url}" class="note-card-btn">
                            <i class="ri-article-line"></i>
                            查看詳情
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    // 創建筆記列表項
    createNoteListItem(note) {
        return `
            <div class="note-list-item">
                <div class="note-meta">
                    <span class="note-type">${note.type}</span>
                    <span class="note-date">${formatDate(note.date)}</span>
                </div>
                <div class="note-content">
                    <h2 class="note-title">${note.title}</h2>
                    <div class="note-keywords">
                        ${note.keywords.map(keyword => 
                            `<span class="keyword">${keyword}</span>`
                        ).join('')}
                    </div>
                </div>
                <div class="note-card-actions">
                    <a href="../${note.url}" class="note-card-btn">
                        <i class="ri-article-line"></i>
                        查看詳情
                    </a>
                </div>
            </div>
        `;
    }

    // 創建預覽內容
    createPreviewContent(note) {
        let preview = '';
        
        if (note.content.text) {
            preview += `<p class="preview-text">${note.content.text}</p>`;
        }
        
        if (note.content.images && note.content.images.length > 0) {
            preview += `
                <div class="preview-images">
                    ${note.content.images.slice(0, 2).map(img => `
                        <img src="../${img.url}" 
                             alt="${img.caption}"
                             onerror="handleImageError(this)">
                    `).join('')}
                    ${note.content.images.length > 2 ? 
                        `<div class="more-images">+${note.content.images.length - 2}</div>` : 
                        ''}
                </div>
            `;
        }
        
        return preview;
    }

    // 創建分頁控制
    createPagination() {
        const totalPages = Math.ceil(this.filteredNotes.length / this.itemsPerPage);
        if (totalPages <= 1) return '';

        let pagination = `
            <button class="page-btn" 
                    onclick="notesManager.goToPage(1)" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="ri-arrow-left-double-line"></i>
            </button>
            <button class="page-btn" 
                    onclick="notesManager.goToPage(${this.currentPage - 1})"
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="ri-arrow-left-line"></i>
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                pagination += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}"
                            onclick="notesManager.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                pagination += `<span class="page-ellipsis">...</span>`;
            }
        }

        pagination += `
            <button class="page-btn" 
                    onclick="notesManager.goToPage(${this.currentPage + 1})"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="ri-arrow-right-line"></i>
            </button>
            <button class="page-btn" 
                    onclick="notesManager.goToPage(${totalPages})"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="ri-arrow-right-double-line"></i>
            </button>
        `;

        return pagination;
    }

    // 渲染筆記列表
    render() {
        const container = document.querySelector('.notes-container');
        const paginationContainer = document.querySelector('.pagination');
        if (!container) return;

        this.filteredNotes = this.sortNotes(this.filterNotes());
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedNotes = this.filteredNotes.slice(startIndex, endIndex);

        if (this.filteredNotes.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="ri-search-line"></i>
                    <p>沒有找到匹配的筆記</p>
                </div>
            `;
            paginationContainer.innerHTML = '';
            return;
        }

        container.innerHTML = paginatedNotes
            .map(note => this.currentView === 'grid' ? 
                this.createNoteCard(note) : 
                this.createNoteListItem(note))
            .join('');

        if (paginationContainer) {
            paginationContainer.innerHTML = this.createPagination();
        }

        requestAnimationFrame(() => {
            const items = container.children;
            Array.from(items).forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 50);
            });
        });
    }

    // 頁面跳轉
    goToPage(page) {
        this.currentPage = page;
        this.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 顯示加載狀態
    showLoading() {
        this.isLoading = true;
        const loader = document.querySelector('.loading-overlay');
        if (loader) {
            loader.classList.add('active');
        }
    }

    // 隱藏加載狀態
    hideLoading() {
        this.isLoading = false;
        const loader = document.querySelector('.loading-overlay');
        if (loader) {
            loader.classList.remove('active');
        }
    }

    // 顯示錯誤信息
    showError(message) {
        showNotification(message, 'error');
    }
}

// 初始化筆記系統
const notesManager = new NotesManager();
document.addEventListener('DOMContentLoaded', () => {
    notesManager.initialize();
});