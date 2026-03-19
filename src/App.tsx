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
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import NotificationSystem from './components/NotificationSystem';

import { useLocation } from 'react-router-dom';
import MobileNavbar from './components/layout/MobileNavbar';
import MobileHeader from './components/layout/MobileHeader';
import SearchModal from './components/layout/SearchModal';

import { useUIStore } from './store/uiStore';
import { useEffect, useState } from 'react';
import { SentinelEngine } from './services/gcts';

function Layout() {
  const location = useLocation();
  const isGameRoom = location.pathname.startsWith('/play/');
  const { socialPanelOpen, searchModalOpen, setSearchModal } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchModal]);

  useEffect(() => {
    // Start Sentinel Engine in background
    SentinelEngine.startBackgroundWorker();
    return () => {
      SentinelEngine.stopBackgroundWorker();
    };
  }, []);

  return (
    <>
      <Sidebar />
      {!isGameRoom && <MobileHeader />}
      {!isGameRoom && <SocialPanel />}
      {!isGameRoom && <MobileNavbar />}
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModal(false)} />
      <main className={`${!isGameRoom ? 'lg:ml-20' : ''} ${!isGameRoom && socialPanelOpen ? 'xl:mr-64' : ''} min-h-screen relative ${!isGameRoom ? 'pt-16 lg:pt-0 pb-24 lg:pb-0' : ''} transition-all duration-300`}>
        <Outlet />
      </main>
    </>
  );
}

import { AuthProvider, useAuth } from './services/AuthContext';
import { storage } from './services/storage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { recommendationEngine } from './services/recommendationEngine';
import BootAnimation from './components/layout/BootAnimation';
import { AnimatePresence } from 'motion/react';

function AppContent() {
  const { user, loading } = useAuth();
  const [showBoot, setShowBoot] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      const completed = await storage.getSetting('onboarding_completed');
      if (!completed) {
        setShowOnboarding(true);
      } else {
        await recommendationEngine.init(user?.id);
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
      <AnimatePresence>
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
            <Route path="/tournaments" element={<Community />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
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

