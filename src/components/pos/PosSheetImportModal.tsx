import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Clipboard,
  ClipboardCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Star,
  X,
  Layers,
  HelpCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PosCategory, PosItem, PosPreset } from '../../types/pos';

export interface ParsedSheetItem {
  tempId: string;
  name: string;
  categoryName: string;
  price: number;
  isFavorite: boolean;
  selected: boolean;
  isExisting: boolean;
  error?: string;
}

interface PosSheetImportModalProps {
  currentCategories: PosCategory[];
  currentItems: PosItem[];
  onApplyPreset: (categories: PosCategory[], items: PosItem[], presetName: string) => Promise<void> | void;
  onSavePreset: (preset: PosPreset) => Promise<void> | void;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const SAMPLE_4_COL_TSV = `상품명\t카테고리\t판매가\t즐겨찾기
포카칩 오리지널\t스낵류\t1500\tO
초코에몽\t음료/유제품\t1200\tO
신라면 컵\t라면류\t1300\tO
몽쉘 초코\t빵/간식\t800\tX
볼펜 0.5mm\t문구류\t1000\tX`;

export function PosSheetImportModal({
  currentCategories,
  currentItems,
  onApplyPreset,
  onSavePreset,
  onClose,
  showToast,
}: PosSheetImportModalProps) {
  const [inputTab, setInputTab] = useState<'paste' | 'file'>('paste');
  const [rawText, setRawText] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedCurrent, setCopiedCurrent] = useState(false);

  // Parsing result
  const [parsedRows, setParsedRows] = useState<ParsedSheetItem[]>([]);
  const [applyMode, setApplyMode] = useState<'replace' | 'merge'>('replace');
  const [saveAsPreset, setSaveAsPreset] = useState(true);
  const [presetName, setPresetName] = useState(() => {
    const today = new Date();
    const m = today.getMonth() + 1;
    const d = today.getDate();
    return `${m}월 ${d}일 매점 메뉴 세팅`;
  });
  const [presetDesc, setPresetDesc] = useState('구글 시트 / 엑셀 4열 메뉴 목록에서 일괄 생성');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse raw text (TSV or CSV) - supports standard 4-column [상품명, 카테고리, 판매가, 즐겨찾기] and legacy 5-column formats
  const parseRawText = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    const results: ParsedSheetItem[] = [];

    // Determine delimiter: tab vs comma vs semicolon vs spaces
    const firstLine = lines[0];
    const isTsv = firstLine.includes('\t');
    const delimiter = isTsv ? '\t' : firstLine.includes(',') ? ',' : /\s{2,}/;

    // Detect if first line is header
    const firstTokens = firstLine.split(delimiter).map(t => t.trim().replace(/^["']|["']$/g, ''));
    const isHeader = firstTokens.some(t =>
      ['상품명', '품목', '품명', '이름', '카테고리', '분류', '판매가', '가격', '단가', '재고', '수량', '즐겨찾기', '인기'].includes(
        t.toLowerCase()
      )
    );

    // Column mapping detection if header present
    let nameCol = 0;
    let catCol = 1;
    let priceCol = 2;
    let favCol = 3;
    let hasExplicitStockCol = false;

    if (isHeader) {
      firstTokens.forEach((token, idx) => {
        const lower = token.toLowerCase();
        if (['상품명', '품목', '품명', '이름'].some(k => lower.includes(k))) nameCol = idx;
        else if (['카테고리', '분류', '종류'].some(k => lower.includes(k))) catCol = idx;
        else if (['판매가', '가격', '단가', '금액'].some(k => lower.includes(k))) priceCol = idx;
        else if (['재고', '수량'].some(k => lower.includes(k))) hasExplicitStockCol = true;
        else if (['즐겨찾기', '인기', 'fav', '북마크', '추천'].some(k => lower.includes(k))) favCol = idx;
      });
    }

    const startIndex = isHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const tokens = line.split(delimiter).map(t => t.trim().replace(/^["']|["']$/g, ''));
      if (tokens.length === 0 || !tokens[0]) continue;

      let name = '';
      let categoryName = '기타';
      let rawPriceStr = '0';
      let rawFav = '';

      if (isHeader) {
        name = tokens[nameCol] || '';
        categoryName = tokens[catCol] || '기타';
        rawPriceStr = tokens[priceCol] ? tokens[priceCol].replace(/[^0-9.-]/g, '') : '0';
        rawFav = tokens[favCol] ? tokens[favCol].trim().toLowerCase() : '';
      } else {
        // Fallback without headers
        name = tokens[0] || '';
        categoryName = tokens[1] || '기타';
        rawPriceStr = tokens[2] ? tokens[2].replace(/[^0-9.-]/g, '') : '0';

        if (tokens.length >= 5) {
          // Legacy 5-column: [Name, Category, Price, Stock, Fav] -> Col 4 is Fav
          rawFav = tokens[4] ? tokens[4].trim().toLowerCase() : '';
        } else if (tokens.length === 4) {
          // Standard 4-column: [Name, Category, Price, Fav] -> Col 3 is Fav
          rawFav = tokens[3] ? tokens[3].trim().toLowerCase() : '';
        }
      }

      if (!name.trim()) continue;

      const price = Math.max(0, parseInt(rawPriceStr, 10) || 0);
      const isFavorite = ['o', 'y', '1', 'true', '예', '인기', '즐겨찾기', '★', 'v'].includes(rawFav);

      // Check if item exists in current items
      const existing = currentItems.find(it => it.name.trim().toLowerCase() === name.trim().toLowerCase());

      results.push({
        tempId: `import-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        categoryName: categoryName.trim() || '기타',
        price,
        isFavorite,
        selected: true,
        isExisting: !!existing,
        error: !name ? '상품명 누락' : undefined,
      });
    }

    setParsedRows(results);
  };

  // Handle Text Change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawText(val);
    parseRawText(val);
  };

  // Handle File Upload (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    const reader = new FileReader();

    reader.onload = evt => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert sheet to array of arrays
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rows || rows.length === 0) {
          setFileError('파일에 유효한 데이터가 없습니다.');
          return;
        }

        // Convert rows to TSV-like string
        const tsvLines = rows
          .filter(r => Array.isArray(r) && r.some(cell => cell !== undefined && cell !== ''))
          .map(r => r.map(c => (c !== undefined && c !== null ? String(c).trim() : '')).join('\t'));

        const reconstructedText = tsvLines.join('\n');
        setRawText(reconstructedText);
        parseRawText(reconstructedText);
        setInputTab('paste');
        showToast(`${file.name} 파일에서 ${rows.length}개 행을 읽어왔습니다.`, 'success');
      } catch (err) {
        console.error('Failed to parse excel file', err);
        setFileError('엑셀 파일을 읽는 도중 오류가 발생했습니다. 올바른 .xlsx 또는 .csv 파일인지 확인해 주세요.');
      }
    };

    reader.onerror = () => {
      setFileError('파일을 읽지 못했습니다.');
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Copy 4-column template to clipboard
  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(SAMPLE_4_COL_TSV).then(() => {
      setCopiedTemplate(true);
      showToast('구글 시트용 4열 샘플이 복사되었습니다! 시트에 바로 붙여넣기(Ctrl+V)하세요.', 'success');
      setTimeout(() => setCopiedTemplate(false), 2500);
    });
  };

  // Download 4-column sample Excel file (.xlsx)
  const handleDownloadExcelSample = () => {
    try {
      const data = [
        ['상품명', '카테고리', '판매가', '즐겨찾기'],
        ['포카칩 오리지널', '스낵류', 1500, 'O'],
        ['초코에몽', '음료/유제품', 1200, 'O'],
        ['신라면 컵', '라면류', 1300, 'O'],
        ['몽쉘 초코', '빵/간식', 800, 'X'],
        ['볼펜 0.5mm', '문구류', 1000, 'X'],
        ['삼다수 500ml', '음료/유제품', 900, 'O'],
        ['새우깡', '스낵류', 1400, 'X'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      // set column widths
      ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 10 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '메뉴목록');
      XLSX.writeFile(wb, '매점_4열_메뉴_양식.xlsx');
      showToast('샘플 엑셀 파일(매점_4열_메뉴_양식.xlsx)이 다운로드되었습니다.', 'success');
    } catch (e) {
      console.error('Failed to download excel', e);
      showToast('엑셀 파일 생성 실패', 'error');
    }
  };

  // Export current active POS items as 4-column TSV to clipboard
  const handleExportCurrentToClipboard = () => {
    if (currentItems.length === 0) {
      showToast('현재 등록된 상품이 없습니다.', 'error');
      return;
    }

    const categoryMap = new Map(currentCategories.map(c => [c.id, c.name]));
    const lines = [
      '상품명\t카테고리\t판매가\t즐겨찾기',
      ...currentItems.map(it => {
        const catName = categoryMap.get(it.categoryId) || '기타';
        const fav = it.isFavorite ? 'O' : 'X';
        return `${it.name}\t${catName}\t${it.price}\t${fav}`;
      }),
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedCurrent(true);
      showToast(`현재 ${currentItems.length}개 상품 메뉴가 4열 클립보드로 복사되었습니다! 시트에 바로 붙여넣으세요.`, 'success');
      setTimeout(() => setCopiedCurrent(false), 2500);
    });
  };

  // Toggle selection for a row
  const toggleRowSelect = (tempId: string) => {
    setParsedRows(prev =>
      prev.map(r => (r.tempId === tempId ? { ...r, selected: !r.selected } : r))
    );
  };

  // Toggle all
  const toggleSelectAll = (select: boolean) => {
    setParsedRows(prev => prev.map(r => ({ ...r, selected: select })));
  };

  // Remove row from preview
  const removeRow = (tempId: string) => {
    setParsedRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  // Toggle favorite for row
  const toggleFavoriteRow = (tempId: string) => {
    setParsedRows(prev =>
      prev.map(r => (r.tempId === tempId ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  };

  // Selected valid rows
  const validSelectedRows = useMemo(() => {
    return parsedRows.filter(r => r.selected && r.name.trim().length > 0);
  }, [parsedRows]);

  // Statistics
  const stats = useMemo(() => {
    const totalItems = validSelectedRows.length;
    const uniqueCategories = Array.from(new Set(validSelectedRows.map(r => r.categoryName.trim() || '기타')));
    const favoriteCount = validSelectedRows.filter(r => r.isFavorite).length;
    const existingCount = validSelectedRows.filter(r => r.isExisting).length;
    const newCount = totalItems - existingCount;

    return { totalItems, uniqueCategories, favoriteCount, existingCount, newCount };
  }, [validSelectedRows]);

  // Execute Import & Apply / Save Preset
  const handleExecute = async (mode: 'apply_and_save' | 'save_only') => {
    if (validSelectedRows.length === 0) {
      showToast('적용할 유효한 상품이 1개 이상 필요합니다.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Build Category Map (Category ID = Category Name)
      const finalCategories: PosCategory[] = [];
      const seenCatNames = new Set<string>();

      if (applyMode === 'merge') {
        // Keep existing categories first
        currentCategories.forEach(c => {
          const cleanName = c.name.trim();
          if (cleanName && !seenCatNames.has(cleanName.toLowerCase())) {
            seenCatNames.add(cleanName.toLowerCase());
            finalCategories.push({
              id: cleanName,
              name: cleanName,
              orderIndex: finalCategories.length + 1,
            });
          }
        });
      }

      // Add new categories from parsed rows
      validSelectedRows.forEach(row => {
        const catName = row.categoryName.trim() || '기타';
        const key = catName.toLowerCase();
        if (!seenCatNames.has(key)) {
          seenCatNames.add(key);
          finalCategories.push({
            id: catName,
            name: catName,
            orderIndex: finalCategories.length + 1,
          });
        }
      });

      // 2. Build Items list
      let finalItems: PosItem[] = [];

      if (applyMode === 'merge') {
        // Start with existing items
        const itemMap = new Map<string, PosItem>();
        currentItems.forEach(it => {
          itemMap.set(it.name.trim().toLowerCase(), { ...it });
        });

        // Update or insert from parsed sheet
        validSelectedRows.forEach(row => {
          const key = row.name.trim().toLowerCase();
          const catName = row.categoryName.trim() || finalCategories[0]?.name || '기타';

          if (itemMap.has(key)) {
            // Update existing
            const existing = itemMap.get(key)!;
            itemMap.set(key, {
              ...existing,
              price: row.price,
              categoryId: catName,
              isFavorite: row.isFavorite,
              isActive: true,
              updatedAt: new Date().toISOString(),
            });
          } else {
            // Add new
            const newItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            itemMap.set(key, {
              id: newItemId,
              name: row.name.trim(),
              categoryId: catName,
              price: row.price,
              isSoldOut: false,
              totalSold: 0,
              isFavorite: row.isFavorite,
              isActive: true,
              updatedAt: new Date().toISOString(),
            });
          }
        });

        finalItems = Array.from(itemMap.values());
      } else {
        // Replace mode: exactly what is in the sheet
        finalItems = validSelectedRows.map((row, idx) => {
          const catName = row.categoryName.trim() || finalCategories[0]?.name || '기타';
          const existing = currentItems.find(it => it.name.trim().toLowerCase() === row.name.trim().toLowerCase());

          return {
            id: existing ? existing.id : `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            name: row.name.trim(),
            categoryId: catName,
            price: row.price,
            isSoldOut: false,
            totalSold: existing?.totalSold || 0,
            isFavorite: row.isFavorite,
            isActive: true,
            updatedAt: new Date().toISOString(),
          };
        });
      }

      const pName = presetName.trim() || '시트 불러오기 메뉴 세팅';

      // 3. Save as Preset if checked or save_only
      if (saveAsPreset || mode === 'save_only') {
        const newPreset: PosPreset = {
          id: `preset-${Date.now()}`,
          name: pName,
          description: presetDesc.trim() || `품목 ${finalItems.length}종 / 카테고리 ${finalCategories.length}개`,
          isBuiltIn: false,
          categories: finalCategories,
          items: finalItems,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await onSavePreset(newPreset);
      }

      // 4. Apply to Current POS if not save_only
      if (mode === 'apply_and_save') {
        await onApplyPreset(finalCategories, finalItems, pName);
        showToast(`[${pName}] 프리셋이 저장되고 포스기에 즉시 적용되었습니다! (${finalItems.length}종 세팅)`, 'success');
      } else {
        showToast(`[${pName}] 프리셋이 성공적으로 저장되었습니다!`, 'success');
      }

      onClose();
    } catch (err) {
      console.error('Error importing sheet menu', err);
      showToast('메뉴 데이터를 적용하는 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0b1326] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-3.5 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-[#0e172e] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-secondary/20 text-secondary flex items-center justify-center shrink-0 border border-secondary/30">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight">
                  구글 시트 / 엑셀 메뉴 불러오기
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/30">
                  4열 표준
                </span>
              </div>
              <p className="text-xs text-surface-dim mt-0.5 hidden sm:block">
                [상품명 | 카테고리 | 판매가 | 즐겨찾기] 4개 열 데이터를 복사해 넣으면 즉시 프리셋으로 등록하고 세팅합니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action / Helper Bar (Templates & Export) */}
        <div className="px-3.5 sm:px-6 py-2.5 bg-[#09101f] border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          {/* 4 Column Guide Pills */}
          <div className="flex items-center space-x-1.5 text-surface-dim font-medium overflow-x-auto scrollbar-hide py-0.5 whitespace-nowrap">
            <HelpCircle className="w-3.5 h-3.5 text-secondary shrink-0" />
            <span className="text-[11px] text-surface-dim shrink-0">4열 순서:</span>
            <span className="bg-white/5 px-1.5 py-0.5 rounded text-white font-mono text-[11px]">1.상품명</span>
            <span className="text-white/30">·</span>
            <span className="bg-white/5 px-1.5 py-0.5 rounded text-white font-mono text-[11px]">2.카테고리</span>
            <span className="text-white/30">·</span>
            <span className="bg-white/5 px-1.5 py-0.5 rounded text-white font-mono text-[11px]">3.판매가</span>
            <span className="text-white/30">·</span>
            <span className="bg-white/5 px-1.5 py-0.5 rounded text-white font-mono text-[11px]">4.즐겨찾기(O/X)</span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyTemplate}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors flex items-center space-x-1 font-semibold text-[11px] sm:text-xs whitespace-nowrap cursor-pointer shrink-0"
              title="구글 시트나 엑셀에 붙여넣을 4열 샘플 복사"
            >
              {copiedTemplate ? (
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Clipboard className="w-3.5 h-3.5" />
              )}
              <span>{copiedTemplate ? '복사완료!' : '4열 양식 샘플'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcelSample}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors flex items-center space-x-1 font-semibold text-[11px] sm:text-xs whitespace-nowrap cursor-pointer shrink-0"
              title="엑셀 템플릿 파일(.xlsx) 다운로드"
            >
              <Download className="w-3.5 h-3.5" />
              <span>엑셀 서식 받기</span>
            </button>

            <button
              type="button"
              onClick={handleExportCurrentToClipboard}
              className="px-2.5 py-1 rounded-lg bg-secondary/15 hover:bg-secondary/25 text-secondary transition-colors flex items-center space-x-1 font-semibold text-[11px] sm:text-xs whitespace-nowrap border border-secondary/30 cursor-pointer shrink-0"
              title="현재 포스기 메뉴 목록을 4열 시트 양식으로 복사"
            >
              {copiedCurrent ? (
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>현재 메뉴 4열 복사</span>
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 custom-scrollbar">
          {/* Input Method Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="grid grid-cols-2 gap-1.5 bg-[#121c33] p-1 rounded-xl border border-white/10 text-xs w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setInputTab('paste')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  inputTab === 'paste'
                    ? 'bg-secondary text-on-secondary shadow'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>시트 복사-붙여넣기</span>
              </button>
              <button
                type="button"
                onClick={() => setInputTab('file')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  inputTab === 'file'
                    ? 'bg-secondary text-on-secondary shadow'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>엑셀/CSV 파일 올리기</span>
              </button>
            </div>

            {parsedRows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setRawText('');
                  setParsedRows([]);
                }}
                className="text-xs text-surface-dim hover:text-red-300 transition-colors flex items-center space-x-1 self-end sm:self-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>내용 비우기</span>
              </button>
            )}
          </div>

          {/* Mode 1: Paste Input */}
          {inputTab === 'paste' ? (
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  rows={5}
                  value={rawText}
                  onChange={handleTextChange}
                  placeholder={`구글 시트 또는 엑셀에서 표 영역을 복사(Ctrl+C)한 후 여기에 붙여넣기(Ctrl+V)하세요.

예시:
상품명\t카테고리\t판매가\t즐겨찾기
포카칩 오리지널\t스낵류\t1500\tO
초코에몽\t음료/유제품\t1200\tO
신라면 컵\t라면류\t1300\tO`}
                  className="w-full bg-[#121c33] border border-white/10 rounded-2xl p-3.5 text-xs text-white font-mono focus:outline-none focus:border-secondary placeholder:text-surface-dim/40 custom-scrollbar leading-relaxed"
                />
              </div>
              <p className="text-[11px] text-surface-dim flex items-center justify-between">
                <span>* 첫 줄에 '상품명', '카테고리' 등 제목(헤더)이 있어도 시스템이 자동으로 인식하여 건너뜁니다.</span>
                <span>입력된 줄: {rawText.split('\n').filter(Boolean).length}줄</span>
              </p>
            </div>
          ) : (
            /* Mode 2: File Upload */
            <div className="space-y-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/15 hover:border-secondary/50 rounded-2xl p-6 sm:p-8 text-center bg-[#121c33]/50 hover:bg-[#121c33] transition-all cursor-pointer flex flex-col items-center justify-center space-y-2.5"
              >
                <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center border border-secondary/20">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">엑셀(.xlsx, .xls) 또는 CSV 파일 선택</p>
                  <p className="text-xs text-surface-dim mt-1">
                    클릭하여 파일을 선택하거나 이곳으로 드래그 앤 드롭하세요.
                  </p>
                </div>
                <span className="text-[10px] text-secondary bg-secondary/10 px-2.5 py-1 rounded-full border border-secondary/20">
                  첫 번째 시트의 [상품명, 카테고리, 판매가, 즐겨찾기] 4열을 자동으로 읽습니다.
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .tsv, .txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              {fileError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{fileError}</span>
                </div>
              )}
            </div>
          )}

          {/* Parsed Preview Section */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              {/* Summary Stats Chips */}
              <div className="bg-[#0e172e] border border-white/10 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 font-bold text-white">
                    선택 품목: <strong className="text-secondary font-mono">{stats.totalItems}종</strong> / {parsedRows.length}종
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 font-bold text-white">
                    카테고리: <strong className="text-white font-mono">{stats.uniqueCategories.length}개</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center space-x-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>즐겨찾기 {stats.favoriteCount}개</span>
                  </span>
                  {stats.existingCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold">
                      기존 품목 갱신 {stats.existingCount}개
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(true)}
                    className="text-surface-dim hover:text-white underline cursor-pointer"
                  >
                    전체 선택
                  </button>
                  <span className="text-white/20">|</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(false)}
                    className="text-surface-dim hover:text-white underline cursor-pointer"
                  >
                    선택 해제
                  </button>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#101b33]">
                <div className="max-h-60 overflow-y-auto overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-[#09101f] text-surface-dim sticky top-0 z-10 border-b border-white/10">
                      <tr>
                        <th className="py-2.5 px-3 w-8 text-center">선택</th>
                        <th className="py-2.5 px-2 w-8 text-center">★</th>
                        <th className="py-2.5 px-3 font-bold text-white">상품명</th>
                        <th className="py-2.5 px-3">카테고리</th>
                        <th className="py-2.5 px-3 text-right">판매가</th>
                        <th className="py-2.5 px-3 text-center">구분</th>
                        <th className="py-2.5 px-2 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsedRows.map(row => (
                        <tr
                          key={row.tempId}
                          className={`hover:bg-white/5 transition-colors ${
                            !row.selected ? 'opacity-40 bg-black/20' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => toggleRowSelect(row.tempId)}
                              className="rounded border-white/20 bg-white/5 text-secondary focus:ring-secondary cursor-pointer"
                            />
                          </td>

                          {/* Favorite Star */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleFavoriteRow(row.tempId)}
                              className="cursor-pointer"
                              title="즐겨찾기 토글"
                            >
                              <Star
                                className={`w-3.5 h-3.5 transition-colors ${
                                  row.isFavorite
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-surface-dim/40 hover:text-amber-400'
                                }`}
                              />
                            </button>
                          </td>

                          {/* Name */}
                          <td className="py-2 px-3 font-bold text-white">
                            <div className="flex items-center space-x-1.5">
                              <span>{row.name}</span>
                              {row.error && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300">
                                  {row.error}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-white/5 text-surface-dim text-[11px]">
                              {row.categoryName}
                            </span>
                          </td>

                          {/* Price */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-secondary">
                            {row.price.toLocaleString()}원
                          </td>

                          {/* Existing Badge */}
                          <td className="py-2 px-3 text-center">
                            {row.isExisting ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                기존 갱신
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                신규 품목
                              </span>
                            )}
                          </td>

                          {/* Delete */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeRow(row.tempId)}
                              className="text-surface-dim hover:text-red-400 p-1 cursor-pointer"
                              title="이 행 제외"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Options Box */}
              <div className="bg-[#0e172e] border border-white/10 rounded-2xl p-4 space-y-4">
                {/* Apply Mode Radio */}
                <div>
                  <label className="block text-xs font-bold text-white mb-2">포스기 반영 방식 선택</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setApplyMode('replace')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        applyMode === 'replace'
                          ? 'bg-secondary/15 border-secondary text-white shadow-sm'
                          : 'bg-white/5 border-white/10 text-surface-dim hover:text-white'
                      }`}
                    >
                      <div className="font-bold flex items-center space-x-1.5 text-secondary">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>전체 덮어쓰기 (추천 - 새 영업일 세팅)</span>
                      </div>
                      <p className="text-[11px] text-surface-dim mt-1">
                        현재 등록된 모든 품목을 비우고, 위 시트 데이터로 깨끗하게 새로 세팅합니다.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setApplyMode('merge')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        applyMode === 'merge'
                          ? 'bg-secondary/15 border-secondary text-white shadow-sm'
                          : 'bg-white/5 border-white/10 text-surface-dim hover:text-white'
                      }`}
                    >
                      <div className="font-bold flex items-center space-x-1.5 text-secondary">
                        <Layers className="w-3.5 h-3.5" />
                        <span>기존 품목 유지 + 정보 갱신</span>
                      </div>
                      <p className="text-[11px] text-surface-dim mt-1">
                        기존 메뉴를 유지하면서 시트에 있는 품목은 가격/즐겨찾기 정보를 갱신하고 새 품목을 추가합니다.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Preset Info */}
                <div className="pt-2 border-t border-white/5 space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="save-as-preset-check"
                      checked={saveAsPreset}
                      onChange={e => setSaveAsPreset(e.target.checked)}
                      className="rounded border-white/20 bg-white/5 text-secondary focus:ring-secondary cursor-pointer"
                    />
                    <label htmlFor="save-as-preset-check" className="text-xs font-bold text-white cursor-pointer">
                      이 구성을 '메뉴 프리셋' 보관함에 저장하여 다음에도 불러오기
                    </label>
                  </div>

                  {saveAsPreset && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] text-surface-dim mb-1 font-semibold">프리셋 이름</label>
                        <input
                          type="text"
                          value={presetName}
                          onChange={e => setPresetName(e.target.value)}
                          placeholder="예: 2026-1학기 수요매점 1회차"
                          className="w-full bg-[#162035] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-secondary font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-surface-dim mb-1 font-semibold">설명 (선택)</label>
                        <input
                          type="text"
                          value={presetDesc}
                          onChange={e => setPresetDesc(e.target.value)}
                          placeholder="예: 과자 10종, 음료 5종"
                          className="w-full bg-[#162035] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-secondary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Execution Actions */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-3.5 bg-[#0e172e] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] sm:text-xs text-surface-dim">
            {parsedRows.length > 0 ? (
              <span>
                선택된 <strong className="text-white font-bold">{validSelectedRows.length}개</strong> 품목 준비 완료
              </span>
            ) : (
              <span>구글 시트 4열 데이터를 붙여넣거나 엑셀 파일을 올려주세요.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer shrink-0"
            >
              닫기
            </button>

            {parsedRows.length > 0 && (
              <>
                <button
                  type="button"
                  disabled={validSelectedRows.length === 0 || isProcessing}
                  onClick={() => handleExecute('save_only')}
                  className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center space-x-1 whitespace-nowrap"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>프리셋만 저장</span>
                </button>

                <button
                  type="button"
                  disabled={validSelectedRows.length === 0 || isProcessing}
                  onClick={() => handleExecute('apply_and_save')}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-bold bg-secondary hover:brightness-110 text-on-secondary transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-secondary/20 active:scale-[0.99] whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{isProcessing ? '처리 중...' : '포스기에 적용 & 저장'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
