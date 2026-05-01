import { useState, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isAfter, startOfDay } from 'date-fns';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { EventsPage } from './pages/EventsPage';
import { NoticesPage } from './pages/NoticesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { Navigation } from './components/Navigation';
import { AdminPanel } from './components/AdminPanel';
import { ItemDetailPopup } from './components/ItemDetailPopup';
import { SiteInfoPopup } from './components/SiteInfoPopup';
import { AcademicEvent } from './types';
import { loginWithGoogle, logout, auth } from './firebase';
import { subscribeToEvents, subscribeToNotices, subscribeToDocuments, FirestoreEvent, Notice, SchoolDocument } from './services/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function HeroSection() {
  return (
    <section className="relative w-full h-screen flex flex-col justify-between overflow-hidden">
      {/* Blurred Background with Overlays */}
      <div className="absolute inset-0 z-0 bg-[#0f172a]">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: `url('${import.meta.env.BASE_URL}bg.png')`, filter: 'blur(12px)', transform: 'scale(1.05)' }}
        ></div>
        <div className="absolute inset-0 bg-[#001f3f]/70 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-primary/60"></div>
        {/* Subtle curved glow at the bottom matching the image */}
        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-[#000613] via-[#000613]/80 to-transparent"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[120%] h-[50%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary/10 via-transparent to-transparent rounded-[100%] blur-[100px]"></div>
      </div>

      {/* Top Header - Logo */}
      <header className="relative z-10 w-full pt-10 px-6 md:px-12 max-w-[1600px] w-full mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex items-center space-x-4"
        >
          <img 
            src={`${import.meta.env.BASE_URL}logo.png`} 
            alt="한국철도고등학교 로고" 
            className="w-10 h-auto drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)] brightness-0 invert"
          />
          <div className="flex items-baseline space-x-4">
            <span className="font-sans font-bold text-2xl text-white tracking-tighter drop-shadow-md pt-[6px]">한국철도고등학교</span>
            <span className="font-space font-medium text-[13px] text-white tracking-[0.2em] uppercase hidden sm:block">KOREA RAILROAD HIGH SCHOOL</span>
          </div>
        </motion.div>
      </header>

      {/* Center Text Editorial Style */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-grow px-4 max-w-[1600px] w-full mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="text-center"
        >
          <h2 className="text-white/80 font-space font-semibold text-sm md:text-base tracking-[0.3em] mb-6 uppercase drop-shadow-md">
            Korea Railroad High School
          </h2>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[1.1] font-sans drop-shadow-2xl mb-10">
            입학부터 졸업까지,<br />
            모든 순간을 <span className="relative inline-block px-4 py-1 ml-2">
              <span className="relative z-10">완성하다</span>
              <span className="absolute inset-0 bg-gradient-to-r from-secondary to-primary transform -skew-x-6"></span>
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 font-medium max-w-2xl mx-auto tracking-tight leading-relaxed">
            한국철도고등학교 학생들을 위한 지능형 학사 안내 터미널
          </p>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        onClick={() => {
          document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 1, delay: 1 }}
        className="relative z-10 flex flex-col items-center pb-12 group cursor-pointer hover:opacity-100 transition-opacity"
      >
        <span className="text-white text-xs font-medium mb-4 tracking-tight font-sans">아래로 스크롤하여 더보기</span>
        <motion.div 
          animate={{ y: [0, 8, 0] }} 
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <ArrowDown className="w-5 h-5 text-white" strokeWidth={2} />
        </motion.div>
      </motion.div>
    </section>
  );
}

function AppContent() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [documents, setDocuments] = useState<SchoolDocument[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [hasAuthChecked, setHasAuthChecked] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<'notice' | 'event' | 'document' | null>(null);
  const [adminInitialTab, setAdminInitialTab] = useState<'notices' | 'events' | 'documents'>('notices');
  const [adminInitialEditItem, setAdminInitialEditItem] = useState<any>(null);
  const [siteInfoPopup, setSiteInfoPopup] = useState<{title: string, content: string} | null>(null);

  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsAdmin(user?.email === 'hoya100304@gmail.com');
      setHasAuthChecked(true);
    });

    const unsubscribeEvents = subscribeToEvents((data) => {
      setEvents(data.map(e => {
        const d = e.date ? new Date(e.date) : new Date();
        const validDate = isNaN(d.getTime()) ? new Date() : d;
        const ed = e.endDate ? new Date(e.endDate) : validDate;
        const validEndDate = isNaN(ed.getTime()) ? validDate : ed;
        return {
          id: e.id,
          title: e.title,
          description: e.description,
          date: validDate,
          endDate: validEndDate,
          color: e.color
        };
      }));
    });

    const unsubscribeNotices = subscribeToNotices((data) => {
      setNotices(data.map(n => {
        const d = n.date ? new Date(n.date) : new Date();
        return {
          ...n,
          date: isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
        };
      }));
    });

    const unsubscribeDocs = subscribeToDocuments((data) => {
      setDocuments(data);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeEvents();
      unsubscribeNotices();
      unsubscribeDocs();
    };
  }, []);

  const upcomingEvents = events
    .filter(e => selectedDate ? isAfter(e.date, startOfDay(new Date(selectedDate.getTime() - 86400000))) : true)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  const handleItemClick = (item: any, type: 'notice' | 'event' | 'document') => {
    setDetailItem(item);
    setDetailType(type);
  };

  const handleEditItem = (tab: 'notices' | 'events' | 'documents', item: any) => {
    setAdminInitialTab(tab);
    setAdminInitialEditItem(item);
    setIsAdminModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-secondary selection:text-white bg-background">
      {isHome && <HeroSection />}
      
      <Navigation 
        isAdmin={isAdmin}
        hasAuthChecked={hasAuthChecked}
        setIsAdminModalOpen={setIsAdminModalOpen}
        loginWithGoogle={loginWithGoogle}
      />

      <main className="flex-grow w-full bg-primary pt-24 pb-32">
        <Routes>
          <Route path="/" element={
            <Dashboard 
              upcomingEvents={upcomingEvents}
              notices={notices}
              documents={documents}
              isAdmin={isAdmin}
              onItemClick={handleItemClick}
              onEditItem={handleEditItem}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              events={events}
            />
          } />
          <Route path="/events" element={
            <EventsPage
              events={events}
              isAdmin={isAdmin}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onItemClick={handleItemClick}
              onEditItem={handleEditItem}
            />
          } />
          <Route path="/notices" element={
            <NoticesPage
              notices={notices}
              isAdmin={isAdmin}
              onItemClick={handleItemClick}
              onEditItem={handleEditItem}
            />
          } />
          <Route path="/documents" element={
            <DocumentsPage
              documents={documents}
              isAdmin={isAdmin}
              onItemClick={handleItemClick}
              onEditItem={handleEditItem}
            />
          } />
        </Routes>
      </main>

      <footer className="bg-[#050a14] py-12 border-t border-white/5">
        <div className="max-w-[1600px] w-full mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center text-surface-dim text-sm font-sans">
           <div className="mb-4 md:mb-0 flex items-center space-x-3">
             <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="w-6 opacity-100 brightness-0 invert border-white" />
             <span>&copy; 2026 KOREA RAILROAD HIGH SCHOOL</span>
           </div>
           <div className="flex space-x-6 uppercase font-space tracking-widest text-xs">
             <button onClick={() => setSiteInfoPopup({ title: '공지사항', content: '한국철도고등학교 학생들을 위한 지능형 학사 안내 터미널 관련 공지사항입니다.\n\n- (예시) 신규 업데이트가 있을 경우 여기에 안내됩니다.' })} className="hover:text-white transition-colors cursor-pointer text-left">공지사항</button>
             <button onClick={() => setSiteInfoPopup({ title: '업데이트', content: '시스템 업데이트 내역:\n\n- 디자인 리뉴얼\n- 메인 학사일정 바로가기 추가\n- 데이터베이스 연동 완료' })} className="hover:text-white transition-colors cursor-pointer text-left">업데이트</button>
             <button onClick={() => setSiteInfoPopup({ title: '문의하기', content: '개발자 연락처: hoya100304@gmail.com\n\n문의 사항이 있으시면 위 이메일로 연락주시기 바랍니다.' })} className="hover:text-white transition-colors cursor-pointer text-left">문의하기</button>
           </div>
        </div>
      </footer>

      {isAdminModalOpen && (
        <AdminPanel
          onClose={() => {
            setIsAdminModalOpen(false);
            setAdminInitialEditItem(null);
          }}
          notices={notices}
          events={events as any}
          documents={documents}
          initialTab={adminInitialTab}
          initialEditItem={adminInitialEditItem}
        />
      )}

      <AnimatePresence>
        {detailItem && detailType && (
          <ItemDetailPopup
            item={detailItem}
            type={detailType}
            isAdmin={isAdmin}
            onClose={() => {
              setDetailItem(null);
              setDetailType(null);
            }}
            onEdit={handleEditItem}
          />
        )}
        {siteInfoPopup && (
          <SiteInfoPopup
            title={siteInfoPopup.title}
            content={siteInfoPopup.content}
            onClose={() => setSiteInfoPopup(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
