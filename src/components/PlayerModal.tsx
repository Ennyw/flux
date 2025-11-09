import { useEffect, useState, useRef } from 'react';
import { Content, WatchProgress } from '@/types';
import { getProgress, saveProgress, getIntroMarkers, saveIntroMarkers, clearIntroMarkers, toggleMyList, isInMyList } from '@/utils/storage';
import { getSeasonEpisodes, TMDBEpisode, getCredits, TMDBCast, getRecommendations, getTVShowDetails, TMDBTVDetails } from '@/utils/tmdb';
import { WatchParty } from './WatchParty';
import { PlayerControls } from './PlayerControls';
import { buildVidkingUrl } from '@/utils/vidking';
import './PlayerModal.css';

interface PlayerModalProps {
  content: Content | null;
  playerUrl: string;
  onClose: () => void;
}

export const PlayerModal = ({ content, playerUrl, onClose }: PlayerModalProps) => {
  const [progress, setProgress] = useState<WatchProgress | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [currentPlayerUrl, setCurrentPlayerUrl] = useState(playerUrl);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [cast, setCast] = useState<TMDBCast[]>([]);
  const [recommendations, setRecommendations] = useState<Content[]>([]);
  const [inMyList, setInMyList] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [playerTime, setPlayerTime] = useState(0);
  const [showNextOverlay, setShowNextOverlay] = useState<{season:number;episode:number;seconds:number} | null>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeasonRef = useRef<number | null>(null);
  const lastEpisodeRef = useRef<number | null>(null);
  const [skipDone, setSkipDone] = useState(false);
  const [showWatchParty, setShowWatchParty] = useState(false);
  const [, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [tvShowDetails, setTvShowDetails] = useState<TMDBTVDetails | null>(null);
  const [loadingTVDetails, setLoadingTVDetails] = useState(false);
  const [isManualEpisodeSelect, setIsManualEpisodeSelect] = useState(false);
  const manualSelectRef = useRef<{season: number; episode: number} | null>(null);
  const currentContentIdRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  // Removed unused state variables
  const pendingSeekRef = useRef<number | null>(null);
  const hasSeenPlayerReadyRef = useRef(false);
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get actual seasons from TMDB (filter out season 0 which is usually specials)
  const actualSeasons = tvShowDetails?.seasons?.filter(s => s.season_number > 0) || [];
  const totalSeasons = actualSeasons.length > 0 ? actualSeasons.length : (tvShowDetails?.number_of_seasons || 0);

  // Auto-hide controls after 3 seconds of inactivity
  const resetHideControlsTimer = () => {
    // Clear existing timer
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    
    // Show controls
    setShowControls(true);
    
    // Set new timer to hide controls after 3 seconds
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  // Build player URL for a specific episode
  const buildEpisodeUrl = (season: number, episode: number, enableNextEpisode: boolean = false, resumeProgress: boolean = false) => {
    if (!content || content.type !== 'tv') return playerUrl;
    
    const baseUrl = `https://www.vidking.net/embed/tv/${content.id}/${season}/${episode}`;
    const params = new URLSearchParams({
      color: 'e50914',
      autoPlay: 'true',
      episodeSelector: 'true',
      subtitle: 'en', // Auto English subtitles
      subtitleLang: 'en', // English subtitle language
      cc: 'true', // Enable closed captions
      captions: 'true', // Enable captions
    });
    
    // Only enable next episode auto-advance if explicitly requested (for auto-resume scenarios)
    // When user manually selects an episode, don't auto-advance
    if (enableNextEpisode) {
      params.append('nextEpisode', 'true');
    }
    
    // Only resume progress if explicitly requested (for auto-resume, not manual selection)
    if (resumeProgress) {
      const savedProgress = getProgress(content.id, 'tv');
      if (savedProgress && savedProgress.season === season && savedProgress.episode === episode) {
        const minimumResumeSeconds = 60;
        let resumeAt = Math.floor(savedProgress.currentTime || 0);
        
        // If user nearly finished, resume at last minute instead of 99% to avoid instant end
        if (savedProgress.duration && savedProgress.progress > 95) {
          resumeAt = Math.max(0, Math.floor(savedProgress.duration - 60));
        }
        
        // Only apply progress if resume time is significant
        if (resumeAt >= minimumResumeSeconds) {
          // For any resume > 5 minutes, don't use URL progress parameter
          // Instead, save the seek position and seek after player is ready
          // This prevents audio/video desync and buffering issues
          if (resumeAt > 300) { // > 5 minutes
            // Store the target position for later seek via postMessage
            pendingSeekRef.current = resumeAt;
            hasSeenPlayerReadyRef.current = false;
            // Don't add progress param to URL - let player load from start
            // We'll seek after it's ready
          } else {
            // For short resumes (<5min), URL param is fine
            params.append('progress', resumeAt.toString());
          }
        }
      }
    }
    
    return `${baseUrl}?${params.toString()}`;
  };

  // Sync iframe src whenever a new content/playerUrl arrives
  // BUT: Only on initial load or when content changes - not on parent re-renders
  useEffect(() => {
    if (!content) {
      setIsManualEpisodeSelect(false);
      manualSelectRef.current = null;
      currentContentIdRef.current = null;
      hasInitializedRef.current = false;
      return;
    }
    
    // Check if this is a new content item (different show/movie)
    const isNewContent = currentContentIdRef.current !== content.id;
    
    if (!isNewContent && hasInitializedRef.current) {
      // Same content, already initialized - ignore playerUrl prop changes
      // This prevents parent re-renders from resetting the episode
      return;
    }
    
    // New content or first initialization - process playerUrl
    currentContentIdRef.current = content.id;
    hasInitializedRef.current = true;
    manualSelectRef.current = null; // Clear manual selection for new content
    
    if (content.type === 'tv') {
      // Check if playerUrl already specifies a season/episode
      const urlMatch = playerUrl.match(/\/tv\/\d+\/(\d+)\/(\d+)/);
      
      if (urlMatch) {
        const season = parseInt(urlMatch[1]);
        const episode = parseInt(urlMatch[2]);
        setSelectedSeason(season);
        setSelectedEpisode(episode);
        
        // Check if we have saved progress for this exact episode
        // If yes, this is a resume scenario (user returning to continue watching)
        // If no, this is a fresh selection (user clicked a new episode)
        const saved = getProgress(content.id, 'tv');
        const isResuming = saved?.season === season && saved?.episode === episode && saved.progress > 5;
        
        if (isResuming) {
          // User is resuming this episode - enable nextEpisode and resumeProgress
          const resumedUrl = buildEpisodeUrl(season, episode, true, true);
          setCurrentPlayerUrl(resumedUrl);
          setIsManualEpisodeSelect(false);
          // Don't set manualSelectRef - this is auto-resume, not manual selection
          
          // Check if we need to perform a delayed seek (for resumes > 5 min)
          // This happens when buildEpisodeUrl didn't add progress param
          if (saved && saved.currentTime > 300 && pendingSeekRef.current === null) {
            pendingSeekRef.current = Math.floor(saved.currentTime);
            hasSeenPlayerReadyRef.current = false;
          }
          return;
        } else {
          // Fresh episode selection (either new episode or no saved progress)
          // Don't enable nextEpisode for explicit fresh selections
          const explicitUrl = buildEpisodeUrl(season, episode, false, false);
          setCurrentPlayerUrl(explicitUrl);
          setIsManualEpisodeSelect(true);
          manualSelectRef.current = { season, episode };
          setTimeout(() => setIsManualEpisodeSelect(false), 5000);
          return;
        }
      }
      
      // No specific episode in URL - use saved progress to resume where they left off
      // Enable nextEpisode and resumeProgress for auto-resume scenarios (when not explicitly selecting)
      const saved = getProgress(content.id, 'tv');
      if (saved?.season && saved?.episode) {
        setSelectedSeason(saved.season);
        setSelectedEpisode(saved.episode);
        // Use buildEpisodeUrl with enableNextEpisode=true and resumeProgress=true for auto-resume
        const rebuilt = buildEpisodeUrl(saved.season, saved.episode, true, true);
        setCurrentPlayerUrl(rebuilt);
        setIsManualEpisodeSelect(false);
        
        // Check if we need to perform a delayed seek (for resumes > 5 min)
        if (saved && saved.currentTime > 300 && pendingSeekRef.current === null) {
          pendingSeekRef.current = Math.floor(saved.currentTime);
          hasSeenPlayerReadyRef.current = false;
        }
        return;
      }
    }
    
    // Only set playerUrl if we don't have a manual selection
    setCurrentPlayerUrl(playerUrl);
    setIsManualEpisodeSelect(false);
    
    // For movies, also check if we need delayed seek
    if (content.type === 'movie') {
      const saved = getProgress(content.id, 'movie');
      if (saved && saved.currentTime > 300 && pendingSeekRef.current === null) {
        pendingSeekRef.current = Math.floor(saved.currentTime);
        hasSeenPlayerReadyRef.current = false;
      }
    }
  }, [playerUrl, content]);

  // Handle episode selection (user explicitly clicked an episode)
  const handleEpisodeSelect = (season: number, episode: number) => {
    setSelectedSeason(season);
    setSelectedEpisode(episode);
    
    // Mark that this is a manual selection (prevents next episode overlay and URL parsing overrides)
    setIsManualEpisodeSelect(true);
    manualSelectRef.current = { season, episode };
    
    // When user explicitly selects an episode, don't enable nextEpisode auto-advance
    // This prevents it from auto-playing the next episode when re-watching
    const newUrl = buildEpisodeUrl(season, episode, false, false);
    setCurrentPlayerUrl(newUrl);
    
    // Save the episode selection to progress but RESET watch progress to 0
    // This ensures when re-watching, it starts from the beginning, not where they left off
    if (content) {
      const newProgress: WatchProgress = {
        id: content.id,
        mediaType: 'tv',
        currentTime: 0, // Reset to beginning
        duration: 0,
        progress: 0, // Reset progress
        lastWatched: Date.now(),
        season: season,
        episode: episode,
      };
      saveProgress(newProgress);
      setProgress(newProgress);
    }
    
    // Reset manual select flag after a longer delay (30 seconds instead of 5)
    // This prevents URL parsing from overriding manual selections
    setTimeout(() => {
      setIsManualEpisodeSelect(false);
      // Keep the ref for longer to prevent resets
      setTimeout(() => {
        manualSelectRef.current = null;
      }, 60000); // Clear ref after 1 minute total
    }, 30000);
  };

  // This effect only syncs progress state, NOT episode selection
  // Episode selection is handled by the first useEffect and handleEpisodeSelect
  useEffect(() => {
    if (content) {
      const savedProgress = getProgress(content.id, content.type);
      setProgress(savedProgress);
      
      // Don't extract episode info from URL here - that's handled by the first useEffect
      // This effect only syncs progress state
    }
  }, [content]);

  // Fetch TV show details (number of seasons) when content changes
  useEffect(() => {
    if (content && content.type === 'tv') {
      setLoadingTVDetails(true);
      getTVShowDetails(content.id)
        .then(details => {
          setTvShowDetails(details);
          if (details) {
            // Filter out season 0 (specials) and get actual seasons
            const validSeasons = details.seasons?.filter(s => s.season_number > 0) || [];
            if (validSeasons.length > 0) {
              // If current selected season is invalid, reset to first valid season
              const maxSeason = Math.max(...validSeasons.map(s => s.season_number));
              if (selectedSeason > maxSeason || selectedSeason < 1) {
                setSelectedSeason(validSeasons[0].season_number);
              }
            } else if (details.number_of_seasons > 0) {
              // Fallback to number_of_seasons if seasons array is empty
              if (selectedSeason > details.number_of_seasons) {
                setSelectedSeason(details.number_of_seasons);
              }
            }
          }
          setLoadingTVDetails(false);
        })
        .catch(() => {
          setTvShowDetails(null);
          setLoadingTVDetails(false);
        });
    } else {
      setTvShowDetails(null);
    }
  }, [content]);

  // Fetch episodes when season changes
  useEffect(() => {
    if (content && content.type === 'tv' && selectedSeason > 0) {
      setLoadingEpisodes(true);
      getSeasonEpisodes(content.id, selectedSeason)
        .then(data => {
          setEpisodes(data);
          setLoadingEpisodes(false);
        })
        .catch(() => {
          setEpisodes([]);
          setLoadingEpisodes(false);
        });
    }
  }, [content, selectedSeason]);

  // Fetch cast and recommendations when content changes
  useEffect(() => {
    if (!content) return;
    setInMyList(isInMyList(content));
    const type = content.type;
    getCredits(type, content.id).then(setCast).catch(() => setCast([]));
    getRecommendations(type, content.id).then(setRecommendations).catch(() => setRecommendations([]));
  }, [content]);

  // Listen to player events to track currentTime and ended
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Allow all Vidking domains (vidking.net, vidking1.net, vidking2.net, etc.)
      if (!event.origin.includes('vidking')) return;
      const raw = event.data as unknown;
      const parsed: any = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : (raw && typeof raw === 'object' ? raw : null);
      if (!parsed || parsed.type !== 'PLAYER_EVENT') return;
      const data = parsed.data || {};
      
      // Check if player is ready and we have a pending seek
      if ((data.event === 'play' || data.event === 'timeupdate') && !hasSeenPlayerReadyRef.current && pendingSeekRef.current !== null) {
        hasSeenPlayerReadyRef.current = true;
        const targetTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
        
        // Wait a moment for player to be fully ready, then seek
        setTimeout(() => {
          if (iframeRef.current?.contentWindow && currentPlayerUrl) {
            try {
              const url = new URL(currentPlayerUrl);
              const origin = url.origin;
              
              // Send seek command via postMessage
              iframeRef.current.contentWindow.postMessage({
                type: 'SEEK',
                seconds: targetTime
              }, origin);
              
              if (import.meta.env.DEV) {
                console.log(`Seeking to ${targetTime}s after player ready`);
              }
            } catch (error) {
              console.error('Failed to seek after player ready:', error);
            }
          }
        }, 1500); // Wait 1.5 seconds for player to buffer
      }
      
      if (typeof data.currentTime === 'number') setPlayerTime(data.currentTime);
      if (typeof data.season === 'number') lastSeasonRef.current = data.season;
      if (typeof data.episode === 'number') lastEpisodeRef.current = data.episode;
      if (data.event === 'ended' && content?.type === 'tv' && !isManualEpisodeSelect) {
        // Only show next episode overlay if this wasn't a manual episode selection
        // (prevents overlay when re-watching an episode)
        const curSeason = (lastSeasonRef.current ?? selectedSeason);
        const curEpisode = (lastEpisodeRef.current ?? selectedEpisode);
        const nextEp = curEpisode + 1;
        setShowNextOverlay({ season: curSeason, episode: nextEp, seconds: 5 });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [content, selectedSeason, selectedEpisode, isManualEpisodeSelect, currentPlayerUrl]);

  // Countdown for next episode autoplay
  useEffect(() => {
    if (!showNextOverlay) return;
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    if (showNextOverlay.seconds <= 0) {
      handleEpisodeSelect(showNextOverlay.season, showNextOverlay.episode);
      setShowNextOverlay(null);
      return;
    }
    nextTimerRef.current = setTimeout(() => {
      setShowNextOverlay(prev => prev ? { ...prev, seconds: prev.seconds - 1 } : null);
    }, 1000);
    return () => { if (nextTimerRef.current) clearTimeout(nextTimerRef.current); };
  }, [showNextOverlay]);

  // Auto-skip intro based on user markers
  useEffect(() => {
    if (!content || content.type !== 'tv') return;
    const markers = getIntroMarkers(content.id);
    if (!markers) return;
    if (skipDone) return;
    if (playerTime >= markers.start && playerTime < markers.end) {
      // reload iframe at markers.end to skip
      const url = new URL(currentPlayerUrl);
      url.searchParams.set('progress', Math.floor(markers.end).toString());
      setCurrentPlayerUrl(url.toString());
      setSkipDone(true);
    }
  }, [playerTime, content, currentPlayerUrl, skipDone]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // ESC - Close player
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Only handle player shortcuts when modal is open
      if (!content || !iframeRef.current) return;

      const iframe = iframeRef.current;
      const iframeWindow = iframe.contentWindow;
      
      if (!iframeWindow || !currentPlayerUrl) return;

      try {
        const url = new URL(currentPlayerUrl);
        const origin = url.origin;

        switch (e.key) {
          case ' ': // Space - Play/Pause
            e.preventDefault();
            iframeWindow.postMessage({
              type: 'PLAY_PAUSE',
              action: 'toggle'
            }, origin);
            break;

          case 'ArrowLeft': // Seek backward 10 seconds
            e.preventDefault();
            const seekBack = Math.max(0, playerTime - 10);
            iframeWindow.postMessage({
              type: 'SEEK',
              seconds: seekBack
            }, origin);
            break;

          case 'ArrowRight': // Seek forward 10 seconds
            e.preventDefault();
            const seekForward = playerTime + 10;
            iframeWindow.postMessage({
              type: 'SEEK',
              seconds: seekForward
            }, origin);
            break;

          case 'm':
          case 'M': // Mute/Unmute
            e.preventDefault();
            iframeWindow.postMessage({
              type: 'MUTE_TOGGLE',
              action: 'toggle'
            }, origin);
            break;

          case 'f':
          case 'F': // Fullscreen (already handled elsewhere, but keeping for consistency)
            e.preventDefault();
            const container = playerContainerRef.current;
            if (container) {
              container.requestFullscreen?.() || 
              (container as any).webkitRequestFullscreen?.() ||
              (container as any).mozRequestFullScreen?.() ||
              (container as any).msRequestFullscreen?.();
            }
            break;
        }
      } catch (error) {
        // Silently fail if postMessage doesn't work
        console.debug('Keyboard shortcut failed:', error);
      }
    };
    
    if (content) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [content, onClose, currentPlayerUrl, playerTime]);

  // Handle fullscreen requests from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from vidking.net
      if (!event.origin.includes('vidking.net')) return;

      // Handle various fullscreen request formats
      const isFullscreenRequest = 
        event.data?.type === 'FULLSCREEN_REQUEST' || 
        event.data?.action === 'fullscreen' ||
        event.data?.command === 'fullscreen' ||
        event.data?.event === 'fullscreen' ||
        event.data?.message === 'fullscreen' ||
        event.data?.method === 'fullscreen';

      // Also check for fullscreen toggle
      const isFullscreenToggle = 
        event.data?.type === 'FULLSCREEN_TOGGLE' ||
        event.data?.action === 'toggleFullscreen';

      if (isFullscreenRequest || isFullscreenToggle) {
        const container = playerContainerRef.current;
        const iframe = iframeRef.current;
        
        if (!container && !iframe) return;

        const requestFullscreen = (element: HTMLElement): Promise<void> => {
          if (element.requestFullscreen) {
            return element.requestFullscreen();
          } else if ((element as any).webkitRequestFullscreen) {
            return (element as any).webkitRequestFullscreen();
          } else if ((element as any).mozRequestFullScreen) {
            return (element as any).mozRequestFullScreen();
          } else if ((element as any).msRequestFullscreen) {
            return (element as any).msRequestFullscreen();
          }
          return Promise.reject(new Error('Fullscreen not supported'));
        };

        // Try to fullscreen the container first (more reliable)
        requestFullscreen(container || iframe!).catch(err => {
          console.log('Fullscreen request failed:', err);
          // Fallback: try iframe if container failed
          if (container && iframe && container !== iframe) {
            requestFullscreen(iframe).catch(() => {
              console.log('Iframe fullscreen also failed');
            });
          }
        });
      }
    };

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      if (isFullscreen && playerContainerRef.current) {
        // Ensure container styles are correct when fullscreen
        const container = playerContainerRef.current;
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.maxWidth = 'none';
        container.style.aspectRatio = 'auto';
        container.style.borderRadius = '0';
        container.style.margin = '0';
      } else if (playerContainerRef.current) {
        // Reset styles when exiting fullscreen
        const container = playerContainerRef.current;
        container.style.width = '';
        container.style.height = '';
        container.style.maxWidth = '';
        container.style.aspectRatio = '';
        container.style.borderRadius = '';
        container.style.margin = '';
      }
    };

    // Keyboard shortcut for fullscreen (F key)
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const container = playerContainerRef.current;
        const iframe = iframeRef.current;
        
        if (!container && !iframe) return;

        const requestFullscreen = (element: HTMLElement): Promise<void> => {
          if (element.requestFullscreen) {
            return element.requestFullscreen();
          } else if ((element as any).webkitRequestFullscreen) {
            return (element as any).webkitRequestFullscreen();
          } else if ((element as any).mozRequestFullScreen) {
            return (element as any).mozRequestFullScreen();
          } else if ((element as any).msRequestFullscreen) {
            return (element as any).msRequestFullscreen();
          }
          return Promise.reject(new Error('Fullscreen not supported'));
        };

        const exitFullscreen = (): Promise<void> => {
          if (document.exitFullscreen) {
            return document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            return (document as any).webkitExitFullscreen();
          } else if ((document as any).mozCancelFullScreen) {
            return (document as any).mozCancelFullScreen();
          } else if ((document as any).msExitFullscreen) {
            return (document as any).msExitFullscreen();
          }
          return Promise.reject(new Error('Exit fullscreen not supported'));
        };

        const isFullscreen = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        );

        if (isFullscreen) {
          exitFullscreen().catch(() => {});
        } else {
          requestFullscreen(container || iframe!).catch(() => {});
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('keydown', handleKeyPress);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  if (!content) return null;

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine if resuming and format the resume message
  const isResuming = progress && progress.progress > 5 && progress.progress < 95;
  const resumeInfo = isResuming ? {
    time: formatTime(progress.currentTime),
    percentage: Math.round(progress.progress),
  } : null;

  return (
    <div className={`watch-modal ${!showControls ? 'hide-cursor' : ''}`} onMouseMove={resetHideControlsTimer}>
      {showControls && (
        <button className="modal-close" onClick={onClose} title="Close (ESC)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
      
      {/* Hero Section with Backdrop */}
      <div 
        className="modal-hero"
        style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${content.backdrop})` }}
      >
        <div className="modal-hero-gradient"></div>
        <div className="modal-hero-content">
          <h1 className="modal-title">{content.title}</h1>
          
          <div className="modal-meta">
            <span className="meta-badge">{content.year}</span>
            <span className="meta-dot">•</span>
            <span className="meta-type">{content.type === 'movie' ? 'Movie' : 'TV Show'}</span>
            {content.type === 'tv' && progress && (
              <>
                <span className="meta-dot">•</span>
                <span className="meta-episode">
                  S{progress.season?.toString().padStart(2, '0') || '01'}:E{progress.episode?.toString().padStart(2, '0') || '01'}
                </span>
              </>
            )}
          </div>

          <p className="modal-description">{content.description}</p>

          <div className="modal-actions">
            <button className="btn-modal btn-play" onClick={() => {}}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              {isResuming ? `Resume (${resumeInfo?.percentage}%)` : 'Play Now'}
            </button>
            <button className="btn-modal btn-secondary" onClick={() => {
              if (!content) return;
              const nowIn = toggleMyList(content);
              setInMyList(nowIn);
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              {inMyList ? 'Remove from List' : 'Add to List'}
            </button>
            <button className="btn-modal btn-icon" onClick={() => {}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
            <button 
              className="btn-modal btn-party" 
              onClick={() => setShowWatchParty(true)}
              title="Start Watch Party"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Watch Together
            </button>
          </div>
        </div>
      </div>

      {/* Player Section */}
      <div className="modal-player-section">
        <div 
          className="player-container"
          ref={playerContainerRef}
          onMouseMove={resetHideControlsTimer}
          onMouseEnter={resetHideControlsTimer}
          onDoubleClick={() => {
            // Double-click to enter fullscreen
            const container = playerContainerRef.current;
            if (!container) return;
            
            const requestFullscreen = (element: HTMLElement) => {
              if (element.requestFullscreen) {
                return element.requestFullscreen();
              } else if ((element as any).webkitRequestFullscreen) {
                return (element as any).webkitRequestFullscreen();
              } else if ((element as any).mozRequestFullScreen) {
                return (element as any).mozRequestFullScreen();
              } else if ((element as any).msRequestFullscreen) {
                return (element as any).msRequestFullscreen();
              }
              return Promise.reject(new Error('Fullscreen not supported'));
            };
            
            requestFullscreen(container).catch((err: unknown) => {
              console.log('Fullscreen request failed:', err);
            });
          }}
          style={{ position: 'relative', cursor: 'pointer' }}
        >
          <iframe
            key={currentPlayerUrl}
            ref={iframeRef}
            src={currentPlayerUrl}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; display-capture"
            referrerPolicy="no-referrer-when-downgrade"
            title={content.title}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
          
          {showControls && (
            <PlayerControls
              onSpeedChange={(speed) => {
                setPlaybackSpeed(speed);
                // Send speed command to iframe (if Vidking supports it)
                if (iframeRef.current?.contentWindow && currentPlayerUrl) {
                  try {
                    const url = new URL(currentPlayerUrl);
                    iframeRef.current.contentWindow.postMessage({
                      type: 'SET_PLAYBACK_SPEED',
                      speed: speed
                    }, url.origin);
                  } catch (e) {
                    // Fallback to vidking.net if URL parsing fails
                    iframeRef.current.contentWindow.postMessage({
                      type: 'SET_PLAYBACK_SPEED',
                      speed: speed
                    }, 'https://www.vidking.net');
                  }
                }
              }}
              onSkipRecap={() => {
                // Skip forward 90 seconds (typical recap length)
                if (iframeRef.current?.contentWindow && currentPlayerUrl) {
                  try {
                    const url = new URL(currentPlayerUrl);
                    iframeRef.current.contentWindow.postMessage({
                      type: 'SEEK',
                      seconds: playerTime + 90
                    }, url.origin);
                  } catch (e) {
                    // Fallback to vidking.net if URL parsing fails
                    iframeRef.current.contentWindow.postMessage({
                      type: 'SEEK',
                      seconds: playerTime + 90
                    }, 'https://www.vidking.net');
                  }
                }
              }}
              hasRecap={content.type === 'tv'}
              onFullscreen={() => {
                const container = playerContainerRef.current;
                const iframe = iframeRef.current;
                
                if (!container && !iframe) return;

                const requestFullscreen = (element: HTMLElement): Promise<void> => {
                  if (element.requestFullscreen) {
                    return element.requestFullscreen();
                  } else if ((element as any).webkitRequestFullscreen) {
                    return (element as any).webkitRequestFullscreen();
                  } else if ((element as any).mozRequestFullScreen) {
                    return (element as any).mozRequestFullScreen();
                  } else if ((element as any).msRequestFullscreen) {
                    return (element as any).msRequestFullscreen();
                  }
                  return Promise.reject(new Error('Fullscreen not supported'));
                };

                const exitFullscreen = (): Promise<void> => {
                  if (document.exitFullscreen) {
                    return document.exitFullscreen();
                  } else if ((document as any).webkitExitFullscreen) {
                    return (document as any).webkitExitFullscreen();
                  } else if ((document as any).mozCancelFullScreen) {
                    return (document as any).mozCancelFullScreen();
                  } else if ((document as any).msExitFullscreen) {
                    return (document as any).msExitFullscreen();
                  }
                  return Promise.reject(new Error('Exit fullscreen not supported'));
                };

                const isFullscreen = !!(
                  document.fullscreenElement ||
                  (document as any).webkitFullscreenElement ||
                  (document as any).mozFullScreenElement ||
                  (document as any).msFullscreenElement
                );

                if (isFullscreen) {
                  exitFullscreen().catch(() => {});
                } else {
                  requestFullscreen(container || iframe!).catch(() => {});
                }
              }}
            />
          )}

        {/* Next episode overlay */}
        {showNextOverlay && (
          <div className="next-overlay">
            <div>Next episode in {showNextOverlay.seconds}s</div>
            <div className="next-actions">
              <button className="season-btn" onClick={() => handleEpisodeSelect(showNextOverlay.season, showNextOverlay.episode)}>Play Now</button>
              <button className="season-btn" onClick={() => setShowNextOverlay(null)}>Cancel</button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Episode Selector - Only for TV Shows */}
      {content.type === 'tv' && (
        <div className="modal-episodes-section">
          <div className="episodes-container">
            <h2>Episodes</h2>
            
            {/* Season Selector */}
            {loadingTVDetails ? (
              <div className="episodes-loading">Loading seasons...</div>
            ) : actualSeasons.length > 0 ? (
              <div className="season-selector">
                {actualSeasons.map(season => (
                  <button
                    key={season.season_number}
                    className={`season-btn ${selectedSeason === season.season_number ? 'active' : ''}`}
                    onClick={() => setSelectedSeason(season.season_number)}
                  >
                    {season.name || `Season ${season.season_number}`}
                  </button>
                ))}
              </div>
            ) : totalSeasons > 0 ? (
            <div className="season-selector">
              {Array.from({ length: totalSeasons }, (_, i) => i + 1).map(season => (
                <button
                  key={season}
                  className={`season-btn ${selectedSeason === season ? 'active' : ''}`}
                  onClick={() => setSelectedSeason(season)}
                >
                  Season {season}
                </button>
              ))}
            </div>
            ) : (
              <div className="episodes-loading">No seasons available</div>
            )}

            {/* Episode Grid */}
            {loadingEpisodes ? (
              <div className="episodes-loading">Loading episodes...</div>
            ) : (
              <div className="episodes-grid">
                {episodes.map((ep) => {
                  const episodeNum = ep.episode_number;
                  const isWatched = progress && 
                    progress.season === selectedSeason && 
                    progress.episode && 
                    progress.episode >= episodeNum;
                  const isCurrent = progress && 
                    progress.season === selectedSeason && 
                    progress.episode === episodeNum;

                  const thumbnailUrl = ep.still_path 
                    ? `https://image.tmdb.org/t/p/w400${ep.still_path}`
                    : null;

                  return (
                    <div
                      key={ep.id}
                      className={`episode-card-netflix ${isCurrent ? 'current' : ''} ${isWatched ? 'watched' : ''}`}
                      onClick={() => handleEpisodeSelect(selectedSeason, episodeNum)}
                    >
                      {thumbnailUrl ? (
                        <div className="episode-thumbnail">
                          <img src={thumbnailUrl} alt={ep.name} />
                          <div className="episode-play-overlay">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className="episode-thumbnail-fallback">
                          <div className="episode-number-large">{episodeNum}</div>
                        </div>
                      )}
                      
                      <div className="episode-info">
                        <div className="episode-header">
                          <span className="episode-number-small">{episodeNum}.</span>
                          <h4 className="episode-name">{ep.name}</h4>
                        </div>
                        {ep.overview && (
                          <p className="episode-overview">{ep.overview}</p>
                        )}
                        {ep.runtime && (
                          <span className="episode-runtime">{ep.runtime}m</span>
                        )}
                      </div>

                      {isCurrent && <div className="episode-badge-netflix">Watching</div>}
                      {isWatched && !isCurrent && (
                        <svg className="episode-check-netflix" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Grid */}
      <div className="modal-info-grid">
        <div className="info-card">
          <h3>Details</h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="info-label">Type</span>
              <span className="info-value">{content.type === 'movie' ? 'Feature Film' : 'Television Series'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Year</span>
              <span className="info-value">{content.year}</span>
            </div>
            {progress && (
              <div className="info-row">
                <span className="info-label">Last Watched</span>
                <span className="info-value">{new Date(progress.lastWatched).toLocaleDateString()}</span>
              </div>
            )}
            {isResuming && resumeInfo && (
              <div className="info-row">
                <span className="info-label">Progress</span>
                <span className="info-value">{resumeInfo.time} ({resumeInfo.percentage}%)</span>
              </div>
            )}
          </div>
        </div>
        {content.type === 'tv' && (
          <div className="info-card" style={{ marginTop: '1.5rem' }}>
            <h3>Playback Helpers</h3>
            <div className="info-rows">
              <div className="info-row" style={{ gap: '1rem' }}>
                <span className="info-label">Intro Skip</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="season-btn" onClick={() => {
                    const m = getIntroMarkers(content.id) || { start: 0, end: 0 };
                    saveIntroMarkers(content.id, { ...m, start: Math.floor(playerTime) });
                    setSkipDone(false);
                  }}>Set start ({Math.floor(playerTime)}s)</button>
                  <button className="season-btn" onClick={() => {
                    const m = getIntroMarkers(content.id) || { start: 0, end: 0 };
                    saveIntroMarkers(content.id, { ...m, end: Math.floor(playerTime) });
                    setSkipDone(false);
                  }}>Set end ({Math.floor(playerTime)}s)</button>
                  <button className="season-btn" onClick={() => { clearIntroMarkers(content.id); setSkipDone(false); }}>Clear</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Cast Row */}
        {cast.length > 0 && (
          <div className="info-card" style={{ marginTop: '1.5rem' }}>
            <h3>Cast</h3>
            <div className="cast-row">
              {cast.slice(0, 12).map(person => (
                <div key={person.id} className="cast-card">
                  {person.profile_path ? (
                    <img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt={person.name} />
                  ) : (
                    <div className="cast-fallback">{person.name.split(' ').map(p=>p[0]).slice(0,2).join('')}</div>
                  )}
                  <div className="cast-name">{person.name}</div>
                  {person.character && <div className="cast-role">{person.character}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* More Like This */}
        {recommendations.length > 0 && (
          <div className="info-card" style={{ marginTop: '1.5rem' }}>
            <h3>More like this</h3>
            <div className="morelike-grid">
              {recommendations.slice(0, 12).map(item => (
                <div key={`${item.type}-${item.id}`} className="morelike-card" onClick={() => {
                  setCurrentPlayerUrl('');
                  // open this recommendation in the same modal
                  // we rely on parent to pass new content; if not available, emulate minimal
                }}>
                  <img src={`https://image.tmdb.org/t/p/w342${item.poster}`} alt={item.title} />
                  <div className="morelike-meta">
                    <div className="morelike-title">{item.title}</div>
                    <div className="morelike-sub">{item.year} • {item.type === 'movie' ? 'Movie' : 'TV Show'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showWatchParty && content && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
          <WatchParty
            content={content}
            playerUrl={buildVidkingUrl(content)}
            onClose={() => {
              setShowWatchParty(false);
              onClose(); // Also close the main modal when watch party closes
            }}
          />
        </div>
      )}
    </div>
  );
};

