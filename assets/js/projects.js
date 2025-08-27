// 實作應用管理類
class ProjectsManager {
    constructor() {
        this.projects = [];
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
            console.error('初始化實作應用系統失敗:', error);
            this.showError('載入實作應用失敗');
        } finally {
            this.hideLoading();
        }
    }

    // 載入數據
    async loadData() {
        const data = await loadJsonData('../assets/data/projects.json');
        if (!data) throw new Error('無法載入數據');
        this.projects = data.projects;
        return data.categories;
    }

    // 設置實作應用類型過濾器
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
        const savedView = localStorage.getItem('projectsView') || 'grid';
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
        localStorage.setItem('projectsView', view);

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const container = document.querySelector('.projects-container');
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

    // 過濾實作應用
    filterProjects() {
        return this.projects.filter(project => {
            const matchesType = this.currentType === '全部' || 
                (Array.isArray(project.type) ? 
                    project.type.includes(this.currentType) : 
                    project.type === this.currentType);
            const matchesSearch = !this.searchTerm || 
                project.title.toLowerCase().includes(this.searchTerm) || 
                project.content.text.toLowerCase().includes(this.searchTerm) || 
                project.keywords.some(k => k.toLowerCase().includes(this.searchTerm));
            return matchesType && matchesSearch;
        });
    }

    // 排序實作應用
    sortProjects(projects) {
        return [...projects].sort((a, b) => {
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

    // 創建實作應用卡片
    createProjectsCard(project) {
        return `
            <div class="projects-card">
                <div class="projects-card-content">
                    <div class="projects-header">
                        <div class="projects-types">
                            ${Array.isArray(project.type) ? 
                                project.type.map(type => `
                                    <span class="projects-type">${type}</span>
                                `).join('') : 
                                `<span class="projects-type">${project.type}</span>`
                            }
                        </div>
                        <span class="projects-date">${formatDate(project.date)}</span>
                    </div>
                    <h2 class="projects-title">${project.title}</h2>
                    <div class="projects-keywords">
                        ${project.keywords.map(keyword => 
                            `<span class="keyword">${keyword}</span>`
                        ).join('')}
                    </div>
                    <div class="projects-preview">
                        ${this.createPreviewContent(project)}
                    </div>
                    <div class="projects-card-actions">
                        <a href="../${project.url}" class="projects-card-btn">
                            <i class="ri-article-line"></i>
                            查看詳情
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    // 創建實作應用列表項
    createProjectsListItem(project) {
        return `
            <div class="projects-list-item">
                <div class="projects-meta">
                    <div class="projects-types">
                        ${Array.isArray(project.type) ? 
                            project.type.map(type => `
                                <span class="projects-type">${type}</span>
                            `).join('') : 
                            `<span class="projects-type">${project.type}</span>`
                        }
                    </div>
                    <span class="projects-date">${formatDate(project.date)}</span>
                </div>
                <div class="projects-content">
                    <h2 class="projects-title">${project.title}</h2>
                    <div class="projects-keywords">
                        ${project.keywords.map(keyword => 
                            `<span class="keyword">${keyword}</span>`
                        ).join('')}
                    </div>
                </div>
                <div class="projects-card-actions">
                    <a href="../${project.url}" class="projects-card-btn">
                        <i class="ri-article-line"></i>
                        查看詳情
                    </a>
                </div>
            </div>
        `;
    }

    // 創建預覽內容
    createPreviewContent(project) {
        let preview = '';
        
        if (project.content.text) {
            preview += `<p class="preview-text">${project.content.text}</p>`;
        }
        
        if (project.content.images && project.content.images.length > 0) {
            preview += `
                <div class="preview-images">
                    ${project.content.images.slice(0, 2).map(img => `
                        <img src="../${img.url}" 
                             alt="${img.caption}"
                             onerror="handleImageError(this)">
                    `).join('')}
                    ${project.content.images.length > 2 ? 
                        `<div class="more-images">+${project.content.images.length - 2}</div>` : 
                        ''}
                </div>
            `;
        }
        
        return preview;
    }

    // 創建分頁控制
    createPagination() {
        const totalPages = Math.ceil(this.filteredProjects.length / this.itemsPerPage);
        if (totalPages <= 1) return '';

        let pagination = `
            <button class="page-btn" 
                    onclick="projectsManager.goToPage(1)" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="ri-arrow-left-double-line"></i>
            </button>
            <button class="page-btn" 
                    onclick="projectsManager.goToPage(${this.currentPage - 1})"
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="ri-arrow-left-line"></i>
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                pagination += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}"
                            onclick="projectsManager.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                pagination += `<span class="page-ellipsis">...</span>`;
            }
        }

        pagination += `
            <button class="page-btn" 
                    onclick="projectsManager.goToPage(${this.currentPage + 1})"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="ri-arrow-right-line"></i>
            </button>
            <button class="page-btn" 
                    onclick="projectsManager.goToPage(${totalPages})"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="ri-arrow-right-double-line"></i>
            </button>
        `;

        return pagination;
    }

    // 渲染實作應用列表
    render() {
        const container = document.querySelector('.projects-container');
        const paginationContainer = document.querySelector('.pagination');
        if (!container) return;

        this.filteredProjects = this.sortProjects(this.filterProjects());
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedProjects = this.filteredProjects.slice(startIndex, endIndex);

        if (this.filteredProjects.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="ri-search-line"></i>
                    <p>沒有找到匹配的實作應用</p>
                </div>
            `;
            paginationContainer.innerHTML = '';
            return;
        }

        container.innerHTML = paginatedProjects
            .map(project => this.currentView === 'grid' ? 
                this.createProjectsCard(project) : 
                this.createProjectsListItem(project))
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

// 初始化實作應用系統
const projectsManager = new ProjectsManager();
document.addEventListener('DOMContentLoaded', () => {
    projectsManager.initialize();
});
