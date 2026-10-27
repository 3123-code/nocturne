import React, { useState, useRef, useEffect } from 'react';
import { useSocial } from '../context/SocialContext';
import { CloudSyncService } from '../services/cloudSync';
import {
  validateAgeRequirement,
  sendOtpEmail,
  generateOTP,
  fetchSmtpStatus,
  configureSmtpServer,
  sendTestEmailToMailbox,
  SmtpStatusResponse,
} from '../utils/auth';
import {
  Lock,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  User as UserIcon,
  UploadCloud,
  MapPin,
  FileText,
  ShieldCheck,
  Sparkles,
  Settings,
  ExternalLink,
  RefreshCw,
  Send,
  Check,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    currentUser,
    login,
    register,
    resetPassword,
    isAuthOpen,
    setIsAuthOpen,
    authMode,
    setAuthMode,
  } = useSocial();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Profile setup states (can be skipped)
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileLocation, setProfileLocation] = useState('');

  // UI & Error states
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [dispatchedOtpCode, setDispatchedOtpCode] = useState<string | null>(null);
  const [isRealMailDelivered, setIsRealMailDelivered] = useState(false);

  // SMTP Settings Panel states
  const [showSmtpSettings, setShowSmtpSettings] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatusResponse>({ isConfigured: false });
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpIsSubmitting, setSmtpIsSubmitting] = useState(false);
  const [smtpNotice, setSmtpNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testEmailSending, setTestEmailSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check SMTP connection status on mount
  useEffect(() => {
    fetchSmtpStatus().then((status) => {
      setSmtpStatus(status);
      if (status.user && !smtpUser) {
        setSmtpUser(status.user);
      }
    });
  }, []);

  if (!isAuthOpen && currentUser) return null;

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProfileAvatar(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Configure SMTP handler
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpNotice(null);
    setSmtpIsSubmitting(true);

    const res = await configureSmtpServer({
      host: smtpHost,
      port: parseInt(smtpPort, 10) || 587,
      secure: smtpPort === '465',
      user: smtpUser,
      pass: smtpPass,
    });

    setSmtpIsSubmitting(false);

    if (res.success) {
      setSmtpNotice({ type: 'success', text: res.message || 'SMTP connected successfully!' });
      const updatedStatus = await fetchSmtpStatus();
      setSmtpStatus(updatedStatus);
    } else {
      setSmtpNotice({ type: 'error', text: res.error || 'Connection failed' });
    }
  };

  // Test email delivery to user's real mailbox
  const handleSendTestEmail = async () => {
    const target = email.trim() || smtpUser.trim();
    if (!target) {
      setSmtpNotice({ type: 'error', text: 'Enter an email address above to test delivery.' });
      return;
    }

    setTestEmailSending(true);
    setSmtpNotice(null);

    const res = await sendTestEmailToMailbox(target);
    setTestEmailSending(false);

    if (res.success) {
      setSmtpNotice({ type: 'success', text: res.message || `Test email dispatched to ${target}!` });
    } else {
      setSmtpNotice({ type: 'error', text: res.error || 'Failed to deliver test email.' });
    }
  };

  // Step 1: Initiate Registration & Send Real OTP
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsRealMailDelivered(false);

    // Validate email
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    // Password validation: minimum 8 characters
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    // Birth date & age validation: must be 10+ years old
    const ageCheck = validateAgeRequirement(birthDate);
    if (!ageCheck.isValid) {
      setError(ageCheck.error || 'You must be at least 10 years old.');
      return;
    }

    // Check if user already exists (local storage + cloud)
    const users = JSON.parse(localStorage.getItem('nocturne_users_v3') || '[]');
    let existing = users.find(
      (u: any) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );
    if (!existing) {
      existing = await CloudSyncService.getUserByEmailFromCloud(email.trim());
    }
    if (existing) {
      setError('User already exists!');
      return;
    }

    setIsSubmitting(true);
    const code = generateOTP();
    setGeneratedOtp(code);

    const mailResult = await sendOtpEmail(email.trim(), code, 'register');
    setIsSubmitting(false);

    setIsRealMailDelivered(Boolean(mailResult.isRealMailboxDelivered));
    if (mailResult.previewUrl) {
      setEmailPreviewUrl(mailResult.previewUrl);
    }
    if (mailResult.deliveredOtp) {
      setDispatchedOtpCode(mailResult.deliveredOtp);
    }

    if (mailResult.isRealMailboxDelivered) {
      setSuccessMsg(`Verification code delivered directly to your mailbox (${email.trim()}). Please check your Inbox and Spam.`);
    } else {
      setSuccessMsg(`Verification code generated for ${email.trim()}.`);
    }

    setAuthMode('otp_verify');
  };

  // Step 2: Verify Registration OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpInput.trim() !== generatedOtp.trim()) {
      setError('Incorrect verification code. Please check your email and try again.');
      return;
    }

    // Default handle and name
    const defaultHandle = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    setProfileName(defaultHandle);

    // Move to optional profile setup
    setAuthMode('profile_setup');
  };

  // Step 3: Complete Registration & Profile Details
  const handleCompleteRegistration = async (skipDetails = false) => {
    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        email: email.trim(),
        password,
        birthDate,
        name: skipDetails ? undefined : profileName.trim(),
        avatar: skipDetails ? undefined : profileAvatar,
        bio: skipDetails ? undefined : profileBio.trim(),
        location: skipDetails ? undefined : profileLocation.trim(),
      });

      setIsSubmitting(false);
      setIsAuthOpen(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Registration failed');
    }
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      setIsSubmitting(false);
      setIsAuthOpen(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Invalid email or password.');
    }
  };

  // Forgot password: Send OTP
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsRealMailDelivered(false);

    const users = JSON.parse(localStorage.getItem('nocturne_users_v3') || '[]');
    let existing = users.find(
      (u: any) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (!existing) {
      existing = await CloudSyncService.getUserByEmailFromCloud(email.trim());
    }

    if (!existing) {
      setError('No registered account found with this email.');
      return;
    }

    setIsSubmitting(true);
    const code = generateOTP();
    setGeneratedOtp(code);

    const mailResult = await sendOtpEmail(email.trim(), code, 'forgot_password');
    setIsSubmitting(false);

    setIsRealMailDelivered(Boolean(mailResult.isRealMailboxDelivered));
    if (mailResult.previewUrl) {
      setEmailPreviewUrl(mailResult.previewUrl);
    }
    if (mailResult.deliveredOtp) {
      setDispatchedOtpCode(mailResult.deliveredOtp);
    }

    if (mailResult.isRealMailboxDelivered) {
      setSuccessMsg(`Password reset code delivered to ${email.trim()}. Please check your mailbox.`);
    } else {
      setSuccessMsg(`Password reset code generated for ${email.trim()}.`);
    }

    setAuthMode('reset_otp');
  };

  // Reset password: Verify OTP and save new password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpInput.trim() !== generatedOtp.trim()) {
      setError('Incorrect verification code.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email.trim(), newPassword);
      setIsSubmitting(false);
      setSuccessMsg('Password updated successfully! Please log in.');
      setAuthMode('login');
      setPassword('');
      setOtpInput('');
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/60 text-center relative">
          <div className="flex items-center justify-between mb-2">
            <div className="w-16" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            {/* SMTP Status Toggle Badge */}
            <button
              type="button"
              onClick={() => setShowSmtpSettings(!showSmtpSettings)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                smtpStatus.isConfigured
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              }`}
              title="Configure real mailbox delivery (Gmail / SMTP)"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  smtpStatus.isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>{smtpStatus.isConfigured ? 'Mailbox Live' : 'Setup Mailbox'}</span>
              <Settings className="w-3 h-3 opacity-70" />
            </button>
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight">
            {authMode === 'login' && 'Welcome Back to Nocturne'}
            {authMode === 'register' && 'Create Your Nocturne Account'}
            {authMode === 'otp_verify' && 'Verify Your Email'}
            {authMode === 'profile_setup' && 'Set Up Your Profile'}
            {authMode === 'forgot_password' && 'Reset Your Password'}
            {authMode === 'reset_otp' && 'Enter Verification Code'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {authMode === 'login' && 'Log in with your email and password'}
            {authMode === 'register' && 'Must be 10+ years old. Password min 8 chars.'}
            {authMode === 'otp_verify' && `Enter the 6-digit code for ${email}`}
            {authMode === 'profile_setup' && 'Avatar, bio, and location can be skipped'}
            {authMode === 'forgot_password' && 'We will send a real OTP to your email'}
            {authMode === 'reset_otp' && 'Verify code and set a new password'}
          </p>
        </div>

        {/* Real Mailbox / SMTP Configuration Drawer */}
        {showSmtpSettings && (
          <div className="mx-4 mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-700/80 shadow-lg text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="font-semibold text-white flex items-center gap-1.5 text-sm">
                <Mail className="w-4 h-4 text-indigo-400" /> Real Mailbox Delivery Setup
              </span>
              <button
                type="button"
                onClick={() => setShowSmtpSettings(false)}
                className="text-neutral-400 hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-neutral-400 text-[11px] leading-relaxed">
              To deliver OTP verification emails directly to your real Gmail or mailbox (e.g.{' '}
              <span className="text-white font-mono">rumpabhowmik1992@gmail.com</span>), connect your SMTP credentials:
            </p>

            {smtpNotice && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  smtpNotice.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {smtpNotice.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                )}
                <span>{smtpNotice.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveSmtp} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-0.5">SMTP Host</label>
                  <input
                    type="text"
                    required
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-0.5">Port</label>
                  <input
                    type="text"
                    required
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-0.5">
                  Email Address / Username
                </label>
                <input
                  type="email"
                  required
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] text-neutral-400">
                    Google App Password (16 chars)
                  </label>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Create App Password</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Tip: Google requires a 16-character App Password (not regular password) if 2-Step Verification is active.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={smtpIsSubmitting}
                  className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                >
                  {smtpIsSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{smtpIsSubmitting ? 'Verifying...' : 'Connect SMTP'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testEmailSending}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1.5"
                >
                  {testEmailSending ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  <span>Send Test Email</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}



        <div className="p-6">
          {/* MODE 1: LOGIN */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-400">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setAuthMode('forgot_password');
                    }}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="password"
                    required
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Logging in...' : 'Log In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-xs text-neutral-400">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setAuthMode('register');
                  }}
                  className="text-indigo-400 hover:underline font-semibold"
                >
                  Create an Account
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: REGISTER */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Password <span className="text-neutral-500">(minimum 8 characters)</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="8+ characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {password.length > 0 && password.length < 8 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    {8 - password.length} more characters needed
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Birth Date <span className="text-indigo-400 font-semibold">(Must be 10+ years old)</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || password.length < 8 || !birthDate}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Sending Verification Code...' : 'Send Verification OTP'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-xs text-neutral-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setAuthMode('login');
                  }}
                  className="text-indigo-400 hover:underline font-semibold"
                >
                  Log In
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: OTP VERIFICATION */}
          {authMode === 'otp_verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <p className="text-xs text-neutral-400">
                  Please enter the 6-digit OTP code sent to:
                </p>
                <p className="text-sm font-semibold text-white font-mono">{email}</p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[10px] font-mono text-2xl py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={otpInput.length < 6}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
              >
                Verify Code & Continue
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const code = generateOTP();
                    setGeneratedOtp(code);
                    await sendOtpEmail(email, code, 'register');
                    setSuccessMsg('A new verification code was sent.');
                  }}
                  className="text-indigo-400 hover:underline"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {/* MODE 4: OPTIONAL PROFILE SETUP (Can be skipped) */}
          {authMode === 'profile_setup' && (
            <div className="space-y-4">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-400">
                You can add your details now, or skip and set them up later anytime.
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Avatar (can be skipped) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-400">
                    Profile Avatar
                  </label>
                  <span className="text-[11px] text-neutral-500 font-mono">(Can be skipped)</span>
                </div>
                <div className="flex items-center gap-3">
                  {profileAvatar ? (
                    <img
                      src={profileAvatar}
                      alt="Avatar"
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400">
                      <UserIcon className="w-6 h-6" />
                    </div>
                  )}
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Choose Avatar Image</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Description (can be skipped) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-400">
                    Profile Description (Bio)
                  </label>
                  <span className="text-[11px] text-neutral-500 font-mono">(Can be skipped)</span>
                </div>
                <textarea
                  rows={2}
                  placeholder="Tell people about yourself..."
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Location (can be skipped) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-400">
                    Profile Location
                  </label>
                  <span className="text-[11px] text-neutral-500 font-mono">(Can be skipped)</span>
                </div>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="e.g., Tokyo, Japan or London, UK"
                    value={profileLocation}
                    onChange={(e) => setProfileLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Buttons: Save vs Skip */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleCompleteRegistration(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  Skip for Now
                </button>
                <button
                  type="button"
                  onClick={() => handleCompleteRegistration(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Complete & Enter'}</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 5: FORGOT PASSWORD */}
          {authMode === 'forgot_password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Your Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
              >
                {isSubmitting ? 'Sending Code...' : 'Send Verification OTP'}
              </button>

              <div className="pt-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setAuthMode('login');
                  }}
                  className="text-neutral-400 hover:text-white"
                >
                  Back to Log In
                </button>
              </div>
            </form>
          )}

          {/* MODE 6: RESET PASSWORD OTP */}
          {authMode === 'reset_otp' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Verification Code (OTP)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-digit code"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[6px] font-mono text-lg py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  New Password <span className="text-neutral-500">(minimum 8 characters)</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="8+ characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otpInput.length < 6 || newPassword.length < 8}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
              >
                {isSubmitting ? 'Resetting Password...' : 'Reset Password & Log In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
