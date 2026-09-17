import { useState } from 'react';
import { Lock, UserCheck, AlertCircle, RefreshCw, X, User, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';
import { loginPosUser } from '../../services/posAuth';
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

  const handleQuickKeypad = (num: string) => {
    if (pin.length < 8) {
      setPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-[#0b1222] border border-white/15 w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 shadow-2xl flex flex-col relative my-auto max-h-[94vh] overflow-y-auto custom-scrollbar"
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

        {/* Ambient background glows */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

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
                : '학생회 매점 운영자 전용 인증'}
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
                className="w-full bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-xs sm:text-sm focus:border-secondary outline-none transition-colors"
                placeholder="아이디"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-dim flex items-center space-x-1 pl-0.5">
                <KeyRound className="w-2.5 h-2.5 text-secondary" />
                <span>비밀번호 (PIN)</span>
              </label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                required
                maxLength={12}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-xs sm:text-sm tracking-widest focus:border-secondary outline-none transition-colors font-mono"
                placeholder="••••"
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
              disabled={isLoading}
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
