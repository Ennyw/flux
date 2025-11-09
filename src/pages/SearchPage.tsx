import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { ContentGrid } from '@/components/ContentGrid';
import { PlayerModal } from '@/components/PlayerModal';
import { ActorCard } from '@/components/ActorCard';
import { Content, Category } from '@/types';
import { searchTMDBWithActors, getByGenre, getTrendingMovies, getTrendingTV, getContentByPerson, getPersonDetails, TMDBActor, TMDBPersonDetails } from '@/utils/tmdb';
import { buildVidkingUrl } from '@/utils/vidking';
import { addToContinueWatching } from '@/utils/storage';
import './SearchPage.css';

const useQuery = () => new URLSearchParams(useLocation().search);

const GENRES = {
  movie: [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Science Fiction' },
    { id: 10770, name: 'TV Movie' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'War' },
    { id: 37, name: 'Western' },
  ],
  tv: [
    { id: 10759, name: 'Action & Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 10762, name: 'Kids' },
    { id: 9648, name: 'Mystery' },
    { id: 10763, name: 'News' },
    { id: 10764, name: 'Reality' },
    { id: 10765, name: 'Sci-Fi & Fantasy' },
    { id: 10766, name: 'Soap' },
    { id: 10767, name: 'Talk' },
    { id: 10768, name: 'War & Politics' },
    { id: 37, name: 'Western' },
  ],
};

const POPULAR_SEARCHES = [
  'Avengers', 'Breaking Bad', 'Stranger Things', 'The Office', 
  'Game of Thrones', 'Pulp Fiction', 'Friends', 'The Dark Knight'
];

export default function SearchPage() {
  const queryParams = useQuery();
  const navigate = useNavigate();
  const location = useLocation();
  const initialQ = queryParams.get('q') || '';
  const [q, setQ] = useState(initialQ);

  // Clear search when navigating away from search page
  useEffect(() => {
    if (location.pathname !== '/search') {
      setQ('');
    }
  }, [location.pathname]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [genreFilter, setGenreFilter] = useState<number | null>(null);
  const [yearFrom, setYearFrom] = useState<number | ''>('');
  const [yearTo, setYearTo] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'year' | 'title'>('relevance');
  const [results, setResults] = useState<Content[]>([]);
  const [actorResults, setActorResults] = useState<TMDBActor[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedActor, setSelectedActor] = useState<TMDBActor | null>(null);
  const [actorContent, setActorContent] = useState<Content[]>([]);
  const [isLoadingActorContent, setIsLoadingActorContent] = useState(false);
  const [actorDetails, setActorDetails] = useState<TMDBPersonDetails | null>(null);
  const [, setIsLoadingActorDetails] = useState(false);
  const [, setShowSuggestions] = useState(false);
  const [trendingContent, setTrendingContent] = useState<Content[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  // Load trending content for empty state
  useEffect(() => {
    const loadTrending = async () => {
      const [movies, tv] = await Promise.all([
        getTrendingMovies(),
        getTrendingTV(),
      ]);
      setTrendingContent([...movies.slice(0, 10), ...tv.slice(0, 10)]);
    };
    loadTrending();
  }, []);

  const handlePlayContent = (content: Content) => {
    setSelectedContent(content);
    addToContinueWatching(content);
  };

  const handleClosePlayer = () => {
    setSelectedContent(null);
  };

  const handleActorClick = async (actor: TMDBActor) => {
    setSelectedActor(actor);
    setIsLoadingActorContent(true);
    setIsLoadingActorDetails(true);
    try {
      const [content, details] = await Promise.all([
        getContentByPerson(actor.id),
        getPersonDetails(actor.id)
      ]);
      setActorContent(content);
      setActorDetails(details);
    } catch (error) {
      console.error('Error loading actor content:', error);
      setActorContent([]);
      setActorDetails(null);
    } finally {
      setIsLoadingActorContent(false);
      setIsLoadingActorDetails(false);
    }
  };

  const handleCloseActorView = () => {
    setSelectedActor(null);
    setActorContent([]);
    setActorDetails(null);
  };

  // Sync URL with search query
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    navigate({ pathname: '/search', search: params.toString() }, { replace: true });
  }, [q, navigate]);

  // Sync search query with URL params when navigating
  useEffect(() => {
    const urlQ = queryParams.get('q') || '';
    if (urlQ !== q) {
      setQ(urlQ);
    }
  }, [location.search]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q.trim()) { 
      setResults([]);
      setActorResults([]);
      // If genre filter is active, load by genre instead
      if (genreFilter && typeFilter !== 'all') {
        setIsSearching(true);
        getByGenre(typeFilter, genreFilter, 50).then(items => {
          setResults(items);
          setIsSearching(false);
        }).catch(() => setIsSearching(false));
      }
      return; 
    }
    setIsSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const searchResults = await searchTMDBWithActors(q.trim());
        setResults(searchResults.content);
        setActorResults(searchResults.actors);
      } catch {
        setResults([]);
        setActorResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [q, genreFilter, typeFilter]);

  const filtered = useMemo(() => {
    let items = results;
    
    if (typeFilter !== 'all') {
      items = items.filter(i => i.type === typeFilter);
    }
    
    if (typeof yearFrom === 'number') {
      items = items.filter(i => i.year >= yearFrom);
    }
    
    if (typeof yearTo === 'number') {
      items = items.filter(i => i.year <= yearTo);
    }
    
    if (sortBy === 'year') {
      items = [...items].sort((a, b) => b.year - a.year);
    } else if (sortBy === 'title') {
      items = [...items].sort((a, b) => a.title.localeCompare(b.title));
    }
    
    return items;
  }, [results, typeFilter, yearFrom, yearTo, sortBy]);

  // Sort actors by popularity (most popular first)
  const sortedActors = useMemo(() => {
    return [...actorResults].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }, [actorResults]);

  const currentGenres = typeFilter === 'all' ? [...GENRES.movie, ...GENRES.tv] : GENRES[typeFilter];

  return (
    <div className="app">
      <Navbar
        currentCategory={'all' as Category}
        onCategoryChange={(category) => {
          if (category === 'all') {
            navigate('/');
          }
        }}
        searchQuery={q}
        onSearchChange={(val) => {
          setQ(val);
          setShowSuggestions(true);
        }}
        onSearchSubmit={(val) => {
          setQ(val);
          setShowSuggestions(false);
          navigate(`/search?q=${encodeURIComponent(val)}`);
        }}
      />

      <main className="search-page">
        {/* Composed hero section that groups title, search and filters */}
        <section className="search-hero">
          <div className="search-hero-card">
            <div className="search-header-row">
              {/* Transformable search input */}
              <div 
                className={`hero-search-container ${isSearchFocused || q ? 'active' : ''}`}
                onClick={() => {
                  if (!isSearchFocused) {
                    setIsSearchFocused(true);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }
                }}
              >
                {!isSearchFocused && !q && (
                  <div className="hero-search-placeholder">
                    <h1 className="hero-search-title">Search</h1>
                    <p className="hero-search-hint">
                      <span className="cta-text">Click anywhere to start searching</span>
                      <span className="cta-arrow">→</span>
                    </p>
                  </div>
                )}
                
                <div className="hero-search-input-wrapper">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="hero-search-input"
                    placeholder="Search titles, people..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => {
                      if (!q) {
                        setIsSearchFocused(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setShowSuggestions(false);
                        navigate(`/search?q=${encodeURIComponent(q)}`);
                      }
                    }}
                    aria-label="Search titles and people"
                  />
                  {q && (
                    <button
                      className="hero-search-clear"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQ('');
                        setIsSearchFocused(false);
                      }}
                      aria-label="Clear search"
                      type="button"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    className="hero-search-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSuggestions(false);
                      navigate(`/search?q=${encodeURIComponent(q)}`);
                    }}
                    aria-label="Search"
                    type="button"
                  >
                    Search
                  </button>
                </div>
              </div>
              
              {/* Actor Profile Section - Inline with search */}
              {selectedActor && actorDetails && (
                <div className="actor-profile-section-inline">
                  {actorDetails.profile_path && (
                    <div className="actor-profile-image">
                      <img 
                        src={`https://image.tmdb.org/t/p/w185${actorDetails.profile_path}`}
                        alt={actorDetails.name}
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="actor-profile-info">
                    {actorDetails.birthday && (
                      <div className="actor-profile-item">
                        <span className="actor-profile-label">Born:</span>
                        <span className="actor-profile-value">
                          {new Date(actorDetails.birthday).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                          {actorDetails.place_of_birth && ` in ${actorDetails.place_of_birth}`}
                        </span>
                      </div>
                    )}
                    {actorDetails.biography && (
                      <div className="actor-profile-item">
                        <span className="actor-profile-label">Bio:</span>
                        <p className="actor-profile-bio">
                          {actorDetails.biography.length > 150 
                            ? `${actorDetails.biography.substring(0, 150)}...` 
                            : actorDetails.biography}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Filters */}
            <div className="search-filters">
          <div className="filter-group">
            <label>Type</label>
            <div className="filter-buttons">
              {(['all', 'movie', 'tv'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setTypeFilter(t);
                    setGenreFilter(null);
                  }}
                  className={`filter-btn ${typeFilter === t ? 'active' : ''}`}
                >
                  {t === 'all' ? 'All' : t === 'movie' ? 'Movies' : 'TV Shows'}
                </button>
              ))}
            </div>
          </div>

          {currentGenres.length > 0 && (
            <div className="filter-group">
              <label>Genre</label>
              <select
                value={genreFilter || ''}
                onChange={(e) => setGenreFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="genre-select"
              >
                <option value="">All Genres</option>
                {currentGenres.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>Year</label>
            <div className="year-inputs">
              <input
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="From"
                className="year-input"
                min="1900"
                max={new Date().getFullYear()}
              />
              <span className="year-separator">-</span>
              <input
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="To"
                className="year-input"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'relevance' | 'year' | 'title')}
              className="sort-select"
            >
              <option value="relevance">Relevance</option>
              <option value="year">Newest First</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>
            </div>
          </div>
        </section>

        {!q.trim() && !genreFilter && (
          <div className="search-suggestions">
            <h3>Popular Searches</h3>
            <div className="suggestion-tags">
              {POPULAR_SEARCHES.map(term => (
                <button
                  key={term}
                  className="suggestion-tag"
                  onClick={() => {
                    setQ(term);
                    setShowSuggestions(false);
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {isSearching && q.trim() && (
          <div className="search-status">
            <div className="loading-spinner"></div>
            <span>Searching for "{q}"...</span>
          </div>
        )}

        {!isSearching && q.trim() && filtered.length === 0 && (
          <div className="search-status">
            <p className="no-results">No results found for "{q}"</p>
            <p className="no-results-hint">Try adjusting your filters or search for something else</p>
          </div>
        )}

        {!isSearching && !q.trim() && !genreFilter && trendingContent.length > 0 && (
          <div className="trending-section">
            <h2>Trending Now</h2>
            <ContentGrid
              title=""
              items={trendingContent}
              onCardClick={handlePlayContent}
            />
          </div>
        )}

        {/* Actor Results */}
        {!isSearching && actorResults.length > 0 && !selectedActor && (
          <div className="results-section">
            <div className="results-header">
              <h2>People</h2>
              <span className="results-count">{actorResults.length} {actorResults.length === 1 ? 'person' : 'people'}</span>
            </div>
            <div className="actors-grid">
              {sortedActors.map((actor) => (
                <ActorCard
                  key={actor.id}
                  actor={actor}
                  onClick={handleActorClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actor Content View */}
        {selectedActor && (
          <div className="results-section">
            <div className="results-header">
              <button className="back-button" onClick={handleCloseActorView}>
                ← Back to Search
              </button>
            </div>
            {isLoadingActorContent ? (
              <div className="search-status">
                <div className="loading-spinner"></div>
                <span>Loading content...</span>
              </div>
            ) : actorContent.length > 0 ? (
              <ContentGrid
                title=""
                items={actorContent}
                onCardClick={handlePlayContent}
              />
            ) : (
              <div className="search-status">
                <p className="no-results">No content found for {selectedActor.name}</p>
              </div>
            )}
          </div>
        )}

        {/* Content Results */}
        {filtered.length > 0 && !selectedActor && (
          <div className="results-section">
            <div className="results-header">
              <h2>{q.trim() ? `Movies & TV Shows` : 'Browse by Genre'}</h2>
              <span className="results-count">{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</span>
            </div>
            <ContentGrid
              title=""
              items={filtered}
              onCardClick={handlePlayContent}
            />
          </div>
        )}
      </main>

      <PlayerModal
        content={selectedContent}
        playerUrl={selectedContent ? buildVidkingUrl(selectedContent) : ''}
        onClose={handleClosePlayer}
      />
    </div>
  );
}
