import { useState } from 'react';
import { Lock, UserCheck, AlertCircle, Sparkles, RefreshCw, X } from 'lucide-react';
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
  const [username, setUsername] = useState(isSwitchMode ? 'staff' : 'admin');
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = loginPosUser(username, pin);
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || '로그인에 실패했습니다.');
      }
    }, 200);
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-[#0b1222] border border-white/15 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center relative overflow-hidden"
      >
        {/* Close Button if switch mode */}
        {isSwitchMode && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Background glow */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-secondary/30 to-indigo-500/30 border border-white/20 flex items-center justify-center mb-4 text-white shadow-lg">
          {isSwitchMode ? (
            <RefreshCw className="w-7 h-7 text-secondary" />
          ) : (
            <Lock className="w-7 h-7 text-secondary" />
          )}
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight text-center">
          {isSwitchMode ? '근무자 계정 교환' : 'KRHS 매점 POS 시스템'}
        </h2>
        <p className="text-xs md:text-sm text-surface-dim mt-1 mb-6 text-center">
          {isSwitchMode
            ? `현재 담당자: ${currentUserName || '미지정'} → 새 담당자 로그인`
            : '학생회 매점 운영자 전용 로그인'}
        </p>

        {/* Notice Info Box */}
        <div className="w-full bg-secondary/10 border border-secondary/20 rounded-xl p-3 mb-5 flex items-start space-x-2 text-xs text-secondary-fixed">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-secondary" />
          <div className="leading-relaxed">
            <span className="font-bold">계정 테스트 안내:</span><br />
            1) 관리자: <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">admin</code> / <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">1234</code> (김철도)<br />
            2) 판매원: <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">staff</code> / <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">1234</code> (이영업)<br />
            3) 교대원: <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">pos2</code> / <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">1234</code> (박학생)
          </div>
        </div>

        {error && (
          <div className="w-full bg-red-500/15 border border-red-500/30 text-red-200 text-xs rounded-xl p-3 mb-4 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-surface-dim pl-1">
              {isSwitchMode ? '교대할 담당자 아이디' : '아이디'}
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:border-secondary outline-none transition-colors"
              placeholder="운영자 아이디"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-surface-dim pl-1">비밀번호 (PIN)</label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              required
              maxLength={12}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-base tracking-widest focus:border-secondary outline-none transition-colors"
              placeholder="••••"
            />
          </div>

          {/* Quick PIN Numpad for Tablet touch convenience */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => (
              <button
                key={btn}
                type="button"
                onClick={() => {
                  if (btn === 'C') setPin('');
                  else if (btn === '⌫') handleBackspace();
                  else handleQuickKeypad(btn);
                }}
                className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
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

          <div className="pt-2 flex flex-col space-y-2.5">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-secondary hover:bg-secondary/90 active:scale-[0.99] transition-all shadow-lg shadow-secondary/20 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {isLoading
                  ? '확인 중...'
                  : isSwitchMode
                  ? '계정 교환 및 판매 계속'
                  : 'POS 시스템 시작하기'}
              </span>
            </button>

            {isSwitchMode && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-xs font-medium text-surface-dim hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                취소 (현재 계정 유지)
              </button>
            ) : (
              onExitToPortal && (
                <button
                  type="button"
                  onClick={onExitToPortal}
                  className="w-full py-2.5 rounded-xl text-xs font-medium text-surface-dim hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
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
