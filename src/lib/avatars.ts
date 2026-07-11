export const CUSTOM_AVATAR_PREFIX = 'avatar_image:';
const CUSTOM_AVATAR_STORAGE_PREFIX = 'letterboxmzz_custom_avatar_';

export const AVATAR_OPTIONS = [
  { id: 'avatar_popcorn', emoji: '\u{1F37F}', label: 'Pipoca' },
  { id: 'avatar_clapper', emoji: '\u{1F3AC}', label: 'Claquete' },
  { id: 'avatar_projector', emoji: '\u{1F4FD}\uFE0F', label: 'Projetor' },
  { id: 'avatar_bat', emoji: '\u{1F987}', label: 'Morcego' },
  { id: 'avatar_wizard', emoji: '\u{1F9D9}\u200D\u2642\uFE0F', label: 'Mago' },
  { id: 'avatar_ufo', emoji: '\u{1F6F8}', label: 'OVNI' },
  { id: 'avatar_zombie', emoji: '\u{1F9DF}', label: 'Zumbi' },
  { id: 'avatar_detective', emoji: '\u{1F575}\uFE0F', label: 'Detetive' },
  { id: 'avatar_cowboy', emoji: '\u{1F920}', label: 'Cowboy' },
  { id: 'avatar_robot', emoji: '\u{1F916}', label: 'Robo' },
  { id: 'avatar_girl', emoji: '\u{1F467}', label: 'Menina' },
  { id: 'avatar_dog', emoji: '\u{1F436}', label: 'Cachorro' },
  { id: 'avatar_cat', emoji: '\u{1F431}', label: 'Gato' },
] as const;

export function isCustomAvatar(avatarId: string | null | undefined) {
  return Boolean(avatarId?.startsWith(CUSTOM_AVATAR_PREFIX));
}

export function customAvatarSrc(avatarId: string | null | undefined) {
  if (!isCustomAvatar(avatarId)) return null;
  const value = avatarId?.slice(CUSTOM_AVATAR_PREFIX.length) ?? '';
  if (value.startsWith('data:image/')) return value;
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(`${CUSTOM_AVATAR_STORAGE_PREFIX}${value}`);
}

export function createCustomAvatarId(dataUrl: string) {
  return `${CUSTOM_AVATAR_PREFIX}${dataUrl}`;
}

export function avatarEmoji(avatarId: string | null | undefined) {
  const match = AVATAR_OPTIONS.find((item) => item.id === avatarId);
  return match?.emoji ?? '\u{1F3AC}';
}
