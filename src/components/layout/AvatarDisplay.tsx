import { avatarEmoji, customAvatarSrc } from '../../lib/avatars';

interface AvatarDisplayProps {
  avatarId: string | null | undefined;
  className?: string;
  emojiClassName?: string;
}

export default function AvatarDisplay({
  avatarId,
  className = 'w-8 h-8',
  emojiClassName = 'text-lg',
}: AvatarDisplayProps) {
  const imageSrc = customAvatarSrc(avatarId);

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt="Avatar"
        className={`${className} rounded-full object-cover shrink-0`}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`${className} shrink-0 rounded-full flex items-center justify-center bg-[#151515]`}>
      <span className={`${emojiClassName} leading-none`}>{avatarEmoji(avatarId)}</span>
    </div>
  );
}
