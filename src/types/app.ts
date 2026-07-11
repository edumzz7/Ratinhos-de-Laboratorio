export type MovieStatus = 'watchlist' | 'watched';
export type SeriesStatus = 'watchlist' | 'watching' | 'watched' | 'dropped' | 'paused' | 'rewatching';

export interface AppUser {
  id: string;
  username: string;
  created_at: string;
}

export interface UserMetadata {
  user_id: string;
  mcoins: number;
  avatar_id: string;
  display_name?: string;
  favorite_movie?: string;
  favorite_movie_2?: string;
  favorite_genre?: string;
  favorite_series?: string;
  watch_preference?: 'home' | 'cinema';
}

export interface RankedUser extends AppUser, UserMetadata {
  rank: number;
}

export interface OscarMovie {
  id: string;
  titulo: string;
  ano_oscar: number;
  categoria_principal: string | null;
  capa_url: string | null;
  plataforma_slug: string | null;
  rating?: number | null;
  streaming_data?: string | null;
}

export interface OscarMovieWithStatus extends OscarMovie {
  status: MovieStatus;
}

export interface PersonalMovie {
  id: string;
  user_id: string;
  titulo: string;
  ano_lancamento: number | null;
  capa_url: string | null;
  plataforma_slug: string | null;
  status: MovieStatus;
  source: 'manual' | 'oscar';
  source_movie_id: string | null;
  indicado_por_user_id?: string | null;
  avaliacao?: number | null;
  rating?: number | null;
  review?: string | null;
  streaming_data?: string | null;
  created_at: string;
  duration_minutes?: number | null;
  is_retroactive?: boolean;
}

export interface SeriesEntry {
  id: string;
  user_id: string;
  titulo: string;
  source_series_id?: string | null;
  capa_url: string | null;
  status: SeriesStatus;
  temporada: number;
  total_episodios: number;
  episodios_vistos: number;
  plataforma_slug: string | null;
  indicado_por_user_id?: string | null;
  avaliacao?: number | null;
  rating?: number | null;
  review?: string | null;
  streaming_data?: string | null;
  created_at: string;
  is_retroactive?: boolean;
  watchparty_id?: string | null;
}

export type EpisodeReaction = 'plot_twist' | 'absurd' | 'love' | 'laugh' | 'dislike';

export interface SeriesEpisodeFeedback {
  id: string;
  series_id: string;
  user_id: string;
  season_number: number;
  episode_number: number;
  reaction: EpisodeReaction | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface SessionUser {
  id: string;
  username: string;
}

export interface ActivityEntry {
  id: string;
  user_id: string;
  message: string;
  mcoins_delta: number;
  created_at: string;
  score_type?: 'movie_watch' | 'episode_watch' | 'rating' | 'review';
}

export interface UserFavorite {
  id: string;
  owner_user_id: string;
  favorite_user_id: string;
  created_at: string;
}

export type CineMatchMode = 'geral' | 'oscar';

export interface CineMatchSuggestion {
  titulo: string;
  capa_url: string | null;
  origem: CineMatchMode;
  reason: string;
}

export type CollaborationMediaType = 'movie' | 'series';
export type CollaborationStatus = 'active' | 'completed' | 'failed';

export interface CineMatchSession {
  id: string;
  owner_id: string;
  participant_ids: string[];
  media_type: CollaborationMediaType;
  media_id: string;
  media_title: string;
  status: CollaborationStatus;
  created_at: string;
  completed_at: string | null;
}

export type WatchPartyPrivacy = 'private' | 'public';

export interface WatchParty {
  id: string;
  owner_id: string;
  participant_ids: string[];
  name: string;
  theme: string | null;
  media_type: CollaborationMediaType;
  media_id: string | null;
  media_title: string;
  end_date: string;
  privacy: WatchPartyPrivacy;
  status: CollaborationStatus;
  created_at: string;
  completed_at: string | null;
  linked_series_id?: string | null;
  linked_series_title?: string | null;
  series_goal?: string | null;
  series_goal_deadline?: string | null;
}

export interface TrendingMovie {
  title: string;
  coverUrl: string | null;
  userCount: number;
  lastWatchedAt: string;
  tmdbId?: string | null;
  userIds: string[];
}

export interface AnticipatedMovie {
  title: string;
  coverUrl: string | null;
  userCount: number;
  tmdbId?: string | null;
  userIds: string[];
}
export interface UserOscarPrediction {
  id: string;
  user_id: string;
  category: string;
  tmdb_id: string;
  title: string;
  poster_path: string;
  created_at: string;
}

export type GroupPrivacy = 'public' | 'private';
export type GroupEntryPermission = 'open' | 'approval' | 'invite_only';
export type GroupMode = 'casual' | 'competitive';
export type GroupTheme = 'oscar' | 'halloween' | 'christmas' | 'marathon' | 'none';
export type GroupGoalType = 'finish_season' | 'finish_series' | 'watch_movies';

export interface GroupScoringRules {
  allow_rewatch: boolean;
  rewatch_policy?: 'valid' | 'invalid' | 'partial';
  daily_limit: number | null;
  review_required: boolean;
}

export interface GroupGoal {
  id: string;
  type: GroupGoalType;
  target_id: string | null;
  target_label: string | null;
  target_count: number | null;
  season_number?: number | null;
  deadline: string | null;
  sequence?: number;
  completed_at?: string | null;
}

export interface GroupMovieSuggestion {
  id: string;
  group_id: string;
  goal_id?: string;
  suggested_by: string;
  media_id: string;
  media_title: string;
  poster_path?: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  privacy: GroupPrivacy;
  entry_permission: GroupEntryPermission;
  mode: GroupMode;
  max_members: number;
  scoring_rules: GroupScoringRules;
  owner_id: string;
  admin_ids: string[];
  goals: GroupGoal[];
  theme: GroupTheme;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export type GroupMemberRole = 'admin' | 'member';
export type GroupMemberStatus = 'active' | 'pending' | 'invited';

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  created_at: string;
}

export interface GroupCheckEvent {
  id: string;
  group_id: string;
  user_id: string;
  media_type: 'movie' | 'series';
  media_id: string;
  media_title: string;
  points: number;
  checked_at: string;
}

export interface GroupGoalProgress {
  goal_id: string;
  user_id: string;
  current: number;
  target: number;
  completed: boolean;
}

export interface GroupScore {
  user_id: string;
  points: number;
  checks: number;
}

export interface GroupPageData {
  group: Group;
  members: GroupMember[];
  scores: GroupScore[];
  goal_progress: GroupGoalProgress[];
  current_membership: GroupMember | null;
  movie_suggestions: GroupMovieSuggestion[];
}

export type CreateGroupInput = Omit<Group, 'id' | 'invite_code' | 'created_at' | 'updated_at'>;
