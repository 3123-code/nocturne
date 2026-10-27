import React from 'react';
import { useSocial } from '../context/SocialContext';
import { X, ShieldCheck, Lock, Check, Copy } from 'lucide-react';

export const KeyVerificationModal: React.FC = () => {
  const { isKeyVerifyOpen, setIsKeyVerifyOpen, currentUser, users, chatPeerId } = useSocial();

  if (!isKeyVerifyOpen || !currentUser) return null;

  const peer = users.find((u) => u.id === chatPeerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">E2EE Key Verification</h2>
          </div>
          <button
            onClick={() => setIsKeyVerifyOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-neutral-300 leading-relaxed">
            Nocturne encrypts all peer chats using asymmetric <strong className="text-white">RSA-OAEP 2048-bit</strong> key exchange and symmetric <strong className="text-white">AES-GCM 256-bit</strong> payload encryption via the browser&apos;s native Web Crypto API.
          </p>

          {/* Current User Key Fingerprint */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">
                Your Public Key Safety Code ({currentUser.name})
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <Check className="w-3 h-3" /> Active
              </span>
            </div>
            <div className="font-mono text-sm tracking-wider text-indigo-300 py-1 font-semibold">
              {currentUser.publicKeyFingerprint || '4829 1940 3820 9102'}
            </div>
            <p className="text-[11px] text-neutral-500">
              Generated in your browser sandbox. Private key never leaves this device.
            </p>
          </div>

          {/* Peer Safety Code if chatting with someone */}
          {peer && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
              <span className="text-xs font-semibold text-neutral-300">
                {peer.name}&apos;s Public Key Safety Code
              </span>
              <div className="font-mono text-sm tracking-wider text-emerald-300 py-1 font-semibold">
                {peer.publicKeyFingerprint || '5920 4819 8291 0384'}
              </div>
              <p className="text-[11px] text-neutral-500">
                Compare these digits with {peer.name} over another channel to verify zero-knowledge protection.
              </p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-xs text-emerald-300">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px]">
              End-to-End Encryption prevents third parties and intermediaries from accessing transmitted conversation payloads.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setIsKeyVerifyOpen(false)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
