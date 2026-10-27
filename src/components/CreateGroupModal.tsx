import React, { useState, useRef } from 'react';
import { useSocial } from '../context/SocialContext';
import { Users, X, Upload, Shield, Check, AlertCircle } from 'lucide-react';

export const CreateGroupModal: React.FC = () => {
  const {
    isCreateGroupOpen,
    setIsCreateGroupOpen,
    createGroup,
    currentUser,
    users,
  } = useSocial();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isCreateGroupOpen || !currentUser) return null;

  // The creator can ONLY add from accepted mutual friends
  const friendUsers = users.filter((u) => currentUser.friends.includes(u.id));

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setIcon(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a group name.');
      return;
    }

    try {
      createGroup({
        name: name.trim(),
        description: description.trim(),
        icon: icon || undefined,
        initialMembers: selectedFriends,
      });
      setIsCreateGroupOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Create Group Chat</h2>
              <p className="text-[11px] text-neutral-400">Add friends & manage group members</p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateGroupOpen(false)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Group Icon & Name */}
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <img
                src={icon || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80'}
                alt="Group icon"
                className="w-16 h-16 rounded-2xl object-cover border border-neutral-700 shadow"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleIconChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="block text-xs font-medium text-neutral-400">Group Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nocturne Insiders"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Add Members (ONLY from user's friends list) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Invite Friends ({selectedFriends.length} selected)</span>
              </label>
              <span className="text-[10px] text-neutral-500">Only mutual friends allowed</span>
            </div>

            {friendUsers.length === 0 ? (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-400">
                You don&apos;t have any accepted friends yet. Send friend requests first to invite members to your group!
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
                {friendUsers.map((friend) => {
                  const isSelected = selectedFriends.includes(friend.id);
                  return (
                    <div
                      key={friend.id}
                      onClick={() => toggleFriendSelection(friend.id)}
                      className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-600/20 border border-indigo-500/40 text-white' : 'hover:bg-neutral-900 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div className="truncate text-xs">
                          <span className="font-semibold">{friend.name}</span>
                          <span className="text-neutral-500 text-[10px] ml-1.5">@{friend.handle}</span>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                          isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-neutral-700 bg-neutral-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Create Group</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
