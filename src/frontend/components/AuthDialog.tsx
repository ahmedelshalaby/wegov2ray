import React, { useEffect, useState } from 'react';
import { X, Loader2, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export interface AuthUser { id: string; email: string; role: 'user' | 'admin' }
interface AuthDialogProps { open: boolean; initialMode?: 'login'|'register'; onClose: () => void; onAuthenticated: (user: AuthUser) => void; }

type Mode = 'login'|'register'|'forgot'|'reset'|'verify'|'resend';

const COPY = {
  ar: {
    close: 'إغلاق',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    newPassword: 'كلمة المرور الجديدة',
    passwordHint: '12 أحرف على الأقل',
    invalidLink: 'رابط التحقق غير صالح أو منتهي.',
    titles: { login: 'تسجيل الدخول', register: 'إنشاء حساب', forgot: 'استعادة كلمة المرور', resend: 'إعادة إرسال التحقق', reset: 'تعيين كلمة مرور جديدة', verify: 'تأكيد البريد الإلكتروني' },
    actions: { login: 'تسجيل الدخول', register: 'إنشاء الحساب', forgot: 'إرسال رابط الاستعادة', resend: 'إرسال رابط التحقق', reset: 'حفظ كلمة المرور', verify: 'جارٍ التحقق' },
    createAccount: 'إنشاء حساب',
    forgotPassword: 'نسيت كلمة المرور؟',
    resendVerification: 'إعادة إرسال رابط التحقق',
    backToLogin: 'العودة لتسجيل الدخول',
    note: 'لن تُخزّن كلمة المرور بصيغة مكشوفة. رابط التحقق والاستعادة صالح لمدة ساعة.',
  },
  en: {
    close: 'Close',
    email: 'Email address',
    password: 'Password',
    newPassword: 'New password',
    passwordHint: 'At least 12 characters',
    invalidLink: 'This verification link is invalid or has expired.',
    titles: { login: 'Sign in', register: 'Create an account', forgot: 'Reset your password', resend: 'Resend verification', reset: 'Set a new password', verify: 'Verify your email' },
    actions: { login: 'Sign in', register: 'Create account', forgot: 'Send reset link', resend: 'Send verification link', reset: 'Save password', verify: 'Verifying' },
    createAccount: 'Create an account',
    forgotPassword: 'Forgot your password?',
    resendVerification: 'Resend verification link',
    backToLogin: 'Back to sign in',
    note: 'Your password is never stored in plain text. Verification and reset links stay valid for one hour.',
  },
} as const;

export const AuthDialog: React.FC<AuthDialogProps> = ({ open, initialMode = 'login', onClose, onAuthenticated }) => {
  const { language } = useLanguage();
  const copy = COPY[language];
  const isAr = language === 'ar';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const legacyParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const token = searchParams.get('verify-email') || searchParams.get('reset-password') || searchParams.get('token') || legacyParams.get('token') || '';
  useEffect(() => {
    if (!open) return;
    setMode(initialMode); setMessage(''); setError('');
    if (searchParams.has('verify-email') || window.location.hash.startsWith('#verify-email')) setMode('verify');
    if (searchParams.has('reset-password') || window.location.hash.startsWith('#reset-password')) setMode('reset');
  }, [open, initialMode]);
  useEffect(() => {
    if (open && mode === 'verify' && token) void submitToken('verify');
  }, [open, mode]);
  if (!open) return null;

  const submitToken = async (kind: 'verify') => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      const data: any = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || copy.invalidLink);
      setMessage(data.message || '');
      setMode('login');
      history.replaceState(history.state, '', window.location.pathname);
    } catch (e) { setError(e instanceof Error ? e.message : copy.invalidLink); }
    finally { setBusy(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      const endpoint = mode === 'register' ? 'register' : mode === 'forgot' ? 'forgot-password' : mode === 'reset' ? 'reset-password' : mode === 'resend' ? 'resend-verification' : 'login';
      const body: Record<string,string> = mode === 'reset' ? { token, password } : mode === 'forgot' || mode === 'resend' ? { email } : { email, password };
      const response = await fetch(`/api/auth/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data: any = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not complete the request.');
      if (mode === 'login' && data.user) { onAuthenticated(data.user as AuthUser); onClose(); return; }
      setMessage(data.message || '');
      if (mode === 'register') setMode('login');
      if (mode === 'reset') { setMode('login'); history.replaceState(history.state, '', window.location.pathname); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not complete the request.'); }
    finally { setBusy(false); }
  };
  const resetFeedback = () => { setError(''); setMessage(''); };
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="relative w-full max-w-md rounded-2xl border border-[#292929] bg-[#121212] p-6 shadow-[0_0_50px_rgba(255,214,10,0.09)]" dir={isAr ? 'rtl' : 'ltr'}>
      <button onClick={onClose} aria-label={copy.close} className="absolute end-4 top-4 rounded-lg p-2 text-[#888] hover:bg-white/5 hover:text-white"><X size={18}/></button>
      <div className="mb-6 pe-1"><p className="text-xs font-semibold text-[#FFD60A]">wegov2ray</p><h2 className="mt-1 text-xl font-bold text-white">{copy.titles[mode]}</h2></div>
      {mode === 'verify' && !token ? <p className="text-sm text-[#aaa]">{copy.invalidLink}</p> : null}
      <form onSubmit={submit} className="space-y-4">
        {mode !== 'verify' && <label className="block"><span className="mb-1.5 block text-xs text-[#aaa]">{copy.email}</span><span className="flex items-center gap-2 rounded-xl border border-[#303030] bg-[#0b0b0b] px-3"><Mail size={16} className="text-[#777]"/><input autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full bg-transparent text-sm text-white outline-none" placeholder="name@example.com" dir="ltr"/></span></label>}
        {(mode === 'login' || mode === 'register' || mode === 'reset') && <label className="block"><span className="mb-1.5 block text-xs text-[#aaa]">{mode === 'reset' ? copy.newPassword : copy.password}</span><span className="flex items-center gap-2 rounded-xl border border-[#303030] bg-[#0b0b0b] px-3"><Lock size={16} className="text-[#777]"/><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" minLength={12} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full bg-transparent text-sm text-white outline-none" placeholder={copy.passwordHint} dir="ltr"/></span></label>}
        {error && <p role="alert" className="rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="rounded-lg border border-[#FFD60A]/20 bg-[#FFD60A]/5 p-3 text-sm text-[#e5d68c]">{message}</p>}
        <button disabled={busy || mode === 'verify'} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FFD60A] font-bold text-[#111] transition hover:shadow-[0_0_24px_rgba(255,214,10,0.22)] disabled:opacity-60">
          {busy ? <Loader2 size={17} className="animate-spin"/> : mode === 'register' ? <UserPlus size={17}/> : <LogIn size={17}/>}
          {copy.actions[mode]}
        </button>
      </form>
      <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-[#999]">
        {mode === 'login' && <><button onClick={() => {setMode('register');resetFeedback();}} className="hover:text-[#FFD60A]">{copy.createAccount}</button><button onClick={() => {setMode('forgot');resetFeedback();}} className="hover:text-[#FFD60A]">{copy.forgotPassword}</button><button onClick={() => {setMode('resend');resetFeedback();}} className="hover:text-[#FFD60A]">{copy.resendVerification}</button></>}
        {mode !== 'login' && mode !== 'verify' && <button onClick={() => {setMode('login');resetFeedback();}} className="hover:text-[#FFD60A]">{copy.backToLogin}</button>}
      </div>
      <p className="mt-5 text-center text-[10px] leading-5 text-[#666]">{copy.note}</p>
    </div>
  </div>;
};
