import React, { useState, useEffect, useRef } from 'react';
import { useSocial } from '../context/SocialContext';
import { StorageService } from '../services/storage';
import { CloudSyncService } from '../services/cloudSync';
import { EncryptedMessagePayload, GroupMessage, GroupChat } from '../types';
import { formatRelativeTime } from '../utils/format';
import {
  Lock,
  ShieldCheck,
  Send,
  Image as ImageIcon,
  ArrowLeft,
  Users,
  Eye,
  EyeOff,
  UserPlus,
  Clock,
  LogIn,
  BellOff,
  Bell,
  Sparkles,
  Paperclip,
  Smile,
  Plus,
  Shield,
  Crown,
  UserX,
  Ban,
  FileText,
  Download,
  Info,
  X,
  Check,
} from 'lucide-react';

const POPULAR_GIFS = [
  { id: '1', title: 'Celebration', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80' },
  { id: '2', title: 'Vibes', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80' },
  { id: '3', title: 'Neon Night', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80' },
  { id: '4', title: 'Laughing', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80' },
  { id: '5', title: 'Applause', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=80' },
  { id: '6', title: 'Chill Lo-Fi', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80' },
];

export const ChatView: React.FC = () => {
  const {
    currentUser,
    users,
    chatPeerId,
    openChat,
    closeChat,
    groups,
    activeGroupId,
    openGroupChat,
    closeGroupChat,
    setIsKeyVerifyOpen,
    setActiveTab,
    friendRequests,
    acceptFriendRequest,
    declineFriendRequest,
    sendFriendRequest,
    canChatWith,
    setIsAuthOpen,
    setAuthMode,
    setIsCreateGroupOpen,
    sendGroupMessage,
    addGroupMembers,
    removeGroupMember,
    makeGroupAdmin,
    removeGroupAdmin,
    banGroupMember,
    unbanGroupMember,
    isChatPersonalMode,
    toggleChatPersonalMode,
    isChatMuted,
    toggleChatMute,
    personalChatsCount,
  } = useSocial();

  // Chat tab category: 'direct' | 'groups' | 'personal'
  const [chatCategory, setChatCategory] = useState<'direct' | 'groups' | 'personal'>('direct');
  const [directMessages, setDirectMessages] = useState<Array<EncryptedMessagePayload & { plaintext: string }>>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showRawCiphertext, setShowRawCiphertext] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string; url: string; type: string } | null>(null);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [banDurationMinutes, setBanDurationMinutes] = useState<number>(60);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // If user is not logged in
  if (!currentUser) {
    return (
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">End-to-End Encrypted Chat &amp; Groups</h2>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Log in or create a Nocturne account to exchange zero-knowledge encrypted messages with mutual friends or participate in secure friend-only groups.
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

  // Strictly mutual friends
  const mutualFriends = users.filter((u) => u.id !== currentUser.id && canChatWith(u.id));
  const activePeer = users.find((u) => u.id === chatPeerId);
  const isPeerMutualFriend = activePeer ? canChatWith(activePeer.id) : false;

  // Active group
  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const isCurrentMemberOfGroup = activeGroup ? activeGroup.members.includes(currentUser.id) : false;
  const isCurrentGroupAdmin = activeGroup ? activeGroup.admins.includes(currentUser.id) || activeGroup.createdBy === currentUser.id : false;
  const isCurrentGroupCreator = activeGroup ? activeGroup.createdBy === currentUser.id : false;

  // Check ban status for current user in active group
  const userBan = activeGroup?.bannedUsers?.find(
    (b) => b.userId === currentUser.id && (b.bannedUntil === -1 || b.bannedUntil > Date.now())
  );

  // Friend requests
  const hasSentPendingRequest = activePeer
    ? StorageService.getFriendRequests(activePeer.id).some((r) => r.fromUserId === currentUser.id && r.status === 'pending')
    : false;
  const incomingPendingRequest = activePeer
    ? friendRequests.find((r) => r.fromUserId === activePeer.id)
    : undefined;

  // Load and decrypt direct conversation
  useEffect(() => {
    let isMounted = true;
    if (chatPeerId && isPeerMutualFriend) {
      StorageService.getDecryptedConversation(currentUser.id, chatPeerId).then((msgs) => {
        if (isMounted) {
          setDirectMessages(msgs);
        }
      });
    } else {
      setDirectMessages([]);
    }
    return () => {
      isMounted = false;
    };
  }, [chatPeerId, currentUser.id, isPeerMutualFriend]);

  // Load group messages & subscribe to updates
  useEffect(() => {
    if (!activeGroupId) {
      setGroupMessages([]);
      return;
    }
    const msgs = StorageService.getGroupMessages(activeGroupId);
    setGroupMessages(msgs);

    const unsubscribe = CloudSyncService.subscribeToGroupMessages(activeGroupId, (cloudMsgs: GroupMessage[]) => {
      setGroupMessages(cloudMsgs);
    });

    return () => {
      unsubscribe();
    };
  }, [activeGroupId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [directMessages, groupMessages]);

  // Direct Message Sending
  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage && !selectedFile) || !chatPeerId || isSending || !isPeerMutualFriend) return;

    setIsSending(true);
    const textToSend = inputText.trim();
    let mediaPayload = selectedImage || undefined;
    if (selectedFile) {
      mediaPayload = selectedFile.url;
    }

    setInputText('');
    setSelectedImage(null);
    setSelectedFile(null);

    await StorageService.sendEncryptedMessage(
      currentUser.id,
      chatPeerId,
      textToSend || (selectedFile ? `[File attachment: ${selectedFile.name}]` : '[Photo attachment]'),
      mediaPayload
    );

    const updated = await StorageService.getDecryptedConversation(currentUser.id, chatPeerId);
    setDirectMessages(updated);
    setIsSending(false);
  };

  // Group Message Sending
  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage && !selectedFile) || !activeGroupId || isSending || !isCurrentMemberOfGroup || userBan) return;

    setIsSending(true);
    const textToSend = inputText.trim();

    let options: {
      mediaType?: 'photo' | 'video' | 'gif' | 'file';
      mediaUrl?: string;
      fileName?: string;
      fileSize?: string;
    } = {};

    if (selectedImage) {
      options = { mediaType: 'photo', mediaUrl: selectedImage };
    } else if (selectedFile) {
      options = {
        mediaType: 'file',
        mediaUrl: selectedFile.url,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      };
    }

    setInputText('');
    setSelectedImage(null);
    setSelectedFile(null);

    await sendGroupMessage(
      activeGroupId,
      textToSend || (options.fileName ? `[File: ${options.fileName}]` : '[Media]'),
      options
    );

    // Refresh local state
    setGroupMessages(StorageService.getGroupMessages(activeGroupId));
    setIsSending(false);
  };

  // Send GIF
  const handleSendGif = async (gifUrl: string) => {
    setIsGifPickerOpen(false);
    if (activeGroupId) {
      await sendGroupMessage(activeGroupId, 'Sent a GIF', {
        mediaType: 'gif',
        mediaUrl: gifUrl,
      });
      setGroupMessages(StorageService.getGroupMessages(activeGroupId));
    } else if (chatPeerId && isPeerMutualFriend) {
      await StorageService.sendEncryptedMessage(
        currentUser.id,
        chatPeerId,
        'Sent a GIF',
        gifUrl
      );
      const updated = await StorageService.getDecryptedConversation(currentUser.id, chatPeerId);
      setDirectMessages(updated);
    }
  };

  const handleImageAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedImage(event.target.result as string);
        setSelectedFile(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedFile({
          name: file.name,
          size: sizeStr,
          url: event.target.result as string,
          type: file.type || 'application/octet-stream',
        });
        setSelectedImage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Filter conversation list based on category
  const filteredFriends = mutualFriends.filter((f) => {
    const isPersonal = isChatPersonalMode(f.id);
    if (chatCategory === 'personal') return isPersonal;
    return !isPersonal;
  });

  const filteredGroups = groups.filter((g) => {
    const isPersonal = isChatPersonalMode(g.id);
    if (chatCategory === 'personal') return isPersonal;
    return !isPersonal;
  });

  const isCurrentChatPersonal = (chatPeerId && isChatPersonalMode(chatPeerId)) ||
    (activeGroupId && isChatPersonalMode(activeGroupId));

  const isCurrentChatMuted = (chatPeerId && isChatMuted(chatPeerId)) ||
    (activeGroupId && isChatMuted(activeGroupId));

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-2xl flex flex-col md:flex-row h-[82vh] min-h-[580px]">
      {/* Sidebar: Direct chats and Groups */}
      <div
        className={`w-full md:w-80 border-r border-neutral-800 flex flex-col bg-neutral-950/70 shrink-0 ${
          chatPeerId || activeGroupId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">E2EE Chat &amp; Groups</h2>
          </div>
          <button
            onClick={() => setIsCreateGroupOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-xs font-semibold border border-indigo-500/30 transition-colors"
            title="Create a new friend-only group"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Group</span>
          </button>
        </div>

        {/* Categories Tab Selector: Direct | Groups | Personal */}
        <div className="p-2 border-b border-neutral-800/80 bg-neutral-950/40 grid grid-cols-3 gap-1">
          <button
            onClick={() => setChatCategory('direct')}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
              chatCategory === 'direct'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Direct</span>
          </button>

          <button
            onClick={() => setChatCategory('groups')}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
              chatCategory === 'groups'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Groups</span>
          </button>

          <button
            onClick={() => setChatCategory('personal')}
            className={`relative py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
              chatCategory === 'personal'
                ? 'bg-purple-900/40 text-purple-200 font-semibold border border-purple-700/50'
                : 'text-neutral-400 hover:text-purple-300 hover:bg-neutral-900'
            }`}
            title="Personal Mode: notifications suppressed"
          >
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span>Personal</span>
            {personalChatsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-purple-600 text-white text-[10px] font-bold rounded-full font-mono animate-pulse">
                {personalChatsCount}
              </span>
            )}
          </button>
        </div>

        {/* Pending Friend Requests in Direct Chat */}
        {friendRequests.length > 0 && chatCategory === 'direct' && (
          <div className="p-2.5 bg-indigo-950/20 border-b border-indigo-900/40">
            <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider block mb-1.5">
              Pending Requests ({friendRequests.length})
            </span>
            <div className="space-y-1.5">
              {friendRequests.map((req) => {
                const sender = users.find((u) => u.id === req.fromUserId);
                if (!sender) return null;
                return (
                  <div
                    key={req.id}
                    className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={sender.avatar}
                        alt={sender.name}
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-white truncate">{sender.name}</div>
                        <div className="text-[9px] text-neutral-500 font-mono">@{sender.handle}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => acceptFriendRequest(req.id)}
                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[10px] font-bold"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineFriendRequest(req.id)}
                        className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-md text-[10px]"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Direct chats */}
          {(chatCategory === 'direct' || chatCategory === 'personal') && (
            <>
              {filteredFriends.length === 0 && chatCategory === 'direct' ? (
                <div className="p-6 text-center text-neutral-500 text-xs">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-neutral-400" />
                  <p className="font-medium text-neutral-300">No mutual friends yet</p>
                  <p className="text-[11px] mt-1 text-neutral-400 leading-relaxed">
                    Once you and another user accept friend requests, encrypted chats unlock automatically.
                  </p>
                  <button
                    onClick={() => setActiveTab('friends')}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold inline-block"
                  >
                    Find Friends
                  </button>
                </div>
              ) : null}

              {filteredFriends.map((friend) => {
                const isSelected = friend.id === chatPeerId;
                const isPersonal = isChatPersonalMode(friend.id);
                const isMuted = isChatMuted(friend.id);

                return (
                  <button
                    key={friend.id}
                    onClick={() => {
                      closeGroupChat();
                      openChat(friend.id);
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                      isSelected
                        ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700'
                        : 'hover:bg-neutral-800/50 text-neutral-300'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-700"
                      />
                      {friend.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-neutral-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold truncate text-white">{friend.name}</span>
                        <div className="flex items-center gap-1">
                          {isMuted && <BellOff className="w-3 h-3 text-neutral-500" />}
                          {isPersonal && <Lock className="w-3 h-3 text-purple-400" />}
                        </div>
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono truncate">
                        @{friend.handle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* Groups */}
          {(chatCategory === 'groups' || chatCategory === 'personal') && (
            <>
              {filteredGroups.length === 0 && chatCategory === 'groups' ? (
                <div className="p-6 text-center text-neutral-500 text-xs">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-40 text-neutral-400" />
                  <p className="font-medium text-neutral-300">No Groups</p>
                  <p className="text-[11px] mt-1 text-neutral-400 leading-relaxed">
                    Create a group with your mutual friends for encrypted multi-user messaging.
                  </p>
                  <button
                    onClick={() => setIsCreateGroupOpen(true)}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold inline-block"
                  >
                    Create Group
                  </button>
                </div>
              ) : null}

              {filteredGroups.map((group) => {
                const isSelected = group.id === activeGroupId;
                const isPersonal = isChatPersonalMode(group.id);
                const isMuted = isChatMuted(group.id);

                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      closeChat();
                      openGroupChat(group.id);
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                      isSelected
                        ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700'
                        : 'hover:bg-neutral-800/50 text-neutral-300'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={group.icon || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=120&auto=format&fit=crop&q=80'}
                        alt={group.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-neutral-700"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold truncate text-white">{group.name}</span>
                        <div className="flex items-center gap-1">
                          {isMuted && <BellOff className="w-3 h-3 text-neutral-500" />}
                          {isPersonal && <Lock className="w-3 h-3 text-purple-400" />}
                        </div>
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {group.members.length} members &bull; {group.description || 'Friend group'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* Personal chats empty */}
          {chatCategory === 'personal' && filteredFriends.length === 0 && filteredGroups.length === 0 && (
            <div className="p-6 text-center text-neutral-500 text-xs">
              <Lock className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
              <p className="font-medium text-purple-300">No Personal Chats</p>
              <p className="text-[11px] mt-1 text-neutral-400 leading-relaxed">
                Toggle &ldquo;Personal Mode&rdquo; on any direct conversation or group to suppress push notifications and route it here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Conversation Canvas */}
      <div className={`flex-1 flex flex-col bg-neutral-900 ${!chatPeerId && !activeGroupId ? 'hidden md:flex' : 'flex'}`}>
        {/* Case 1: Active Direct Peer Chat */}
        {activePeer && (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={closeChat}
                  className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <img
                  src={activePeer.avatar}
                  alt={activePeer.name}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-neutral-700 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">{activePeer.name}</h3>
                    <span className="hidden sm:inline text-xs text-neutral-500 font-mono">
                      @{activePeer.handle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{isPeerMutualFriend ? 'E2EE Mutual Friend' : 'Mutual Request Required'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Actions: Mute, Personal Mode, Safety Code */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleChatMute(activePeer.id)}
                  className={`p-2 rounded-lg border transition-colors ${
                    isCurrentChatMuted
                      ? 'bg-rose-950/30 text-rose-300 border-rose-800/40'
                      : 'text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
                  }`}
                  title={isCurrentChatMuted ? 'Unmute conversation' : 'Mute conversation'}
                >
                  {isCurrentChatMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => toggleChatPersonalMode(activePeer.id)}
                  className={`p-2 rounded-lg border transition-colors ${
                    isCurrentChatPersonal
                      ? 'bg-purple-950/40 text-purple-300 border-purple-800/40'
                      : 'text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
                  }`}
                  title={isCurrentChatPersonal ? 'Disable Personal Mode' : 'Enable Personal Mode (Suppress notifications)'}
                >
                  <Lock className="w-4 h-4" />
                </button>

                {isPeerMutualFriend && (
                  <>
                    <button
                      onClick={() => setShowRawCiphertext(!showRawCiphertext)}
                      className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                        showRawCiphertext
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                          : 'text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
                      }`}
                      title="Inspect real cryptographic AES-GCM ciphertext"
                    >
                      {showRawCiphertext ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>Inspect</span>
                    </button>

                    <button
                      onClick={() => setIsKeyVerifyOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 border border-neutral-700"
                      title="Verify RSA safety fingerprint"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Keys</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Non-mutual friend lock state */}
            {!isPeerMutualFriend ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400">
                  <Lock className="w-8 h-8 text-amber-400" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-bold text-white">Mutual Friendship Required</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    E2EE messaging is unlocked only when you and <strong className="text-white">{activePeer.name}</strong> have accepted each other&apos;s friend requests.
                  </p>
                </div>
                <div className="pt-2">
                  {incomingPendingRequest ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => acceptFriendRequest(incomingPendingRequest.id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                      >
                        Accept Friend Request
                      </button>
                      <button
                        onClick={() => declineFriendRequest(incomingPendingRequest.id)}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-xl text-xs font-medium"
                      >
                        Decline
                      </button>
                    </div>
                  ) : hasSentPendingRequest ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 font-mono">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Request sent &bull; Waiting for {activePeer.name.split(' ')[0]}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(activePeer.id)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/25"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Send Friend Request</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Messages list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {directMessages.length === 0 ? (
                    <div className="py-12 text-center text-neutral-500">
                      <Lock className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-white">Mutual E2EE Chat Ready</h4>
                      <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                        Send a message, encrypted photo, or document to {activePeer.name.split(' ')[0]}.
                      </p>
                    </div>
                  ) : (
                    directMessages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      const isGif = msg.mediaUrl && (msg.mediaUrl.includes('unsplash') || msg.plaintext.includes('GIF'));
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[85%] sm:max-w-md rounded-2xl p-3 space-y-1.5 shadow-sm ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-br-xs'
                                : 'bg-neutral-800 text-neutral-100 rounded-bl-xs border border-neutral-700/60'
                            }`}
                          >
                            {msg.mediaUrl && (
                              <div className="rounded-xl overflow-hidden bg-black/40 mb-1 max-h-64">
                                {isGif || msg.mediaUrl.startsWith('data:image') || msg.mediaUrl.includes('http') ? (
                                  <img
                                    src={msg.mediaUrl}
                                    alt="Encrypted attachment"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-auto object-cover"
                                  />
                                ) : (
                                  <a
                                    href={msg.mediaUrl}
                                    download="attachment"
                                    className="p-3 flex items-center gap-2 bg-neutral-900 text-xs text-indigo-400 hover:underline"
                                  >
                                    <Download className="w-4 h-4" />
                                    <span>Download Attachment</span>
                                  </a>
                                )}
                              </div>
                            )}

                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {msg.plaintext}
                            </p>

                            {showRawCiphertext && (
                              <div className="mt-1 pt-1 border-t border-white/20 text-[9px] font-mono opacity-90 space-y-0.5 bg-black/30 p-1.5 rounded-lg">
                                <div className="text-emerald-300 font-bold flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>AES-GCM Ciphertext:</span>
                                </div>
                                <div className="break-all text-[8px] text-neutral-300">
                                  {msg.ciphertext.substring(0, 80)}...
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-1 pt-0.5 text-[9px] opacity-75 font-mono">
                              <span>{formatRelativeTime(msg.createdAt)}</span>
                              {isMe && <Lock className="w-2.5 h-2.5" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-3 bg-neutral-950/60 border-t border-neutral-800">
                  {selectedImage && (
                    <div className="relative inline-block mb-2">
                      <img
                        src={selectedImage}
                        alt="Preview"
                        className="w-14 h-14 rounded-lg object-cover ring-2 ring-indigo-500"
                      />
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-neutral-800 text-white text-[10px] flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </div>
                  )}

                  {selectedFile && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-neutral-900 border border-neutral-800 rounded-lg max-w-sm">
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white truncate font-medium">{selectedFile.name}</p>
                        <p className="text-[10px] text-neutral-400 font-mono">{selectedFile.size}</p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-neutral-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* GIF Drawer Popover */}
                  {isGifPickerOpen && (
                    <div className="mb-2 p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Choose Reaction GIF</span>
                        </span>
                        <button
                          onClick={() => setIsGifPickerOpen(false)}
                          className="text-neutral-400 hover:text-white text-xs"
                        >
                          &times;
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {POPULAR_GIFS.map((gif) => (
                          <button
                            key={gif.id}
                            type="button"
                            onClick={() => handleSendGif(gif.url)}
                            className="relative group rounded-lg overflow-hidden h-20 border border-neutral-800 hover:border-indigo-500 transition-colors"
                          >
                            <img
                              src={gif.url}
                              alt={gif.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute bottom-1 left-1 text-[9px] text-white font-semibold bg-black/60 px-1 rounded">
                              {gif.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSendDirectMessage} className="flex items-center gap-1.5 sm:gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageAttachment}
                      accept="image/*"
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={docInputRef}
                      onChange={handleDocumentAttachment}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                      title="Attach Photo"
                    >
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                      title="Attach File"
                    >
                      <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsGifPickerOpen(!isGifPickerOpen)}
                      className="p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                      title="Send Reaction GIF"
                    >
                      <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={`Message ${activePeer.name.split(' ')[0]}...`}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    <button
                      type="submit"
                      disabled={(!inputText.trim() && !selectedImage && !selectedFile) || isSending}
                      className="p-2 sm:p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md shadow-indigo-600/25"
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </>
        )}

        {/* Case 2: Active Group Chat */}
        {activeGroup && (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={closeGroupChat}
                  className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <img
                  src={activeGroup.icon || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=120&auto=format&fit=crop&q=80'}
                  alt={activeGroup.name}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-xl object-cover ring-1 ring-neutral-700 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">{activeGroup.name}</h3>
                    {isCurrentGroupAdmin && (
                      <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-indigo-900/40 text-indigo-300 font-semibold border border-indigo-700/40">
                        <Shield className="w-2.5 h-2.5" />
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-400 truncate">
                    {activeGroup.members.length} members &bull; {activeGroup.description || 'Friend group'}
                  </div>
                </div>
              </div>

              {/* Group Header Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleChatMute(activeGroup.id)}
                  className={`p-2 rounded-lg border transition-colors ${
                    isCurrentChatMuted
                      ? 'bg-rose-950/30 text-rose-300 border-rose-800/40'
                      : 'text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
                  }`}
                  title={isCurrentChatMuted ? 'Unmute Group' : 'Mute Group'}
                >
                  {isCurrentChatMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => toggleChatPersonalMode(activeGroup.id)}
                  className={`p-2 rounded-lg border transition-colors ${
                    isCurrentChatPersonal
                      ? 'bg-purple-950/40 text-purple-300 border-purple-800/40'
                      : 'text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
                  }`}
                  title={isCurrentChatPersonal ? 'Disable Personal Mode' : 'Enable Personal Mode (Suppress notifications)'}
                >
                  <Lock className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsGroupInfoOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 border border-neutral-700"
                >
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Members</span>
                </button>
              </div>
            </div>

            {/* If user is banned */}
            {userBan ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-center text-rose-400">
                  <Ban className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">You are banned from this group</h3>
                <p className="text-xs text-rose-300/90 max-w-sm">
                  {userBan.bannedUntil === -1
                    ? 'You have been permanently banned by a group administrator.'
                    : `You are banned until ${new Date(userBan.bannedUntil).toLocaleString()}. You cannot send messages.`}
                </p>
                {userBan.reason && (
                  <p className="text-[11px] text-neutral-400 font-mono">Reason: {userBan.reason}</p>
                )}
              </div>
            ) : !isCurrentMemberOfGroup ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <UserX className="w-10 h-10 text-neutral-600" />
                <h3 className="text-sm font-semibold text-white">Not a Member</h3>
                <p className="text-xs text-neutral-400 max-w-sm">
                  You are no longer a member of this group.
                </p>
              </div>
            ) : (
              <>
                {/* Group Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {groupMessages.length === 0 ? (
                    <div className="py-12 text-center text-neutral-500">
                      <Shield className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-white">{activeGroup.name}</h4>
                      <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                        This group was created for friends. Say hello to everyone!
                      </p>
                    </div>
                  ) : (
                    groupMessages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      const senderUser = users.find((u) => u.id === msg.senderId);
                      const isSenderAdmin = activeGroup.admins.includes(msg.senderId) || activeGroup.createdBy === msg.senderId;
                      const senderName = senderUser?.name || (isMe ? currentUser.name : 'Member');
                      const senderAvatar = senderUser?.avatar || (isMe ? currentUser.avatar : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80');

                      return (
                        <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {!isMe && (
                            <img
                              src={senderAvatar}
                              alt={senderName}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
                            />
                          )}

                          <div
                            className={`max-w-[85%] sm:max-w-md rounded-2xl p-3 space-y-1.5 shadow-sm ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-br-xs'
                                : 'bg-neutral-800 text-neutral-100 rounded-bl-xs border border-neutral-700/60'
                            }`}
                          >
                            {!isMe && (
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-xs font-semibold text-indigo-300">
                                  {senderName}
                                </span>
                                {isSenderAdmin && (
                                  <Shield className="w-3 h-3 text-indigo-400" />
                                )}
                              </div>
                            )}

                            {/* Attachments */}
                            {msg.mediaUrl && (
                              <div className="rounded-xl overflow-hidden bg-black/40 mb-1 max-h-64">
                                {msg.mediaType === 'photo' || msg.mediaType === 'gif' ? (
                                  <img
                                    src={msg.mediaUrl}
                                    alt="Group attachment"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-auto object-cover"
                                  />
                                ) : msg.mediaType === 'file' ? (
                                  <div className="p-3 flex items-center justify-between gap-3 bg-neutral-900/90">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                                      <div className="truncate">
                                        <p className="text-xs font-semibold text-white truncate">
                                          {msg.fileName || 'Shared File'}
                                        </p>
                                        <p className="text-[10px] text-neutral-400 font-mono">
                                          {msg.fileSize || 'Document'}
                                        </p>
                                      </div>
                                    </div>
                                    <a
                                      href={msg.mediaUrl}
                                      download={msg.fileName || 'file'}
                                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                                      title="Download file"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                ) : null}
                              </div>
                            )}

                            {msg.text && (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {msg.text}
                              </p>
                            )}

                            <div className="flex items-center justify-end gap-1 pt-0.5 text-[9px] opacity-75 font-mono">
                              <span>{formatRelativeTime(msg.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Group Input Bar */}
                <div className="p-3 bg-neutral-950/60 border-t border-neutral-800">
                  {selectedImage && (
                    <div className="relative inline-block mb-2">
                      <img
                        src={selectedImage}
                        alt="Preview"
                        className="w-14 h-14 rounded-lg object-cover ring-2 ring-indigo-500"
                      />
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-neutral-800 text-white text-[10px] flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </div>
                  )}

                  {selectedFile && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-neutral-900 border border-neutral-800 rounded-lg max-w-sm">
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white truncate font-medium">{selectedFile.name}</p>
                        <p className="text-[10px] text-neutral-400 font-mono">{selectedFile.size}</p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-neutral-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* GIF Drawer Popover */}
                  {isGifPickerOpen && (
                    <div className="mb-2 p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Choose Reaction GIF</span>
                        </span>
                        <button
                          onClick={() => setIsGifPickerOpen(false)}
                          className="text-neutral-400 hover:text-white text-xs"
                        >
                          &times;
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {POPULAR_GIFS.map((gif) => (
                          <button
                            key={gif.id}
                            type="button"
                            onClick={() => handleSendGif(gif.url)}
                            className="relative group rounded-lg overflow-hidden h-20 border border-neutral-800 hover:border-indigo-500 transition-colors"
                          >
                            <img
                              src={gif.url}
                              alt={gif.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute bottom-1 left-1 text-[9px] text-white font-semibold bg-black/60 px-1 rounded">
                              {gif.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSendGroupMessage} className="flex items-center gap-1.5 sm:gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageAttachment}
                      accept="image/*"
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={docInputRef}
                      onChange={handleDocumentAttachment}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                      title="Attach Photo"
                    >
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                      title="Attach File"
                    >
                      <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsGifPickerOpen(!isGifPickerOpen)}
                      className="p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                      title="Send Reaction GIF"
                    >
                      <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={`Message ${activeGroup.name}...`}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    <button
                      type="submit"
                      disabled={(!inputText.trim() && !selectedImage && !selectedFile) || isSending}
                      className="p-2 sm:p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md shadow-indigo-600/25"
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </>
        )}

        {/* Case 3: Empty */}
        {!activePeer && !activeGroup && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500">
            <Lock className="w-10 h-10 mb-3 text-neutral-700" />
            <h3 className="text-sm font-semibold text-neutral-300">Select a Conversation or Group</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm">
              Conversations are protected with E2EE. Create groups with mutual friends, send images, files, reaction GIFs, and customize personal notification modes.
            </p>
          </div>
        )}
      </div>

      {/* Group Info & Members Drawer Modal */}
      {isGroupInfoOpen && activeGroup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={activeGroup.icon || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=120&auto=format&fit=crop&q=80'}
                  alt={activeGroup.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-neutral-700"
                />
                <div>
                  <h3 className="text-sm font-bold text-white">{activeGroup.name}</h3>
                  <p className="text-[11px] text-neutral-400">{activeGroup.members.length} members</p>
                </div>
              </div>
              <button
                onClick={() => setIsGroupInfoOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {activeGroup.description && (
                <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
                  <span className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider block mb-1">
                    Description
                  </span>
                  <p className="text-xs text-neutral-300">{activeGroup.description}</p>
                </div>
              )}

              {/* Add Friends CTA (Only if current user is admin) */}
              {isCurrentGroupAdmin && (
                <div>
                  <button
                    onClick={() => {
                      setIsAddMemberOpen(true);
                      setSelectedFriendIds([]);
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Friends to Group</span>
                  </button>
                  <p className="text-[10px] text-neutral-500 text-center mt-1">
                    Only your mutual friends can be added (no strangers).
                  </p>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Group Members ({activeGroup.members.length})
                </span>

                <div className="space-y-1.5">
                  {activeGroup.members.map((memberId: string) => {
                    const memberUser = users.find((u) => u.id === memberId);
                    const isCreator = activeGroup.createdBy === memberId;
                    const isAdmin = activeGroup.admins.includes(memberId) || isCreator;
                    const isSelf = memberId === currentUser.id;

                    return (
                      <div
                        key={memberId}
                        className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {memberUser ? (
                            <img
                              src={memberUser.avatar}
                              alt={memberUser.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-neutral-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-neutral-400 font-bold">
                              ?
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-white truncate">
                                {memberUser ? memberUser.name : 'User'}
                              </span>
                              {isSelf && (
                                <span className="text-[9px] text-neutral-500 font-mono">(You)</span>
                              )}
                              {isCreator ? (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] bg-amber-950/50 text-amber-300 font-bold border border-amber-800/40">
                                  <Crown className="w-2.5 h-2.5" />
                                  Creator
                                </span>
                              ) : isAdmin ? (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] bg-indigo-950/50 text-indigo-300 font-bold border border-indigo-800/40">
                                  <Shield className="w-2.5 h-2.5" />
                                  Admin
                                </span>
                              ) : null}
                            </div>
                            {memberUser && (
                              <p className="text-[10px] text-neutral-500 font-mono truncate">
                                @{memberUser.handle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Admin Controls on Member */}
                        {isCurrentGroupAdmin && !isSelf && !isCreator && (
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Toggle Admin */}
                            {isCurrentGroupCreator && (
                              <button
                                onClick={() => {
                                  if (isAdmin) {
                                    removeGroupAdmin(activeGroup.id, memberId);
                                  } else {
                                    makeGroupAdmin(activeGroup.id, memberId);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs"
                                title={isAdmin ? 'Remove Admin' : 'Make Admin'}
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Remove Member */}
                            <button
                              onClick={() => removeGroupMember(activeGroup.id, memberId)}
                              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs border border-rose-800/40"
                              title="Remove from group"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>

                            {/* Ban Member */}
                            <button
                              onClick={() => {
                                const durationMs = banDurationMinutes * 60 * 1000;
                                banGroupMember(activeGroup.id, memberId, durationMs, 'Admin ban');
                              }}
                              className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-400 text-xs border border-red-800/50"
                              title={`Ban for ${banDurationMinutes >= 1440 ? `${banDurationMinutes / 1440}d` : `${banDurationMinutes / 60}h`}`}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ban duration preset for admins */}
              {isCurrentGroupAdmin && (
                <div className="p-3 bg-neutral-950/50 rounded-xl border border-neutral-800/80">
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                    <span className="font-semibold text-white flex items-center gap-1">
                      <Ban className="w-3.5 h-3.5 text-red-400" />
                      <span>Ban Duration Preset:</span>
                    </span>
                    <span className="text-[11px] font-mono text-indigo-400">
                      {banDurationMinutes === 60 ? '1 Hour' : banDurationMinutes === 1440 ? '24 Hours' : '7 Days'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBanDurationMinutes(60)}
                      className={`py-1 rounded-lg text-xs font-semibold ${
                        banDurationMinutes === 60
                          ? 'bg-red-600 text-white'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      1 Hour
                    </button>
                    <button
                      type="button"
                      onClick={() => setBanDurationMinutes(1440)}
                      className={`py-1 rounded-lg text-xs font-semibold ${
                        banDurationMinutes === 1440
                          ? 'bg-red-600 text-white'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      24 Hours
                    </button>
                    <button
                      type="button"
                      onClick={() => setBanDurationMinutes(10080)}
                      className={`py-1 rounded-lg text-xs font-semibold ${
                        banDurationMinutes === 10080
                          ? 'bg-red-600 text-white'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      7 Days
                    </button>
                  </div>
                </div>
              )}

              {/* Banned Users List */}
              {isCurrentGroupAdmin && activeGroup.bannedUsers && activeGroup.bannedUsers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider block">
                    Banned Members ({activeGroup.bannedUsers.length})
                  </span>
                  <div className="space-y-1">
                    {activeGroup.bannedUsers.map((b) => {
                      const bannedUser = users.find((u) => u.id === b.userId);
                      return (
                        <div
                          key={b.userId}
                          className="p-2 rounded-xl bg-red-950/20 border border-red-900/30 flex items-center justify-between"
                        >
                          <span className="text-xs text-white">
                            {bannedUser ? bannedUser.name : b.userId}
                          </span>
                          <button
                            onClick={() => unbanGroupMember(activeGroup.id, b.userId)}
                            className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] rounded"
                          >
                            Unban
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Friend to Group Modal */}
      {isAddMemberOpen && activeGroup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Add Friends to {activeGroup.name}</h3>
                <p className="text-xs text-neutral-400">Select from your mutual friends</p>
              </div>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of eligible mutual friends */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {mutualFriends.filter((f) => !activeGroup.members.includes(f.id)).length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-500">
                  All your mutual friends are already in this group.
                </div>
              ) : (
                mutualFriends
                  .filter((f) => !activeGroup.members.includes(f.id))
                  .map((friend) => {
                    const isSelected = selectedFriendIds.includes(friend.id);
                    return (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => {
                          setSelectedFriendIds((prev) =>
                            isSelected ? prev.filter((id) => id !== friend.id) : [...prev, friend.id]
                          );
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={friend.avatar}
                            alt={friend.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div className="text-left">
                            <p className="text-xs font-semibold text-white">{friend.name}</p>
                            <p className="text-[10px] text-neutral-500 font-mono">@{friend.handle}</p>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'border-neutral-700 bg-neutral-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedFriendIds.length === 0}
                onClick={async () => {
                  await addGroupMembers(activeGroup.id, selectedFriendIds);
                  setIsAddMemberOpen(false);
                  setSelectedFriendIds([]);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25"
              >
                Add Selected ({selectedFriendIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
