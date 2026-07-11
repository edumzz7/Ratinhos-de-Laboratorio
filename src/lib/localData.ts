import { hashPassword, normalizeUsername } from './auth';
import { DEFAULT_OSCAR_MOVIES, readLegacyMovieData, readLegacySeriesData } from './catalog';
import type {
  ActivityEntry,
  AppUser,
  CineMatchMode,
  CineMatchSuggestion,
  MovieStatus,
  OscarMovie,
  OscarMovieWithStatus,
  PersonalMovie,
  RankedUser,
  SeriesEntry,
  SeriesStatus,
  SessionUser,
  UserOscarPrediction,
  AnticipatedMovie,
  UserFavorite,
  CreateGroupInput,
  GroupCheckEvent,
  GroupGoalProgress,
  GroupPageData,
  GroupScore,
  Group,
  GroupMember,
  GroupMemberRole,
  GroupMovieSuggestion,
  CineMatchSession,
  WatchParty,
  CollaborationMediaType,
  EpisodeReaction,
  SeriesEpisodeFeedback,
} from '../types/app';

const KEYS = {
  users: 'letterboxmzz_local_users_v1',
  session: 'letterboxmzz_local_session_v1',
  oscarMovies: 'letterboxmzz_local_oscar_movies_v1',
  oscarStatuses: 'letterboxmzz_local_oscar_statuses_v1',
  personalMovies: 'letterboxmzz_local_personal_movies_v1',
  series: 'letterboxmzz_local_series_v1',
  activities: 'letterboxmzz_local_activities_v1',
  oscarPredictions: 'letterboxmzz_local_oscar_predictions_v1',
  favorites: 'letterboxmzz_local_favorites_v1',
  groups: 'letterboxmzz_local_groups_v1',
  groupMembers: 'letterboxmzz_local_group_members_v1',
  groupChecks: 'letterboxmzz_local_group_checks_v1',
  groupMovieSuggestions: 'letterboxmzz_local_group_movie_suggestions_v1',
  cineMatchSessions: 'letterboxmzz_local_cine_match_sessions_v1',
  watchParties: 'letterboxmzz_local_watch_parties_v1',
  seriesEpisodeFeedback: 'letterboxmzz_local_series_episode_feedback_v1',
};
const LEGACY_IMPORT_PREFIX = 'letterboxmzz_legacy_imported_v1_';
const DEV_SHARED_SAVE_ENDPOINT = '/__local-save';
const SHAREABLE_KEYS = [
  KEYS.users,
  KEYS.oscarMovies,
  KEYS.oscarStatuses,
  KEYS.personalMovies,
  KEYS.series,
  KEYS.activities,
  KEYS.oscarPredictions,
  KEYS.favorites,
  KEYS.groups,
  KEYS.groupMembers,
  KEYS.groupChecks,
  KEYS.groupMovieSuggestions,
  KEYS.cineMatchSessions,
  KEYS.watchParties,
  KEYS.seriesEpisodeFeedback,
] as const;

type StoredUser = AppUser & {
  password_hash: string;
  mcoins: number;
  avatar_id: string;
  display_name?: string;
  favorite_movie?: string;
  favorite_movie_2?: string;
  favorite_genre?: string;
  favorite_series?: string;
  watch_preference?: 'home' | 'cinema';
};

type StoredOscarStatus = {
  id: string;
  user_id: string;
  oscar_movie_id: string;
  status: MovieStatus;
  updated_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function randomId() {
  return crypto.randomUUID();
}

function readJson<T>(key: string, fallback: T): T {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', DEV_SHARED_SAVE_ENDPOINT, false);
      xhr.send();
      if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
        const store = JSON.parse(xhr.responseText) as Record<string, unknown>;
        return key in store ? (store[key] as T) : fallback;
      }
    } catch {
      // Fall through to localStorage when the shared dev save is unavailable.
    }
  }

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    try {
      const patchXhr = new XMLHttpRequest();
      patchXhr.open('PATCH', DEV_SHARED_SAVE_ENDPOINT, false);
      patchXhr.setRequestHeader('Content-Type', 'application/json');
      patchXhr.send(JSON.stringify({ key, value }));
      if (patchXhr.status >= 200 && patchXhr.status < 300) return;

      const readXhr = new XMLHttpRequest();
      readXhr.open('GET', DEV_SHARED_SAVE_ENDPOINT, false);
      readXhr.send();
      const store = readXhr.status >= 200 && readXhr.status < 300 && readXhr.responseText
        ? (JSON.parse(readXhr.responseText) as Record<string, unknown>)
        : {};
      store[key] = value;

      const writeXhr = new XMLHttpRequest();
      writeXhr.open('POST', DEV_SHARED_SAVE_ENDPOINT, false);
      writeXhr.setRequestHeader('Content-Type', 'application/json');
      writeXhr.send(JSON.stringify(store));
      if (writeXhr.status >= 200 && writeXhr.status < 300) {
        return;
      }
    } catch {
      // Fall through to localStorage when the shared dev save is unavailable.
    }
  }

  localStorage.setItem(key, JSON.stringify(value));
}

function removeJsonKey(key: string) {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    try {
      const patchXhr = new XMLHttpRequest();
      patchXhr.open('PATCH', DEV_SHARED_SAVE_ENDPOINT, false);
      patchXhr.setRequestHeader('Content-Type', 'application/json');
      patchXhr.send(JSON.stringify({ key, remove: true }));
      if (patchXhr.status >= 200 && patchXhr.status < 300) return;

      const readXhr = new XMLHttpRequest();
      readXhr.open('GET', DEV_SHARED_SAVE_ENDPOINT, false);
      readXhr.send();
      const store = readXhr.status >= 200 && readXhr.status < 300 && readXhr.responseText
        ? (JSON.parse(readXhr.responseText) as Record<string, unknown>)
        : {};
      if (key in store) {
        delete store[key];
        const writeXhr = new XMLHttpRequest();
        writeXhr.open('POST', DEV_SHARED_SAVE_ENDPOINT, false);
        writeXhr.setRequestHeader('Content-Type', 'application/json');
        writeXhr.send(JSON.stringify(store));
        if (writeXhr.status >= 200 && writeXhr.status < 300) {
          return;
        }
      }
    } catch {
      // Fall through to localStorage when the shared dev save is unavailable.
    }
  }

  localStorage.removeItem(key);
}

function readSharedStore(): Record<string, unknown> | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;

  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', DEV_SHARED_SAVE_ENDPOINT, false);
    xhr.send();
    if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
      return JSON.parse(xhr.responseText) as Record<string, unknown>;
    }
  } catch {
    // Ignore and fall back to localStorage.
  }
  return null;
}

function writeSharedStore(store: Record<string, unknown>) {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;

  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', DEV_SHARED_SAVE_ENDPOINT, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(store));
    return xhr.status >= 200 && xhr.status < 300;
  } catch {
    return false;
  }
}

function migrateLegacyLocalStorageToSharedSave() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;

  const shared = readSharedStore();
  const nextStore: Record<string, unknown> = shared ? { ...shared } : {};
  let changed = false;

  for (const key of SHAREABLE_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const localValue = JSON.parse(raw);
      if (Array.isArray(localValue)) {
        const currentUsers = Array.isArray(nextStore[key]) ? nextStore[key] as StoredUser[] : [];
        const knownIds = new Set(currentUsers.map((item) => (item as { id?: string }).id));
        const mergedUsers = [...currentUsers, ...(localValue as Array<{ id?: string }>).filter((item) => !knownIds.has(item.id))];
        if (mergedUsers.length !== currentUsers.length) {
          nextStore[key] = mergedUsers;
          changed = true;
        }
      } else if (!(key in nextStore)) {
        nextStore[key] = localValue;
        changed = true;
      }
    } catch {
      // Skip invalid legacy entries.
    }
  }

  if (changed) {
    writeSharedStore(nextStore);
  }
}

function readUsers() {
  return readJson<StoredUser[]>(KEYS.users, []);
}

function writeUsers(users: StoredUser[]) {
  writeJson(KEYS.users, users);
}

function readOscarMovies() {
  return readJson<OscarMovie[]>(KEYS.oscarMovies, []);
}

function writeOscarMovies(movies: OscarMovie[]) {
  writeJson(KEYS.oscarMovies, movies);
}

function readOscarStatuses() {
  return readJson<StoredOscarStatus[]>(KEYS.oscarStatuses, []);
}

function writeOscarStatuses(items: StoredOscarStatus[]) {
  writeJson(KEYS.oscarStatuses, items);
}

function readPersonalMovies() {
  return readJson<PersonalMovie[]>(KEYS.personalMovies, []);
}

function writePersonalMovies(movies: PersonalMovie[]) {
  writeJson(KEYS.personalMovies, movies);
}

function readSeries() {
  return readJson<SeriesEntry[]>(KEYS.series, []);
}

function writeSeries(items: SeriesEntry[]) {
  writeJson(KEYS.series, items);
}

function readGroups() {
  return readJson<Group[]>(KEYS.groups, []).map((group) => ({
    ...group,
    max_members: group.max_members ?? 50,
  }));
}

function writeGroups(items: Group[]) {
  writeJson(KEYS.groups, items);
}

function readGroupMembers() {
  return readJson<GroupMember[]>(KEYS.groupMembers, []);
}

function writeGroupMembers(items: GroupMember[]) {
  writeJson(KEYS.groupMembers, items);
}

function readGroupChecks() {
  return readJson<GroupCheckEvent[]>(KEYS.groupChecks, []);
}

function readGroupMovieSuggestions() {
  return readJson<GroupMovieSuggestion[]>(KEYS.groupMovieSuggestions, []);
}

export async function listGroupMovieSuggestions(groupId: string) {
  const currentUser = requireSession();
  const group = getGroupOrThrow(groupId);
  const active = readGroupMembers().some((member) => member.group_id === groupId && member.user_id === currentUser.id && member.status === 'active');
  if (!active) throw new Error('Voce nao participa deste grupo.');
  return readGroupMovieSuggestions().filter((suggestion) => suggestion.group_id === group.id);
}

export async function suggestGroupMovie(groupId: string, mediaId: string, mediaTitle: string, posterPath?: string | null) {
  const currentUser = requireSession();
  const group = getGroupOrThrow(groupId);
  const active = readGroupMembers().some((member) => member.group_id === groupId && member.user_id === currentUser.id && member.status === 'active');
  if (!active) throw new Error('Voce nao participa deste grupo.');
  const suggestions = readGroupMovieSuggestions();
  const activeGoal = group.goals.find((goal) => goal.type === 'watch_movies' && !goal.completed_at);
  if (!activeGoal) throw new Error('Este grupo nao possui uma meta de filmes ativa.');
  if (suggestions.some((item) => item.group_id === groupId && item.goal_id === activeGoal.id && item.media_id === mediaId && item.suggested_by === currentUser.id)) return;
  writeJson(KEYS.groupMovieSuggestions, [...suggestions, { id: randomId(), group_id: groupId, goal_id: activeGoal.id, suggested_by: currentUser.id, media_id: mediaId, media_title: mediaTitle, poster_path: posterPath, created_at: nowIso() }]);
}

export async function advanceGroupMovieGoal(groupId: string, targetCount: number) {
  const currentUser = requireSession();
  const group = getGroupOrThrow(groupId);
  if (!isActiveGroupAdmin(group, currentUser.id)) throw new Error('Apenas administradores podem criar a proxima meta.');
  if (!Number.isInteger(targetCount) || targetCount < 1) throw new Error('Informe uma quantidade valida de filmes.');
  const activeGoal = group.goals.find((goal) => goal.type === 'watch_movies' && !goal.completed_at);
  if (!activeGoal) throw new Error('Nao existe uma meta de filmes ativa.');
  const memberIds = readGroupMembers().filter((member) => member.group_id === groupId && member.status === 'active').map((member) => member.user_id);
  const progress = buildGroupGoalProgress(group, memberIds).filter((item) => item.goal_id === activeGoal.id);
  if (!memberIds.every((id) => progress.some((item) => item.user_id === id && item.completed))) throw new Error('Todos os participantes precisam concluir a meta atual.');
  const timestamp = nowIso();
  const nextGoal = { id: randomId(), type: 'watch_movies' as const, target_id: null, target_label: null, target_count: targetCount, season_number: null, deadline: null, sequence: (activeGoal.sequence || 1) + 1, completed_at: null };
  const updatedGroup = { ...group, goals: group.goals.map((goal) => goal.id === activeGoal.id ? { ...goal, completed_at: timestamp } : goal).concat(nextGoal), updated_at: timestamp };
  writeGroups(readGroups().map((item) => item.id === groupId ? updatedGroup : item));
  return updatedGroup;
}

function writeGroupChecks(items: GroupCheckEvent[]) {
  writeJson(KEYS.groupChecks, items);
}

function readActivitiesStore() {
  return readJson<ActivityEntry[]>(KEYS.activities, []);
}

function writeActivitiesStore(items: ActivityEntry[]) {
  writeJson(KEYS.activities, items);
}

function readSessionUserId() {
  return localStorage.getItem(KEYS.session);
}

function writeSessionUserId(userId: string | null) {
  if (!userId) {
    localStorage.removeItem(KEYS.session);
    return;
  }
  localStorage.setItem(KEYS.session, userId);
}

function titleKey(title: string) {
  return title.trim().toLowerCase();
}

function isIncomingNotificationMessage(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('para voce')
    || normalized.includes('ao seu filme')
    || normalized.includes('novo pedido no grupo')
    || normalized.includes('seu pedido para entrar no grupo');
}

function addActivity(user_id: string, message: string, mcoins_delta = 0, score_type?: ActivityEntry['score_type']) {
  const items = readActivitiesStore();
  items.unshift({
    id: randomId(),
    user_id,
    message,
    mcoins_delta,
    created_at: nowIso(),
    score_type,
  });
  writeActivitiesStore(items);
}

function canScoreToday(userId: string, scoreType: 'movie_watch' | 'episode_watch', limit: number) {
  const today = localDay(nowIso());
  return readActivitiesStore().filter((item) => item.user_id === userId && item.score_type === scoreType && localDay(item.created_at) === today).length < limit;
}

function within72Hours(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() <= 72 * 60 * 60 * 1000;
}

function movieWatchPoints(movie: PersonalMovie) {
  return Math.max(0, Math.floor((movie.duration_minutes || 0) / 10));
}

function deleteActivitiesForTitle(user_id: string, title: string) {
  try {
    const items = readActivitiesStore();
    const updated = items.filter((act) => !(act.user_id === user_id && act.message.includes(title)));
    writeActivitiesStore(updated);
  } catch (err) {
    console.error('Failed to clean up local activities for title:', err);
  }
}

function updateUserMcoins(userId: string, delta: number) {
  if (!delta) return;
  const users = readUsers();
  const next = users.map((user) =>
    user.id === userId ? { ...user, mcoins: Math.max(0, user.mcoins + delta) } : user,
  );
  writeUsers(next);
}

function ensureOscarCatalog() {
  const current = readOscarMovies();
  if (current.length > 0) return current;

  const seeded = DEFAULT_OSCAR_MOVIES.map((movie) => ({
    id: randomId(),
    titulo: movie.titulo,
    ano_oscar: movie.ano_oscar,
    categoria_principal: movie.categoria_principal,
    capa_url: movie.capa_url,
    plataforma_slug: movie.plataforma_slug,
    rating: movie.rating ?? null,
    streaming_data: movie.streaming_data ?? null,
  }));
  writeOscarMovies(seeded);
  return seeded;
}

function fallbackAvatar(userId: string) {
  const options = ['avatar_clapper', 'avatar_popcorn', 'avatar_projector', 'avatar_girl', 'avatar_robot'];
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash + userId.charCodeAt(index) * (index + 1)) % options.length;
  }
  return options[hash];
}

function requireSession(expectedUserId?: string) {
  const current = getCurrentSessionUserSync();
  if (!current) throw new Error('Sessao invalida.');
  if (expectedUserId && current.id !== expectedUserId) {
    throw new Error('Operacao permitida apenas para o dono do registro.');
  }
  return current;
}

function getCurrentSessionUserSync(): SessionUser | null {
  const userId = readSessionUserId();
  if (!userId) return null;
  const user = readUsers().find((item) => item.id === userId);
  return user ? { id: user.id, username: user.username } : null;
}

export async function bootstrapApp() {
  migrateLegacyLocalStorageToSharedSave();
  removeJsonKey(KEYS.oscarMovies);
  removeJsonKey(KEYS.oscarStatuses);

  try {
    const users = readUsers();
    if (Array.isArray(users)) {
        const filtered = users.filter(
          (u) =>
            u.username.toLowerCase() !== 'testoscar' &&
            u.username.toLowerCase() !== 'testeoscar'
        );
        writeUsers(filtered);
    }
    const session = localStorage.getItem(KEYS.session);
    if (session) {
      const sess = JSON.parse(session);
      if (
        sess.username.toLowerCase() === 'testoscar' ||
        sess.username.toLowerCase() === 'testeoscar'
      ) {
        localStorage.removeItem(KEYS.session);
      }
    }
  } catch (e) {
    console.error(e);
  }

  try {
    const deductionsKey = 'deductions_applied_v1';
    if (!readJson<string | null>(deductionsKey, null)) {
      const usersToDeduct = [
        { username: 'marcelojanssen', amount: 200 },
        { username: 'luizascopel', amount: 190 },
        { username: 'igro', amount: 30 },
        { username: 'edumzz', amount: 50 },
      ];

      const users = readUsers();
      let changed = false;
      for (const { username, amount } of usersToDeduct) {
        const uIdx = users.findIndex((u) => u.username === username);
        if (uIdx !== -1) {
          users[uIdx].mcoins = Math.max(0, users[uIdx].mcoins - amount);
          addActivity(users[uIdx].id, `pontos reajustados para correcao (-${amount} MC)`, -amount);
          changed = true;
        }
      }
      if (changed) {
        writeUsers(users);
      }
      writeJson(deductionsKey, '1');
    }
  } catch (e) {
    console.error('Failed to apply local deductions:', e);
  }
}

export async function importLegacyDataForUser(userId: string) {
  const importKey = `${LEGACY_IMPORT_PREFIX}${userId}`;
  if (readJson<string | null>(importKey, null) === '1') return false;

  const rawMovies = localStorage.getItem('cinehub_movies');
  const rawSeries = localStorage.getItem('cinehub_series');
  if (!rawMovies && !rawSeries) return false;

  const { personalMovies, oscarStatuses } = readLegacyMovieData();
  const legacySeries = readLegacySeriesData(false);

  let changed = false;

  const existingPersonal = readPersonalMovies();
  if (existingPersonal.filter((item) => item.user_id === userId).length === 0 && personalMovies.length > 0) {
    existingPersonal.push(
      ...personalMovies.map((movie) => ({
        ...movie,
        id: randomId(),
        user_id: userId,
        created_at: nowIso(),
      })),
    );
    writePersonalMovies(existingPersonal);
    changed = true;
  }

  const existingSeries = readSeries();
  if (existingSeries.filter((item) => item.user_id === userId).length === 0 && legacySeries.length > 0) {
    existingSeries.push(
      ...legacySeries.map((series) => ({
        ...series,
        id: randomId(),
        user_id: userId,
        created_at: nowIso(),
      })),
    );
    writeSeries(existingSeries);
    changed = true;
  }

  if (oscarStatuses.size > 0) {
    const statuses = readOscarStatuses();
    const existingStatusIds = new Set(statuses.filter((item) => item.user_id === userId).map((item) => item.oscar_movie_id));
    for (const movie of ensureOscarCatalog()) {
      const status = oscarStatuses.get(titleKey(movie.titulo));
      if (!status || existingStatusIds.has(movie.id)) continue;
      statuses.push({
        id: randomId(),
        user_id: userId,
        oscar_movie_id: movie.id,
        status,
        updated_at: nowIso(),
      });
      changed = true;
    }
    writeOscarStatuses(statuses);
  }

  if (changed) {
    addActivity(userId, 'dados legados foram importados para este perfil.', 0);
  }

  writeJson(importKey, '1');
  return changed;
}

export async function loginUser(username: string, password: string) {
  const normalized = normalizeUsername(username);
  const password_hash = await hashPassword(password);
  const user = readUsers().find(
    (item) => item.username === normalized && item.password_hash === password_hash,
  );
  if (!user) throw new Error('Usuario ou senha invalidos.');
  writeSessionUserId(user.id);
  return { id: user.id, username: user.username };
}

export async function registerUser(username: string, password: string) {
  const normalized = normalizeUsername(username);
  const users = readUsers();
  if (users.some((item) => item.username === normalized)) {
    throw new Error('Esse username ja esta em uso.');
  }

  const user: StoredUser = {
    id: randomId(),
    username: normalized,
    password_hash: await hashPassword(password),
    created_at: nowIso(),
    mcoins: 0,
    avatar_id: fallbackAvatar(normalized),
  };
  users.push(user);
  writeUsers(users);
  writeSessionUserId(user.id);
  addActivity(user.id, `${user.username} entrou no Cinerats.`, 0);
  return { id: user.id, username: user.username };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const users = readUsers();
  const user = users.find((item) => item.id === userId);
  if (!user) throw new Error('Usuario nao encontrado.');

  const currentHash = await hashPassword(currentPassword);
  if (user.password_hash !== currentHash) {
    throw new Error('Senha atual incorreta.');
  }

  const newHash = await hashPassword(newPassword);
  const next = users.map((item) =>
    item.id === userId ? { ...item, password_hash: newHash } : item,
  );
  writeUsers(next);
}

export async function adminResetPassword(
  targetUsername: string,
  newPassword: string,
) {
  const normalized = normalizeUsername(targetUsername);
  const users = readUsers();
  const target = users.find((item) => item.username === normalized);
  if (!target) throw new Error(`Usuario "${targetUsername}" nao encontrado.`);

  const newHash = await hashPassword(newPassword);
  writeUsers(users.map((item) =>
    item.id === target.id ? { ...item, password_hash: newHash } : item,
  ));
}

export async function listUsers() {
  return readUsers()
    .slice()
    .sort((a, b) => a.username.localeCompare(b.username))
    .map((item) => ({
      id: item.id,
      username: item.username,
      created_at: item.created_at,
    }));
}

export async function listRankedUsers() {
  const deductionsKey = 'deductions_applied_v1';
  const localDeductionsApplied = localStorage.getItem(deductionsKey) === '1';

  const mapped = readUsers()
    .slice()
    .map((item) => {
      let mcoins = item.mcoins;
      if (!localDeductionsApplied) {
        let deductAmount = 0;
        const normalized = normalizeUsername(item.username);
        if (normalized === 'marcelojanssen') deductAmount = 200;
        else if (normalized === 'luizascopel') deductAmount = 190;
        else if (normalized === 'igro') deductAmount = 30;
        else if (normalized === 'edumzz') deductAmount = 50;
        mcoins = Math.max(0, mcoins - deductAmount);
      }
      return { ...item, mcoins };
    });

  mapped.sort((a, b) => b.mcoins - a.mcoins || a.username.localeCompare(b.username));

  return mapped.map((item, index) => ({
    id: item.id,
    username: item.username,
    created_at: item.created_at,
    user_id: item.id,
    mcoins: item.mcoins,
    avatar_id: item.avatar_id,
    display_name: item.display_name,
    favorite_movie: item.favorite_movie,
    favorite_movie_2: item.favorite_movie_2,
    favorite_genre: item.favorite_genre,
    favorite_series: item.favorite_series,
    watch_preference: item.watch_preference,
    rank: index + 1,
  })) as RankedUser[];
}

export async function listActivities(limit = 30) {
  return readActivitiesStore().slice(0, limit);
}

export async function listNotifications(userId: string, limit = 20) {
  return readActivitiesStore()
    .filter((item) => item.user_id === userId)
    .filter((item) => isIncomingNotificationMessage(item.message))
    .slice(0, limit);
}

export async function listUserActivity(userId: string, limit = 20) {
  return readActivitiesStore()
    .filter((item) => item.user_id === userId)
    .filter((item) => !isIncomingNotificationMessage(item.message))
    .slice(0, limit);
}

export async function getCurrentSessionUser() {
  return getCurrentSessionUserSync();
}

export async function logoutUser() {
  writeSessionUserId(null);
}

export async function deleteCurrentUser(userId: string, currentPassword: string) {
  requireSession(userId);

  const users = readUsers();
  const user = users.find((item) => item.id === userId);
  if (!user) throw new Error('Usuario nao encontrado.');

  const currentHash = await hashPassword(currentPassword);
  if (user.password_hash !== currentHash) {
    throw new Error('Senha atual incorreta.');
  }

  writeUsers(users.filter((item) => item.id !== userId));
  writePersonalMovies(readPersonalMovies().filter((item) => item.user_id !== userId));
  writeSeries(readSeries().filter((item) => item.user_id !== userId));
  writeOscarStatuses(readOscarStatuses().filter((item) => item.user_id !== userId));
  writeActivitiesStore(
    readActivitiesStore().filter(
      (item) => item.user_id !== userId && !item.message.includes(`@${user.username}`),
    ),
  );
  writeFavorites(
    readFavorites().filter(
      (item) => item.owner_user_id !== userId && item.favorite_user_id !== userId,
    ),
  );
  writeJson(
    KEYS.oscarPredictions,
    readJson<UserOscarPrediction[]>(KEYS.oscarPredictions, []).filter((item) => item.user_id !== userId),
  );

  const ownedGroupIds = new Set(readGroups().filter((group) => group.owner_id === userId).map((group) => group.id));
  writeGroups(readGroups()
    .filter((group) => !ownedGroupIds.has(group.id))
    .map((group) => ({
      ...group,
      admin_ids: group.admin_ids.filter((adminId) => adminId !== userId),
    })));
  writeGroupMembers(readGroupMembers().filter(
    (member) => member.user_id !== userId && !ownedGroupIds.has(member.group_id),
  ));
  writeGroupChecks(readGroupChecks().filter(
    (check) => check.user_id !== userId && !ownedGroupIds.has(check.group_id),
  ));

  localStorage.removeItem(`${LEGACY_IMPORT_PREFIX}${userId}`);
  writeSessionUserId(null);
}

export async function updateUserAvatar(userId: string, avatarId: string) {
  requireSession(userId);
  const users = readUsers();
  writeUsers(users.map((user) => (user.id === userId ? { ...user, avatar_id: avatarId } : user)));
}

export async function updateUserProfile(
  userId: string,
  data: {
    display_name?: string;
    favorite_movie?: string;
    favorite_movie_2?: string;
    favorite_genre?: string;
    favorite_series?: string;
    watch_preference?: 'home' | 'cinema';
  }
) {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) throw new Error('Usuario nao encontrado.');

  users[index] = { ...users[index], ...data };
  writeUsers(users);
}

const FREE_GROUP_LIMIT = 2;

function createInviteCode() {
  return randomId().replaceAll('-', '').slice(0, 10).toUpperCase();
}

function getGroupOrThrow(groupId: string) {
  const group = readGroups().find((item) => item.id === groupId);
  if (!group) throw new Error('Grupo nao encontrado.');
  return group;
}

function isActiveGroupAdmin(group: Group, userId: string) {
  return group.admin_ids.includes(userId) && readGroupMembers().some(
    (member) => member.group_id === group.id && member.user_id === userId && member.status === 'active',
  );
}

function localDay(timestamp: string) {
  return timestamp.slice(0, 10);
}

function normalizeMovieId(value: string) {
  return value.match(/(?:tmdb:)?(\d+)/)?.[1] || value;
}

function groupRewatchPolicy(group: Group) {
  return group.scoring_rules.rewatch_policy || (group.scoring_rules.allow_rewatch ? 'valid' : 'invalid');
}

function registerGroupCheck(
  userId: string,
  mediaType: GroupCheckEvent['media_type'],
  mediaId: string,
  mediaTitle: string,
  review?: string | null,
  durationMinutes?: number | null,
) {
  const activeGroupIds = new Set(
    readGroupMembers()
      .filter((member) => member.user_id === userId && member.status === 'active')
      .map((member) => member.group_id),
  );
  if (activeGroupIds.size === 0) return;

  const timestamp = nowIso();
  const checks = readGroupChecks();
  const nextChecks = [...checks];
  const groups = readGroups().filter((group) => activeGroupIds.has(group.id));

  for (const group of groups) {
    if (group.scoring_rules.review_required && !review?.trim()) continue;

    const userChecks = checks.filter((check) => check.group_id === group.id && check.user_id === userId);
    const activeMovieGoal = group.goals.find((goal) => goal.type === 'watch_movies' && !goal.completed_at);
    if (mediaType === 'movie' && activeMovieGoal) {
      const suggestions = readGroupMovieSuggestions().filter((item) => item.group_id === group.id && item.goal_id === activeMovieGoal.id && normalizeMovieId(item.media_id) === normalizeMovieId(mediaId));
      if (suggestions.length === 0 || suggestions.every((item) => item.suggested_by === userId)) continue;
    }
    const hasCheckedMedia = userChecks.some(
      (check) => check.media_type === mediaType && check.media_id === mediaId,
    );
    if (hasCheckedMedia && groupRewatchPolicy(group) === 'invalid') continue;

    const dailyLimit = group.scoring_rules.daily_limit;
    if (dailyLimit !== null) {
      const checksToday = userChecks.filter((check) => localDay(check.checked_at) === localDay(timestamp)).length;
      if (checksToday >= dailyLimit) continue;
    }

    nextChecks.push({
      id: randomId(),
      group_id: group.id,
      user_id: userId,
      media_type: mediaType,
      media_id: normalizeMovieId(mediaId),
      media_title: mediaTitle,
      points: Math.max(1, Math.floor((durationMinutes || (mediaType === 'movie' ? 120 : 30)) / 10)) * (hasCheckedMedia && groupRewatchPolicy(group) === 'partial' ? 0.5 : 1),
      checked_at: timestamp,
    });
  }

  if (nextChecks.length !== checks.length) writeGroupChecks(nextChecks);
}

export async function listGroupsForUser(userId: string) {
  requireSession(userId);
  const memberGroupIds = new Set(
    readGroupMembers()
      .filter((member) => member.user_id === userId && member.status === 'active')
      .map((member) => member.group_id),
  );

  return readGroups()
    .filter((group) => memberGroupIds.has(group.id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function createGroup(input: CreateGroupInput) {
  requireSession(input.owner_id);

  const currentGroups = await listGroupsForUser(input.owner_id);
  if (currentGroups.length >= FREE_GROUP_LIMIT) {
    throw new Error(`O plano gratuito permite ate ${FREE_GROUP_LIMIT} grupos por usuario.`);
  }

  const name = input.name.trim();
  if (!name) throw new Error('Informe um nome para o grupo.');
  if (!Number.isInteger(input.max_members) || input.max_members < 1 || input.max_members > 50) {
    throw new Error('O grupo precisa ter entre 1 e 50 participantes.');
  }
  if (input.entry_permission !== 'invite_only' && input.privacy !== 'public') {
    throw new Error('Grupos com entrada livre ou solicitacao precisam ser publicos.');
  }
  if (input.entry_permission === 'invite_only' && input.privacy !== 'private') {
    throw new Error('Grupos somente por convite precisam ser privados.');
  }
  if (input.scoring_rules.daily_limit !== null && (!Number.isInteger(input.scoring_rules.daily_limit) || input.scoring_rules.daily_limit < 1)) {
    throw new Error('O limite de checks diarios precisa ser maior que zero.');
  }
  if (input.goals.some((goal) => goal.type === 'watch_movies' && (!goal.target_count || goal.target_count < 1))) {
    throw new Error('A meta de filmes precisa ter uma quantidade valida.');
  }

  const timestamp = nowIso();
  const group: Group = {
    ...input,
    id: randomId(),
    name,
    description: input.description.trim(),
    admin_ids: Array.from(new Set([input.owner_id, ...input.admin_ids])),
    invite_code: createInviteCode(),
    created_at: timestamp,
    updated_at: timestamp,
  };

  writeGroups([...readGroups(), group]);
  const members = readGroupMembers();
  const nextMembers = group.admin_ids.map((userId): GroupMember => ({
    id: randomId(),
    group_id: group.id,
    user_id: userId,
    role: 'admin',
    status: 'active',
    created_at: timestamp,
  }));
  writeGroupMembers([...members, ...nextMembers]);
  return group;
}

export async function addGroupAdmin(groupId: string, adminUserId: string) {
  const currentUser = requireSession();
  const group = getGroupOrThrow(groupId);
  if (!isActiveGroupAdmin(group, currentUser.id)) {
    throw new Error('Apenas administradores podem adicionar administradores.');
  }
  if (!readUsers().some((user) => user.id === adminUserId)) {
    throw new Error('Usuario administrador nao encontrado.');
  }
  if (group.admin_ids.includes(adminUserId)) return group;

  const updatedAt = nowIso();
  const updatedGroup = {
    ...group,
    admin_ids: [...group.admin_ids, adminUserId],
    updated_at: updatedAt,
  };
  writeGroups(readGroups().map((item) => (item.id === groupId ? updatedGroup : item)));

  const members = readGroupMembers();
  const existingMember = members.find((member) => member.group_id === groupId && member.user_id === adminUserId);
  if (existingMember) {
    writeGroupMembers(members.map((member) => (
      member.id === existingMember.id ? { ...member, role: 'admin' as GroupMemberRole, status: 'active' as const } : member
    )));
  } else {
    writeGroupMembers([...members, {
      id: randomId(),
      group_id: groupId,
      user_id: adminUserId,
      role: 'admin',
      status: 'active',
      created_at: updatedAt,
    }]);
  }
  return updatedGroup;
}

export async function updateGroupScoringRules(groupId: string, scoringRules: Partial<Group['scoring_rules']>) {
  const currentUser = requireSession();
  const group = getGroupOrThrow(groupId);
  if (!isActiveGroupAdmin(group, currentUser.id)) throw new Error('Apenas administradores podem editar as regras.');
  const updatedGroup = { ...group, scoring_rules: { ...group.scoring_rules, ...scoringRules }, updated_at: nowIso() };
  writeGroups(readGroups().map((item) => item.id === groupId ? updatedGroup : item));
  return updatedGroup;
}

export async function requestGroupEntry(groupId: string) {
  const currentUser = requireSession();
  const group = getGroupOrThrow(groupId);
  const members = readGroupMembers();
  const existing = members.find((member) => member.group_id === groupId && member.user_id === currentUser.id);
  if (existing) {
    return existing.status;
  }
  const activeCount = members.filter((member) => member.group_id === groupId && member.status === 'active').length;
  if (activeCount >= group.max_members) {
    throw new Error('Este grupo ja atingiu o limite de participantes.');
  }

  const status = group.entry_permission === 'open' ? 'active' : 'pending';
  const nextMember: GroupMember = {
    id: randomId(),
    group_id: groupId,
    user_id: currentUser.id,
    role: 'member',
    status,
    created_at: nowIso(),
  };
  writeGroupMembers([...members, nextMember]);
  if (status === 'pending') {
    const username = readUsers().find((user) => user.id === currentUser.id)?.username ?? 'usuario';
    for (const adminId of group.admin_ids) {
      addActivity(adminId, `Novo pedido no grupo "${group.name}" (#${group.id}) de @${username}.`, 0);
    }
  }
  return status;
}

export async function approveGroupMember(groupId: string, userId: string) {
  const currentUser = requireSession();
  const group = getGroupOrThrow(groupId);
  if (!isActiveGroupAdmin(group, currentUser.id)) throw new Error('Apenas administradores podem aprovar entradas.');
  const members = readGroupMembers();
  const activeCount = members.filter((member) => member.group_id === groupId && member.status === 'active').length;
  if (activeCount >= group.max_members) throw new Error('O grupo ja atingiu o limite de participantes.');
  const target = members.find((member) => member.group_id === groupId && member.user_id === userId && member.status === 'pending');
  if (!target) throw new Error('Solicitacao de entrada nao encontrada.');

  writeGroupMembers(members.map((member) => (
    member.id === target.id ? { ...member, status: 'active' as const } : member
  )));
  addActivity(userId, `Seu pedido para entrar no grupo "${group.name}" (#${group.id}) foi aceito.`, 0);
}

export async function rejectGroupMember(groupId: string, userId: string) {
  const currentUser = requireSession();
  const group = getGroupOrThrow(groupId);
  if (!isActiveGroupAdmin(group, currentUser.id)) throw new Error('Apenas administradores podem recusar entradas.');
  const members = readGroupMembers();
  const target = members.find((member) => member.group_id === groupId && member.user_id === userId && member.status === 'pending');
  if (!target) throw new Error('Solicitacao de entrada nao encontrada.');

  writeGroupMembers(members.filter((member) => member.id !== target.id));
  addActivity(userId, `Seu pedido para entrar no grupo "${group.name}" (#${group.id}) foi recusado.`, 0);
}

export async function listGroupMembers(groupId: string) {
  const currentUser = requireSession();
  const group = getGroupOrThrow(groupId);
  const isMember = readGroupMembers().some(
    (member) => member.group_id === groupId && member.user_id === currentUser.id && member.status === 'active',
  );
  if (!isMember) throw new Error('Voce nao participa deste grupo.');
  return readGroupMembers().filter((member) => member.group_id === group.id);
}

function buildGroupScores(groupId: string): GroupScore[] {
  const scores = new Map<string, { user_id: string; points: number; checks: number }>();
  for (const check of readGroupChecks().filter((item) => item.group_id === groupId)) {
    const current = scores.get(check.user_id) ?? { user_id: check.user_id, points: 0, checks: 0 };
    current.points += check.points;
    current.checks += 1;
    scores.set(check.user_id, current);
  }
  return Array.from(scores.values()).sort((a, b) => b.points - a.points || b.checks - a.checks);
}

function buildGroupGoalProgress(group: Group, memberIds: string[]): GroupGoalProgress[] {
  const series = readSeries();
  const checks = readGroupChecks();
  const progress: GroupGoalProgress[] = [];

  for (const goal of group.goals) {
    for (const userId of memberIds) {
      let current = 0;
      let target = goal.type === 'watch_movies' ? Math.max(1, goal.target_count || 1) : 1;

      if (goal.type === 'watch_movies') {
        const suggestedIds = new Set(readGroupMovieSuggestions().filter((item) => item.group_id === group.id && item.goal_id === goal.id && item.suggested_by !== userId).map((item) => normalizeMovieId(item.media_id)));
        current = new Set(
          checks
            .filter((check) => check.group_id === group.id && check.user_id === userId && check.media_type === 'movie' && suggestedIds.has(normalizeMovieId(check.media_id)))
            .map((check) => normalizeMovieId(check.media_id)),
        ).size;
      } else {
        const matchingSeries = series.filter((item) => {
          if (item.user_id !== userId) return false;
          const matchesId = goal.target_id && item.source_series_id === goal.target_id;
          const matchesTitle = goal.target_label && titleKey(item.titulo) === titleKey(goal.target_label);
          return Boolean(matchesId || matchesTitle);
        });
        current = matchingSeries.some((item) => {
          if (item.status !== 'watched') return false;
          if (goal.type === 'finish_series') return true;
          return (item.temporada || 0) >= (goal.season_number || 1);
        }) ? 1 : 0;
      }

      progress.push({
        goal_id: goal.id,
        user_id: userId,
        current,
        target,
        completed: current >= target,
      });
    }
  }
  return progress;
}

export async function listGroupScores(groupId: string) {
  const currentUser = requireSession();
  getGroupOrThrow(groupId);
  const isMember = readGroupMembers().some(
    (member) => member.group_id === groupId && member.user_id === currentUser.id && member.status === 'active',
  );
  if (!isMember) throw new Error('Voce nao participa deste grupo.');
  return buildGroupScores(groupId);
}

export async function listGroupGoalProgress(groupId: string): Promise<GroupGoalProgress[]> {
  const currentUser = requireSession();
  const group = getGroupOrThrow(groupId);
  const memberIds = readGroupMembers()
    .filter((member) => member.group_id === groupId && member.status === 'active')
    .map((member) => member.user_id);
  if (!memberIds.includes(currentUser.id)) throw new Error('Voce nao participa deste grupo.');
  return buildGroupGoalProgress(group, memberIds);
}

export async function getGroupPageData(groupId: string): Promise<GroupPageData> {
  const currentUser = requireSession();
  const group = getGroupOrThrow(groupId);
  const members = readGroupMembers().filter((member) => member.group_id === groupId);
  const activeMemberIds = members.filter((member) => member.status === 'active').map((member) => member.user_id);
  return {
    group,
    members,
    scores: buildGroupScores(groupId),
    goal_progress: buildGroupGoalProgress(group, activeMemberIds),
    movie_suggestions: readGroupMovieSuggestions().filter((item) => item.group_id === groupId),
    current_membership: members.find((member) => member.user_id === currentUser.id) ?? null,
  };
}

export async function listPublicGroups() {
  const members = readGroupMembers();
  return readGroups().filter((group) => group.privacy === 'public').filter((group) => (
    members.filter((member) => member.group_id === group.id && member.status === 'active').length < group.max_members
  ));
}

export async function getOscarMoviesForUser(userId: string) {
  const statuses = new Map(
    readOscarStatuses()
      .filter((item) => item.user_id === userId)
      .map((item) => [item.oscar_movie_id, item.status]),
  );
  return ensureOscarCatalog().map((movie) => ({
    ...movie,
    status: statuses.get(movie.id) ?? 'watchlist',
  })) as OscarMovieWithStatus[];
}

export async function addOscarMovie(userId: string, movie: Omit<OscarMovie, 'id'>) {
  requireSession(userId);
  const oscarMovies = readOscarMovies();
  const created: OscarMovie = { ...movie, id: randomId() };
  oscarMovies.push(created);
  writeOscarMovies(oscarMovies);
  updateUserMcoins(userId, 5);
  addActivity(userId, `${getCurrentSessionUserSync()?.username ?? 'Usuario'} indicou ${movie.titulo} para a lista.`, 5);
  return created;
}

export async function setOscarMovieStatus(userId: string, movie: OscarMovie, status: MovieStatus) {
  requireSession(userId);
  const items = readOscarStatuses();
  const existing = items.find((item) => item.user_id === userId && item.oscar_movie_id === movie.id);
  const previousStatus = existing?.status;

  if (existing) {
    existing.status = status;
    existing.updated_at = nowIso();
  } else {
    items.push({
      id: randomId(),
      user_id: userId,
      oscar_movie_id: movie.id,
      status,
      updated_at: nowIso(),
    });
  }
  writeOscarStatuses(items);

  const personalMovies = readPersonalMovies();
  const existingPersonal = personalMovies.find(
    (item) => item.user_id === userId && item.source === 'oscar' && item.source_movie_id === movie.id,
  );

  if (existingPersonal) {
    existingPersonal.status = status;
    existingPersonal.plataforma_slug = movie.plataforma_slug;
  } else {
    personalMovies.push({
      id: randomId(),
      user_id: userId,
      titulo: movie.titulo,
      ano_lancamento: movie.ano_oscar,
      capa_url: movie.capa_url,
      plataforma_slug: movie.plataforma_slug,
      status,
      source: 'oscar',
      source_movie_id: movie.id,
      created_at: nowIso(),
    });
  }
  writePersonalMovies(personalMovies);

  if (status === 'watched' && previousStatus !== 'watched') {
    updateUserMcoins(userId, 30);
    addActivity(userId, `assistiu ao filme ${movie.titulo}.`, 30);
    registerGroupCheck(userId, 'movie', movie.id, movie.titulo);
  }
}

export async function listPersonalMovies(userId: string) {
  return readPersonalMovies()
    .filter((movie) => movie.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addPersonalMovie(
  userId: string,
  movie: Omit<PersonalMovie, 'id' | 'user_id' | 'created_at'>,
) {
  requireSession(userId);
  const items = readPersonalMovies();
  if (items.some((item) => item.user_id === userId && titleKey(item.titulo) === titleKey(movie.titulo))) {
    throw new Error('Esse filme ja esta na sua lista.');
  }
  const created: PersonalMovie = {
    ...movie,
    id: randomId(),
    user_id: userId,
    created_at: nowIso(),
  };
  items.push(created);
  writePersonalMovies(items);
  if (created.status === 'watched' && !created.is_retroactive) {
    const recommendation = created.source_movie_id?.match(/^tmdb:(\d+)\|rec:([A-Za-z0-9_-]+)$/);
    if (recommendation) {
      const watchPoints = canScoreToday(created.user_id, 'movie_watch', 1) ? movieWatchPoints(created) : 0;
      updateUserMcoins(created.user_id, watchPoints);
      addActivity(created.user_id, `assistiu ao filme indicado: ${created.titulo}.`, watchPoints, watchPoints ? 'movie_watch' : undefined);
      addActivity(recommendation[2], `seu filme indicado (${created.titulo}) foi assistido.`, 0);
    } else {
      const watchPoints = canScoreToday(created.user_id, 'movie_watch', 1) ? movieWatchPoints(created) : 0;
      updateUserMcoins(created.user_id, watchPoints);
      addActivity(created.user_id, `assistiu ao filme ${created.titulo}.`, watchPoints, watchPoints ? 'movie_watch' : undefined);
    }
    registerGroupCheck(created.user_id, 'movie', created.source_movie_id || created.id, created.titulo, created.review, created.duration_minutes);
  }
  return created;
}

export async function updatePersonalMovie(
  movieId: string,
  updates: Partial<Pick<PersonalMovie, 'status' | 'plataforma_slug' | 'avaliacao'>>,
) {
  const items = readPersonalMovies();
  const index = items.findIndex((item) => item.id === movieId);
  if (index < 0) throw new Error('Filme nao encontrado.');
  requireSession(items[index].user_id);
  const previous = items[index];
  const next = { ...previous, ...updates };
  items[index] = next;
  writePersonalMovies(items);
  const isRetroactive = previous.is_retroactive || previous.plataforma_slug?.endsWith('|retroactive') || previous.source_movie_id?.endsWith('|retroactive') || previous.source_movie_id === 'retroactive';
  if (previous.status !== 'watched' && next.status === 'watched' && !isRetroactive) {
    const watchPoints = canScoreToday(next.user_id, 'movie_watch', 1) ? movieWatchPoints(next) : 0;
    updateUserMcoins(next.user_id, watchPoints);
    addActivity(next.user_id, `assistiu ao filme ${next.titulo}.`, watchPoints, watchPoints ? 'movie_watch' : undefined);
    registerGroupCheck(next.user_id, 'movie', next.source_movie_id || next.id, next.titulo, next.review, next.duration_minutes);
  }
  return next;
}

export async function deletePersonalMovie(movieId: string) {
  const items = readPersonalMovies();
  const current = items.find((item) => item.id === movieId);
  if (!current) return;
  requireSession(current.user_id);
  writePersonalMovies(items.filter((item) => item.id !== movieId));
  deleteActivitiesForTitle(current.user_id, current.titulo);
}

export async function listSeries(userId: string) {
  return readSeries()
    .filter((item) => item.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addSeries(
  userId: string,
  series: Omit<SeriesEntry, 'id' | 'user_id' | 'created_at'>,
) {
  requireSession(userId);
  const items = readSeries();
  if (items.some((item) => item.user_id === userId && titleKey(item.titulo) === titleKey(series.titulo))) {
    throw new Error('Essa serie ja esta cadastrada.');
  }
  const created: SeriesEntry = {
    ...series,
    id: randomId(),
    user_id: userId,
    created_at: nowIso(),
  };
  items.push(created);
  writeSeries(items);
  if (created.status !== 'watchlist' && !created.is_retroactive) {
    const usedToday = readActivitiesStore().filter((item) => item.user_id === userId && item.score_type === 'episode_watch' && localDay(item.created_at) === localDay(nowIso())).reduce((total, item) => total + Math.floor(Math.max(0, item.mcoins_delta) / 3), 0);
    const scoredEpisodes = Math.min(created.episodios_vistos, Math.max(0, 3 - usedToday));
    if (scoredEpisodes > 0) {
      const points = scoredEpisodes * 3;
      updateUserMcoins(userId, points);
      addActivity(userId, `assistiu ${scoredEpisodes} episodio(s) de ${created.titulo}.`, points, 'episode_watch');
    }
    if (created.status === 'watched') {
      registerGroupCheck(userId, 'series', created.source_series_id || created.id, created.titulo, created.review);
    }
  }
  return created;
}

export async function updateSeries(
  seriesId: string,
  updates: Partial<
    Pick<
      SeriesEntry,
      | 'titulo'
      | 'capa_url'
      | 'streaming_data'
      | 'status'
      | 'temporada'
      | 'total_episodios'
      | 'episodios_vistos'
      | 'plataforma_slug'
      | 'avaliacao'
      | 'source_series_id'
    >
  >,
) {
  const items = readSeries();
  const index = items.findIndex((item) => item.id === seriesId);
  if (index < 0) throw new Error('Serie nao encontrada.');
  const current = items[index];
  requireSession(current.user_id);
  const next: SeriesEntry = { ...current, ...updates };
  if (updates.episodios_vistos !== undefined || updates.total_episodios !== undefined) {
    next.status = getSeriesStatus(next.episodios_vistos, next.total_episodios);
  }
  items[index] = next;
  writeSeries(items);
  
  const isRetroactive = current.is_retroactive || current.plataforma_slug?.endsWith('|retroactive');
  if (next.episodios_vistos > current.episodios_vistos && !isRetroactive) {
    const newEpisodes = next.episodios_vistos - current.episodios_vistos;
    const usedToday = readActivitiesStore()
      .filter((item) => item.user_id === next.user_id && item.score_type === 'episode_watch' && localDay(item.created_at) === localDay(nowIso()))
      .reduce((total, item) => total + Math.floor(Math.max(0, item.mcoins_delta) / 3), 0);
    const scoredEpisodes = Math.min(newEpisodes, Math.max(0, 3 - usedToday));
    if (scoredEpisodes > 0) {
      const points = scoredEpisodes * 3;
      updateUserMcoins(next.user_id, points);
      addActivity(next.user_id, `assistiu ${scoredEpisodes} episodio(s) de ${next.titulo}.`, points, 'episode_watch');
    }
  }
  if (current.status !== 'watched' && next.status === 'watched' && !isRetroactive) {
    registerGroupCheck(next.user_id, 'series', next.source_series_id || next.id, next.titulo, next.review);
  }
  return next;
}

function readSeriesEpisodeFeedback() {
  return readJson<SeriesEpisodeFeedback[]>(KEYS.seriesEpisodeFeedback, []);
}

export async function updateSeriesStatus(seriesId: string, status: SeriesStatus) {
  const items = readSeries();
  const index = items.findIndex((item) => item.id === seriesId);
  if (index < 0) throw new Error('Serie nao encontrada.');
  const current = items[index];
  requireSession(current.user_id);
  if (status === 'watched') items[index] = { ...current, status, episodios_vistos: Math.max(current.total_episodios, current.episodios_vistos) };
  else items[index] = { ...current, status };
  writeSeries(items);
  return items[index];
}

export async function setSeriesEpisodeReaction(
  actorUserId: string,
  seriesId: string,
  seasonNumber: number,
  episodeNumber: number,
  reaction: EpisodeReaction | null,
) {
  const series = readSeries().find((item) => item.id === seriesId);
  if (!series) throw new Error('Serie nao encontrada.');
  requireSession(actorUserId);
  if (series.user_id !== actorUserId) throw new Error('Apenas o dono pode reagir aos episodios.');
  if (series.temporada !== seasonNumber || series.episodios_vistos < episodeNumber) throw new Error('Assista ao episodio antes de reagir.');
  const feedbackSeriesId = series.source_series_id || titleKey(series.titulo);
  const items = readSeriesEpisodeFeedback();
  const existing = items.find((item) => item.series_id === feedbackSeriesId && item.user_id === actorUserId && item.season_number === seasonNumber && item.episode_number === episodeNumber);
  const timestamp = nowIso();
  const next = existing
    ? items.map((item) => item.id === existing.id ? { ...item, reaction, updated_at: timestamp } : item)
    : [...items, { id: randomId(), series_id: feedbackSeriesId, user_id: actorUserId, season_number: seasonNumber, episode_number: episodeNumber, reaction, rating: null, created_at: timestamp, updated_at: timestamp }];
  writeJson(KEYS.seriesEpisodeFeedback, next);
}

export async function rateSeriesEpisode(actorUserId: string, seriesId: string, seasonNumber: number, episodeNumber: number, rating: number | null) {
  const series = readSeries().find((item) => item.id === seriesId);
  if (!series) throw new Error('Serie nao encontrada.');
  requireSession(actorUserId);
  if (series.user_id !== actorUserId || series.temporada !== seasonNumber || series.episodios_vistos < episodeNumber) throw new Error('Assista ao episodio antes de avaliar.');
  if (rating !== null && (rating < 0 || rating > 5)) throw new Error('Nota de episodio invalida.');
  const feedbackSeriesId = series.source_series_id || titleKey(series.titulo);
  const items = readSeriesEpisodeFeedback();
  const existing = items.find((item) => item.series_id === feedbackSeriesId && item.user_id === actorUserId && item.season_number === seasonNumber && item.episode_number === episodeNumber);
  const timestamp = nowIso();
  const next = existing
    ? items.map((item) => item.id === existing.id ? { ...item, rating, updated_at: timestamp } : item)
    : [...items, { id: randomId(), series_id: feedbackSeriesId, user_id: actorUserId, season_number: seasonNumber, episode_number: episodeNumber, reaction: null, rating, created_at: timestamp, updated_at: timestamp }];
  writeJson(KEYS.seriesEpisodeFeedback, next);
}

export async function listSeriesEpisodeFeedback(seriesId: string) {
  const series = readSeries().find((item) => item.id === seriesId);
  const key = series ? (series.source_series_id || titleKey(series.titulo)) : seriesId;
  return readSeriesEpisodeFeedback().filter((item) => item.series_id === key);
}

export async function updateOscarMoviePlatform(movieId: string, platformSlug: string) {
  requireSession();
  const items = readOscarMovies();
  writeOscarMovies(items.map((item) => (item.id === movieId ? { ...item, plataforma_slug: platformSlug } : item)));
}

export async function updateOscarMovieStreaming(movieId: string, streamingData: string) {
  requireSession();
  const items = readOscarMovies();
  writeOscarMovies(items.map((item) => (item.id === movieId ? { ...item, streaming_data: streamingData } : item)));
}

export async function updatePersonalMovieStreaming(movieId: string, streamingData: string) {
  const items = readPersonalMovies();
  const current = items.find((item) => item.id === movieId);
  if (!current) return;
  requireSession(current.user_id);
  writePersonalMovies(items.map((item) => (item.id === movieId ? { ...item, streaming_data: streamingData } : item)));
}

export async function updateSeriesStreaming(seriesId: string, streamingData: string) {
  const items = readSeries();
  const current = items.find((item) => item.id === seriesId);
  if (!current) return;
  requireSession(current.user_id);
  writeSeries(items.map((item) => (item.id === seriesId ? { ...item, streaming_data: streamingData } : item)));
}

export async function suggestMovieToUser(
  fromUserId: string,
  toUserId: string,
  movie: Omit<PersonalMovie, 'id' | 'user_id' | 'created_at'>,
  mediaType: 'movie' | 'tv' = 'movie',
) {
  requireSession(fromUserId);
  if (mediaType === 'movie') {
    await addPersonalMovie(toUserId, {
      ...movie,
      source_movie_id: movie.source_movie_id ? `tmdb:${movie.source_movie_id}|rec:${fromUserId}` : null,
    });
  } else {
    await addSeries(toUserId, {
      titulo: movie.titulo,
      capa_url: movie.capa_url,
      status: 'watchlist',
      temporada: 1,
      total_episodios: 1,
      episodios_vistos: 0,
      plataforma_slug: 'stremio',
      streaming_data: movie.streaming_data ?? null,
      rating: movie.rating ?? null,
    });
  }
  updateUserMcoins(fromUserId, 5);
  const actor = readUsers().find((item) => item.id === fromUserId)?.username ?? 'Usuario';
  const target = readUsers().find((item) => item.id === toUserId)?.username ?? 'Usuario';
  const label = mediaType === 'movie' ? 'filme' : 'serie';
  addActivity(toUserId, `@${actor} indicou ${label} ${movie.titulo} para voce.`, 0);
  addActivity(fromUserId, `${actor} indicou ${label} ${movie.titulo} para @${target}.`, 5);
}

export async function reactToMovie(
  actorUserId: string,
  targetUserId: string,
  movieTitle: string,
  reaction: string,
) {
  requireSession(actorUserId);
  const actor = readUsers().find((item) => item.id === actorUserId)?.username ?? 'Usuario';
  addActivity(targetUserId, `${actor} reagiu com ${reaction} ao seu filme ${movieTitle}.`, 0);
}

function readCineMatchSessions() {
  return readJson<CineMatchSession[]>(KEYS.cineMatchSessions, []);
}

function readWatchParties() {
  return readJson<WatchParty[]>(KEYS.watchParties, []);
}

function recordCollaborationMedia(participantIds: string[], mediaType: CollaborationMediaType, mediaId: string | null, mediaTitle: string) {
  if (!mediaId) return;
  const timestamp = nowIso();
  if (mediaType === 'movie') {
    const movies = readPersonalMovies();
    const additions = participantIds.filter((userId) => !movies.some((movie) => movie.user_id === userId && (movie.source_movie_id === mediaId || titleKey(movie.titulo) === titleKey(mediaTitle)))).map((userId): PersonalMovie => ({
      id: randomId(), user_id: userId, titulo: mediaTitle, ano_lancamento: null, capa_url: null, plataforma_slug: null, status: 'watched', source: 'manual', source_movie_id: mediaId, rating: null, review: null, created_at: timestamp,
    }));
    if (additions.length) writePersonalMovies([...movies, ...additions]);
    participantIds.forEach((userId) => registerGroupCheck(userId, 'movie', mediaId, mediaTitle));
  } else {
    const series = readSeries();
    const additions = participantIds.filter((userId) => !series.some((item) => item.user_id === userId && (item.source_series_id === mediaId || titleKey(item.titulo) === titleKey(mediaTitle)))).map((userId): SeriesEntry => ({
      id: randomId(), user_id: userId, titulo: mediaTitle, source_series_id: mediaId, capa_url: null, status: 'watched', temporada: 1, total_episodios: 1, episodios_vistos: 1, plataforma_slug: null, rating: null, review: null, created_at: timestamp,
    }));
    if (additions.length) writeSeries([...series, ...additions]);
    participantIds.forEach((userId) => registerGroupCheck(userId, 'series', mediaId, mediaTitle));
  }
}

function expireWatchParties() {
  const parties = readWatchParties();
  const now = Date.now();
  const updated = parties.map((party) => party.status === 'active' && new Date(party.end_date).getTime() < now
    ? { ...party, status: 'failed' as const }
    : party);
  if (updated.some((party, index) => party.status !== parties[index].status)) writeJson(KEYS.watchParties, updated);
  return updated;
}

export async function createCineMatch(
  ownerId: string,
  participantIds: string[],
  mediaType: CollaborationMediaType,
  mediaId: string,
  mediaTitle: string,
) {
  requireSession(ownerId);
  const participants = Array.from(new Set([ownerId, ...participantIds]));
  if (participants.length < 2) throw new Error('Selecione pelo menos um amigo.');
  const users = readUsers();
  if (participants.some((id) => !users.some((user) => user.id === id))) throw new Error('Participante nao encontrado.');
  const session: CineMatchSession = { id: randomId(), owner_id: ownerId, participant_ids: participants, media_type: mediaType, media_id: normalizeMovieId(mediaId), media_title: mediaTitle.trim(), status: 'active', created_at: nowIso(), completed_at: null };
  writeJson(KEYS.cineMatchSessions, [...readCineMatchSessions(), session]);
  const owner = users.find((user) => user.id === ownerId)?.username ?? 'Usuario';
  participants.filter((id) => id !== ownerId).forEach((id) => addActivity(id, `@${owner} iniciou um Cine-Match presencial para assistir ${mediaTitle}.`, 0));
  return session;
}

export async function completeCineMatch(sessionId: string) {
  const currentUser = requireSession();
  const sessions = readCineMatchSessions();
  const session = sessions.find((item) => item.id === sessionId);
  if (!session || !session.participant_ids.includes(currentUser.id)) throw new Error('Cine-Match nao encontrado.');
  if (session.status !== 'active') return session;
  const completed = { ...session, status: 'completed' as const, completed_at: nowIso() };
  writeJson(KEYS.cineMatchSessions, sessions.map((item) => item.id === sessionId ? completed : item));
  recordCollaborationMedia(session.participant_ids, session.media_type, session.media_id, session.media_title);
  session.participant_ids.forEach((id) => {
    updateUserMcoins(id, 1);
    addActivity(id, `Cine-Match concluido: ${session.media_title}.`, 1);
  });
  return completed;
}

export async function createWatchParty(input: Omit<WatchParty, 'id' | 'status' | 'created_at' | 'completed_at'>) {
  requireSession(input.owner_id);
  if (!input.name.trim()) throw new Error('Informe um nome para a Watchparty.');
  if (!input.media_title.trim()) throw new Error('Informe o filme ou serie da Watchparty.');
  if (new Date(input.end_date).getTime() <= Date.now()) throw new Error('A data de termino precisa ser futura.');
  const party: WatchParty = { ...input, id: randomId(), name: input.name.trim(), media_title: input.media_title.trim(), status: 'active', created_at: nowIso(), completed_at: null };
  writeJson(KEYS.watchParties, [...readWatchParties(), party]);
  const owner = readUsers().find((user) => user.id === input.owner_id)?.username ?? 'Usuario';
  input.participant_ids.filter((id) => id !== input.owner_id).forEach((id) => addActivity(id, input.privacy === 'public' ? `@${owner} iniciou uma Watchparty publica: ${party.name}.` : `@${owner} convidou voce para a Watchparty ${party.name}.`, 0));
  return party;
}

export async function completeWatchParty(partyId: string) {
  const currentUser = requireSession();
  const parties = expireWatchParties();
  const party = parties.find((item) => item.id === partyId);
  if (!party || !party.participant_ids.includes(currentUser.id)) throw new Error('Watchparty nao encontrada.');
  if (party.status !== 'active') return party;
  const completed = { ...party, status: 'completed' as const, completed_at: nowIso() };
  writeJson(KEYS.watchParties, parties.map((item) => item.id === partyId ? completed : item));
  recordCollaborationMedia(party.participant_ids, party.media_type, party.media_id, party.media_title);
  party.participant_ids.forEach((id) => { updateUserMcoins(id, 1); addActivity(id, `Watchparty concluida: ${party.name}.`, 1); });
  return completed;
}

export async function listCollaborations(userId: string) {
  requireSession(userId);
  return { cineMatches: readCineMatchSessions().filter((item) => item.participant_ids.includes(userId)), watchParties: expireWatchParties().filter((item) => item.participant_ids.includes(userId) || item.privacy === 'public') };
}

export async function rateMovie(
  actorUserId: string,
  movieId: string,
  _movieTitle: string,
  stars: number,
  review?: string | null,
) {
  const items = readPersonalMovies();
  const current = items.find((item) => item.id === movieId);
  if (!current) return;
  requireSession(actorUserId);
  if (current.user_id !== actorUserId) {
    throw new Error('Avaliacao permitida apenas para o dono do filme.');
  }

  const isWatched = current.status === 'watched';
  const isRetroactive = current.is_retroactive || current.plataforma_slug?.endsWith('|retroactive') || current.source_movie_id?.endsWith('|retroactive') || current.source_movie_id === 'retroactive';
  if (isWatched && !isRetroactive) {
    const prevRating = current.rating ?? current.avaliacao ?? null;
    const prevReview = current.review ?? null;

    if (stars > 0 && (prevRating === null || prevRating === 0)) {
      if (within72Hours(current.created_at)) {
        updateUserMcoins(actorUserId, 2);
        addActivity(actorUserId, `avaliou o filme ${current.titulo}.`, 2, 'rating');
      }
    }
    if (review && review.trim() !== '' && (prevReview === null || prevReview.trim() === '')) {
      if (within72Hours(current.created_at)) {
        updateUserMcoins(actorUserId, 2);
        addActivity(actorUserId, `escreveu uma resenha para o filme ${current.titulo}.`, 2, 'review');
      }
    }
  }

  writePersonalMovies(items.map((item) => (item.id === movieId ? { ...item, rating: stars, review: review ?? null } : item)));
  if (isWatched && !isRetroactive && review?.trim()) {
    registerGroupCheck(actorUserId, 'movie', current.source_movie_id || current.id, current.titulo, review, current.duration_minutes);
  }
}

export async function rateSeries(
  actorUserId: string,
  seriesId: string,
  stars: number,
  review?: string | null,
) {
  const items = readSeries();
  const current = items.find((item) => item.id === seriesId);
  if (!current) return;
  requireSession(actorUserId);
  if (current.user_id !== actorUserId) {
    throw new Error('Avaliacao permitida apenas para o dono da serie.');
  }

  const isWatched = current.status === 'watched';
  const isRetroactive = current.is_retroactive || current.plataforma_slug?.endsWith('|retroactive');
  if (isWatched && !isRetroactive) {
    const prevRating = current.rating ?? current.avaliacao ?? null;
    const prevReview = current.review ?? null;

    if (stars > 0 && (prevRating === null || prevRating === 0)) {
      if (within72Hours(current.created_at)) {
        updateUserMcoins(actorUserId, 2);
        addActivity(actorUserId, `avaliou a serie ${current.titulo}.`, 2, 'rating');
      }
    }
    if (review && review.trim() !== '' && (prevReview === null || prevReview.trim() === '')) {
      if (within72Hours(current.created_at)) {
        updateUserMcoins(actorUserId, 2);
        addActivity(actorUserId, `escreveu uma resenha para a serie ${current.titulo}.`, 2, 'review');
      }
    }
  }

  writeSeries(items.map((item) => (item.id === seriesId ? { ...item, rating: stars, review: review ?? null } : item)));
  if (isWatched && !isRetroactive && review?.trim()) {
    registerGroupCheck(actorUserId, 'series', current.source_series_id || current.id, current.titulo, review);
  }
}

export async function deleteSeries(seriesId: string) {
  const items = readSeries();
  const current = items.find((item) => item.id === seriesId);
  if (!current) return;
  requireSession(current.user_id);
  writeSeries(items.filter((item) => item.id !== seriesId));
  deleteActivitiesForTitle(current.user_id, current.titulo);
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

export async function getCineMatchSuggestion(
  currentUserId: string,
  friendUserId: string,
  mode: CineMatchMode,
): Promise<CineMatchSuggestion | null> {
  if (mode === 'geral') {
    const [myOscar, friendOscar, myMovies, friendMovies] = await Promise.all([
      getOscarMoviesForUser(currentUserId),
      getOscarMoviesForUser(friendUserId),
      listPersonalMovies(currentUserId),
      listPersonalMovies(friendUserId),
    ]);

    const pool = [
      ...myOscar.filter((item) => item.status === 'watchlist'),
      ...myMovies.filter((item) => item.status === 'watchlist'),
    ];
    const friendTitles = new Set(
      [...friendOscar.filter((item) => item.status === 'watchlist'), ...friendMovies.filter((item) => item.status === 'watchlist')].map((item) => titleKey(item.titulo)),
    );
    const picked = pickRandom(pool.filter((item) => friendTitles.has(titleKey(item.titulo))));
    if (!picked) return null;
    return {
      titulo: picked.titulo,
      capa_url: picked.capa_url,
      origem: 'geral',
      reason: 'Watchlist em comum encontrada para os dois.',
    };
  }

  const [allOscar, mine, friend] = await Promise.all([
    getOscarMoviesForUser(currentUserId),
    getOscarMoviesForUser(currentUserId),
    getOscarMoviesForUser(friendUserId),
  ]);
  const watchedByMe = new Set(mine.filter((item) => item.status === 'watched').map((item) => item.id));
  const watchedByFriend = new Set(friend.filter((item) => item.status === 'watched').map((item) => item.id));
  const picked = pickRandom(allOscar.filter((item) => !watchedByMe.has(item.id) && !watchedByFriend.has(item.id)));
  if (!picked) return null;
  return {
    titulo: picked.titulo,
    capa_url: picked.capa_url,
    origem: 'oscar',
    reason: 'Oscar pendente para os dois usuarios.',
  };
}

export function getSeriesStatus(episodiosVistos: number, totalEpisodios: number): SeriesStatus {
  if (episodiosVistos <= 0) return 'watchlist';
  return totalEpisodios > 0 && episodiosVistos >= totalEpisodios ? 'watched' : 'watching';
}

export async function getTrendingMovies(): Promise<Array<{ title: string; coverUrl: string | null; userCount: number; lastWatchedAt: string; userIds: string[] }>> {
  const movies = readPersonalMovies();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoMs = thirtyDaysAgo.getTime();

  const watchedInLast30 = movies.filter(
    (m) =>
      m.status === 'watched' &&
      new Date(m.created_at).getTime() >= thirtyDaysAgoMs
  );

  const watcherSets = new Map<string, { title: string; coverUrl: string | null; tmdbId?: string | null; watchers: Set<string>; lastWatchedAt: string }>();

  for (const m of watchedInLast30) {
    const key = m.source_movie_id || m.titulo.toLowerCase().trim();
    let group = watcherSets.get(key);
    if (!group) {
      group = {
        title: m.titulo,
        coverUrl: m.capa_url,
        tmdbId: m.source_movie_id,
        watchers: new Set<string>(),
        lastWatchedAt: m.created_at,
      };
      watcherSets.set(key, group);
    }
    group.watchers.add(m.user_id);
    if (m.created_at > group.lastWatchedAt) {
      group.lastWatchedAt = m.created_at;
    }
  }

  const grouped = Array.from(watcherSets.values()).map((g) => ({
    title: g.title,
    coverUrl: g.coverUrl,
    tmdbId: g.tmdbId,
    userCount: g.watchers.size,
    userIds: Array.from(g.watchers),
    lastWatchedAt: g.lastWatchedAt,
  }));

  grouped.sort((a, b) => {
    if (b.userCount !== a.userCount) {
      return b.userCount - a.userCount;
    }
    return new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime();
  });

  return grouped.slice(0, 5);
}

function readOscarPredictions(): UserOscarPrediction[] {
  return readJson<UserOscarPrediction[]>(KEYS.oscarPredictions, []);
}

function writeOscarPredictions(items: UserOscarPrediction[]) {
  writeJson(KEYS.oscarPredictions, items);
}

export async function getOscarPredictionsForUser(userId: string): Promise<UserOscarPrediction[]> {
  return readOscarPredictions().filter((item) => item.user_id === userId);
}

export async function saveOscarPrediction(
  userId: string,
  category: string,
  tmdbId: string,
  title: string,
  posterPath: string
): Promise<UserOscarPrediction> {
  const items = readOscarPredictions();
  const filtered = items.filter((item) => !(item.user_id === userId && item.category === category));
  const newPrediction: UserOscarPrediction = {
    id: randomId(),
    user_id: userId,
    category,
    tmdb_id: tmdbId,
    title,
    poster_path: posterPath,
    created_at: nowIso(),
  };
  filtered.push(newPrediction);
  writeOscarPredictions(filtered);
  return newPrediction;
}

export async function getAnticipatedMovies(): Promise<AnticipatedMovie[]> {
  const allMovies = readPersonalMovies();
  const watchlistMovies = allMovies.filter((m) => m.status === 'watchlist');

  const watcherSets = new Map<string, { title: string; coverUrl: string | null; tmdbId?: string | null; watchers: Set<string> }>();

  for (const m of watchlistMovies) {
    const key = m.source_movie_id || m.titulo.toLowerCase().trim();
    let group = watcherSets.get(key);
    if (!group) {
      group = {
        title: m.titulo,
        coverUrl: m.capa_url,
        tmdbId: m.source_movie_id,
        watchers: new Set<string>(),
      };
      watcherSets.set(key, group);
    }
    group.watchers.add(m.user_id);
  }

  const grouped = Array.from(watcherSets.values()).map((g) => ({
    title: g.title,
    coverUrl: g.coverUrl,
    tmdbId: g.tmdbId,
    userCount: g.watchers.size,
    userIds: Array.from(g.watchers),
  }));

  grouped.sort((a, b) => b.userCount - a.userCount);

  return grouped.slice(0, 5);
}

function readFavorites() {
  return readJson<UserFavorite[]>(KEYS.favorites, []);
}

function writeFavorites(items: UserFavorite[]) {
  writeJson(KEYS.favorites, items);
}

export async function listFavorites(ownerUserId: string): Promise<UserFavorite[]> {
  return readFavorites().filter((f) => f.owner_user_id === ownerUserId);
}

export async function addFavorite(ownerUserId: string, favoriteUserId: string): Promise<UserFavorite> {
  const items = readFavorites();
  const existing = items.find((f) => f.owner_user_id === ownerUserId && f.favorite_user_id === favoriteUserId);
  if (existing) return existing;

  const newFav: UserFavorite = {
    id: randomId(),
    owner_user_id: ownerUserId,
    favorite_user_id: favoriteUserId,
    created_at: nowIso(),
  };
  items.push(newFav);
  writeFavorites(items);
  return newFav;
}

export async function removeFavorite(documentId: string): Promise<void> {
  const items = readFavorites();
  writeFavorites(items.filter((f) => f.id !== documentId));
}

export async function resetUserMcoinsForMonth(userId: string, currentMonth: string) {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index >= 0) {
    const dbAvatarId = users[index].avatar_id || '';
    let parsed: any = {};
    if (dbAvatarId.startsWith('{')) {
      try {
        parsed = JSON.parse(dbAvatarId);
      } catch {}
    }

    if (parsed.last_reset_month === currentMonth) {
      return; // Already reset for this month, preserve earned points
    }

    parsed.last_reset_month = currentMonth;
    users[index].mcoins = 0;
    users[index].avatar_id = JSON.stringify(parsed);
    writeUsers(users);
  }
}

export async function countFavoritedBy(userId: string): Promise<number> {
  const items = readFavorites();
  return items.filter((f) => f.favorite_user_id === userId).length;
}

export async function getMovieCineratsStats(sourceMovieId: string | null, title: string) {
  const docs = readPersonalMovies().filter(
    (m) =>
      (sourceMovieId && m.source_movie_id === sourceMovieId) ||
      titleKey(m.titulo) === titleKey(title)
  );
  const watchedDocs = docs.filter((m) => m.status === 'watched');
  const ratings = watchedDocs.map((m) => m.rating ?? m.avaliacao).filter((r) => typeof r === 'number' && r > 0) as number[];
  const avg = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
  const reviews = docs
    .filter((m) => m.review && m.review.trim().length > 0)
    .map((m) => ({
      userId: m.user_id,
      review: m.review!,
      rating: m.rating ?? m.avaliacao ?? null,
      createdAt: m.created_at,
    }));
  return {
    watchersCount: watchedDocs.length,
    averageRating: Number(avg.toFixed(1)),
    reviews,
  };
}

export async function getSeriesCineratsStats(title: string) {
  const docs = readSeries().filter((s) => titleKey(s.titulo) === titleKey(title));
  const watchedDocs = docs.filter((s) => s.status === 'watched' || s.status === 'concluido' as any);
  const ratings = docs.map((s) => s.rating ?? s.avaliacao).filter((r) => typeof r === 'number' && r > 0) as number[];
  const avg = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
  const reviews = docs
    .filter((s) => s.review && s.review.trim().length > 0)
    .map((s) => ({
      userId: s.user_id,
      review: s.review!,
      rating: s.rating ?? s.avaliacao ?? null,
      createdAt: s.created_at,
    }));
  return {
    watchersCount: watchedDocs.length,
    averageRating: Number(avg.toFixed(1)),
    reviews,
  };
}

export function resetLocalDatabase() {
  const removablePrefixes = ['letterboxmzz_', 'cinehub_', 'avatar_image:'];

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key && removablePrefixes.some((prefix) => key.startsWith(prefix))) {
      removeJsonKey(key);
    }
  }
  removeJsonKey('deductions_applied_v1');
}
