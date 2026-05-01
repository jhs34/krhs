import { Link, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';

interface NavigationProps {
  isAdmin: boolean;
  hasAuthChecked: boolean;
  setIsAdminModalOpen: (val: boolean) => void;
  loginWithGoogle: () => void;
}

export function Navigation({ isAdmin, hasAuthChecked, setIsAdminModalOpen, loginWithGoogle }: NavigationProps) {
  const location = useLocation();

  const navItems = [
    { name: '대시보드', path: '/' },
    { name: '학사일정', path: '/events' },
    { name: '공지사항', path: '/notices' },
    { name: '자료실', path: '/documents' },
  ];

  return (
    <div id="dashboard" className="glass-panel-dark text-white sticky top-0 z-50 border-white/5 transition-all duration-300">
      <div className="max-w-[1600px] w-full mx-auto px-6 md:px-12">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3">
            <img src="/logo.png" className="w-[30px] h-auto brightness-0 invert opacity-90" alt="KRHS" />
            <span className="font-sans font-bold tracking-tight text-white/95 w-[130px] text-[22px] h-[33.2188px] ml-0 pl-0 pt-[3px]">KRHS Portal</span>
          </Link>
          <nav className="flex items-center space-x-10">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className={`flex items-center space-x-2 text-sm font-medium transition-colors duration-200 ${isActive ? 'text-white font-semibold' : 'text-surface-dim hover:text-white'}`}
                >
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            {hasAuthChecked && (
              isAdmin ? (
                <button onClick={() => setIsAdminModalOpen(true)} className="flex items-center space-x-2 text-sm font-bold text-secondary-fixed-dim bg-secondary/10 px-4 py-1.5 rounded-full hover:bg-secondary/20 transition-colors duration-200">
                  <Settings className="w-4 h-4" />
                  <span>관리자 패널</span>
                </button>
              ) : (
                <button onClick={loginWithGoogle} className="flex items-center space-x-2 text-sm font-medium text-surface-dim hover:text-white transition-colors duration-200">
                  <span>관리자 로그인</span>
                </button>
              )
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
