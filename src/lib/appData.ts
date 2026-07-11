import * as localData from './localData';
import type { ActivityEntry, SessionUser } from '../types/app';

const MONTHLY_RESET_START = new Date('2026-07-01T00:00:00.000Z').getTime();

function sortActivities(items: ActivityEntry[]) {
  return items.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export const DATABASE_ID = 'local';
export const COLLECTION_USUARIOS_METADATA = 'local_users';

export const bootstrapApp = localData.bootstrapApp;
export const importLegacyDataForUser = localData.importLegacyDataForUser;
export const changePassword = localData.changePassword;
export const adminResetPassword = localData.adminResetPassword;
export const deleteCurrentUser = localData.deleteCurrentUser;
export const getCurrentSessionUser = localData.getCurrentSessionUser;
export const logoutUser = localData.logoutUser;
export const listUsers = localData.listUsers;
export const listRankedUsers = localData.listRankedUsers;
export const listActivities = localData.listActivities;
export const updateUserAvatar = localData.updateUserAvatar;
export const updateUserProfile = localData.updateUserProfile;
export const getOscarMoviesForUser = localData.getOscarMoviesForUser;
export const addOscarMovie = localData.addOscarMovie;
export const setOscarMovieStatus = localData.setOscarMovieStatus;
export const listPersonalMovies = localData.listPersonalMovies;
export const addPersonalMovie = localData.addPersonalMovie;
export const updatePersonalMovie = localData.updatePersonalMovie;
export const deletePersonalMovie = localData.deletePersonalMovie;
export const listSeries = localData.listSeries;
export const addSeries = localData.addSeries;
export const updateSeries = localData.updateSeries;
export const updateSeriesStatus = localData.updateSeriesStatus;
export const setSeriesEpisodeReaction = localData.setSeriesEpisodeReaction;
export const rateSeriesEpisode = localData.rateSeriesEpisode;
export const listSeriesEpisodeFeedback = localData.listSeriesEpisodeFeedback;
export const updateOscarMoviePlatform = localData.updateOscarMoviePlatform;
export const updateOscarMovieStreaming = localData.updateOscarMovieStreaming;
export const updatePersonalMovieStreaming = localData.updatePersonalMovieStreaming;
export const updateSeriesStreaming = localData.updateSeriesStreaming;
export const suggestMovieToUser = localData.suggestMovieToUser;
export const reactToMovie = localData.reactToMovie;
export const rateMovie = localData.rateMovie;
export const rateSeries = localData.rateSeries;
export const deleteSeries = localData.deleteSeries;
export const getCineMatchSuggestion = localData.getCineMatchSuggestion;
export const createCineMatch = localData.createCineMatch;
export const completeCineMatch = localData.completeCineMatch;
export const createWatchParty = localData.createWatchParty;
export const completeWatchParty = localData.completeWatchParty;
export const listCollaborations = localData.listCollaborations;
export const getSeriesStatus = localData.getSeriesStatus;
export const getTrendingMovies = localData.getTrendingMovies;
export const getOscarPredictionsForUser = localData.getOscarPredictionsForUser;
export const saveOscarPrediction = localData.saveOscarPrediction;
export const getAnticipatedMovies = localData.getAnticipatedMovies;
export const listFavorites = localData.listFavorites;
export const addFavorite = localData.addFavorite;
export const removeFavorite = localData.removeFavorite;
export const countFavoritedBy = localData.countFavoritedBy;
export const getMovieCineratsStats = localData.getMovieCineratsStats;
export const getSeriesCineratsStats = localData.getSeriesCineratsStats;
export const listGroupsForUser = localData.listGroupsForUser;
export const createGroup = localData.createGroup;
export const addGroupAdmin = localData.addGroupAdmin;
export const updateGroupScoringRules = localData.updateGroupScoringRules;
export const requestGroupEntry = localData.requestGroupEntry;
export const approveGroupMember = localData.approveGroupMember;
export const rejectGroupMember = localData.rejectGroupMember;
export const listGroupMembers = localData.listGroupMembers;
export const listGroupScores = localData.listGroupScores;
export const listGroupGoalProgress = localData.listGroupGoalProgress;
export const getGroupPageData = localData.getGroupPageData;
export const listGroupMovieSuggestions = localData.listGroupMovieSuggestions;
export const suggestGroupMovie = localData.suggestGroupMovie;
export const advanceGroupMovieGoal = localData.advanceGroupMovieGoal;
export const listPublicGroups = localData.listPublicGroups;
export const resetLocalDatabase = localData.resetLocalDatabase;

export async function loginUser(identifier: string, password: string) {
  return localData.loginUser(identifier, password);
}

export async function registerUser(username: string, _email: string, password: string) {
  return localData.registerUser(username, password);
}

export async function createLocalPreviewSession(): Promise<SessionUser> {
  const users = await localData.listRankedUsers();
  const existingPreview = users.find((user) => user.username === 'preview-local');
  if (existingPreview) {
    await localData.loginUser(existingPreview.username, existingPreview.username);
    return { id: existingPreview.id, username: existingPreview.username };
  }

  return localData.registerUser('preview-local', 'preview-local');
}

export async function createLocalPreviewSessionTwo(): Promise<SessionUser> {
  const users = await localData.listRankedUsers();
  const existingPreview = users.find((user) => user.username === 'preview-local-2');
  if (existingPreview) {
    await localData.loginUser(existingPreview.username, existingPreview.username);
    return { id: existingPreview.id, username: existingPreview.username };
  }

  return localData.registerUser('preview-local-2', 'preview-local-2');
}

export async function checkAndRunMonthlyReset() {
  if (Date.now() < MONTHLY_RESET_START) return;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const users = await localData.listRankedUsers();
  await Promise.all(users.map((user) => localData.resetUserMcoinsForMonth(user.id, currentMonth)));
}

export async function listNotifications(userId: string, limit = 20) {
  return localData.listNotifications(userId, limit);
}

export async function listUserActivity(userIds: string[], limit = 20) {
  const groups = await Promise.all(userIds.map((userId) => localData.listUserActivity(userId, limit)));
  return sortActivities(groups.flat()).slice(0, limit);
}

export function isIncomingNotificationMessage(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('para voce')
    || normalized.includes('ao seu filme')
    || normalized.includes('novo pedido no grupo')
    || normalized.includes('seu pedido para entrar no grupo');
}

export function clearAppDataCache() {
  return;
}
