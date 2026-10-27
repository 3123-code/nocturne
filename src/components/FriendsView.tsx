import React from 'react';
import { useSocial } from '../context/SocialContext';
import { StorageService } from '../services/storage';
import {
  Users,
  UserCheck,
  UserPlus,
  MessageSquare,
  MapPin,
  Clock,
  Check,
  X,
  Lock,
  LogIn,
} from 'lucide-react';

export const FriendsView: React.FC = () => {
  const {
    currentUser,
    users,
    friendRequests,
    acceptFriendRequest,
    declineFriendRequest,
    sendFriendRequest,
    openChat,
    viewProfile,
    canChatWith,
    setIsAuthOpen,
    setAuthMode,
  } = useSocial();

  if (!currentUser) {
    return (
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-12 text-center max-w-xl mx-auto shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
          <Users className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">Community & Friends</h2>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Sign in or create an account to discover members, view full profiles, send friend requests, and start private encrypted chats.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setAuthMode('login');
              setIsAuthOpen(true);
            }}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
          <button
            onClick={() => {
              setAuthMode('register');
              setIsAuthOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/25"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>
      </div>
    );
  }

  // Mutual friends
  const connectedFriends = users.filter((u) => u.id !== currentUser.id && canChatWith(u.id));

  // Community members who are not mutual friends yet
  const otherUsers = users.filter((u) => u.id !== currentUser.id && !canChatWith(u.id));

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Summary */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Friends &amp; Connections</h2>
            <p className="text-xs text-neutral-400">
              Friend requests must be accepted by both people before mutual friendship and End-to-End Encrypted chat unlock.
            </p>
          </div>
        </div>
      </div>

      {/* Pending Incoming Friend Requests Section */}
      {friendRequests.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-xs">
              Incoming Friend Requests ({friendRequests.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {friendRequests.map((req) => {
              const sender = users.find((u) => u.id === req.fromUserId);
              if (!sender) return null;

              return (
                <div
                  key={req.id}
                  className="rounded-2xl bg-neutral-900/90 border border-neutral-800 p-4 flex items-center justify-between gap-3 shadow-sm hover:border-neutral-700 transition-colors"
                >
                  <button
                    onClick={() => viewProfile(sender.id)}
                    className="flex items-center gap-3 text-left min-w-0 group"
                  >
                    <img
                      src={sender.avatar}
                      alt={sender.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-neutral-800 group-hover:ring-indigo-500 transition-all"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white group-hover:text-indigo-400 truncate">
                        {sender.name}
                      </div>
                      <div className="text-xs text-neutral-500 font-mono">@{sender.handle}</div>
                      {sender.location && (
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          <span>{sender.location}</span>
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => acceptFriendRequest(req.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/25"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => declineFriendRequest(req.id)}
                      className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl"
                      title="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Connected Mutual Friends Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-xs">
              Mutual Friends ({connectedFriends.length})
            </h3>
          </div>
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>E2EE Chat Ready</span>
          </span>
        </div>

        {connectedFriends.length === 0 ? (
          <div className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-8 text-center text-xs text-neutral-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-neutral-400" />
            <p className="text-neutral-300 font-medium">No mutual friends yet</p>
            <p className="text-[11px] mt-1 text-neutral-500">
              Send a friend request to a community member below. Once they accept, you can start encrypted chats!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {connectedFriends.map((friend) => (
              <div
                key={friend.id}
                className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-4 flex items-center justify-between gap-3 shadow-sm hover:border-neutral-700 transition-colors"
              >
                <button
                  onClick={() => viewProfile(friend.id)}
                  className="flex items-center gap-3 text-left min-w-0 group"
                >
                  <div className="relative">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-neutral-800 group-hover:ring-indigo-500 transition-all"
                    />
                    {friend.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-neutral-900" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white group-hover:text-indigo-400 truncate">
                      {friend.name}
                    </div>
                    <div className="text-xs text-neutral-500 font-mono">@{friend.handle}</div>
                    {friend.location && (
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-indigo-400" />
                        <span>{friend.location}</span>
                      </div>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openChat(friend.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Community Directory Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-neutral-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-xs">
              Community Members ({otherUsers.length})
            </h3>
          </div>
          <span className="text-xs text-neutral-500 font-mono">Send Request to Connect</span>
        </div>

        {otherUsers.length === 0 ? (
          <div className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-8 text-center text-xs text-neutral-500">
            <p className="text-neutral-400">No other registered users in the directory yet.</p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Invite friends to create an account or register another user to test friend requests and E2EE chat!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {otherUsers.map((user) => {
              const pendingToThem = StorageService.getFriendRequests(user.id).some(
                (r) => r.fromUserId === currentUser.id && r.status === 'pending'
              );
              const pendingFromThem = friendRequests.find((r) => r.fromUserId === user.id);

              return (
                <div
                  key={user.id}
                  className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between gap-3 shadow-sm hover:border-neutral-700 transition-colors"
                >
                  <button
                    onClick={() => viewProfile(user.id)}
                    className="flex items-center gap-3 text-left min-w-0 group"
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-neutral-800 group-hover:ring-indigo-500 transition-all"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white group-hover:text-indigo-400 truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-neutral-500 font-mono">@{user.handle}</div>
                      {user.location && (
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          <span>{user.location}</span>
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="shrink-0">
                    {pendingFromThem ? (
                      <button
                        onClick={() => acceptFriendRequest(pendingFromThem.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/25"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                    ) : pendingToThem ? (
                      <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-800 text-xs text-neutral-400 font-mono">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pending</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(user.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/25"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Friend</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
