import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check, Tv, PlayCircle, MonitorPlay, Film, Sparkles, Popcorn } from 'lucide-react';
import clsx from 'clsx';

const PLATFORMS = [
    { id: 'stremio', name: 'Stremio', icon: PlayCircle },
    { id: 'cinema', name: 'Cinema', icon: Film },
    { id: 'netflix', name: 'Netflix', icon: Popcorn },
    { id: 'max', name: 'Max', icon: Tv },
    { id: 'appletv', name: 'Apple TV+', icon: MonitorPlay },
    { id: 'prime', name: 'Prime Video', icon: PlayCircle },
    { id: 'disney', name: 'Disney+', icon: Sparkles },
];

interface PlatformSelectProps {
    value?: string | null;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function PlatformSelect({ value, onChange, disabled }: PlatformSelectProps) {
    const selectedPlatform = PLATFORMS.find(p => p.id === value) || PLATFORMS[5];
    const Icon = selectedPlatform.icon;

    return (
        <Select.Root value={value || 'stremio'} onValueChange={onChange} disabled={disabled}>
            <Select.Trigger
                className={clsx(
                    "flex items-center justify-between w-full px-3 py-2 text-xs text-brand-text bg-brand-bg border border-[#222] rounded-md transition-all",
                    "hover:border-brand-gold-alt focus:outline-none focus:border-brand-gold",
                    "data-[placeholder]:text-brand-text-muted"
                )}
            >
                <div className="flex items-center gap-2">
                    <Icon size={14} className="text-brand-gold-alt" />
                    <Select.Value />
                </div>
                <Select.Icon>
                    <ChevronDown size={14} className="text-brand-text-muted opacity-70" />
                </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
                <Select.Content
                    className="overflow-hidden bg-[#0a0f1e] rounded-md border border-[#222] shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50"
                    position="popper"
                    sideOffset={5}
                >
                    <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-brand-bg text-brand-text-muted cursor-default">
                        <ChevronDown size={14} className="rotate-180" />
                    </Select.ScrollUpButton>

                    <Select.Viewport className="p-1">
                        {PLATFORMS.map((platform) => {
                            const ItemIcon = platform.icon;
                            return (
                                <Select.Item
                                    key={platform.id}
                                    value={platform.id}
                                    className={clsx(
                                        "text-xs leading-none rounded-[3px] flex items-center h-8 pr-8 pl-6 relative select-none outline-none",
                                        "data-[disabled]:text-brand-text-muted data-[disabled]:pointer-events-none",
                                        "data-[highlighted]:bg-[#1a2235] data-[highlighted]:text-brand-gold"
                                    )}
                                >
                                    <div className="absolute left-2 flex items-center justify-center">
                                        <ItemIcon size={12} className="text-brand-gold-alt opacity-70" />
                                    </div>
                                    <Select.ItemText>{platform.name}</Select.ItemText>
                                    <Select.ItemIndicator className="absolute left-2 w-4 inline-flex items-center justify-center">
                                        <Check size={12} className="text-brand-gold" />
                                    </Select.ItemIndicator>
                                </Select.Item>
                            );
                        })}
                    </Select.Viewport>

                    <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-brand-bg text-brand-text-muted cursor-default">
                        <ChevronDown size={14} />
                    </Select.ScrollDownButton>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    );
}
