import React, { useState, useRef, useEffect } from 'react';
import { useSocial } from '../context/SocialContext';
import { TRENDING_SOUNDTRACKS } from '../data/sounds';
import { SoundTrack, ReelTextOverlay, AgeRating } from '../types';
import {
  X,
  Video,
  Camera,
  Music,
  Type,
  Play,
  Pause,
  Upload,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Check,
  Disc,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';

export const CreateReelModal: React.FC = () => {
  const {
    currentUser,
    isCreateReelOpen,
    setIsCreateReelOpen,
    createReel,
    activeSoundForReel,
    setActiveSoundForReel,
  } = useSocial();

  const [mode, setMode] = useState<'upload' | 'record' | 'photo_slide'>('upload');
  const [caption, setCaption] = useState('');
  const [ageRating, setAgeRating] = useState<AgeRating>('all');
  const [warningConfirmed, setWarningConfirmed] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'video' | 'photo'>('video');
  const [duration, setDuration] = useState<number>(15);

  // Sound selection
  const [selectedSound, setSelectedSound] = useState<SoundTrack | null>(activeSoundForReel || TRENDING_SOUNDTRACKS[0]);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const soundAudioRef = useRef<HTMLAudioElement | null>(null);

  // Text Overlays
  const [textOverlays, setTextOverlays] = useState<ReelTextOverlay[]>([]);
  const [newOverlayText, setNewOverlayText] = useState('');
  const [overlayColor, setOverlayColor] = useState('#ffffff');
  const [overlayPos, setOverlayPos] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [showTextTools, setShowTextTools] = useState(false);

  // Camera recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // File input refs
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeSoundForReel) {
      setSelectedSound(activeSoundForReel);
    }
  }, [activeSoundForReel]);

  // Clean up camera stream and audio on modal close
  useEffect(() => {
    if (!isCreateReelOpen) {
      stopCamera();
      if (soundAudioRef.current) {
        soundAudioRef.current.pause();
      }
      setPlayingSoundId(null);
    }
  }, [isCreateReelOpen]);

  if (!isCreateReelOpen) return null;

  // Sound Preview Player
  const toggleSoundPreview = (sound: SoundTrack) => {
    if (playingSoundId === sound.id) {
      soundAudioRef.current?.pause();
      setPlayingSoundId(null);
    } else {
      if (!soundAudioRef.current) {
        soundAudioRef.current = new Audio();
      }
      soundAudioRef.current.src = sound.url;
      soundAudioRef.current.play().catch(() => {});
      setPlayingSoundId(sound.id);
      setSelectedSound(sound);
      soundAudioRef.current.onended = () => setPlayingSoundId(null);
    }
  };

  // Start Camera - Request permissions ONLY WHEN NEEDED
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', aspectRatio: 9 / 16 },
        audio: true,
      });
      setCameraStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      setMode('record');
    } catch (err: any) {
      alert('Camera and microphone permission required to record live reels: ' + (err.message || 'Access denied'));
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  }

  // Recording controls
  const handleStartRecording = () => {
    if (!cameraStream) return;
    recordedChunksRef.current = [];
    const options = { mimeType: 'video/webm;codecs=vp8,opus' };
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(cameraStream, options);
    } catch {
      recorder = new MediaRecorder(cameraStream);
    }

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setMediaUrl(url);
      setMediaType('video');
      stopCamera();
    };

    recorder.start(100);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordSeconds(0);

    recordTimerRef.current = setInterval(() => {
      setRecordSeconds((sec) => {
        if (sec >= 59) {
          handleStopRecording();
          return 60;
        }
        return sec + 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // File Handlers
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaType('video');
    setMode('upload');
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setMediaUrl(event.target.result as string);
        setMediaType('photo');
        setMode('photo_slide');
      }
    };
    reader.readAsDataURL(file);
  };

  // Text Overlay Add
  const handleAddTextOverlay = () => {
    if (!newOverlayText.trim()) return;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: `txt_${Date.now()}`,
        text: newOverlayText.trim(),
        color: overlayColor,
        position: overlayPos,
      },
    ]);
    setNewOverlayText('');
    setShowTextTools(false);
  };

  const handleRemoveOverlay = (id: string) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
  };

  // Final Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl) {
      alert('Please upload or record video or photo content for your reel.');
      return;
    }

    if (ageRating === '18+' && !warningConfirmed) {
      alert('Please acknowledge the 18+ content rating warning.');
      return;
    }

    if (!currentUser) {
      alert('Please log in to create a reel.');
      return;
    }

    createReel({
      authorId: currentUser.id,
      caption: caption.trim(),
      mediaType,
      mediaUrl,
      duration: mediaType === 'photo' ? duration : 30,
      soundTitle: selectedSound?.title,
      soundArtist: selectedSound?.artist,
      soundUrl: selectedSound?.url,
      textOverlays,
      ageRating,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Create 9:16 Reel</h2>
              <p className="text-[11px] text-neutral-400">Short video or photo slideshow with music</p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateReelOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mode Switcher */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setMode('upload');
                videoInputRef.current?.click();
              }}
              className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'upload' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Video</span>
            </button>
            <button
              type="button"
              onClick={startCamera}
              className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'record' ? 'bg-rose-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Record Camera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setMode('photo_slide');
                photoInputRef.current?.click();
              }}
              className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'photo_slide' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photo + Sound</span>
            </button>
          </div>

          <input
            type="file"
            ref={videoInputRef}
            onChange={handleVideoFileChange}
            accept="video/*"
            className="hidden"
          />
          <input
            type="file"
            ref={photoInputRef}
            onChange={handlePhotoFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* 9:16 Reel Preview Frame */}
          <div className="relative mx-auto w-56 aspect-[9/16] rounded-2xl bg-black border border-neutral-800 overflow-hidden shadow-2xl flex items-center justify-center">
            {mode === 'record' && cameraStream ? (
              <div className="relative w-full h-full">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                {isRecording && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-600/90 text-white text-[10px] font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span>REC {recordSeconds}s / 60s</span>
                  </div>
                )}
                <div className="absolute bottom-4 inset-x-0 flex justify-center">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="w-12 h-12 rounded-full border-4 border-white bg-rose-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                    >
                      <span className="w-4 h-4 rounded-full bg-white" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="w-12 h-12 rounded-full border-4 border-white bg-neutral-900 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                    >
                      <span className="w-4 h-4 rounded-sm bg-rose-500" />
                    </button>
                  )}
                </div>
              </div>
            ) : mediaUrl ? (
              <div className="relative w-full h-full group">
                {mediaType === 'video' ? (
                  <video
                    src={mediaUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Reel preview"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Render Text Overlays on Reel */}
                {textOverlays.map((t) => (
                  <div
                    key={t.id}
                    className={`absolute inset-x-3 text-center px-2 py-1 rounded-md text-xs font-bold drop-shadow-md backdrop-blur-[2px] ${
                      t.position === 'top'
                        ? 'top-4'
                        : t.position === 'center'
                        ? 'top-1/2 -translate-y-1/2'
                        : 'bottom-6'
                    }`}
                    style={{ color: t.color, backgroundColor: 'rgba(0,0,0,0.5)' }}
                  >
                    <span>{t.text}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOverlay(t.id)}
                      className="ml-2 text-rose-400 hover:text-white"
                      title="Remove text"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setMediaUrl('');
                    setTextOverlays([]);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                  title="Remove clip"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-4 text-center space-y-2">
                <Video className="w-8 h-8 mx-auto text-neutral-600" />
                <p className="text-[11px] text-neutral-500">Record from camera or upload 9:16 media</p>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-white"
                >
                  Choose Media
                </button>
              </div>
            )}
          </div>

          {/* Photo Slideshow Duration selector */}
          {mediaType === 'photo' && (
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Photo Reel Duration:
                </span>
                <span className="font-bold text-white">{duration} seconds</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          )}

          {/* Music / Sound Selector ("All musics") */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Music className="w-4 h-4 text-pink-400" /> Add Music Track
              </span>
              {selectedSound && (
                <span className="text-[11px] text-pink-400 flex items-center gap-1 truncate max-w-[180px]">
                  <Disc className="w-3 h-3 animate-spin" /> {selectedSound.title}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1">
              {TRENDING_SOUNDTRACKS.map((sound) => {
                const isSelected = selectedSound?.id === sound.id;
                const isPlaying = playingSoundId === sound.id;
                return (
                  <div
                    key={sound.id}
                    onClick={() => setSelectedSound(sound)}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-pink-500/10 border-pink-500/40 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSoundPreview(sound);
                      }}
                      className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-pink-600 flex items-center justify-center text-white shrink-0"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <div className="truncate flex-1">
                      <div className="text-[11px] font-semibold truncate">{sound.title}</div>
                      <div className="text-[10px] text-neutral-400 truncate">{sound.artist}</div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Text on Video Editor */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowTextTools(!showTextTools)}
              className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 hover:text-white"
            >
              <Type className="w-4 h-4 text-emerald-400" />
              <span>Add Text Overlays to Video ({textOverlays.length})</span>
            </button>

            {showTextTools && (
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                <input
                  type="text"
                  value={newOverlayText}
                  onChange={(e) => setNewOverlayText(e.target.value)}
                  placeholder="Enter text to overlay on reel..."
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white"
                />
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400">Position:</span>
                    {(['top', 'center', 'bottom'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setOverlayPos(pos)}
                        className={`px-2 py-0.5 rounded text-[10px] capitalize ${
                          overlayPos === pos ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-neutral-400">Color:</span>
                    <input
                      type="color"
                      value={overlayColor}
                      onChange={(e) => setOverlayColor(e.target.value)}
                      className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddTextOverlay}
                  className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Apply Text Overlay
                </button>
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Caption & Hashtags</label>
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's this reel about? #vibes #nocturne"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-pink-500 resize-none"
            />
          </div>

          {/* Age Rating Warning */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-medium text-neutral-400">Content Age Rating</label>
            <div className="grid grid-cols-3 gap-2">
              {(['all', '13+', '18+'] as const).map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setAgeRating(rating)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    ageRating === rating
                      ? rating === '18+'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {rating === 'all' && 'All Ages'}
                  {rating === '13+' && '13+ Teen'}
                  {rating === '18+' && '18+ Mature'}
                </button>
              ))}
            </div>

            {ageRating === '18+' && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-1">
                  <p className="font-semibold">Mature 18+ Content Warning</p>
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-neutral-300">
                    <input
                      type="checkbox"
                      checked={warningConfirmed}
                      onChange={(e) => setWarningConfirmed(e.target.checked)}
                      className="rounded accent-rose-500"
                    />
                    <span>I confirm this content contains mature themes appropriate only for 18+.</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateReelOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!mediaUrl}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Publish Reel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
