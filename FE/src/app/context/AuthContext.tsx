import { createContext, useContext, useState, ReactNode } from 'react';
import {
  loginApi,
  registerApi,
  verifyRegisterOtpApi,
  resendRegisterOtpApi,
  logoutApi,
  googleLoginApi,
  type AuthTokens
} from '../services/authService';
import { getMe } from '../services/userService';

export type AuthRole = 'mentee' | 'mentor' | 'admin';

export interface AuthUser {
  id?: string;
  role: AuthRole;
  name: string;
  email?: string;
  avatar: string;
  dashboardPath: string;
  mentorVerified?: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  login: (role: AuthRole) => void;
  loginWithCredentials: (email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (idToken: string) => Promise<AuthUser>;
  initiateRegister: (fullName: string, email: string, password: string, role: 'MENTEE' | 'MENTOR', universityCode?: string) => Promise<string>;
  verifyRegisterOtp: (email: string, otp: string) => Promise<AuthUser>;
  resendRegisterOtp: (email: string) => Promise<string>;
  registerWithCredentials: (
    fullNameOrPayload: string | { name?: string; fullName?: string; email: string; password: string; role: string; university?: string },
    email?: string,
    password?: string,
    role?: 'MENTEE' | 'MENTOR' | 'mentee' | 'mentor'
  ) => Promise<string>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Quick-access demo profiles (no real JWT)
const demoProfiles: Record<AuthRole, AuthUser> = {
  mentee: {
    role: 'mentee',
    name: 'Trang Do',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
    dashboardPath: '/dashboard',
  },
  mentor: {
    role: 'mentor',
    name: 'Nguyễn Thị Linh',
    avatar: 'https://images.unsplash.com/photo-1531427888099-b3ecff6e1a6f?auto=format&fit=crop&w=80&q=80',
    dashboardPath: '/mentor/dashboard',
    mentorVerified: true,
  },
  admin: {
    role: 'admin',
    name: 'Admin · DynForge',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
    dashboardPath: '/admin/dashboard',
  },
};

const ROLE_KEY = 'dynforge_role';
const USER_KEY = 'dynforge_user';

function roleFromBackend(roles: string[]): AuthRole {
  if (roles.includes('ADMIN')) return 'admin';
  if (roles.includes('MENTOR')) return 'mentor';
  return 'mentee';
}

function dashboardPath(role: AuthRole, mentorVerified?: boolean) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'mentor') return mentorVerified ? '/mentor/dashboard' : '/mentor/verification';
  return '/dashboard';
}

function extractMentorVerified(userObj: any, role: AuthRole): boolean {
  if (role !== 'mentor') return false;
  // If the backend explicitly returned a boolean, trust it
  if (typeof userObj?.mentorVerified === 'boolean') {
    return userObj.mentorVerified;
  }
  // Backwards compatibility for environments where backend UserResponse doesn't have mentorVerified yet:
  // Default to true so existing mentors on Azure backend are not unexpectedly locked out
  return true;
}

function buildUserFromTokens(tokens: AuthTokens): AuthUser {
  const role = roleFromBackend(tokens.user.roles);
  const mentorVerified = extractMentorVerified(tokens.user, role);
  return {
    id: tokens.user.id,
    role,
    name: tokens.user.fullName,
    email: tokens.user.email,
    avatar: tokens.user.avatarUrl ?? demoProfiles[role].avatar,
    dashboardPath: dashboardPath(role, mentorVerified),
    mentorVerified,
  };
}

function storeTokens(tokens: AuthTokens) {
  localStorage.setItem('dynforge_access_token', tokens.accessToken);
  localStorage.setItem('dynforge_refresh_token', tokens.refreshToken);
  localStorage.removeItem('gradora_access_token');
  localStorage.removeItem('gradora_refresh_token');
}

function clearTokens() {
  localStorage.removeItem('dynforge_access_token');
  localStorage.removeItem('dynforge_refresh_token');
  localStorage.removeItem('gradora_access_token');
  localStorage.removeItem('gradora_refresh_token');
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('gradora_user');
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem('gradora_role');
}

function loadSavedUser(): AuthUser | null {
  const saved = localStorage.getItem(USER_KEY) || localStorage.getItem('gradora_user');
  if (saved) {
    try { return JSON.parse(saved) as AuthUser; } catch { /* ignore */ }
  }
  const role = (localStorage.getItem(ROLE_KEY) || localStorage.getItem('gradora_role')) as AuthRole | null;
  return role && demoProfiles[role] ? demoProfiles[role] : null;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  login: () => {},
  loginWithCredentials: async () => ({} as AuthUser),
  loginWithGoogle: async () => ({} as AuthUser),
  initiateRegister: async () => '',
  verifyRegisterOtp: async () => ({} as AuthUser),
  resendRegisterOtp: async () => '',
  registerWithCredentials: async () => '',
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadSavedUser);

  // Demo quick-login (no real JWT)
  const login = (role: AuthRole) => {
    clearTokens();
    const u = demoProfiles[role];
    setUser(u);
    localStorage.setItem(ROLE_KEY, role);
  };

  const loginWithCredentials = async (email: string, password: string): Promise<AuthUser> => {
    const tokens = await loginApi(email, password);
    storeTokens(tokens);
    const u = buildUserFromTokens(tokens);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    localStorage.removeItem(ROLE_KEY);
    setUser(u);
    return u;
  };

  const loginWithGoogle = async (idToken: string): Promise<AuthUser> => {
    const tokens = await googleLoginApi(idToken);
    storeTokens(tokens);
    const u = buildUserFromTokens(tokens);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    localStorage.removeItem(ROLE_KEY);
    setUser(u);
    return u;
  };

  const initiateRegister = async (fullName: string, email: string, password: string, role: 'MENTEE' | 'MENTOR', universityCode?: string): Promise<string> => {
    return await registerApi(fullName, email, password, role, universityCode);
  };

  const verifyRegisterOtp = async (email: string, otp: string): Promise<AuthUser> => {
    const tokens = await verifyRegisterOtpApi(email, otp);
    storeTokens(tokens);
    const u = buildUserFromTokens(tokens);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    localStorage.removeItem(ROLE_KEY);
    setUser(u);
    return u;
  };

  const resendRegisterOtp = async (email: string): Promise<string> => {
    return await resendRegisterOtpApi(email);
  };

  const registerWithCredentials = async (
    fullNameOrPayload: string | { name?: string; fullName?: string; email: string; password: string; role: string; university?: string },
    emailArg?: string,
    passwordArg?: string,
    roleArg?: 'MENTEE' | 'MENTOR' | 'mentee' | 'mentor'
  ): Promise<string> => {
    let fullName = '';
    let email = '';
    let password = '';
    let role: 'MENTEE' | 'MENTOR' = 'MENTEE';

    if (typeof fullNameOrPayload === 'object' && fullNameOrPayload !== null) {
      fullName = (fullNameOrPayload.fullName || fullNameOrPayload.name || '').trim();
      email = (fullNameOrPayload.email || '').trim();
      password = fullNameOrPayload.password || '';
      const r = (fullNameOrPayload.role || '').toUpperCase();
      role = r === 'MENTOR' ? 'MENTOR' : 'MENTEE';
    } else {
      fullName = (fullNameOrPayload || '').trim();
      email = (emailArg || '').trim();
      password = passwordArg || '';
      const r = (roleArg || '').toUpperCase();
      role = r === 'MENTOR' ? 'MENTOR' : 'MENTEE';
    }

    return await initiateRegister(fullName, email, password, role);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('dynforge_refresh_token') || localStorage.getItem('gradora_refresh_token');
    if (refreshToken) {
      try { await logoutApi(refreshToken); } catch { /* ignore — still clear locally */ }
    }
    clearTokens();
    setUser(null);
  };

  // Re-fetch the current user (e.g. after a profile update) and refresh header/avatar.
  const refreshUser = async () => {
    try {
      const me = await getMe();
      const role = roleFromBackend(me.roles);
      const mentorVerified = extractMentorVerified(me, role);
      const u: AuthUser = {
        id: me.id,
        role,
        name: me.fullName,
        email: me.email,
        avatar: me.avatarUrl ?? demoProfiles[role].avatar,
        dashboardPath: dashboardPath(role, mentorVerified),
        mentorVerified,
      };
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
    } catch { /* keep current user on failure */ }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginWithCredentials,
      loginWithGoogle,
      initiateRegister,
      verifyRegisterOtp,
      resendRegisterOtp,
      registerWithCredentials,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
