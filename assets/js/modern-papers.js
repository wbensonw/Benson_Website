/* =================================
   現代化論文管理 JavaScript
   研究資訊平台 - 論文展示功能
   ================================= */

class ModernPapers {
    constructor() {
        this.papers = [];
        this.filteredPapers = [];
        this.currentView = 'grid';
        this.currentSort = 'year-desc';
        this.searchQuery = '';
        this.selectedTags = new Set();
        this.allTags = new Set();
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
            this.renderTagFilter();
            this.renderPapers();
            this.hideLoading();
        } catch (error) {
            console.error('初始化失敗:', error);
            this.showError('載入失敗，請重新整理頁面');
        }
    }

    async loadData() {
        try {
            const response = await fetch('../assets/data/papers.json');
            if (!response.ok) throw new Error('Failed to load papers data');
            
            const data = await response.json();
            this.papers = data.papers || [];
            
            // 處理論文數據，確保所有必要屬性存在
            this.papers = this.papers.map(paper => ({
                ...paper,
                authors: paper.authors || [],
                keywords: paper.keywords || [],
                tags: paper.tags || [],
                abstract: paper.abstract || '',
                doi: paper.doi || '',
                url: paper.url || '',
                citation: paper.citation || '',
                publishedDate: paper.publishedDate || '',
                updatedDate: paper.updatedDate || ''
            }));
            
            // 收集所有標籤
            this.papers.forEach(paper => {
                if (paper.tags) {
                    paper.tags.forEach(tag => this.allTags.add(tag));
                }
                if (paper.keywords) {
                    paper.keywords.forEach(keyword => this.allTags.add(keyword));
                }
            });
            
            this.filteredPapers = [...this.papers];
            
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
            tagFilter: document.getElementById('tag-filter'),
            papersContainer: document.getElementById('papers-container'),
            papersGrid: document.getElementById('papers-grid'),
            emptyState: document.getElementById('empty-state'),
            loadingCards: document.getElementById('loading-cards'),
            loadingOverlay: document.getElementById('loading-overlay'),
            paperModal: document.getElementById('paper-modal'),
            modalTitle: document.getElementById('modal-title'),
            modalBody: document.getElementById('modal-body'),
            themeIcon: document.getElementById('theme-icon'),
            totalPapers: document.getElementById('total-papers'),
            totalCitations: document.getElementById('total-citations'),
            recentPapers: document.getElementById('recent-papers'),
            totalJournals: document.getElementById('total-journals')
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
                if (this.elements.paperModal.classList.contains('show')) {
                    this.closePaperModal();
                } else {
                    this.clearSearch();
                }
            } else if (e.key === '/' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.elements.searchInput.focus();
            }
        });
    }

    calculateStats() {
        const currentYear = new Date().getFullYear();
        const recentYears = [currentYear, currentYear - 1, currentYear - 2];
        
        const totalPapers = this.papers.length;
        const totalCitations = this.papers.reduce((sum, paper) => sum + (paper.citations || 0), 0);
        const recentPapers = this.papers.filter(paper => recentYears.includes(paper.year)).length;
        const uniqueJournals = new Set(this.papers.map(paper => paper.journal)).size;

        this.elements.totalPapers.textContent = totalPapers;
        this.elements.totalCitations.textContent = totalCitations;
        this.elements.recentPapers.textContent = recentPapers;
        this.elements.totalJournals.textContent = uniqueJournals;
    }

    renderTagFilter() {
        const tags = Array.from(this.allTags).sort();
        
        const filterHtml = `
            <button 
                class="category-btn ${this.selectedTags.size === 0 ? 'active' : ''}" 
                onclick="papers.handleTagClick(null)"
            >
                <i class="ri-price-tag-3-line"></i>
                <span>全部標籤</span>
            </button>
            ${tags.map(tag => `
                <button 
                    class="category-btn ${this.selectedTags.has(tag) ? 'active' : ''}" 
                    onclick="papers.handleTagClick('${tag}')"
                >
                    <i class="ri-hashtag"></i>
                    <span>${tag}</span>
                </button>
            `).join('')}
        `;

        this.elements.tagFilter.innerHTML = filterHtml;
    }

    renderPapers() {
        if (this.filteredPapers.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        
        const viewClass = this.currentView === 'grid' ? 'cards-grid' : 'cards-list';
        this.elements.papersGrid.className = viewClass;

        const papersHtml = this.filteredPapers.map(paper => 
            this.createPaperCard(paper)
        ).join('');

        this.elements.papersGrid.innerHTML = papersHtml;
        
        // 添加動畫效果
        requestAnimationFrame(() => {
            const cards = this.elements.papersGrid.querySelectorAll('.paper-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.animation = `fadeIn 0.4s ease-out ${index * 0.05}s forwards`;
                }, 0);
            });
        });
    }

    createPaperCard(paper) {
        const authorsText = Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors;
        const title = this.highlightSearchTerm(paper.title);
        const abstract = this.highlightSearchTerm(paper.abstract);
        
        return `
            <div class="paper-card" onclick="papers.openPaperModal('${paper.id}')">
                <div class="paper-header">
                    <div class="paper-year">${paper.year}</div>
                </div>
                
                <h3 class="paper-title">${title}</h3>
                
                <div class="paper-authors">${this.highlightSearchTerm(authorsText)}</div>
                
                <div class="paper-journal">
                    ${paper.journal}${paper.volume ? `, Vol. ${paper.volume}` : ''}${paper.issue ? `(${paper.issue})` : ''}${paper.pages ? `, pp. ${paper.pages}` : ''}
                </div>
                
                <div class="paper-abstract">${abstract}</div>
                
                <div class="paper-tags">
                    ${(paper.tags || []).map(tag => 
                        `<span class="paper-tag">${tag}</span>`
                    ).join('')}
                </div>
                
                <div class="paper-actions">
                    <div class="paper-meta">
                        ${paper.doi ? `
                            <div class="paper-meta-item">
                                <i class="ri-links-line"></i>
                                <span>DOI</span>
                            </div>
                        ` : ''}
                        <div class="paper-meta-item">
                            <i class="ri-calendar-line"></i>
                            <span>${paper.publishedDate ? new Date(paper.publishedDate).toLocaleDateString('zh-TW') : paper.year}</span>
                        </div>
                    </div>
                    
                    <div class="paper-buttons">
                        ${paper.url ? `
                            <button class="btn btn-ghost btn-icon-sm" onclick="event.stopPropagation(); papers.openPaperUrl('${paper.url}')" title="開啟論文">
                                <i class="ri-external-link-line"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-ghost btn-icon-sm" onclick="event.stopPropagation(); papers.copyPaperCitation('${paper.id}')" title="複製引用">
                            <i class="ri-file-copy-line"></i>
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

        this.filterAndRenderPapers();
    }

    handleTagClick(tag) {
        if (tag === null) {
            // 清除所有標籤篩選
            this.selectedTags.clear();
        } else {
            // 切換標籤選擇狀態
            if (this.selectedTags.has(tag)) {
                this.selectedTags.delete(tag);
            } else {
                this.selectedTags.add(tag);
            }
        }

        this.renderTagFilter();
        this.filterAndRenderPapers();
    }

    handleSort(sortType) {
        this.currentSort = sortType;
        this.filterAndRenderPapers();
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
        this.renderPapers();

        // 儲存使用者偏好
        localStorage.setItem('papers-view', view);
    }

    filterAndRenderPapers() {
        let filtered = [...this.papers];

        // 搜尋篩選
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(paper =>
                paper.title.toLowerCase().includes(query) ||
                paper.abstract.toLowerCase().includes(query) ||
                paper.authors.join(' ').toLowerCase().includes(query) ||
                paper.journal.toLowerCase().includes(query) ||
                (paper.keywords && paper.keywords.some(keyword => keyword.toLowerCase().includes(query))) ||
                (paper.tags && paper.tags.some(tag => tag.toLowerCase().includes(query)))
            );
        }

        // 標籤篩選
        if (this.selectedTags.size > 0) {
            filtered = filtered.filter(paper => {
                const paperTags = [...(paper.tags || []), ...(paper.keywords || [])];
                return Array.from(this.selectedTags).some(tag => paperTags.includes(tag));
            });
        }

        // 排序
        this.sortPapers(filtered);

        this.filteredPapers = filtered;
        this.renderPapers();
    }

    sortPapers(papers) {
        papers.sort((a, b) => {
            switch (this.currentSort) {
                case 'year-desc':
                    return b.year - a.year;
                case 'year-asc':
                    return a.year - b.year;
                case 'title':
                    return a.title.localeCompare(b.title, 'zh-TW');
                case 'authors':
                    const authorsA = Array.isArray(a.authors) ? a.authors[0] : a.authors;
                    const authorsB = Array.isArray(b.authors) ? b.authors[0] : b.authors;
                    return authorsA.localeCompare(authorsB, 'zh-TW');
                default:
                    return 0;
            }
        });
    }

    openPaperModal(paperId) {
        const paper = this.papers.find(p => p.id === paperId);
        if (!paper) return;

        this.elements.modalTitle.textContent = paper.title;
        this.elements.modalBody.innerHTML = this.createPaperDetails(paper);
        this.elements.paperModal.classList.add('show');
        
        // 防止背景滾動
        document.body.style.overflow = 'hidden';
    }

    createPaperDetails(paper) {
        const authorsText = Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors;
        
        return `
            <div class="paper-details">
                <div class="paper-header">
                    <div class="paper-year">${paper.year}</div>
                </div>
                
                <h2 class="paper-title">${paper.title}</h2>
                
                <div class="paper-authors">${authorsText}</div>
                
                <div class="paper-journal">
                    <strong>${paper.journal}</strong>${paper.volume ? `, Vol. ${paper.volume}` : ''}${paper.issue ? `(${paper.issue})` : ''}${paper.pages ? `, pp. ${paper.pages}` : ''}
                </div>
                
                ${paper.doi ? `
                    <div class="paper-doi">
                        <strong>DOI:</strong> <a href="https://doi.org/${paper.doi}" target="_blank" rel="noopener">${paper.doi}</a>
                    </div>
                ` : ''}
                
                <div class="paper-abstract-full">
                    <h4>摘要</h4>
                    <p>${paper.abstract}</p>
                </div>
                
                ${paper.keywords && paper.keywords.length > 0 ? `
                    <div class="paper-keywords">
                        <h4>關鍵字</h4>
                        <div class="paper-tags">
                            ${paper.keywords.map(keyword => 
                                `<span class="paper-tag">${keyword}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="paper-citation">
                    <h4>引用格式</h4>
                    <div class="citation-text">${paper.citation}</div>
                    <button class="btn btn-secondary btn-sm" onclick="papers.copyText('${paper.citation.replace(/'/g, "\\'")}')">
                        <i class="ri-file-copy-line"></i>
                        複製引用
                    </button>
                </div>
                
                <div class="paper-actions">
                    ${paper.url ? `
                        <a href="${paper.url}" target="_blank" rel="noopener" class="btn btn-primary">
                            <i class="ri-external-link-line"></i>
                            開啟論文
                        </a>
                    ` : ''}
                    ${paper.doi ? `
                        <a href="https://doi.org/${paper.doi}" target="_blank" rel="noopener" class="btn btn-secondary">
                            <i class="ri-links-line"></i>
                            DOI 連結
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }

    closePaperModal() {
        this.elements.paperModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    openPaperUrl(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    copyPaperCitation(paperId) {
        const paper = this.papers.find(p => p.id === paperId);
        if (paper && paper.citation) {
            this.copyText(paper.citation);
        }
    }

    copyText(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('已複製到剪貼簿', 'success');
        }).catch(() => {
            this.showNotification('複製失敗', 'error');
        });
    }

    clearSearch() {
        this.elements.searchInput.value = '';
        this.handleSearch('');
        this.elements.searchInput.focus();
    }

    showEmptyState() {
        this.elements.papersGrid.style.display = 'none';
        this.elements.emptyState.style.display = 'block';
    }

    hideEmptyState() {
        this.elements.papersGrid.style.display = 'grid';
        this.elements.emptyState.style.display = 'none';
    }

    showLoading() {
        this.isLoading = true;
        this.elements.loadingOverlay.classList.add('show');
        this.elements.loadingCards.style.display = 'grid';
        this.elements.papersGrid.style.display = 'none';
    }

    hideLoading() {
        this.isLoading = false;
        this.elements.loadingOverlay.classList.remove('show');
        this.elements.loadingCards.style.display = 'none';
        this.elements.papersGrid.style.display = 'grid';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // 重用儀表板的通知系統
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
    if (window.papers) {
        window.papers.clearSearch();
    }
};

window.closePaperModal = function() {
    if (window.papers) {
        window.papers.closePaperModal();
    }
};

window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (window.papers) {
        window.papers.updateThemeIcon();
    }
};

// 初始化論文管理系統
document.addEventListener('DOMContentLoaded', () => {
    window.papers = new ModernPapers();
});
