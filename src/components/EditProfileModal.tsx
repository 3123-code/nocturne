import React, { useState, useRef } from 'react';
import { useSocial } from '../context/SocialContext';
import { X, UploadCloud, MapPin, User, FileText, Check } from 'lucide-react';

const PRESET_AVATARS = [
  { label: 'Creative Dark', url: '/src/assets/images/avatar_alex_1793011140169.jpg' },
  { label: 'Architect Dark', url: '/src/assets/images/avatar_maya_1793011140803.jpg' },
  { label: 'Producer Dark', url: '/src/assets/images/avatar_jordan_1793011140742.jpg' },
  { label: 'Minimal Portrait', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
];

export const EditProfileModal: React.FC = () => {
  const { currentUser, isEditProfileOpen, setIsEditProfileOpen, updateProfile } = useSocial();

  const [name, setName] = useState(currentUser?.name || '');
  const [handle, setHandle] = useState(currentUser?.handle || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if currentUser changes
  React.useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setHandle(currentUser.handle);
      setBio(currentUser.bio || '');
      setLocation(currentUser.location || '');
      setAvatar(currentUser.avatar);
    }
  }, [currentUser, isEditProfileOpen]);

  if (!isEditProfileOpen || !currentUser) return null;

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatar(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim(),
      handle: handle.trim().replace(/^@/, ''),
      bio: bio.trim(),
      location: location.trim(),
      avatar,
    });
    setIsEditProfileOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Edit Profile</h2>
          </div>
          <button
            onClick={() => setIsEditProfileOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
          {/* Avatar Section */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-2">
              Profile Avatar
            </label>
            <div className="flex items-center gap-4">
              <img
                src={avatar}
                alt="Avatar preview"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500 bg-neutral-800"
              />
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Upload from Device</span>
                </button>
                <p className="text-[11px] text-neutral-500 mt-1">
                  JPG, PNG or WebP. Saved in your local browser profile.
                </p>
              </div>
            </div>

            {/* Presets */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[11px] text-neutral-500">Or choose:</span>
              <div className="flex gap-2">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setAvatar(preset.url)}
                    className={`w-7 h-7 rounded-full overflow-hidden ring-2 transition-all ${
                      avatar === preset.url ? 'ring-indigo-500 scale-105' : 'ring-neutral-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.url} alt={preset.label} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Name & Handle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-neutral-500 font-mono">@</span>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Profile Location */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Profile Location
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
              <input
                type="text"
                placeholder="e.g., Tokyo, Japan or Berlin, Germany"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Profile Description (Bio) */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Profile Description (Bio)
            </label>
            <textarea
              rows={3}
              placeholder="Tell people about yourself, your creative focus, or why you prefer ephemeral spaces..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
