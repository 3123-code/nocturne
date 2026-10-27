import React, { useState, useRef, useEffect } from 'react';
import { useSocial } from '../context/SocialContext';
import {
  Bell,
  Plus,
  Lock,
  Archive,
  Users,
  Compass,
  Film,
  ChevronDown,
  User as UserIcon,
  LogOut,
  LogIn,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    unreadNotificationCount,
    setIsNotificationsOpen,
    setIsCreatePostOpen,
    setIsCreateReelOpen,
    viewProfile,
    friendRequests,
    setIsAuthOpen,
    setAuthMode,
    logout,
  } = useSocial();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const totalBadges = unreadNotificationCount + (currentUser ? friendRequests.length : 0);

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('feed')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-sm tracking-wider">N</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap leading-tight">
                Nocturne
              </span>
              <span className="text-[10px] text-neutral-400 font-mono tracking-tight leading-none">
                24h Ephemeral &bull; E2EE
              </span>
            </div>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'feed'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('reels')}
            className={`flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'reels'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Film className="w-4 h-4 text-rose-400" />
            <span>Reels</span>
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                setAuthMode('login');
                setIsAuthOpen(true);
              } else {
                setActiveTab('messages');
              }
            }}
            className={`flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'messages'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>E2EE Chat</span>
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                setAuthMode('login');
                setIsAuthOpen(true);
              } else {
                setActiveTab('vault');
              }
            }}
            className={`flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'vault'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Archive className="w-4 h-4 text-amber-400" />
            <span>Private Vault</span>
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                setAuthMode('login');
                setIsAuthOpen(true);
              } else {
                setActiveTab('friends');
              }
            }}
            className={`flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors py-1 relative ${
              activeTab === 'friends'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Friends</span>
            {currentUser && friendRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>
        </nav>

        {/* Primary Actions & User Menu */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <>
              {/* Notifications Button */}
              <button
                onClick={() => setIsNotificationsOpen(true)}
                aria-label="View notifications"
                className="relative p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800/80 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <Bell className="w-5 h-5" />
                {totalBadges > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono">
                    {totalBadges}
                  </span>
                )}
              </button>

              {/* Create Reel CTA */}
              <button
                onClick={() => setIsCreateReelOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-lg hover:bg-rose-900/50 active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
                title="Create 9:16 Short Video / Reel"
              >
                <Film className="w-3.5 h-3.5 text-rose-400" />
                <span>New Reel</span>
              </button>

              {/* New Post Primary CTA */}
              <button
                onClick={() => setIsCreatePostOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-md shadow-indigo-600/25 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>New Post</span>
              </button>

              {/* Active User Avatar & Menu Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors focus:outline-none"
                  title="View user account menu"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-neutral-700"
                  />
                  <span className="hidden sm:inline text-xs font-medium text-neutral-200 truncate max-w-[100px]">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {/* User Menu Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-neutral-800 mb-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-neutral-400 font-medium">Logged in as</p>
                        {currentUser.age && (
                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                            {currentUser.age} yrs
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{currentUser.name}</p>
                      <p className="text-xs text-neutral-400 font-mono truncate">{currentUser.email}</p>
                      <p className="text-[11px] text-neutral-500 font-mono">@{currentUser.handle}</p>
                    </div>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        viewProfile(currentUser.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors text-left"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>View Profile & Uploads</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setActiveTab('vault');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors text-left"
                    >
                      <Archive className="w-3.5 h-3.5 text-amber-400" />
                      <span>Your Private Local Vault</span>
                    </button>

                    <div className="my-1 border-t border-neutral-800" />

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-800/80 rounded-lg transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-neutral-400" />
                <span>Log In</span>
              </button>

              <button
                onClick={() => {
                  setAuthMode('register');
                  setIsAuthOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-md shadow-indigo-600/25"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
