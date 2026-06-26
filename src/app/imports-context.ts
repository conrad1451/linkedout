import { createContext, type ReactNode } from 'react';
import type { ImportMeta } from '../lib/store';

export interface ImportsState {
  imports: ImportMeta[];
  activeId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  activate: (id: string | null) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const ImportsCtx = createContext<ImportsState | null>(null);

export type ImportsProviderChildren = { children: ReactNode };
