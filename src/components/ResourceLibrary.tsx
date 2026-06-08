import React, { useState } from 'react';
import { Search, ExternalLink, BookOpen, Wrench, FileText, Layout } from 'lucide-react';
import { resourceLinks } from '../content/courseData';
import './ResourceLibrary.css';

export const ResourceLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Все ресурсы' },
    { id: 'docs', label: 'Документация' },
    { id: 'tools', label: 'Инструменты' },
    { id: 'templates', label: 'Шаблоны' },
    { id: 'articles', label: 'Статьи' },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'docs':
        return <BookOpen size={16} />;
      case 'tools':
        return <Wrench size={16} />;
      case 'templates':
        return <Layout size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const filteredLinks = resourceLinks.filter((link) => {
    const matchesCategory = activeCategory === 'all' || link.category === activeCategory;
    const matchesSearch =
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="resources-section">
      <div className="resources-header">
        <h2 className="resources-title">Инженерная Библиотека</h2>
        <p className="resources-subtitle">
          Полезные материалы, официальная документация и инструменты для углубления в вайбкодинг
        </p>
      </div>

      <div className="resources-toolbar">
        {/* Search */}
        <div className="search-wrapper glass-panel">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Filter categories */}
        <div className="category-filters">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`filter-btn ${activeCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {filteredLinks.length > 0 ? (
        <div className="resources-grid">
          {filteredLinks.map((link) => (
            <div key={link.id} className="resource-card glass-panel">
              <div className="resource-card-header">
                <div className={`category-tag ${link.category}`}>
                  {getCategoryIcon(link.category)}
                  <span>{link.category.toUpperCase()}</span>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link-icon"
                  title="Открыть в новой вкладке"
                >
                  <ExternalLink size={16} />
                </a>
              </div>

              <h3 className="resource-card-title">{link.title}</h3>
              <p className="resource-card-desc">{link.description}</p>

              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="resource-card-action btn btn-secondary"
              >
                Изучить ресурс
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-resources glass-panel">
          <p>По вашему запросу ничего не найдено. Попробуйте изменить фильтр или поисковый запрос.</p>
        </div>
      )}
    </section>
  );
};
