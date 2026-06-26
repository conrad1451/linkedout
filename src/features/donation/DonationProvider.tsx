import { useCallback, useState, type ReactNode } from 'react';
import { DonationCtx } from './donation-context';

export function DonationProvider({ children }: { children: ReactNode }) {
  const [showBanner, setShowBanner] = useState(true);

  const dismissTemporarily = useCallback(() => {
    setShowBanner(false);
  }, []);

  const forceShow = useCallback(() => {
    setShowBanner(true);
  }, []);

  return (
    <DonationCtx.Provider value={{ showBanner, forceShow, dismissTemporarily }}>
      {children}
    </DonationCtx.Provider>
  );
}
