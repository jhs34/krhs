import { useState } from 'react';
import { Lock, UserCheck, AlertCircle, RefreshCw, X, User, KeyRound, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { loginPosUser, createGoogleAdminPosUser } from '../../services/posAuth';
import { loginWithGoogle, auth } from '../../firebase';
import { PosUser } from '../../types/pos';

interface PosLoginModalProps {
  onLoginSuccess: (user: PosUser) => void;
  onExitToPortal?: () => void;
  mode?: 'login' | 'switch';
  currentUserName?: string;
  onClose?: () => void;
}

export function PosLoginModal({
  onLoginSuccess,
  onExitToPortal,
  mode = 'login',
  currentUserName,
  onClose,
}: PosLoginModalProps) {
  const isSwitchMode = mode === 'switch';
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = loginPosUser(username, pin);
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || '아이디 또는 비밀번호(PIN)가 올바르지 않습니다.');
      }
    }, 180);
  };

  const handleGoogleAdminLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const googleUser = await loginWithGoogle();
      if (googleUser && googleUser.email) {
        const adminUser = createGoogleAdminPosUser(
          googleUser.email,
          googleUser.displayName,
          googleUser.uid
        );
        onLoginSuccess(adminUser);
      }
    } catch (err: any) {
      console.error('Google Admin Login failed', err);
      setError(err?.message || '구글 로그인에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleQuickKeypad = (num: string) => {
    if (pin.length < 8) {
      setPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto select-none">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-[#0b1222] border border-white/15 w-full max-w-sm sm:max-w-md max-h-[95vh] overflow-y-auto custom-scrollbar rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 shadow-2xl flex flex-col relative"
      >
        {/* Close Button if switch mode */}
        {isSwitchMode && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-3.5 top-3.5 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Ambient background glows (clipped inside container) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl sm:rounded-3xl">
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-secondary/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-indigo-500/15 rounded-full blur-3xl" />
        </div>

        {/* Top Header: Compact Row */}
        <div className="flex items-center space-x-3 mb-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-secondary/30 to-indigo-500/30 border border-white/20 flex items-center justify-center text-white shadow-md shrink-0">
            {isSwitchMode ? (
              <RefreshCw className="w-5 h-5 text-secondary" />
            ) : (
              <Lock className="w-5 h-5 text-secondary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight truncate">
              {isSwitchMode ? '근무자 계정 교환' : 'KRHS 매점 POS 로그인'}
            </h2>
            <p className="text-[11px] text-surface-dim truncate">
              {isSwitchMode
                ? `현재: ${currentUserName || '미지정'} → 새 담당자 로그인`
                : '학생회 매점 운영자 및 관리자 전용 인증'}
            </p>
          </div>
        </div>

        {error && (
          <div className="w-full bg-red-500/15 border border-red-500/30 text-red-200 text-xs rounded-xl p-2.5 mb-2.5 flex items-center space-x-2 shrink-0 animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
            <span className="text-[11px] leading-tight">{error}</span>
          </div>
        )}

        {/* Form Fields: Side-by-side or Compact Stack */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-dim flex items-center space-x-1 pl-0.5">
                <User className="w-2.5 h-2.5 text-secondary" />
                <span>아이디</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-xs sm:text-sm focus:border-secondary outline-none transition-colors"
                placeholder=""
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-dim flex items-center space-x-1 pl-0.5">
                <KeyRound className="w-2.5 h-2.5 text-secondary" />
                <span>비밀번호</span>
              </label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                required
                maxLength={12}
                autoComplete="current-password"
                className="w-full bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-xs sm:text-sm tracking-widest focus:border-secondary outline-none transition-colors font-mono"
                placeholder=""
              />
            </div>
          </div>

          {/* Compact PIN Numpad */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => (
              <button
                key={btn}
                type="button"
                onClick={() => {
                  if (btn === 'C') setPin('');
                  else if (btn === '⌫') handleBackspace();
                  else handleQuickKeypad(btn);
                }}
                className={`py-2 rounded-lg text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer ${
                  btn === 'C'
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    : btn === '⌫'
                    ? 'bg-white/10 text-surface-dim hover:bg-white/20'
                    : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {btn}
              </button>
            ))}
          </div>

          {/* Submit and Navigation Action Buttons */}
          <div className="pt-1 flex flex-col space-y-1.5">
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-secondary hover:bg-secondary/90 active:scale-[0.99] transition-all shadow-md shadow-secondary/20 flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {isLoading
                  ? '확인 중...'
                  : isSwitchMode
                  ? '계정 교환 및 판매 계속'
                  : 'POS 시작하기'}
              </span>
            </button>

            {/* Google Admin Login Button */}
            <button
              type="button"
              onClick={handleGoogleAdminLogin}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white/10 hover:bg-white/15 active:bg-white/20 text-white border border-white/20 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>구글 계정 인증 중...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>구글 계정(포털 관리자)으로 로그인</span>
                </>
              )}
            </button>

            {isSwitchMode && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl text-xs font-medium text-surface-dim hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                취소 (현재 계정 유지)
              </button>
            ) : (
              onExitToPortal && (
                <button
                  type="button"
                  onClick={onExitToPortal}
                  className="w-full py-2 rounded-xl text-xs font-medium text-surface-dim hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  학교 포털 메인으로 나가기
                </button>
              )
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
