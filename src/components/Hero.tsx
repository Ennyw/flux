import { useState, useEffect, useRef } from 'react';
import { Content } from '@/types';
import { getBackdropUrl } from '@/data/content';
import './Hero.css';

interface HeroProps {
  content: Content[];
  onPlay: (content: Content) => void;
  onInfo: (content: Content) => void;
}

export const Hero = ({ content, onPlay, onInfo }: HeroProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isContentTransitioning, setIsContentTransitioning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance slides every 5 seconds (paused on hover)
  useEffect(() => {
    if (content.length <= 1) return;

    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setIsContentTransitioning(true);
        setTimeout(() => {
          setCurrentSlide((prev) => (prev + 1) % content.length);
          setIsContentTransitioning(false);
        }, 300);
      }, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [content.length, isPaused]);

  const goToSlide = (index: number) => {
    setIsContentTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setIsContentTransitioning(false);
      setIsPaused(true);
      // Resume auto-play after 8 seconds
      setTimeout(() => setIsPaused(false), 8000);
    }, 300);
  };

  const goToPrevious = () => {
    setIsContentTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + content.length) % content.length);
      setIsContentTransitioning(false);
      setIsPaused(true);
      setTimeout(() => setIsPaused(false), 8000);
    }, 300);
  };

  const goToNext = () => {
    setIsContentTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % content.length);
      setIsContentTransitioning(false);
      setIsPaused(true);
      setTimeout(() => setIsPaused(false), 8000);
    }, 300);
  };

  if (content.length === 0) return null;

  const currentContent = content[currentSlide];

  return (
    <section 
      className="hero hero-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides Container */}
      <div className="hero-slides">
        {content.map((item, index) => {
          // Normalize backdrop path - ensure it starts with /
          const backdropPath = item.backdrop && item.backdrop !== '/placeholder.jpg' 
            ? (item.backdrop.startsWith('/') ? item.backdrop : `/${item.backdrop}`)
            : null;
          
          const backdropUrl = backdropPath ? getBackdropUrl(backdropPath) : '';
          
          // Debug logging (only in dev mode, only for first slide)
          if (import.meta.env.DEV && index === 0) {
            console.log('Hero slide data:', {
              title: item.title,
              backdrop: item.backdrop,
              backdropPath,
              backdropUrl,
            });
          }
          
          return (
            <div
              key={`${item.id}-${index}`}
              className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
            >
              {backdropUrl ? (
                <>
                  <img
                    src={backdropUrl}
                    alt={item.title}
                    className="hero-slide-image"
                    onError={(e) => {
                      if (import.meta.env.DEV) {
                console.error('Hero backdrop failed to load:', backdropUrl, 'for', item.title);
              }
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      if (index === 0) {
                        if (import.meta.env.DEV) {
                console.log('Hero backdrop loaded successfully:', backdropUrl);
              }
                      }
                    }}
                  />
                  <div className="hero-slide-backdrop" style={{ backgroundImage: `url(${backdropUrl})` }} />
                </>
              ) : (
                <div className="hero-slide-placeholder" />
              )}
            </div>
          );
        })}
      </div>

      <div className="hero-gradient"></div>
      
      {/* Navigation Arrows */}
      {content.length > 1 && (
        <>
          <button
            className="hero-nav-btn hero-nav-prev"
            onClick={goToPrevious}
            aria-label="Previous slide"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button
            className="hero-nav-btn hero-nav-next"
            onClick={goToNext}
            aria-label="Next slide"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </>
      )}

      {/* Slide Indicators */}
      {content.length > 1 && (
        <div className="hero-indicators">
          {content.map((_, index) => (
            <button
              key={index}
              className={`hero-indicator ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      <div className={`hero-content ${isContentTransitioning ? 'transitioning' : ''}`}>
        <h1 className="hero-title">{currentContent.title}</h1>
        <p className="hero-description">{currentContent.description}</p>
        <div className="hero-buttons">
          <button 
            className="btn btn-primary" 
            onClick={() => onPlay(currentContent)}
            aria-label="Play Now"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Play Now
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => onInfo(currentContent)}
            aria-label="More Info"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4M12 8h.01"></path>
            </svg>
            More Info
          </button>
        </div>
        <div className="hero-meta">
          <span>{currentContent.year}</span>
          <span className="separator">•</span>
          <span>{currentContent.type === 'movie' ? 'Movie' : 'TV Series'}</span>
          {content.length > 1 && (
            <>
              <span className="separator">•</span>
              <span>{currentSlide + 1} / {content.length}</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

