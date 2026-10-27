import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  Post,
  Comment,
  AppNotification,
  FriendRequest,
  TabView,
  AgeRating,
  AuthMode,
  EncryptedMessagePayload,
  Reel,
  ReelComment,
  GroupChat,
  GroupMessage,
  SoundTrack,
} from '../types';
import { StorageService } from '../services/storage';
import { CloudSyncService } from '../services/cloudSync';
import { validateFirestoreConnection } from '../firebase';

interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert';
}

interface SocialContextType {
  currentUser: User | null;
  users: User[];
  posts: Post[];
  vaultPosts: Post[];
  reels: Reel[];
  groups: GroupChat[];
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
  viewedUserId: string | null;
  viewProfile: (userId: string) => void;
  backToFeed: () => void;
  updateProfile: (updated: Partial<User>) => void;
  
  // Auth
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    birthDate: string;
    name?: string;
    handle?: string;
    avatar?: string;
    bio?: string;
    location?: string;
  }) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string, newPassword: string) => Promise<void>;

  // Post Interactions
  createPost: (data: {
    title?: string;
    content: string;
    mediaType: 'photo' | 'video' | 'text';
    mediaUrl?: string;
    ageRating: AgeRating;
  }) => void;
  saveToVault: (postId: string) => void;
  toggleReaction: (postId: string, emoji: string) => void;
  addComment: (postId: string, content: string) => void;
  toggleCommentReaction: (postId: string, commentId: string, emoji: string) => void;

  // Reels
  createReel: (data: Omit<Reel, 'id' | 'createdAt' | 'likes' | 'comments' | 'viewsCount'>) => void;
  toggleReelLike: (reelId: string) => void;
  addReelComment: (reelId: string, content: string) => void;
  isCreateReelOpen: boolean;
  setIsCreateReelOpen: (open: boolean) => void;
  activeSoundForReel: SoundTrack | null;
  setActiveSoundForReel: (sound: SoundTrack | null) => void;

  // Groups
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  openGroupChat: (groupId: string) => void;
  closeGroupChat: () => void;
  isCreateGroupOpen: boolean;
  setIsCreateGroupOpen: (open: boolean) => void;
  createGroup: (data: { name: string; description: string; icon?: string; initialMembers?: string[] }) => GroupChat;
  sendGroupMessage: (
    groupId: string,
    text?: string,
    options?: {
      mediaType?: 'photo' | 'video' | 'gif' | 'file';
      mediaUrl?: string;
      fileName?: string;
      fileSize?: string;
    }
  ) => Promise<GroupMessage | undefined>;
  addGroupMembers: (groupId: string, memberIds: string[]) => void;
  removeGroupMember: (groupId: string, memberId: string) => void;
  makeGroupAdmin: (groupId: string, memberId: string) => void;
  removeGroupAdmin: (groupId: string, memberId: string) => void;
  banGroupMember: (groupId: string, memberId: string, durationMs: number, reason?: string) => void;
  unbanGroupMember: (groupId: string, memberId: string) => void;
  updateGroupInfo: (groupId: string, updates: Partial<GroupChat>) => void;

  // Personal Mode & Mute
  isChatPersonalMode: (chatId: string) => boolean;
  toggleChatPersonalMode: (chatId: string) => void;
  isChatMuted: (chatId: string) => boolean;
  toggleChatMute: (chatId: string) => void;
  showPersonalOnly: boolean;
  setShowPersonalOnly: (show: boolean) => void;
  personalChatsCount: number;

  // Friend System (Mutual only)
  friendRequests: FriendRequest[];
  sendFriendRequest: (toUserId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  canChatWith: (userId: string) => boolean;

  // Notifications & Permissions
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  toasts: ToastAlert[];
  dismissToast: (id: string) => void;
  requestNotificationPermission: () => Promise<boolean>;
  notificationPermission: NotificationPermission | 'default';

  // Chat
  chatPeerId: string | null;
  openChat: (peerId: string) => void;
  closeChat: () => void;
  activeChatKeyFingerprint: string | null;

  // Modals
  isCreatePostOpen: boolean;
  setIsCreatePostOpen: (open: boolean) => void;
  isEditProfileOpen: boolean;
  setIsEditProfileOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  isKeyVerifyOpen: boolean;
  setIsKeyVerifyOpen: (open: boolean) => void;
  lightboxMedia: { url: string; title?: string; type: 'photo' | 'video' } | null;
  setLightboxMedia: (media: { url: string; title?: string; type: 'photo' | 'video' } | null) => void;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  StorageService.initStorage();

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => StorageService.getCurrentUserId());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [posts, setPosts] = useState<Post[]>(() => StorageService.getPublicActivePosts());
  const [reels, setReels] = useState<Reel[]>(() => StorageService.getReels());
  const [groups, setGroups] = useState<GroupChat[]>(() => StorageService.getGroups());
  const [vaultPosts, setVaultPosts] = useState<Post[]>(() =>
    currentUserId ? StorageService.getVaultPosts(currentUserId) : []
  );
  const [activeTab, setActiveTab] = useState<TabView>('feed');
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);

  // Group and Personal Mode state
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [showPersonalOnly, setShowPersonalOnly] = useState<boolean>(false);
  const [personalToggleState, setPersonalToggleState] = useState<number>(0);

  // Auth Modal state
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(!StorageService.getCurrentUserId());
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Real-time notifications & requests
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    currentUserId ? StorageService.getNotifications(currentUserId) : []
  );
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(() =>
    currentUserId ? StorageService.getFriendRequests(currentUserId) : []
  );
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Modals state
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [activeSoundForReel, setActiveSoundForReel] = useState<SoundTrack | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isKeyVerifyOpen, setIsKeyVerifyOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; title?: string; type: 'photo' | 'video' } | null>(null);

  // Chat
  const [chatPeerId, setChatPeerId] = useState<string | null>(null);
  const [activeChatKeyFingerprint, setActiveChatKeyFingerprint] = useState<string | null>(null);

  const currentUser = users.find((u) => u.id === currentUserId) || null;

  const showToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'alert' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Browser Notification helper
  const triggerBrowserNotification = useCallback((title: string, body: string, icon?: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
        });
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setNotificationPermission(result);
        if (result === 'granted') {
          showToast('Notifications Enabled', 'You will receive phone notifications when people message you.', 'success');
          return true;
        }
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }
    return false;
  };

  // Sync state helper
  const refreshState = useCallback(() => {
    setUsers(StorageService.getUsers());
    setPosts(StorageService.getPublicActivePosts());
    setReels(StorageService.getReels());
    setGroups(StorageService.getGroups());
    if (currentUserId) {
      setVaultPosts(StorageService.getVaultPosts(currentUserId));
      setNotifications(StorageService.getNotifications(currentUserId));
      setFriendRequests(StorageService.getFriendRequests(currentUserId));
    } else {
      setVaultPosts([]);
      setNotifications([]);
      setFriendRequests([]);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      StorageService.ensureUserKeyPair(currentUserId).then((keys) => {
        setActiveChatKeyFingerprint(keys.fingerprint);
      });
      // Prompt for notification permission on joining / active user
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        setTimeout(() => {
          Notification.requestPermission().then((p) => setNotificationPermission(p));
        }, 2000);
      }
    }
    refreshState();
  }, [currentUserId, refreshState]);

  // Cloud Database Sync: initialize & attach real-time Firestore listeners
  useEffect(() => {
    validateFirestoreConnection().then(() => {
      CloudSyncService.seedInitialCloudData();
      const localUsers = StorageService.getUsers();
      if (localUsers.length > 0) {
        CloudSyncService.syncLocalUsersToCloud(localUsers);
      }
      StorageService.syncUsersFromCloud();

      const localPosts = StorageService.getPosts();
      if (localPosts.length > 0) {
        CloudSyncService.syncLocalPostsToCloud(localPosts);
      }
    });

    // 1. Real-time listener for public posts (all previous posts remain visible)
    const unsubscribePosts = CloudSyncService.subscribeToPublicPosts((cloudPosts) => {
      if (cloudPosts.length > 0) {
        setPosts(cloudPosts);
        StorageService.savePosts(cloudPosts);
      }
    });

    // 2. Real-time listener for community Reels
    const unsubscribeReels = CloudSyncService.subscribeToReels((cloudReels) => {
      if (cloudReels.length > 0) {
        setReels(cloudReels);
        StorageService.saveReels(cloudReels);
      }
    });

    // 3. Real-time listener for community user profiles
    const unsubscribeUsers = CloudSyncService.subscribeToUsers((cloudUsers) => {
      if (cloudUsers.length > 0) {
        setUsers((prev) => {
          const map = new Map(prev.map((u) => [u.id, u]));
          cloudUsers.forEach((u) => map.set(u.id, { ...map.get(u.id), ...u }));
          const updated = Array.from(map.values());
          localStorage.setItem('nocturne_users_v3', JSON.stringify(updated));
          return updated;
        });
      }
    });

    // 4. Real-time listener for Groups
    const unsubscribeGroups = CloudSyncService.subscribeToGroups((cloudGroups) => {
      if (cloudGroups.length > 0) {
        setGroups(cloudGroups);
        StorageService.saveGroups(cloudGroups);
      }
    });

    // 5. Real-time listener for end-to-end encrypted direct messages
    const unsubscribeMessages = CloudSyncService.subscribeToMessages((cloudMsgs) => {
      if (cloudMsgs.length > 0) {
        const rawLocal = StorageService.getRawMessages();
        const map = new Map(rawLocal.map((m) => [m.id, m]));
        cloudMsgs.forEach((m) => {
          // If this is a new message to current user
          if (!map.has(m.id) && currentUserId && m.recipientId === currentUserId) {
            const isMuted = StorageService.isChatMuted(m.senderId);
            const isPersonal = StorageService.isChatPersonalMode(m.senderId);
            if (!isMuted && !isPersonal) {
              const sender = StorageService.getUserById(m.senderId);
              triggerBrowserNotification(
                sender?.name || 'New Message',
                m.mediaType && m.mediaType !== 'text' ? `Sent an attachment [${m.mediaType}]` : 'Sent you a secure message',
                sender?.avatar
              );
            }
          }
          map.set(m.id, m);
        });
        localStorage.setItem('nocturne_messages_v3', JSON.stringify(Array.from(map.values())));
      }
    });

    return () => {
      unsubscribePosts();
      unsubscribeReels();
      unsubscribeUsers();
      unsubscribeGroups();
      unsubscribeMessages();
    };
  }, [currentUserId, triggerBrowserNotification]);

  // Auth: Login
  const login = async (email: string, pass: string) => {
    const user = await StorageService.loginUser(email, pass);
    setCurrentUserId(user.id);
    refreshState();
    showToast('Welcome Back', `Logged in as ${user.name} (@${user.handle})`, 'success');
    requestNotificationPermission();
  };

  // Auth: Register
  const register = async (params: {
    email: string;
    password: string;
    birthDate: string;
    name?: string;
    handle?: string;
    avatar?: string;
    bio?: string;
    location?: string;
  }) => {
    const user = await StorageService.registerUser(params);
    setCurrentUserId(user.id);
    refreshState();
    showToast('Account Created', `Welcome to Nocturne, ${user.name}!`, 'success');
    requestNotificationPermission();
  };

  // Auth: Logout
  const logout = () => {
    StorageService.logout();
    setCurrentUserId(null);
    setViewedUserId(null);
    setChatPeerId(null);
    setActiveGroupId(null);
    setIsAuthOpen(true);
    setAuthMode('login');
    showToast('Logged Out', 'You have been logged out of Nocturne.', 'info');
  };

  const resetPassword = async (email: string, newPass: string) => {
    await StorageService.resetPassword(email, newPass);
    showToast('Password Reset', 'Your password has been reset. Please log in.', 'success');
  };

  const updateProfile = (updated: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updated };
    StorageService.updateUser(updatedUser);
    setUsers(StorageService.getUsers());
    CloudSyncService.saveUserToCloud(updatedUser);
    showToast('Profile Updated', 'Your profile details and avatar were updated.', 'success');
  };

  const viewProfile = (userId: string) => {
    setViewedUserId(userId);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToFeed = () => {
    setViewedUserId(null);
    setActiveTab('feed');
  };

  const createPost = (data: {
    title?: string;
    content: string;
    mediaType: 'photo' | 'video' | 'text';
    mediaUrl?: string;
    ageRating: AgeRating;
  }) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const newPost = StorageService.createPost({
      authorId: currentUser.id,
      title: data.title,
      content: data.content,
      mediaType: data.mediaType,
      mediaUrl: data.mediaUrl,
      ageRating: data.ageRating,
      warningAcknowledged: true,
    });
    setPosts(StorageService.getPublicActivePosts());
    showToast('Post Published', 'Published to community feed. Retained for all users.', 'success');
  };

  const saveToVault = (postId: string) => {
    if (!currentUser) return;
    const success = StorageService.savePostToVault(postId, currentUser.id);
    if (success) {
      refreshState();
      showToast('Saved to Private Vault', 'Preserved in your local storage vault.', 'success');
    }
  };

  const toggleReaction = (postId: string, emoji: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const post = StorageService.togglePostReaction(postId, currentUser.id, emoji);
    if (post) {
      refreshState();
    }
  };

  const addComment = (postId: string, content: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    StorageService.addCommentToPost(postId, currentUser.id, content);
    refreshState();
    showToast('Comment Added', 'Your comment has been posted.', 'info');
  };

  const toggleCommentReaction = (postId: string, commentId: string, emoji: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const posts = StorageService.getPosts();
    const post = posts.find((p) => p.id === postId);
    if (post) {
      const comment = post.comments?.find((c) => c.id === commentId);
      if (comment) {
        if (!comment.reactions) comment.reactions = {};
        if (!comment.reactions[emoji]) comment.reactions[emoji] = [];
        const idx = comment.reactions[emoji].indexOf(currentUser.id);
        if (idx >= 0) comment.reactions[emoji].splice(idx, 1);
        else comment.reactions[emoji].push(currentUser.id);
        StorageService.savePosts(posts);
        CloudSyncService.updatePostComments(postId, post.comments);
        refreshState();
      }
    }
  };

  // REELS METHODS
  const createReel = (data: Omit<Reel, 'id' | 'createdAt' | 'likes' | 'comments' | 'viewsCount'>) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const newReel = StorageService.createReel(data);
    setReels(StorageService.getReels());
    setActiveSoundForReel(null);
    setIsCreateReelOpen(false);
    showToast('Reel Uploaded', 'Your 9:16 Reel is live on the Doomscroll feed!', 'success');
  };

  const toggleReelLike = (reelId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    StorageService.toggleReelLike(reelId, currentUser.id);
    setReels(StorageService.getReels());
  };

  const addReelComment = (reelId: string, content: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    StorageService.addReelComment(reelId, currentUser.id, content);
    setReels(StorageService.getReels());
    showToast('Comment Posted', 'Comment added to Reel', 'info');
  };

  // GROUP METHODS
  const openGroupChat = (groupId: string) => {
    setChatPeerId(null);
    setActiveGroupId(groupId);
    setActiveTab('messages');
  };

  const closeGroupChat = () => {
    setActiveGroupId(null);
  };

  const sendGroupMessage = async (
    groupId: string,
    text?: string,
    options?: {
      mediaType?: 'photo' | 'video' | 'gif' | 'file';
      mediaUrl?: string;
      fileName?: string;
      fileSize?: string;
    }
  ) => {
    if (!currentUser) return undefined;
    return StorageService.sendGroupMessage({
      groupId,
      senderId: currentUser.id,
      text,
      ...options,
    });
  };

  const createGroup = (data: { name: string; description: string; icon?: string; initialMembers?: string[] }) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      throw new Error('You must be logged in to create a group.');
    }
    const newGroup = StorageService.createGroup({
      ...data,
      createdBy: currentUser.id,
    });
    setGroups(StorageService.getGroups());
    setIsCreateGroupOpen(false);
    setActiveGroupId(newGroup.id);
    setActiveTab('messages');
    showToast('Group Created', `"${newGroup.name}" is ready!`, 'success');
    return newGroup;
  };

  const addGroupMembers = (groupId: string, memberIds: string[]) => {
    if (!currentUser) return;
    try {
      StorageService.addGroupMembers(groupId, memberIds, currentUser.id);
      setGroups(StorageService.getGroups());
      showToast('Members Added', 'Selected friends were added to the group.', 'success');
    } catch (err: any) {
      showToast('Action Failed', err.message || 'Could not add members', 'alert');
    }
  };

  const removeGroupMember = (groupId: string, memberId: string) => {
    if (!currentUser) return;
    try {
      StorageService.removeGroupMember(groupId, memberId, currentUser.id);
      setGroups(StorageService.getGroups());
      showToast('Member Removed', 'User has been removed from the group.', 'info');
    } catch (err: any) {
      showToast('Action Failed', err.message || 'Could not remove member', 'alert');
    }
  };

  const makeGroupAdmin = (groupId: string, memberId: string) => {
    if (!currentUser) return;
    try {
      StorageService.makeGroupAdmin(groupId, memberId, currentUser.id);
      setGroups(StorageService.getGroups());
      showToast('Admin Promoted', 'User is now a group admin.', 'success');
    } catch (err: any) {
      showToast('Action Failed', err.message || 'Could not promote admin', 'alert');
    }
  };

  const removeGroupAdmin = (groupId: string, memberId: string) => {
    if (!currentUser) return;
    try {
      StorageService.removeGroupAdmin(groupId, memberId, currentUser.id);
      setGroups(StorageService.getGroups());
      showToast('Admin Demoted', 'Admin privileges removed.', 'info');
    } catch (err: any) {
      showToast('Action Failed', err.message || 'Could not remove admin', 'alert');
    }
  };

  const banGroupMember = (groupId: string, memberId: string, durationMs: number, reason?: string) => {
    if (!currentUser) return;
    try {
      StorageService.banGroupMember(groupId, memberId, currentUser.id, durationMs, reason);
      setGroups(StorageService.getGroups());
      showToast('User Banned', 'User has been banned from the group.', 'alert');
    } catch (err: any) {
      showToast('Action Failed', err.message || 'Could not ban user', 'alert');
    }
  };

  const unbanGroupMember = (groupId: string, memberId: string) => {
    if (!currentUser) return;
    try {
      StorageService.unbanGroupMember(groupId, memberId, currentUser.id);
      setGroups(StorageService.getGroups());
      showToast('User Unbanned', 'User can now participate again.', 'success');
    } catch (err: any) {
      showToast('Action Failed', err.message || 'Could not unban user', 'alert');
    }
  };

  const updateGroupInfo = (groupId: string, updates: Partial<GroupChat>, ) => {
    if (!currentUser) return;
    try {
      StorageService.updateGroupInfo(groupId, updates, currentUser.id);
      setGroups(StorageService.getGroups());
      showToast('Group Updated', 'Group settings saved.', 'success');
    } catch (err: any) {
      showToast('Action Failed', err.message || 'Could not update group', 'alert');
    }
  };

  // PERSONAL MODE & MUTE HELPERS
  const isChatPersonalMode = (chatId: string) => StorageService.isChatPersonalMode(chatId);
  const toggleChatPersonalMode = (chatId: string) => {
    const isNowPersonal = StorageService.toggleChatPersonalMode(chatId);
    setPersonalToggleState((prev) => prev + 1);
    showToast(
      isNowPersonal ? 'Personal Mode ON' : 'Personal Mode OFF',
      isNowPersonal ? 'Notifications hidden. Chat moved to Personal Chats tab.' : 'Standard notifications restored.',
      'info'
    );
  };

  const isChatMuted = (chatId: string) => StorageService.isChatMuted(chatId);
  const toggleChatMute = (chatId: string) => {
    const isNowMuted = StorageService.toggleChatMute(chatId);
    setPersonalToggleState((prev) => prev + 1);
    showToast(isNowMuted ? 'Chat Muted' : 'Chat Unmuted', isNowMuted ? 'No notifications will appear for this thread.' : 'Notifications enabled.', 'info');
  };

  // Calculate unread / received messages count in Personal Mode
  const personalChatsCount = (() => {
    if (!currentUser) return 0;
    const personalIds = StorageService.getPersonalChats();
    if (personalIds.length === 0) return 0;
    const rawMsgs = StorageService.getRawMessages();
    return rawMsgs.filter((m) => m.recipientId === currentUser.id && personalIds.includes(m.senderId)).length;
  })();

  const sendFriendRequest = (toUserId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    StorageService.sendFriendRequest(currentUser.id, toUserId);
    refreshState();
    const toUser = users.find((u) => u.id === toUserId);
    showToast('Friend Request Sent', `Request sent to ${toUser?.name || 'user'}.`, 'success');
  };

  const acceptFriendRequest = (requestId: string) => {
    StorageService.acceptFriendRequest(requestId);
    refreshState();
    showToast('Friend Connected', 'You are now mutual friends! Chat & group invites unlocked.', 'success');
  };

  const declineFriendRequest = (requestId: string) => {
    StorageService.declineFriendRequest(requestId);
    refreshState();
    showToast('Request Declined', 'Friend request removed.', 'info');
  };

  const canChatWith = (targetUserId: string): boolean => {
    if (!currentUser) return false;
    const target = users.find((u) => u.id === targetUserId);
    if (!target) return false;
    return currentUser.friends.includes(targetUserId) && target.friends.includes(currentUser.id);
  };

  const markNotificationAsRead = (id: string) => {
    StorageService.markNotificationAsRead(id);
    if (currentUserId) {
      setNotifications(StorageService.getNotifications(currentUserId));
    }
  };

  const markAllNotificationsAsRead = () => {
    if (currentUserId) {
      StorageService.markAllNotificationsAsRead(currentUserId);
      setNotifications(StorageService.getNotifications(currentUserId));
    }
  };

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  const openChat = (peerId: string) => {
    if (!canChatWith(peerId)) {
      showToast('Friend Request Required', 'You can only chat after the friend request has been accepted by both people.', 'alert');
      return;
    }
    setActiveGroupId(null);
    setChatPeerId(peerId);
    setActiveTab('messages');
  };

  const closeChat = () => {
    setChatPeerId(null);
    setActiveGroupId(null);
  };

  return (
    <SocialContext.Provider
      value={{
        currentUser,
        users,
        posts,
        vaultPosts,
        reels,
        groups,
        activeTab,
        setActiveTab,
        viewedUserId,
        viewProfile,
        backToFeed,
        updateProfile,
        isAuthOpen,
        setIsAuthOpen,
        authMode,
        setAuthMode,
        login,
        register,
        logout,
        resetPassword,
        createPost,
        saveToVault,
        toggleReaction,
        addComment,
        toggleCommentReaction,
        createReel,
        toggleReelLike,
        addReelComment,
        isCreateReelOpen,
        setIsCreateReelOpen,
        activeSoundForReel,
        setActiveSoundForReel,
        activeGroupId,
        setActiveGroupId,
        openGroupChat,
        closeGroupChat,
        isCreateGroupOpen,
        setIsCreateGroupOpen,
        createGroup,
        sendGroupMessage,
        addGroupMembers,
        removeGroupMember,
        makeGroupAdmin,
        removeGroupAdmin,
        banGroupMember,
        unbanGroupMember,
        updateGroupInfo,
        isChatPersonalMode,
        toggleChatPersonalMode,
        isChatMuted,
        toggleChatMute,
        showPersonalOnly,
        setShowPersonalOnly,
        personalChatsCount,
        friendRequests,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        canChatWith,
        notifications,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        toasts,
        dismissToast,
        requestNotificationPermission,
        notificationPermission,
        chatPeerId,
        openChat,
        closeChat,
        activeChatKeyFingerprint,
        isCreatePostOpen,
        setIsCreatePostOpen,
        isEditProfileOpen,
        setIsEditProfileOpen,
        isNotificationsOpen,
        setIsNotificationsOpen,
        isKeyVerifyOpen,
        setIsKeyVerifyOpen,
        lightboxMedia,
        setLightboxMedia,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
};

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
};
