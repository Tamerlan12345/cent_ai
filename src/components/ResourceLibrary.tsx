import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, BookOpen, Wrench, FileText, Layout } from 'lucide-react';
import { loadResources } from '../lib/contentService';
import type { ResourceLink } from '../types';
import './ResourceLibrary.css';

export const ResourceLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeWeek, setActiveWeek] = useState<string>('all');
  const [resourceLinks, setResourceLinks] = useState<ResourceLink[]>([]);

  useEffect(() => {
    loadResources().then(setResourceLinks);
  }, []);

  const categoryLabels: Record<string, string> = {
    docs: 'Документация',
    tools: 'Инструменты',
    templates: 'Шаблоны',
    articles: 'Статьи',
    antigravity: 'Antigravity',
    agents: 'Агенты',
    git: 'Git',
    mcp: 'MCP',
    supabase: 'Supabase',
    security: 'Безопасность',
  };

  const categories = [
    { id: 'all', label: 'Все ресурсы' },
    ...Array.from(new Set(resourceLinks.map((link) => link.category))).map((cat) => ({
      id: cat,
      label: categoryLabels[cat] || cat,
    })),
  ];

  const weeks = [
    { id: 'all', label: 'Все недели' },
    ...Array.from(
      new Set(
        resourceLinks
          .flatMap((link) => link.weekIds || [])
          .filter((w) => typeof w === 'number')
      )
    )
      .sort((a, b) => a - b)
      .map((w) => ({ id: w.toString(), label: `Неделя ${w}` })),
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
    const matchesWeek =
      activeWeek === 'all' || (link.weekIds && link.weekIds.includes(parseInt(activeWeek)));
    return matchesCategory && matchesSearch && matchesWeek;
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

        {/* Filter weeks */}
        <div className="category-filters">
          {weeks.map((w) => (
            <button
              key={w.id}
              onClick={() => setActiveWeek(w.id)}
              className={`filter-btn ${activeWeek === w.id ? 'active' : ''}`}
            >
              {w.label}
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
                  <span>{categoryLabels[link.category] || link.category.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {link.level && (
                    <span className={`badge badge-cyan`}>
                      {link.level === 'required' ? 'Обязательный' : link.level === 'recommended' ? 'Рекомендуемый' : 'Продвинутый'}
                    </span>
                  )}
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
