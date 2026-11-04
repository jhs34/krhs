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

    const lines = [
      '상품명\t카테고리\t판매가\t즐겨찾기',
      ...currentItems.map(it => {
        const catName = it.categoryId || '기타';
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
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0a1120] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              시트/엑셀 불러오기
            </h2>
            <span className="text-[11px] text-surface-dim hidden sm:inline">
              상품명 · 카테고리 · 판매가 · 즐겨찾기(O/X)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyTemplate}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              {copiedTemplate ? '복사됨' : '양식 복사'}
            </button>
            <button
              type="button"
              onClick={handleDownloadExcelSample}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-medium transition-colors cursor-pointer hidden sm:inline-flex"
            >
              엑셀 양식
            </button>
            <button
              type="button"
              onClick={handleExportCurrentToClipboard}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              {copiedCurrent ? '복사됨' : '현재 메뉴 복사'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Input Switcher */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-primary p-1 rounded-lg border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setInputTab('paste')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  inputTab === 'paste' ? 'bg-secondary text-white' : 'text-surface-dim hover:text-white'
                }`}
              >
                붙여넣기
              </button>
              <button
                type="button"
                onClick={() => setInputTab('file')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  inputTab === 'file' ? 'bg-secondary text-white' : 'text-surface-dim hover:text-white'
                }`}
              >
                파일 선택
              </button>
            </div>

            {parsedRows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setRawText('');
                  setParsedRows([]);
                }}
                className="text-xs text-surface-dim hover:text-rose-400 transition-colors cursor-pointer"
              >
                초기화
              </button>
            )}
          </div>

          {inputTab === 'paste' ? (
            <textarea
              rows={4}
              value={rawText}
              onChange={handleTextChange}
              placeholder={`포카칩 오리지널\t스낵류\t1500\tO\n초코에몽\t음료/유제품\t1200\tO`}
              className="w-full bg-primary border border-white/10 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-secondary placeholder:text-surface-dim/35 custom-scrollbar leading-relaxed"
            />
          ) : (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-white/15 hover:border-secondary/50 rounded-xl p-6 text-center bg-primary/50 hover:bg-primary transition-colors cursor-pointer"
              >
                <Upload className="w-5 h-5 text-surface-dim mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-white">엑셀(.xlsx) 또는 CSV 파일 선택</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .tsv, .txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              {fileError && (
                <p className="mt-2 text-xs text-rose-400">{fileError}</p>
              )}
            </div>
          )}

          {/* Parsed Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-dim font-mono tabular-nums">
                  선택 {stats.totalItems}개 · 카테고리 {stats.uniqueCategories.length}개 · 즐겨찾기 {stats.favoriteCount}개
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(true)}
                    className="text-surface-dim hover:text-white cursor-pointer"
                  >
                    전체 선택
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(false)}
                    className="text-surface-dim hover:text-white cursor-pointer"
                  >
                    전체 해제
                  </button>
                </div>
              </div>

              <div className="border-t border-b border-white/10 max-h-52 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0a1120] text-surface-dim sticky top-0 border-b border-white/10 text-[11px]">
                    <tr>
                      <th className="py-2 px-2 w-8 text-center">선택</th>
                      <th className="py-2 px-2 w-8 text-center">★</th>
                      <th className="py-2 px-3">상품명</th>
                      <th className="py-2 px-3">카테고리</th>
                      <th className="py-2 px-3 text-right">가격</th>
                      <th className="py-2 px-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parsedRows.map(row => (
                      <tr
                        key={row.tempId}
                        className={`hover:bg-white/[0.02] ${!row.selected ? 'opacity-40' : ''}`}
                      >
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRowSelect(row.tempId)}
                            className="rounded border-white/20 bg-white/5 text-secondary cursor-pointer"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleFavoriteRow(row.tempId)}
                            className="cursor-pointer"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                row.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-surface-dim/40'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-1.5 px-3 font-bold text-white">{row.name}</td>
                        <td className="py-1.5 px-3 text-surface-dim">{row.categoryName}</td>
                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-white">
                          {row.price.toLocaleString()}원
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(row.tempId)}
                            className="text-surface-dim hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Compact Options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1 bg-primary p-1 rounded-lg border border-white/10 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setApplyMode('replace')}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                      applyMode === 'replace' ? 'bg-secondary text-white' : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    전체 덮어쓰기
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyMode('merge')}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                      applyMode === 'merge' ? 'bg-secondary text-white' : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    기존 메뉴에 병합
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <label className="flex items-center gap-1.5 text-xs text-surface-dim shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAsPreset}
                      onChange={e => setSaveAsPreset(e.target.checked)}
                      className="rounded border-white/20 bg-white/5 text-secondary cursor-pointer"
                    />
                    <span>프리셋 저장</span>
                  </label>
                  {saveAsPreset && (
                    <input
                      type="text"
                      value={presetName}
                      onChange={e => setPresetName(e.target.value)}
                      placeholder="프리셋 이름"
                      className="flex-1 bg-primary border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-secondary"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-white/10 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
          >
            닫기
          </button>

          {parsedRows.length > 0 && (
            <>
              <button
                type="button"
                disabled={validSelectedRows.length === 0 || isProcessing}
                onClick={() => handleExecute('save_only')}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors disabled:opacity-40 cursor-pointer"
              >
                프리셋만 저장
              </button>
              <button
                type="button"
                disabled={validSelectedRows.length === 0 || isProcessing}
                onClick={() => handleExecute('apply_and_save')}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-secondary hover:bg-secondary/90 text-white transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isProcessing ? '처리 중...' : '포스기에 적용'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
