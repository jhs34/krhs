import { useState, useEffect, useRef } from 'react';
import { ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isAfter, startOfDay } from 'date-fns';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { EventsPage } from './pages/EventsPage';
import TimetablePage from './pages/TimetablePage';
import { NoticesPage } from './pages/NoticesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ArchivePage } from './pages/ArchivePage';
import { Navigation } from './components/Navigation';
import { AdminPanel } from './components/AdminPanel';
import { ItemDetailPopup } from './components/ItemDetailPopup';
import { SiteInfoPopup } from './components/SiteInfoPopup';
import { AcademicEvent } from './types';
import { loginWithGoogle, logout, auth } from './firebase';
import { subscribeToEvents, subscribeToNotices, subscribeToDocuments, subscribeToSiteInfo, FirestoreEvent, Notice, SchoolDocument, SiteInfo, updateEvent, updateNotice, deleteEvent, deleteNotice, deleteDocument } from './services/firestore';
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
      <header className="relative z-50 w-full pt-10 px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 max-w-7xl w-full mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex items-center space-x-3 md:space-x-4"
        >
          <img 
            src={`${import.meta.env.BASE_URL}logo.png`} 
            alt="한국철도고등학교 로고" 
            className="w-8 md:w-10 h-auto drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)] brightness-0 invert"
          />
          <div className="flex items-baseline space-x-2 md:space-x-4">
            <span className="font-sans font-bold text-xl md:text-2xl text-white tracking-tighter drop-shadow-md pt-[6px]">한국철도고등학교</span>
            <span className="font-space font-medium text-[13px] text-white tracking-[0.2em] uppercase hidden sm:block">KOREA RAILROAD HIGH SCHOOL</span>
          </div>
        </motion.div>
      </header>

      {/* Center Text Editorial Style */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-grow px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 max-w-7xl w-full mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30, filter: 'blur(15px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="text-center"
        >
          <h2 className="text-white/80 font-space font-semibold text-[10px] sm:text-xs md:text-sm tracking-[0.2em] sm:tracking-[0.3em] mb-3 sm:mb-4 uppercase drop-shadow-md leading-relaxed px-2">
            Korea Railroad High School
          </h2>
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[1.35] md:leading-[1.1] font-sans drop-shadow-2xl mb-6 md:mb-8 break-keep">
            한국철도고등학교<br />
            <span className="block mt-2 sm:mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-b from-white to-blue-200 text-transparent bg-clip-text">방문을 환영합니다.</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-white/70 font-medium max-w-2xl mx-auto tracking-tight leading-relaxed break-keep px-4">
            KRHS Portal
          </p>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        onClick={() => {
          document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
        }}
        initial={{ opacity: 0, filter: 'blur(10px)' }}
        animate={{ opacity: 0.8, filter: 'blur(0px)' }}
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
  const processingRef = useRef<Set<string>>(new Set());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [documents, setDocuments] = useState<SchoolDocument[]>([]);
  const [siteInfos, setSiteInfos] = useState<SiteInfo[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [hasAuthChecked, setHasAuthChecked] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<'notice' | 'event' | 'document' | null>(null);
  const [adminInitialTab, setAdminInitialTab] = useState<'notices' | 'events' | 'documents'>('notices');
  const [adminInitialEditItem, setAdminInitialEditItem] = useState<any>(null);
  const [adminInitialEventDate, setAdminInitialEventDate] = useState<Date | null>(null);
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
          color: e.color,
          isHoliday: e.isHoliday || false,
          isArchived: e.isArchived || false,
          archivedAt: e.archivedAt || ''
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

    const unsubscribeSiteInfos = subscribeToSiteInfo((data) => {
      setSiteInfos(data);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeEvents();
      unsubscribeNotices();
      unsubscribeDocs();
      unsubscribeSiteInfos();
    };
  }, []);

  const activeEvents = events.filter(e => !e.isArchived);
  const activeNotices = notices.filter(n => !n.isArchived);
  const activeDocuments = documents.filter(d => !d.isArchived);

  // Background Auto-Archive & Cleanup scheduler
  useEffect(() => {
    if (!isAdmin) return;
    if (events.length === 0 && notices.length === 0 && documents.length === 0) return;

    const todayStart = new Date().setHours(0, 0, 0, 0);
    const now = new Date().getTime();

    // 1. Auto-archive past events
    events.forEach(async (event) => {
      if (!event.isArchived) {
        const eventEnd = event.endDate ? new Date(event.endDate) : new Date(event.date);
        // If event set to end of that day is in the past
        if (eventEnd.getTime() < todayStart) {
          const actionKey = `archive-event-${event.id}`;
          if (processingRef.current.has(actionKey)) return;
          processingRef.current.add(actionKey);

          console.log(`Auto-archiving past academic event: ${event.title}`);
          const payload = {
            title: event.title,
            description: event.description || '',
            date: event.date.toISOString(),
            endDate: event.endDate ? event.endDate.toISOString() : event.date.toISOString(),
            color: event.color || '#64ffda',
            isHoliday: event.isHoliday || false,
            isArchived: true,
            archivedAt: new Date().toISOString()
          };
          try {
            await updateEvent(event.id, payload);
          } catch (err) {
            console.error("Auto-archive event error:", err);
            processingRef.current.delete(actionKey);
          }
        }
      }
    });

    // 2. Auto-archive expired notices (based on validUntil)
    notices.forEach(async (notice) => {
      if (!notice.isArchived && notice.validUntil) {
        const expirationTime = new Date(notice.validUntil).getTime();
        if (expirationTime < now) {
          const actionKey = `archive-notice-${notice.id}`;
          if (processingRef.current.has(actionKey)) return;
          processingRef.current.add(actionKey);

          console.log(`Auto-archiving expired notice: ${notice.title}`);
          const payload = {
            title: notice.title,
            content: notice.content,
            date: notice.date,
            isArchived: true,
            archivedAt: new Date().toISOString(),
            validUntil: notice.validUntil,
            link: notice.link || '',
            files: notice.files || []
          };
          try {
            await updateNotice(notice.id, payload);
          } catch (err) {
            console.error("Auto-archive notice error:", err);
            processingRef.current.delete(actionKey);
          }
        }
      }
    });

    // 3. Permanent deletion of archived items older than 1 year (365 days)
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

    events.forEach(async (event) => {
      if (event.isArchived && event.archivedAt) {
        const archivedTime = new Date(event.archivedAt).getTime();
        if (now - archivedTime > ONE_YEAR_MS) {
          const actionKey = `delete-event-${event.id}`;
          if (processingRef.current.has(actionKey)) return;
          processingRef.current.add(actionKey);

          console.log(`Permanently purging old archived event: ${event.title}`);
          try {
            await deleteEvent(event.id);
          } catch (err) {
            console.error("Delete event error:", err);
            processingRef.current.delete(actionKey);
          }
        }
      }
    });

    notices.forEach(async (notice) => {
      if (notice.isArchived && notice.archivedAt) {
        const archivedTime = new Date(notice.archivedAt).getTime();
        if (now - archivedTime > ONE_YEAR_MS) {
          const actionKey = `delete-notice-${notice.id}`;
          if (processingRef.current.has(actionKey)) return;
          processingRef.current.add(actionKey);

          console.log(`Permanently purging old archived notice: ${notice.title}`);
          try {
            await deleteNotice(notice.id);
          } catch (err) {
            console.error("Delete notice error:", err);
            processingRef.current.delete(actionKey);
          }
        }
      }
    });

    documents.forEach(async (doc) => {
      if (doc.isArchived && doc.archivedAt) {
        const archivedTime = new Date(doc.archivedAt).getTime();
        if (now - archivedTime > ONE_YEAR_MS) {
          const actionKey = `delete-document-${doc.id}`;
          if (processingRef.current.has(actionKey)) return;
          processingRef.current.add(actionKey);

          console.log(`Permanently purging old archived document: ${doc.title}`);
          try {
            await deleteDocument(doc.id);
          } catch (err) {
            console.error("Delete document error:", err);
            processingRef.current.delete(actionKey);
          }
        }
      }
    });
  }, [isAdmin, events, notices, documents]);

  const upcomingEvents = activeEvents
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

  const handleAddEventOnDate = (date: Date) => {
    setAdminInitialEventDate(date);
    setAdminInitialTab('events');
    setAdminInitialEditItem(null);
    setIsAdminModalOpen(true);
  };

  const getSiteInfoContent = (id: string, defaultContent: string) => {
    const info = siteInfos.find(i => i.id === id);
    return info && info.content.trim() ? info.content : defaultContent;
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
              notices={activeNotices}
              documents={activeDocuments}
              isAdmin={isAdmin}
              onItemClick={handleItemClick}
              onEditItem={handleEditItem}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              events={events}
              onAddEventClick={handleAddEventOnDate}
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
              onAddEventClick={handleAddEventOnDate}
            />
          } />
          <Route path="/timetable" element={
            <TimetablePage isAdmin={isAdmin} />
          } />
          <Route path="/notices" element={
            <NoticesPage
              notices={activeNotices}
              isAdmin={isAdmin}
              onItemClick={handleItemClick}
              onEditItem={handleEditItem}
            />
          } />
          <Route path="/documents" element={
            <DocumentsPage
              documents={activeDocuments}
              isAdmin={isAdmin}
              onItemClick={handleItemClick}
              onEditItem={handleEditItem}
            />
          } />
          <Route path="/archive" element={
            <ArchivePage
              events={events}
              notices={notices}
              documents={documents}
              isAdmin={isAdmin}
              onItemClick={handleItemClick}
              onEditItem={handleEditItem}
            />
          } />
        </Routes>
      </main>

      <footer className="relative z-50 bg-[#050a14] py-8 md:py-12 border-t border-white/5">
        <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col md:flex-row justify-between items-center text-surface-dim text-xs md:text-sm font-sans gap-4 md:gap-0">
           <div className="flex items-center space-x-2 md:space-x-3">
             <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="w-5 md:w-6 opacity-100 brightness-0 invert border-white" />
             <span>&copy; 2026 KOREA RAILROAD HIGH SCHOOL</span>
           </div>
           <div className="flex space-x-4 md:space-x-6 uppercase font-space tracking-wider md:tracking-widest text-[10px] md:text-xs">
             <button onClick={() => setSiteInfoPopup({ title: '공지사항', content: getSiteInfoContent('announcements', '한국철도고등학교 학생들을 위한 지능형 학사 안내 터미널 관련 공지사항입니다.\n\n- (예시) 신규 업데이트가 있을 경우 여기에 안내됩니다.') })} className="hover:text-white transition-colors cursor-pointer text-left">공지사항</button>
             <button onClick={() => setSiteInfoPopup({ title: '업데이트', content: getSiteInfoContent('updates', '시스템 업데이트 내역:\n\n- 디자인 리뉴얼\n- 메인 학사일정 바로가기 추가\n- 데이터베이스 연동 완료') })} className="hover:text-white transition-colors cursor-pointer text-left">업데이트</button>
             <button onClick={() => setSiteInfoPopup({ title: '문의하기', content: getSiteInfoContent('contact', '개발자 연락처: hoya100304@gmail.com\n\n문의 사항이 있으시면 위 이메일로 연락주시기 바랍니다.') })} className="hover:text-white transition-colors cursor-pointer text-left">문의하기</button>
           </div>
        </div>
      </footer>

      {isAdminModalOpen && (
        <AdminPanel
          onClose={() => {
            setIsAdminModalOpen(false);
            setAdminInitialEditItem(null);
            setAdminInitialEventDate(null);
          }}
          notices={notices}
          events={events as any}
          documents={documents}
          siteInfos={siteInfos}
          initialTab={adminInitialTab as any}
          initialEditItem={adminInitialEditItem}
          initialEventDate={adminInitialEventDate}
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
