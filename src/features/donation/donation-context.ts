import { createContext } from 'react';

export interface DonationState {
  showBanner: boolean;
  forceShow: () => void;
  dismissTemporarily: () => void;
}

export const DonationCtx = createContext<DonationState | null>(null);
