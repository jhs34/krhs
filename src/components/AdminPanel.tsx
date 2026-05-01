import React, { useState, useRef, useEffect } from 'react';
import { Notice, FirestoreEvent, SchoolDocument, addNotice, updateNotice, deleteNotice, addEvent, updateEvent, deleteEvent, addDocument, updateDocument, deleteDocument } from '../services/firestore';
import { logout, storage } from '../firebase';
import { format } from 'date-fns';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Edit2, Trash2 } from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
  notices: Notice[];
  events: FirestoreEvent[];
  documents: SchoolDocument[];
  initialTab?: 'notices' | 'events' | 'documents';
  initialEditItem?: any;
}

export function AdminPanel({ onClose, notices, events, documents, initialTab = 'notices', initialEditItem = null }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'notices' | 'events' | 'documents'>(initialTab);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [eventColor, setEventColor] = useState('#64ffda'); // A default cyan color matching the secondary theme
  const [isUploading, setIsUploading] = useState(false);
  
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
  
  // File state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFiles, setCurrentFiles] = useState<Array<{url: string, name: string}>>([]);
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
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setEventColor('#64ffda');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setCurrentFiles([]);
  };

  const safeParseDate = (dString: string | undefined | null) => {
    if (!dString) return format(new Date(), 'yyyy-MM-dd');
    const d = new Date(dString);
    return isNaN(d.getTime()) ? format(new Date(), 'yyyy-MM-dd') : format(d, 'yyyy-MM-dd');
  };

  const handleEdit = (item: any, type: 'notice' | 'event' | 'document') => {
    setEditingId(item.id);
    setTitle(item.title);
    if (type === 'event') {
      setContent(item.description);
      setDate(safeParseDate(item.date));
      setEndDate(safeParseDate(item.endDate || item.date));
      setEventColor(item.color || '#64ffda');
    } else if (type === 'notice') {
      setContent(item.content);
      setDate(safeParseDate(item.date));
      const files = item.files ? [...item.files] : [];
      if (item.fileUrl && files.length === 0) files.push({ url: item.fileUrl, name: item.fileName || '첨부파일' });
      setCurrentFiles(files);
    } else if (type === 'document') {
      setContent(item.description);
      const files = item.files ? [...item.files] : [];
      if (item.fileUrl && files.length === 0) files.push({ url: item.fileUrl, name: item.fileName || '첨부파일' });
      setCurrentFiles(files);
    }
  };

  useEffect(() => {
    if (initialEditItem) {
      handleEdit(initialEditItem, initialTab === 'notices' ? 'notice' : initialTab === 'events' ? 'event' : 'document');
    }
  }, [initialEditItem, initialTab]);

  const handleUploadFiles = async (files: FileList) => {
    setIsUploading(true);
    try {
      const newFiles = [...currentFiles];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        newFiles.push({ url, name: file.name });
      }
      setCurrentFiles(newFiles);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNotification({ message: '파일이 성공적으로 업로드되었습니다.', type: 'success' });
    } catch (error) {
      console.error("File upload failed", error);
      setNotification({ message: '파일 업로드에 실패했습니다. (권한 오류 등)', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setCurrentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    
    if (activeTab === 'events' && (!date || !endDate)) return;
    if (activeTab === 'notices' && !date) return;
    if (activeTab === 'documents' && currentFiles.length === 0 && !editingId) {
      setNotification({ message: '자료실에는 반드시 파일을 하나 이상 첨부해야 합니다.', type: 'error' });
      return;
    }

    try {
      if (activeTab === 'notices') {
        const payload: Omit<Notice, 'id' | 'createdAt'> = {
          title,
          content,
          date: new Date(date).toISOString(),
          files: currentFiles
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
        };
        if (editingId) await updateEvent(editingId, payload);
        else await addEvent(payload);
      } else if (activeTab === 'documents') {
        const payload: Omit<SchoolDocument, 'id' | 'createdAt'> = {
          title,
          description: content,
          files: currentFiles
        };
        if (editingId) await updateDocument(editingId, payload);
        else await addDocument(payload);
      }
      resetForm();
      setNotification({ message: '성공적으로 저장되었습니다.', type: 'success' });
    } catch (err) {
      console.error(err);
      setNotification({ message: '저장 중 오류가 발생했습니다.', type: 'error' });
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
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-y-auto p-3 md:p-6 bg-black/20">
            {/* Form */}
            <form onSubmit={handleSubmit} className="mb-4 md:mb-8 p-3 md:p-6 bg-white/5 rounded-xl md:rounded-2xl border border-white/5 space-y-2 md:space-y-4 shrink-0">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="text-base md:text-lg font-bold text-white">
                  {editingId ? '수정하기' : '새로 추가하기'}
                </h3>
                {editingId && (
                  <button type="button" onClick={resetForm} className="text-[10px] md:text-xs text-secondary-fixed-dim hover:underline">
                    취소 (새로 추가로 돌아가기)
                  </button>
                )}
              </div>
              
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
                </div>
              ) : activeTab === 'notices' ? (
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] md:text-xs text-surface-dim">날짜</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="bg-black/40 border border-white/10 rounded-md md:rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors max-w-xs [color-scheme:dark]"
                  />
                </div>
              ) : null}
              
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] md:text-xs text-surface-dim">내용 / 설명</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className="bg-black/40 border border-white/10 rounded-md md:rounded-lg p-2 md:p-2.5 text-white text-xs md:text-sm focus:border-secondary-fixed-dim outline-none transition-colors resize-none"
                />
              </div>

              {(activeTab === 'notices' || activeTab === 'documents') && (
                <div className="flex flex-col space-y-1 md:space-y-2 bg-black/20 p-3 md:p-4 rounded-xl border border-white/5">
                  <label className="text-[10px] md:text-xs text-surface-dim">파일 첨부 {activeTab === 'documents' && <span className="text-red-400">*</span>}</label>
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={onFileChange}
                    className="text-xs md:text-sm text-surface-dim file:mr-2 md:file:mr-4 file:py-1 md:file:py-2 file:px-2 md:file:px-4 file:rounded-md md:file:rounded-lg file:border-0 file:text-[10px] md:file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                  />
                  {isUploading && <span className="text-[10px] md:text-xs text-yellow-400">업로드 중...</span>}
                  
                  {currentFiles.length > 0 && !isUploading && (
                    <div className="flex flex-col space-y-1 mt-2">
                      <span className="text-xs text-surface-dim mb-1">첨부된 파일:</span>
                      {currentFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-green-400 bg-white/5 p-1.5 rounded-md px-3">
                          <span className="truncate max-w-[200px]">{f.name}</span>
                          <button 
                            type="button" 
                            onClick={() => removeFile(idx)} 
                            className="text-red-400 hover:text-red-300 px-2 font-bold"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUploading}
                  className={`px-6 py-2.5 rounded-lg font-bold text-sm text-white transition-colors
                    ${isUploading ? 'bg-secondary/50 cursor-not-allowed' : 'bg-secondary hover:bg-secondary/80'}`}
                >
                  {editingId ? '수정 완료' : '추가하기'}
                </button>
              </div>
            </form>

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
                      <button onClick={() => deleteNotice(notice.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg">
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
                      <button onClick={() => deleteEvent(event.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg">
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
                        <button onClick={() => deleteDocument(doc.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

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
      </div>
    </div>
  );
}
