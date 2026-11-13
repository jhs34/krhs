import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, Menu, X, Store, Wrench, ChevronDown, Boxes, LogOut, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, logout, getDisplayUserEmail } from '../firebase';
import { useFullscreen } from '../utils/useFullscreen';
import { EASE_OUT_EXPO, NAV_SPRING_TRANSITION } from '../utils/motion';

interface NavigationProps {
  isAdmin: boolean;
  hasAuthChecked: boolean;
  setIsAdminModalOpen: (val: boolean) => void;
  loginWithGoogle: () => void;
}

export function Navigation({ isAdmin, hasAuthChecked, setIsAdminModalOpen, loginWithGoogle }: NavigationProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const toolDropdownRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolDropdownRef.current && !toolDropdownRef.current.contains(event.target as Node)) {
        setIsToolMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { name: '대시보드', path: '/' },
    { name: '학사일정', path: '/events' },
    { name: '시간표', path: '/timetable' },
    { name: '공지사항', path: '/notices' },
    { name: '자료실', path: '/documents' },
    { name: '보관함', path: '/archive' },
  ];

  return (
    <div id="dashboard" className="glass-panel-dark text-white sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 gap-2 sm:gap-6">
          {/* Brand Wordmark */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 whitespace-nowrap">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              className="w-[22px] sm:w-[25px] h-auto brightness-0 invert opacity-90 block shrink-0"
              alt="KRHS"
            />
            <span className="font-sans font-semibold tracking-tight text-white text-[15px] sm:text-base lg:text-lg truncate">
              한국철도고등학교 포털
            </span>
          </Link>

          {/* Center/Right Nav Area */}
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0">
            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex flex-nowrap items-center space-x-4 lg:space-x-6 xl:space-x-7 min-w-0 pr-2 lg:pr-4 whitespace-nowrap">
              {navItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex shrink-0 items-center text-xs lg:text-sm transition-colors duration-150 py-1.5 whitespace-nowrap ${
                      isActive ? 'text-white font-semibold' : 'text-surface-dim hover:text-white font-normal'
                    }`}
                  >
                    <span>{item.name}</span>
                    {isActive && (
                      <motion.span
                        layoutId="portal-nav-underline"
                        transition={NAV_SPRING_TRANSITION}
                        className="absolute -bottom-1 left-0 right-0 h-[2px] bg-secondary-container"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="shrink-0 md:border-l border-white/10 md:pl-3 lg:pl-4 flex items-center space-x-1.5 sm:space-x-2">
              {/* Tool Dropdown Menu (Desktop — Mobile uses the dedicated section inside the menu) */}
              <div className="hidden md:block relative" ref={toolDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsToolMenuOpen(prev => !prev)}
                  className={`h-8 inline-flex items-center justify-center space-x-1.5 text-xs lg:text-sm font-medium px-2.5 rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                    isToolMenuOpen || location.pathname.startsWith('/tool')
                      ? 'bg-white/[0.1] text-white'
                      : 'text-surface-dim hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 text-surface-dim shrink-0" strokeWidth={1.75} />
                  <span>도구</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-surface-dim transition-transform duration-150 ${
                      isToolMenuOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isToolMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
                      className="fixed left-3.5 right-3.5 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 bg-[#0f182b] border border-white/[0.12] rounded-xl p-1.5 shadow-2xl z-50 overflow-hidden origin-top-right"
                    >
                      <div className="px-2.5 py-1.5 border-b border-white/[0.06] flex items-center justify-between">
                        <span className="text-xs font-medium text-surface-dim">교내 실무 도구</span>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/tool/pos"
                          onClick={() => setIsToolMenuOpen(false)}
                          className="flex items-start space-x-3 p-2.5 rounded-lg hover:bg-white/[0.06] transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white shrink-0">
                            <Store className="w-4 h-4" strokeWidth={1.75} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <span className="text-xs font-semibold text-white group-hover:text-secondary-container transition-colors block">
                              매점 POS 터미널
                            </span>
                            <p className="text-xs text-surface-dim mt-0.5 leading-snug line-clamp-1">
                              상품 결제, 재고 관리 및 마감 정산
                            </p>
                          </div>
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-white/[0.06]">
                        <Link
                          to="/tool"
                          onClick={() => setIsToolMenuOpen(false)}
                          className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-medium text-surface-dim hover:text-white hover:bg-white/[0.05] transition-colors"
                        >
                          <Boxes className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>도구 목록 보기</span>
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Fullscreen Toggle Button (Desktop — Mobile uses the dedicated row inside the menu) */}
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? '전체화면 종료 (ESC)' : '전체화면 모드 전환'}
                className={`hidden md:flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 cursor-pointer shrink-0 ${
                  isFullscreen
                    ? 'bg-secondary/20 text-secondary-container'
                    : 'text-surface-dim hover:text-white hover:bg-white/[0.06]'
                }`}
                aria-label={isFullscreen ? '전체화면 종료' : '전체화면 모드'}
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" strokeWidth={1.75} />
                ) : (
                  <Maximize className="w-4 h-4" strokeWidth={1.75} />
                )}
              </button>

              {hasAuthChecked &&
                (auth.currentUser ? (
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {isAdmin ? (
                      <button
                        onClick={() => setIsAdminModalOpen(true)}
                        title={`접속 계정: ${getDisplayUserEmail(auth.currentUser?.email || auth.currentUser?.providerData?.[0]?.email) || '관리자'}`}
                        className="h-8 inline-flex items-center justify-center space-x-1.5 text-xs lg:text-sm font-semibold text-white bg-secondary hover:bg-secondary/90 px-2.5 sm:px-3 rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Settings className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                        <span>관리자</span>
                      </button>
                    ) : (
                      <span
                        title={getDisplayUserEmail(auth.currentUser?.email) || ''}
                        className="hidden md:inline-flex items-center text-xs text-surface-dim font-mono max-w-[120px] truncate px-1.5"
                      >
                        {getDisplayUserEmail(auth.currentUser?.email) || '로그인됨'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => logout()}
                      title={`로그아웃 (${getDisplayUserEmail(auth.currentUser?.email) || ''})`}
                      className="hidden md:inline-flex h-8 items-center justify-center space-x-1 text-xs font-medium text-surface-dim hover:text-rose-300 hover:bg-rose-500/10 px-2.5 rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                      <span className="hidden lg:inline">로그아웃</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={loginWithGoogle}
                    className="h-8 inline-flex items-center justify-center text-xs lg:text-sm font-medium text-surface-dim hover:text-white hover:bg-white/[0.06] px-2.5 rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>로그인</span>
                  </button>
                ))}

              {/* Mobile Menu Toggle Button */}
              <button
                className="md:hidden p-1.5 text-white/80 hover:text-white active:scale-95 transition-transform cursor-pointer shrink-0"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isMobileMenuOpen ? (
                    <motion.span
                      key="close"
                      initial={{ opacity: 0, rotate: -45, scale: 0.85 }}
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, rotate: 45, scale: 0.85 }}
                      transition={{ duration: 0.14 }}
                      className="block"
                    >
                      <X className="w-5 h-5" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="menu"
                      initial={{ opacity: 0, rotate: 45, scale: 0.85 }}
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, rotate: -45, scale: 0.85 }}
                      transition={{ duration: 0.14 }}
                      className="block"
                    >
                      <Menu className="w-5 h-5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.97 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.97 }}
            transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
            className="md:hidden absolute top-14 sm:top-16 left-0 right-0 bg-[#0a1120]/98 backdrop-blur-md border-b border-white/10 shadow-2xl flex flex-col pt-2 pb-4 px-4 overflow-hidden z-50 origin-top"
          >
            <nav className="flex flex-col space-y-1.5">
              {/* Mobile Tool Section */}
              <div className="pb-2.5 mb-1 border-b border-white/[0.08]">
                <div className="flex items-center justify-between px-2 py-1 text-xs font-medium text-surface-dim">
                  <span>실무 도구</span>
                  <Link
                    to="/tool"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-xs text-surface-dim hover:text-white"
                  >
                    전체보기
                  </Link>
                </div>
                <Link
                  to="/tool/pos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-2.5 p-2.5 rounded-lg text-sm font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] transition-colors mt-1"
                >
                  <Store className="w-4 h-4 text-secondary-container shrink-0" strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">매점 POS 터미널</span>
                    <p className="text-xs text-surface-dim font-normal mt-0.5 truncate">
                      결제, 재고 관리 및 마감 정산
                    </p>
                  </div>
                </Link>
              </div>

              {navItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                      isActive
                        ? 'bg-white/[0.08] text-white font-semibold'
                        : 'text-surface-dim hover:bg-white/[0.04] hover:text-white font-normal'
                    }`}
                  >
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* Mobile Fullscreen & Account Section */}
              <div className="pt-2 mt-1 border-t border-white/[0.08] space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    toggleFullscreen();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    {isFullscreen ? (
                      <Minimize className="w-4 h-4 text-surface-dim shrink-0" />
                    ) : (
                      <Maximize className="w-4 h-4 text-surface-dim shrink-0" />
                    )}
                    <span>{isFullscreen ? '전체화면 종료' : '전체화면 모드'}</span>
                  </span>
                  <span className="text-xs text-surface-dim">
                    {isFullscreen ? '창 모드로 복귀' : '전환'}
                  </span>
                </button>

                {hasAuthChecked && auth.currentUser && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-xs text-surface-dim font-mono truncate mr-3">
                      {getDisplayUserEmail(auth.currentUser?.email || auth.currentUser?.providerData?.[0]?.email) || '로그인됨'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        logout();
                      }}
                      className="inline-flex items-center space-x-1 text-xs font-medium text-rose-300 hover:text-rose-200 shrink-0 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                      <span>로그아웃</span>
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
