import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../services/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  console.log('📦 [ProtectedRoute] Rendering:', { user: !!user, loading });

  if (loading) {
    console.log('ℹ️ [ProtectedRoute] Still loading auth session');
    return null;
  }

  if (!user) {
    console.log('⚠️ [ProtectedRoute] No user found, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ [ProtectedRoute] User authenticated, rendering content');
  return <Outlet />;
}
