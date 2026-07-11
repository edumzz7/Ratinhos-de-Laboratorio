import { addPersonalMovie, addSeries, getSeriesStatus, updateSeries } from './appData';
import {
  findMovieByExternalId,
  findTvByExternalId,
  getMovieDetails,
  getMovieWatchProviders,
  getTvAlternativeTitles,
  getTvDetails,
  getTvDetailsRaw,
  getTvWatchProviders,
  searchMovies,
  searchMulti,
  searchSeries,
  type TMDBMovie,
  type TMDBSeries,
} from './tmdb';
import type { MovieStatus, PersonalMovie, SeriesEntry } from '../types/app';

type TVTimeRow = {
  type: string;
  media_type: string;
  tmdb_id: string;
  imdb_id: string;
  tvdb_id: string;
  title: string;
  year: string;
  season: string;
  episode: string;
  watched_at: string;
  rating: string;
  review: string;
};

type CsvInput = {
  name: string;
  text: string;
};

type ParsedSeedResult = {
  movies: ParsedMovieSeed[];
  series: ParsedSeriesSeed[];
  parseWarnings: string[];
};

type ParsedMovieSeed = {
  title: string;
  year: number | null;
  status: MovieStatus;
  tmdbId: number | null;
  imdbId: string | null;
  rating: number | null;
  review: string | null;
  watchedAt: string | null;
};

type ParsedSeriesSeed = {
  title: string;
  year: number | null;
  tmdbId: number | null;
  imdbId: string | null;
  tvdbId: string | null;
  seasonEpisodes: Map<number, Set<number>>;
  rating: number | null;
  review: string | null;
  watchedAt: string | null;
};

type ImportMoviePayload = Omit<PersonalMovie, 'id' | 'user_id' | 'created_at'>;
type ImportSeriesPayload = Omit<SeriesEntry, 'id' | 'user_id' | 'created_at'>;
type ResolvedSeriesImport =
  | { kind: 'series'; payload: ImportSeriesPayload }
  | { kind: 'movie'; payload: ImportMoviePayload };

export type TVTimeImportReport = {
  moviesImported: number;
  seriesImported: number;
  moviesSkipped: number;
  seriesSkipped: number;
  alreadyRegistered: number;
  duplicatesInImport: number;
  seriesRepaired: number;
  skippedTitles: string[];
  unresolvedTitles: string[];
  parseWarnings: string[];
};

export type TVTimeImportFileRead = {
  csvInputs: CsvInput[];
  warnings: string[];
};

function normalizeText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Used for identity comparisons only. It intentionally treats editorial
// variants such as "Morde e Assopra" and "Morde & Assopra" as the same
// title, without weakening the TMDB search itself.
function normalizeTitleIdentity(value: string) {
  return normalizeText(value)
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleSimilarity(left: string, right: string) {
  const a = normalizeTitleIdentity(left);
  const b = normalizeTitleIdentity(right);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }

  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

function splitTitleAndYear(value: string) {
  const match = value.trim().match(/^(.*?)\s*\((\d{4})\)\s*$/);
  return {
    title: match?.[1].trim() || value.trim(),
    year: match ? Number(match[2]) : null,
  };
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentField = '';
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((field) => field.trim() !== ''));
}

function readUint16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

function looksLikeZip(file: File) {
  return file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
}

function isLikelyUsefulCsvName(name: string) {
  const normalized = name.toLowerCase();
  if (!normalized.endsWith('.csv')) return false;
  // The additional episode files complement gaps in V2. Episodes are merged into
  // sets later, so duplicated records cannot inflate a series' progress.
  return (
    normalized.endsWith('tracking-prod-records-v2.csv') ||
    normalized.endsWith('tracking-prod-records.csv') ||
    normalized.endsWith('watched_on_episode.csv') ||
    normalized.endsWith('rewatched_episode.csv') ||
    normalized.endsWith('seen_episode_source.csv') ||
    normalized.includes('tv-time-export')
  );
}

async function inflateRaw(bytes: Uint8Array) {
  const DecompressionStreamCtor = globalThis.DecompressionStream;
  if (!DecompressionStreamCtor) {
    throw new Error('Este navegador nao consegue descompactar ZIP deflate localmente.');
  }

  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStreamCtor('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipCsvInputs(file: File): Promise<TVTimeImportFileRead> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder('utf-8');
  const warnings: string[] = [];

  let eocdOffset = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 66000); offset -= 1) {
    if (readUint32(view, offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error('Nao foi possivel ler o ZIP enviado.');
  }

  const entryCount = readUint16(view, eocdOffset + 10);
  const centralDirectoryOffset = readUint32(view, eocdOffset + 16);
  const csvInputs: CsvInput[] = [];
  let cursor = centralDirectoryOffset;

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (readUint32(view, cursor) !== 0x02014b50) break;

    const compressionMethod = readUint16(view, cursor + 10);
    const compressedSize = readUint32(view, cursor + 20);
    const nameLength = readUint16(view, cursor + 28);
    const extraLength = readUint16(view, cursor + 30);
    const commentLength = readUint16(view, cursor + 32);
    const localHeaderOffset = readUint32(view, cursor + 42);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));

    cursor += 46 + nameLength + extraLength + commentLength;

    if (!isLikelyUsefulCsvName(name)) continue;

    if (readUint32(view, localHeaderOffset) !== 0x04034b50) {
      warnings.push(`${name}: cabecalho ZIP invalido.`);
      continue;
    }

    const localNameLength = readUint16(view, localHeaderOffset + 26);
    const localExtraLength = readUint16(view, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedBytes = bytes.slice(dataStart, dataStart + compressedSize);

    try {
      const contentBytes =
        compressionMethod === 0
          ? compressedBytes
          : compressionMethod === 8
            ? await inflateRaw(compressedBytes)
            : null;

      if (!contentBytes) {
        warnings.push(`${name}: metodo de compressao nao suportado.`);
        continue;
      }

      csvInputs.push({ name, text: decoder.decode(contentBytes) });
    } catch (error) {
      warnings.push(`${name}: ${error instanceof Error ? error.message : 'falha ao descompactar.'}`);
    }
  }

  if (csvInputs.length === 0) {
    throw new Error('Nenhum CSV de historico foi encontrado no ZIP.');
  }

  return { csvInputs, warnings };
}

export async function readTvTimeImportFile(file: File): Promise<TVTimeImportFileRead> {
  if (looksLikeZip(file)) {
    return readZipCsvInputs(file);
  }

  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    throw new Error('Envie um arquivo .csv ou .zip exportado do TV Time.');
  }

  return {
    csvInputs: [{ name: file.name || 'tv-time-export.csv', text: await file.text() }],
    warnings: [],
  };
}

function normalizeHeaderName(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function mapHeaderIndexes(header: string[]) {
  const normalized = header.map(normalizeHeaderName);
  const findIndex = (...candidates: string[]) => normalized.findIndex((item) => candidates.includes(item));
  const findContainingIndex = (...needles: string[]) => normalized.findIndex((item) => needles.some((needle) => item.includes(needle)));

  return {
    type: findIndex('type', 'action', 'event_type', 'activity_type', 'tracking_type'),
    media_type: findIndex('media_type', 'media', 'content_type', 'record_type', 'recordable_type', 'item_type', 'entity_type', 'object_type', 'model_type', 'kind'),
    tmdb_id: findIndex('tmdb_id', 'tmdbid', 'movie_tmdb_id', 'show_tmdb_id', 'themoviedb_id'),
    imdb_id: findIndex('imdb_id', 'imdbid'),
    tvdb_id: findIndex('tvdb_id', 'tvdbid', 'thetvdb_id'),
    title: findIndex('title', 'name', 'show_title', 'movie_title', 'show_name', 'movie_name', 'series_title', 'series_name', 'program_title'),
    year: findIndex('year', 'release_year', 'released_year'),
    season: findIndex('season', 'season_number', 'season_num', 'season_index'),
    episode: findIndex('episode', 'episode_number', 'episode_num', 'episode_index'),
    watched_at: findIndex('watched_at', 'watched_date', 'seen_at', 'seen_date', 'created_at', 'updated_at', 'last_watched_at', 'tracked_at', 'event_at'),
    rating: findIndex('rating', 'user_rating', 'score'),
    review: findIndex('review', 'comment', 'note'),
    fallbackTitle: findContainingIndex('title', 'name'),
  };
}

function rowValue(row: string[], index: number) {
  return index >= 0 ? row[index] ?? '' : '';
}

function isCompatibleHistoryHeader(header: string[]) {
  const indexes = mapHeaderIndexes(header);
  const titleIndex = indexes.title >= 0 ? indexes.title : indexes.fallbackTitle;
  return titleIndex >= 0 && (indexes.media_type >= 0 || indexes.season >= 0 || indexes.episode >= 0 || indexes.watched_at >= 0 || indexes.type >= 0);
}

function normalizeImportedRow(row: string[], indexes: ReturnType<typeof mapHeaderIndexes>, sourceName: string): TVTimeRow {
  const season = rowValue(row, indexes.season);
  const episode = rowValue(row, indexes.episode);
  const rawMediaType = rowValue(row, indexes.media_type).trim().toLowerCase();
  const normalizedSource = sourceName.toLowerCase();
  const inferredMediaType =
    rawMediaType ||
    (season || episode || normalizedSource.includes('show') || normalizedSource.includes('episode') ? 'episode' : 'movie');

  return {
    type: rowValue(row, indexes.type) || 'watch',
    media_type: inferredMediaType,
    tmdb_id: rowValue(row, indexes.tmdb_id),
    imdb_id: rowValue(row, indexes.imdb_id),
    tvdb_id: rowValue(row, indexes.tvdb_id),
    title: rowValue(row, indexes.title >= 0 ? indexes.title : indexes.fallbackTitle),
    year: rowValue(row, indexes.year),
    season,
    episode,
    watched_at: rowValue(row, indexes.watched_at),
    rating: rowValue(row, indexes.rating),
    review: rowValue(row, indexes.review),
  };
}

function parseTrackingRecordsV2(rows: string[][], header: string[]) {
  const normalized = header.map(normalizeHeaderName);
  const findIndex = (...names: string[]) => normalized.findIndex((item) => names.includes(item));
  const movieName = findIndex('movie_name');
  const seriesName = findIndex('series_name');
  const tvdbId = findIndex('s_id');
  const seasonNumber = findIndex('season_number');
  const legacySeasonNumber = findIndex('s_no');
  const episodeNumber = findIndex('episode_number');
  const legacyEpisodeNumber = findIndex('ep_no');
  const watchedAt = findIndex('created_at', 'updated_at');

  if (movieName < 0 || seriesName < 0 || tvdbId < 0) return null;

  return rows.slice(1).flatMap((row): TVTimeRow[] => {
    const movieTitle = rowValue(row, movieName).trim();
    const seriesTitle = rowValue(row, seriesName).trim();
    const watched_at = rowValue(row, watchedAt);

    if (movieTitle) {
      return [{
        type: 'watch',
        media_type: 'movie',
        tmdb_id: '',
        imdb_id: '',
        tvdb_id: '',
        title: movieTitle,
        year: '',
        season: '',
        episode: '',
        watched_at,
        rating: '',
        review: '',
      }];
    }

    if (seriesTitle) {
      const season = rowValue(row, seasonNumber).trim() || rowValue(row, legacySeasonNumber).trim();
      const episode = rowValue(row, episodeNumber).trim() || rowValue(row, legacyEpisodeNumber).trim();
      // Follow/archive events name a series but do not represent a watched episode.
      if (!season || !episode || Number(season) <= 0 || Number(episode) <= 0) return [];

      return [{
        type: 'watch',
        media_type: 'episode',
        tmdb_id: '',
        imdb_id: '',
        // TV Time's s_id maps to the TVDB series id. TMDB can resolve it
        // directly, avoiding fragile localized-title searches.
        tvdb_id: rowValue(row, tvdbId),
        title: seriesTitle,
        year: '',
        season,
        episode,
        watched_at,
        rating: '',
        review: '',
      }];
    }

    return [];
  });
}

function parseTrackingRecordsLegacy(rows: string[][], header: string[]) {
  const normalized = header.map(normalizeHeaderName);
  const findIndex = (...names: string[]) => normalized.findIndex((item) => names.includes(item));
  const type = findIndex('type');
  const entityType = findIndex('entity_type');
  const movieName = findIndex('movie_name');
  const releaseDate = findIndex('release_date');
  const watchedAt = findIndex('watch_date', 'created_at', 'updated_at');

  if (entityType < 0 || movieName < 0) return null;

  return rows.slice(1).flatMap((row): TVTimeRow[] => {
    const title = rowValue(row, movieName).trim();
    if (rowValue(row, entityType).trim().toLowerCase() !== 'movie' || !title) return [];

    const date = rowValue(row, releaseDate);
    return [{
      type: rowValue(row, type) || 'follow',
      media_type: 'movie',
      tmdb_id: '',
      imdb_id: '',
      tvdb_id: '',
      title,
      year: date.slice(0, 4),
      season: '',
      episode: '',
      watched_at: rowValue(row, watchedAt),
      rating: '',
      review: '',
    }];
  });
}

function parseEpisodeHistoryRows(rows: string[][], header: string[]) {
  const normalized = header.map(normalizeHeaderName);
  const findIndex = (...names: string[]) => normalized.findIndex((item) => names.includes(item));
  const title = findIndex('tv_show_name', 'series_name', 'show_name');
  const season = findIndex('episode_season_number', 'season_number');
  const episode = findIndex('episode_number');
  const watchedAt = findIndex('created_at', 'updated_at');

  if (title < 0 || season < 0 || episode < 0) return null;

  return rows.slice(1).flatMap((row): TVTimeRow[] => {
    const seriesTitle = rowValue(row, title).trim();
    const seasonNumber = rowValue(row, season).trim();
    const episodeNumber = rowValue(row, episode).trim();
    if (
      !seriesTitle ||
      !seasonNumber ||
      !episodeNumber ||
      Number(seasonNumber) <= 0 ||
      Number(episodeNumber) <= 0
    ) {
      return [];
    }

    return [{
      type: 'watch',
      media_type: 'episode',
      tmdb_id: '',
      imdb_id: '',
      tvdb_id: '',
      title: seriesTitle,
      year: '',
      season: seasonNumber,
      episode: episodeNumber,
      watched_at: rowValue(row, watchedAt),
      rating: '',
      review: '',
    }];
  });
}

function parseRows(csvText: string, sourceName = 'CSV') {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error(`${sourceName}: o CSV do TV Time esta vazio.`);
  }

  const header = rows[0].map((item, index) => (index === 0 ? item.replace(/^\uFEFF/, '').trim() : item.trim()));
  const trackingRecords = parseTrackingRecordsV2(rows, header);
  if (trackingRecords) return trackingRecords;

  const legacyTrackingRecords = parseTrackingRecordsLegacy(rows, header);
  if (legacyTrackingRecords) return legacyTrackingRecords;

  const episodeHistory = parseEpisodeHistoryRows(rows, header);
  if (episodeHistory) return episodeHistory;

  const expectedHeader = [
    'type',
    'media_type',
    'tmdb_id',
    'imdb_id',
    'tvdb_id',
    'title',
    'year',
    'season',
    'episode',
    'watched_at',
    'rating',
    'review',
  ];

  const isExpectedFormat =
    header.length >= expectedHeader.length &&
    expectedHeader.every((column, index) => header[index] === column);

  if (isExpectedFormat) {
    return rows.slice(1).map(
      (row): TVTimeRow => ({
        type: row[0] ?? '',
        media_type: row[1] ?? '',
        tmdb_id: row[2] ?? '',
        imdb_id: row[3] ?? '',
        tvdb_id: row[4] ?? '',
        title: row[5] ?? '',
        year: row[6] ?? '',
        season: row[7] ?? '',
        episode: row[8] ?? '',
        watched_at: row[9] ?? '',
        rating: row[10] ?? '',
        review: row[11] ?? '',
      }),
    );
  }

  if (!isCompatibleHistoryHeader(header)) {
    throw new Error(`${sourceName}: ignorado; cabecalho: ${header.slice(0, 8).join(', ') || 'vazio'}.`);
  }

  const indexes = mapHeaderIndexes(header);
  return rows.slice(1).map((row) => normalizeImportedRow(row, indexes, sourceName));
}

function toNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampRating(value: number | null) {
  if (value === null) return null;
  if (value > 5) {
    return Math.max(0, Math.min(5, Number((value / 2).toFixed(1))));
  }
  return Math.max(0, Math.min(5, value));
}

function movieStatusFromTrackingType(value: string): MovieStatus {
  const normalized = normalizeHeaderName(value);
  return normalized.includes('watch') ? 'watched' : 'watchlist';
}

function isMovieMediaType(value: string) {
  const normalized = normalizeHeaderName(value);
  return normalized === 'movie' || normalized === 'film' || normalized.includes('movie') || normalized.includes('film');
}

function isSeriesMediaType(value: string) {
  const normalized = normalizeHeaderName(value);
  return (
    normalized === 'episode' ||
    normalized === 'show' ||
    normalized === 'serie' ||
    normalized === 'series' ||
    normalized === 'tv' ||
    normalized === 'tv_show' ||
    normalized.includes('episode') ||
    normalized.includes('show') ||
    normalized.includes('series')
  );
}

function chooseBestMovieMatch(results: TMDBMovie[], title: string, year: number | null) {
  const normalizedTitle = normalizeTitleIdentity(title);
  const exactMatches = results.filter((result) => normalizeTitleIdentity(result.title) === normalizedTitle);
  if (year) {
    const exactByYear = exactMatches.find((result) => Number(result.release_date?.slice(0, 4)) === year);
    if (exactByYear) return exactByYear;
  }
  if (exactMatches.length > 0) {
    return exactMatches[0];
  }

  // Keep TMDB's relevance fallback. TV Time exports often omit IDs and years;
  // refusing a ranked result caused otherwise valid historical titles to lose
  // their cover and metadata.
  return results[0] ?? null;
}

function chooseBestSeriesMatch(results: TMDBSeries[], title: string, year: number | null) {
  const normalizedTitle = normalizeTitleIdentity(title);
  const exactMatches = results.filter((result) => normalizeTitleIdentity(result.name) === normalizedTitle);
  if (year) {
    const exactByYear = exactMatches.find((result) => Number(result.first_air_date?.slice(0, 4)) === year);
    return exactByYear ?? null;
  }
  return exactMatches.length === 1 ? exactMatches[0] : null;
}

async function chooseVerifiedSeriesMatch(results: TMDBSeries[], title: string, year: number | null) {
  const direct = chooseBestSeriesMatch(results, title, year);
  if (direct) return direct;

  // A TV Time export may use an international or alternative title that is
  // different from the TMDB display title. Verify aliases before accepting it,
  // so an unrelated popular result is never imported by accident.
  // Threshold lowered to 0.75 to tolerate minor spelling variations and
  // transliteration differences (e.g. "Dinosaurs" vs "Dinossauros").
  for (const result of results.slice(0, 5)) {
    const alternativeTitles = await getTvAlternativeTitles(result.id);
    const isVerified = [result.name, ...alternativeTitles].some((candidate) => titleSimilarity(candidate, title) >= 0.75);
    const resultYear = result.first_air_date ? Number(result.first_air_date.slice(0, 4)) : null;
    if (isVerified && (!year || !resultYear || resultYear === year)) return result;
  }

  return results[0] ?? null;
}

function buildPosterUrl(path: string | null | undefined) {
  return path ? `https://image.tmdb.org/t/p/w500${path}` : null;
}

function titleExistsInMovies(
  items: PersonalMovie[],
  title: string,
  year: number | null,
  sourceMovieId: string | null,
) {
  const normalizedTitle = normalizeTitleIdentity(title);
  return items.some((item) => {
    if (sourceMovieId && item.source_movie_id === sourceMovieId) return true;
    if (sourceMovieId) return false;
    return normalizeTitleIdentity(item.titulo) === normalizedTitle && (!year || item.ano_lancamento === year);
  });
}

function moviePayloadFromSeries(
  seed: ParsedSeriesSeed,
  movie: { id: number; title?: string; release_date?: string; poster_path?: string | null },
  providers: Awaited<ReturnType<typeof getMovieWatchProviders>>,
): ImportMoviePayload {
  return {
    titulo: movie.title ?? splitTitleAndYear(seed.title).title,
    ano_lancamento: movie.release_date ? Number(movie.release_date.slice(0, 4)) : seed.year,
    capa_url: buildPosterUrl(movie.poster_path),
    plataforma_slug: 'stremio',
    status: 'watched',
    source: 'manual',
    source_movie_id: String(movie.id),
    rating: clampRating(seed.rating),
    review: seed.review,
    streaming_data: providers.length > 0 ? JSON.stringify(providers) : null,
    is_retroactive: true,
  };
}

async function resolveMovie(seed: ParsedMovieSeed): Promise<ImportMoviePayload> {
  let tmdbId = seed.tmdbId;
  let title = seed.title;
  let year = seed.year;
  let posterUrl: string | null = null;
  const importedRating = clampRating(seed.rating);
  let streamingData: string | null = null;

  if (!tmdbId && seed.imdbId) {
    const found = await findMovieByExternalId(seed.imdbId);
    tmdbId = found?.id ?? null;
  }

  if (tmdbId) {
    const [details, providers] = await Promise.all([
      getMovieDetails(tmdbId),
      getMovieWatchProviders(tmdbId, 'BR'),
    ]);
    title = details?.title ?? title;
    year = details?.release_date ? Number(details.release_date.slice(0, 4)) : year;
    posterUrl = buildPosterUrl(details?.poster_path);
    streamingData = providers.length > 0 ? JSON.stringify(providers) : null;
  } else {
    const results = await searchMovies(seed.title);
    const match = chooseBestMovieMatch(results, seed.title, seed.year);
    if (match) {
      tmdbId = match.id;
      title = match.title;
      year = match.release_date ? Number(match.release_date.slice(0, 4)) : year;
      posterUrl = buildPosterUrl(match.poster_path);
      const providers = await getMovieWatchProviders(match.id, 'BR');
      streamingData = providers.length > 0 ? JSON.stringify(providers) : null;
    }
  }

  // Last resort: searchMulti can find movies by localized/alternative names
  // that searchMovies misses (e.g. "Morde e Assopra" vs TMDB canonical title).
  if (!tmdbId) {
    const multiResults = await searchMulti(seed.title);
    const movieHit = multiResults.find((r) => r.media_type === 'movie');
    if (movieHit) {
      tmdbId = movieHit.id;
      title = movieHit.title ?? title;
      year = movieHit.release_date ? Number(movieHit.release_date.slice(0, 4)) : year;
      posterUrl = buildPosterUrl(movieHit.poster_path);
      const providers = await getMovieWatchProviders(movieHit.id, 'BR');
      streamingData = providers.length > 0 ? JSON.stringify(providers) : null;
    }
  }

  return {
    titulo: title,
    ano_lancamento: year,
    capa_url: posterUrl,
    plataforma_slug: 'stremio',
    status: seed.status,
    source: 'manual',
    source_movie_id: tmdbId ? String(tmdbId) : null,
    rating: importedRating,
    review: seed.review,
    streaming_data: streamingData,
    is_retroactive: true,
  };
}

async function resolveSeries(seed: ParsedSeriesSeed): Promise<ResolvedSeriesImport> {
  let tmdbId = seed.tmdbId;
  const importedTitle = splitTitleAndYear(seed.title);
  let title = importedTitle.title;
  const year = seed.year ?? importedTitle.year;

  // --- Step 1: resolve external IDs to TMDB TV id ---
  if (!tmdbId && seed.imdbId) {
    const found = await findTvByExternalId(seed.imdbId, 'imdb_id');
    tmdbId = found?.id ?? null;
  }

  if (!tmdbId && seed.tvdbId) {
    const found = await findTvByExternalId(seed.tvdbId, 'tvdb_id');
    tmdbId = found?.id ?? null;
  }

  let posterUrl: string | null = null;
  let streamingData: string | null = null;
  let availableSeasonCounts = new Map<number, number>();

  // --- Step 2: if we have a tmdbId, fetch TV details ---
  if (tmdbId) {
    const details = await getTvDetails(tmdbId);
    if (details) {
      const [raw, providers] = await Promise.all([
        getTvDetailsRaw(tmdbId),
        getTvWatchProviders(tmdbId, 'BR'),
      ]);
      title = raw?.name ?? title;
      posterUrl = buildPosterUrl(raw?.poster_path);
      streamingData = providers.length > 0 ? JSON.stringify(providers) : null;
      availableSeasonCounts = new Map(details.seasons.map((season) => [season.season_number, season.episode_count]));
    } else {
      // TMDB doesn't know this ID as a TV show. It may be a movie (OVA/special).
      // OVAs are single episodes that TMDB catalogues as movies.
      // Example: TMDB movie/515295 — a valid OVA with poster and metadata.
      const [movie, providers] = await Promise.all([
        getMovieDetails(tmdbId),
        getMovieWatchProviders(tmdbId, 'BR'),
      ]);
      if (movie) {
        return { kind: 'movie', payload: moviePayloadFromSeries(seed, movie, providers) };
      }
      // Neither TV nor movie at this ID — reset and try search below.
      tmdbId = null;
    }
  }

  // --- Step 3: search TMDB by title (TV) ---
  if (!tmdbId) {
    const results = await searchSeries(title);
    const match = await chooseVerifiedSeriesMatch(results, title, year);
    if (match) {
      tmdbId = match.id;
      title = match.name;
      posterUrl = buildPosterUrl(match.poster_path);
      const [details, providers] = await Promise.all([
        getTvDetails(match.id),
        getTvWatchProviders(match.id, 'BR'),
      ]);
      streamingData = providers.length > 0 ? JSON.stringify(providers) : null;
      availableSeasonCounts = new Map((details?.seasons ?? []).map((season) => [season.season_number, season.episode_count]));
    }
  }

  // --- Step 4: if TV search failed, try movie search ---
  // Many OVAs and specials are single-episode entries in TV Time but exist
  // as movies in TMDB. Redirect them to the movie import path.
  if (!tmdbId) {
    const movieMatch = chooseBestMovieMatch(await searchMovies(title), title, year);
    if (movieMatch) {
      const [movie, providers] = await Promise.all([
        getMovieDetails(movieMatch.id),
        getMovieWatchProviders(movieMatch.id, 'BR'),
      ]);
      if (movie) {
        return { kind: 'movie', payload: moviePayloadFromSeries(seed, movie, providers) };
      }
    }
  }

  // --- Step 5: last resort — searchMulti finds titles in any language ---
  // Handles cases like "Dinosaurs and Robots" (TV Time export with typos or
  // localized names that neither searchSeries nor searchMovies can resolve).
  if (!tmdbId) {
    const multiResults = await searchMulti(title);
    for (const hit of multiResults.slice(0, 5)) {
      if (hit.media_type === 'tv') {
        const details = await getTvDetails(hit.id);
        if (details) {
          tmdbId = hit.id;
          title = hit.name ?? title;
          posterUrl = buildPosterUrl(hit.poster_path);
          const providers = await getTvWatchProviders(hit.id, 'BR');
          streamingData = providers.length > 0 ? JSON.stringify(providers) : null;
          availableSeasonCounts = new Map(details.seasons.map((s) => [s.season_number, s.episode_count]));
          break;
        }
      }
      if (hit.media_type === 'movie') {
        const [movie, providers] = await Promise.all([
          getMovieDetails(hit.id),
          getMovieWatchProviders(hit.id, 'BR'),
        ]);
        if (movie) {
          return { kind: 'movie', payload: moviePayloadFromSeries(seed, movie, providers) };
        }
      }
    }
  }

  // --- Build series payload ---
  const watchedSeasons = Array.from(seed.seasonEpisodes.keys()).sort((a, b) => a - b);
  const currentSeason = watchedSeasons.at(-1) ?? 1;
  const watchedEpisodes = seed.seasonEpisodes.get(currentSeason)?.size ?? 0;
  const totalEpisodes = Math.max(availableSeasonCounts.get(currentSeason) ?? watchedEpisodes, watchedEpisodes, 1);
  const status = getSeriesStatus(watchedEpisodes, totalEpisodes);

  return {
    kind: 'series',
    payload: {
      titulo: title,
      capa_url: posterUrl,
      status,
      temporada: currentSeason,
      total_episodios: totalEpisodes,
      episodios_vistos: watchedEpisodes,
      plataforma_slug: 'stremio',
      rating: clampRating(seed.rating),
      review: seed.review,
      streaming_data: streamingData,
      is_retroactive: true,
    },
  };
}

function parseSeeds(csvInputs: CsvInput[]): ParsedSeedResult {
  const rows: TVTimeRow[] = [];
  const parseWarnings: string[] = [];

  for (const input of csvInputs) {
    try {
      rows.push(...parseRows(input.text, input.name));
    } catch (error) {
      parseWarnings.push(error instanceof Error ? error.message : `${input.name}: arquivo ignorado.`);
    }
  }

  const movieMap = new Map<string, ParsedMovieSeed>();
  const seriesMap = new Map<string, ParsedSeriesSeed>();

  for (const row of rows) {
    const mediaType = row.media_type.trim().toLowerCase();
    const title = row.title.trim();

    if (!title) {
      parseWarnings.push('Uma linha do CSV foi ignorada porque nao tinha titulo.');
      continue;
    }

    if (isMovieMediaType(mediaType)) {
      const importedTmdbId = toNumber(row.tmdb_id);
      const importedYear = toNumber(row.year);
      // A title alone is not a movie identity: "Duna" (1984) and "Duna"
      // (2021), for example, must remain two independent import records.
      const key = importedTmdbId
        ? `tmdb:${importedTmdbId}`
        : `${normalizeTitleIdentity(title)}|${importedYear ?? 'unknown'}`;
      const current = movieMap.get(key);
      const watchedAt = row.watched_at.trim() || null;
      const rating = clampRating(toNumber(row.rating));
      const review = row.review.trim() || null;
      const status = movieStatusFromTrackingType(row.type);

      if (!current) {
        movieMap.set(key, {
          title,
          year: importedYear,
          status,
          tmdbId: importedTmdbId,
          imdbId: row.imdb_id.trim() || null,
          rating,
          review,
          watchedAt,
        });
        continue;
      }

      movieMap.set(key, {
        ...current,
        tmdbId: current.tmdbId ?? importedTmdbId,
        imdbId: current.imdbId ?? (row.imdb_id.trim() || null),
        status: current.status === 'watched' || status === 'watched' ? 'watched' : 'watchlist',
        rating: rating ?? current.rating,
        review: review ?? current.review,
        watchedAt: watchedAt && (!current.watchedAt || watchedAt > current.watchedAt) ? watchedAt : current.watchedAt,
      });
      continue;
    }

    if (isSeriesMediaType(mediaType)) {
      const season = toNumber(row.season) ?? 1;
      const episode = toNumber(row.episode) ?? 1;
      if (!season || !episode) {
        parseWarnings.push(`A serie "${title}" teve episodios ignorados por falta de temporada/episodio.`);
        continue;
      }

      const key = normalizeTitleIdentity(title);
      const current =
        seriesMap.get(key) ??
        {
          title,
          year: toNumber(row.year),
          tmdbId: toNumber(row.tmdb_id),
          imdbId: row.imdb_id.trim() || null,
          tvdbId: row.tvdb_id.trim() || null,
          seasonEpisodes: new Map<number, Set<number>>(),
          rating: clampRating(toNumber(row.rating)),
          review: row.review.trim() || null,
          watchedAt: row.watched_at.trim() || null,
        };

      const episodes = current.seasonEpisodes.get(season) ?? new Set<number>();
      episodes.add(episode);
      current.seasonEpisodes.set(season, episodes);
      current.tmdbId = current.tmdbId ?? toNumber(row.tmdb_id);
      current.year = current.year ?? toNumber(row.year);
      current.imdbId = current.imdbId ?? (row.imdb_id.trim() || null);
      current.tvdbId = current.tvdbId ?? (row.tvdb_id.trim() || null);
      current.rating = current.rating ?? clampRating(toNumber(row.rating));
      current.review = current.review ?? (row.review.trim() || null);
      const watchedAt = row.watched_at.trim() || null;
      current.watchedAt =
        watchedAt && (!current.watchedAt || watchedAt > current.watchedAt) ? watchedAt : current.watchedAt;
      seriesMap.set(key, current);
      continue;
    }
  }

  return {
    movies: Array.from(movieMap.values()),
    series: Array.from(seriesMap.values()),
    parseWarnings: Array.from(new Set(parseWarnings)),
  };
}

export async function importTvTimeLibrary(
  userId: string,
  csvInputs: CsvInput[],
  existingMovies: PersonalMovie[],
  existingSeries: SeriesEntry[],
) {
  const seeds = parseSeeds(csvInputs);
  if (seeds.movies.length === 0 && seeds.series.length === 0) {
    const details = seeds.parseWarnings.length > 0 ? ` ${seeds.parseWarnings.slice(0, 6).join(' ')}` : '';
    throw new Error(`Nenhum filme ou serie valido foi encontrado no export do TV Time.${details}`);
  }

  let moviesImported = 0;
  let seriesImported = 0;
  let moviesSkipped = 0;
  let seriesSkipped = 0;
  let alreadyRegistered = 0;
  let duplicatesInImport = 0;
  let seriesRepaired = 0;
  const skippedTitles: string[] = [];
  const unresolvedTitles: string[] = [];

  const movieSnapshot = [...existingMovies];
  const seriesSnapshot = [...existingSeries];
  const importedMovieIds = new Set<string>();
  const importedSeriesIds = new Set<string>();
  const movieWasImportedInThisRun = (title: string) =>
    movieSnapshot.some(
      (item) => importedMovieIds.has(item.id) && normalizeTitleIdentity(item.titulo) === normalizeTitleIdentity(title),
    );
  const seriesWasImportedInThisRun = (title: string) =>
    seriesSnapshot.some(
      (item) => importedSeriesIds.has(item.id) && normalizeTitleIdentity(item.titulo) === normalizeTitleIdentity(title),
    );

  for (const seed of seeds.movies) {
    const payload = await resolveMovie(seed);

    // Never save a movie without a valid TMDB ID — it would have no cover
    // and no detail page, producing a "dead" card in the UI.
    if (!payload.source_movie_id) {
      unresolvedTitles.push(seed.title);
      continue;
    }

    if (titleExistsInMovies(movieSnapshot, payload.titulo, payload.ano_lancamento, payload.source_movie_id)) {
      moviesSkipped += 1;
      if (movieWasImportedInThisRun(payload.titulo)) duplicatesInImport += 1;
      else alreadyRegistered += 1;
      skippedTitles.push(payload.titulo);
      continue;
    }
    try {
      await addPersonalMovie(userId, payload);
      const importedMovie = {
        ...payload,
        id: `imported-movie-${moviesImported}`,
        user_id: userId,
        created_at: seed.watchedAt ?? new Date().toISOString(),
      };
      movieSnapshot.push(importedMovie);
      importedMovieIds.add(importedMovie.id);
      moviesImported += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('ja esta na sua lista')) {
        moviesSkipped += 1;
        if (movieWasImportedInThisRun(payload.titulo)) duplicatesInImport += 1;
        else alreadyRegistered += 1;
        skippedTitles.push(payload.titulo);
        continue;
      }
      throw error;
    }
  }

  for (const seed of seeds.series) {
    const resolved = await resolveSeries(seed);
    if (resolved.kind === 'movie') {
      const payload = resolved.payload;

      // Never save a redirected OVA/movie without a valid TMDB ID.
      if (!payload.source_movie_id) {
        unresolvedTitles.push(seed.title);
        continue;
      }

      if (titleExistsInMovies(movieSnapshot, payload.titulo, payload.ano_lancamento, payload.source_movie_id)) {
        moviesSkipped += 1;
        if (movieWasImportedInThisRun(payload.titulo)) duplicatesInImport += 1;
        else alreadyRegistered += 1;
        skippedTitles.push(payload.titulo);
        continue;
      }
      try {
        await addPersonalMovie(userId, payload);
        const importedMovie = {
          ...payload,
          id: `imported-movie-${moviesImported}`,
          user_id: userId,
          created_at: seed.watchedAt ?? new Date().toISOString(),
        };
        movieSnapshot.push(importedMovie);
        importedMovieIds.add(importedMovie.id);
        moviesImported += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('ja esta na sua lista')) {
          moviesSkipped += 1;
          if (movieWasImportedInThisRun(payload.titulo)) duplicatesInImport += 1;
          else alreadyRegistered += 1;
          skippedTitles.push(payload.titulo);
          continue;
        }
        throw error;
      }
      continue;
    }

    const payload = resolved.payload;

    // Never save a series without a cover — it means TMDB resolution failed
    // and the card would be broken (no image, no detail page navigation).
    if (!payload.capa_url) {
      unresolvedTitles.push(seed.title);
      continue;
    }

    const existingSeries = seriesSnapshot.find(
      (item) => normalizeTitleIdentity(splitTitleAndYear(item.titulo).title) === normalizeTitleIdentity(splitTitleAndYear(payload.titulo).title),
    );
    if (existingSeries) {
      if (!existingSeries.capa_url && payload.capa_url) {
        await updateSeries(existingSeries.id, {
          titulo: payload.titulo,
          capa_url: payload.capa_url,
          streaming_data: payload.streaming_data,
          status: payload.status,
          temporada: payload.temporada,
          total_episodios: payload.total_episodios,
          episodios_vistos: payload.episodios_vistos,
        });
        Object.assign(existingSeries, payload);
        seriesRepaired += 1;
        continue;
      }
      seriesSkipped += 1;
      if (seriesWasImportedInThisRun(payload.titulo)) duplicatesInImport += 1;
      else alreadyRegistered += 1;
      skippedTitles.push(payload.titulo);
      continue;
    }
    try {
      await addSeries(userId, payload);
      const importedSeries = {
        ...payload,
        id: `imported-series-${seriesImported}`,
        user_id: userId,
        created_at: seed.watchedAt ?? new Date().toISOString(),
      };
      seriesSnapshot.push(importedSeries);
      importedSeriesIds.add(importedSeries.id);
      seriesImported += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('ja esta cadastrada')) {
        seriesSkipped += 1;
        if (seriesWasImportedInThisRun(payload.titulo)) duplicatesInImport += 1;
        else alreadyRegistered += 1;
        skippedTitles.push(payload.titulo);
        continue;
      }
      throw error;
    }
  }

  const report: TVTimeImportReport = {
    moviesImported,
    seriesImported,
    moviesSkipped,
    seriesSkipped,
    alreadyRegistered,
    duplicatesInImport,
    seriesRepaired,
    skippedTitles: Array.from(new Set(skippedTitles)).sort((a, b) => a.localeCompare(b)),
    unresolvedTitles: Array.from(new Set(unresolvedTitles)).sort((a, b) => a.localeCompare(b)),
    parseWarnings: seeds.parseWarnings,
  };

  return report;
}
