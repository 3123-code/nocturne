import React from 'react';
import { useSocial } from '../context/SocialContext';
import { formatRelativeTime } from '../utils/format';
import {
  X,
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Lock,
  Archive,
  CheckCheck,
  Check,
} from 'lucide-react';

export const NotificationsModal: React.FC = () => {
  const {
    isNotificationsOpen,
    setIsNotificationsOpen,
    notifications,
    users,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    viewProfile,
    openChat,
    acceptFriendRequest,
    friendRequests,
  } = useSocial();

  if (!isNotificationsOpen) return null;

  const getIconForType = (type: string) => {
    switch (type) {
      case 'reaction':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-indigo-400" />;
      case 'friend_request':
      case 'friend_accept':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'chat_message':
        return <Lock className="w-4 h-4 text-emerald-400" />;
      case 'vault_saved':
        return <Archive className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Real-Time Interactions</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-neutral-400">No interactions yet</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                When people react to your posts, comments, or send messages, you will be notified here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const actor = users.find((u) => u.id === notif.actorId);
              const relatedReq =
                notif.type === 'friend_request'
                  ? friendRequests.find((r) => r.fromUserId === notif.actorId)
                  : null;

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    markNotificationAsRead(notif.id);
                    if (notif.type === 'chat_message' && actor) {
                      setIsNotificationsOpen(false);
                      openChat(actor.id);
                    }
                  }}
                  className={`p-3 rounded-xl border transition-colors flex items-start gap-3 cursor-pointer ${
                    !notif.isRead
                      ? 'bg-neutral-800/80 border-indigo-500/30 text-white'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800/40'
                  }`}
                >
                  {/* Actor Avatar with Type badge */}
                  <div className="relative shrink-0">
                    <img
                      src={
                        actor?.avatar ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                      }
                      alt={actor?.name || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-700"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-neutral-900 border border-neutral-700">
                      {getIconForType(notif.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white truncate">
                        {actor?.name || 'System'}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">
                      {notif.details}
                    </p>

                    {/* Quick Action Buttons for Friend Request */}
                    {relatedReq && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            acceptFriendRequest(relatedReq.id);
                            markNotificationAsRead(notif.id);
                          }}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept & Chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
