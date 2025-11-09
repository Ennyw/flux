import { Content } from '@/types';
import { useCallback } from 'react';
import { ContentCard } from './ContentCard';
import './ContentGrid.css';

interface ContentGridProps {
  title: string;
  items: Content[];
  onCardClick: (content: Content) => void;
  featured?: boolean;
}

export const ContentGrid = ({ title, items, onCardClick, featured = false }: ContentGridProps) => {
  const handlePreviewChange = useCallback((active: boolean) => {
    // Bubble a custom event so App/Hero can pause banner as a fallback signal
    const ev = new CustomEvent('flux:preview', { detail: { active } });
    window.dispatchEvent(ev);
  }, []);
  
  // Safety check for undefined/null items
  if (!items || items.length === 0) return null;

  return (
    <section className={`content-row ${featured ? 'featured' : ''}`}>
      {title && (
      <div className="row-header">
        <h2 className="row-title">{title}</h2>
        {featured && items.length > 0 && (
          <div className="row-badge">
            <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
              <polyline points="17 2 12 7 7 2"></polyline>
            </svg>
            <span className="badge-text">{items.length} items</span>
          </div>
        )}
      </div>
      )}
      <div className="content-grid">
        {items.map((item, index) => (
          <div key={`${title}-${item.type}-${item.id}-${index}`} className="grid-item">
          <ContentCard
            content={item}
            onClick={() => onCardClick(item)}
            onPreviewChange={handlePreviewChange}
          />
          </div>
        ))}
      </div>
    </section>
  );
};

