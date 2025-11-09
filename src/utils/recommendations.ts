import { Content } from '@/types';
import { getRecommendations } from './tmdb';
import { getContinueWatching, getMyList } from './storage';

interface UserPreferences {
  preferredGenres: string[];
  preferredDecades: number[];
  preferredTypes: ('movie' | 'tv')[];
  avgWatchTime: number;
  completionRate: number;
}

// Analyze watch history to build user preferences
export const analyzePreferences = (): UserPreferences => {
  const watching = getContinueWatching();
  const myList = getMyList();
  const allWatched = [...watching, ...myList];
  
  // Simple analysis - in production would use ML
  const genres: Record<string, number> = {};
  const decades: Record<number, number> = {};
  const types: Record<string, number> = {};
  
  allWatched.forEach(item => {
    // Extract decade from year
    const decade = Math.floor(item.year / 10) * 10;
    decades[decade] = (decades[decade] || 0) + 1;
    types[item.type] = (types[item.type] || 0) + 1;
  });
  
  return {
    preferredGenres: Object.keys(genres).slice(0, 5),
    preferredDecades: Object.entries(decades)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([d]) => parseInt(d)),
    preferredTypes: Object.entries(types)
      .sort(([,a], [,b]) => b - a)
      .map(([t]) => t as 'movie' | 'tv'),
    avgWatchTime: 0, // Would calculate from progress
    completionRate: 0, // Would calculate from progress
  };
};

// Smart recommendations based on user behavior
export const getSmartRecommendations = async (limit: number = 20): Promise<Content[]> => {
  const watching = getContinueWatching();
  if (watching.length === 0) return [];
  
  // Get recommendations from most recent watched items
  const recent = watching.slice(0, 3);
  const allRecs: Content[] = [];
  
  for (const item of recent) {
    try {
      const recs = await getRecommendations(item.type, item.id);
      allRecs.push(...recs);
    } catch (e) {
      // continue
    }
  }
  
  // Deduplicate and return top N
  const seen = new Set<string>();
  return allRecs
    .filter(c => {
      const key = `${c.type}-${c.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
};

// "For You" personalized row
export const getForYouContent = async (): Promise<Content[]> => {
  analyzePreferences(); // Analyze but don't use yet
  const smartRecs = await getSmartRecommendations(10);
  
  // Mix with trending based on preferences
  // In production, would use ML model here
  return smartRecs;
};

