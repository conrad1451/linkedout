import type { HTMLAttributes } from 'react';

type ReactionIconKind = 'like' | 'celebrate' | 'support' | 'love' | 'insightful' | 'funny' | 'vote';

interface ReactionIconProps extends HTMLAttributes<HTMLSpanElement> {
  type?: string;
  decorative?: boolean;
}

const REACTIONS: Record<ReactionIconKind, { label: string; emoji: string }> = {
  like: { label: 'Like', emoji: '👍' },
  celebrate: { label: 'Celebrate', emoji: '👏' },
  support: { label: 'Support', emoji: '💛' },
  love: { label: 'Love', emoji: '❤️' },
  insightful: { label: 'Insightful', emoji: '💡' },
  funny: { label: 'Funny', emoji: '😄' },
  vote: { label: 'Poll vote', emoji: '🗳️' },
};

export function ReactionIcon({
  type,
  decorative = false,
  className = 'h-12 w-12 text-5xl',
  ...props
}: ReactionIconProps) {
  const reaction = REACTIONS[reactionIconKind(type)];
  const accessibilityProps = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': `${reaction.label} reaction` } as const);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`}
      {...accessibilityProps}
      {...props}
    >
      {reaction.emoji}
    </span>
  );
}

function reactionIconKind(type?: string): ReactionIconKind {
  const normalized =
    type
      ?.trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '') ?? '';

  if (normalized === 'like') return 'like';
  if (normalized === 'praise' || normalized === 'celebrate') return 'celebrate';
  if (normalized === 'appreciation' || normalized === 'support') return 'support';
  if (normalized === 'empathy' || normalized === 'love') return 'love';
  if (normalized === 'interest' || normalized === 'insightful') return 'insightful';
  if (normalized === 'entertainment' || normalized === 'funny') return 'funny';
  if (normalized === 'vote' || normalized === 'pollvote') return 'vote';
  return 'like';
}
