// 論文管理類
class PapersManager {
    constructor() {
        this.papers = [];
        this.filteredPapers = [];
        this.currentView = 'card';
        this.currentSort = 'year-desc';
        this.currentYear = 'all';
        this.currentTag = 'all';
        this.searchTerm = '';
        this.itemsPerPage = 10;
        this.currentPage = 1;
        this.isLoading = false;
    }

    // 初始化
    async initialize() {
        this.showLoading();
        try {
            await this.loadData();
            this.setupFilters();
            this.setupEventListeners();
            this.setInitialState();
            this.render();
        } catch (error) {
            console.error('初始化論文系統失敗:', error);
            this.showError('載入論文失敗');
        } finally {
            this.hideLoading();
        }
    }

    // 載入數據
    async loadData() {
        const data = await loadJsonData('../assets/data/papers.json');
        if (!data) throw new Error('無法載入數據');
        this.papers = data.papers;
        this.filteredPapers = [...this.papers];
    }

    // 設置過濾器
    setupFilters() {
        // 設置年份過濾器
        const years = [...new Set(this.papers.map(paper => paper.year))].sort((a, b) => b - a);
        const yearFilter = document.getElementById('year-filter');
        if (yearFilter) {
            yearFilter.innerHTML = `
                <option value="all">全部</option>
                ${years.map(year => `
                    <option value="${year}">${year}</option>
                `).join('')}
            `;
        }
    }

    // 設置事件監聽器
    setupEventListeners() {
        // 排序選擇
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.handleSortChange(e.target.value);
            });
        }

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

        // 過濾器
        document.getElementById('year-filter')?.addEventListener('change', (e) => {
            this.handleYearFilter(e.target.value);
        });

        // 論文點擊（用事件委派處理兩種視圖）
        document.addEventListener('click', (e) => {
            const paperElement = e.target.closest('.paper-card, .paper-list-item');
            if (paperElement && !e.target.closest('.btn-citation, .btn-download')) {
                this.showPaperDetails(paperElement.dataset.id);
            }
        });

        // 彈窗關閉
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            this.closePaperDetails();
        });

        // ESC關閉彈窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePaperDetails();
            }
        });
    }

    // 設置初始狀態
    setInitialState() {
        const savedView = localStorage.getItem('papersView') || 'card';
        this.handleViewChange(savedView);
        this.currentPage = 1;
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
        localStorage.setItem('papersView', view);

        // 更新視圖按鈕狀態
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // 更新容器視圖
        const container = document.querySelector('.papers-container');
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

    // 處理年份過濾
    handleYearFilter(year) {
        this.currentYear = year;
        this.currentPage = 1;
        this.render();
    }

    // 過濾論文
    filterPapers() {
        return this.papers.filter(paper => {
            const matchesYear = this.currentYear === 'all' || paper.year.toString() === this.currentYear;
            const matchesSearch = !this.searchTerm || 
                                paper.title.toLowerCase().includes(this.searchTerm) || 
                                paper.authors.join(' ').toLowerCase().includes(this.searchTerm) || 
                                paper.abstract.toLowerCase().includes(this.searchTerm) ||
                                paper.keywords.join(' ').toLowerCase().includes(this.searchTerm);
            return matchesYear && matchesSearch;
        });
    }

    // 排序論文
    sortPapers(papers) {
        return [...papers].sort((a, b) => {
            switch(this.currentSort) {
                case 'year-desc':
                    return b.year - a.year;
                case 'year-asc':
                    return a.year - b.year;
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });
    }

    // 創建論文卡片
    createPaperCard(paper) {
        return `
            <div class="paper-card" data-id="${paper.id}">
                <div class="paper-card-content">
                    <div class="paper-meta">
                        <span class="paper-year">${paper.year}</span>
                    </div>
                    <h2 class="paper-title">${paper.title}</h2>
                    <p class="paper-authors">${paper.authors.join(', ')}</p>
                    <p class="paper-journal">${paper.journal}</p>
                    <div class="paper-keywords">
                        ${paper.keywords.map(keyword => `
                            <span class="keyword">${keyword}</span>
                        `).join('')}
                    </div>
                    <p class="paper-abstract">${paper.abstract}</p>
                </div>
                <div class="paper-actions">
                    <button class="btn-citation" onclick="event.stopPropagation(); papersManager.copyCitation('${paper.id}')">
                        <i class="ri-file-copy-line"></i>
                        引用格式
                    </button>
                    <a href="${paper.url}" class="btn-download" target="_blank" onclick="event.stopPropagation()">
                        <i class="ri-download-line"></i>
                        下載全文
                    </a>
                </div>
            </div>
        `;
    }

    // 創建論文列表項
    createPaperListItem(paper) {
        return `
            <div class="paper-list-item" data-id="${paper.id}">
                <div class="paper-list-content">
                    <h2 class="paper-title">${paper.title}</h2>
                    <div class="paper-meta">
                        <span class="paper-authors">${paper.authors.join(', ')}</span>
                        <span class="paper-journal">${paper.journal} (${paper.year})</span>
                    </div>
                </div>
                <div class="paper-list-actions">
                    <button class="btn-citation" onclick="event.stopPropagation(); papersManager.copyCitation('${paper.id}')">
                        <i class="ri-file-copy-line"></i>
                    </button>
                    <a href="${paper.url}" class="btn-download" target="_blank" onclick="event.stopPropagation()">
                        <i class="ri-download-line"></i>
                    </a>
                </div>
            </div>
        `;
    }

    // 創建分頁控制
    createPagination() {
        const totalPages = Math.ceil(this.filteredPapers.length / this.itemsPerPage);
        if (totalPages <= 1) return '';

        let pagination = `
            <button class="page-btn" 
                    onclick="papersManager.goToPage(1)" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="ri-arrow-left-double-line"></i>
            </button>
            <button class="page-btn" 
                    onclick="papersManager.goToPage(${this.currentPage - 1})"
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="ri-arrow-left-line"></i>
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                pagination += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}"
                            onclick="papersManager.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                pagination += `<span class="page-ellipsis">...</span>`;
            }
        }

        pagination += `
            <button class="page-btn" 
                    onclick="papersManager.goToPage(${this.currentPage + 1})"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="ri-arrow-right-line"></i>
            </button>
            <button class="page-btn" 
                    onclick="papersManager.goToPage(${totalPages})"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="ri-arrow-right-double-line"></i>
            </button>
        `;

        return pagination;
    }

    // 渲染論文列表
    render() {
        const container = document.querySelector('.papers-container');
        const paginationContainer = document.querySelector('.pagination');
        if (!container) return;

        // 過濾和排序論文
        this.filteredPapers = this.sortPapers(this.filterPapers());

        // 計算分頁
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedPapers = this.filteredPapers.slice(startIndex, endIndex);

        // 渲染論文
        if (this.filteredPapers.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="ri-search-line"></i>
                    <p>沒有找到匹配的論文</p>
                </div>
            `;
            paginationContainer.innerHTML = '';
            return;
        }

        container.innerHTML = paginatedPapers
            .map(paper => this.currentView === 'card' ? 
                this.createPaperCard(paper) : 
                this.createPaperListItem(paper))
            .join('');

        // 渲染分頁
        if (paginationContainer) {
            paginationContainer.innerHTML = this.createPagination();
        }

        // 添加動畫效果
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

    // 顯示論文詳情
    showPaperDetails(paperId) {
        const paper = this.papers.find(p => p.id === paperId);
        if (!paper) return;

        const modal = document.querySelector('.paper-modal');
        const modalBody = modal.querySelector('.modal-body');
        
        modalBody.innerHTML = `
            <div class="modal-paper-content">
                <h2 class="modal-paper-title">${paper.title}</h2>
                <div class="modal-paper-meta">
                    <p class="modal-paper-authors">${paper.authors.join(', ')}</p>
                    <p class="modal-paper-journal">${paper.journal} (${paper.year})</p>
                    <p class="modal-paper-doi">DOI: ${paper.doi}</p>
                </div>
                <div class="modal-paper-keywords">
                    ${paper.keywords.map(keyword => `
                        <span class="keyword">${keyword}</span>
                    `).join('')}
                </div>
                <div class="modal-paper-abstract">
                    <h3>摘要</h3>
                    <p>${paper.abstract}</p>
                </div>
                <div class="modal-paper-dates">
                    <p>發布日期：${formatDate(paper.publishedDate)}</p>
                    <p>最後更新：${formatDate(paper.updatedDate)}</p>
                </div>
            </div>
            <div class="modal-paper-actions">
                <button class="btn-citation" onclick="papersManager.copyCitation('${paper.id}')">
                    <i class="ri-file-copy-line"></i>
                    複製引用格式
                </button>
                <a href="${paper.url}" class="btn-download" target="_blank">
                    <i class="ri-download-line"></i>
                    下載全文
                </a>
            </div>
        `;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // 關閉論文詳情
    closePaperDetails() {
        const modal = document.querySelector('.paper-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // 複製引用格式
    async copyCitation(paperId) {
        const paper = this.papers.find(p => p.id === paperId);
        if (!paper) return;

        const success = await copyToClipboard(paper.citation);
        if (success) {
            showNotification('已複製引用格式');
        } else {
            showNotification('複製失敗', 'error');
        }
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

// 初始化論文管理器
const papersManager = new PapersManager();
document.addEventListener('DOMContentLoaded', () => {
    papersManager.initialize();
});