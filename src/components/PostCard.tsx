import React, { useState, useEffect } from 'react';
import { Post, Comment } from '../types';
import { useSocial } from '../context/SocialContext';
import { formatTimeRemaining, formatRelativeTime } from '../utils/format';
import { VideoPlayer } from './VideoPlayer';
import {
  Clock,
  Archive,
  MessageCircle,
  Share2,
  Lock,
  Maximize2,
  Send,
  Eye,
} from 'lucide-react';

const AVAILABLE_REACTIONS = ['❤️', '🔥', '👏', '💡', '😂', '😮'];

interface PostCardProps {
  post: Post;
  isVaultView?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ post, isVaultView = false }) => {
  const {
    currentUser,
    users,
    viewProfile,
    toggleReaction,
    addComment,
    toggleCommentReaction,
    saveToVault,
    setLightboxMedia,
    setIsAuthOpen,
    setAuthMode,
  } = useSocial();

  const author = users.find((u) => u.id === post.authorId) || {
    id: post.authorId,
    name: 'Unknown User',
    handle: 'unknown',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    bio: '',
    location: '',
    joinedDate: '',
    friends: [],
  };

  // Ephemeral countdown state
  const [timeInfo, setTimeInfo] = useState(() => formatTimeRemaining(post.expiresAt));
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [revealedMature, setRevealedMature] = useState(false);

  // Refresh countdown every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeInfo(formatTimeRemaining(post.expiresAt));
    }, 15000);
    return () => clearInterval(timer);
  }, [post.expiresAt]);

  const isAuthor = currentUser ? currentUser.id === post.authorId : false;
  const isSavedInVault = post.isSavedToVault;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(post.id, commentText.trim());
    setCommentText('');
    setShowComments(true);
  };

  return (
    <article className="rounded-2xl bg-neutral-900/80 border border-neutral-800/80 overflow-hidden shadow-sm hover:border-neutral-700/80 transition-all duration-200">
      {/* Header: Author & 24h Countdown */}
      <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
        <button
          onClick={() => viewProfile(author.id)}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <img
            src={author.avatar}
            alt={author.name}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-neutral-800 group-hover:ring-indigo-500 transition-all"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                {author.name}
              </span>
              <span className="text-xs text-neutral-500 font-mono">@{author.handle}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span>{author.location || 'Global'}</span>
              <span aria-hidden="true">·</span>
              <span>{formatRelativeTime(post.createdAt)}</span>
            </div>
          </div>
        </button>

        {/* Ephemeral Expiration Status & Age Rating */}
        <div className="flex items-center gap-2">
          {post.ageRating && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-tight ${
                post.ageRating === '18+'
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  : post.ageRating === '13+'
                  ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
                  : 'bg-neutral-800 border border-neutral-700 text-neutral-400'
              }`}
            >
              {post.ageRating === '18+' ? '18+ Mature' : post.ageRating === '13+' ? '13+ Teens' : '10+'}
            </span>
          )}

          {isSavedInVault ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
              <Archive className="w-3.5 h-3.5" />
              <span>Private Vault</span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md border ${
                timeInfo.isUrgent
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300'
              }`}
              title="This public post will automatically vanish after 24 hours"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{timeInfo.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Post Title & Content */}
      <div className="px-4 sm:px-5 pb-3">
        {post.title && (
          <h3 className="text-base sm:text-lg font-bold text-white mb-2 tracking-tight">
            {post.title}
          </h3>
        )}
        <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-line">
          {post.content}
        </p>
      </div>

      {/* Mature 18+ Warning Gate */}
      {post.ageRating === '18+' && !isAuthor && !revealedMature && post.mediaUrl ? (
        <div className="mx-4 sm:mx-5 p-6 rounded-xl bg-rose-950/20 border border-rose-900/40 text-center space-y-2">
          <div className="text-2xl">🔞</div>
          <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
            18+ Mature Content Warning
          </h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            This post was marked 18+ by the author. You must be 18 years or older to view this media.
          </p>
          <button
            type="button"
            onClick={() => setRevealedMature(true)}
            className="px-4 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500 text-rose-200 text-xs font-semibold rounded-lg transition-colors"
          >
            I am 18+ · Reveal Media
          </button>
        </div>
      ) : (
        <>
          {/* Media Slot: Photo or Video */}
          {post.mediaType === 'photo' && post.mediaUrl && (
            <div
              onClick={() =>
                setLightboxMedia({
                  url: post.mediaUrl!,
                  title: post.title,
                  type: 'photo',
                })
              }
              className="relative mt-2 mx-4 sm:mx-5 rounded-xl overflow-hidden bg-neutral-950 cursor-zoom-in group max-h-[500px]"
            >
              <img
                src={post.mediaUrl}
                alt={post.title || 'Post image'}
                referrerPolicy="no-referrer"
                className="w-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                <span className="text-xs text-white/90">Click to expand</span>
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </div>
          )}

          {post.mediaType === 'video' && post.mediaUrl && (
            <div className="mt-2 mx-4 sm:mx-5">
              <VideoPlayer
                src={post.mediaUrl}
                title={post.title}
                onExpand={() =>
                  setLightboxMedia({
                    url: post.mediaUrl!,
                    title: post.title,
                    type: 'video',
                  })
                }
              />
            </div>
          )}
        </>
      )}

      {/* Expiry / Vault Notice Bar */}
      <div className="mt-4 px-4 sm:px-5 py-2.5 bg-neutral-950/50 border-t border-b border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            {isSavedInVault
              ? 'Stored permanently in private local vault.'
              : 'Public post vanishes after 24h. Save to keep it private.'}
          </span>
        </div>

        {/* Save to Local Vault Action Button */}
        {isAuthor && !isSavedInVault && (
          <button
            onClick={() => saveToVault(post.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-colors"
            title="Saves this post to your local storage indefinitely as private"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Save to Private Vault</span>
          </button>
        )}
      </div>

      {/* Interaction Actions Bar */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        {/* Reactions Summary & Reaction Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {AVAILABLE_REACTIONS.map((emoji) => {
            const reactors = post.reactions[emoji] || [];
            const hasReacted = currentUser ? reactors.includes(currentUser.id) : false;
            const count = reactors.length;

            return (
              <button
                key={emoji}
                onClick={() => toggleReaction(post.id, emoji)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all duration-150 ${
                  hasReacted
                    ? 'bg-indigo-600/30 border border-indigo-500 text-white shadow-sm'
                    : 'bg-neutral-800/60 border border-neutral-700/60 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                }`}
                title={
                  reactors.length > 0
                    ? `Reacted: ${reactors
                        .map((id) => users.find((u) => u.id === id)?.name || id)
                        .join(', ')}`
                    : `React with ${emoji}`
                }
              >
                <span>{emoji}</span>
                {count > 0 && <span className="tabular-nums font-semibold">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Comments Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showComments
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Comments ({post.comments.length})</span>
          </button>
        </div>
      </div>

      {/* Expandable Comments Drawer */}
      {showComments && (
        <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-neutral-800/80 bg-neutral-950/40 space-y-4 animate-in fade-in duration-200">
          {/* New Comment Input Form or Guest Sign In prompt */}
          {currentUser ? (
            <form onSubmit={handleCommentSubmit} className="flex gap-2.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-neutral-700"
              />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-neutral-900 border border-neutral-750 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-3 py-2 bg-indigo-600 disabled:opacity-40 text-white rounded-xl hover:bg-indigo-500 transition-colors text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reply</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between gap-3">
              <p className="text-xs text-neutral-400">Log in or create an account to join the conversation.</p>
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors"
              >
                Sign In / Register
              </button>
            </div>
          )}

          {/* Comment Thread List */}
          {post.comments.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-2">
              No comments yet. Start the conversation!
            </p>
          ) : (
            <div className="space-y-3 pt-2">
              {post.comments.map((comment) => {
                const commentAuthor = users.find((u) => u.id === comment.authorId) || {
                  id: comment.authorId,
                  name: 'User',
                  handle: 'user',
                  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
                  bio: '',
                  location: '',
                  joinedDate: '',
                  friends: [],
                };

                return (
                  <div
                    key={comment.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/60"
                  >
                    <button
                      onClick={() => viewProfile(commentAuthor.id)}
                      className="shrink-0 focus:outline-none"
                    >
                      <img
                        src={commentAuthor.avatar}
                        alt={commentAuthor.name}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewProfile(commentAuthor.id)}
                            className="text-xs font-semibold text-neutral-200 hover:text-indigo-400 transition-colors"
                          >
                            {commentAuthor.name}
                          </button>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            @{commentAuthor.handle}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-500">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                        {comment.content}
                      </p>

                      {/* Comment Reaction Emojis */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {['❤️', '🔥', '👏'].map((emoji) => {
                          const reactors = comment.reactions[emoji] || [];
                          const hasReacted = currentUser ? reactors.includes(currentUser.id) : false;
                          return (
                            <button
                              key={emoji}
                              onClick={() => toggleCommentReaction(post.id, comment.id, emoji)}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                hasReacted
                                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
                              }`}
                            >
                              <span>{emoji}</span>
                              {reactors.length > 0 && <span>{reactors.length}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
};
