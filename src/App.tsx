import { ImportsProvider } from './app/ImportsProvider';
import { DonationProvider } from './features/donation/DonationProvider';
import { AppRouter } from './app/router';

export function App() {
  return (
    <ImportsProvider>
      <DonationProvider>
        <AppRouter />
      </DonationProvider>
    </ImportsProvider>
  );
}
