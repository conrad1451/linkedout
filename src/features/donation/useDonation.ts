import { useContext } from 'react';
import { DonationCtx, type DonationState } from './donation-context';

export function useDonation(): DonationState {
  const ctx = useContext(DonationCtx);
  if (!ctx) throw new Error('useDonation must be used within DonationProvider');
  return ctx;
}
