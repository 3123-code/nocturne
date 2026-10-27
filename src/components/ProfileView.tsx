import React, { useState } from 'react';
import { useSocial } from '../context/SocialContext';
import { PostCard } from './PostCard';
import { StorageService } from '../services/storage';
import {
  MapPin,
  Calendar,
  Lock,
  UserCheck,
  UserPlus,
  MessageSquare,
  Edit3,
  Archive,
  Grid,
  Clock,
  ShieldCheck,
  ArrowLeft,
  LogIn,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const {
    currentUser,
    users,
    viewedUserId,
    backToFeed,
    openChat,
    sendFriendRequest,
    setIsEditProfileOpen,
    setIsKeyVerifyOpen,
    setIsAuthOpen,
    setAuthMode,
    canChatWith,
  } = useSocial();

  const [activeProfileTab, setActiveProfileTab] = useState<'active' | 'vault'>('active');

  const targetUserId = viewedUserId || currentUser?.id;
  const targetUser = users.find((u) => u.id === targetUserId) || (currentUser?.id === targetUserId ? currentUser : null);

  if (!targetUser) {
    return (
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-12 text-center max-w-xl mx-auto space-y-4">
        <h3 className="text-base font-bold text-white">No Profile Selected</h3>
        <p className="text-xs text-neutral-400">
          Sign in or select a member from the community feed to view their public profile and 24-hour uploads.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setAuthMode('login');
              setIsAuthOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            onClick={backToFeed}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium"
          >
            Go to Feed
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser ? targetUser.id === currentUser.id : false;
  const isMutualFriend = currentUser ? canChatWith(targetUser.id) : false;
  const pendingRequests = StorageService.getFriendRequests(targetUser.id);
  const hasSentRequest = currentUser ? pendingRequests.some((r) => r.fromUserId === currentUser.id) : false;

  // Get uploads
  const userPosts = StorageService.getUserPosts(targetUser.id);
  const activePosts = userPosts.filter((p) => p.expiresAt > Date.now());
  const vaultPosts = StorageService.getVaultPosts(targetUser.id);

  const displayedPosts = activeProfileTab === 'vault' && isOwnProfile ? vaultPosts : activePosts;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back button if viewing another user's profile */}
      {viewedUserId && (!currentUser || viewedUserId !== currentUser.id) && (
        <button
          onClick={backToFeed}
          className="flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>
      )}

      {/* Profile Header Card */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
        {/* Banner */}
        <div className="h-32 sm:h-40 bg-gradient-to-r from-neutral-950 via-indigo-950/40 to-neutral-950 border-b border-neutral-800 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
        </div>

        <div className="px-5 sm:px-8 pb-6 relative">
          {/* Avatar and Top Actions */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-5">
            <div className="relative inline-block">
              <img
                src={targetUser.avatar}
                alt={targetUser.name}
                referrerPolicy="no-referrer"
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover ring-4 ring-neutral-900 shadow-2xl bg-neutral-800"
              />
              {targetUser.isOnline && (
                <span
                  title="Active"
                  className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-neutral-900"
                />
              )}
            </div>

            {/* Profile Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {isOwnProfile ? (
                <button
                  onClick={() => setIsEditProfileOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl transition-colors shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile &amp; Avatar</span>
                </button>
              ) : currentUser ? (
                <>
                  {isMutualFriend ? (
                    <>
                      <div className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Mutual Friend</span>
                      </div>
                      <button
                        onClick={() => openChat(targetUser.id)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg shadow-indigo-600/25"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>E2EE Chat</span>
                      </button>
                    </>
                  ) : hasSentRequest ? (
                    <div className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Friend Request Pending</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(targetUser.id)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg shadow-indigo-600/25"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Send Friend Request</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setIsAuthOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign in to Connect</span>
                </button>
              )}
            </div>
          </div>

          {/* User Details: Name, Handle, Description, Location */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {targetUser.name}
              </h1>
              <span className="text-xs text-neutral-500 font-mono">@{targetUser.handle}</span>
            </div>

            {/* Profile Description / Bio */}
            <p className="mt-3 text-sm text-neutral-300 max-w-2xl leading-relaxed whitespace-pre-line">
              {targetUser.bio || 'No profile description added yet.'}
            </p>

            {/* Metadata strip: Location, Joined, Key Fingerprint */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
              {targetUser.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{targetUser.location}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                <span>Joined {targetUser.joinedDate || 'Recently'}</span>
              </div>

              <button
                onClick={() => setIsKeyVerifyOpen(true)}
                className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
                title="Verify cryptographic E2EE fingerprint"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-[11px]">E2EE Key Verified</span>
              </button>
            </div>
          </div>

          {/* Profile Tabs: Active 24h Uploads vs Private Local Vault */}
          <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveProfileTab('active')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeProfileTab === 'active'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Grid className="w-3.5 h-3.5 text-indigo-400" />
                <span>Active 24h Uploads ({activePosts.length})</span>
              </button>

              {isOwnProfile && (
                <button
                  onClick={() => setActiveProfileTab('vault')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeProfileTab === 'vault'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Posts saved beyond 24h stored locally in your private vault"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-400" />
                  <span>Private Local Vault ({vaultPosts.length})</span>
                </button>
              )}
            </div>

            <div className="text-xs text-neutral-500 font-mono">
              {activeProfileTab === 'vault'
                ? 'Only visible to you on this device'
                : 'Visible publicly for 24 hours'}
            </div>
          </div>
        </div>
      </div>

      {/* Uploads Feed */}
      <div className="space-y-4">
        {displayedPosts.length === 0 ? (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-8 text-center">
            {activeProfileTab === 'vault' ? (
              <>
                <Archive className="w-8 h-8 text-amber-400/60 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-white">Your Private Vault is Empty</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                  When you see a post in your feed that you want to keep past 24 hours, click &ldquo;Save to Private Vault&rdquo;. It will be preserved permanently in local storage and become private.
                </p>
              </>
            ) : (
              <>
                <Clock className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-white">No Active Uploads Right Now</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Posts vanish automatically after 24 hours. Check back later or create a new upload!
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isVaultView={activeProfileTab === 'vault'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
