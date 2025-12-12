import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

interface Category {
  category: string;
  article_count: number;
}

const KnowledgeBase: React.FC = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [rated, setRated] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetchArticles();
    fetchCategories();
  }, [selectedCategory, searchTerm]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/kb/public/articles', {
        params: {
          category: selectedCategory,
          search: searchTerm
        }
      });
      setArticles(response.data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/kb/public/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleArticleClick = async (article: Article) => {
    try {
      const response = await api.get(`/kb/public/articles/${article.id}`);
      setSelectedArticle(response.data);
    } catch (error) {
      console.error('Error fetching article:', error);
    }
  };

  const handleRating = async (articleId: number, helpful: boolean) => {
    if (rated[articleId]) {
      alert('You have already rated this article');
      return;
    }
    
    try {
      await api.post(`/kb/public/articles/${articleId}/rate`, { helpful });
      setRated({ ...rated, [articleId]: true });
      alert('Thank you for your feedback!');
      
      // Refresh article to show updated counts
      if (selectedArticle && selectedArticle.id === articleId) {
        const response = await api.get(`/kb/public/articles/${articleId}`);
        setSelectedArticle(response.data);
      }
    } catch (error) {
      console.error('Error rating article:', error);
      alert('Failed to submit rating');
    }
  };

  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #fef08a; padding: 2px 4px; border-radius: 4px;">$1</mark>');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📚 Knowledge Base</h1>
          <p style={styles.subtitle}>Find answers to common questions and helpful articles</p>
        </div>
        <button onClick={() => navigate('/user/dashboard')} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      </div>

      {!selectedArticle ? (
        <>
          {/* Search Bar */}
          <div style={styles.searchSection}>
            <input
              type="text"
              placeholder="🔍 Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Categories */}
          <div style={styles.categoriesSection}>
            <button
              onClick={() => setSelectedCategory('')}
              style={{
                ...styles.categoryButton,
                ...(selectedCategory === '' ? styles.categoryButtonActive : {})
              }}
            >
              All Articles ({categories.reduce((sum, cat) => sum + cat.article_count, 0)})
            </button>
            {categories.map((category) => (
              <button
                key={category.category}
                onClick={() => setSelectedCategory(category.category)}
                style={{
                  ...styles.categoryButton,
                  ...(selectedCategory === category.category ? styles.categoryButtonActive : {})
                }}
              >
                {category.category} ({category.article_count})
              </button>
            ))}
          </div>

          {/* Articles List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '18px', color: '#666' }}>Loading articles...</div>
            </div>
          ) : articles.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📄</div>
              <h3 style={styles.emptyTitle}>No articles found</h3>
              <p style={styles.emptyText}>
                {searchTerm || selectedCategory
                  ? 'Try adjusting your search or category filter'
                  : 'The knowledge base is currently empty'}
              </p>
            </div>
          ) : (
            <div style={styles.articlesGrid}>
              {articles.map((article) => (
                <div
                  key={article.id}
                  style={styles.articleCard}
                  onClick={() => handleArticleClick(article)}
                >
                  <div style={styles.articleCategory}>{article.category}</div>
                  <h3
                    style={styles.articleTitle}
                    dangerouslySetInnerHTML={{ __html: highlightSearchTerm(article.title) }}
                  />
                  <p
                    style={styles.articlePreview}
                    dangerouslySetInnerHTML={{ 
                      __html: highlightSearchTerm(article.content.substring(0, 150) + '...') 
                    }}
                  />
                  <div style={styles.articleMeta}>
                    <span style={styles.metaItem}>👁 {article.view_count} views</span>
                    <span style={styles.metaItem}>👍 {article.helpful_count}</span>
                    <span style={styles.metaItem}>👎 {article.not_helpful_count}</span>
                  </div>
                  {article.tags && (
                    <div style={styles.tagsContainer}>
                      {article.tags.split(',').map((tag, idx) => (
                        <span key={idx} style={styles.tag}>{tag.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Article Detail View */
        <div style={styles.articleDetail}>
          <button onClick={() => setSelectedArticle(null)} style={styles.backToListButton}>
            ← Back to Articles
          </button>
          
          <div style={styles.detailCard}>
            <div style={styles.detailCategory}>{selectedArticle.category}</div>
            <h1 style={styles.detailTitle}>{selectedArticle.title}</h1>
            
            <div style={styles.detailMeta}>
              <span>👁 {selectedArticle.view_count} views</span>
              <span>•</span>
              <span>Updated {new Date(selectedArticle.updated_at).toLocaleDateString()}</span>
            </div>

            {selectedArticle.tags && (
              <div style={styles.tagsContainer}>
                {selectedArticle.tags.split(',').map((tag, idx) => (
                  <span key={idx} style={styles.tag}>{tag.trim()}</span>
                ))}
              </div>
            )}

            <div style={styles.detailContent}>
              {selectedArticle.content.split('\n').map((paragraph, idx) => (
                <p key={idx} style={styles.detailParagraph}>{paragraph}</p>
              ))}
            </div>

            {/* Rating Section */}
            <div style={styles.ratingSection}>
              <h3 style={styles.ratingTitle}>Was this article helpful?</h3>
              <div style={styles.ratingButtons}>
                <button
                  onClick={() => handleRating(selectedArticle.id, true)}
                  disabled={rated[selectedArticle.id]}
                  style={{
                    ...styles.ratingButton,
                    ...(rated[selectedArticle.id] ? styles.ratingButtonDisabled : {})
                  }}
                >
                  👍 Yes ({selectedArticle.helpful_count})
                </button>
                <button
                  onClick={() => handleRating(selectedArticle.id, false)}
                  disabled={rated[selectedArticle.id]}
                  style={{
                    ...styles.ratingButton,
                    ...(rated[selectedArticle.id] ? styles.ratingButtonDisabled : {})
                  }}
                >
                  👎 No ({selectedArticle.not_helpful_count})
                </button>
              </div>
              {rated[selectedArticle.id] && (
                <p style={styles.ratingThankYou}>✅ Thank you for your feedback!</p>
              )}
            </div>

            {/* Still Need Help */}
            <div style={styles.helpSection}>
              <h3 style={styles.helpTitle}>Still need help?</h3>
              <p style={styles.helpText}>
                If this article didn't solve your issue, you can create a support ticket.
              </p>
              <button onClick={() => navigate('/user/create-ticket')} style={styles.createTicketButton}>
                Create Support Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    padding: '20px'
  },
  header: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    padding: '32px',
    borderRadius: '24px',
    marginBottom: '24px',
    boxShadow: '0 8px 30px rgba(14, 165, 233, 0.3)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: '36px',
    fontWeight: '800' as const,
    color: '#ffffff',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: 0
  },
  backButton: {
    padding: '12px 24px',
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700' as const,
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  searchSection: {
    marginBottom: '24px'
  },
  searchInput: {
    width: '100%',
    padding: '16px 20px',
    fontSize: '16px',
    border: '2px solid rgba(14, 165, 233, 0.2)',
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s'
  },
  categoriesSection: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
    padding: '20px',
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
  },
  categoryButton: {
    padding: '10px 20px',
    background: '#f1f5f9',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  categoryButtonActive: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: '#ffffff',
    borderColor: '#0ea5e9',
    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
  },
  articlesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  articleCard: {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '20px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
    border: '2px solid rgba(14, 165, 233, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  articleCategory: {
    display: 'inline-block',
    padding: '4px 12px',
    background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
    color: '#0369a1',
    fontSize: '12px',
    fontWeight: '700' as const,
    borderRadius: '8px',
    marginBottom: '12px'
  },
  articleTitle: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: '#111827',
    margin: '0 0 12px 0'
  },
  articlePreview: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '16px'
  },
  articleMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#9ca3af',
    marginBottom: '12px'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  tagsContainer: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginTop: '12px'
  },
  tag: {
    padding: '4px 10px',
    background: '#f1f5f9',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '600' as const,
    borderRadius: '6px'
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '80px 20px',
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '700' as const,
    color: '#111827',
    margin: '0 0 12px 0'
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0
  },
  articleDetail: {
    maxWidth: '900px',
    margin: '0 auto'
  },
  backToListButton: {
    padding: '12px 24px',
    background: '#ffffff',
    border: '2px solid rgba(14, 165, 233, 0.2)',
    borderRadius: '12px',
    color: '#0ea5e9',
    fontSize: '15px',
    fontWeight: '700' as const,
    cursor: 'pointer',
    marginBottom: '24px',
    transition: 'all 0.3s'
  },
  detailCard: {
    background: '#ffffff',
    padding: '48px',
    borderRadius: '24px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
    border: '2px solid rgba(14, 165, 233, 0.1)'
  },
  detailCategory: {
    display: 'inline-block',
    padding: '6px 16px',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700' as const,
    borderRadius: '10px',
    marginBottom: '16px'
  },
  detailTitle: {
    fontSize: '32px',
    fontWeight: '800' as const,
    color: '#111827',
    margin: '0 0 16px 0',
    lineHeight: '1.3'
  },
  detailMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '14px',
    color: '#9ca3af',
    marginBottom: '24px'
  },
  detailContent: {
    fontSize: '16px',
    lineHeight: '1.8',
    color: '#374151',
    marginTop: '32px',
    marginBottom: '32px'
  },
  detailParagraph: {
    marginBottom: '16px'
  },
  ratingSection: {
    padding: '24px',
    background: '#f9fafb',
    borderRadius: '16px',
    marginBottom: '24px'
  },
  ratingTitle: {
    fontSize: '18px',
    fontWeight: '700' as const,
    color: '#111827',
    margin: '0 0 16px 0'
  },
  ratingButtons: {
    display: 'flex',
    gap: '12px'
  },
  ratingButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700' as const,
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
  },
  ratingButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  ratingThankYou: {
    marginTop: '12px',
    color: '#059669',
    fontWeight: '600' as const,
    fontSize: '14px'
  },
  helpSection: {
    padding: '24px',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    borderRadius: '16px'
  },
  helpTitle: {
    fontSize: '18px',
    fontWeight: '700' as const,
    color: '#111827',
    margin: '0 0 8px 0'
  },
  helpText: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px'
  },
  createTicketButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700' as const,
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
  }
};

export default KnowledgeBase;
