const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface TMDBMovie {
    id: number;
    title: string;
    release_date: string;
    poster_path: string | null;
    vote_average?: number;
    original_language?: string;
}

function uniqueByIdAndTitle<T extends { id: number; title?: string; name?: string }>(items: T[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = `${item.id}:${(item.title || item.name || '').trim().toLocaleLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export interface TMDBSeries {
    id: number;
    name: string;
    first_air_date: string;
    poster_path: string | null;
    vote_average?: number;
}

export interface TMDBTvSeasonMeta {
    season_number: number;
    episode_count: number;
}

export interface TMDBTvDetails {
    id: number;
    number_of_seasons: number;
    number_of_episodes: number;
    seasons: TMDBTvSeasonMeta[];
}

type TMDBAlternativeTitlesResponse = {
    results?: Array<{ title?: string }>;
};

export interface TMDBSeasonEpisode {
    episode_number: number;
    name: string;
}

export interface TMDBWatchProvider {
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
}

export interface TMDBMultiResult {
    id: number;
    media_type: 'movie' | 'tv';
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path: string | null;
    vote_average?: number;
}

type TMDBFindResponse = {
    movie_results?: TMDBMovie[];
    tv_results?: TMDBSeries[];
};

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
    if (!query || !query.trim()) return [];

    if (!TMDB_API_KEY) {
        console.error("TMDB API Key missing. Check .env.local");
        return [];
    }

    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`
        );

        if (!response.ok) throw new Error('TMDB Fetch Error');

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error("Error searching TMDB:", error);
        return [];
    }
}

export async function searchSeries(query: string): Promise<TMDBSeries[]> {
    if (!query || !query.trim()) return [];

    if (!TMDB_API_KEY) {
        console.error("TMDB API Key missing. Check .env.local");
        return [];
    }

    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`
        );

        if (!response.ok) throw new Error('TMDB Fetch Error');

        const data = await response.json();
        return uniqueByIdAndTitle(data.results || []);
    } catch (error) {
        console.error("Error searching TMDB series:", error);
        return [];
    }
}

export async function findMovieIdByTitle(title: string, year?: number | null): Promise<number | null> {
    const results = await searchMovies(title);
    if (!results.length) return null;
    if (!year) return results[0].id;

    const sameYear = results.find((movie) => {
        const releaseYear = movie.release_date ? parseInt(movie.release_date.split('-')[0], 10) : null;
        return releaseYear === year;
    });
    return sameYear?.id ?? results[0].id;
}

export async function getMovieWatchProviders(
    movieId: number,
    region = 'BR'
): Promise<TMDBWatchProvider[]> {
    if (!TMDB_API_KEY || !movieId) return [];

    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`
        );
        if (!response.ok) throw new Error('TMDB Providers Fetch Error');

        const data = await response.json();
        const byRegion = data?.results?.[region];
        if (!byRegion) return [];

        const buckets = [
            ...(byRegion.flatrate || []),
            ...(byRegion.rent || []),
            ...(byRegion.buy || []),
        ] as TMDBWatchProvider[];

        const unique = new Map<number, TMDBWatchProvider>();
        for (const provider of buckets) {
            if (!unique.has(provider.provider_id)) unique.set(provider.provider_id, provider);
        }
        return Array.from(unique.values()).slice(0, 5);
    } catch (error) {
        console.error('Error fetching watch providers:', error);
        return [];
    }
}

export async function getMovieDetails(movieId: string | number) {
    if (!TMDB_API_KEY || !movieId) return null;
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=pt-BR`
        );
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

export async function getTvWatchProviders(
    tvId: number,
    region = 'BR'
): Promise<TMDBWatchProvider[]> {
    if (!TMDB_API_KEY || !tvId) return [];

    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/tv/${tvId}/watch/providers?api_key=${TMDB_API_KEY}`
        );
        if (!response.ok) throw new Error('TMDB TV Providers Fetch Error');
        const data = await response.json();
        const byRegion = data?.results?.[region];
        if (!byRegion) return [];

        const buckets = [
            ...(byRegion.flatrate || []),
            ...(byRegion.rent || []),
            ...(byRegion.buy || []),
        ] as TMDBWatchProvider[];

        const unique = new Map<number, TMDBWatchProvider>();
        for (const provider of buckets) {
            if (!unique.has(provider.provider_id)) unique.set(provider.provider_id, provider);
        }
        return Array.from(unique.values()).slice(0, 5);
    } catch (error) {
        console.error('Error fetching TV watch providers:', error);
        return [];
    }
}

export async function getTvDetails(tvId: number): Promise<TMDBTvDetails | null> {
    if (!TMDB_API_KEY || !tvId) return null;
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=pt-BR`
        );
        if (!response.ok) throw new Error('TMDB TV Details Fetch Error');
        const data = await response.json();
        return {
            id: data.id,
            number_of_seasons: data.number_of_seasons ?? 0,
            number_of_episodes: data.number_of_episodes ?? 0,
            seasons: (data.seasons || []).map((season: { season_number?: number; episode_count?: number }) => ({
                season_number: season.season_number ?? 0,
                episode_count: season.episode_count ?? 0,
            })),
        };
    } catch (error) {
        console.error('Error fetching TV details:', error);
        return null;
    }
}

export async function getTvDetailsRaw(tvId: number) {
    if (!TMDB_API_KEY || !tvId) return null;
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=pt-BR`
        );
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error fetching TV details raw:', error);
        return null;
    }
}

// Search responses show only the preferred title. Alternative titles are used
// by the importer to validate an unusual TV Time title before accepting a
// non-exact search result.
export async function getTvAlternativeTitles(tvId: number): Promise<string[]> {
    if (!TMDB_API_KEY || !tvId) return [];
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/tv/${tvId}/alternative_titles?api_key=${TMDB_API_KEY}&language=pt-BR`
        );
        if (!response.ok) return [];
        const data = await response.json() as TMDBAlternativeTitlesResponse;
        return (data.results || [])
            .map((item) => item.title?.trim())
            .filter((title): title is string => Boolean(title));
    } catch (error) {
        console.error('Error fetching TMDB TV alternative titles:', error);
        return [];
    }
}

export async function getTvSeasonEpisodes(tvId: number, seasonNumber: number): Promise<TMDBSeasonEpisode[]> {
    if (!TMDB_API_KEY || !tvId || seasonNumber <= 0) return [];
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=pt-BR`
        );
        if (!response.ok) throw new Error('TMDB TV Season Fetch Error');
        const data = await response.json();
        return (data.episodes || []).map((episode: { episode_number?: number; name?: string }) => ({
            episode_number: episode.episode_number ?? 0,
            name: episode.name ?? `Episodio ${episode.episode_number ?? '?'}`,
        }));
    } catch (error) {
        console.error('Error fetching TV season episodes:', error);
        return [];
    }
}

export async function searchMulti(query: string): Promise<TMDBMultiResult[]> {
    if (!query || !query.trim()) return [];
    if (!TMDB_API_KEY) return [];

    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`
        );
        if (!response.ok) throw new Error('TMDB Multi Fetch Error');

        const data = await response.json();
        return (data.results || []).filter(
            (item: TMDBMultiResult) => item.media_type === 'movie' || item.media_type === 'tv'
        );
    } catch (error) {
        console.error('Error searching TMDB multi:', error);
        return [];
    }
}

export interface TMDBPerson {
    id: number;
    name: string;
    profile_path: string | null;
}

export async function searchPeople(query: string): Promise<TMDBPerson[]> {
    if (!query || !query.trim()) return [];

    if (!TMDB_API_KEY) {
        console.error("TMDB API Key missing. Check .env.local");
        return [];
    }

    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`
        );

        if (!response.ok) throw new Error('TMDB Person Fetch Error');

        const data = await response.json();
        return uniqueByIdAndTitle(data.results || []);
    } catch (error) {
        console.error("Error searching TMDB people:", error);
        return [];
    }
}

async function findByExternalId(externalId: string, source: 'imdb_id' | 'tvdb_id'): Promise<TMDBFindResponse | null> {
    if (!TMDB_API_KEY || !externalId) return null;

    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/find/${encodeURIComponent(externalId)}?api_key=${TMDB_API_KEY}&external_source=${source}&language=pt-BR`
        );
        if (!response.ok) throw new Error('TMDB Find Fetch Error');
        return await response.json();
    } catch (error) {
        console.error('Error resolving external id on TMDB:', error);
        return null;
    }
}

export async function findMovieByExternalId(externalId: string) {
    const data = await findByExternalId(externalId, 'imdb_id');
    return data?.movie_results?.[0] ?? null;
}

export async function findTvByExternalId(externalId: string, source: 'imdb_id' | 'tvdb_id' = 'imdb_id') {
    const data = await findByExternalId(externalId, source);
    return data?.tv_results?.[0] ?? null;
}

export async function getMovieCredits(movieId: string | number) {
    if (!TMDB_API_KEY || !movieId) return null;
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}&language=pt-BR`
        );
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error fetching movie credits:', error);
        return null;
    }
}

export async function getTvCredits(tvId: string | number) {
    if (!TMDB_API_KEY || !tvId) return null;
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/tv/${tvId}/credits?api_key=${TMDB_API_KEY}&language=pt-BR`
        );
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error fetching TV credits:', error);
        return null;
    }
}
