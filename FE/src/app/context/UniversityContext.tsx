import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { listUniversities, type UniversityResponse } from '../services/universityService';
import { getMe } from '../services/userService';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'dynforge_university';

interface UniversityCtx {
  /** Public universities (ACTIVE / LAUNCHING). */
  universities: UniversityResponse[];
  /** Currently selected university code slug, or null = all universities. */
  selectedCode: string | null;
  /** The resolved university object for {@link selectedCode}, if loaded. */
  selectedUniversity: UniversityResponse | null;
  setSelectedCode: (code: string | null) => void;
  loading: boolean;
}

const UniversityContext = createContext<UniversityCtx>({
  universities: [],
  selectedCode: null,
  selectedUniversity: null,
  setSelectedCode: () => {},
  loading: true,
});

export function UniversityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [universities, setUniversities] = useState<UniversityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCodeState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );

  const setSelectedCode = (code: string | null) => {
    setSelectedCodeState(code);
    if (code) localStorage.setItem(STORAGE_KEY, code);
    else localStorage.removeItem(STORAGE_KEY);
  };

  // Load the public university list once.
  useEffect(() => {
    listUniversities()
      .then(setUniversities)
      .catch(() => setUniversities([]))
      .finally(() => setLoading(false));
  }, []);

  // Default to the logged-in user's university when no explicit choice is stored yet.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return; // user already chose
    if (!user) return;
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled && me.universityCode) setSelectedCodeState(me.universityCode);
      })
      .catch(() => { /* stay on "all universities" */ });
    return () => { cancelled = true; };
  }, [user]);

  const selectedUniversity =
    universities.find((u) => u.code === selectedCode) ?? null;

  return (
    <UniversityContext.Provider
      value={{ universities, selectedCode, selectedUniversity, setSelectedCode, loading }}
    >
      {children}
    </UniversityContext.Provider>
  );
}

export function useUniversity() {
  return useContext(UniversityContext);
}
