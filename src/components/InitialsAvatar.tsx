interface InitialsAvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  xs: 'h-8 w-8 text-xs',
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-sm',
  lg: 'h-20 w-20 text-xl',
  xl: 'h-32 w-32 text-3xl',
};

export function InitialsAvatar({ name, size = 'md', className = '' }: InitialsAvatarProps) {
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-neutral font-bold leading-none text-neutral-content ${SIZES[size]} ${className}`}
      aria-label={name}
    >
      <span className="block translate-y-px text-center leading-none tracking-normal">
        {initials(name)}
      </span>
    </div>
  );
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LI';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts.at(-1)![0]}`.toUpperCase();
}
