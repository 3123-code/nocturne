export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  location: string;
  birthDate?: string; // YYYY-MM-DD
  age?: number;
  joinedDate: string;
  friends: string[]; // List of friend user IDs (only mutual accepted friends)
  isEmailVerified?: boolean;
  publicKeyJwk?: JsonWebKey;
  publicKeyFingerprint?: string;
  isOnline?: boolean;
}

export type MediaType = 'photo' | 'video' | 'text';
export type AgeRating = 'all' | '13+' | '18+';

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: number;
  reactions: Record<string, string[]>; // emoji -> array of userIds
}

export interface Post {
  id: string;
  authorId: string;
  title?: string;
  content: string;
  mediaType: MediaType;
  mediaUrl?: string;
  ageRating: AgeRating; // 'all' | '13+' | '18+'
  warningAcknowledged?: boolean;
  createdAt: number; // Unix timestamp ms
  expiresAt: number; // Unix timestamp ms
  isSavedToVault?: boolean; // Saved locally to private vault
  vaultSavedAt?: number;
  reactions: Record<string, string[]>; // emoji -> array of userIds
  comments: Comment[];
  viewsCount?: number;
}

export interface SoundTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  url: string;
  coverUrl?: string;
  category?: string;
}

export interface ReelTextOverlay {
  id: string;
  text: string;
  color: string;
  position: 'top' | 'center' | 'bottom';
  fontSize?: number;
}

export interface ReelComment {
  id: string;
  reelId: string;
  authorId: string;
  content: string;
  createdAt: number;
  reactions?: Record<string, string[]>;
}

export interface Reel {
  id: string;
  authorId: string;
  caption: string;
  mediaType: 'video' | 'photo';
  mediaUrl: string; // video URL / data URL or photo slide URL
  duration: number; // in seconds
  soundTitle?: string;
  soundArtist?: string;
  soundUrl?: string; // audio track url
  textOverlays?: ReelTextOverlay[];
  createdAt: number;
  likes: string[]; // user IDs
  comments: ReelComment[];
  viewsCount: number;
  ageRating?: AgeRating;
}

export interface GroupBan {
  userId: string;
  bannedUntil: number; // Unix timestamp ms
  reason?: string;
  bannedBy: string;
}

export interface GroupChat {
  id: string;
  name: string;
  description: string;
  icon?: string;
  createdBy: string;
  admins: string[]; // User IDs
  members: string[]; // User IDs
  bannedUsers: GroupBan[];
  createdAt: number;
  updatedAt: number;
  isPersonalMode?: boolean;
  isMuted?: boolean;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  text?: string;
  createdAt: number;
  mediaType?: 'photo' | 'video' | 'gif' | 'file';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export interface EncryptedMessagePayload {
  id: string;
  senderId: string;
  recipientId: string;
  ciphertext: string; // Base64 AES-GCM ciphertext
  iv: string; // Base64 12-byte IV
  encryptedKeySender: string; // Base64 RSA-OAEP encrypted AES key
  encryptedKeyRecipient: string; // Base64 RSA-OAEP encrypted AES key
  createdAt: number;
  mediaUrl?: string;
  mediaType?: 'photo' | 'video' | 'gif' | 'file' | 'text';
  fileName?: string;
  fileSize?: string;
  isPersonalMode?: boolean;
}

export interface DecryptedMessage extends EncryptedMessagePayload {
  plaintext: string;
  isDecrypted: boolean;
}

export type NotificationType =
  | 'reaction'
  | 'comment'
  | 'friend_request'
  | 'friend_accept'
  | 'vault_saved'
  | 'chat_message'
  | 'group_message'
  | 'group_removed'
  | 'reel_like'
  | 'reel_comment';

export interface AppNotification {
  id: string;
  userId: string; // Recipient of notification
  actorId: string; // Who triggered it
  type: NotificationType;
  postId?: string;
  reelId?: string;
  groupId?: string;
  details: string;
  createdAt: number;
  isRead: boolean;
  actionUrl?: string;
}

export type TabView = 'feed' | 'reels' | 'messages' | 'vault' | 'friends' | 'profile';

export type AuthMode = 'login' | 'register' | 'otp_verify' | 'profile_setup' | 'forgot_password' | 'reset_otp';
