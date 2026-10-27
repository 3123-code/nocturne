import React from 'react';
import { useSocial } from '../context/SocialContext';
import { VideoPlayer } from './VideoPlayer';
import { X } from 'lucide-react';

export const MediaLightbox: React.FC = () => {
  const { lightboxMedia, setLightboxMedia } = useSocial();

  if (!lightboxMedia) return null;

  return (
    <div
      onClick={() => setLightboxMedia(null)}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
      >
        <button
          onClick={() => setLightboxMedia(null)}
          className="absolute -top-12 right-0 p-2 text-neutral-400 hover:text-white rounded-xl bg-neutral-900/80 transition-colors"
          aria-label="Close fullscreen view"
        >
          <X className="w-5 h-5" />
        </button>

        {lightboxMedia.type === 'photo' ? (
          <img
            src={lightboxMedia.url}
            alt={lightboxMedia.title || 'Fullscreen image'}
            referrerPolicy="no-referrer"
            className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-neutral-800"
          />
        ) : (
          <div className="w-full max-w-4xl">
            <VideoPlayer
              src={lightboxMedia.url}
              title={lightboxMedia.title}
              className="max-h-[80vh] w-full"
            />
          </div>
        )}

        {lightboxMedia.title && (
          <div className="mt-3 text-center text-sm font-medium text-white max-w-lg">
            {lightboxMedia.title}
          </div>
        )}
      </div>
    </div>
  );
};
