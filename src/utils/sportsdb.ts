/**
 * Lightweight client for TheSportsDB API
 * 
 * Environment Variables:
 *   VITE_SPORTSDB_API_KEY - Optional API key for TheSportsDB
 *     - Default: "123" (free key, 30 requests/minute)
 *     - Get premium key at: https://www.thesportsdb.com/documentation
 *     - Premium: 100 requests/minute + additional features
 * 
 * Documentation: https://www.thesportsdb.com/documentation
 */

export interface SportsDBLeague {
  idLeague: string;
  strLeague: string;
  strSport: string;
  strLeagueAlternate?: string;
}

export interface SportsDBTeam {
  idTeam: string;
  strTeam: string;
  idLeague?: string;
  strLeague?: string;
  strBadge?: string; // Team logo/badge URL
  strLogo?: string; // Alternative logo field
  strTeamLogo?: string; // Alternative logo field
  strTeamBadge?: string; // Alternative badge field
  strFanart1?: string; // Team fanart (first image)
  strFanart2?: string; // Team fanart (second image)
  strFanart3?: string; // Team fanart (third image)
  strFanart4?: string; // Team fanart (fourth image)
  strBanner?: string; // Team banner image
  strStadium?: string; // Stadium name
  strStadiumThumb?: string; // Stadium thumbnail
}

export interface SportsDBPlayer {
  idPlayer: string;
  idTeam: string;
  strPlayer: string;
  strPosition?: string;
  strThumb?: string; // Player thumbnail image
  strCutout?: string; // Player cutout image (preferred - transparent PNG)
  strStatus?: string; // Active/Inactive
}

export interface SportsDBEvent {
  idEvent: string;
  dateEvent?: string; // YYYY-MM-DD
  strTimestamp?: string; // UTC
  strEvent?: string; // TeamA vs TeamB
  strSport?: string;
  strSeason?: string;
  strLeague?: string;
  idLeague?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  idHomeTeam?: string;
  idAwayTeam?: string;
  intHomeScore?: string;
  intAwayScore?: string;
  strVenue?: string;
}

export interface SportsDBTableRow {
  idStanding: string;
  idTeam: string;
  name: string; // normalized from strTeam
  badge?: string; // strBadge (team logo URL)
  played: number; // intPlayed
  win: number; // intWin
  draw: number; // intDraw
  loss: number; // intLoss
  total?: number; // intPoints
  goalsfor?: number; // intGoalsFor
  goalsagainst?: number; // intGoalsAgainst
  goalsdifference?: number; // intGoalDifference
}

// TheSportsDB free key is "123" per docs. Use that if no key is provided.
// Docs: https://www.thesportsdb.com/documentation
const API_KEY = (import.meta as any).env?.VITE_SPORTSDB_API_KEY || '123';
const BASE = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

// Known league ID shortcuts for fast lookup
const KNOWN_LEAGUES: Record<string, string> = {
  // Football/Soccer
  'premier league': '4328',
  'english premier league': '4328',
  'bundesliga': '4331',
  'la liga': '4335',
  'serie a': '4332',
  'ligue 1': '4334',
  // Basketball
  'nba': '4387',
};

// Rate limiting: track last request time and enforce minimum delay
let lastRequestTime = 0;
const MIN_REQUEST_DELAY = 100; // 100ms between requests (max 10 req/sec)

const safeFetch = async <T>(url: string): Promise<T | null> => {
  try {
    // Rate limiting: ensure minimum delay between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_DELAY) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_DELAY - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    // Always use CORS proxy for TheSportsDB API to avoid CORS issues
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const proxyRes = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (proxyRes.ok) {
      const text = await proxyRes.text();
      try {
        return JSON.parse(text) as T;
      } catch (parseError) {
        console.error('[SportsDB] Failed to parse JSON:', parseError);
        return null;
      }
    } else {
      // Only log if it's not a rate limit (429 is expected sometimes)
      if (proxyRes.status !== 429) {
        console.warn(`[SportsDB] Proxy request failed: ${proxyRes.status} ${proxyRes.statusText}`);
      }
      return null;
    }
  } catch (error: any) {
    // Check if it's a rate limit error
    if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
      // Silently handle rate limits - expected with free API key
      return null;
    }
    // Only log unexpected errors
    if (!error.message?.includes('Failed to fetch') && !error.message?.includes('CORS')) {
      console.error('[SportsDB] Fetch error:', error);
    }
    return null;
  }
};

export const isSportsDBConfigured = (): boolean => {
  // demo key "1" works but is rate-limited; still considered configured
  return Boolean(API_KEY);
};

export const getSeasonString = (now = new Date()): string => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1..12
  // Most football seasons run Aug-May
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
};

export const findLeagueId = async (leagueName: string): Promise<string | null> => {
  const key = KNOWN_LEAGUES[leagueName.toLowerCase()];
  if (key) return key;

  const q = encodeURIComponent(leagueName);
  const data = await safeFetch<{ leagues?: SportsDBLeague[] }>(`${BASE}/searchleagues.php?l=${q}`);
  if (data?.leagues && data.leagues.length > 0) {
    return data.leagues[0].idLeague;
  }
  return null;
};

export const lookupTableByLeagueName = async (leagueName: string, season?: string) => {
  const leagueId = await findLeagueId(leagueName);
  if (!leagueId) return null;
  // Try the target season; if missing, step back to previous seasons (some seasons may not be present yet)
  const seasonsToTry: string[] = [];
  const base = season || getSeasonString();
  seasonsToTry.push(base);
  const [y1, y2] = base.split('-').map(Number);
  if (!isNaN(y1) && !isNaN(y2)) {
    seasonsToTry.push(`${y1 - 1}-${y2 - 1}`);
    seasonsToTry.push(`${y1 - 2}-${y2 - 2}`);
  }

  // Helper to normalize rows
  const normalize = (rows: any[]): SportsDBTableRow[] =>
    rows.map((r: any) => ({
      idStanding: String(r.idStanding),
      idTeam: String(r.idTeam),
      name: r.strTeam,
      badge: r.strBadge,
      played: Number(r.intPlayed),
      win: Number(r.intWin),
      draw: Number(r.intDraw),
      loss: Number(r.intLoss),
      total: r.intPoints != null ? Number(r.intPoints) : undefined,
      goalsfor: r.intGoalsFor != null ? Number(r.intGoalsFor) : undefined,
      goalsagainst: r.intGoalsAgainst != null ? Number(r.intGoalsAgainst) : undefined,
      goalsdifference: r.intGoalDifference != null ? Number(r.intGoalDifference) : undefined,
    }));

  // First try without season (current table)
  const current = await safeFetch<any>(`${BASE}/lookuptable.php?l=${leagueId}`);
  if (current?.table && current.table.length > 0) {
    const normalized = normalize(current.table);
    return normalized;
  }

  // Then try explicit seasons
  for (const s of seasonsToTry) {
    const data = await safeFetch<any>(`${BASE}/lookuptable.php?l=${leagueId}&s=${encodeURIComponent(s)}`);
    if (data?.table && data.table.length > 0) {
      const normalized = normalize(data.table);
      return normalized;
    }
  }
  return null;
};

export const searchTeam = async (teamName: string): Promise<SportsDBTeam | null> => {
  const q = encodeURIComponent(teamName);
  const url = `${BASE}/searchteams.php?t=${q}`;
  
  const data = await safeFetch<{ teams?: SportsDBTeam[] }>(url);
  
  if (data?.teams && data.teams.length > 0) {
    return data.teams[0];
  }
  
  return null;
};

/**
 * Get all players for a team by team ID
 */
export const getTeamPlayers = async (teamId: string): Promise<SportsDBPlayer[]> => {
  const url = `${BASE}/lookup_all_players.php?id=${teamId}`;
  const data = await safeFetch<{ player?: SportsDBPlayer[] }>(url);
  const players = data?.player || [];
  
  // Filter to only active players with images
  return players.filter(p => 
    (p.strCutout || p.strThumb) && 
    (p.strStatus === 'Active' || !p.strStatus)
  );
};

/**
 * Get a random player image from a team (prefer cutout, fallback to thumb)
 * Returns null if no player images are available
 */
export const getRandomPlayerImage = async (teamId: string): Promise<string | null> => {
  try {
    const players = await getTeamPlayers(teamId);
    if (players.length === 0) {
      return null;
    }
    
    // Get players with images
    const playersWithImages = players.filter(p => p.strCutout || p.strThumb);
    if (playersWithImages.length === 0) {
      return null;
    }
    
    // Select a random player
    const randomIndex = Math.floor(Math.random() * playersWithImages.length);
    const player = playersWithImages[randomIndex];
    
    // Prefer cutout (transparent PNG), fallback to thumb
    return player.strCutout || player.strThumb || null;
  } catch (error) {
    return null;
  }
};

/**
 * Get multiple player images and verify they load (returns first valid one)
 * If verification fails, still returns an image URL (browser will handle errors)
 */
export const getValidPlayerImage = async (teamId: string, maxAttempts: number = 5): Promise<string | null> => {
  try {
    const players = await getTeamPlayers(teamId);
    if (players.length === 0) {
      return null;
    }
    
    const playersWithImages = players.filter(p => p.strCutout || p.strThumb);
    if (playersWithImages.length === 0) {
      return null;
    }
    
    // Shuffle players to try different ones
    const shuffled = [...playersWithImages].sort(() => Math.random() - 0.5);
    
    // Try up to maxAttempts players to find one that loads
    for (let i = 0; i < Math.min(maxAttempts, shuffled.length); i++) {
      const player = shuffled[i];
      const imageUrl = player.strCutout || player.strThumb;
      
      if (imageUrl) {
        // Try to verify the image loads (with timeout)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          const response = await fetch(imageUrl, { 
            method: 'HEAD',
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            return imageUrl;
          }
        } catch (fetchError) {
          // If HEAD fails, try with CORS proxy
          try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const proxyResponse = await fetch(proxyUrl, { 
              method: 'HEAD',
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (proxyResponse.ok) {
              return imageUrl;
            }
          } catch (proxyError) {
            // Continue to next player
            continue;
          }
        }
      }
    }
    
    // If verification failed for all, return the first available image anyway
    // (browser will handle errors gracefully)
    const firstPlayer = shuffled[0];
    const fallbackUrl = firstPlayer?.strCutout || firstPlayer?.strThumb || null;
    return fallbackUrl;
  } catch (error) {
    return null;
  }
};

export interface TeamLogoData {
  teamA: {
    name: string;
    logo: string | null;
    background: string | null; // Player image for background
  };
  teamB: {
    name: string;
    logo: string | null;
    background: string | null; // Player image for background
  };
}

/**
 * Extract team names from a stream title and fetch their logos and player images from TheSportsDB
 * Returns team logos and player images if found, null otherwise
 */
export const getTeamLogosFromTitle = async (title: string): Promise<TeamLogoData | null> => {
  const teams = extractTeamsFromTitle(title);
  
  if (!teams.teamA || !teams.teamB) {
    return null;
  }

  try {
    const [teamA, teamB] = await Promise.all([
      searchTeam(teams.teamA),
      searchTeam(teams.teamB),
    ]);

    if (!teamA && !teamB) {
      return null;
    }

    const logoA = teamA?.strBadge || teamA?.strTeamBadge || teamA?.strTeamLogo || teamA?.strLogo || null;
    const logoB = teamB?.strBadge || teamB?.strTeamBadge || teamB?.strTeamLogo || teamB?.strLogo || null;

    // Only return if we got at least one logo
    if (!logoA && !logoB) {
      return null;
    }

    // Fetch player images for both teams in parallel
    // Use getValidPlayerImage which tries multiple players and verifies they load
    const [playerImageA, playerImageB] = await Promise.all([
      teamA?.idTeam ? getValidPlayerImage(teamA.idTeam) : Promise.resolve(null),
      teamB?.idTeam ? getValidPlayerImage(teamB.idTeam) : Promise.resolve(null),
    ]);

    // Fallback to team fanart if no player images available
    const backgroundA = playerImageA || teamA?.strFanart1 || teamA?.strBanner || teamA?.strFanart2 || null;
    const backgroundB = playerImageB || teamB?.strFanart1 || teamB?.strBanner || teamB?.strFanart2 || null;


    return {
      teamA: {
        name: teams.teamA,
        logo: logoA,
        background: backgroundA, // Use fallback if player image unavailable
      },
      teamB: {
        name: teams.teamB,
        logo: logoB,
        background: backgroundB, // Use fallback if player image unavailable
      },
    };
  } catch (error) {
    // Silently fail - CORS issues are expected in browser
    return null;
  }
};

export const getTeamLastEvents = async (teamId: string, limit: number = 10): Promise<SportsDBEvent[]> => {
  const data = await safeFetch<{ results?: SportsDBEvent[] }>(`${BASE}/eventslast.php?id=${teamId}`);
  const events = data?.results ?? [];
  return events.slice(0, limit);
};

export const getTeamPastEvents = async (teamId: string, limit: number = 15): Promise<SportsDBEvent[]> => {
  // Try eventspastleague.php if available, otherwise fall back to eventslast
  try {
    const data = await safeFetch<{ events?: SportsDBEvent[] }>(`${BASE}/eventspastleague.php?id=${teamId}`);
    if (data?.events && data.events.length > 0) {
      return data.events.slice(0, limit);
    }
  } catch (e) {
    // Fallback to eventslast
  }
  const data = await safeFetch<{ results?: SportsDBEvent[] }>(`${BASE}/eventslast.php?id=${teamId}`);
  const events = data?.results ?? [];
  return events.slice(0, limit);
};

export interface HeadToHeadMatch {
  idEvent: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  venue?: string;
  league?: string;
}

export interface HeadToHeadStats {
  totalMatches: number;
  teamAWins: number;
  teamBWins: number;
  draws: number;
  teamAGoals: number;
  teamBGoals: number;
  recentForm: Array<'W' | 'L' | 'D'>; // Last 5 matches from team A's perspective
}

export const getHeadToHead = async (teamA: string, teamB: string): Promise<HeadToHeadMatch[]> => {
  const [a, b] = await Promise.all([searchTeam(teamA), searchTeam(teamB)]);
  
  if (!a?.idTeam || !b?.idTeam) {
    return [];
  }

  // Use past events to get more history
  const [aEvents, bEvents] = await Promise.all([
    getTeamPastEvents(a.idTeam, 50),
    getTeamPastEvents(b.idTeam, 50),
  ]);

  // Find matches where both teams played each other
  // Check Team A's events to see if Team B is the opponent
  const matchedIds = new Set<string>();
  const h2h: SportsDBEvent[] = [];

  // Method 1: ID-based matching (most reliable)
  aEvents.forEach(e => {
    const homeId = e.idHomeTeam;
    const awayId = e.idAwayTeam;
    // Check if this event involves both teams
    if ((homeId === a.idTeam && awayId === b.idTeam) || 
        (homeId === b.idTeam && awayId === a.idTeam)) {
      if (!matchedIds.has(e.idEvent)) {
        matchedIds.add(e.idEvent);
        h2h.push(e);
      }
    }
  });

  // Method 2: String-based matching (fallback if ID matching fails)
  if (h2h.length === 0) {
    const teamALower = (a.strTeam || '').toLowerCase();
    const teamBLower = (b.strTeam || '').toLowerCase();
    
    aEvents.forEach(e => {
      const home = (e.strHomeTeam || '').toLowerCase();
      const away = (e.strAwayTeam || '').toLowerCase();
      
      // Check if both team names appear in this match
      const hasTeamA = home.includes(teamALower) || away.includes(teamALower) || 
                       teamALower.includes(home) || teamALower.includes(away);
      const hasTeamB = home.includes(teamBLower) || away.includes(teamBLower) || 
                       teamBLower.includes(home) || teamBLower.includes(away);
      
      if (hasTeamA && hasTeamB && !matchedIds.has(e.idEvent)) {
        matchedIds.add(e.idEvent);
        h2h.push(e);
      }
    });
  }
  
  // Method 3: Also check Team B's events (in case Team A's events don't have enough history)
  if (h2h.length < 3) {
    bEvents.forEach(e => {
      const homeId = e.idHomeTeam;
      const awayId = e.idAwayTeam;
      if ((homeId === a.idTeam && awayId === b.idTeam) || 
          (homeId === b.idTeam && awayId === a.idTeam)) {
        if (!matchedIds.has(e.idEvent)) {
          matchedIds.add(e.idEvent);
          h2h.push(e);
        }
      }
    });
  }

  const mapped: HeadToHeadMatch[] = h2h
    .map(e => ({
      idEvent: e.idEvent,
      date: e.dateEvent || e.strTimestamp || '',
      homeTeam: e.strHomeTeam || '',
      awayTeam: e.strAwayTeam || '',
      homeScore: e.intHomeScore != null ? Number(e.intHomeScore) : null,
      awayScore: e.intAwayScore != null ? Number(e.intAwayScore) : null,
      venue: e.strVenue,
      league: e.strLeague,
    }))
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  return mapped;
};

export const calculateHeadToHeadStats = (
  matches: HeadToHeadMatch[],
  teamA: string,
  _teamB: string
): HeadToHeadStats => {
  let teamAWins = 0;
  let teamBWins = 0;
  let draws = 0;
  let teamAGoals = 0;
  let teamBGoals = 0;
  const recentForm: Array<'W' | 'L' | 'D'> = [];

  matches.forEach(match => {
    if (match.homeScore === null || match.awayScore === null) return;

    const isTeamAHome = match.homeTeam.toLowerCase().includes(teamA.toLowerCase());
    const teamAScore = isTeamAHome ? match.homeScore : match.awayScore;
    const teamBScore = isTeamAHome ? match.awayScore : match.homeScore;

    teamAGoals += teamAScore;
    teamBGoals += teamBScore;

    if (teamAScore > teamBScore) {
      teamAWins++;
      recentForm.push('W');
    } else if (teamBScore > teamAScore) {
      teamBWins++;
      recentForm.push('L');
    } else {
      draws++;
      recentForm.push('D');
    }
  });

  return {
    totalMatches: matches.length,
    teamAWins,
    teamBWins,
    draws,
    teamAGoals,
    teamBGoals,
    recentForm: recentForm.slice(0, 5).reverse(), // Most recent first
  };
};

export const extractTeamsFromTitle = (title: string): { teamA: string | null; teamB: string | null } => {
  const lower = title.toLowerCase();
  // Try various separators
  const separators = [' vs ', ' v ', ' vs. ', ' @ ', ' - ', ' vs ', ' versus '];
  for (const sep of separators) {
    if (lower.includes(sep)) {
      const parts = title.split(new RegExp(sep, 'i'));
      if (parts.length === 2) {
        const teamA = parts[0].trim();
        const teamB = parts[1].trim();
        // Remove common suffixes that might interfere with search
        const cleanA = teamA.replace(/\s*\(.*?\)\s*$/, '').trim();
        const cleanB = teamB.replace(/\s*\(.*?\)\s*$/, '').trim();
        return { teamA: cleanA, teamB: cleanB };
      }
    }
  }
  
  // Try to find "Team1" and "Team2" pattern
  const vsMatch = title.match(/(.+?)\s+(?:vs|v|versus|@)\s+(.+)/i);
  if (vsMatch && vsMatch.length === 3) {
    return {
      teamA: vsMatch[1].trim().replace(/\s*\(.*?\)\s*$/, ''),
      teamB: vsMatch[2].trim().replace(/\s*\(.*?\)\s*$/, '')
    };
  }
  
  return { teamA: null, teamB: null };
};



