import React, { useState, useRef, useEffect } from 'react';
import { useSocial } from '../context/SocialContext';
import { Reel, ReelComment } from '../types';
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Music,
  Plus,
  Disc,
  Send,
  X,
  Sparkles,
  AlertTriangle,
  Play,
} from 'lucide-react';

export const ReelsView: React.FC = () => {
  const {
    reels,
    users,
    currentUser,
    toggleReelLike,
    addReelComment,
    setIsCreateReelOpen,
    setActiveSoundForReel,
    viewProfile,
  } = useSocial();

  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeCommentsReelId, setActiveCommentsReelId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [likedAnimation, setLikedAnimation] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // Active reel
  const currentReel = reels[activeReelIndex];

  // Manage video and audio play/pause on scroll
  useEffect(() => {
    reels.forEach((reel, idx) => {
      const vid = videoRefs.current[reel.id];
      const aud = audioRefs.current[reel.id];

      if (idx === activeReelIndex) {
        if (vid) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
          vid.muted = isMuted;
        }
        if (aud) {
          aud.currentTime = 0;
          aud.play().catch(() => {});
          aud.muted = isMuted;
        }
      } else {
        if (vid) vid.pause();
        if (aud) aud.pause();
      }
    });
  }, [activeReelIndex, reels, isMuted]);

  // Handle scroll snap detection
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const height = target.clientHeight;
    const scrollTop = target.scrollTop;
    const index = Math.round(scrollTop / height);
    if (index !== activeReelIndex && index >= 0 && index < reels.length) {
      setActiveReelIndex(index);
    }
  };

  const handleDoubleTapLike = (reel: Reel) => {
    setLikedAnimation(reel.id);
    toggleReelLike(reel.id);
    setTimeout(() => setLikedAnimation(null), 900);
  };

  const handleUseSound = (reel: Reel) => {
    if (reel.soundUrl || reel.soundTitle) {
      setActiveSoundForReel({
        id: `sound_${Date.now()}`,
        title: reel.soundTitle || 'Original Audio',
        artist: reel.soundArtist || 'Creator Audio',
        duration: 30,
        url: reel.soundUrl || '',
      });
    }
    setIsCreateReelOpen(true);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !activeCommentsReelId) return;
    addReelComment(activeCommentsReelId, commentInput.trim());
    setCommentInput('');
  };

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] p-6 text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-xl shadow-pink-500/10">
          <Disc className="w-10 h-10 animate-spin" />
        </div>
        <div className="max-w-sm space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Nocturne Reels</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Be the first to doomscroll! Record from your camera, upload short 9:16 videos, or create photo reels with music.
          </p>
        </div>
        <button
          onClick={() => setIsCreateReelOpen(true)}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-pink-600/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Upload or Record Reel</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm sm:max-w-md mx-auto h-[82vh] sm:h-[86vh] flex flex-col items-center justify-center">
      {/* Floating Create Reel Button */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          onClick={() => setIsCreateReelOpen(true)}
          className="px-3.5 py-1.5 rounded-full bg-pink-600/90 hover:bg-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/40 backdrop-blur-md transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Reel</span>
        </button>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-neutral-700 transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Snap Scroll Reels Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory rounded-3xl bg-black border border-neutral-800 shadow-2xl relative scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {reels.map((reel, idx) => {
          const author = users.find((u) => u.id === reel.authorId);
          const isLiked = currentUser ? reel.likes.includes(currentUser.id) : false;
          const isActive = idx === activeReelIndex;

          return (
            <div
              key={reel.id}
              className="w-full h-full snap-start relative overflow-hidden flex items-center justify-center bg-black select-none"
              onDoubleClick={() => handleDoubleTapLike(reel)}
            >
              {/* Media Content */}
              {reel.mediaType === 'video' ? (
                <video
                  ref={(el) => {
                    videoRefs.current[reel.id] = el;
                  }}
                  src={reel.mediaUrl}
                  loop
                  playsInline
                  muted={isMuted}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={reel.mediaUrl}
                    alt="Reel photo"
                    className="w-full h-full object-cover"
                  />
                  {/* Background audio for photo slideshow reels */}
                  {reel.soundUrl && (
                    <audio
                      ref={(el) => {
                        audioRefs.current[reel.id] = el;
                      }}
                      src={reel.soundUrl}
                      loop
                      muted={isMuted}
                    />
                  )}
                </div>
              )}

              {/* Text Overlays */}
              {reel.textOverlays?.map((t) => (
                <div
                  key={t.id}
                  className={`absolute inset-x-4 text-center px-3 py-1.5 rounded-lg text-sm font-extrabold drop-shadow-lg backdrop-blur-[2px] pointer-events-none ${
                    t.position === 'top'
                      ? 'top-14'
                      : t.position === 'center'
                      ? 'top-1/2 -translate-y-1/2'
                      : 'bottom-28'
                  }`}
                  style={{ color: t.color, backgroundColor: 'rgba(0,0,0,0.45)' }}
                >
                  {t.text}
                </div>
              ))}

              {/* Animated Double-Tap Heart */}
              {likedAnimation === reel.id && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
                  <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-2xl" />
                </div>
              )}

              {/* Gradient Bottom Overlay */}
              <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

              {/* Bottom Reel Info */}
              <div className="absolute bottom-4 left-4 right-16 space-y-2 z-20 text-white">
                {/* Creator Header */}
                <div className="flex items-center gap-2">
                  <img
                    src={author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                    alt={author?.name}
                    onClick={() => author && viewProfile(author.id)}
                    className="w-9 h-9 rounded-full object-cover border-2 border-pink-500 cursor-pointer shadow"
                  />
                  <div className="truncate">
                    <span
                      onClick={() => author && viewProfile(author.id)}
                      className="font-bold text-xs hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      {author?.name || 'Nocturne Creator'}
                      <span className="text-[10px] text-neutral-400 font-normal">@{author?.handle}</span>
                    </span>
                    {reel.ageRating && reel.ageRating !== 'all' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/80 text-white ml-1">
                        {reel.ageRating}
                      </span>
                    )}
                  </div>
                </div>

                {/* Caption */}
                {reel.caption && (
                  <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed drop-shadow">
                    {reel.caption}
                  </p>
                )}

                {/* Sound Ticker & "Use Sound" Button */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-pink-300 bg-black/40 px-2.5 py-1 rounded-full border border-pink-500/20 backdrop-blur-sm max-w-[200px] truncate">
                    <Music className="w-3 h-3 text-pink-400 shrink-0" />
                    <span className="truncate">{reel.soundTitle || 'Original Audio - Nocturne'}</span>
                  </div>
                  <button
                    onClick={() => handleUseSound(reel)}
                    className="text-[10px] font-bold px-2 py-1 rounded-full bg-neutral-800/90 hover:bg-pink-600 text-white border border-neutral-700 transition-colors shrink-0 flex items-center gap-1"
                  >
                    <Disc className="w-2.5 h-2.5" />
                    <span>Use Sound</span>
                  </button>
                </div>
              </div>

              {/* Right Side Action Bar */}
              <div className="absolute right-3 bottom-14 flex flex-col items-center gap-4 z-20">
                {/* Like Button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => toggleReelLike(reel.id)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
                      isLiked
                        ? 'bg-rose-500/20 border-rose-500 text-rose-500'
                        : 'bg-black/60 border-neutral-700 text-white hover:text-rose-400'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500' : ''}`} />
                  </button>
                  <span className="text-[11px] font-bold text-white mt-1 drop-shadow">
                    {reel.likes.length}
                  </span>
                </div>

                {/* Comments Button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setActiveCommentsReelId(reel.id)}
                    className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 border border-neutral-700 text-white flex items-center justify-center backdrop-blur-md transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  <span className="text-[11px] font-bold text-white mt-1 drop-shadow">
                    {reel.comments.length}
                  </span>
                </div>

                {/* Share Button */}
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    alert('Reel link copied to clipboard!');
                  }}
                  className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 border border-neutral-700 text-white flex items-center justify-center backdrop-blur-md transition-colors"
                  title="Share Reel"
                >
                  <Share2 className="w-5 h-5" />
                </button>

                {/* Spinning Music Vinyl Disc */}
                <div
                  onClick={() => handleUseSound(reel)}
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-600 p-0.5 border border-pink-400/40 shadow-lg cursor-pointer animate-spin"
                  style={{ animationDuration: '4s' }}
                  title="Use this audio"
                >
                  <img
                    src={author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                    alt="Audio disc"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reel Comments Drawer */}
      {activeCommentsReelId && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md rounded-3xl flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-pink-400" />
              <span>Comments ({reels.find((r) => r.id === activeCommentsReelId)?.comments.length || 0})</span>
            </span>
            <button
              onClick={() => setActiveCommentsReelId(null)}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {reels.find((r) => r.id === activeCommentsReelId)?.comments.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No comments yet. Say something nice!
              </div>
            ) : (
              reels
                .find((r) => r.id === activeCommentsReelId)
                ?.comments.map((comm) => {
                  const commAuthor = users.find((u) => u.id === comm.authorId);
                  return (
                    <div key={comm.id} className="flex items-start gap-2 text-xs">
                      <img
                        src={commAuthor?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}
                        alt={commAuthor?.name}
                        className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1 bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-white text-[11px]">
                            {commAuthor?.name || 'User'}
                          </span>
                          <span className="text-[10px] text-neutral-500">Just now</span>
                        </div>
                        <p className="text-neutral-200 text-xs">{comm.content}</p>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Comment Form */}
          <form onSubmit={handlePostComment} className="p-3 border-t border-neutral-800 flex items-center gap-2 bg-neutral-950">
            <input
              type="text"
              required
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Add a comment to this reel..."
              className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
