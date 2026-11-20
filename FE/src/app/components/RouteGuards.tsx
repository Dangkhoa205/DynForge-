import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth, type AuthRole } from '../context/AuthContext';
import { toast } from 'sonner';

function loginRedirect(pathname: string, search: string): string {
  const target = encodeURIComponent(pathname + search);
  return `/login?redirect=${target}`;
}

/**
 * Requires an authenticated user. Unauthenticated visitors are sent to /login
 * with a `redirect` back to the page they attempted to reach.
 */
export function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to={loginRedirect(location.pathname, location.search)} replace />;
  }
  return <Outlet />;
}

/**
 * Requires an authenticated user whose role is in `allow`. Unauthenticated
 * visitors go to /login; authenticated users with the wrong role get /403.
 */
export function RoleRoute({ allow }: { allow: AuthRole[] }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to={loginRedirect(location.pathname, location.search)} replace />;
  }
  if (!allow.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }
  return <Outlet />;
}

/**
 * Guard specifically for mentor operational routes (/mentor/dashboard, /mentor/sessions, etc.).
 * If the user has role 'mentor' but their profile is NOT verified yet by Admin,
 * redirects them safely to /mentor/verification with an informative notification.
 */
export function MentorVerifiedRoute() {
  const { user } = useAuth();
  const location = useLocation();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (user && user.role === 'mentor' && !user.mentorVerified && !notifiedRef.current) {
      notifiedRef.current = true;
      toast.info(
        'Hồ sơ Mentor của bạn đang chờ quản trị viên phê duyệt. Các công cụ vận hành sẽ mở khóa sau khi được duyệt.'
      );
    }
  }, [user]);

  if (!user) {
    return <Navigate to={loginRedirect(location.pathname, location.search)} replace />;
  }
  if (user.role !== 'mentor') {
    return <Navigate to="/403" replace />;
  }
  if (!user.mentorVerified) {
    return <Navigate to="/mentor/verification" replace state={{ pendingApproval: true }} />;
  }
  return <Outlet />;
}
