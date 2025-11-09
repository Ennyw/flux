import { useEffect, useRef } from 'react';
import { WatchProgress } from '@/types';
import { saveProgress } from '@/utils/storage';

export const usePlayerTracking = () => {
  const lastSavedAtRef = useRef(0);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Allow all Vidking domains (vidking.net, vidking1.net, vidking2.net, etc.)
      if (!event.origin.includes('vidking')) return;

      try {
        // Some browsers deliver structured objects, others deliver JSON strings
        const raw = event.data as unknown;
        const parsed: any =
          typeof raw === 'string' ? JSON.parse(raw) : (raw && typeof raw === 'object' ? raw : null);
        if (!parsed || parsed.type !== 'PLAYER_EVENT') return;

        const eventData = parsed.data;

        // Persist progress cautiously to avoid UI stutter and noisy writes
        if (eventData.event === 'timeupdate' || eventData.event === 'pause' || eventData.event === 'ended') {
          let currentTime = Number(eventData.currentTime) || 0;
          const duration = Number(eventData.duration) || 0;
          let progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

          // Ignore micro-updates from brief previews (< 60s) unless it's an "ended" event
          const watchedSeconds = Math.floor(currentTime);
          if (eventData.event === 'timeupdate' && watchedSeconds < 60) return;

          // Throttle saves to at most once every 5s for timeupdates
          const now = Date.now();
          const isTerminal = eventData.event === 'pause' || eventData.event === 'ended' || eventData.event === 'seeked';
          if (!isTerminal && now - lastSavedAtRef.current < 5000) return;

          // If ended or near-complete, cap at last minute to allow resuming
          if (eventData.event === 'ended' || progressPercent > 95) {
            currentTime = Math.max(0, Math.floor(duration - 60));
            progressPercent = duration > 0 ? (currentTime / duration) * 100 : 95;
          }

          const progress: WatchProgress = {
            id: parseInt(eventData.id),
            mediaType: eventData.mediaType,
            currentTime,
            duration,
            progress: progressPercent,
            lastWatched: now,
            ...(eventData.season && { season: eventData.season }),
            ...(eventData.episode && { episode: eventData.episode }),
          };

          saveProgress(progress);
          lastSavedAtRef.current = now;

          // Optional debug (commented to reduce noise)
          // console.debug('Progress saved', progress);
        }
      } catch (error) {
        // Swallow non-JSON events without spamming the console
        // console.debug('Non-JSON player message ignored');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
};

