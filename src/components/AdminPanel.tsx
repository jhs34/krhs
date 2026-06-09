import React, { useState, useEffect } from 'react';
import { Notice, FirestoreEvent, SchoolDocument, addNotice, updateNotice, deleteNotice, addEvent, updateEvent, deleteEvent, addDocument, updateDocument, deleteDocument } from '../services/firestore';
import { logout } from '../firebase';
import { format } from 'date-fns';
import { Edit2, Trash2 } from 'lucide-react';

import { SiteInfo, updateSiteInfo } from '../services/firestore';

interface AdminPanelProps {
  onClose: () => void;
  notices: Notice[];
  events: FirestoreEvent[];
  documents: SchoolDocument[];
  siteInfos?: SiteInfo[];
  initialTab?: 'notices' | 'events' | 'documents' | 'siteInfo';
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
  const [activeTab, setActiveTab] = useState<'notices' | 'events' | 'documents' | 'siteInfo'>(initialTab);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0a1120] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-2xl md:rounded-3xl overflow-hidden flex flex-col relative shadow-2xl">
        {notification && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs md:text-sm font-bold shadow-lg z-50 flex items-center space-x-2 transition-all ${
            notification.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
          }`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="opacity-80 hover:opacity-100 ml-2">&times;</button>
          </div>
        )}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 shrink-0">
          <h2 className="text-lg md:text-2xl font-bold text-white">관리자 패널</h2>
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
          <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-white/10 flex flex-row md:flex-col p-2 md:p-4 space-x-2 md:space-x-0 space-y-0 md:space-y-2 shrink-0 overflow-x-auto md:overflow-y-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('notices')}
              className={`p-2 md:p-3 text-center md:text-left rounded-lg md:rounded-xl transition-colors font-medium text-xs md:text-sm whitespace-nowrap shrink-0 flex-1 md:flex-none ${
                activeTab === 'notices' ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-surface-dim hover:bg-white/5 hover:text-white'
              }`}
            >
              공지사항 관리
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`p-2 md:p-3 text-center md:text-left rounded-lg md:rounded-xl transition-colors font-medium text-xs md:text-sm whitespace-nowrap shrink-0 flex-1 md:flex-none ${
                activeTab === 'events' ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-surface-dim hover:bg-white/5 hover:text-white'
              }`}
            >
              학사일정 관리
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`p-2 md:p-3 text-center md:text-left rounded-lg md:rounded-xl transition-colors font-medium text-xs md:text-sm whitespace-nowrap shrink-0 flex-1 md:flex-none ${
                activeTab === 'documents' ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-surface-dim hover:bg-white/5 hover:text-white'
              }`}
            >
              자료실 관리
            </button>
            <button
              onClick={() => {
                setActiveTab('siteInfo');
                setEditingId('announcements');
              }}
              className={`p-2 md:p-3 text-center md:text-left rounded-lg md:rounded-xl transition-colors font-medium text-xs md:text-sm whitespace-nowrap shrink-0 flex-1 md:flex-none ${
                activeTab === 'siteInfo' ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-surface-dim hover:bg-white/5 hover:text-white'
              }`}
            >
              기타 정보 관리
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-y-auto p-3 md:p-6 bg-black/20">
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

          </div>
        </div>

        {/* Logout Confirm Modal */}
        {showLogoutConfirm && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md rounded-3xl">
            <div className="bg-[#0a1120] border border-white/20 w-full max-w-sm p-6 rounded-2xl flex flex-col items-center shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-3">로그아웃 하시겠습니까?</h3>
              <p className="text-sm text-surface-dim mb-6 text-center">관리자 세션이 종료되며, 메인 화면으로 돌아갑니다.</p>
              <div className="flex w-full space-x-3">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-600/90 hover:bg-red-600 text-white transition-colors shadow-lg shadow-red-900/20"
                >
                  로그아웃
                </button>
              </div>
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
      </div>
    </div>
  );
}
