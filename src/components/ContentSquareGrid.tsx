import { Content } from '@/types';
import { useCallback } from 'react';
import { ContentCard } from './ContentCard';
import './ContentSquareGrid.css';

interface ContentSquareGridProps {
  title: string;
  items: Content[];
  onCardClick: (content: Content) => void;
  actorPhoto?: string | null;
}

export const ContentSquareGrid = ({ title, items, onCardClick, actorPhoto }: ContentSquareGridProps) => {
  const handlePreviewChange = useCallback((active: boolean) => {
    const ev = new CustomEvent('flux:preview', { detail: { active } });
    window.dispatchEvent(ev);
  }, []);
  
  if (!items || items.length === 0) return null;

  return (
    <section className="content-square-grid-section">
      <div className="square-grid-header">
        {actorPhoto ? (
          <div className="square-grid-header-with-photo">
            <img 
              src={`https://image.tmdb.org/t/p/w185${actorPhoto}`}
              alt={title}
              className="actor-photo"
            />
            <h2 className="square-grid-title">{title}</h2>
          </div>
        ) : (
          <h2 className="square-grid-title">{title}</h2>
        )}
      </div>
      <div className="square-grid-container">
        {items.map((item, index) => (
          <div 
            key={`${title}-${item.type}-${item.id}-${index}`} 
            className="square-grid-item"
          >
            <ContentCard
              content={item}
              onClick={() => onCardClick(item)}
              onPreviewChange={handlePreviewChange}
              variant="square"
            />
          </div>
        ))}
      </div>
    </section>
  );
};

