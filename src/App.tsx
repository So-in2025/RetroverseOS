/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import SocialPanel from './components/layout/SocialPanel';
import GameLibrary from './pages/GameLibrary';
import Home from './pages/Home';
import GameDetail from './pages/GameDetail';
import GameRoom from './pages/GameRoom';
import PremiumVault from './pages/PremiumVault';
import Profile from './pages/Profile';
import Marketplace from './pages/Marketplace';
import Community from './pages/Community';
import Achievements from './pages/Achievements';
import Settings from './pages/Settings';
import NetplayLobby from './pages/NetplayLobby';
import Login from './pages/Login';
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
import { useEffect, useState } from 'react';
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
    // Start Sentinel Engine in background (Only in Dev)
    if (import.meta.env.DEV) {
      SentinelEngine.startBackgroundWorker();
    }
    return () => {
      if (import.meta.env.DEV) {
        SentinelEngine.stopBackgroundWorker();
      }
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
        <Outlet />
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
import { motion, AnimatePresence } from 'framer-motion';
import { economy } from './services/economy';
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
        await economy.init();
        console.log('✅ [App] Economy initialized');
        
        await customization.init();
        console.log('✅ [App] Customization initialized');
        
        await gameCatalog.init(); // Initialize game catalog once
        console.log('✅ [App] Game Catalog initialized');
        
        const completed = await storage.getSetting('onboarding_completed');
        console.log('ℹ️ [App] Onboarding status:', completed);
        
        if (!completed) {
          setShowOnboarding(true);
          setInitialized(true);
        } else {
          await recommendationEngine.init(user?.id);
          console.log('✅ [App] Recommendation Engine initialized');
          setInitialized(true);
        }
      } catch (error) {
        console.error('❌ [App] Initialization failed:', error);
        // We still set initialized to true to allow the app to render even in a degraded state
        setInitialized(true);
      }
    };
    checkOnboarding();
  }, [user]);

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    await recommendationEngine.init(user?.id);
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
            <Route path="/tournaments" element={<Community />} />
            <Route path="/netplay" element={<NetplayLobby />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
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

