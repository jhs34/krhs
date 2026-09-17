import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, Menu, X, Store, Wrench, ChevronDown, Boxes, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';

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
    <div id="dashboard" className="glass-panel-dark text-white sticky top-0 z-50 border-white/5 transition-all duration-300">
      <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2 md:space-x-3 shrink-0 mr-4">
            <img src={`${import.meta.env.BASE_URL}logo.png`} className="w-[24px] md:w-[30px] h-auto brightness-0 invert opacity-90" alt="KRHS" />
            <span className="font-sans font-bold tracking-tight text-white/95 text-xl md:text-[22px] pt-1">KRHS Portal</span>
          </Link>
          <div className="flex items-center space-x-2 md:space-x-4 ml-auto">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex flex-nowrap items-center space-x-10 min-w-0 pr-6 whitespace-nowrap pt-1 pb-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    className={`flex shrink-0 items-center space-x-2 text-sm font-medium transition-colors duration-200 ${isActive ? 'text-white font-semibold' : 'text-surface-dim hover:text-white'}`}
                  >
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            
            <div className="shrink-0 md:border-l border-white/10 md:pl-4 flex items-center space-x-2">
              {/* Tool Dropdown Menu */}
              <div className="relative" ref={toolDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsToolMenuOpen(prev => !prev)}
                  className={`flex items-center space-x-1.5 text-xs md:text-sm font-medium px-3 md:px-3.5 py-1.5 rounded-full transition-all duration-200 border ${
                    isToolMenuOpen || location.pathname.startsWith('/tool')
                      ? 'bg-white/15 text-white border-white/25 shadow-sm'
                      : 'text-surface-dim hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 text-secondary" />
                  <span>Tool</span>
                  <ChevronDown className={`w-3 h-3 text-surface-dim transition-transform duration-200 ${isToolMenuOpen ? 'rotate-180 text-white' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isToolMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-72 bg-[#0c1426] border border-white/15 rounded-2xl p-2 shadow-2xl z-50 overflow-hidden backdrop-blur-md"
                    >
                      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-surface-dim tracking-wider uppercase">포털 도구함</span>
                        <span className="text-[10px] text-secondary font-mono">KRHS TOOLS</span>
                      </div>

                      <div className="p-1 space-y-1">
                        <Link
                          to="/tool/pos"
                          onClick={() => setIsToolMenuOpen(false)}
                          className="flex items-start space-x-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0 group-hover:scale-105 transition-transform">
                            <Store className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                학생회 매점 POS
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                수요매점
                              </span>
                            </div>
                            <p className="text-[11px] text-surface-dim mt-0.5 leading-snug line-clamp-1">
                              실시간 상품 결제, 재고 차감 및 정산
                            </p>
                          </div>
                        </Link>
                      </div>

                      <div className="pt-1 mt-1 border-t border-white/5">
                        <Link
                          to="/tool"
                          onClick={() => setIsToolMenuOpen(false)}
                          className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-[11px] font-medium text-surface-dim hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          <span>도구함 허브 전체보기</span>
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {hasAuthChecked && (
                isAdmin ? (
                  <button 
                    onClick={() => setIsAdminModalOpen(true)} 
                    title={`접속 계정: ${auth.currentUser?.email || auth.currentUser?.providerData?.[0]?.email || '관리자'}`}
                    className="flex items-center space-x-2 text-xs md:text-sm font-bold text-secondary-fixed-dim bg-secondary/10 hover:bg-secondary/20 px-3 md:px-4 py-1.5 rounded-full transition-colors duration-200 border border-secondary/20 cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">관리자 패널</span>
                    {(auth.currentUser?.email || auth.currentUser?.providerData?.[0]?.email) && (
                      <span className="hidden xl:inline text-[11px] text-secondary font-mono max-w-[150px] truncate opacity-90">
                        {auth.currentUser?.email || auth.currentUser?.providerData?.[0]?.email}
                      </span>
                    )}
                  </button>
                ) : (
                  <button onClick={loginWithGoogle} className="flex items-center space-x-2 text-xs md:text-sm font-medium text-surface-dim hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors duration-200">
                    <span>로그인</span>
                  </button>
                )
              )}
              {/* Mobile Menu Toggle Button */}
              <button 
                className="md:hidden p-2 ml-1 text-white/70 hover:text-white transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0, filter: 'blur(8px)' }}
            animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
            exit={{ opacity: 0, height: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="md:hidden absolute top-16 left-0 right-0 bg-[#0d0d0d]/95 backdrop-blur-md border-b border-white/10 shadow-2xl flex flex-col pt-2 pb-4 px-4 overflow-hidden z-50"
          >
            <nav className="flex flex-col space-y-2">
              {/* Mobile Tool Section */}
              <div className="pb-2 border-b border-white/10">
                <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-surface-dim">
                  <span className="flex items-center space-x-1.5 text-secondary">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>도구함 (Tool)</span>
                  </span>
                  <Link
                    to="/tool"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-[11px] text-surface-dim hover:text-white"
                  >
                    전체보기
                  </Link>
                </div>
                <Link
                  to="/tool/pos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-2.5 p-2.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors mt-1"
                >
                  <Store className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="truncate">학생회 매점 POS</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">수요매점</span>
                    </div>
                    <p className="text-[11px] text-surface-dim font-normal mt-0.5 truncate">결제, 재고 관리 및 마감 정산</p>
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
                    className={`flex items-center p-3 rounded-lg text-sm font-medium transition-colors duration-200 ${isActive ? 'bg-white/10 text-white font-semibold' : 'text-surface-dim hover:bg-white/5 hover:text-white'}`}
                  >
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
