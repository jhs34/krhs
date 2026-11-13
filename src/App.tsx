import { useState, useEffect, useRef } from 'react';
import { ArrowDown, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { EventsPage } from './pages/EventsPage';
import TimetablePage from './pages/TimetablePage';
import { NoticesPage } from './pages/NoticesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ArchivePage } from './pages/ArchivePage';
import { PosPage } from './pages/PosPage';
import { ToolHubPage } from './pages/ToolHubPage';
import { Navigation } from './components/Navigation';
import { AdminPanel } from './components/AdminPanel';
import { ItemDetailPopup } from './components/ItemDetailPopup';
import { SiteInfoPopup } from './components/SiteInfoPopup';
import { AcademicEvent } from './types';
import { loginWithGoogle, auth } from './firebase';
import { subscribeToEvents, subscribeToNotices, subscribeToDocuments, subscribeToSiteInfo, Notice, SchoolDocument, SiteInfo, updateEvent, updateNotice, deleteEvent, deleteNotice, deleteDocument } from './services/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useFullscreen } from './utils/useFullscreen';
import { EASE_OUT_EXPO, PORTAL_PAGE_TRANSITION } from './utils/motion';

function getEndOfLocalDayMs(input: Date | string): number {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    const [y, m, d] = input.trim().split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  }
  const parsed = input instanceof Date ? input : new Date(input);
  if (isNaN(parsed.getTime())) return 0;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999).getTime();
}

interface HeroSectionProps {
  upcomingEvents: AcademicEvent[];
  onSelectEvent: (event: AcademicEvent) => void;
}

function HeroSection({ upcomingEvents, onSelectEvent }: HeroSectionProps) {
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const nextEvent = upcomingEvents[0] || null;
  const formatHeroDate = (d: Date) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

  return (
    <section className="relative w-full min-h-[100dvh] flex flex-col justify-between overflow-hidden">
      {/* Blurred Background with Overlays (Intentionally Preserved) */}
      <div className="absolute inset-0 z-0 bg-[#0f172a]">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: `url('${import.meta.env.BASE_URL}bg.png')`, filter: 'blur(12px)', transform: 'scale(1.05)' }}
        ></div>
        <div className="absolute inset-0 bg-[#001f3f]/70 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-primary/60"></div>
        {/* Subtle curved glow at the bottom matching the image */}
        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-[#040812] via-[#040812]/80 to-transparent"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[120%] h-[50%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary/10 via-transparent to-transparent rounded-[100%] blur-[100px]"></div>
      </div>

      {/* Top Header - Single Brand Lockup & Quiet Fullscreen Action */}
      <header className="relative z-50 w-full pt-7 sm:pt-9 px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 max-w-7xl mx-auto flex items-center justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
          className="flex items-center space-x-3 shrink-0"
        >
          <img 
            src={`${import.meta.env.BASE_URL}logo.png`} 
            alt="한국철도고등학교 로고" 
            className="w-7 md:w-8 h-auto brightness-0 invert opacity-95 block shrink-0"
          />
          <span className="inline-flex items-center font-sans font-semibold text-[22px] leading-none text-white tracking-tight whitespace-nowrap">
            한국철도고등학교
          </span>
        </motion.div>

        <motion.button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? '전체화면 종료 (ESC)' : '전체화면 모드 전환'}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.04, ease: EASE_OUT_EXPO }}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.98] text-white/85 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          aria-label={isFullscreen ? '전체화면 종료' : '전체화면 모드'}
        >
          {isFullscreen ? (
            <Minimize className="w-3.5 h-3.5 text-surface-dim shrink-0" />
          ) : (
            <Maximize className="w-3.5 h-3.5 text-surface-dim shrink-0" />
          )}
          <span className="hidden sm:inline font-sans">{isFullscreen ? '전체화면 종료' : '전체화면'}</span>
        </motion.button>
      </header>

      {/* Main Hero Content - Left-Aligned Institutional Composition */}
      <div className="relative z-10 flex flex-col justify-center flex-grow px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 max-w-7xl w-full mx-auto py-12">
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: EASE_OUT_EXPO }}
          className="max-w-3xl"
        >
          <p className="text-xs sm:text-sm text-white/65 font-medium mb-3">
            학사 안내 포털
          </p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold text-white tracking-tight leading-[1.15] font-sans mb-5 break-keep [text-wrap:balance]">
            학사일정과 주간 시간표,<br />
            학교 공지를 한곳에서
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-white/70 font-normal max-w-xl leading-relaxed break-keep mb-8">
            재학생과 교직원을 위한 한국철도고등학교 통합 학사 안내 화면입니다. 학급별 시간표와 수행평가 메모, 배부 문서를 바로 조회할 수 있습니다.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="h-11 px-5 rounded-lg bg-white text-[#040812] hover:bg-white/90 active:scale-[0.98] text-sm font-semibold transition-colors inline-flex items-center space-x-2 cursor-pointer"
            >
              <span>대시보드 바로가기</span>
              <ArrowDown className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <a
              href="#/timetable"
              className="h-11 px-5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] active:scale-[0.98] text-white border border-white/15 text-sm font-medium transition-colors inline-flex items-center cursor-pointer"
            >
              주간 시간표 조회
            </a>
          </div>
        </motion.div>
      </div>

      {/* Bottom Live Summary Strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.14, ease: EASE_OUT_EXPO }}
        className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 pb-8 sm:pb-10"
      >
        <div className="pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-white/70">
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 min-w-0">
            <span className="text-white/50 shrink-0">다음 학사일정</span>
            {nextEvent ? (
              <button
                type="button"
                onClick={() => onSelectEvent(nextEvent)}
                className="inline-flex items-center gap-2 text-left text-white hover:text-secondary-container transition-colors truncate cursor-pointer"
              >
                <span className="font-mono tabular-nums text-white/75 shrink-0">{formatHeroDate(nextEvent.date)}</span>
                <span aria-hidden="true" className="text-white/30">·</span>
                <span className="font-medium truncate">{nextEvent.title}</span>
              </button>
            ) : (
              <span className="text-white/60">예정된 일정 없음</span>
            )}
          </div>
        </div>
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
  const isPosPage = location.pathname.startsWith('/tool/pos');

  useEffect(() => {
    if (!isHome && !isPosPage && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location.pathname, isHome, isPosPage]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await user.reload();
        } catch {
          // ignore reload error if offline
        }
      }
      const effectiveEmail = (auth.currentUser?.email || user?.email || user?.providerData?.[0]?.email || '').toLowerCase().trim();
      const emailVerified = Boolean(auth.currentUser?.emailVerified ?? user?.emailVerified);
      setIsAdmin(emailVerified && (effectiveEmail === 'jhs34.kr@gmail.com' || effectiveEmail === 'hoya100304@gmail.com'));
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

    const now = Date.now();

    // 1. Auto-archive past events strictly after 23:59:59.999 of endDate (or date)
    events.forEach(async (event) => {
      if (!event.isArchived) {
        const eventEndTarget = event.endDate ? event.endDate : event.date;
        const eventEndMs = getEndOfLocalDayMs(eventEndTarget);
        if (eventEndMs > 0 && eventEndMs < now) {
          const actionKey = `archive-event-${event.id}`;
          if (processingRef.current.has(actionKey)) return;
          processingRef.current.add(actionKey);

          console.log(`Auto-archiving past academic event: ${event.title}`);
          const payload = {
            title: event.title,
            description: event.description || '',
            date: event.date.toISOString(),
            endDate: event.endDate ? event.endDate.toISOString() : event.date.toISOString(),
            color: event.color || '#3b82f6',
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

    // 2. Auto-archive expired notices strictly after 23:59:59.999 of validUntil
    notices.forEach(async (notice) => {
      if (!notice.isArchived && notice.validUntil) {
        const expirationMs = getEndOfLocalDayMs(notice.validUntil);
        if (expirationMs > 0 && expirationMs < now) {
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
            fileUrl: notice.fileUrl || '',
            fileName: notice.fileName || '',
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

  const nowForUpcoming = Date.now();
  const upcomingEvents = activeEvents
    .filter(e => getEndOfLocalDayMs(e.endDate || e.date) >= nowForUpcoming)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);

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

  if (isPosPage) {
    return <PosPage />;
  }

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-secondary selection:text-white bg-background">

      {isHome && (
        <HeroSection
          upcomingEvents={upcomingEvents}
          onSelectEvent={(ev) => handleItemClick(ev, 'event')}
        />
      )}
      
      <Navigation 
        isAdmin={isAdmin}
        hasAuthChecked={hasAuthChecked}
        setIsAdminModalOpen={setIsAdminModalOpen}
        loginWithGoogle={loginWithGoogle}
      />

      <main className="flex-grow w-full bg-primary pt-24 pb-32 overflow-x-clip">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={PORTAL_PAGE_TRANSITION}
          >
            <Routes location={location}>
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
              <Route path="/tool" element={<ToolHubPage />} />
              <Route path="/tool/pos" element={<PosPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative z-50 bg-[#03060e] py-8 md:py-10 border-t border-white/[0.08]">
        <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col md:flex-row justify-between items-center text-surface-dim text-xs sm:text-sm font-sans gap-4 md:gap-0">
           <div className="flex items-center space-x-2.5">
             <img src={`${import.meta.env.BASE_URL}logo.png`} alt="한국철도고등학교" className="w-5 h-auto opacity-85 brightness-0 invert" />
             <span>&copy; 2026 한국철도고등학교</span>
           </div>
           <div className="flex items-center space-x-5 text-xs sm:text-sm">
             <button onClick={() => setSiteInfoPopup({ title: '공지사항', content: getSiteInfoContent('announcements', '한국철도고등학교 학사 안내 포털 관련 공지사항입니다.\n\n- 신규 안내 사항이 있을 경우 이곳에 게시됩니다.') })} className="hover:text-white transition-colors cursor-pointer text-left">공지사항</button>
             <button onClick={() => setSiteInfoPopup({ title: '업데이트 내역', content: getSiteInfoContent('updates', '주요 변경 내역:\n\n- 학사일정 및 주간 시간표 조회 화면 개선\n- 공지사항 및 자료실 첨부파일 연동') })} className="hover:text-white transition-colors cursor-pointer text-left">업데이트 내역</button>
             <button onClick={() => setSiteInfoPopup({ title: '문의하기', content: getSiteInfoContent('contact', '담당자 연락처: jhs34.kr@gmail.com\n\n문의 사항이 있으시면 위 이메일로 연락주시기 바랍니다.') })} className="hover:text-white transition-colors cursor-pointer text-left">문의하기</button>
           </div>
        </div>
      </footer>

      <AnimatePresence>
        {isAdminModalOpen && (
          <AdminPanel
            key="admin-panel-modal"
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
      </AnimatePresence>

      <AnimatePresence>
        {detailItem && detailType && (
          <ItemDetailPopup
            key={`detail-popup-${detailType}-${detailItem.id || 'item'}`}
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
      </AnimatePresence>

      <AnimatePresence>
        {siteInfoPopup && (
          <SiteInfoPopup
            key={`site-info-${siteInfoPopup.title}`}
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
    <MotionConfig reducedMotion="user">
      <Router>
        <AppContent />
      </Router>
    </MotionConfig>
  );
}
