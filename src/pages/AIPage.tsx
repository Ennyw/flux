import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Content, Category } from '@/types';
import { searchTMDB } from '@/utils/tmdb';
import { buildVidkingUrl } from '@/utils/vidking';
import { ContentCard } from '@/components/ContentCard';
import { PlayerModal } from '@/components/PlayerModal';
import { Navbar } from '@/components/Navbar';
import { useRef as useReactRef } from 'react';
import { useSpatialListNavigation } from '@/hooks/useSpatialListNavigation';
import './AIPage.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIPage() {
  const navigate = useNavigate();
  const [currentCategory, setCurrentCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Describe what you're looking for, and I'll find personalized recommendations from our catalog of 75,000+ movies and TV shows.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Content[]>([]);
  const [typingMessage, setTypingMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recGridRef = useReactRef<HTMLDivElement>(null);
  const suggGridRef = useReactRef<HTMLDivElement>(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [playerUrl, setPlayerUrl] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Handle scroll fade indicators
    const scrollContainer = document.querySelector('.recommendations-scroll-container');
    const scrollElement = document.querySelector('.recommendations-grid');
    
    if (!scrollContainer || !scrollElement) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollElement as HTMLElement;
      
      // Show left fade if scrolled right
      if (scrollLeft > 10) {
        scrollContainer.classList.add('show-left-fade');
      } else {
        scrollContainer.classList.remove('show-left-fade');
      }
      
      // Show right fade if not at the end
      if (scrollLeft < scrollWidth - clientWidth - 10) {
        scrollContainer.classList.add('show-right-fade');
      } else {
        scrollContainer.classList.remove('show-right-fade');
      }
    };

    scrollElement.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
    };
  }, [recommendations]);

  // TV remote / D‑pad navigation
  useSpatialListNavigation(recGridRef as any, { itemSelector: '.content-card' });
  useSpatialListNavigation(suggGridRef as any, { itemSelector: '.suggestion-chip' });

  const getAIRecommendations = (userQuery: string): { message: string; searchQueries: string[] } => {
    // Improved keyword-based recommendations with specific movie/show titles
    const query = userQuery.toLowerCase();
    const searchQueries: string[] = [];
    
    // Generate specific search queries based on keywords
    if (query.includes('plot twist') || query.includes('twist')) {
      searchQueries.push('The Sixth Sense', 'Shutter Island', 'Fight Club', 'Inception');
    } else if (query.includes('tv show') || query.includes('series') || query.includes('season')) {
      searchQueries.push('Breaking Bad', 'Game of Thrones', 'Stranger Things', 'The Office');
    } else if (query.includes('action') && query.includes('female')) {
      searchQueries.push('Atomic Blonde', 'Mad Max Fury Road', 'Wonder Woman');
    } else if (query.includes('action')) {
      searchQueries.push('John Wick', 'The Dark Knight', 'Mission Impossible');
    } else if (query.includes('comedy') || query.includes('funny')) {
      searchQueries.push('Superbad', 'The Hangover', '21 Jump Street', 'Step Brothers');
    } else if (query.includes('romantic') && query.includes('2000')) {
      searchQueries.push('The Notebook', '500 Days of Summer', 'Love Actually');
    } else if (query.includes('horror') || query.includes('scary')) {
      searchQueries.push('The Conjuring', 'Get Out', 'A Quiet Place', 'Hereditary');
    } else if (query.includes('psychological') || query.includes('mind')) {
      searchQueries.push('Black Swan', 'Gone Girl', 'Prisoners', 'Shutter Island');
    } else if (query.includes('romance') || query.includes('romantic')) {
      searchQueries.push('The Notebook', 'Pride and Prejudice', 'La La Land');
    } else if (query.includes('sci-fi') || query.includes('science fiction') || query.includes('space')) {
      searchQueries.push('Interstellar', 'Arrival', 'Blade Runner', 'The Martian');
    } else if (query.includes('drama')) {
      searchQueries.push('The Shawshank Redemption', 'Forrest Gump', 'Good Will Hunting');
    } else if (query.includes('family') || query.includes('kids') || query.includes('feel good')) {
      searchQueries.push('Toy Story', 'The Lion King', 'Finding Nemo', 'Up');
    } else if (query.includes('thriller')) {
      searchQueries.push('Se7en', 'The Silence of the Lambs', 'Gone Girl');
    } else if (query.includes('breaking bad')) {
      searchQueries.push('Breaking Bad', 'Better Call Saul', 'Ozark', 'Narcos');
    } else if (query.includes('anime')) {
      searchQueries.push('Attack on Titan', 'Death Note', 'Demon Slayer');
    } else {
      // Default: search for specific popular titles + the query
      searchQueries.push(userQuery, 'Inception', 'The Dark Knight');
    }
    
    // Ensure we have at least 2 queries and limit to 3
    if (searchQueries.length === 1) {
      searchQueries.push(userQuery);
    }
    
    console.log('Search queries:', searchQueries);
    
    return {
      message: `Here are some recommendations based on what you're looking for!`,
      searchQueries: searchQueries.slice(0, 3),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Get recommendations
      const { message, searchQueries } = getAIRecommendations(userMessage);

      // Search TMDB for each query
      const allResults: Content[] = [];
      const seenIds = new Set<string>();

      for (const query of searchQueries.slice(0, 3)) {
        try {
          console.log(`Searching TMDB for: ${query}`);
          const results = await searchTMDB(query);
          console.log(`Found ${results.length} results for: ${query}`);
          // Add unique results
          results.forEach((item: Content) => {
            const key = `${item.type}-${item.id}`;
            if (!seenIds.has(key) && allResults.length < 8) {
              seenIds.add(key);
              allResults.push(item);
            }
          });
        } catch (err) {
          console.error(`Search failed for: ${query}`, err);
        }
      }
      
      console.log(`Total recommendations: ${allResults.length}`);

      // Typewriter effect for AI response
      setIsTyping(true);
      const words = message.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        currentText += (i > 0 ? ' ' : '') + words[i];
        setTypingMessage(currentText);
      }
      
      setIsTyping(false);
      
      // Add assistant message and update recommendations
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: message,
        },
      ]);
      
      setTypingMessage('');
      
      // Update recommendations section
      setRecommendations(allResults);
    } catch (error) {
      console.error('Recommendation error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble getting recommendations right now. Please try again!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayContent = (content: Content) => {
    setSelectedContent(content);
    setPlayerUrl(buildVidkingUrl(content));
  };

  const handleClosePlayer = () => {
    setSelectedContent(null);
    setPlayerUrl('');
  };

  const suggestions = [
    "Action movies with plot twists",
    "Romantic comedies from the 2000s",
    "Dark psychological thrillers",
    "Feel-good family movies",
  ];

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="ai-page">
      <Navbar
        currentCategory={currentCategory}
        onCategoryChange={setCurrentCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
      />

      <div className="ai-container">
        <div className="ai-chat-section">
          <div className="ai-chat-content">
            <div className="ai-chat-left">
              <div className="ai-header-inline">
                <h1>AI Recommendations</h1>
                <p>Describe what you want to watch</p>
              </div>
              <div className="ai-messages">
                {messages.map((msg, index) => (
                  <div key={index} className={`ai-message ${msg.role}`}>
                    <div className="message-avatar">
                      {msg.role === 'assistant' ? 'AI' : 'You'}
                    </div>
                    <div className="message-content">
                      <div className="message-text">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && typingMessage && (
                  <div className="ai-message assistant">
                    <div className="message-avatar">AI</div>
                    <div className="message-content">
                      <div className="message-text">
                        {typingMessage}
                        <span className="typing-cursor">|</span>
                      </div>
                    </div>
                  </div>
                )}

                {isLoading && !isTyping && (
                  <div className="ai-message assistant">
                    <div className="message-avatar">AI</div>
                    <div className="message-content">
                      <div className="message-text">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="ai-suggestions-inline">
              <p className="suggestions-label">Quick suggestions:</p>
              <div className="suggestions-grid" ref={suggGridRef as any}>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="suggestion-chip"
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <form className="ai-input-form" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe what you want to watch..."
                className="ai-input"
                disabled={isLoading}
                autoFocus
              />
              <button
                type="submit"
                className="ai-submit"
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? '...' : '→'}
              </button>
            </form>
          </div>
        </div>

        {isLoading && messages.length > 1 && (
          <div className="ai-recommendations-section">
            <h2 className="recommendations-title">Searching...</h2>
            <div className="loading-skeleton">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="skeleton-card"></div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && recommendations.length > 0 && (
          <div className="ai-recommendations-section">
            <h2 className="recommendations-title">Recommendations</h2>
            <div className="recommendations-scroll-container show-right-fade" id="recommendations-scroll">
              <div className="recommendations-grid" ref={recGridRef as any} tabIndex={0}>
                {recommendations.map((item) => (
                  <ContentCard
                    key={`${item.type}-${item.id}`}
                    content={item}
                    onClick={() => handlePlayContent(item)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <PlayerModal
        content={selectedContent}
        playerUrl={playerUrl}
        onClose={handleClosePlayer}
      />
    </div>
  );
}

