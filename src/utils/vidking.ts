import { Content } from '@/types';
import { getProgress } from './storage';

/**
 * Builds Vidking embed URL for content.
 * Note: Vidking is a third-party streaming service (vidking.net, vidking1.net, vidking2.net, etc.)
 * The developer has no control or responsibility for content provided by Vidking.
 * Our postMessage handlers accept messages from any vidking domain.
 */
export const buildVidkingUrl = (content: Content, forceSeason?: number, forceEpisode?: number): string => {
  // Map known legacy IDs to correct TMDB IDs
  const legacyMap: Record<string, number> = {
    'tv:2288': 1398, // Sopranos
  };
  const mappedId = legacyMap[`${content.type}:${content.id}`] ?? content.id;

  let url = `https://www.vidking.net/embed/${content.type}/${mappedId}`;
  
  // For TV shows, use saved episode/season info or provided values
  if (content.type === 'tv') {
    // If season/episode are explicitly provided (user clicked a specific episode), use those
    // Otherwise, use saved progress, then content defaults, then 1/1
    const season = forceSeason ?? (content.season ?? getProgress(mappedId, content.type)?.season ?? 1);
    const episode = forceEpisode ?? (content.episode ?? getProgress(mappedId, content.type)?.episode ?? 1);

    url += `/${season}/${episode}`;
  }
  
  const params = new URLSearchParams({
    color: 'e50914', // Netflix red
    autoPlay: 'true',
    subtitle: 'en', // Auto English subtitles
    subtitleLang: 'en', // English subtitle language
    cc: 'true', // Enable closed captions
    captions: 'true', // Enable captions
  });
  
  if (content.type === 'tv') {
    params.append('nextEpisode', 'true');
    params.append('episodeSelector', 'true');
  }
  
  // Resume from last position if available (only after meaningful watch time)
  const progress = getProgress(mappedId, content.type);
  if (progress) {
    // Ignore tiny previews: require at least 60s watched to resume
    const minimumResumeSeconds = 60;
    let resumeAt = Math.floor(progress.currentTime || 0);

    // If user nearly finished, resume at last minute instead of 99% to avoid instant end
    if (progress.duration && progress.progress > 95) {
      resumeAt = Math.max(0, Math.floor(progress.duration - 60));
    }

    if (resumeAt >= minimumResumeSeconds) {
      // For resumes > 5 minutes, don't use URL progress parameter
      // PlayerModal will handle seeking via postMessage after player is ready
      // This prevents audio/video desync and buffering issues
      if (resumeAt > 300) { // > 5 minutes
        // Don't add progress param - PlayerModal will seek after ready
        // Just let player load from start
      } else {
        // For short resumes (<5min), URL param is fine
        params.append('progress', resumeAt.toString());
      }
    }
  }
  
  return `${url}?${params.toString()}`;
};

// Lightweight preview URL: starts from 0, no resume, minimal params
export const buildVidkingPreviewUrl = (content: Content): string => {
  const legacyMap: Record<string, number> = {
    'tv:2288': 1398,
  };
  const mappedId = legacyMap[`${content.type}:${content.id}`] ?? content.id;

  let url = `https://www.vidking.net/embed/${content.type}/${mappedId}`;

  if (content.type === 'tv') {
    // Use saved season/episode if available (for correct episode), but do not resume time
    const progress = getProgress(mappedId, content.type);
    const season = (progress?.season ?? content.season ?? 1);
    const episode = (progress?.episode ?? content.episode ?? 1);
    url += `/${season}/${episode}`;
  }

  const params = new URLSearchParams({
    color: 'e50914',
    autoPlay: 'true',
    muted: '1',
  });
  // No nextEpisode/episodeSelector to keep player light; no progress param
  return `${url}?${params.toString()}`;
};

