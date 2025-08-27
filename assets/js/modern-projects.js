/* =================================
   現代化專案管理 JavaScript
   研究資訊平台 - 實作應用展示功能
   ================================= */

class ModernProjects {
    constructor() {
        this.projects = [];
        this.filteredProjects = [];
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
            this.renderProjects();
            this.hideLoading();
        } catch (error) {
            console.error('初始化失敗:', error);
            this.showError('載入失敗，請重新整理頁面');
        }
    }

    async loadData() {
        try {
            const response = await fetch('../assets/data/projects.json');
            if (!response.ok) throw new Error('Failed to load projects data');
            
            const data = await response.json();
            this.projects = data.projects || [];
            
            // 處理專案數據
            this.projects = this.projects.map(project => ({
                ...project,
                keywords: project.keywords || [],
                content: project.content || { text: '', images: [] },
                type: Array.isArray(project.type) ? project.type : [project.type || '其他'],
                date: project.date || '',
                url: project.url || ''
            }));
            
            // 收集所有類型
            this.projects.forEach(project => {
                if (project.type) {
                    project.type.forEach(type => this.allTypes.add(type));
                }
            });
            
            this.filteredProjects = [...this.projects];
            
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
            projectsContainer: document.getElementById('projects-container'),
            projectsGrid: document.getElementById('projects-grid'),
            emptyState: document.getElementById('empty-state'),
            loadingCards: document.getElementById('loading-cards'),
            loadingOverlay: document.getElementById('loading-overlay'),
            themeIcon: document.getElementById('theme-icon'),
            totalProjects: document.getElementById('total-projects'),
            totalTypes: document.getElementById('total-types'),
            recentProjects: document.getElementById('recent-projects'),
            activeProjects: document.getElementById('active-projects')
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
        const currentYear = currentDate.getFullYear();
        
        const totalProjects = this.projects.length;
        const totalTypes = this.allTypes.size;
        const recentProjects = this.projects.filter(project => {
            const projectDate = new Date(project.date);
            return projectDate.getFullYear() === currentYear;
        }).length;
        
        // 假設活躍專案是有URL的專案
        const activeProjects = this.projects.filter(project => project.url).length;

        this.elements.totalProjects.textContent = totalProjects;
        this.elements.totalTypes.textContent = totalTypes;
        this.elements.recentProjects.textContent = recentProjects;
        this.elements.activeProjects.textContent = activeProjects;
    }

    renderCategoryFilter() {
        const types = Array.from(this.allTypes).sort();
        
        const filterHtml = `
            <button 
                class="category-btn ${this.selectedType === '全部' ? 'active' : ''}" 
                onclick="projects.handleTypeClick('全部')"
            >
                <i class="ri-apps-2-line"></i>
                <span>全部專案</span>
            </button>
            ${types.map(type => `
                <button 
                    class="category-btn ${this.selectedType === type ? 'active' : ''}" 
                    onclick="projects.handleTypeClick('${type}')"
                >
                    <i class="ri-hashtag"></i>
                    <span>${type}</span>
                </button>
            `).join('')}
        `;

        this.elements.categoryFilter.innerHTML = filterHtml;
    }

    renderProjects() {
        if (this.filteredProjects.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        
        const viewClass = this.currentView === 'grid' ? 'cards-grid' : 'cards-list';
        this.elements.projectsGrid.className = viewClass;

        const projectsHtml = this.filteredProjects.map(project => 
            this.createProjectCard(project)
        ).join('');

        this.elements.projectsGrid.innerHTML = projectsHtml;
        
        // 添加動畫效果
        requestAnimationFrame(() => {
            const cards = this.elements.projectsGrid.querySelectorAll('.modern-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.animation = `fadeIn 0.4s ease-out ${index * 0.05}s forwards`;
                }, 0);
            });
        });
    }

    createProjectCard(project) {
        const title = this.highlightSearchTerm(project.title);
        const content = this.highlightSearchTerm(project.content.text);
        const formattedDate = new Date(project.date).toLocaleDateString('zh-TW');
        
        return `
            <div class="modern-card" onclick="projects.openProject('${project.url}', '${project.title}')">
                <div class="card-content">
                    <div class="card-icon">
                        <i class="ri-code-box-line"></i>
                    </div>
                    
                    <h3 class="card-title">${title}</h3>
                    
                    <div class="card-meta">
                        <span class="card-date">${formattedDate}</span>
                        ${project.url ? '<span class="card-status">可訪問</span>' : '<span class="card-status">開發中</span>'}
                    </div>
                    
                    <p class="card-description">${content}</p>
                    
                    <div class="card-tags">
                        ${project.type.map(type => 
                            `<span class="card-tag">${type}</span>`
                        ).join('')}
                        ${(project.keywords || []).slice(0, 3).map(keyword => 
                            `<span class="card-tag">${keyword}</span>`
                        ).join('')}
                    </div>
                    
                    <div class="card-actions">
                        ${project.url ? `
                            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); projects.openProject('${project.url}', '${project.title}')">
                                <i class="ri-external-link-line"></i>
                                查看專案
                            </button>
                        ` : `
                            <button class="btn btn-secondary btn-sm" disabled>
                                <i class="ri-time-line"></i>
                                開發中
                            </button>
                        `}
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

        this.filterAndRenderProjects();
    }

    handleTypeClick(type) {
        this.selectedType = type;
        this.renderCategoryFilter();
        this.filterAndRenderProjects();
    }

    handleSort(sortType) {
        this.currentSort = sortType;
        this.filterAndRenderProjects();
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
        this.renderProjects();

        // 儲存使用者偏好
        localStorage.setItem('projects-view', view);
    }

    filterAndRenderProjects() {
        let filtered = [...this.projects];

        // 搜尋篩選
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(project =>
                project.title.toLowerCase().includes(query) ||
                project.content.text.toLowerCase().includes(query) ||
                project.type.some(type => type.toLowerCase().includes(query)) ||
                (project.keywords && project.keywords.some(keyword => keyword.toLowerCase().includes(query)))
            );
        }

        // 類型篩選
        if (this.selectedType !== '全部') {
            filtered = filtered.filter(project => project.type.includes(this.selectedType));
        }

        // 排序
        this.sortProjects(filtered);

        this.filteredProjects = filtered;
        this.renderProjects();
    }

    sortProjects(projects) {
        projects.sort((a, b) => {
            switch (this.currentSort) {
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'title':
                    return a.title.localeCompare(b.title, 'zh-TW');
                case 'type':
                    return a.type[0].localeCompare(b.type[0], 'zh-TW');
                default:
                    return 0;
            }
        });
    }

    openProject(url, title) {
        if (url) {
            // 記錄點擊統計
            this.logProjectAccess(title);
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            this.showNotification(`${title} 專案尚未完成或暫不可訪問`, 'info');
        }
    }

    logProjectAccess(title) {
        console.log(`Project accessed: ${title} at ${new Date().toISOString()}`);
        // 這裡可以實現訪問統計功能
    }

    clearSearch() {
        this.elements.searchInput.value = '';
        this.handleSearch('');
        this.elements.searchInput.focus();
    }

    showEmptyState() {
        this.elements.projectsGrid.style.display = 'none';
        this.elements.emptyState.style.display = 'block';
    }

    hideEmptyState() {
        this.elements.projectsGrid.style.display = 'grid';
        this.elements.emptyState.style.display = 'none';
    }

    showLoading() {
        this.isLoading = true;
        this.elements.loadingOverlay.classList.add('show');
        this.elements.loadingCards.style.display = 'grid';
        this.elements.projectsGrid.style.display = 'none';
    }

    hideLoading() {
        this.isLoading = false;
        this.elements.loadingOverlay.classList.remove('show');
        this.elements.loadingCards.style.display = 'none';
        this.elements.projectsGrid.style.display = 'grid';
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
    if (window.projects) {
        window.projects.clearSearch();
    }
};

window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (window.projects) {
        window.projects.updateThemeIcon();
    }
};

// 初始化專案管理系統
document.addEventListener('DOMContentLoaded', () => {
    window.projects = new ModernProjects();
});
