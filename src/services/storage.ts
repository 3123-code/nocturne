import {
  User,
  Post,
  Comment,
  AppNotification,
  FriendRequest,
  EncryptedMessagePayload,
  Reel,
  ReelComment,
  GroupChat,
  GroupMessage,
  GroupBan,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_POSTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_FRIEND_REQUESTS,
} from '../data/seed';
import {
  generateKeyPair,
  encryptMessagePayload,
  decryptMessagePayload,
} from '../utils/crypto';
import { hashPassword, validateAgeRequirement } from '../utils/auth';
import { CloudSyncService } from './cloudSync';

const STORAGE_KEYS = {
  CURRENT_USER_ID: 'nocturne_current_user_id_v3',
  USERS: 'nocturne_users_v3',
  POSTS: 'nocturne_posts_v3',
  REELS: 'nocturne_reels_v3',
  GROUPS: 'nocturne_groups_v3',
  GROUP_MESSAGES: 'nocturne_group_messages_v3',
  NOTIFICATIONS: 'nocturne_notifications_v3',
  FRIEND_REQUESTS: 'nocturne_friend_requests_v3',
  MESSAGES: 'nocturne_messages_v3',
  USER_KEYS: 'nocturne_user_keys_v3',
  PERSONAL_CHATS: 'nocturne_personal_chats_v3', // array of chat IDs (user or group) in personal mode
  MUTED_CHATS: 'nocturne_muted_chats_v3', // array of muted chat IDs
};

export class StorageService {
  private static userKeyCache: Record<string, { privateKeyJwk: JsonWebKey; publicKeyJwk: JsonWebKey }> = {};

  static initStorage(): void {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.POSTS)) {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REELS)) {
      localStorage.setItem(STORAGE_KEYS.REELS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.GROUPS)) {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.GROUP_MESSAGES)) {
      localStorage.setItem(STORAGE_KEYS.GROUP_MESSAGES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS)) {
      localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PERSONAL_CHATS)) {
      localStorage.setItem(STORAGE_KEYS.PERSONAL_CHATS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MUTED_CHATS)) {
      localStorage.setItem(STORAGE_KEYS.MUTED_CHATS, JSON.stringify([]));
    }

    // Fetch cloud data without bulk uploading everything on startup to preserve free quota
    try {
      this.syncUsersFromCloud();
    } catch {
      // ignore
    }
  }

  static getCurrentUserId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || null;
  }

  static setCurrentUserId(userId: string | null): void {
    if (userId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  }

  static logout(): void {
    this.setCurrentUserId(null);
  }

  static async syncUsersFromCloud(): Promise<void> {
    try {
      const cloudUsers = await CloudSyncService.getUsersFromCloud();
      if (cloudUsers.length > 0) {
        const localUsers = this.getUsers();
        const map = new Map(localUsers.map((u) => [u.id, u]));
        cloudUsers.forEach((u) => map.set(u.id, { ...map.get(u.id), ...u }));
        this.saveUsers(Array.from(map.values()));
      }
    } catch (err) {
      console.warn('Could not sync users from cloud:', err);
    }
  }

  static getUsers(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static getUserById(id: string): User | undefined {
    const users = this.getUsers();
    return users.find((u) => u.id === id);
  }

  static findUserByEmail(email: string): User | undefined {
    const users = this.getUsers();
    return users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());
  }

  static saveUsers(users: User[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  static updateUser(user: User): void {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    this.saveUsers(users);
    CloudSyncService.saveUserToCloud(user);
  }

  static async registerUser(params: {
    email: string;
    password: string;
    birthDate: string;
    name?: string;
    handle?: string;
    avatar?: string;
    bio?: string;
    location?: string;
  }): Promise<User> {
    await this.syncUsersFromCloud();
    const normalizedEmail = params.email.trim().toLowerCase();

    // Check if user already exists (local storage + cloud)
    let existing = this.findUserByEmail(normalizedEmail);
    if (!existing) {
      existing = (await CloudSyncService.getUserByEmailFromCloud(normalizedEmail)) || undefined;
    }
    if (existing) {
      throw new Error('User already exists!');
    }

    if (!params.password || params.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const ageResult = validateAgeRequirement(params.birthDate);
    if (!ageResult.isValid) {
      throw new Error(ageResult.error || 'You must be at least 10 years old to create an account.');
    }

    const passwordHash = await hashPassword(params.password);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const keys = await this.ensureUserKeyPair(userId);

    const baseHandle = params.handle || normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

    const newUser: User = {
      id: userId,
      email: normalizedEmail,
      passwordHash,
      name: params.name?.trim() || baseHandle,
      handle: baseHandle,
      avatar: params.avatar || defaultAvatar,
      bio: params.bio?.trim() || '',
      location: params.location?.trim() || '',
      birthDate: params.birthDate,
      age: ageResult.age,
      joinedDate: 'October 2026',
      friends: [],
      isEmailVerified: true,
      publicKeyJwk: keys.publicKeyJwk,
      publicKeyFingerprint: keys.fingerprint,
      isOnline: true,
    };

    const users = this.getUsers();
    users.push(newUser);
    this.saveUsers(users);
    this.setCurrentUserId(newUser.id);
    await CloudSyncService.saveUserToCloud(newUser);

    return newUser;
  }

  static async loginUser(emailOrHandle: string, password: string): Promise<User> {
    await this.syncUsersFromCloud();
    const raw = emailOrHandle.trim().toLowerCase().replace(/^@/, '');

    // 1. Try finding in local users (case-insensitive email or handle)
    let user = this.getUsers().find(
      (u) =>
        u.email?.trim().toLowerCase() === raw ||
        u.handle?.trim().toLowerCase() === raw
    );

    // 2. If not found locally, fetch directly from cloud (cross-device/guest mode)
    if (!user) {
      const cloudUser = await CloudSyncService.getUserByEmailFromCloud(raw);
      if (cloudUser) {
        user = cloudUser;
        this.updateUser(cloudUser);
      }
    }

    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password.');
    }

    const hash = await hashPassword(password);
    const hashTrimmed = await hashPassword(password.trim());
    if (hash !== user.passwordHash && hashTrimmed !== user.passwordHash && password !== user.passwordHash) {
      throw new Error('Invalid email or password.');
    }

    this.setCurrentUserId(user.id);
    user.isOnline = true;
    this.updateUser(user);
    await CloudSyncService.saveUserToCloud(user);
    return user;
  }

  static async resetPassword(emailOrHandle: string, newPassword: string): Promise<void> {
    await this.syncUsersFromCloud();
    const raw = emailOrHandle.trim().toLowerCase().replace(/^@/, '');
    let user = this.getUsers().find(
      (u) =>
        u.email?.trim().toLowerCase() === raw ||
        u.handle?.trim().toLowerCase() === raw
    );

    if (!user) {
      const cloudUser = await CloudSyncService.getUserByEmailFromCloud(raw);
      if (cloudUser) {
        user = cloudUser;
      }
    }

    if (!user) {
      throw new Error('No user found registered with this email or handle.');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    user.passwordHash = await hashPassword(newPassword.trim());
    this.updateUser(user);
    await CloudSyncService.saveUserToCloud(user);
  }

  static async ensureUserKeyPair(userId: string): Promise<{
    publicKeyJwk: JsonWebKey;
    privateKeyJwk: JsonWebKey;
    fingerprint: string;
  }> {
    const keyData = localStorage.getItem(STORAGE_KEYS.USER_KEYS);
    const allKeys = keyData ? JSON.parse(keyData) : {};

    if (allKeys[userId]) {
      this.userKeyCache[userId] = allKeys[userId];
      return allKeys[userId];
    }

    const keyPair = await generateKeyPair();
    const userKeys = {
      publicKeyJwk: keyPair.publicKeyJwk,
      privateKeyJwk: keyPair.privateKeyJwk,
      fingerprint: keyPair.fingerprint,
    };

    allKeys[userId] = userKeys;
    localStorage.setItem(STORAGE_KEYS.USER_KEYS, JSON.stringify(allKeys));
    this.userKeyCache[userId] = userKeys;

    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.publicKeyJwk = keyPair.publicKeyJwk;
      user.publicKeyFingerprint = keyPair.fingerprint;
      this.saveUsers(users);
    }

    return userKeys;
  }

  // ==========================================
  // POSTS
  // ==========================================

  static getPosts(): Post[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.POSTS);
      return data ? JSON.parse(data) : INITIAL_POSTS;
    } catch {
      return INITIAL_POSTS;
    }
  }

  static savePosts(posts: Post[]): void {
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
  }

  /**
   * Get all active public posts (all posts from others are preserved)
   */
  static getPublicActivePosts(): Post[] {
    const posts = this.getPosts();
    return posts.slice().sort((a, b) => b.createdAt - a.createdAt);
  }

  static getUserPosts(userId: string): Post[] {
    const posts = this.getPosts();
    return posts
      .filter((p) => p.authorId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  static getVaultPosts(userId: string): Post[] {
    const posts = this.getPosts();
    return posts
      .filter((p) => p.authorId === userId && p.isSavedToVault)
      .sort((a, b) => (b.vaultSavedAt || b.createdAt) - (a.vaultSavedAt || a.createdAt));
  }

  static savePostToVault(postId: string, userId: string): boolean {
    const posts = this.getPosts();
    const post = posts.find((p) => p.id === postId && p.authorId === userId);
    if (post) {
      post.isSavedToVault = true;
      post.vaultSavedAt = Date.now();
      this.savePosts(posts);

      this.addNotification({
        userId,
        actorId: userId,
        type: 'vault_saved',
        postId,
        details: `Saved "${post.title || 'post'}" to your private local storage vault.`,
      });
      return true;
    }
    return false;
  }

  static createPost(post: Omit<Post, 'id' | 'createdAt' | 'expiresAt' | 'reactions' | 'comments'>): Post {
    const now = Date.now();
    const newPost: Post = {
      ...post,
      id: `post_${now}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days retention
      reactions: {},
      comments: [],
    };

    const posts = this.getPosts();
    posts.unshift(newPost);
    this.savePosts(posts);
    CloudSyncService.publishPostToCloud(newPost);

    return newPost;
  }

  static togglePostReaction(postId: string, userId: string, emoji: string): Post | undefined {
    const posts = this.getPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) return undefined;

    if (!post.reactions) post.reactions = {};
    if (!post.reactions[emoji]) post.reactions[emoji] = [];

    const existingIndex = post.reactions[emoji].indexOf(userId);
    if (existingIndex >= 0) {
      post.reactions[emoji].splice(existingIndex, 1);
    } else {
      post.reactions[emoji].push(userId);
      if (post.authorId !== userId) {
        this.addNotification({
          userId: post.authorId,
          actorId: userId,
          type: 'reaction',
          postId: post.id,
          details: `reacted ${emoji} to your post`,
        });
      }
    }

    this.savePosts(posts);
    CloudSyncService.updatePostReactions(postId, post.reactions);
    return post;
  }

  static addCommentToPost(postId: string, authorId: string, content: string): Comment | undefined {
    const posts = this.getPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) return undefined;

    const newComment: Comment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      postId,
      authorId,
      content,
      createdAt: Date.now(),
      reactions: {},
    };

    if (!post.comments) post.comments = [];
    post.comments.push(newComment);
    this.savePosts(posts);
    CloudSyncService.updatePostComments(postId, post.comments);

    if (post.authorId !== authorId) {
      this.addNotification({
        userId: post.authorId,
        actorId: authorId,
        type: 'comment',
        postId: post.id,
        details: `commented: "${content.slice(0, 30)}${content.length > 30 ? '...' : ''}"`,
      });
    }

    return newComment;
  }

  // ==========================================
  // REELS
  // ==========================================

  static getReels(): Reel[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REELS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveReels(reels: Reel[]): void {
    localStorage.setItem(STORAGE_KEYS.REELS, JSON.stringify(reels));
  }

  static createReel(data: Omit<Reel, 'id' | 'createdAt' | 'likes' | 'comments' | 'viewsCount'>): Reel {
    const now = Date.now();
    const newReel: Reel = {
      ...data,
      id: `reel_${now}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      likes: [],
      comments: [],
      viewsCount: 1,
    };

    const reels = this.getReels();
    reels.unshift(newReel);
    this.saveReels(reels);
    CloudSyncService.publishReelToCloud(newReel);

    return newReel;
  }

  static toggleReelLike(reelId: string, userId: string): Reel | undefined {
    const reels = this.getReels();
    const reel = reels.find((r) => r.id === reelId);
    if (!reel) return undefined;

    if (!reel.likes) reel.likes = [];
    const index = reel.likes.indexOf(userId);
    if (index >= 0) {
      reel.likes.splice(index, 1);
    } else {
      reel.likes.push(userId);
      if (reel.authorId !== userId) {
        this.addNotification({
          userId: reel.authorId,
          actorId: userId,
          type: 'reel_like',
          reelId: reel.id,
          details: 'liked your Reel ❤️',
        });
      }
    }

    this.saveReels(reels);
    CloudSyncService.updateReelLikes(reelId, reel.likes);
    return reel;
  }

  static addReelComment(reelId: string, authorId: string, content: string): ReelComment | undefined {
    const reels = this.getReels();
    const reel = reels.find((r) => r.id === reelId);
    if (!reel) return undefined;

    const newComment: ReelComment = {
      id: `comm_reel_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      reelId,
      authorId,
      content,
      createdAt: Date.now(),
    };

    if (!reel.comments) reel.comments = [];
    reel.comments.push(newComment);
    this.saveReels(reels);
    CloudSyncService.addReelComment(reelId, reel.comments);

    if (reel.authorId !== authorId) {
      this.addNotification({
        userId: reel.authorId,
        actorId: authorId,
        type: 'reel_comment',
        reelId: reel.id,
        details: `commented on your Reel: "${content.slice(0, 25)}..."`,
      });
    }

    return newComment;
  }

  // ==========================================
  // GROUP CHATS
  // ==========================================

  static getGroups(): GroupChat[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveGroups(groups: GroupChat[]): void {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  }

  static createGroup(data: {
    name: string;
    description: string;
    icon?: string;
    createdBy: string;
    initialMembers?: string[]; // ONLY allowed from currentUser.friends!
  }): GroupChat {
    const now = Date.now();
    const creator = this.getUserById(data.createdBy);
    const friends = creator?.friends || [];

    // Filter to ensure ONLY friends can be added (no strangers)
    const validMembers = (data.initialMembers || []).filter((id) => friends.includes(id));
    const allMembers = Array.from(new Set([data.createdBy, ...validMembers]));

    const newGroup: GroupChat = {
      id: `group_${now}_${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim(),
      description: data.description.trim(),
      icon: data.icon || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80',
      createdBy: data.createdBy,
      admins: [data.createdBy],
      members: allMembers,
      bannedUsers: [],
      createdAt: now,
      updatedAt: now,
    };

    const groups = this.getGroups();
    groups.unshift(newGroup);
    this.saveGroups(groups);
    CloudSyncService.saveGroupToCloud(newGroup);

    return newGroup;
  }

  static addGroupMembers(groupId: string, memberIds: string[], adminId: string): void {
    const groups = this.getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group || !group.admins.includes(adminId)) {
      throw new Error('Only group admins can add members.');
    }

    const admin = this.getUserById(adminId);
    const adminFriends = admin?.friends || [];

    // Only allow adding friends
    const allowed = memberIds.filter((id) => adminFriends.includes(id));
    if (allowed.length === 0) {
      throw new Error('You can only add people who are your accepted friends.');
    }

    group.members = Array.from(new Set([...group.members, ...allowed]));
    group.updatedAt = Date.now();
    this.saveGroups(groups);
    CloudSyncService.saveGroupToCloud(group);
  }

  static removeGroupMember(groupId: string, memberId: string, adminId: string): void {
    const groups = this.getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group || !group.admins.includes(adminId)) {
      throw new Error('Only group admins can remove members.');
    }

    if (memberId === group.createdBy) {
      throw new Error('The group creator cannot be removed.');
    }

    group.members = group.members.filter((id) => id !== memberId);
    group.admins = group.admins.filter((id) => id !== memberId);
    group.updatedAt = Date.now();
    this.saveGroups(groups);
    CloudSyncService.saveGroupToCloud(group);

    // Send notification to the removed person
    this.addNotification({
      userId: memberId,
      actorId: adminId,
      type: 'group_removed',
      groupId,
      details: `You have been removed from ${group.name}`,
    });
  }

  static makeGroupAdmin(groupId: string, memberId: string, adminId: string): void {
    const groups = this.getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group || !group.admins.includes(adminId)) {
      throw new Error('Only group admins can appoint other admins.');
    }

    if (!group.admins.includes(memberId)) {
      group.admins.push(memberId);
      group.updatedAt = Date.now();
      this.saveGroups(groups);
      CloudSyncService.saveGroupToCloud(group);
    }
  }

  static removeGroupAdmin(groupId: string, memberId: string, adminId: string): void {
    const groups = this.getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group || !group.admins.includes(adminId)) {
      throw new Error('Only group admins can remove admins.');
    }

    if (memberId === group.createdBy) {
      throw new Error('Cannot remove the group creator from admins.');
    }

    group.admins = group.admins.filter((id) => id !== memberId);
    group.updatedAt = Date.now();
    this.saveGroups(groups);
    CloudSyncService.saveGroupToCloud(group);
  }

  static banGroupMember(groupId: string, memberId: string, adminId: string, durationMs: number, reason?: string): void {
    const groups = this.getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group || !group.admins.includes(adminId)) {
      throw new Error('Only group admins can ban users.');
    }

    if (memberId === group.createdBy) {
      throw new Error('Cannot ban the group creator.');
    }

    // Remove from active members
    group.members = group.members.filter((id) => id !== memberId);
    group.admins = group.admins.filter((id) => id !== memberId);

    const banEntry: GroupBan = {
      userId: memberId,
      bannedUntil: Date.now() + durationMs,
      reason,
      bannedBy: adminId,
    };

    if (!group.bannedUsers) group.bannedUsers = [];
    group.bannedUsers = group.bannedUsers.filter((b) => b.userId !== memberId);
    group.bannedUsers.push(banEntry);
    group.updatedAt = Date.now();

    this.saveGroups(groups);
    CloudSyncService.saveGroupToCloud(group);

    this.addNotification({
      userId: memberId,
      actorId: adminId,
      type: 'group_removed',
      groupId,
      details: `You have been banned from ${group.name}${reason ? ` (${reason})` : ''}`,
    });
  }

  static unbanGroupMember(groupId: string, memberId: string, adminId: string): void {
    const groups = this.getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group || !group.admins.includes(adminId)) {
      throw new Error('Only group admins can unban users.');
    }

    if (group.bannedUsers) {
      group.bannedUsers = group.bannedUsers.filter((b) => b.userId !== memberId);
      group.updatedAt = Date.now();
      this.saveGroups(groups);
      CloudSyncService.saveGroupToCloud(group);
    }
  }

  static updateGroupInfo(groupId: string, updates: Partial<GroupChat>, adminId: string): void {
    const groups = this.getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group || !group.admins.includes(adminId)) {
      throw new Error('Only group admins can edit group settings.');
    }

    Object.assign(group, updates, { updatedAt: Date.now() });
    this.saveGroups(groups);
    CloudSyncService.saveGroupToCloud(group);
  }

  // ==========================================
  // GROUP MESSAGES
  // ==========================================

  static getGroupMessages(groupId: string): GroupMessage[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GROUP_MESSAGES);
      const all: GroupMessage[] = raw ? JSON.parse(raw) : [];
      return all.filter((m) => m.groupId === groupId).sort((a, b) => a.createdAt - b.createdAt);
    } catch {
      return [];
    }
  }

  static sendGroupMessage(data: Omit<GroupMessage, 'id' | 'createdAt'>): GroupMessage {
    const groups = this.getGroups();
    const group = groups.find((g) => g.id === data.groupId);
    if (!group) throw new Error('Group not found');

    // Check if user is currently banned
    const ban = (group.bannedUsers || []).find((b) => b.userId === data.senderId);
    if (ban && ban.bannedUntil > Date.now()) {
      throw new Error('You are banned from sending messages in this group.');
    }

    const newMsg: GroupMessage = {
      ...data,
      id: `gmsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GROUP_MESSAGES);
      const all: GroupMessage[] = raw ? JSON.parse(raw) : [];
      all.push(newMsg);
      localStorage.setItem(STORAGE_KEYS.GROUP_MESSAGES, JSON.stringify(all));
    } catch {
      // ignore
    }

    CloudSyncService.sendGroupMessageToCloud(newMsg);
    return newMsg;
  }

  // ==========================================
  // PERSONAL MODE & MUTED CHATS
  // ==========================================

  static getPersonalChats(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PERSONAL_CHATS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static isChatPersonalMode(chatId: string): boolean {
    const list = this.getPersonalChats();
    return list.includes(chatId);
  }

  static toggleChatPersonalMode(chatId: string): boolean {
    const list = this.getPersonalChats();
    const index = list.indexOf(chatId);
    let newState = false;
    if (index >= 0) {
      list.splice(index, 1);
      newState = false;
    } else {
      list.push(chatId);
      newState = true;
    }
    localStorage.setItem(STORAGE_KEYS.PERSONAL_CHATS, JSON.stringify(list));
    return newState;
  }

  static getMutedChats(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MUTED_CHATS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static isChatMuted(chatId: string): boolean {
    const list = this.getMutedChats();
    return list.includes(chatId);
  }

  static toggleChatMute(chatId: string): boolean {
    const list = this.getMutedChats();
    const index = list.indexOf(chatId);
    let newState = false;
    if (index >= 0) {
      list.splice(index, 1);
      newState = false;
    } else {
      list.push(chatId);
      newState = true;
    }
    localStorage.setItem(STORAGE_KEYS.MUTED_CHATS, JSON.stringify(list));
    return newState;
  }

  // ==========================================
  // FRIEND SYSTEM
  // ==========================================

  static getFriendRequests(userId: string): FriendRequest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS);
      const allRequests: FriendRequest[] = data ? JSON.parse(data) : [];
      return allRequests.filter((r) => r.toUserId === userId && r.status === 'pending');
    } catch {
      return [];
    }
  }

  static sendFriendRequest(fromUserId: string, toUserId: string): boolean {
    if (fromUserId === toUserId) return false;

    const fromUser = this.getUserById(fromUserId);
    const toUser = this.getUserById(toUserId);
    if (!fromUser || !toUser) return false;

    if (fromUser.friends?.includes(toUserId)) return false;

    const raw = localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS);
    const requests: FriendRequest[] = raw ? JSON.parse(raw) : [];

    const existing = requests.find(
      (r) =>
        (r.fromUserId === fromUserId && r.toUserId === toUserId) ||
        (r.fromUserId === toUserId && r.toUserId === fromUserId)
    );

    if (existing && existing.status === 'pending') return false;

    const newRequest: FriendRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: Date.now(),
    };

    requests.push(newRequest);
    localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(requests));

    this.addNotification({
      userId: toUserId,
      actorId: fromUserId,
      type: 'friend_request',
      details: 'sent you a friend request',
    });

    return true;
  }

  static acceptFriendRequest(requestId: string): boolean {
    const raw = localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS);
    const requests: FriendRequest[] = raw ? JSON.parse(raw) : [];
    const request = requests.find((r) => r.id === requestId);

    if (!request || request.status !== 'pending') return false;

    request.status = 'accepted';
    localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(requests));

    const userA = this.getUserById(request.fromUserId);
    const userB = this.getUserById(request.toUserId);

    if (userA && userB) {
      if (!userA.friends) userA.friends = [];
      if (!userB.friends) userB.friends = [];

      if (!userA.friends.includes(userB.id)) userA.friends.push(userB.id);
      if (!userB.friends.includes(userA.id)) userB.friends.push(userA.id);

      this.updateUser(userA);
      this.updateUser(userB);

      this.addNotification({
        userId: userA.id,
        actorId: userB.id,
        type: 'friend_accept',
        details: 'accepted your friend request. You can now chat and add each other to groups!',
      });

      return true;
    }
    return false;
  }

  static declineFriendRequest(requestId: string): boolean {
    const raw = localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS);
    const requests: FriendRequest[] = raw ? JSON.parse(raw) : [];
    const request = requests.find((r) => r.id === requestId);
    if (!request) return false;

    request.status = 'declined';
    localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(requests));
    return true;
  }

  static canChat(userAId: string, userBId: string): boolean {
    if (userAId === userBId) return false;
    const userA = this.getUserById(userAId);
    return Boolean(userA?.friends?.includes(userBId));
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  static getNotifications(userId: string): AppNotification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const all: AppNotification[] = data ? JSON.parse(data) : [];
      return all
        .filter((n) => n.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  static addNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): AppNotification {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      isRead: false,
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const all: AppNotification[] = raw ? JSON.parse(raw) : [];
      all.unshift(newNotif);
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));
    } catch {
      // ignore
    }

    return newNotif;
  }

  static markNotificationAsRead(id: string): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const all: AppNotification[] = raw ? JSON.parse(raw) : [];
      const notif = all.find((n) => n.id === id);
      if (notif) {
        notif.isRead = true;
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));
      }
    } catch {
      // ignore
    }
  }

  static markAllNotificationsAsRead(userId: string): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const all: AppNotification[] = raw ? JSON.parse(raw) : [];
      all.forEach((n) => {
        if (n.userId === userId) n.isRead = true;
      });
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));
    } catch {
      // ignore
    }
  }

  // ==========================================
  // MESSAGING (DIRECT E2EE WITH MULTIMEDIA)
  // ==========================================

  static getRawMessages(): EncryptedMessagePayload[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async sendEncryptedMessage(
    senderId: string,
    recipientId: string,
    plaintext: string,
    mediaUrl?: string,
    mediaType?: 'photo' | 'video' | 'gif' | 'file' | 'text',
    fileName?: string,
    fileSize?: string
  ): Promise<EncryptedMessagePayload> {
    const senderKeys = await this.ensureUserKeyPair(senderId);
    const recipientKeys = await this.ensureUserKeyPair(recipientId);

    const encrypted = await encryptMessagePayload(
      plaintext,
      recipientKeys.publicKeyJwk,
      senderKeys.publicKeyJwk
    );

    const isPersonal = this.isChatPersonalMode(recipientId);

    const newMsg: EncryptedMessagePayload = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId,
      recipientId,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      encryptedKeySender: encrypted.encryptedKeySender,
      encryptedKeyRecipient: encrypted.encryptedKeyRecipient,
      createdAt: Date.now(),
      mediaUrl,
      mediaType: mediaType || (mediaUrl ? 'photo' : 'text'),
      fileName,
      fileSize,
      isPersonalMode: isPersonal,
    };

    const messages = this.getRawMessages();
    messages.push(newMsg);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));

    CloudSyncService.sendEncryptedMessageToCloud(newMsg);

    // Only notify if recipient has not muted this chat and not in personal mode
    if (!this.isChatMuted(senderId) && !isPersonal) {
      this.addNotification({
        userId: recipientId,
        actorId: senderId,
        type: 'chat_message',
        details: 'sent you a message 🔒',
      });
    }

    return newMsg;
  }

  static async getDecryptedConversation(
    currentUserId: string,
    peerId: string
  ): Promise<Array<EncryptedMessagePayload & { plaintext: string }>> {
    const userKeys = await this.ensureUserKeyPair(currentUserId);
    const allMessages = this.getRawMessages();

    const conversation = allMessages.filter(
      (m) =>
        (m.senderId === currentUserId && m.recipientId === peerId) ||
        (m.senderId === peerId && m.recipientId === currentUserId)
    );

    const decrypted = await Promise.all(
      conversation.map(async (msg) => {
        const isSender = msg.senderId === currentUserId;
        const encKey = isSender ? msg.encryptedKeySender : msg.encryptedKeyRecipient;

        try {
          const text = await decryptMessagePayload(
            msg.ciphertext,
            msg.iv,
            encKey,
            userKeys.privateKeyJwk
          );
          return { ...msg, plaintext: text };
        } catch {
          return { ...msg, plaintext: '[Decryption Error]' };
        }
      })
    );

    return decrypted.sort((a, b) => a.createdAt - b.createdAt);
  }
}
