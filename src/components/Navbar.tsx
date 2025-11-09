import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Category } from '@/types';
import './Navbar.css';
import { useSpatialListNavigation } from '@/hooks/useSpatialListNavigation';

interface NavbarProps {
  currentCategory: Category;
  onCategoryChange: (category: Category) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onShuffle?: () => void;
  onHelp?: () => void;
  onSearchSubmit?: (query: string) => void;
}

export const Navbar = ({ currentCategory, onCategoryChange, searchQuery, onSearchChange, onShuffle, onHelp, onSearchSubmit }: NavbarProps) => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const linksRef = useRef<HTMLDivElement>(null);
  useSpatialListNavigation(linksRef as any, { itemSelector: '.nav-link' });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleHomeClick = () => {
    navigate('/');
    onCategoryChange('all');
    onSearchChange(''); // Clear search when navigating to home
  };

  const handleMoviesClick = () => {
    if (location.pathname !== '/') {
      navigate('/');
    }
    onCategoryChange('movies');
  };

  const handleTVClick = () => {
    if (location.pathname !== '/') {
      navigate('/');
    }
    onCategoryChange('tv');
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <div
          className="nav-brand"
          tabIndex={0}
          role="button"
          aria-label="Flux Home"
          onClick={handleHomeClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleHomeClick();
            }
          }}
        >
          Flux
        </div>
        
        <div className="nav-links" ref={linksRef as any} tabIndex={0}>
          <button
            className={`nav-link ${currentCategory === 'all' && location.pathname === '/' ? 'active' : ''}`}
            onClick={handleHomeClick}
            aria-label="Home"
          >
            Home
          </button>
          <button
            className={`nav-link ${location.pathname === '/ai' ? 'active' : ''}`}
            onClick={() => navigate('/ai')}
            aria-label="AI Recommendations"
          >
            AI
          </button>
          <button
            className={`nav-link ${currentCategory === 'movies' && location.pathname === '/' ? 'active' : ''}`}
            onClick={handleMoviesClick}
            aria-label="Movies"
          >
            Movies
          </button>
          <button
            className={`nav-link ${currentCategory === 'tv' && location.pathname === '/' ? 'active' : ''}`}
            onClick={handleTVClick}
            aria-label="TV Shows"
          >
            TV Shows
          </button>
          <button
            className={`nav-link ${location.pathname === '/sports' ? 'active' : ''}`}
            onClick={() => {
              onCategoryChange('sports');
              navigate('/sports');
            }}
            aria-label="Sports"
          >
            Sports
          </button>
        </div>

        <div className="nav-search">
          <input
            type="text"
            placeholder="Search titles..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSearchSubmit && onSearchSubmit((e.target as HTMLInputElement).value);
              }
            }}
          />
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', marginLeft: '0.5rem' }}>
          <button
            className="theme-toggle"
            title="Surprise Me"
            onClick={() => onShuffle && onShuffle()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h5l2 3-2 3H4"/>
              <path d="M20 4h-5l-7 10H4"/>
              <path d="M4 20h5l7-10h5"/>
            </svg>
          </button>
          <button
            className="theme-toggle"
            title="Keyboard Shortcuts (?)"
            onClick={() => onHelp && onHelp()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4"/>
              <line x1="12" y1="17" x2="12" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

