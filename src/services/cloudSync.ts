import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  Post,
  User,
  EncryptedMessagePayload,
  AppNotification,
  Reel,
  ReelComment,
  GroupChat,
  GroupMessage,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errStr = error instanceof Error ? error.message : String(error);
  if (errStr.includes('resource-exhausted') || errStr.includes('Quota exceeded')) {
    if (!CloudSyncService.isQuotaExhausted) {
      console.warn('Firestore Free Tier Quota Exceeded. Switching to resilient local/offline storage mode.');
      CloudSyncService.isQuotaExhausted = true;
    }
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
}

export class CloudSyncService {
  private static isInitialized = false;
  public static isQuotaExhausted = false;

  static async seedInitialCloudData(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  // ==========================================
  // POSTS (ALL PREVIOUS POSTS REMAIN VISIBLE)
  // ==========================================

  /**
   * Real-time listener for public posts (all posts from others are preserved)
   */
  static subscribeToPublicPosts(onPostsUpdated: (posts: Post[]) => void): () => void {
    const postsCol = collection(db, 'posts');
    return onSnapshot(
      postsCol,
      (snapshot) => {
        const loadedPosts: Post[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Post;
          // Retain all posts so previous posts from others never disappear
          if (data && data.id && data.content !== undefined) {
            loadedPosts.push(data);
          }
        });

        loadedPosts.sort((a, b) => b.createdAt - a.createdAt);
        onPostsUpdated(loadedPosts);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'posts');
      }
    );
  }

  /**
   * Fetch all posts from Firestore
   */
  static async getPostsFromCloud(): Promise<Post[]> {
    try {
      const snap = await getDocs(collection(db, 'posts'));
      const posts: Post[] = [];
      snap.forEach((d) => {
        const p = d.data() as Post;
        if (p && p.id) posts.push(p);
      });
      posts.sort((a, b) => b.createdAt - a.createdAt);
      return posts;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'posts');
      return [];
    }
  }

  /**
   * Publish a new post to the cloud database
   */
  static async publishPostToCloud(post: Post): Promise<void> {
    if (this.isQuotaExhausted) return;
    try {
      const cleanPost = JSON.parse(JSON.stringify(post));
      await setDoc(doc(db, 'posts', post.id), cleanPost, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${post.id}`);
    }
  }

  /**
   * Sync local posts to Firestore so everyone sees them
   */
  static async syncLocalPostsToCloud(posts: Post[]): Promise<void> {
    if (this.isQuotaExhausted) return;
    for (const p of posts) {
      if (p.id && p.content !== undefined) {
        await this.publishPostToCloud(p);
      }
    }
  }

  /**
   * Update reactions on a cloud post
   */
  static async updatePostReactions(postId: string, reactions: Record<string, string[]>): Promise<void> {
    if (this.isQuotaExhausted) return;
    try {
      await updateDoc(doc(db, 'posts', postId), { reactions });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  }

  /**
   * Add a comment to a cloud post
   */
  static async updatePostComments(postId: string, comments: any[]): Promise<void> {
    if (this.isQuotaExhausted) return;
    try {
      await updateDoc(doc(db, 'posts', postId), { comments });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  }

  // ==========================================
  // REELS (DOOMSCROLL SHORT VIDEOS & PHOTOS)
  // ==========================================

  /**
   * Real-time listener for community Reels
   */
  static subscribeToReels(onReelsUpdated: (reels: Reel[]) => void): () => void {
    const reelsCol = collection(db, 'reels');
    return onSnapshot(
      reelsCol,
      (snapshot) => {
        const loadedReels: Reel[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Reel;
          if (data && data.id && data.mediaUrl) {
            loadedReels.push(data);
          }
        });
        loadedReels.sort((a, b) => b.createdAt - a.createdAt);
        onReelsUpdated(loadedReels);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'reels');
      }
    );
  }

  /**
   * Fetch all reels from cloud
   */
  static async getReelsFromCloud(): Promise<Reel[]> {
    try {
      const snap = await getDocs(collection(db, 'reels'));
      const reels: Reel[] = [];
      snap.forEach((d) => {
        const r = d.data() as Reel;
        if (r && r.id) reels.push(r);
      });
      reels.sort((a, b) => b.createdAt - a.createdAt);
      return reels;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'reels');
      return [];
    }
  }

  /**
   * Publish a new Reel to cloud
   */
  static async publishReelToCloud(reel: Reel): Promise<void> {
    if (this.isQuotaExhausted) return;
    try {
      const cleanReel = JSON.parse(JSON.stringify(reel));
      await setDoc(doc(db, 'reels', reel.id), cleanReel, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reels/${reel.id}`);
    }
  }

  /**
   * Toggle like on a Reel
   */
  static async updateReelLikes(reelId: string, likes: string[]): Promise<void> {
    if (this.isQuotaExhausted) return;
    try {
      await updateDoc(doc(db, 'reels', reelId), { likes });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reels/${reelId}`);
    }
  }

  /**
   * Add a comment to a Reel
   */
  static async addReelComment(reelId: string, comments: ReelComment[]): Promise<void> {
    if (this.isQuotaExhausted) return;
    try {
      await updateDoc(doc(db, 'reels', reelId), { comments });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reels/${reelId}`);
    }
  }

  // ==========================================
  // USERS & COMMUNITY PROFILES
  // ==========================================

  /**
   * Fetch all users from cloud Firestore
   */
  static async getUsersFromCloud(): Promise<User[]> {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const loadedUsers: User[] = [];
      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as User;
        if (u && u.id && u.email) {
          loadedUsers.push(u);
        }
      });
      return loadedUsers;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
      return [];
    }
  }

  /**
   * Directly look up a user by email or handle from cloud Firestore (case-insensitive)
   */
  static async getUserByEmailFromCloud(emailOrHandle: string): Promise<User | null> {
    const raw = emailOrHandle.trim().toLowerCase().replace(/^@/, '');
    try {
      const q = query(collection(db, 'users'), where('email', '==', raw));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as User;
      }
    } catch (err) {
      console.warn('Direct query by email note:', err);
    }

    try {
      const allUsers = await this.getUsersFromCloud();
      const match = allUsers.find(
        (u) =>
          u.email?.trim().toLowerCase() === raw ||
          u.handle?.trim().toLowerCase() === raw
      );
      if (match) return match;
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Real-time listener for community user profiles
   */
  static subscribeToUsers(onUsersUpdated: (users: User[]) => void): () => void {
    const usersCol = collection(db, 'users');
    return onSnapshot(
      usersCol,
      (snapshot) => {
        const loadedUsers: User[] = [];
        snapshot.forEach((docSnap) => {
          const u = docSnap.data() as User;
          if (u && u.id && u.email) {
            loadedUsers.push(u);
          }
        });

        if (loadedUsers.length > 0) {
          onUsersUpdated(loadedUsers);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      }
    );
  }

  /**
   * Save or update user profile to cloud (sanitizes undefined fields)
   */
  static async saveUserToCloud(user: User): Promise<boolean> {
    if (this.isQuotaExhausted) return false;
    try {
      const cleanUser = JSON.parse(JSON.stringify(user));
      await setDoc(doc(db, 'users', user.id), cleanUser, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`);
      return false;
    }
  }

  /**
   * Sync local user registrations up to Firestore
   */
  static async syncLocalUsersToCloud(users: User[]): Promise<void> {
    if (this.isQuotaExhausted) return;
    for (const u of users) {
      if (u.id && u.email) {
        await this.saveUserToCloud(u);
      }
    }
  }

  // ==========================================
  // DIRECT E2EE MESSAGES
  // ==========================================

  /**
   * Send end-to-end encrypted message to cloud
   */
  static async sendEncryptedMessageToCloud(msg: EncryptedMessagePayload): Promise<void> {
    if (this.isQuotaExhausted) return;
    try {
      const cleanMsg = JSON.parse(JSON.stringify(msg));
      await setDoc(doc(db, 'messages', msg.id), cleanMsg);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `messages/${msg.id}`);
    }
  }

  /**
   * Subscribe to incoming direct messages
   */
  static subscribeToMessages(onMessageReceived: (messages: EncryptedMessagePayload[]) => void): () => void {
    const messagesCol = collection(db, 'messages');
    return onSnapshot(
      messagesCol,
      (snapshot) => {
        const allMsgs: EncryptedMessagePayload[] = [];
        snapshot.forEach((docSnap) => {
          allMsgs.push(docSnap.data() as EncryptedMessagePayload);
        });
        allMsgs.sort((a, b) => a.createdAt - b.createdAt);
        onMessageReceived(allMsgs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'messages');
      }
    );
  }

  // ==========================================
  // GROUP CHATS & GROUP MESSAGES
  // ==========================================

  /**
   * Real-time listener for community groups
   */
  static subscribeToGroups(onGroupsUpdated: (groups: GroupChat[]) => void): () => void {
    const groupsCol = collection(db, 'groups');
    return onSnapshot(
      groupsCol,
      (snapshot) => {
        const loadedGroups: GroupChat[] = [];
        snapshot.forEach((docSnap) => {
          const g = docSnap.data() as GroupChat;
          if (g && g.id && g.name) {
            loadedGroups.push(g);
          }
        });
        loadedGroups.sort((a, b) => b.updatedAt - a.updatedAt);
        onGroupsUpdated(loadedGroups);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'groups');
      }
    );
  }

  /**
   * Fetch all groups from cloud
   */
  static async getGroupsFromCloud(): Promise<GroupChat[]> {
    try {
      const snap = await getDocs(collection(db, 'groups'));
      const groups: GroupChat[] = [];
      snap.forEach((d) => {
        const g = d.data() as GroupChat;
        if (g && g.id) groups.push(g);
      });
      return groups;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'groups');
      return [];
    }
  }

  /**
   * Save or update group in cloud
   */
  static async saveGroupToCloud(group: GroupChat): Promise<void> {
    if (this.isQuotaExhausted) return;
    try {
      const cleanGroup = JSON.parse(JSON.stringify(group));
      await setDoc(doc(db, 'groups', group.id), cleanGroup, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `groups/${group.id}`);
    }
  }

  /**
   * Real-time listener for group messages
   */
  static subscribeToGroupMessages(
    groupIdOrCb: string | ((msgs: GroupMessage[]) => void),
    cb?: (msgs: GroupMessage[]) => void
  ): () => void {
    const targetGroupId = typeof groupIdOrCb === 'string' ? groupIdOrCb : undefined;
    const onMessages = typeof groupIdOrCb === 'function' ? groupIdOrCb : cb!;
    const msgCol = collection(db, 'group_messages');
    return onSnapshot(
      msgCol,
      (snapshot) => {
        const allMsgs: GroupMessage[] = [];
        snapshot.forEach((docSnap) => {
          const m = docSnap.data() as GroupMessage;
          if (!targetGroupId || m.groupId === targetGroupId) {
            allMsgs.push(m);
          }
        });
        allMsgs.sort((a, b) => a.createdAt - b.createdAt);
        onMessages(allMsgs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'group_messages');
      }
    );
  }

  /**
   * Send a message to a group
   */
  static async sendGroupMessageToCloud(msg: GroupMessage): Promise<void> {
    if (this.isQuotaExhausted) return;
    try {
      const cleanMsg = JSON.parse(JSON.stringify(msg));
      await setDoc(doc(db, 'group_messages', msg.id), cleanMsg);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `group_messages/${msg.id}`);
    }
  }
}
