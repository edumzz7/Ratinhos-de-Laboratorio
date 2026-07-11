import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

interface StarRatingInputProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

export default function StarRatingInput({ value, onChange, disabled }: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const handleTouch = () => setIsTouch(true);
    window.addEventListener('touchstart', handleTouch, { once: true });
    return () => window.removeEventListener('touchstart', handleTouch);
  }, []);

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    if (disabled || isTouch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    setHoverValue(starIndex - (isHalf ? 0.5 : 0));
  };

  const handleMouseLeave = () => {
    if (disabled || isTouch) return;
    setHoverValue(null);
  };

  const handleClick = (starIndex: number) => {
    if (disabled) return;
    if (isTouch) {
      if (value === starIndex) {
        onChange(starIndex - 0.5);
      } else if (value === starIndex - 0.5) {
        onChange(starIndex);
      } else {
        onChange(starIndex);
      }
    } else {
      onChange(hoverValue !== null ? hoverValue : starIndex);
    }
  };

  return (
    <div className="flex items-center gap-1 text-lg p-1 -m-1" onMouseLeave={handleMouseLeave}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = displayValue >= star;
        const isHalf = !isFull && displayValue >= star - 0.5;

        return (
          <button
            key={star}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClick(star);
            }}
            onMouseMove={(e) => handleMouseMove(e, star)}
            disabled={disabled}
            className={clsx(
              'leading-none transition relative w-[16px] h-[16px]',
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            )}
            title={`${star} estrela(s)`}
          >
            {/* Gray empty star (background) */}
            <Star
              size={16}
              className={clsx('absolute inset-0', disabled && value < star - 0.5 ? 'text-[#444]' : 'text-[#444]')}
              strokeWidth={2}
            />
            {/* Yellow full star */}
            {isFull && (
              <Star
                size={16}
                className="text-yellow-400 fill-yellow-400 absolute inset-0"
                strokeWidth={2}
              />
            )}
            {/* Yellow half star */}
            {isHalf && (
              <div className="overflow-hidden absolute inset-0" style={{ width: '50%' }}>
                <Star
                  size={16}
                  className="text-yellow-400 fill-yellow-400 absolute left-0 top-0"
                  strokeWidth={2}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
