/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import SocialPanel from './components/layout/SocialPanel';
import { PageLoader } from './components/PageLoader';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy loaded components
const GameLibrary = lazy(() => import('./pages/GameLibrary'));
const Home = lazy(() => import('./pages/Home'));
const GameDetail = lazy(() => import('./pages/GameDetail'));
const GameRoom = lazy(() => import('./pages/GameRoom'));
const PremiumVault = lazy(() => import('./pages/PremiumVault'));
const Profile = lazy(() => import('./pages/Profile'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Community = lazy(() => import('./pages/Community'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Settings = lazy(() => import('./pages/Settings'));
const NetplayLobby = lazy(() => import('./pages/NetplayLobby'));
const CompetitiveHome = lazy(() => import('./pages/competitive/CompetitiveHome'));
const Leaderboard = lazy(() => import('./pages/competitive/Leaderboard'));
const Matchmaking = lazy(() => import('./pages/competitive/Matchmaking'));
const Tournaments = lazy(() => import('./pages/competitive/Tournaments'));
const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
import ProtectedRoute from './components/auth/ProtectedRoute';
import NotificationSystem from './components/NotificationSystem';

import { useLocation, useNavigate } from 'react-router-dom';
import MobileNavbar from './components/layout/MobileNavbar';
import MobileHeader from './components/layout/MobileHeader';
import SearchModal from './components/layout/SearchModal';
import AchievementsModal from './components/community/AchievementsModal';
import DebugPanel from './components/game/DebugPanel';
import SystemOverlay from './components/game/SystemOverlay';
import ConsoleNotification from './components/game/ConsoleNotification';
import { useUIStore } from './store/uiStore';
import { SentinelEngine } from './services/gcts';

import { sentinel } from './services/sentinel';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isGameRoom = location.pathname.startsWith('/play/');
  const { 
    socialPanelOpen, 
    searchModalOpen, 
    setSearchModal, 
    achievementsModalOpen, 
    setAchievementsModal,
    debugPanelOpen,
    setDebugPanel
  } = useUIStore();

  const [systemOverlayOpen, setSystemOverlayOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModal(true);
      }
      
      // Global Debug Shortcut: Shift + Alt + D
      if (e.shiftKey && e.altKey && e.code === 'KeyD') {
        e.preventDefault();
        setDebugPanel(!debugPanelOpen);
      }

      // Quick Access Overlay: Shift + Alt + Q
      if (e.shiftKey && e.altKey && e.code === 'KeyQ') {
        e.preventDefault();
        setSystemOverlayOpen(prev => !prev);
      }

      // Sentinel Traversal Shortcut: Shift + Alt + S
      if (e.shiftKey && e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        sentinel.runAutoTraversal(navigate);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchModal, setDebugPanel, debugPanelOpen, navigate]);

  useEffect(() => {
    // Start Sentinel Auditing (Passive)
    sentinel.start();

    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <>
      <Sidebar />
      {!isGameRoom && <MobileHeader />}
      {!isGameRoom && <SocialPanel />}
      {!isGameRoom && <MobileNavbar />}
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModal(false)} />
      <AchievementsModal isOpen={achievementsModalOpen} onClose={() => setAchievementsModal(false)} />
      <AnimatePresence>
        {debugPanelOpen && <DebugPanel onClose={() => setDebugPanel(false)} />}
        {systemOverlayOpen && <SystemOverlay isOpen={systemOverlayOpen} onClose={() => setSystemOverlayOpen(false)} />}
      </AnimatePresence>
      <ConsoleNotification />
      <main className={`${!isGameRoom ? 'lg:ml-20' : ''} ${!isGameRoom && socialPanelOpen ? 'xl:mr-64' : ''} min-h-screen relative ${!isGameRoom ? 'pt-16 lg:pt-0 pb-24 lg:pb-0' : ''} transition-all duration-300`}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
}

import { gameCatalog } from './services/gameCatalog';
import { AuthProvider, useAuth } from './services/AuthContext';
import { storage } from './services/storage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { recommendationEngine } from './services/recommendationEngine';
import BootAnimation from './components/layout/BootAnimation';
import { motion, AnimatePresence } from 'motion/react';
import { economy } from './services/economy';
import { economyService } from './services/economyService';
import { customization } from './services/customization';
import { achievements } from './services/achievements';

function AppContent() {
  const { user, loading } = useAuth();
  const [showBoot, setShowBoot] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initialized, setInitialized] = useState(false);

  console.log('📦 [AppContent] Rendering:', { user: !!user, loading, showBoot, showOnboarding, initialized });

  useEffect(() => {
    const checkOnboarding = async () => {
      console.log('🚀 [App] Starting initialization sequence...');
      try {
        // Initialize services sequentially but with individual error handling
        try {
          await economy.init();
          console.log('✅ [App] Economy initialized');
        } catch (e) {
          console.warn('⚠️ [App] Economy init failed:', e);
        }
        
        try {
          await customization.init();
          console.log('✅ [App] Customization initialized');
        } catch (e) {
          console.warn('⚠️ [App] Customization init failed:', e);
        }
        
        try {
          await gameCatalog.init();
          console.log('✅ [App] Game Catalog initialized');
        } catch (e) {
          console.warn('⚠️ [App] Game Catalog init failed:', e);
        }
        
        let completed = false;
        try {
          completed = await economyService.getSetting('onboarding_completed', user?.id);
          console.log('ℹ️ [App] Onboarding status:', completed);
        } catch (e) {
          console.warn('⚠️ [App] Failed to fetch onboarding status:', e);
        }
        
        if (!completed) {
          setShowOnboarding(true);
          setInitialized(true);
        } else {
          try {
            await recommendationEngine.init(user?.id);
            console.log('✅ [App] Recommendation Engine initialized');
          } catch (e) {
            console.warn('⚠️ [App] Recommendation Engine init failed:', e);
          }
          setInitialized(true);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        console.error('❌ [App] Critical initialization failure:', errorMsg || 'Unknown error');
        // We still set initialized to true to allow the app to render even in a degraded state
        setInitialized(true);
      }
    };
    checkOnboarding();
  }, [user]);

  const handleOnboardingComplete = async () => {
    console.log('✅ [App] Onboarding complete handler triggered');
    setShowOnboarding(false);
    try {
      await recommendationEngine.init(user?.id);
    } catch (e) {
      console.error('Failed to init recommendations after onboarding:', e);
    }
    setInitialized(true);
    // Force a re-render or notify components that recommendations are ready
    window.dispatchEvent(new CustomEvent('recommendations_updated'));
  };

  return (
    <>
      <AnimatePresence mode="popLayout">
        {(showBoot || loading) && <BootAnimation onComplete={() => setShowBoot(false)} />}
        {!showBoot && !loading && showOnboarding && (
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>
      <NotificationSystem />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<GameLibrary />} />
                <Route path="/dashboard" element={<Home />} />
                <Route path="/game/:gameId" element={<GameDetail />} />
                <Route path="/play/:gameId" element={<GameRoom />} />
                <Route path="/premium" element={<PremiumVault />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/community" element={<Community />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/tournaments" element={<Tournaments />} />
                <Route path="/netplay" element={<NetplayLobby />} />
                <Route path="/competitive" element={<CompetitiveHome />} />
                <Route path="/competitive/leaderboard" element={<Leaderboard />} />
                <Route path="/competitive/matchmaking" element={<Matchmaking />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin/hive" element={<AdminDashboard />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

export default function App() {
  console.log('📦 [App] Rendering App component - START');
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-carbon text-white font-sans">
          <AppContent />
        </div>
      </Router>
    </AuthProvider>
  );
}

