import React, { useState, useRef } from 'react';
import { useSocial } from '../context/SocialContext';
import { VideoPlayer } from './VideoPlayer';
import { AgeRating } from '../types';
import {
  X,
  Image,
  Video,
  FileText,
  UploadCloud,
  Sparkles,
  Clock,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

const SAMPLE_MEDIA = {
  photos: [
    { label: 'Neo City Night', url: '/src/assets/images/media_neon_night_1793011142492.jpg' },
    { label: 'Aurora Twilight', url: '/src/assets/images/media_aurora_landscape_1793011142287.jpg' },
  ],
  videos: [
    {
      label: 'Synth Waveform',
      url: 'visualizer:synthwave_night',
    },
    {
      label: 'Ambient Stream',
      url: 'visualizer:ambient_minimal',
    },
  ],
};

export const CreatePostModal: React.FC = () => {
  const { isCreatePostOpen, setIsCreatePostOpen, createPost, currentUser } = useSocial();

  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'text'>('photo');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string>('/src/assets/images/media_neon_night_1793011142492.jpg');
  const [isUploading, setIsUploading] = useState(false);

  // Age rating & Warning requirement
  const [ageRating, setAgeRating] = useState<AgeRating | null>(null);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isCreatePostOpen) return null;

  const isUserUnder18 = (currentUser?.age ?? 18) < 18;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setMediaUrl(event.target.result as string);
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!content.trim() && !title.trim()) {
      setValidationError('Please enter a title or write post content.');
      return;
    }

    // Warning check: User must explicitly choose an age rating
    if (!ageRating) {
      setValidationError('⚠️ Warning: You have not selected an age rating. Please select whether this is All Ages, 13+, or 18+.');
      return;
    }

    if (!warningAcknowledged) {
      setValidationError('⚠️ Please acknowledge the content & age rating warning checkbox before posting.');
      return;
    }

    if (ageRating === '18+' && isUserUnder18) {
      setValidationError('You must be 18 or older to post 18+ content.');
      return;
    }

    createPost({
      title: title.trim() || undefined,
      content: content.trim(),
      mediaType,
      mediaUrl: mediaType !== 'text' ? mediaUrl : undefined,
      ageRating,
    });

    // Reset and close
    setTitle('');
    setContent('');
    setAgeRating(null);
    setWarningAcknowledged(false);
    setValidationError(null);
    setIsCreatePostOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <h2 className="text-base font-bold text-white tracking-tight">Create 24h Post</h2>
          </div>
          <button
            onClick={() => setIsCreatePostOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Post Type Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800/80">
            <button
              type="button"
              onClick={() => {
                setMediaType('photo');
                if (!mediaUrl.startsWith('data:image')) {
                  setMediaUrl(SAMPLE_MEDIA.photos[0].url);
                }
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                mediaType === 'photo'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Image className="w-3.5 h-3.5 text-indigo-400" />
              <span>Photo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMediaType('video');
                if (!mediaUrl.startsWith('data:video')) {
                  setMediaUrl(SAMPLE_MEDIA.videos[0].url);
                }
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                mediaType === 'video'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span>Video</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMediaType('text');
                setMediaUrl('');
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                mediaType === 'text'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Text</span>
            </button>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Title {mediaType !== 'text' && <span className="text-neutral-500 font-normal">(with Title)</span>}
            </label>
            <input
              type="text"
              placeholder={mediaType === 'photo' ? 'e.g., Midnight Tokyo Skylines' : mediaType === 'video' ? 'e.g., Modular Synth Performance' : 'e.g., Thoughts on Digital Ephemerality'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Content Input */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              {mediaType === 'text' ? 'Write Your Post' : 'Caption / Thoughts'}
            </label>
            <textarea
              rows={mediaType === 'text' ? 4 : 2}
              placeholder={mediaType === 'text' ? 'Share your thoughts. This will vanish from the public feed in 24 hours...' : 'Add a caption for your media...'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* Media Upload & Preview */}
          {mediaType !== 'text' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-800 hover:border-indigo-500/60 rounded-xl p-3 text-center cursor-pointer transition-colors bg-neutral-950/40"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <UploadCloud className="w-6 h-6 mx-auto text-neutral-400 mb-1" />
                <p className="text-xs font-medium text-neutral-300">
                  {isUploading ? 'Loading media...' : `Click to choose a ${mediaType} from device`}
                </p>
              </div>

              {/* Media Preview Box */}
              {mediaUrl && (
                <div className="mt-2 rounded-xl overflow-hidden bg-black max-h-48 border border-neutral-800 flex items-center justify-center">
                  {mediaType === 'photo' ? (
                    <img
                      src={mediaUrl}
                      alt="Upload preview"
                      referrerPolicy="no-referrer"
                      className="max-h-48 w-full object-cover"
                    />
                  ) : (
                    <VideoPlayer src={mediaUrl} className="max-h-48 w-full" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* MANDATORY AGE RATING & WARNING SECTION */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Content Age Rating (Required)</span>
              </span>
              {ageRating ? (
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selected: {ageRating}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Not Selected Yet
                </span>
              )}
            </div>

            {/* Age Rating Options */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAgeRating('all')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                  ageRating === 'all'
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                All Ages (10+)
              </button>

              <button
                type="button"
                onClick={() => setAgeRating('13+')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                  ageRating === '13+'
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Teens (13+)
              </button>

              <button
                type="button"
                disabled={isUserUnder18}
                onClick={() => setAgeRating('18+')}
                title={isUserUnder18 ? 'You must be 18+ to select mature rating' : 'Mature 18+'}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                  isUserUnder18
                    ? 'opacity-30 cursor-not-allowed bg-neutral-900 border-neutral-800 text-neutral-500'
                    : ageRating === '18+'
                    ? 'bg-rose-600/30 border-rose-500 text-rose-300 shadow-sm'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Mature (18+)
              </button>
            </div>

            {/* Warning Message Depending on Selection */}
            {!ageRating ? (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p>
                  <strong>Warning:</strong> You must select an age rating before publishing. Choose 18+ if your media contains mature themes.
                </p>
              </div>
            ) : ageRating === '18+' ? (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p>
                  <strong>18+ Warning:</strong> This post will be labeled Mature. Underage users (10–17) will not be shown this content.
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p>
                  <strong>Age Rating Confirmed:</strong> Selected {ageRating}. This post is suitable for audiences {ageRating === 'all' ? '10 and older' : '13 and older'}.
                </p>
              </div>
            )}

            {/* Mandatory Warning Acknowledgment Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={warningAcknowledged}
                onChange={(e) => setWarningAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
              />
              <span className="text-[11px] text-neutral-300 leading-tight">
                I have reviewed the warnings and confirm that this upload adheres to the selected age rating and community standards.
              </span>
            </label>
          </div>

          {/* Ephemeral Notice */}
          <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-start gap-2.5 text-xs text-neutral-400">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-neutral-200">24-Hour Expiration:</strong> Visible for 24 hours. You can archive it anytime to your private local storage vault.
            </p>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setIsCreatePostOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(!title.trim() && !content.trim()) || isUploading || !ageRating || !warningAcknowledged}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Publish 24h Post</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
