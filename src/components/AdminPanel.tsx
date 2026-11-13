import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Notice, FirestoreEvent, SchoolDocument, addNotice, updateNotice, deleteNotice, addEvent, updateEvent, deleteEvent, addDocument, updateDocument, deleteDocument, subscribeToTimetableTemplates, saveTimetableTemplate } from '../services/firestore';
import { auth, logout, refreshUserProfile, deleteCurrentAccount, loginWithGoogle, getDisplayUserEmail } from '../firebase';
import { format } from 'date-fns';
import { Edit2, Trash2, RefreshCw, LogOut, UserX, ArrowRightLeft, Plus, X } from 'lucide-react';

import { SiteInfo, updateSiteInfo } from '../services/firestore';
import { DEPARTMENTS, GRADES, getDefaultTimetable } from '../data/timetableTemplates';
import { ClassTimetable, TimetableTemplate } from '../types';
import { EASE_OUT_EXPO, MODAL_BACKDROP_TRANSITION, MODAL_PANEL_TRANSITION, NAV_SPRING_TRANSITION } from '../utils/motion';

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
  const [activeTab, setActiveTab] = useState<'notices' | 'events' | 'documents' | 'siteInfo' | 'defaultTimetables'>(initialTab);
  
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
  const [eventColor, setEventColor] = useState('#3b82f6');
  const [isHoliday, setIsHoliday] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [validUntil, setValidUntil] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; url: string }>>([]);
  
  const presetColors = [
    '#3b82f6', // blue
    '#0ea5e9', // sky
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#f59e0b', // amber
    '#f97316', // orange
    '#ef4444', // red
    '#94a3b8', // slate
    '#ffffff', // white
  ];
  
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

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
    setEventColor('#3b82f6');
    setIsHoliday(false);
    setIsArchived(false);
    setValidUntil('');
    setLinkUrl('');
    setAttachedFiles([]);
  };

  const safeParseDate = (dString: string | Date | undefined | null) => {
    if (!dString) return format(new Date(), 'yyyy-MM-dd');
    if (typeof dString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dString.trim())) {
      return dString.trim();
    }
    const d = dString instanceof Date ? dString : new Date(dString);
    return isNaN(d.getTime()) ? format(new Date(), 'yyyy-MM-dd') : format(d, 'yyyy-MM-dd');
  };

  const formatDotDate = (dString: string | Date | undefined | null) =>
    safeParseDate(dString).replace(/-/g, '.');

  const dateInputToIso = (ymd: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim())) {
      const [y, m, d] = ymd.trim().split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
    }
    const parsed = new Date(ymd);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  };

  const normalizeExternalUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed.slice(0, 2000);
    return `https://${trimmed}`.slice(0, 2000);
  };

  const deriveFileNameFromUrl = (url: string, index: number) => {
    try {
      const parsed = new URL(url);
      const lastSegment = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
      if (lastSegment && lastSegment.length <= 120) return lastSegment;
    } catch {
      // fallback below
    }
    return `첨부파일_${index + 1}`;
  };

  const handleAddAttachmentRow = () => {
    if (attachedFiles.length >= 10) return;
    setAttachedFiles(prev => [...prev, { name: '', url: '' }]);
  };

  const handleUpdateAttachmentRow = (idx: number, field: 'name' | 'url', value: string) => {
    setAttachedFiles(prev => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const handleRemoveAttachmentRow = (idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEdit = (item: any, type: 'notice' | 'event' | 'document') => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setIsArchived(Boolean(item.isArchived));
    if (type === 'event') {
      setContent(item.description || '');
      setDate(safeParseDate(item.date));
      setEndDate(safeParseDate(item.endDate || item.date));
      setEventColor(item.color || '#3b82f6');
      setIsHoliday(Boolean(item.isHoliday));
      setLinkUrl('');
      setAttachedFiles([]);
    } else if (type === 'notice') {
      setContent(item.content || '');
      setDate(safeParseDate(item.date));
      setValidUntil(item.validUntil ? safeParseDate(item.validUntil) : '');
      setLinkUrl(item.link || '');
      if (Array.isArray(item.files) && item.files.length > 0) {
        setAttachedFiles(item.files.map((f: any) => ({ name: f.name || '', url: f.url || '' })));
      } else if (item.fileUrl) {
        setAttachedFiles([{ name: item.fileName || '첨부파일', url: item.fileUrl }]);
      } else {
        setAttachedFiles([]);
      }
    } else if (type === 'document') {
      setContent(item.description || '');
      setLinkUrl(item.link || '');
      if (Array.isArray(item.files) && item.files.length > 0) {
        setAttachedFiles(item.files.map((f: any) => ({ name: f.name || '', url: f.url || '' })));
      } else if (item.fileUrl) {
        setAttachedFiles([{ name: item.fileName || '첨부파일', url: item.fileUrl }]);
      } else {
        setAttachedFiles([]);
      }
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
      const sanitizedFiles = attachedFiles
        .map((f, idx) => {
          const normalizedUrl = normalizeExternalUrl(f.url);
          if (!normalizedUrl) return null;
          const cleanName = (f.name.trim() || deriveFileNameFromUrl(normalizedUrl, idx)).slice(0, 500);
          return { name: cleanName, url: normalizedUrl };
        })
        .filter((f): f is { name: string; url: string } => f !== null)
        .slice(0, 10);
      const normalizedLink = normalizeExternalUrl(linkUrl);

      if (activeTab === 'notices') {
        const payload: Omit<Notice, 'id' | 'createdAt'> = {
          title: title.trim().slice(0, 200),
          content: content.slice(0, 10000),
          date: dateInputToIso(date),
          isArchived,
          archivedAt: isArchived ? (notices.find(n => n.id === editingId)?.archivedAt || new Date().toISOString()) : '',
          validUntil: validUntil ? dateInputToIso(validUntil) : '',
          link: normalizedLink,
          files: sanitizedFiles,
          fileUrl: sanitizedFiles[0]?.url || '',
          fileName: sanitizedFiles[0]?.name || '',
        };
        if (editingId) await updateNotice(editingId, payload);
        else await addNotice(payload);
      } else if (activeTab === 'events') {
        const payload: Omit<FirestoreEvent, 'id' | 'createdAt'> = {
          title: title.trim().slice(0, 200),
          description: content.slice(0, 1000),
          date: dateInputToIso(date),
          endDate: dateInputToIso(endDate),
          color: eventColor,
          isHoliday,
          isArchived,
          archivedAt: isArchived ? (events.find(e => e.id === editingId)?.archivedAt || new Date().toISOString()) : '',
        };
        if (editingId) await updateEvent(editingId, payload);
        else await addEvent(payload);
      } else if (activeTab === 'documents') {
        const payload: Omit<SchoolDocument, 'id' | 'createdAt'> = {
          title: title.trim().slice(0, 200),
          description: content.slice(0, 10000),
          link: normalizedLink,
          files: sanitizedFiles,
          fileUrl: sanitizedFiles[0]?.url || '',
          fileName: sanitizedFiles[0]?.name || '',
          isArchived,
          archivedAt: isArchived ? (documents.find(d => d.id === editingId)?.archivedAt || new Date().toISOString()) : '',
        };
        if (editingId) await updateDocument(editingId, payload);
        else await addDocument(payload);
      } else if (activeTab === 'siteInfo') {
        const idToSave = editingId || 'announcements';
        await updateSiteInfo(idToSave, content.slice(0, 10000));
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={MODAL_BACKDROP_TRANSITION}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.97, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.97, y: 8, opacity: 0 }}
        transition={MODAL_PANEL_TRANSITION}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a1120] border border-white/10 w-full max-w-4xl h-[88vh] max-h-[840px] min-h-[520px] rounded-2xl overflow-hidden flex flex-col relative shadow-2xl"
      >
        <AnimatePresence>
          {notification && (
            <motion.div
              key={`${notification.type}-${notification.message}`}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
              className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold shadow-xl z-50 flex items-center space-x-2.5 border ${
                notification.type === 'success'
                  ? 'bg-[#0f182b] border-secondary/50 text-white'
                  : 'bg-[#0f182b] border-rose-500/40 text-rose-200'
              }`}
            >
              <span>{notification.message}</span>
              <button onClick={() => setNotification(null)} className="text-surface-dim hover:text-white ml-1 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-white">관리자 패널</h2>
            {auth.currentUser && (
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-xs text-secondary-container font-mono">
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
                  className="p-1 rounded bg-white/[0.05] hover:bg-white/[0.12] text-secondary-container hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex space-x-2 md:space-x-3">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-red-300 hover:text-white bg-red-500/15 hover:bg-red-600 border border-red-500/30 rounded-lg transition-colors font-semibold cursor-pointer whitespace-nowrap"
            >
              로그아웃
            </button>
            <button
              onClick={onClose}
              className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-surface-dim hover:text-white bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 rounded-lg transition-colors font-semibold cursor-pointer whitespace-nowrap"
            >
              닫기
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Sidebar */}
          <div className="w-full md:w-52 border-b md:border-b-0 md:border-r border-white/[0.08] flex flex-row md:flex-col p-2 md:p-4 space-x-2 md:space-x-0 space-y-0 md:space-y-1.5 shrink-0 overflow-x-auto md:overflow-y-auto scrollbar-hide">
            {[
              { id: 'notices', label: '공지사항 관리' },
              { id: 'events', label: '학사일정 관리' },
              { id: 'documents', label: '자료실 관리' },
              { id: 'siteInfo', label: '기타 정보 관리', onSelect: () => setEditingId('announcements') },
              { id: 'defaultTimetables', label: '기본 시간표 관리' },
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
                  className={`relative p-2 md:p-2.5 text-center md:text-left rounded-lg font-medium text-xs md:text-sm whitespace-nowrap shrink-0 flex-1 md:flex-none transition-colors duration-200 cursor-pointer ${
                    isActive ? 'text-white font-semibold' : 'text-surface-dim hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="admin-active-tab-indicator"
                      className="absolute inset-0 bg-white/[0.12] rounded-lg border border-white/15"
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
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                className="flex-1 flex flex-col"
              >
            {activeTab === 'defaultTimetables' ? (
              <div className="flex flex-col space-y-6">
                <div className="bg-white/[0.03] border border-white/[0.08] p-4 rounded-xl space-y-4">
                  <h3 className="text-base md:text-lg font-semibold text-white">학급별 기본 반복 시간표 관리</h3>
                  <p className="text-xs text-surface-dim leading-relaxed">
                    학년, 학과, 반을 선택하여 학기 내내 반복될 기본 시간표를 입력하고 수정합니다. 주간 메모가 등록되지 않은 기본 레이아웃으로 전체 학생 화면에 표시됩니다.
                  </p>
                  
                  {/* Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-semibold text-surface-dim pl-0.5">학년</label>
                      <select
                        value={templateGrade}
                        onChange={(e) => setTemplateGrade(Number(e.target.value))}
                        className="bg-[#0a1120] border border-white/10 rounded-lg p-2 text-white text-xs md:text-sm focus:border-secondary outline-none transition-colors"
                      >
                        {GRADES.map(g => (
                          <option key={g} value={g}>{g}학년</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-semibold text-surface-dim pl-0.5">학과</label>
                      <select
                        value={templateDept}
                        onChange={(e) => setTemplateDept(e.target.value)}
                        className="bg-[#0a1120] border border-white/10 rounded-lg p-2 text-white text-xs md:text-sm focus:border-secondary outline-none transition-colors"
                      >
                        {DEPARTMENTS.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-semibold text-surface-dim pl-0.5">학급 반</label>
                      <select
                        value={templateClass}
                        onChange={(e) => setTemplateClass(Number(e.target.value))}
                        className="bg-[#0a1120] border border-white/10 rounded-lg p-2 text-white text-xs md:text-sm focus:border-secondary outline-none transition-colors"
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
                <div className="flex space-x-1.5 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] overflow-x-auto select-none shrink-0 scrollbar-hide">
                  {['월요일', '화요일', '수요일', '목요일', '금요일'].map((dayName, idx) => {
                    const isDayActive = templateDay === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTemplateDay(idx)}
                        className={`relative flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center whitespace-nowrap px-2 cursor-pointer ${
                          isDayActive ? 'text-white' : 'text-surface-dim hover:text-white'
                        }`}
                      >
                        {isDayActive && (
                          <motion.div
                            layoutId="admin-timetable-day-pill"
                            transition={NAV_SPRING_TRANSITION}
                            className="absolute inset-0 bg-white/[0.14] rounded-lg border border-white/10"
                          />
                        )}
                        <span className="relative z-10">{dayName}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Slot editor grid */}
                <div className="bg-white/[0.03] border border-white/[0.08] p-4 rounded-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-xs font-semibold text-secondary-container">
                      {['월', '화', '수', '목', '금'][templateDay]}요일 시간표 세부 설정
                    </span>
                    <span className="text-xs text-surface-dim/75">
                      금요일은 4교시까지, 월~목요일은 7교시까지 설정할 수 있습니다.
                    </span>
                  </div>

                  <div className="divide-y divide-white/[0.06]">
                    {Array.from({ length: templateDay === 4 ? 4 : 7 }, (_, pIdx) => {
                      const periodNum = pIdx + 1;
                      const slotData = editedTimetable[templateDay]?.[periodNum] || { subject: '', teacher: '' };

                      return (
                        <div key={periodNum} className="py-3 first:pt-0 last:pb-0">
                          <div className="grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-2 text-xs font-semibold font-mono tabular-nums text-white/75 pl-1">
                              {periodNum}교시
                            </div>
                            
                            <div className="col-span-5 flex flex-col">
                              <input
                                type="text"
                                placeholder="과목명"
                                value={slotData.subject}
                                onChange={(e) => handleUpdateTemplateSlot(templateDay, periodNum, 'subject', e.target.value)}
                                className="bg-[#0a1120] border border-white/10 rounded-lg p-2 text-white text-xs md:text-sm focus:border-secondary outline-none transition-colors"
                              />
                            </div>

                            <div className="col-span-5 flex flex-col">
                              <input
                                type="text"
                                placeholder="교사 이름"
                                value={slotData.teacher}
                                onChange={(e) => handleUpdateTemplateSlot(templateDay, periodNum, 'teacher', e.target.value)}
                                className="bg-[#0a1120] border border-white/10 rounded-lg p-2 text-white text-xs md:text-sm focus:border-secondary outline-none transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-white/[0.08] flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      className="px-5 py-2.5 rounded-lg font-semibold text-xs md:text-sm text-white bg-secondary hover:bg-secondary/90 transition-colors cursor-pointer"
                    >
                      {templateGrade}학년 {DEPARTMENTS.find(d => d.id === templateDept)?.name} {templateClass}반 기본 시간표 저장
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <>
                {/* Form */}
                <form onSubmit={handleSubmit} className="mb-4 md:mb-8 p-4 md:p-6 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-3 md:space-y-4 shrink-0">

              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-base md:text-lg font-semibold text-white">
                  {activeTab === 'siteInfo' ? '기타 정보 수정' : editingId ? '수정하기' : '새로 추가하기'}
                </h3>
                {(editingId && activeTab !== 'siteInfo') && (
                  <button type="button" onClick={resetForm} className="text-xs text-secondary-container hover:underline cursor-pointer">
                    취소 (새로 추가로 돌아가기)
                  </button>
                )}
              </div>
              
              {activeTab === 'siteInfo' ? (
                <div className="flex flex-col space-y-1">
                  <label className="text-xs text-surface-dim">수정할 항목</label>
                  <select
                    value={editingId || 'announcements'}
                    onChange={(e) => setEditingId(e.target.value)}
                    className="bg-[#0a1120] border border-white/10 rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors"
                  >
                    <option value="announcements">공지사항</option>
                    <option value="updates">업데이트</option>
                    <option value="contact">문의하기</option>
                  </select>
                </div>
              ) : (
                <div className="flex flex-col space-y-1">
                  <label className="text-xs text-surface-dim">제목</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    required
                    className="bg-[#0a1120] border border-white/10 rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors"
                  />
                </div>
              )}

              {activeTab === 'events' ? (
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs text-surface-dim">시작 날짜</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        if (e.target.value > endDate) setEndDate(e.target.value);
                      }}
                      required
                      className="bg-[#0a1120] border border-white/10 rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs text-surface-dim">종료 날짜</label>
                    <input
                      type="date"
                      value={endDate}
                      min={date}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="bg-[#0a1120] border border-white/10 rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5 mt-1 col-span-2">
                    <label className="text-xs text-surface-dim">일정 색상</label>
                    <div className="flex flex-wrap gap-2.5">
                      {presetColors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEventColor(c)}
                          className={`w-6 h-6 md:w-7 md:h-7 rounded-full border-2 transition-transform cursor-pointer ${eventColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-2 col-span-2">
                    <input
                      type="checkbox"
                      id="isHoliday"
                      checked={isHoliday}
                      onChange={(e) => setIsHoliday(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-[#0a1120] text-secondary focus:ring-secondary/30 focus:ring-offset-0 focus:ring-2 outline-none cursor-pointer"
                    />
                    <label htmlFor="isHoliday" className="text-xs md:text-sm text-white font-medium cursor-pointer select-none">
                      공휴일로 지정 (달력에서 날짜를 빨간색으로 표시)
                    </label>
                  </div>
                </div>
              ) : activeTab === 'notices' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs text-surface-dim">날짜</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="bg-[#0a1120] border border-white/10 rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors w-full [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs text-surface-dim">유효 기간 (지나면 자동 보관함 이동 · 선택)</label>
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="bg-[#0a1120] border border-white/10 rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors w-full [color-scheme:dark]"
                    />
                  </div>
                </div>
              ) : null}
              
              {activeTab !== 'siteInfo' && (
                <div className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    id="isArchived"
                    checked={isArchived}
                    onChange={(e) => setIsArchived(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-[#0a1120] text-secondary focus:ring-secondary/30 focus:ring-offset-0 focus:ring-2 outline-none cursor-pointer"
                  />
                  <label htmlFor="isArchived" className="text-xs md:text-sm text-white font-medium cursor-pointer select-none">
                    보관함으로 이동 (체크 시 일반 목록 및 검색에서 제외)
                  </label>
                </div>
              )}
              
              <div className="flex flex-col space-y-1">
                <label className="text-xs text-surface-dim">내용 / 설명</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={activeTab === 'events' ? 1000 : 10000}
                  rows={activeTab === 'siteInfo' ? 8 : 3}
                  className="bg-[#0a1120] border border-white/10 rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors resize-none"
                />
              </div>

              {(activeTab === 'notices' || activeTab === 'documents') && (
                <div className="space-y-4 pt-3 border-t border-white/[0.08]">
                  {/* External Reference Link */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs text-surface-dim">
                      참고 링크 URL (선택)
                    </label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      maxLength={2000}
                      placeholder="https://... (관련 안내 페이지, 설문 폼 등 외부 링크)"
                      className="bg-[#0a1120] border border-white/10 rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors placeholder:text-surface-dim/40"
                    />
                  </div>

                  {/* Multiple File Attachment Links */}
                  <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-white font-semibold">
                        첨부파일 다운로드 링크 <span className="font-mono tabular-nums text-surface-dim">({attachedFiles.length}/10)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddAttachmentRow}
                        disabled={attachedFiles.length >= 10}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>파일 링크 추가</span>
                      </button>
                    </div>

                    {attachedFiles.length === 0 ? (
                      <p className="text-xs text-surface-dim/75 leading-relaxed">
                        구글 드라이브, 한컴독스, 학교 홈페이지 등 열람 가능한 파일 공유 URL을 최대 10개까지 등록할 수 있습니다.
                      </p>
                    ) : (
                      <div className="divide-y divide-white/[0.06]">
                        {attachedFiles.map((fileRow, idx) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center py-2 first:pt-0 last:pb-0">
                            <input
                              type="text"
                              value={fileRow.name}
                              onChange={(e) => handleUpdateAttachmentRow(idx, 'name', e.target.value)}
                              maxLength={500}
                              placeholder={`표시 파일명 (예: 가정통신문_${idx + 1}.pdf)`}
                              className="sm:col-span-5 bg-[#0a1120] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-secondary-fixed-dim outline-none transition-colors placeholder:text-surface-dim/40"
                            />
                            <div className="sm:col-span-7 flex items-center gap-1.5">
                              <input
                                type="url"
                                value={fileRow.url}
                                onChange={(e) => handleUpdateAttachmentRow(idx, 'url', e.target.value)}
                                maxLength={2000}
                                placeholder="https://drive.google.com/..."
                                className="flex-1 min-w-0 bg-[#0a1120] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-secondary-fixed-dim outline-none transition-colors placeholder:text-surface-dim/40"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachmentRow(idx)}
                                title="첨부 항목 제거"
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors shrink-0 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-colors bg-secondary hover:bg-secondary/90 w-full sm:w-auto text-center cursor-pointer"
                >
                  {activeTab === 'siteInfo' ? '저장하기' : editingId ? '수정 완료' : '추가하기'}
                </button>
                
                {(editingId && activeTab !== 'siteInfo') && (
                  <button
                    type="button"
                    onClick={() => triggerDeleteConfirm(editingId, activeTab)}
                    className="px-4 py-2.5 rounded-lg font-semibold text-sm text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 transition-colors flex items-center justify-center space-x-1.5 w-full sm:w-auto cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>이 항목 삭제하기</span>
                  </button>
                )}
              </div>
            </form>

            {(activeTab !== 'siteInfo') && (
              <div className="shrink-0 pr-0 md:pr-2">
                <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
                  <h3 className="text-base md:text-lg font-semibold text-white">
                    등록된 {activeTab === 'notices' ? '공지사항' : activeTab === 'events' ? '학사일정' : '자료실'} 목록
                  </h3>
                  <span className="text-xs font-mono text-surface-dim tabular-nums">
                    {(() => {
                      const list = activeTab === 'notices' ? notices : activeTab === 'events' ? events : documents;
                      const archivedCount = list.filter(item => item.isArchived).length;
                      return `게시 ${list.length - archivedCount} · 보관 ${archivedCount}`;
                    })()}
                  </span>
                </div>
                <ul className="space-y-2.5">
                {activeTab === 'notices' && notices.map(notice => {
                  const fileCount = notice.files?.length ? notice.files.length : (notice.fileUrl ? 1 : 0);
                  return (
                    <li
                      key={notice.id}
                      className={`border p-3.5 sm:p-4 rounded-xl flex items-center justify-between transition-colors ${
                        notice.isArchived
                          ? 'bg-white/[0.02] border-amber-500/20 opacity-80'
                          : 'bg-white/[0.03] border-white/[0.08]'
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 mb-1 min-w-0">
                          {notice.isArchived && (
                            <span className="text-xs font-semibold text-amber-400 shrink-0 whitespace-nowrap">
                              [보관됨]
                            </span>
                          )}
                          <span className="text-sm font-semibold text-white truncate">{notice.title}</span>
                        </div>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-surface-dim">
                          <span className="font-mono tabular-nums">{formatDotDate(notice.date)}</span>
                          {notice.validUntil && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">유효기한 {formatDotDate(notice.validUntil)}</span>
                            </>
                          )}
                          {fileCount > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>첨부 {fileCount}건</span>
                            </>
                          )}
                          {notice.link && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>참고 링크</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button onClick={() => handleEdit(notice, 'notice')} className="text-surface-dim hover:text-white p-2 bg-white/[0.05] hover:bg-white/[0.1] rounded-lg transition-colors cursor-pointer" title="수정">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => triggerDeleteConfirm(notice.id, 'notices')} className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer" title="삭제">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
                {activeTab === 'events' && events.map(event => (
                  <li
                    key={event.id}
                    className={`border p-3.5 sm:p-4 rounded-xl flex items-center justify-between transition-colors ${
                      event.isArchived
                        ? 'bg-white/[0.02] border-amber-500/20 opacity-80'
                        : 'bg-white/[0.03] border-white/[0.08]'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full mr-3 shrink-0" style={{ backgroundColor: event.color || '#3b82f6' }} />
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1 min-w-0">
                        {event.isArchived && (
                          <span className="text-xs font-semibold text-amber-400 shrink-0 whitespace-nowrap">
                            [보관됨]
                          </span>
                        )}
                        {event.isHoliday && (
                          <span className="text-xs font-semibold text-red-400 shrink-0 whitespace-nowrap">
                            [공휴일]
                          </span>
                        )}
                        <span className="text-sm font-semibold text-white truncate">{event.title}</span>
                      </div>
                      <div className="text-xs text-surface-dim font-mono tabular-nums">
                        {formatDotDate(event.date)} {event.endDate && safeParseDate(event.endDate) !== safeParseDate(event.date) ? `~ ${formatDotDate(event.endDate)}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button onClick={() => handleEdit(event, 'event')} className="text-surface-dim hover:text-white p-2 bg-white/[0.05] hover:bg-white/[0.1] rounded-lg transition-colors cursor-pointer" title="수정">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => triggerDeleteConfirm(event.id, 'events')} className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer" title="삭제">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
                {activeTab === 'documents' && documents.map(doc => {
                  const fileCount = doc.files?.length ? doc.files.length : (doc.fileName || doc.fileUrl ? 1 : 0);
                  const displayFileName = fileCount > 1
                    ? `${doc.files![0].name} 외 ${fileCount - 1}건`
                    : (doc.files && fileCount === 1 ? doc.files[0].name : (doc.fileName || (doc.fileUrl ? '첨부파일 1건' : '')));
                  return (
                    <li
                      key={doc.id}
                      className={`border p-3.5 sm:p-4 rounded-xl flex items-center justify-between transition-colors ${
                        doc.isArchived
                          ? 'bg-white/[0.02] border-amber-500/20 opacity-80'
                          : 'bg-white/[0.03] border-white/[0.08]'
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 mb-1 min-w-0">
                          {doc.isArchived && (
                            <span className="text-xs font-semibold text-amber-400 shrink-0 whitespace-nowrap">
                              [보관됨]
                            </span>
                          )}
                          <span className="text-sm font-semibold text-white truncate">{doc.title}</span>
                        </div>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-surface-dim truncate">
                          {displayFileName ? (
                            <span className="truncate">{displayFileName}</span>
                          ) : (
                            <span className="text-surface-dim/60">첨부파일 없음</span>
                          )}
                          {doc.link && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="shrink-0">참고 링크 포함</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button onClick={() => handleEdit(doc, 'document')} className="text-surface-dim hover:text-white p-2 bg-white/[0.05] hover:bg-white/[0.1] rounded-lg transition-colors cursor-pointer" title="수정">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => triggerDeleteConfirm(doc.id, 'documents')} className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer" title="삭제">
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
        <AnimatePresence>
          {showLogoutConfirm && (
            <motion.div
              key="admin-logout-confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={MODAL_BACKDROP_TRANSITION}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md rounded-2xl"
            >
              <motion.div
                initial={{ scale: 0.95, y: 8, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 6, opacity: 0 }}
                transition={MODAL_PANEL_TRANSITION}
                onClick={e => e.stopPropagation()}
                className="bg-[#0a1120] border border-white/15 w-full max-w-md p-6 rounded-2xl flex flex-col shadow-2xl relative"
              >
                <div className="pb-4 mb-4 border-b border-white/[0.08]">
                  <h3 className="text-base md:text-lg font-semibold text-white">계정 관리 및 로그아웃</h3>
                  <p className="text-xs text-surface-dim mt-1">
                    현재 접속: <span className="text-secondary-container font-semibold font-mono">{getDisplayUserEmail(auth.currentUser?.email) || '알 수 없음'}</span>
                  </p>
                </div>

                <div className="w-full flex flex-col space-y-2.5 mb-4">
                  {/* Switch Google Account */}
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="w-full py-2.5 px-4 rounded-xl text-xs md:text-sm font-semibold bg-secondary hover:bg-secondary/90 text-white flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>다른 구글 계정으로 전환</span>
                    </div>
                    <span className="text-xs text-white/80 font-normal">계정 선택</span>
                  </button>

                  {/* Normal Logout */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-2.5 px-4 rounded-xl text-xs md:text-sm font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <LogOut className="w-4 h-4 text-surface-dim" />
                      <span>단순 로그아웃</span>
                    </div>
                    <span className="text-xs text-surface-dim font-normal">세션 종료</span>
                  </button>

                  {/* Permanent Firebase Account Delete */}
                  <div className="pt-3.5 mt-1 border-t border-white/10 flex flex-col space-y-1.5">
                    <div className="text-xs text-red-400 font-semibold">
                      파이어베이스 계정 영구 삭제
                    </div>
                    <p className="text-xs text-surface-dim leading-relaxed">
                      현재 구글 계정 정보를 인증 시스템에서 완전히 삭제합니다. 삭제 후 새 계정으로 다시 로그인할 수 있습니다.
                    </p>
                    <button
                      type="button"
                      disabled={isDeletingAccount}
                      onClick={handleDeleteCurrentAccount}
                      className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 hover:text-red-200 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>{isDeletingAccount ? '삭제 진행 중...' : '현재 계정 영구 삭제'}</span>
                    </button>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-2.5 rounded-xl font-semibold text-xs bg-white/[0.05] hover:bg-white/[0.1] text-surface-dim hover:text-white transition-colors cursor-pointer"
                >
                  취소하고 돌아가기
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteTarget && (
            <motion.div
              key="admin-delete-confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={MODAL_BACKDROP_TRANSITION}
              onClick={() => setDeleteTarget(null)}
              className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md rounded-2xl"
            >
              <motion.div
                initial={{ scale: 0.95, y: 8, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 6, opacity: 0 }}
                transition={MODAL_PANEL_TRANSITION}
                onClick={e => e.stopPropagation()}
                className="bg-[#0a1120] border border-white/15 w-full max-w-sm p-6 rounded-2xl flex flex-col shadow-2xl relative"
              >
                <h3 className="text-base md:text-lg font-semibold text-white mb-1.5">항목을 삭제하시겠습니까?</h3>
                <p className="text-xs text-surface-dim leading-relaxed mb-4">
                  삭제된 데이터는 복구할 수 없으며 데이터베이스에서 영구 삭제됩니다.
                </p>
                <div className="py-3 mb-5 border-y border-white/[0.08] flex items-center justify-between gap-3 text-xs">
                  <span className="text-surface-dim shrink-0">삭제 대상</span>
                  <span className="text-white font-semibold truncate">{deleteTarget.title}</span>
                </div>
                <div className="flex w-full space-x-2.5">
                  <button 
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-xs md:text-sm bg-white/[0.06] hover:bg-white/[0.12] text-surface-dim hover:text-white transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button 
                    type="button"
                    onClick={executeDelete}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-xs md:text-sm bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
                  >
                    삭제하기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
