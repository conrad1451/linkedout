import { PartyPopper, X } from 'lucide-react';
import { useDonation } from './useDonation';

export function DonationBanner() {
  const { showBanner, dismissTemporarily } = useDonation();

  if (!showBanner) return null;

  return (
    <div className="sticky top-14 z-20 border-b border-base-300 bg-base-100 px-3 py-3 sm:px-4">
      <div className="mx-auto w-full max-w-6xl text-sm">
        <div className="flex items-center gap-2">
          <PartyPopper className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span>Read the </span>
          <a
            href="https://blog.alexewerlof.com/linkedout"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-hover link-primary font-semibold"
          >
            announcement
          </a>
          <span> for this app or </span>
          <a
            href="https://github.com/alexewerlof/linkedout/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-hover link-primary font-semibold"
          >
            report an issue
          </a>
          <button
            type="button"
            onClick={dismissTemporarily}
            className="btn btn-ghost btn-circle btn-xs shrink-0 ml-auto"
            aria-label="Dismiss"
            title="Dismiss for now"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
