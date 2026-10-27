import React from 'react';
import { SocialProvider, useSocial } from './context/SocialContext';
import { Header } from './components/Header';
import { PostCard } from './components/PostCard';
import { CreatePostModal } from './components/CreatePostModal';
import { ProfileView } from './components/ProfileView';
import { EditProfileModal } from './components/EditProfileModal';
import { NotificationsModal } from './components/NotificationsModal';
import { KeyVerificationModal } from './components/KeyVerificationModal';
import { MediaLightbox } from './components/MediaLightbox';
import { ToastContainer } from './components/ToastContainer';
import { ChatView } from './components/ChatView';
import { FriendsView } from './components/FriendsView';
import { ReelsView } from './components/ReelsView';
import { CreateReelModal } from './components/CreateReelModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { AuthModal } from './components/AuthModal';
import {
  Compass,
  Lock,
  Archive,
  Users,
  Film,
  Plus,
  Clock,
  ShieldCheck,
  Sparkles,
  MapPin,
  Image,
  Video,
  FileText,
  User as UserIcon,
  LogIn,
  UserPlus,
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    posts,
    vaultPosts,
    currentUser,
    users,
    viewProfile,
    openChat,
    setIsCreatePostOpen,
    setIsAuthOpen,
    setAuthMode,
    friendRequests,
    canChatWith,
  } = useSocial();

  const otherUsers = currentUser ? users.filter((u) => u.id !== currentUser.id) : users;

  const handleCreatePostClick = () => {
    if (!currentUser) {
      setAuthMode('login');
      setIsAuthOpen(true);
    } else {
      setIsCreatePostOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col pb-20 md:pb-10">
      {/* Top Bar */}
      <Header />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {activeTab === 'feed' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Feed Main Column */}
            <div className="lg:col-span-8 space-y-6">
              {/* Ephemeral Notice Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-indigo-950/40 border border-neutral-800 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      <h2 className="text-sm font-bold text-white tracking-tight">
                        24-Hour Ephemeral Feed
                      </h2>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed max-w-xl">
                      Public photos, videos, and thoughts automatically vanish after 24 hours. Tap{' '}
                      <span className="text-amber-300 font-medium">&ldquo;Save to Private Vault&rdquo;</span> to store any post permanently in your local storage as a private keepsake.
                    </p>
                  </div>

                  {currentUser && (
                    <button
                      onClick={() => setActiveTab('vault')}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-neutral-700 font-medium transition-colors shrink-0"
                    >
                      <Archive className="w-3.5 h-3.5 text-amber-400" />
                      <span>Your Vault ({vaultPosts.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Create Post Bar */}
              <div
                onClick={handleCreatePostClick}
                className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 shadow-sm hover:border-neutral-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  {currentUser ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-400 group-hover:text-neutral-300 group-hover:border-neutral-700 transition-colors flex items-center justify-between">
                    <span>
                      {currentUser
                        ? 'Share a photo, video with title, or thoughts for 24 hours...'
                        : 'Sign in to share a photo, video, or thoughts for 24 hours...'}
                    </span>
                    <Plus className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-800/60 text-xs text-neutral-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 hover:text-white">
                      <Image className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Photo</span>
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-white">
                      <Video className="w-3.5 h-3.5 text-amber-400" />
                      <span>Video</span>
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-white">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Text</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500 font-mono">Disappears in 24h &bull; Age ratings</span>
                </div>
              </div>

              {/* Public Posts Feed */}
              <div className="space-y-5">
                {posts.length === 0 ? (
                  <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-10 text-center">
                    <Clock className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-white">No active 24h posts</h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                      All previous posts reached their 24-hour limit and vanished. Be the first to share something fresh!
                    </p>
                    <button
                      onClick={handleCreatePostClick}
                      className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25"
                    >
                      Create First Post
                    </button>
                  </div>
                ) : (
                  posts.map((post) => <PostCard key={post.id} post={post} />)
                )}
              </div>
            </div>

            {/* Desktop Sticky Sidebar */}
            <aside className="hidden lg:block lg:col-span-4 space-y-6 sticky top-24">
              {currentUser ? (
                /* Current User Snapshot Card */
                <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-neutral-800"
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{currentUser.name}</h3>
                      <p className="text-xs text-neutral-500 font-mono">@{currentUser.handle}</p>
                      {currentUser.location && (
                        <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          <span>{currentUser.location}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {currentUser.bio && (
                    <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">
                      {currentUser.bio}
                    </p>
                  )}

                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => viewProfile(currentUser.id)}
                      className="text-indigo-400 hover:underline font-medium"
                    >
                      View Profile &amp; Uploads &rarr;
                    </button>
                    <span className="text-neutral-500 font-mono">
                      {vaultPosts.length} in Vault
                    </span>
                  </div>
                </div>
              ) : (
                /* Welcome / Guest Auth Prompt */
                <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                      N
                    </div>
                    <h3 className="text-sm font-bold text-white">Join Nocturne</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Create an account to post ephemeral media, connect with friends, and chat with End-to-End Encryption.
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setAuthMode('register');
                        setIsAuthOpen(true);
                      }}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Sign Up</span>
                    </button>
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setIsAuthOpen(true);
                      }}
                      className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium"
                    >
                      <span>Log In</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Local Storage Private Vault Teaser */}
              <div className="rounded-2xl bg-amber-950/15 border border-amber-900/30 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                    Private Local Storage Vault
                  </h4>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Saved posts persist locally in your browser storage indefinitely, remaining strictly private to you.
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        setAuthMode('login');
                        setIsAuthOpen(true);
                      } else {
                        setActiveTab('vault');
                      }
                    }}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300"
                  >
                    Open Private Vault ({vaultPosts.length}) &rarr;
                  </button>
                </div>
              </div>

              {/* Community Members Strip */}
              <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Community Members
                  </h4>
                  <button
                    onClick={() => setActiveTab('friends')}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    View All
                  </button>
                </div>

                {otherUsers.length === 0 ? (
                  <p className="text-xs text-neutral-500">No other users registered yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {otherUsers.slice(0, 4).map((user) => {
                      const isMutual = currentUser ? canChatWith(user.id) : false;
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-neutral-800/40 transition-colors"
                        >
                          <button
                            onClick={() => viewProfile(user.id)}
                            className="flex items-center gap-2.5 text-left min-w-0 group"
                          >
                            <img
                              src={user.avatar}
                              alt={user.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-neutral-700"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white group-hover:text-indigo-400 truncate">
                                {user.name}
                              </p>
                              <p className="text-[10px] text-neutral-500 font-mono">@{user.handle}</p>
                            </div>
                          </button>

                          {isMutual ? (
                            <button
                              onClick={() => openChat(user.id)}
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-indigo-600 text-neutral-300 hover:text-white transition-colors"
                              title="E2EE Chat"
                            >
                              <Lock className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                          ) : (
                            <button
                              onClick={() => viewProfile(user.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
                            >
                              View
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* End-to-End Encryption Assurance */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/60 flex items-start gap-3 text-xs text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Mutual chats use asymmetric RSA-OAEP 2048 &amp; AES-GCM 256 keys generated on your device. Only accepted mutual friends can chat.
                </p>
              </div>
            </aside>
          </div>
        )}

        {/* Reels Doomscroll View */}
        {activeTab === 'reels' && <ReelsView />}

        {/* E2EE Chat Screen */}
        {activeTab === 'messages' && <ChatView />}

        {/* Profile Screen */}
        {activeTab === 'profile' && <ProfileView />}

        {/* Friends Screen */}
        {activeTab === 'friends' && <FriendsView />}

        {/* Dedicated Vault Screen */}
        {activeTab === 'vault' && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Your Private Local Storage Vault
                  </h2>
                </div>
                <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
                  Posts you chose to keep beyond 24 hours are stored locally in your browser storage and will never expire from this vault. They remain strictly private to you.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-300">
                  {vaultPosts.length} Items Archived
                </span>
              </div>
            </div>

            {vaultPosts.length === 0 ? (
              <div className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-12 text-center">
                <Archive className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-white">Your Vault is Empty</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                  When you publish or view your posts, click &ldquo;Save to Private Vault&rdquo; on any post to preserve it here permanently after it expires from the public feed.
                </p>
                <button
                  onClick={() => setActiveTab('feed')}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Go to Feed
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {vaultPosts.map((post) => (
                  <PostCard key={post.id} post={post} isVaultView={true} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Thumb Zone) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 grid grid-cols-5 items-center h-16 px-1">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] ${
            activeTab === 'feed' ? 'text-indigo-400 font-semibold' : 'text-neutral-400'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] mt-1">Feed</span>
        </button>

        <button
          onClick={() => setActiveTab('reels')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] ${
            activeTab === 'reels' ? 'text-rose-400 font-semibold' : 'text-neutral-400'
          }`}
        >
          <Film className="w-5 h-5" />
          <span className="text-[10px] mt-1">Reels</span>
        </button>

        <button
          onClick={handleCreatePostClick}
          className="flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] text-white"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Plus className="w-5 h-5" />
          </div>
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
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] ${
            activeTab === 'messages' ? 'text-indigo-400 font-semibold' : 'text-neutral-400'
          }`}
        >
          <Lock className="w-5 h-5" />
          <span className="text-[10px] mt-1">Chat</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser) {
              setAuthMode('login');
              setIsAuthOpen(true);
            } else {
              viewProfile(currentUser.id);
            }
          }}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] ${
            activeTab === 'profile' ? 'text-indigo-400 font-semibold' : 'text-neutral-400'
          }`}
        >
          {currentUser ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-5 h-5 rounded-full object-cover ring-1 ring-neutral-700"
            />
          ) : (
            <UserIcon className="w-5 h-5" />
          )}
          <span className="text-[10px] mt-1">Profile</span>
        </button>
      </nav>

      {/* Modals & Overlays */}
      <AuthModal />
      <CreatePostModal />
      <CreateReelModal />
      <CreateGroupModal />
      <EditProfileModal />
      <NotificationsModal />
      <KeyVerificationModal />
      <MediaLightbox />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <SocialProvider>
      <MainLayout />
    </SocialProvider>
  );
}
