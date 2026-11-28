import { createContext, useContext } from 'react';

export type TabKey = 'home' | 'analyzer' | 'vault' | 'coach' | 'map';
export type Route =
  | TabKey
  | 'sms'
  | 'zones'
  | 'insight'
  | 'settings'
  | 'privacy'
  | 'apikey'
  | 'guide';

export interface Nav {
  route: Route;
  isRoot: boolean;
  goTab: (tab: TabKey) => void;
  navigate: (route: Route) => void;
  back: () => void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('useNav must be used inside NavContext');
  return nav;
}

export const ROUTE_TITLES: Record<Route, string> = {
  home: 'SEYLI',
  analyzer: 'Analyser',
  vault: 'Coffre de preuves',
  coach: 'Coach & aide',
  map: 'Lieux & ressources',
  sms: 'Filtre SMS',
  zones: 'Zones de sécurité',
  insight: 'Rapport mensuel',
  settings: 'Réglages',
  privacy: 'Confidentialité',
  apikey: 'Clé API IA',
  guide: 'Guide d’action',
};
