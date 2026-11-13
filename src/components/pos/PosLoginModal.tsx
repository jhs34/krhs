import { useState } from 'react';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { loginPosUser, createGoogleAdminPosUser, isGoogleAdminEmail } from '../../services/posAuth';
import { loginWithGoogle, logout } from '../../firebase';
import { PosUser } from '../../types/pos';
import { POS_MODAL_BACKDROP_TRANSITION, POS_MODAL_PANEL_TRANSITION, EASE_OUT_EXPO } from '../../utils/motion';

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
  const [shakeKey, setShakeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const triggerLoginError = (msg: string) => {
    setError(msg);
    setShakeKey(prev => prev + 1);
  };

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
        triggerLoginError(res.error || '아이디 또는 비밀번호(PIN)가 올바르지 않습니다.');
      }
    }, 180);
  };

  const handleGoogleAdminLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const googleUser = await loginWithGoogle();
      const userEmail = (googleUser?.email || googleUser?.providerData?.[0]?.email || '').toLowerCase().trim();
      if (!googleUser || !userEmail) {
        triggerLoginError('구글 계정 이메일 정보를 확인할 수 없습니다.');
        return;
      }
      if (!googleUser.emailVerified || !isGoogleAdminEmail(userEmail)) {
        await logout();
        triggerLoginError(`승인된 관리자 계정이 아닙니다. (${userEmail})`);
        return;
      }
      const adminUser = createGoogleAdminPosUser(
        userEmail,
        googleUser.displayName,
        googleUser.uid
      );
      onLoginSuccess(adminUser);
    } catch (err: any) {
      console.error('Google Admin Login failed', err);
      triggerLoginError(err?.message || '구글 로그인에 실패했습니다. 다시 시도해 주세요.');
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={POS_MODAL_BACKDROP_TRANSITION}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-primary/90 backdrop-blur-xl overflow-y-auto select-none"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={POS_MODAL_PANEL_TRANSITION}
        className="w-full max-w-sm sm:max-w-md"
      >
        <motion.div
          key={shakeKey}
          animate={shakeKey > 0 ? { x: [0, -8, 8, -5, 5, 0] } : undefined}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-[#0a1120] border border-white/10 w-full max-h-[95vh] overflow-y-auto custom-scrollbar rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col relative"
        >
          {isSwitchMode && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="absolute right-5 top-5 p-1.5 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 transition-colors cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Editorial Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-2.5 mb-3">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="KRHS"
                className="w-5 h-auto brightness-0 invert opacity-90"
              />
              <span className="text-xs font-bold text-white/90 tracking-tight">
                KRHS POS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {isSwitchMode ? '근무자 계정 전환' : '매점 터미널 로그인'}
            </h2>
            <p className="text-xs text-surface-dim mt-1">
              {isSwitchMode
                ? `현재 담당: ${currentUserName || '미지정'} · 교대할 담당자 정보를 입력하세요.`
                : '부여받은 담당자 아이디와 PIN 번호를 입력하세요.'}
            </p>
          </div>

          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                key="pos-login-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14, ease: EASE_OUT_EXPO }}
                className="w-full bg-red-500/10 border border-red-500/25 text-red-200 text-xs rounded-xl p-3 mb-4 flex items-center space-x-2 shrink-0"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="text-xs leading-snug">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

        <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-surface-dim block">
                아이디
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-primary border border-white/10 focus:border-secondary-container/50 rounded-xl px-3 py-2 text-white text-sm outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-surface-dim block">
                비밀번호 (PIN)
              </label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                required
                maxLength={12}
                autoComplete="current-password"
                className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-primary border border-white/10 focus:border-secondary-container/50 rounded-xl px-3 py-2 text-white text-sm tracking-widest outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* Minimal Numpad */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => (
              <button
                key={btn}
                type="button"
                onClick={() => {
                  if (btn === 'C') setPin('');
                  else if (btn === '⌫') handleBackspace();
                  else handleQuickKeypad(btn);
                }}
                className={`py-2.5 rounded-xl text-sm font-semibold font-mono transition-colors active:scale-95 cursor-pointer ${
                  btn === 'C'
                    ? 'bg-white/[0.03] text-red-300 hover:bg-red-500/15'
                    : btn === '⌫'
                    ? 'bg-white/[0.03] text-surface-dim hover:bg-white/10 hover:text-white'
                    : 'bg-white/[0.04] text-white hover:bg-white/10'
                }`}
              >
                {btn}
              </button>
            ))}
          </div>

          <div className="pt-2 flex flex-col space-y-2">
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-secondary hover:bg-secondary/90 active:scale-[0.99] transition-[background-color,transform] flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span>
                {isLoading
                  ? '인증 확인 중...'
                  : isSwitchMode
                  ? '계정 전환 완료'
                  : '터미널 접속하기'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleGoogleAdminLogin}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-secondary-container" />
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
                  <span>구글 관리자 계정으로 접속</span>
                </>
              )}
            </button>

            {isSwitchMode && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs font-medium text-surface-dim hover:text-white transition-colors cursor-pointer"
              >
                취소
              </button>
            ) : (
              onExitToPortal && (
                <button
                  type="button"
                  onClick={onExitToPortal}
                  className="w-full py-2 text-xs font-medium text-surface-dim hover:text-white transition-colors cursor-pointer"
                >
                  학교 포털 메인으로 돌아가기
                </button>
              )
            )}
          </div>
        </form>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
