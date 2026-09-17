import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Notice, FirestoreEvent, SchoolDocument, addNotice, updateNotice, deleteNotice, addEvent, updateEvent, deleteEvent, addDocument, updateDocument, deleteDocument, subscribeToTimetableTemplates, saveTimetableTemplate } from '../services/firestore';
import { auth, logout, refreshUserProfile, deleteCurrentAccount, loginWithGoogle, getDisplayUserEmail } from '../firebase';
import { format } from 'date-fns';
import { Edit2, Trash2, Sparkles, RefreshCw, LogOut, UserX, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { SUBJECT_THEMES } from '../data/subjectThemes';

import { SiteInfo, updateSiteInfo } from '../services/firestore';
import { DEPARTMENTS, GRADES, getDefaultTimetable } from '../data/timetableTemplates';
import { ClassTimetable, TimetableTemplate } from '../types';

interface AdminPanelProps {
  onClose: () => void;
  notices: Notice[];
  events: FirestoreEvent[];
  documents: SchoolDocument[];
  siteInfos?: SiteInfo[];
  initialTab?: 'notices' | 'events' | 'documents' | 'siteInfo' | 'defaultTimetables';
  initialEditItem?: any;
  initialEventDate?: Date | null;
}

export function AdminPanel({ 
  onClose, 
  notices, 
  events, 
  documents, 
  siteInfos = [], 
  initialTab = 'notices', 
  initialEditItem = null,
  initialEventDate = null
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'notices' | 'events' | 'documents' | 'siteInfo' | 'defaultTimetables' | 'cleanup'>(initialTab);
  
  // Default Timetables tab states
  const [templateGrade, setTemplateGrade] = useState<number>(1);
  const [templateDept, setTemplateDept] = useState<string>('railway_machinery');
  const [templateClass, setTemplateClass] = useState<number>(1);
  const [templateDay, setTemplateDay] = useState<number>(0); // 0 = Mon, 4 = Fri
  const [templates, setTemplates] = useState<TimetableTemplate[]>([]);
  const [editedTimetable, setEditedTimetable] = useState<ClassTimetable>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'notices' | 'events' | 'documents'; title: string } | null>(null);


  const getDeleteTitle = (id: string, type: 'notices' | 'events' | 'documents') => {
    if (type === 'notices') {
      return notices.find(n => n.id === id)?.title || '공지사항';
    } else if (type === 'events') {
      return events.find(e => e.id === id)?.title || '학사일정';
    } else if (type === 'documents') {
      return documents.find(d => d.id === id)?.title || '자료실';
    }
    return '';
  };

  const triggerDeleteConfirm = (id: string, type: 'notices' | 'events' | 'documents') => {
    const itemTitle = getDeleteTitle(id, type);
    setDeleteTarget({ id, type, title: itemTitle });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'notices') {
        await deleteNotice(deleteTarget.id);
      } else if (deleteTarget.type === 'events') {
        await deleteEvent(deleteTarget.id);
      } else if (deleteTarget.type === 'documents') {
        await deleteDocument(deleteTarget.id);
      }
      
      if (editingId === deleteTarget.id) {
        resetForm();
      }
      setNotification({ message: '성공적으로 삭제되었습니다.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setNotification({ message: '삭제 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setDeleteTarget(null);
    }
  };

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(() => 
    initialEventDate 
      ? format(initialEventDate, 'yyyy-MM-dd') 
      : format(new Date(), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(() => 
    initialEventDate 
      ? format(initialEventDate, 'yyyy-MM-dd') 
      : format(new Date(), 'yyyy-MM-dd')
  );
  const [eventColor, setEventColor] = useState('#64ffda'); // A default cyan color matching the secondary theme
  const [isHoliday, setIsHoliday] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [validUntil, setValidUntil] = useState('');
  
  const presetColors = [
    '#ef4444', // red
    '#f472b6', // pink
    '#a78bfa', // purple
    '#60a5fa', // blue
    '#64ffda', // cyan
    '#34d399', // green
    '#fbbf24', // yellow
    '#9ca3af', // gray
    '#ffffff', // white
  ];
  
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Cleanup tab states
  const [cleanupStatus, setCleanupStatus] = useState<{ loading: boolean; message: string | null; error: boolean }>({ loading: false, message: null, error: false });

  // Reset form when tab changes
  useEffect(() => {
    resetForm();
    setNotification(null);
  }, [activeTab]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setDate(initialEventDate ? format(initialEventDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setEndDate(initialEventDate ? format(initialEventDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setEventColor('#64ffda');
    setIsHoliday(false);
    setIsArchived(false);
    setValidUntil('');
  };

  const safeParseDate = (dString: string | undefined | null) => {
    if (!dString) return format(new Date(), 'yyyy-MM-dd');
    const d = new Date(dString);
    return isNaN(d.getTime()) ? format(new Date(), 'yyyy-MM-dd') : format(d, 'yyyy-MM-dd');
  };

  const handleEdit = (item: any, type: 'notice' | 'event' | 'document') => {
    setEditingId(item.id);
    setTitle(item.title);
    setIsArchived(item.isArchived || false);
    if (type === 'event') {
      setContent(item.description);
      setDate(safeParseDate(item.date));
      setEndDate(safeParseDate(item.endDate || item.date));
      setEventColor(item.color || '#64ffda');
      setIsHoliday(item.isHoliday || false);
    } else if (type === 'notice') {
      setContent(item.content);
      setDate(safeParseDate(item.date));
      setValidUntil(item.validUntil ? safeParseDate(item.validUntil) : '');
    } else if (type === 'document') {
      setContent(item.description);
    }
  };

  useEffect(() => {
    if (initialEventDate && !editingId) {
      setDate(format(initialEventDate, 'yyyy-MM-dd'));
      setEndDate(format(initialEventDate, 'yyyy-MM-dd'));
    }
  }, [initialEventDate, editingId]);

  useEffect(() => {
    if (initialEditItem) {
      handleEdit(initialEditItem, initialTab === 'notices' ? 'notice' : initialTab === 'events' ? 'event' : 'document');
    }
  }, [initialEditItem, initialTab]);

  useEffect(() => {
    if (activeTab === 'siteInfo') {
      const selectedId = editingId || 'announcements';
      const info = siteInfos.find(i => i.id === selectedId);
      setContent(info ? info.content : '');
      setTitle(selectedId === 'announcements' ? '공지사항' : selectedId === 'updates' ? '업데이트' : '문의하기');
    }
  }, [activeTab, editingId, siteInfos]);

  // Timetable templates subscription & loaders
  useEffect(() => {
    if (activeTab === 'defaultTimetables') {
      const unsubscribe = subscribeToTimetableTemplates((data) => {
        setTemplates(data);
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

  // Auto-lock class choice in AdminPanel when department changes
  useEffect(() => {
    const deptInfo = DEPARTMENTS.find(d => d.id === templateDept);
    if (deptInfo && !deptInfo.classes.includes(templateClass)) {
      setTemplateClass(deptInfo.classes[0]);
    }
  }, [templateDept, templateClass]);

  useEffect(() => {
    if (activeTab === 'defaultTimetables') {
      const match = templates.find(t => t.grade === templateGrade && t.department === templateDept && t.classNumber === templateClass);
      if (match) {
        try {
          setEditedTimetable(JSON.parse(match.rawTimetable) as ClassTimetable);
        } catch (e) {
          console.error('Failed to parse rawTimetable', e);
        }
      } else {
        setEditedTimetable(getDefaultTimetable(templateGrade, templateDept, templateClass));
      }
    }
  }, [templateGrade, templateDept, templateClass, templates, activeTab]);

  const handleUpdateTemplateSlot = (day: number, period: number, field: 'subject' | 'teacher', value: string) => {
    setEditedTimetable(prev => {
      const updated = { ...prev };
      if (!updated[day]) updated[day] = {};
      if (!updated[day][period]) {
        updated[day][period] = { subject: '', teacher: '' };
      }
      updated[day][period] = {
        ...updated[day][period],
        [field]: value
      };
      return updated;
    });
  };

  const handleSaveTemplate = async () => {
    const templateId = `${templateGrade}_${templateDept}_${templateClass}`;
    try {
      await saveTimetableTemplate(templateId, {
        grade: templateGrade,
        department: templateDept,
        classNumber: templateClass,
        rawTimetable: JSON.stringify(editedTimetable)
      });
      setNotification({ message: '기본 반복 시간표가 저장되었습니다.', type: 'success' });
    } catch (err) {
      console.error(err);
      setNotification({ message: '시간표 저장에 실패했습니다.', type: 'error' });
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== 'siteInfo' && !title) return;
    
    if (activeTab === 'events' && (!date || !endDate)) return;
    if (activeTab === 'notices' && !date) return;
    if (activeTab === 'documents' && !title) return;

    try {
      if (activeTab === 'notices') {
        const payload: Omit<Notice, 'id' | 'createdAt'> = {
          title,
          content,
          date: new Date(date).toISOString(),
          isArchived,
          archivedAt: isArchived ? (notices.find(n => n.id === editingId)?.archivedAt || new Date().toISOString()) : '',
          validUntil: validUntil ? new Date(validUntil).toISOString() : '',
        };
        if (editingId) await updateNotice(editingId, payload);
        else await addNotice(payload);
      } else if (activeTab === 'events') {
        const payload: Omit<FirestoreEvent, 'id' | 'createdAt'> = {
          title,
          description: content,
          date: new Date(date).toISOString(),
          endDate: new Date(endDate).toISOString(),
          color: eventColor,
          isHoliday,
          isArchived,
          archivedAt: isArchived ? (events.find(e => e.id === editingId)?.archivedAt || new Date().toISOString()) : '',
        };
        if (editingId) await updateEvent(editingId, payload);
        else await addEvent(payload);
      } else if (activeTab === 'documents') {
        const payload: Omit<SchoolDocument, 'id' | 'createdAt'> = {
          title,
          description: content,
          isArchived,
          archivedAt: isArchived ? (documents.find(d => d.id === editingId)?.archivedAt || new Date().toISOString()) : '',
        };
        if (editingId) await updateDocument(editingId, payload);
        else await addDocument(payload);
      } else if (activeTab === 'siteInfo') {
        const idToSave = editingId || 'announcements';
        await updateSiteInfo(idToSave, content);
      }
      if (activeTab !== 'siteInfo') resetForm();
      setNotification({ message: '성공적으로 저장되었습니다.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      let errorMessage = '저장 중 오류가 발생했습니다.';
      try {
        if (err.message) {
          const parsed = JSON.parse(err.message);
          errorMessage = `저장 실패: ${parsed.error}`;
        }
      } catch (e) {
        if (err.message) errorMessage = `저장 실패: ${err.message}`;
      }
      setNotification({ message: errorMessage, type: 'error' });
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const handleSwitchAccount = async () => {
    try {
      await logout();
      onClose();
      await loginWithGoogle();
    } catch (e) {
      console.error('Account switch error:', e);
    }
  };

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const handleDeleteCurrentAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteCurrentAccount();
      setNotification({ type: 'success', message: '현재 계정이 Firebase에서 완전히 삭제되었습니다. 새 계정으로 로그인해 주세요.' });
      setShowLogoutConfirm(false);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Delete account error:', err);
      if (err.code === 'auth/requires-recent-login') {
        setNotification({ type: 'error', message: '보안을 위해 재인증이 필요합니다. 먼저 [로그아웃] 후 다시 로그인하신 직후에 삭제를 실행해 주세요.' });
      } else {
        setNotification({ type: 'error', message: `계정 삭제 실패: ${err.message || '알 수 없는 오류'}` });
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 0.95, opacity: 0, filter: 'blur(10px)' }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a1120] border border-white/10 w-full max-w-4xl h-[88vh] max-h-[840px] min-h-[520px] rounded-2xl md:rounded-3xl overflow-hidden flex flex-col relative shadow-2xl"
      >
        {notification && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs md:text-sm font-bold shadow-lg z-50 flex items-center space-x-2 transition-all ${
            notification.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
          }`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="opacity-80 hover:opacity-100 ml-2">&times;</button>
          </div>
        )}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg md:text-2xl font-bold text-white">관리자 패널</h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
                PORTAL ADMIN
              </span>
            </div>
            {auth.currentUser && (
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-xs text-secondary/90 font-mono">
                  접속 계정: {getDisplayUserEmail(auth.currentUser.email || auth.currentUser.providerData?.[0]?.email) || '로그인됨'}
                </p>
                <button
                  type="button"
                  title="구글 계정 정보(이메일) 최신 동기화"
                  onClick={async () => {
                    const u = await refreshUserProfile();
                    if (u?.email) {
                      setNotification({ type: 'success', message: `계정 정보가 최신(${u.email})으로 갱신되었습니다.` });
                    } else {
                      setNotification({ type: 'success', message: '계정 정보가 갱신되었습니다.' });
                    }
                  }}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-secondary hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex space-x-2 md:space-x-4">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-white bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors font-bold"
            >
              로그아웃
            </button>
            <button
              onClick={onClose}
              className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-surface-dim hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors font-bold"
            >
              닫기
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Sidebar */}
          <div className="w-full md:w-52 border-b md:border-b-0 md:border-r border-white/10 flex flex-row md:flex-col p-2 md:p-4 space-x-2 md:space-x-0 space-y-0 md:space-y-2 shrink-0 overflow-x-auto md:overflow-y-auto scrollbar-hide">
            {[
              { id: 'notices', label: '공지사항 관리' },
              { id: 'events', label: '학사일정 관리' },
              { id: 'documents', label: '자료실 관리' },
              { id: 'siteInfo', label: '기타 정보 관리', onSelect: () => setEditingId('announcements') },
              { id: 'defaultTimetables', label: '기본 시간표 관리' },
              { id: 'cleanup', label: '시스템 데이터 정리' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.onSelect) tab.onSelect();
                  }}
                  className={`relative p-2 md:p-3 text-center md:text-left rounded-lg md:rounded-xl font-medium text-xs md:text-sm whitespace-nowrap shrink-0 flex-1 md:flex-none transition-colors duration-200 ${
                    isActive ? 'text-white font-bold' : 'text-surface-dim hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="admin-active-tab-indicator"
                      className="absolute inset-0 bg-white/15 rounded-lg md:rounded-xl border border-white/15 shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-y-auto p-3 md:p-6 bg-black/20 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex-1 flex flex-col"
              >
            {activeTab === 'cleanup' ? (
              <div className="flex flex-col space-y-6">
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-4">
                  <h3 className="text-base md:text-lg font-bold text-white">대규모 백그라운드 데이터 정리</h3>
                  <p className="text-sm text-surface-dim leading-relaxed">
                    시스템 성능 유지를 위해 오래된 데이터를 백엔드 서버(Node.js)를 통해 일괄 삭제합니다.<br/><br/>
                    - 삭제 대상: 1년(365일)이 지난 보관함 데이터(하이라이트 제외)<br/>
                    - 주의: 이 작업은 서버 백그라운드에서 실행되며 복구할 수 없습니다.
                  </p>
                  
                  {cleanupStatus.message && (
                    <div className={`p-3 rounded-lg text-sm font-medium ${cleanupStatus.error ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'}`}>
                      {cleanupStatus.message}
                    </div>
                  )}

                  {!cleanupStatus.loading && cleanupStatus.message === null && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                      <p className="text-xs text-red-300 font-medium">정말 삭제하시겠습니까? 삭제 후에는 데이터를 복구할 수 없습니다.</p>
                    </div>
                  )}
                  
                  <button
                    disabled={cleanupStatus.loading}
                    onClick={async () => {
                      setCleanupStatus({ loading: true, message: null, error: false });
                      try {
                        const res = await fetch('/api/admin/cleanup', { method: 'POST' });
                        const data = await res.json();
                        if (data.success) {
                          setCleanupStatus({ 
                            loading: false, 
                            message: `데이터 정리가 완료되었습니다. (보관함: ${data.details.archivesDeleted}건 삭제)`, 
                            error: false 
                          });
                        } else {
                          setCleanupStatus({ 
                            loading: false, 
                            message: `정리 실패: ${data.error}`, 
                            error: true 
                          });
                        }
                      } catch (err) {
                        setCleanupStatus({ 
                          loading: false, 
                          message: '정리 중 서버 오류가 발생했습니다. (자세한 내용은 콘솔 확인)', 
                          error: true 
                        });
                        console.error(err);
                      }
                    }}
                    className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors"
                  >
                    {cleanupStatus.loading ? '처리 중...' : '지금 데이터 정리 실행'}
                  </button>
                </div>
              </div>
            ) : activeTab === 'defaultTimetables' ? (
              <div className="flex flex-col space-y-6">
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-4">
                  <h3 className="text-base md:text-lg font-bold text-white">학급별 기본 반복 시간표 관리</h3>
                  <p className="text-xs text-surface-dim">
                    학년, 학과, 반을 선택하여 학기 내내 반복될 기본 시간표를 입력하고 수정하십시오. 이 설정은 주간 메모가 등록되지 않은 기본 레이아웃으로 전체 학생 화면에 표시됩니다.
                  </p>
                  
                  {/* Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-bold text-surface-dim pl-1">학년</label>
                      <select
                        value={templateGrade}
                        onChange={(e) => setTemplateGrade(Number(e.target.value))}
                        className="bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs md:text-sm focus:border-secondary transition-colors"
                      >
                        {GRADES.map(g => (
                          <option key={g} value={g}>{g}학년</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-bold text-surface-dim pl-1">학과</label>
                      <select
                        value={templateDept}
                        onChange={(e) => setTemplateDept(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs md:text-sm focus:border-secondary transition-colors"
                      >
                        {DEPARTMENTS.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-bold text-surface-dim pl-1">학급 반</label>
                      <select
                        value={templateClass}
                        onChange={(e) => setTemplateClass(Number(e.target.value))}
                        className="bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs md:text-sm focus:border-secondary transition-colors"
                      >
                        {(() => {
                          const deptInfo = DEPARTMENTS.find(d => d.id === templateDept);
                          const classes = deptInfo ? deptInfo.classes : [1];
                          return classes.map(c => (
                            <option key={c} value={c}>{c}반</option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Day navigation tabs */}
                <div className="flex space-x-1.5 bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto select-none shrink-0 scrollbar-hide">
                  {['월요일', '화요일', '수요일', '목요일', '금요일'].map((dayName, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTemplateDay(idx)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center whitespace-nowrap px-2 ${
                        templateDay === idx
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-surface-dim hover:text-white'
                      }`}
                    >
                      {dayName}
                    </button>
                  ))}
                </div>

                {/* Slot editor grid */}
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-xs font-bold text-secondary-fixed">
                      {['월', '화', '수', '목', '금'][templateDay]}요일 시간표 세부 설정
                    </span>
                    <span className="text-[10px] text-surface-dim/70">
                      * 금요일은 4교시까지만 등록되며, 일반 요일은 7교시까지 설정할 수 있습니다.
                    </span>
                  </div>

                  <div className="space-y-4">
                    {Array.from({ length: templateDay === 4 ? 4 : 7 }, (_, pIdx) => {
                      const periodNum = pIdx + 1;
                      const slotData = editedTimetable[templateDay]?.[periodNum] || { subject: '', teacher: '' };

                      return (
                        <div key={periodNum} className="border-b border-white/5 pb-4 last:border-b-0 last:pb-0">
                          <div className="grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-2 text-xs font-black text-white/70 pl-1">
                              {periodNum}교시
                            </div>
                            
                            <div className="col-span-5 flex flex-col space-y-1">
                              <input
                                type="text"
                                placeholder="과목명"
                                value={slotData.subject}
                                onChange={(e) => handleUpdateTemplateSlot(templateDay, periodNum, 'subject', e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs md:text-sm focus:border-secondary outline-none transition-colors"
                              />
                            </div>

                            <div className="col-span-5 flex flex-col space-y-1">
                              <input
                                type="text"
                                placeholder="교사이름"
                                value={slotData.teacher}
                                onChange={(e) => handleUpdateTemplateSlot(templateDay, periodNum, 'teacher', e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs md:text-sm focus:border-secondary outline-none transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      className="px-6 py-2.5 rounded-lg font-bold text-xs md:text-sm text-white bg-secondary hover:bg-secondary/80 hover:scale-[1.01] transition-all shadow-md shadow-secondary/10"
                    >
                      {templateGrade}학년 {DEPARTMENTS.find(d => d.id === templateDept)?.name} {templateClass}반 기본 시간표 전체 저장
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <>
                {/* Form */}
                <form onSubmit={handleSubmit} className="mb-4 md:mb-8 p-3 md:p-6 bg-white/5 rounded-xl md:rounded-2xl border border-white/5 space-y-2 md:space-y-4 shrink-0">

              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="text-base md:text-lg font-bold text-white">
                  {activeTab === 'siteInfo' ? '기타 정보 수정' : editingId ? '수정하기' : '새로 추가하기'}
                </h3>
                {(editingId && activeTab !== 'siteInfo') && (
                  <button type="button" onClick={resetForm} className="text-[10px] md:text-xs text-secondary-fixed-dim hover:underline">
                    취소 (새로 추가로 돌아가기)
                  </button>
                )}
              </div>
              
              {activeTab === 'siteInfo' ? (
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] md:text-xs text-surface-dim">수정할 항목</label>
                  <select
                    value={editingId || 'announcements'}
                    onChange={(e) => setEditingId(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors"
                  >
                    <option value="announcements">공지사항</option>
                    <option value="updates">업데이트</option>
                    <option value="contact">문의하기</option>
                  </select>
                </div>
              ) : (
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] md:text-xs text-surface-dim">제목</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="bg-black/40 border border-white/10 rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors"
                  />
                </div>
              )}

              {activeTab === 'events' ? (
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] md:text-xs text-surface-dim">시작 날짜</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        if (e.target.value > endDate) setEndDate(e.target.value);
                      }}
                      required
                      className="bg-black/40 border border-white/10 rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] md:text-xs text-surface-dim">종료 날짜</label>
                    <input
                      type="date"
                      value={endDate}
                      min={date}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="bg-black/40 border border-white/10 rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex flex-col space-y-1 mt-1 md:mt-2 col-span-2">
                    <label className="text-[10px] md:text-xs text-surface-dim">일정 색상</label>
                    <div className="flex space-x-2 md:space-x-3">
                      {presetColors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEventColor(c)}
                          className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 transition-transform ${eventColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-2 md:mt-3 col-span-2">
                    <input
                      type="checkbox"
                      id="isHoliday"
                      checked={isHoliday}
                      onChange={(e) => setIsHoliday(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-black/40 text-secondary focus:ring-secondary/30 focus:ring-offset-0 focus:ring-2 outline-none cursor-pointer"
                    />
                    <label htmlFor="isHoliday" className="text-xs md:text-sm text-white font-medium cursor-pointer select-none">
                      공휴일로 지정 (달력에서 날짜를 빨간색으로 표시)
                    </label>
                  </div>
                </div>
              ) : activeTab === 'notices' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] md:text-xs text-surface-dim">날짜</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="bg-black/40 border border-white/10 rounded-md md:rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors w-full [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] md:text-xs text-surface-dim">유효 기간 (지나면 자동 보관함 이동 - 선택사항)</label>
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-md md:rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors w-full [color-scheme:dark]"
                    />
                  </div>
                </div>
              ) : null}
              
              {activeTab !== 'siteInfo' && (
                <div className="flex items-center space-x-2 p-3 bg-white/5 border border-white/5 rounded-lg">
                  <input
                    type="checkbox"
                    id="isArchived"
                    checked={isArchived}
                    onChange={(e) => setIsArchived(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-black/40 text-secondary focus:ring-secondary/30 focus:ring-offset-0 focus:ring-2 outline-none cursor-pointer"
                  />
                  <label htmlFor="isArchived" className="text-xs md:text-sm text-white font-medium cursor-pointer select-none">
                    보관함으로 이동 (체크 시 일반 검색 및 기존 목록에서 제외되며 보관함에 저징됨)
                  </label>
                </div>
              )}
              
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] md:text-xs text-surface-dim">내용 / 설명</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={activeTab === 'siteInfo' ? 8 : 3}
                  className="bg-black/40 border border-white/10 rounded-md md:rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg font-bold text-sm text-white transition-colors bg-secondary hover:bg-secondary/80 w-full sm:w-auto text-center"
                >
                  {activeTab === 'siteInfo' ? '저장하기' : editingId ? '수정 완료' : '추가하기'}
                </button>
                
                {(editingId && activeTab !== 'siteInfo') && (
                  <button
                    type="button"
                    onClick={() => triggerDeleteConfirm(editingId, activeTab)}
                    className="px-4 py-2.5 rounded-lg font-bold text-sm text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 transition-colors flex items-center justify-center space-x-1.5 w-full sm:w-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>이 항목 삭제하기</span>
                  </button>
                )}
              </div>
            </form>

            {(activeTab !== 'siteInfo') && (
              <div className="shrink-0 pr-0 md:pr-2">
                <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4">
                  등록된 {activeTab === 'notices' ? '공지사항' : activeTab === 'events' ? '학사일정' : '자료실'} 목록
                </h3>
                <ul className="space-y-3">
                {activeTab === 'notices' && notices.map(notice => (
                  <li key={notice.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-sm font-bold text-white mb-1 truncate">{notice.title}</div>
                      <div className="text-xs text-surface-dim">{safeParseDate(notice.date)}</div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button onClick={() => handleEdit(notice, 'notice')} className="text-surface-dim hover:text-white p-2 bg-white/5 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => triggerDeleteConfirm(notice.id, 'notices')} className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
                {activeTab === 'events' && events.map(event => (
                  <li key={event.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                    <div className="w-3 h-3 rounded-full mr-3 shrink-0" style={{ backgroundColor: event.color || '#64ffda' }} />
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-sm font-bold text-white mb-1 truncate">{event.title}</div>
                      <div className="text-xs text-surface-dim">
                        {safeParseDate(event.date)} {event.endDate && safeParseDate(event.endDate) !== safeParseDate(event.date) ? `~ ${safeParseDate(event.endDate)}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button onClick={() => handleEdit(event, 'event')} className="text-surface-dim hover:text-white p-2 bg-white/5 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => triggerDeleteConfirm(event.id, 'events')} className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
                {activeTab === 'documents' && documents.map(doc => {
                  const fileCount = doc.files ? doc.files.length : (doc.fileName ? 1 : 0);
                  const displayFileName = fileCount > 1 ? `${doc.files![0].name} 외 ${fileCount - 1}건` : (doc.files && fileCount === 1 ? doc.files[0].name : doc.fileName);
                  return (
                    <li key={doc.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="text-sm font-bold text-white mb-1 truncate">{doc.title}</div>
                        <div className="text-xs text-surface-dim truncate">{displayFileName}</div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button onClick={() => handleEdit(doc, 'document')} className="text-surface-dim hover:text-white p-2 bg-white/5 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => triggerDeleteConfirm(doc.id, 'documents')} className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
                </ul>
              </div>
            )}
            </>
          )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Logout / Account Management Modal */}
        {showLogoutConfirm && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md rounded-3xl">
            <div className="bg-[#0a1120] border border-white/20 w-full max-w-md p-6 rounded-2xl flex flex-col items-center shadow-2xl relative">
              <div className="w-12 h-12 rounded-2xl bg-secondary/15 border border-secondary/30 flex items-center justify-center mb-3 text-secondary">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-lg md:text-xl font-black text-white mb-1 text-center">계정 관리 및 로그아웃</h3>
              <p className="text-xs text-surface-dim mb-4 text-center">
                현재 접속: <span className="text-secondary font-bold font-mono">{getDisplayUserEmail(auth.currentUser?.email) || '알 수 없음'}</span>
              </p>

              <div className="w-full flex flex-col space-y-2.5 mb-4">
                {/* Switch Google Account */}
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="w-full py-3 px-4 rounded-xl text-xs md:text-sm font-bold bg-secondary hover:bg-secondary/90 text-white flex items-center justify-between transition-all shadow-md shadow-secondary/20 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>다른 구글 계정으로 전환 (추천)</span>
                  </div>
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-normal">계정 선택창 열기</span>
                </button>

                {/* Normal Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold bg-white/10 hover:bg-white/15 text-white flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <LogOut className="w-4 h-4 text-surface-dim" />
                    <span>단순 로그아웃</span>
                  </div>
                  <span className="text-[10px] text-surface-dim font-normal">세션 종료</span>
                </button>

                {/* Permanent Firebase Account Delete */}
                <div className="pt-2 border-t border-white/10 flex flex-col space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-[11px] text-red-400 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>파이어베이스 계정 완전 삭제</span>
                  </div>
                  <p className="text-[10px] text-surface-dim leading-relaxed">
                    현재 구글 계정 정보를 Firebase 인증 시스템에서 완전히 삭제합니다. 삭제 후 새 계정으로 언제든지 다시 로그인할 수 있습니다.
                  </p>
                  <button
                    type="button"
                    disabled={isDeletingAccount}
                    onClick={handleDeleteCurrentAccount}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 hover:text-red-200 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>{isDeletingAccount ? '삭제 진행 중...' : '현재 계정 Firebase에서 영구 삭제'}</span>
                  </button>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
              >
                취소하고 돌아가기
              </button>
            </div>
          </div>
        )}

        {/* Custom Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md rounded-2xl md:rounded-3xl">
            <div className="bg-[#0a1120] border border-white/20 w-full max-w-md p-6 rounded-2xl flex flex-col items-center shadow-2xl relative">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 text-center">정말 삭제하시겠습니까?</h3>
              <div className="w-full bg-white/5 border border-white/5 rounded-xl p-3 mb-4 text-center">
                <p className="text-xs text-surface-dim mb-0.5">삭제 대상 이름</p>
                <p className="text-sm text-white font-bold truncate">{deleteTarget.title}</p>
              </div>
              <p className="text-xs md:text-sm text-surface-dim mb-6 text-center">
                이 작업은 되돌릴 수 없으며, 해당 데이터가 데이터베이스에서 영구적으로 완전히 삭제됩니다.
              </p>
              <div className="flex w-full space-x-3">
                <button 
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 md:py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  취소
                </button>
                <button 
                  type="button"
                  onClick={executeDelete}
                  className="flex-1 py-2.5 md:py-3 rounded-xl font-bold text-sm bg-red-600/90 hover:bg-red-600 text-white transition-colors shadow-lg shadow-red-900/20"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
