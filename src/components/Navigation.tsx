import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, Menu, X } from 'lucide-react';

interface NavigationProps {
  isAdmin: boolean;
  hasAuthChecked: boolean;
  setIsAdminModalOpen: (val: boolean) => void;
  loginWithGoogle: () => void;
}

export function Navigation({ isAdmin, hasAuthChecked, setIsAdminModalOpen, loginWithGoogle }: NavigationProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: '대시보드', path: '/' },
    { name: '학사일정', path: '/events' },
    { name: '공지사항', path: '/notices' },
    { name: '자료실', path: '/documents' },
  ];

  return (
    <div id="dashboard" className="glass-panel-dark text-white sticky top-0 z-50 border-white/5 transition-all duration-300">
      <div className="max-w-[1600px] w-full mx-auto px-4 md:px-12">
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
              {hasAuthChecked && (
                isAdmin ? (
                  <button onClick={() => setIsAdminModalOpen(true)} className="flex items-center space-x-2 text-xs md:text-sm font-bold text-secondary-fixed-dim bg-secondary/10 px-3 md:px-4 py-1.5 rounded-full hover:bg-secondary/20 transition-colors duration-200">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">관리자 패널</span>
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
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-[#0d0d0d] border-b border-white/10 shadow-2xl flex flex-col pt-2 pb-4 px-4 overflow-hidden z-50">
          <nav className="flex flex-col space-y-2">
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
        </div>
      )}
    </div>
  );
}
