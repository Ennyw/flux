import { memo, useState, useEffect, useRef } from 'react';
import { Stream } from '@/types';
import { isStreamLive, isStreamUpcoming, formatStreamTime } from '@/utils/streams';
import { getTeamLogosFromTitle, TeamLogoData } from '@/utils/sportsdb';
import './StreamCard.css';

interface StreamCardProps {
  stream: Stream;
  onClick: (stream: Stream) => void;
}

export const StreamCard = memo(({ stream, onClick }: StreamCardProps) => {
  const live = isStreamLive(stream);
  const upcoming = isStreamUpcoming(stream);
  const [teamLogos, setTeamLogos] = useState<TeamLogoData | null>(null);
  const [, setLogosLoading] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const loadingRef = useRef<Set<string>>(new Set());

  // Preload and verify background images load successfully
  useEffect(() => {
    if (!teamLogos) return;

    const preloadImage = (url: string, teamKey: 'teamA' | 'teamB') => {
      if (!url || loadingRef.current.has(url) || loadedImages.has(url) || failedImages.has(url)) {
        return;
      }

      loadingRef.current.add(url);
      const img = new Image();
      img.onload = () => {
        loadingRef.current.delete(url);
        setLoadedImages(prev => {
          const newSet = new Set(prev);
          newSet.add(url);
          return newSet;
        });
      };
      img.onerror = () => {
        loadingRef.current.delete(url);
        console.warn(`[StreamCard] Failed to load background image for ${teamKey}:`, url);
        setFailedImages(prev => {
          const newSet = new Set(prev);
          newSet.add(url);
          return newSet;
        });
      };
      img.src = url;
    };

    if (teamLogos.teamA.background) {
      preloadImage(teamLogos.teamA.background, 'teamA');
    }
    if (teamLogos.teamB.background) {
      preloadImage(teamLogos.teamB.background, 'teamB');
    }
  }, [teamLogos, loadedImages, failedImages]);

  // Fetch team logos when component mounts - always try to get logos for sports streams
  useEffect(() => {
    const fetchLogos = async () => {
      // Always try to fetch team logos for sports streams
      if (stream.name) {
        setLogosLoading(true);
        setLoadedImages(new Set());
        setFailedImages(new Set());
        try {
          const logos = await getTeamLogosFromTitle(stream.name);
          if (logos && (logos.teamA.logo || logos.teamB.logo)) {
            setTeamLogos(logos);
          }
        } catch (error) {
          // Silently fail - CORS issues are expected
        } finally {
          setLogosLoading(false);
        }
      }
    };

    fetchLogos();
  }, [stream.name]);

  const hasTeamLogos = teamLogos && (teamLogos.teamA.logo || teamLogos.teamB.logo);
  
  return (
    <div 
      className="stream-card"
      onClick={() => onClick(stream)}
      tabIndex={0}
      role="button"
      aria-label={`${stream.name} - ${stream.category_name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(stream);
        }
      }}
    >
      <div className="stream-card-image-container">
        {hasTeamLogos ? (
          <div className="stream-card-team-logos">
            {/* Background images for each team - show immediately, hide if they fail */}
            {teamLogos.teamA.background && !failedImages.has(teamLogos.teamA.background) && (
              <div 
                className="team-background team-background-left"
                style={{ 
                  backgroundImage: `url(${teamLogos.teamA.background})`,
                  opacity: loadedImages.has(teamLogos.teamA.background) ? 0.65 : 0.3
                }}
              />
            )}
            {teamLogos.teamB.background && !failedImages.has(teamLogos.teamB.background) && (
              <div 
                className="team-background team-background-right"
                style={{ 
                  backgroundImage: `url(${teamLogos.teamB.background})`,
                  opacity: loadedImages.has(teamLogos.teamB.background) ? 0.65 : 0.3
                }}
              />
            )}
            
            {/* Overlay for better logo visibility */}
            <div className="stream-card-team-logos-overlay"></div>
            
            {teamLogos.teamA.logo && (
              <div className="team-logo-wrapper">
                <img 
                  src={teamLogos.teamA.logo} 
                  alt={teamLogos.teamA.name}
                  className="team-logo"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="team-logos-vs">VS</div>
            {teamLogos.teamB.logo && (
              <div className="team-logo-wrapper">
                <img 
                  src={teamLogos.teamB.logo} 
                  alt={teamLogos.teamB.name}
                  className="team-logo"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        ) : stream.poster ? (
          <img 
            src={stream.poster} 
            alt={stream.name}
            className="stream-card-poster"
            loading="lazy"
          />
        ) : (
          <div className="stream-card-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="10 8 16 12 10 16 10 8"/>
            </svg>
          </div>
        )}
        
        {(live || upcoming) && (
          <div className={`stream-badge ${live ? 'live' : 'upcoming'}`}>
            {live ? (
              <>
                <span className="live-dot"></span>
                LIVE
              </>
            ) : (
              'UPCOMING'
            )}
          </div>
        )}
      </div>
      
      <div className="stream-card-overlay">
        <div className="stream-card-title">{stream.name}</div>
        <div className="stream-card-meta">
          <span className="stream-tag">{stream.tag}</span>
          {upcoming && (
            <>
              <span>•</span>
              <span className="stream-time">{formatStreamTime(stream.starts_at)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if stream data actually changed
  return prevProps.stream.id === nextProps.stream.id &&
         prevProps.stream.name === nextProps.stream.name &&
         prevProps.stream.iframe === nextProps.stream.iframe &&
         prevProps.stream.starts_at === nextProps.stream.starts_at &&
         prevProps.stream.ends_at === nextProps.stream.ends_at &&
         prevProps.stream.always_live === nextProps.stream.always_live;
});

