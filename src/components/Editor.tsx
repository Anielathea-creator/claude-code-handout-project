import { useState, useRef, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GoogleGenAI } from '@google/genai';
import { Snapshot } from '../types';
import { EXERCISE_TEMPLATES } from '../constants';
import { 
  ZoomIn, ZoomOut, Plus, Minus, Trash2, Copy, Clipboard, 
  ArrowUp, ArrowDown, Scissors, Image, Sparkles, 
  Undo2, Redo2, Eye, EyeOff, Clock, Hash, MapPin,
  ChevronRight, ChevronLeft
} from 'lucide-react';

// Global cleanup for any leftover clones from previous sessions that might be freezing the editor
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Rejection:', event.reason);
  });

  setTimeout(() => {
    document.querySelectorAll('.html2pdf__container, .html2canvas-container, .pdf-generation-clone').forEach(el => el.remove());
    const roots = document.querySelectorAll('#dossier-root');
    if (roots.length > 1) {
      roots.forEach(r => {
        // The real editor is inside the React root (#root), the clones are usually appended to body
        if (!r.closest('#root')) {
          r.remove();
        }
      });
    }
  }, 500);
}

interface EditorProps {
  html: string;
  onChange: (html: string) => void;
  theme?: string;
  snapshots: Snapshot[];
  onRestoreSnapshot: (snapshot: Snapshot) => void;
  onAddSnapshot: (name: string) => void;
}


export function Editor({ html, onChange, theme, snapshots, onRestoreSnapshot, onAddSnapshot }: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const designDropdownRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [globalFont, setGlobalFont] = useState('system-ui, -apple-system, sans-serif');
  const [activeTableCell, setActiveTableCell] = useState<HTMLElement | null>(null);
  const [activeBlock, setActiveBlock] = useState<HTMLElement | null>(null);
  const [activeEditable, setActiveEditable] = useState<HTMLElement | null>(null); 
  const [showHistory, setShowHistory] = useState(false);
  const [showSolutions, setShowSolutions] = useState(true);

  // Close history dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
      if (designDropdownRef.current && !designDropdownRef.current.contains(event.target as Node)) {
        setDesignDropdownOpen(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRestore = (snapshot: Snapshot) => {
    onRestoreSnapshot(snapshot);
    setShowHistory(false);
  };

  const [dragMarker, setDragMarker] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!dragMarker) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = dragMarker.parentElement;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      
      dragMarker.style.left = `${x}%`;
      dragMarker.style.top = `${y}%`;
    };

    const handleMouseUp = () => {
      setDragMarker(null);
      saveHistoryState();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragMarker]);

  const handleMarkerMouseDown = (e: React.MouseEvent) => {
    let target = e.target as HTMLElement;
    if (!target) return;
    if (target.nodeType === 3) target = target.parentElement as HTMLElement;
    if (!target || !target.closest) return;

    // 0. Table column/row resize (runs before all other logic)
    {
      const cell = target.closest('td, th') as HTMLElement | null;
      if (cell) {
        const table = cell.closest('table') as HTMLTableElement | null;
        if (table && !table.classList.contains('rechenmauer-table')) {
          const rect = cell.getBoundingClientRect();
          const THRESHOLD = 12;
          const row = cell.closest('tr') as HTMLTableRowElement | null;
          const isLastCol = row ? cell === row.cells[row.cells.length - 1] : false;
          const isFirstCol = cell.cellIndex === 0;

          // Column resize: right edge of current cell OR left edge (resize previous column pair)
          const nearRightEdge = Math.abs(e.clientX - rect.right) <= THRESHOLD && !isLastCol;
          const nearLeftEdge = Math.abs(e.clientX - rect.left) <= THRESHOLD && !isFirstCol;

          if ((nearRightEdge || nearLeftEdge) && row) {
            e.preventDefault();
            e.stopPropagation();
            table.style.tableLayout = 'fixed';
            const root = document.getElementById('dossier-root');
            if (root) root.classList.add('table-col-resize');
            const leftColIndex = nearLeftEdge ? cell.cellIndex - 1 : cell.cellIndex;
            const rightColIndex = leftColIndex + 1;
            const leftCells = getCellsInColumn(table, leftColIndex);
            const rightCells = getCellsInColumn(table, rightColIndex);
            const lw = (row.cells[leftColIndex] as HTMLElement).getBoundingClientRect().width;
            const rw = (row.cells[rightColIndex] as HTMLElement).getBoundingClientRect().width;
            leftCells.forEach(c => { c.style.width = lw + 'px'; });
            rightCells.forEach(c => { c.style.width = rw + 'px'; });
            tableResizeRef.current = {
              active: true, type: 'col', leftCells, rightCells,
              startX: e.clientX, startLeftWidth: lw, startRightWidth: rw,
              rowCells: [], startY: 0, startRowHeight: 0,
            };
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            return;
          }

          // Row resize: bottom edge of current row OR top edge (resize previous row)
          const nearBottomEdge = Math.abs(e.clientY - rect.bottom) <= THRESHOLD;
          const isActualFirstRow = row ? row.rowIndex === 0 : true;
          const nearTopEdge = Math.abs(e.clientY - rect.top) <= THRESHOLD && !isActualFirstRow;

          if (nearBottomEdge || nearTopEdge) {
            e.preventDefault();
            e.stopPropagation();
            const root = document.getElementById('dossier-root');
            if (root) root.classList.add('table-row-resize');
            let targetRow: HTMLTableRowElement;
            if (nearTopEdge) {
              const allRows = Array.from(table.rows);
              const currentRowIdx = allRows.indexOf(row!);
              targetRow = allRows[currentRowIdx - 1];
            } else {
              targetRow = row!;
            }
            if (!targetRow) return;
            const rowCells = Array.from(targetRow.cells) as HTMLElement[];
            const rh = (targetRow.cells[0] as HTMLElement).getBoundingClientRect().height;
            rowCells.forEach(c => { c.style.minHeight = rh + 'px'; });
            tableResizeRef.current = {
              active: true, type: 'row', leftCells: [], rightCells: [],
              startX: 0, startLeftWidth: 0, startRightWidth: 0,
              rowCells, startY: e.clientY, startRowHeight: rh,
            };
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            return;
          }
        }
      }
    }

    // 1. Marker Mode - Place new marker
    if (markerModeRef.current && (target.tagName === 'IMG' || target.closest('.marker-container') || target.closest('.draggable-image-wrapper'))) {
      if (!target.closest('button') && !target.closest('.delete-marker') && !target.classList.contains('delete-img') && !target.closest('.align-img-left') && !target.closest('.align-img-right') && !target.closest('.align-img-center')) {
        const img = target.tagName === 'IMG' ? target : (target.closest('.marker-container')?.querySelector('img') || target.closest('.draggable-image-wrapper')?.querySelector('img'));
        
        if (img) {
          e.preventDefault();
          e.stopPropagation();
          
          let container = img.parentElement as HTMLElement;
          if (!container?.classList.contains('marker-container')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'marker-container mx-auto block my-4';
            const currentWrapper = img.closest('.draggable-image-wrapper') as HTMLElement;
            if (currentWrapper) {
              wrapper.style.float = currentWrapper.style.float;
              wrapper.style.margin = currentWrapper.style.margin;
              wrapper.style.display = currentWrapper.style.display;
              wrapper.style.width = currentWrapper.style.width;
            }
            img.parentNode?.insertBefore(wrapper, img);
            wrapper.appendChild(img);
            img.classList.remove('mx-auto', 'block', 'my-4', 'float-left', 'float-right', 'mr-4', 'ml-4');
            container = wrapper;
          }

          const rect = container.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;

          const marker = document.createElement('div');
          marker.className = 'image-marker';
          marker.style.left = `${x}%`;
          marker.style.top = `${y}%`;
          marker.setAttribute('contenteditable', 'false');
          
          const existingMarkers = container.querySelectorAll('.image-marker');
          const nextNum = existingMarkers.length + 1;
          marker.innerHTML = `<span contenteditable="true" class="marker-label">${nextNum}</span><div class="delete-marker">✕</div>`;
          
          container.appendChild(marker);
          saveHistoryState();
          return;
        }
      }
    }

    // 2. Drag existing marker
    const marker = target.closest('.image-marker') as HTMLElement;
    if (marker && !target.classList.contains('delete-marker') && !target.classList.contains('marker-label')) {
      e.preventDefault();
      setDragMarker(marker);
    }
  };

  const handleRootMouseMove = (e: React.MouseEvent) => {
    if (tableResizeRef.current.active) return;

    const root = document.getElementById('dossier-root');
    if (!root) return;

    let target = e.target as HTMLElement;
    if (!target || target.nodeType === 3) target = (target as HTMLElement)?.parentElement as HTMLElement;
    if (!target?.closest) {
      root.classList.remove('table-col-resize', 'table-row-resize');
      return;
    }

    const cell = target.closest('td, th') as HTMLElement | null;
    if (!cell) {
      root.classList.remove('table-col-resize', 'table-row-resize');
      return;
    }

    const table = cell.closest('table') as HTMLTableElement | null;
    if (!table || table.classList.contains('rechenmauer-table')) {
      root.classList.remove('table-col-resize', 'table-row-resize');
      return;
    }

    const rect = cell.getBoundingClientRect();
    const THRESHOLD = 12;
    const row = cell.closest('tr') as HTMLTableRowElement | null;
    const isLastCol = row ? cell === row.cells[row.cells.length - 1] : false;
    const isFirstCol = cell.cellIndex === 0;
    const isActualFirstRow = row ? row.rowIndex === 0 : true;

    const nearRightEdge = Math.abs(e.clientX - rect.right) <= THRESHOLD && !isLastCol;
    const nearLeftEdge = Math.abs(e.clientX - rect.left) <= THRESHOLD && !isFirstCol;
    const nearBottomEdge = Math.abs(e.clientY - rect.bottom) <= THRESHOLD;
    const nearTopEdge = Math.abs(e.clientY - rect.top) <= THRESHOLD && !isActualFirstRow;

    if (nearRightEdge || nearLeftEdge) {
      root.classList.remove('table-row-resize');
      root.classList.add('table-col-resize');
    } else if (nearBottomEdge || nearTopEdge) {
      root.classList.remove('table-col-resize');
      root.classList.add('table-row-resize');
    } else {
      root.classList.remove('table-col-resize', 'table-row-resize');
    }
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- AI STATE ---
  const [showAiModal, setShowAiModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [markerMode, setMarkerMode] = useState(false);
  const markerModeRef = useRef(markerMode);
  
  useEffect(() => {
    markerModeRef.current = markerMode;
    const root = document.getElementById('dossier-root');
    if (root) {
      if (markerMode) {
        root.classList.add('marker-mode-active');
        // Disable dragging on all images when marker mode is active
        root.querySelectorAll('.draggable-image-wrapper').forEach(el => {
          el.setAttribute('draggable', 'false');
        });
      } else {
        root.classList.remove('marker-mode-active');
        // Re-enable dragging
        root.querySelectorAll('.draggable-image-wrapper').forEach(el => {
          el.setAttribute('draggable', 'true');
        });
      }
    }
  }, [markerMode]);

  // --- DESIGN STATE ---
  const [designDropdownOpen, setDesignDropdownOpen] = useState(false);
  const [designSubMenu, setDesignSubMenu] = useState<'main' | 'frame' | 'color' | 'emoji'>('main');
  const [designError, setDesignError] = useState('');
  const [lastRange, setLastRange] = useState<Range | null>(null);
  const [pendingImageTarget, setPendingImageTarget] = useState<HTMLElement | null>(null);

  const FRAME_DESIGNS = [
    { id: 'vintage', name: 'Vintage', icon: '📜', description: 'Klassischer Rahmen' },
    { id: 'floral', name: 'Blumen', icon: '🌸', description: 'Florale Ecken' },
    { id: 'abstract', name: 'Basic', icon: '🎨', description: 'Geometrisch' },
    { id: 'waves', name: 'Wellen', icon: '🌊', description: 'Sanfte Wellen' },
    { id: 'botanical', name: 'Botanisch', icon: '🌿', description: 'Natur-Look' },
    { id: 'dotted', name: 'Gepunktet', icon: '💬', description: 'Doppellinie' },
    { id: 'none', name: 'Kein Rahmen', icon: '🗑️', description: 'Rahmen entfernen' },
  ];

  const COLOR_OPTIONS = [
    { id: 'bg-white', name: 'Weiß', hex: '#ffffff' },
    { id: 'bg-blue-50', name: 'Blau', hex: '#eff6ff' },
    { id: 'bg-green-50', name: 'Grün', hex: '#f0fdf4' },
    { id: 'bg-yellow-50', name: 'Gelb', hex: '#fefce8' },
    { id: 'bg-red-50', name: 'Rot', hex: '#fef2f2' },
    { id: 'bg-purple-50', name: 'Violett', hex: '#faf5ff' },
    { id: 'bg-orange-50', name: 'Orange', hex: '#fff7ed' },
    { id: 'bg-emerald-50', name: 'Smaragd', hex: '#ecfdf5' },
    { id: 'bg-cyan-50', name: 'Cyan', hex: '#ecfeff' },
    { id: 'bg-pink-50', name: 'Rosa', hex: '#fdf2f8' },
  ];

  const STANDARD_TEXT_COLORS = [
    { name: 'Dunkelrot', hex: '#990000' },
    { name: 'Rot', hex: '#ff0000' },
    { name: 'Orange', hex: '#ff9900' },
    { name: 'Gelb', hex: '#ffff00' },
    { name: 'Hellgrün', hex: '#99cc33' },
    { name: 'Grün', hex: '#00b050' },
    { name: 'Hellblau', hex: '#00b0f0' },
    { name: 'Blau', hex: '#0070c0' },
    { name: 'Dunkelblau', hex: '#002060' },
    { name: 'Lila', hex: '#7030a0' },
    { name: 'Braun', hex: '#78350f' },
    { name: 'Rosa', hex: '#fda4af' },
    { name: 'Pink', hex: '#db2777' },
    { name: 'Grau', hex: '#4b5563' },
  ];

  const THEME_TEXT_COLORS: Record<string, string> = {
    blue: '#1e40af', // blue-800
    emerald: '#065f46', // emerald-800
    purple: '#6b21a8', // purple-800
    amber: '#92400e', // amber-800
    rose: '#9f1239', // rose-800
    green: '#166534', // green-800
    orange: '#9a3412', // orange-800
    cyan: '#155e75', // cyan-800
    pink: '#9d174d', // pink-800
  };

  const EMOJI_OPTIONS = [
    // Gesichter & Emotionen
    '😂', '🙂', '😉', '😍', '😎', '🥳', '🤩', '🧐', '😴', '😢', 
    '🙈', '🙉', '🙊',
    // Schule & Lernen
    '📝', '💡', '📖', '🧪', '🌍', '📐', '🎨', '🎵', '⚽', '🍎', 
    '🔍', '📌', '✅', '⚠️', '⭐', '🔥', '🚀', '🧠', '💻', '🗣️',
    '🎓', '🏫', '🖍️', '📏', '📚', '🔬', '🔭', '🧬', '🔢',
    '➕', '➖', '✖️', '➗', '❓', '❗', '🔔', '📅', '⏰', '⏳',
    // Pflanzen & Natur
    '🌳', '🌲', '🌴', '🌵', '🌿', '🍀', '🍁', '🍂', '🍃', '🌸', '🌼', '🌻',
    // Feedback & Belohnung
    '👏', '🙌', '👍', '🌟', '🏆', '🏅', '🎯', '🎈', '🎉',
    // Symbole & Werkzeuge
    '📎', '🔓', '🔑', '🔨', '🛠️', '⚙️', '📣', '💭', '💬', '✉️', '📧', '🎁', '🛒', '💰'
  ];

  // --- COVER STATE ---
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverStep, setCoverStep] = useState(1);
  const [coverTitle, setCoverTitle] = useState('');
  const [coverSubtitle, setCoverSubtitle] = useState('');
  const [coverImageDesc, setCoverImageDesc] = useState('');
  const [coverImageStyle, setCoverImageStyle] = useState('realistisch');
  const [coverExtraText, setCoverExtraText] = useState('');

  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [coverError, setCoverError] = useState('');
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [regenTarget, setRegenTarget] = useState<{img: HTMLImageElement, prompt: string} | null>(null);
  const coverUploadInputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(1);
  const [notification, setNotification] = useState<{message: string, type: 'error' | 'success'} | null>(null);
  const [aiSubtaskCount, setAiSubtaskCount] = useState(1);

  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedSelectionRef = useRef<Range | null>(null); 

  const isInternalChangeRef = useRef(false);

  const tableResizeRef = useRef<{
    active: boolean;
    type: 'col' | 'row' | null;
    leftCells: HTMLElement[];
    rightCells: HTMLElement[];
    startX: number;
    startLeftWidth: number;
    startRightWidth: number;
    rowCells: HTMLElement[];
    startY: number;
    startRowHeight: number;
  }>({
    active: false, type: null,
    leftCells: [], rightCells: [],
    startX: 0, startLeftWidth: 0, startRightWidth: 0,
    rowCells: [], startY: 0, startRowHeight: 0,
  });

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Initialize history when html prop changes (e.g. project switch)
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    
    const root = document.getElementById('dossier-root');
    if (root && root.innerHTML !== html) {
      root.innerHTML = html;
      historyRef.current = [html];
      historyIndexRef.current = 0;
    }
    // Restore contenteditable attributes and wrap legacy covers
    if (root) {
      // Wrap legacy covers that don't have a wrapper yet
      // 1. Check for containers
      root.querySelectorAll('.cover-page-container').forEach(el => {
        if (!el.closest('.cover-page-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'cover-page-wrapper';
          wrapper.setAttribute('data-cover', 'true');
          
          const next = el.nextElementSibling;
          el.parentNode?.insertBefore(wrapper, el);
          wrapper.appendChild(el);
          if (next && next.classList.contains('page-break')) {
            wrapper.appendChild(next);
          }
        }
      });

      root.querySelectorAll('.cover-image').forEach(el => {
        const img = el as HTMLImageElement;
        // Reset stuck loading styles if they were accidentally saved
        if (img.style.opacity === '0.4' || img.style.cursor === 'wait') {
          img.style.opacity = '1';
          img.style.cursor = 'pointer';
          img.classList.remove('animate-pulse');
        }
        
        if (!el.closest('.cover-page-wrapper') && !el.closest('.cover-page-container')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'cover-page-wrapper';
          wrapper.setAttribute('data-cover', 'true');
          
          el.parentNode?.insertBefore(wrapper, el);
          wrapper.appendChild(el);
        }
      });

      // Wrap bare text nodes in the root into paragraphs to make them editable
      Array.from(root.childNodes).forEach(node => {
        if (node.nodeType === 3 && node.textContent?.trim()) {
          const p = document.createElement('p');
          p.className = 'editable mb-4';
          p.textContent = node.textContent;
          root.replaceChild(p, node);
        }
      });

      root.querySelectorAll('.editable, .is-answer, p, h1, h2, h3, h4, td, th, li, ol, ul, span, b, i, strong, em, div').forEach(el => {
        const element = el as HTMLElement;
        if (element.id === 'dossier-root') return;

        // Check if it's a structural container we should NOT make editable
        if (
          element.classList.contains('page-break') ||
          element.classList.contains('avoid-break') ||
          element.classList.contains('cover-page-container') ||
          element.classList.contains('cover-page-wrapper') ||
          element.classList.contains('draggable-image-wrapper') ||
          element.id === 'toc-list' ||
          element.parentElement?.id === 'dossier-root'
        ) {
           return;
        }

        // For DIVs, only make them editable if they contain direct text nodes to avoid breaking layout
        if (element.tagName === 'DIV') {
          const hasDirectText = Array.from(element.childNodes).some(node => node.nodeType === 3 && node.textContent?.trim());
          if (!hasDirectText) return;
        }

        if (!element.hasAttribute('contenteditable')) {
          element.setAttribute('contenteditable', 'true');
          element.style.userSelect = 'text';
          element.style.webkitUserSelect = 'text';
        }

        // Immer .editable sicherstellen — auch bei Elementen die schon contenteditable haben
        // (z.B. alte Dossiers ohne .editable-Klasse)
        if (!element.classList.contains('editable') && !element.classList.contains('is-answer')) {
          element.classList.add('editable');
        }
      });
      // Ensure page containers (direct children of dossier-root) are never editable
      Array.from(root.children).forEach(child => {
        if (!child.classList.contains('page-break')) {
          (child as HTMLElement).removeAttribute('contenteditable');
          child.classList.remove('editable');
        }
      });
      root.querySelectorAll('.draggable-image-wrapper').forEach(el => {
        el.setAttribute('contenteditable', 'false');
        el.setAttribute('draggable', 'true');
        
        // Ensure images inside are not draggable to avoid conflict
        const img = el.querySelector('img');
        if (img) img.setAttribute('draggable', 'false');
      });

      // Migration: Fix gap-line structure for existing dossiers
      // Move .is-answer inside .gap-line if it's immediately before an empty .gap-line
      root.querySelectorAll('.is-answer').forEach(ans => {
        if (ans.parentElement?.classList.contains('gap-line')) return;

        const next = ans.nextElementSibling;
        if (next && next.classList.contains('gap-line')) {
          next.appendChild(ans);
        }
      });

      // Run repagination after DOM is rendered and heights are measurable
      setTimeout(() => repaginate(), 150);
    }
  }, [html]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.getRangeAt && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelectionRef.current);
    }
  };

  const applyTextColor = (color: string) => {
    restoreSelection();
    saveHistoryState();
    document.execCommand('foreColor', false, color);
    saveHistoryState();
    setShowColorPicker(false);
  };

  const saveHistoryState = () => {
    const root = document.getElementById('dossier-root');
    if (!root) return;
    
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
    const currentHtml = clone.innerHTML;

    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;

    if (currentIndex >= 0 && currentHistory[currentIndex] === currentHtml) return;

    const newHistory = currentHistory.slice(0, currentIndex + 1);
    newHistory.push(currentHtml);
    
    if (newHistory.length > 50) newHistory.shift();

    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    
    // Notify parent of change
    isInternalChangeRef.current = true;
    onChange(currentHtml);
  };

  const getCellsInColumn = (table: HTMLTableElement, colIndex: number): HTMLElement[] => {
    const cells: HTMLElement[] = [];
    Array.from(table.rows).forEach(row => {
      const cell = row.cells[colIndex] as HTMLElement | undefined;
      if (cell) cells.push(cell);
    });
    return cells;
  };

  // Returns the selectable block for a given element.
  // Always returns the direct child of the page container that contains the element.
  // This ensures the whole block is selected (not a nested .avoid-break sub-element).
  const findBlockForElement = (element: HTMLElement): HTMLElement | null => {
    // Special case: page-break dividers are their own block
    const pageBreak = element.closest('.page-break') as HTMLElement;
    if (pageBreak) return pageBreak;

    const root = document.getElementById('dossier-root');
    if (!root) return null;

    // Walk up to find the page container (direct non-page-break child of dossier-root)
    let pageContainer: HTMLElement | null = null;
    let current: HTMLElement | null = element;
    while (current && current.parentElement) {
      if (current.parentElement === root) {
        if (!current.classList.contains('page-break')) {
          pageContainer = current;
        }
        break;
      }
      current = current.parentElement;
    }
    if (!pageContainer) return null;

    // Find the direct child of pageContainer that contains the element.
    // This is always the correct "whole block" to select.
    let blockEl: HTMLElement | null = element;
    while (blockEl && blockEl.parentElement !== pageContainer && blockEl !== root) {
      blockEl = blockEl.parentElement;
    }
    if (!blockEl || blockEl === root) return pageContainer;
    return blockEl !== pageContainer ? blockEl : pageContainer;
  };

  // --- SELECTION MONITORING ---
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      
      const node = sel.anchorNode;
      if (!node) return;
      
      const element = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
      if (!element) return;

      // Find active block
      const block = findBlockForElement(element);
      if (block) {
        setActiveBlock(block);
      }

      // Find active table cell
      const cell = element.closest('td, th') as HTMLElement;
      setActiveTableCell(cell);

      // Find active editable
      const editable = element.closest('.editable') as HTMLElement;
      setActiveEditable(editable);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // --- DRAG & DROP FÜR BILDER ---
  useEffect(() => {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let currentTarget: HTMLElement | null = null;

    const onMouseDown = (e: MouseEvent) => {
      let target = e.target as HTMLElement;
      if (!target) return;
      if (target.nodeType === 3) target = target.parentElement as HTMLElement;
      if (!target || !target.closest) return;

      const wrapper = target.closest('.draggable-image-wrapper') as HTMLElement;
      if (!wrapper) return;

      // Check if clicking near the bottom-right corner for resize
      const rect = wrapper.getBoundingClientRect();
      const isResize = (e.clientX > rect.right - 20 && e.clientY > rect.bottom - 20);

      if (isResize) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = rect.width;
        startHeight = rect.height;
        currentTarget = wrapper;
        e.preventDefault();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !currentTarget) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      currentTarget.style.width = (startWidth + dx) + 'px';
      currentTarget.style.height = (startHeight + dy) + 'px';
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        currentTarget = null;
        saveHistoryState();
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // --- TABLE COLUMN & ROW RESIZE ---
  useEffect(() => {
    const MIN_COL = 30;
    const MIN_ROW = 20;

    const onMouseMove = (e: MouseEvent) => {
      const s = tableResizeRef.current;
      if (!s.active) return;

      if (s.type === 'col') {
        const dx = e.clientX - s.startX;
        let l = s.startLeftWidth + dx;
        let r = s.startRightWidth - dx;
        if (l < MIN_COL) { l = MIN_COL; r = s.startLeftWidth + s.startRightWidth - MIN_COL; }
        if (r < MIN_COL) { r = MIN_COL; l = s.startLeftWidth + s.startRightWidth - MIN_COL; }
        s.leftCells.forEach(c => { c.style.width = l + 'px'; });
        s.rightCells.forEach(c => { c.style.width = r + 'px'; });
      } else if (s.type === 'row') {
        const newH = Math.max(MIN_ROW, s.startRowHeight + (e.clientY - s.startY));
        s.rowCells.forEach(c => { c.style.minHeight = newH + 'px'; });
      }
    };

    const onMouseUp = () => {
      if (!tableResizeRef.current.active) return;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const root = document.getElementById('dossier-root');
      if (root) {
        root.classList.remove('table-col-resize', 'table-row-resize');
      }
      tableResizeRef.current = {
        active: false, type: null,
        leftCells: [], rightCells: [],
        startX: 0, startLeftWidth: 0, startRightWidth: 0,
        rowCells: [], startY: 0, startRowHeight: 0,
      };
      saveHistoryState();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // --- COVER ELEMENT DRAG & DROP ---
  useEffect(() => {
    let isDragging = false;
    let dragTarget: HTMLElement | null = null;
    let innerContainerRect: DOMRect | null = null;
    let startMouseX = 0;
    let startMouseY = 0;
    let startLeft = 0;
    let startTop = 0;
    let hasMoved = false;

    const onMouseDown = (e: MouseEvent) => {
      let target = e.target as HTMLElement;
      if (!target) return;
      if (target.nodeType === 3) target = target.parentElement as HTMLElement;
      if (!target?.closest) return;

      // Clear text-editing lock on any cover element when clicking outside it
      const editingEl = document.querySelector('.cover-draggable[data-editing="true"]') as HTMLElement | null;
      if (editingEl && !editingEl.contains(target)) {
        editingEl.removeAttribute('data-editing');
        editingEl.style.cursor = 'move';
      }

      const coverContainer = target.closest('.cover-page-container') as HTMLElement;
      if (!coverContainer) return;

      const innerContainer = coverContainer.querySelector(':scope > .relative') as HTMLElement;
      if (!innerContainer) return;

      // Walk up to find the direct absolutely-positioned child of innerContainer
      let el: HTMLElement | null = target;
      while (el && el.parentElement !== innerContainer) {
        el = el.parentElement as HTMLElement;
      }
      if (!el || el === innerContainer || el.style.position !== 'absolute') return;

      // If element is locked in text-editing mode, skip drag
      if (el.dataset.editing === 'true') return;

      // If the click landed directly on editable text content, enter editing mode immediately.
      // This prevents the drag handler from firing when the user tries to click-drag to select text.
      // The image wrapper is excluded so double-click on the cover image still triggers regeneration.
      const isClickOnEditableContent = !!(
        target.classList.contains('editable') || target.closest('.editable')
      );
      if (isClickOnEditableContent && !el.classList.contains('resizable-cover-image-wrapper')) {
        el.setAttribute('data-editing', 'true');
        el.style.cursor = 'text';
        return;
      }

      isDragging = true;
      dragTarget = el;
      hasMoved = false;
      innerContainerRect = innerContainer.getBoundingClientRect();
      startMouseX = e.clientX;
      startMouseY = e.clientY;

      // Convert visual position to left/top percentages, clearing any right/bottom constraints.
      // This is needed for elements like the Name field that start with `right: 0` instead of `left`.
      const elRect = el.getBoundingClientRect();
      const computedLeft = ((elRect.left - innerContainerRect.left) / innerContainerRect.width) * 100;
      const computedTop = ((elRect.top - innerContainerRect.top) / innerContainerRect.height) * 100;
      // Only override if element doesn't already have explicit left/top (avoid rounding drift on subsequent drags)
      startLeft = el.style.left ? parseFloat(el.style.left) : computedLeft;
      startTop = el.style.top ? parseFloat(el.style.top) : computedTop;
      // Commit left/top and clear conflicting right/bottom
      el.style.left = `${startLeft.toFixed(1)}%`;
      el.style.top = `${startTop.toFixed(1)}%`;
      el.style.right = '';
      el.style.bottom = '';
      // Don't preventDefault yet — allow initial click to focus text
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragTarget || !innerContainerRect) return;

      const dx = e.clientX - startMouseX;
      const dy = e.clientY - startMouseY;

      // 5px threshold: prevents accidental drag when clicking to edit text
      if (!hasMoved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

      if (!hasMoved) {
        hasMoved = true;
        dragTarget.style.cursor = 'grabbing';
        dragTarget.style.userSelect = 'none';
        (document.activeElement as HTMLElement)?.blur();
      }

      e.preventDefault();

      const newLeft = Math.max(0, Math.min(100, startLeft + (dx / innerContainerRect.width) * 100));
      const newTop = Math.max(0, Math.min(100, startTop + (dy / innerContainerRect.height) * 100));
      dragTarget.style.left = `${newLeft.toFixed(1)}%`;
      dragTarget.style.top = `${newTop.toFixed(1)}%`;
    };

    const onMouseUp = () => {
      if (isDragging) {
        if (hasMoved && dragTarget) {
          dragTarget.style.cursor = '';
          dragTarget.style.userSelect = '';
          saveHistoryState();
        }
        isDragging = false;
        dragTarget = null;
        innerContainerRect = null;
        hasMoved = false;
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Selection tracking to ensure emojis are inserted at the exact cursor position
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        // Get the actual element node
        const node = container.nodeType === 3 ? container.parentElement : container as HTMLElement;
        
        if (node) {
          const root = document.getElementById('dossier-root');
          // Only track if inside the editor root and in an editable area
          if (root && root.contains(node)) {
            const isEditable = node.closest('.editable, [contenteditable="true"]');
            if (isEditable) {
              setLastRange(range.cloneRange());
            }
          }
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const prevState = historyRef.current[historyIndexRef.current];
      const root = document.getElementById('dossier-root');
      if (root) {
        root.innerHTML = prevState;
        isInternalChangeRef.current = true;
        onChange(prevState);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const nextState = historyRef.current[historyIndexRef.current];
      const root = document.getElementById('dossier-root');
      if (root) {
        root.innerHTML = nextState;
        isInternalChangeRef.current = true;
        onChange(nextState);
      }
    }
  };

  // Find the closest ancestor span with a given class from a selection range
  const findMarkedSpan = (range: Range, className: string): HTMLElement | null => {
    const getEl = (node: Node): Element | null =>
      node instanceof Element ? node : node.parentElement;
    return (getEl(range.startContainer)?.closest(`.${className}`) as HTMLElement) ??
           (getEl(range.endContainer)?.closest(`.${className}`) as HTMLElement) ??
           null;
  };

  const markAsAnswer = () => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    // Toggle off if selection is already inside an is-answer span
    const existing = findMarkedSpan(range, 'is-answer');
    if (existing) {
      saveHistoryState();
      const parent = existing.parentNode;
      if (parent) {
        while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
        parent.removeChild(existing);
        parent.normalize();
      }
      saveHistoryState();
      return;
    }
    saveHistoryState();
    const span = document.createElement('span');
    span.className = 'is-answer';
    span.contentEditable = 'true';
    try {
      range.surroundContents(span);
    } catch (e) {
      // Fallback if selection spans multiple nodes
      const content = range.extractContents();
      span.appendChild(content);
      range.insertNode(span);
    }
    saveHistoryState();
  };

  const markAsGapLine = () => {
    restoreSelection();
    saveHistoryState();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'gap-line';
    span.contentEditable = 'true';
    span.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;';
    range.insertNode(span);
    saveHistoryState();
  };

  const markAsStrikethrough = () => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    // Toggle off if selection is already inside a marked span
    const existing = findMarkedSpan(range, 'is-strikethrough-answer');
    if (existing) {
      saveHistoryState();
      const parent = existing.parentNode;
      if (parent) {
        while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
        parent.removeChild(existing);
        parent.normalize();
      }
      saveHistoryState();
      return;
    }
    saveHistoryState();
    const span = document.createElement('span');
    span.className = 'is-strikethrough-answer';
    span.contentEditable = 'true';
    try {
      range.surroundContents(span);
    } catch (e) {
      const content = range.extractContents();
      span.appendChild(content);
      range.insertNode(span);
    }
    saveHistoryState();
  };

  const markAsHighlight = () => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    // Toggle off if selection is already inside a marked span
    const existing = findMarkedSpan(range, 'is-highlight-answer');
    if (existing) {
      saveHistoryState();
      const parent = existing.parentNode;
      if (parent) {
        while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
        parent.removeChild(existing);
        parent.normalize();
      }
      saveHistoryState();
      return;
    }
    saveHistoryState();
    const span = document.createElement('span');
    span.className = 'is-highlight-answer';
    span.contentEditable = 'true';
    try {
      range.surroundContents(span);
    } catch (e) {
      const content = range.extractContents();
      span.appendChild(content);
      range.insertNode(span);
    }
    saveHistoryState();
  };

  const applyExactFontSize = (size: string) => {
    document.getElementById('dossier-root')?.focus();
    restoreSelection();
    saveHistoryState();
    document.execCommand('fontSize', false, '7'); // Dummy size to find it
    const fontElements = document.getElementsByTagName('font');
    for (let i = 0; i < fontElements.length; i++) {
        if (fontElements[i].size === '7') {
            fontElements[i].removeAttribute('size');
            fontElements[i].style.fontSize = size;
        }
    }
    saveHistoryState();
  };

  const applyHeadingType = (type: string) => {
    document.getElementById('dossier-root')?.focus();
    restoreSelection();
    saveHistoryState();
    
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    
    let tag = 'P';
    let size = '12pt';
    let className = 'editable';
    
    if (type === 'h1') {
      tag = 'H1';
      size = '36pt';
      className = 'text-[36pt] font-black text-gray-900 editable';
    } else if (type === 'h2') {
      tag = 'H2';
      size = '20pt';
      className = `text-[20pt] font-bold text-${theme || 'blue'}-700 border-b-2 border-${theme || 'blue'}-100 pb-2 editable`;
    } else if (type === 'h3') {
      tag = 'H3';
      size = '14pt';
      className = 'text-[14pt] font-bold mb-0 editable';
    } else {
      tag = 'P';
      size = '12pt';
      className = 'text-[12pt] editable';
    }

    // Use formatBlock to change the tag
    document.execCommand('formatBlock', false, tag);
    
    // Find the newly formatted block and apply styles/classes
    setTimeout(() => {
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        const node = sel.anchorNode;
        const element = (node.nodeType === 1 ? node : node.parentElement) as HTMLElement;
        const block = element.closest(tag) as HTMLElement;
        if (block) {
          block.className = className;
          block.style.fontSize = size;
          block.setAttribute('contenteditable', 'true');
        }
      }
      saveHistoryState();
    }, 10);
  };

  const handleAddTemplate = (type: string) => {
    saveHistoryState();
    const root = document.getElementById('dossier-root');
    if (!root) return;

    let htmlToAdd = '';
    const id = 'block-' + Date.now();
    const themeColor = theme || 'blue';

    const wrapInStructure = (content: string, classes: string = '') => {
      return `<div id="${id}" class="avoid-break relative mb-8 group ${classes}">
        <div class="content-wrapper p-8">
          ${content}
        </div>
      </div>`;
    };

    const template = EXERCISE_TEMPLATES.find(t => t.id === type);
    if (template) {
      htmlToAdd = template.html.replace(/THEME/g, themeColor);
    } else if (type === 'text') {
      // No inner content-wrapper padding — the page container's p-[2.5cm] provides the margin.
      htmlToAdd = `<div id="${id}" class="avoid-break relative group text-[12pt]"><p class="editable" contenteditable="true">Neuer Textabschnitt...</p></div>`;
    } else if (type === 'title') {
      htmlToAdd = wrapInStructure(`<h1 class="text-[36pt] font-black text-gray-900 editable" contenteditable="true">Überschrift</h1>`);
    } else if (type === 'subtitle') {
      htmlToAdd = wrapInStructure(`<h2 class="text-[20pt] font-bold text-${themeColor}-700 border-b-2 border-${themeColor}-100 pb-2 editable" contenteditable="true">Untertitel</h2>`);
    } else if (type === 'merkblatt') {
      htmlToAdd = wrapInStructure(`
        <div class="flex items-center gap-3 mb-3">
          <span class="text-2xl">💡</span>
          <h3 class="text-[14pt] font-bold text-amber-800 mb-0 editable" contenteditable="true">Merkblatt: [Thema]</h3>
        </div>
        <div class="text-amber-900 editable" contenteditable="true">
          Wichtige Informationen hier eintragen...
        </div>`, 'bg-amber-50 border-2 border-amber-200 rounded-2xl shadow-sm text-[12pt]');
    } else if (type === 'merkblatt2') {
      htmlToAdd = wrapInStructure(`
        <h3 class="text-[14pt] font-black text-emerald-900 mb-0 editable" contenteditable="true">Regel / Definition</h3>
        <div class="text-emerald-800 italic editable" contenteditable="true">
          "Hier steht eine wichtige Sprachregel oder Definition..."
        </div>`, 'bg-emerald-50 border-l-8 border-emerald-500 rounded-r-2xl shadow-sm text-[12pt]');
    } else if (type === 'toc') {
      htmlToAdd = wrapInStructure(`
        <h2 class="text-[20pt] font-black text-${themeColor}-900 mb-6 flex items-center gap-3">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
          Inhaltsverzeichnis
        </h2>
        <ul id="toc-list" class="space-y-3 text-[12pt] list-none">
          <li class="italic text-gray-500">Klicke oben auf "Auto-Sync", um dieses Verzeichnis zu füllen...</li>
        </ul>`, `bg-${themeColor}-50 border-l-8 border-${themeColor}-600 rounded-r-xl shadow-inner`);
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlToAdd;
    const htmlElement = tempDiv.firstChild as HTMLElement;

    if (activeBlock) {
      // Detect if activeBlock IS a page container (not a block within a page).
      // This happens when the dossier uses an outer wrapper:
      //   root → outerWrapper → pageContainers (p-[2.5cm]) → blocks
      // In that case findBlockForElement returns the pageContainer itself.
      // We must append INSIDE the page container, not after it.
      const isPageContainer =
        (activeBlock.parentElement === root && !activeBlock.classList.contains('page-break')) ||
        activeBlock.className.includes('p-[2.5cm]');
      if (isPageContainer) {
        activeBlock.appendChild(htmlElement);
      } else {
        activeBlock.parentNode?.insertBefore(htmlElement, activeBlock.nextSibling);
      }
    } else {
      // No active block: append to the last page container found in the document.
      const pageContainers = root.querySelectorAll('[class*="p-[2.5cm]"]');
      const lastContainer = pageContainers[pageContainers.length - 1] as HTMLElement | undefined;
      (lastContainer || root).appendChild(htmlElement);
    }

    // Repaginate so the newly inserted block doesn't get clipped if the page is full,
    // then scroll to it and save history.
    setTimeout(() => {
      repaginate();
      htmlElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      saveHistoryState();
    }, 100);
  };

  const handleMoveBlock = (direction: 'up' | 'down') => {
    if (!activeBlock) return;

    const dossierRoot = document.getElementById('dossier-root');
    if (!dossierRoot) return;

    let blockToMove = activeBlock;
    let pageContainer = blockToMove.parentElement;

    // If activeBlock is a direct child of dossier-root (e.g. a page container was selected),
    // try to find a movable content block inside it instead.
    if (pageContainer === dossierRoot) {
      // Check if the activeBlock is actually a page container with content blocks inside.
      // In that case, we can't move the page itself — skip silently.
      // But if there's a focused editable inside, use findBlockForElement to get the right block.
      const focused = document.activeElement as HTMLElement;
      if (focused && blockToMove.contains(focused)) {
        const correctBlock = findBlockForElement(focused);
        if (correctBlock && correctBlock !== blockToMove && correctBlock.parentElement !== dossierRoot) {
          blockToMove = correctBlock;
          pageContainer = blockToMove.parentElement;
        } else {
          return;
        }
      } else {
        return;
      }
    }

    if (!pageContainer) return;

    saveHistoryState();

    if (direction === 'up') {
      if (blockToMove.previousElementSibling) {
        // Normal case: swap with previous sibling within same page
        pageContainer.insertBefore(blockToMove, blockToMove.previousElementSibling);
      } else {
        // At top of page: move to last position of previous page container
        let prev = pageContainer.previousElementSibling;
        while (prev && prev.classList.contains('page-break')) {
          prev = prev.previousElementSibling;
        }
        if (prev && prev !== dossierRoot) {
          prev.appendChild(blockToMove);
        }
      }
    } else {
      if (blockToMove.nextElementSibling) {
        // Normal case: swap with next sibling within same page
        pageContainer.insertBefore(blockToMove.nextElementSibling, blockToMove);
      } else {
        // At bottom of page: move to first position of next page container
        let next = pageContainer.nextElementSibling;
        while (next && next.classList.contains('page-break')) {
          next = next.nextElementSibling;
        }
        if (next) {
          next.insertBefore(blockToMove, next.firstChild);
        }
      }
    }

    // Update activeBlock to the moved block so subsequent operations use the correct reference
    setActiveBlock(blockToMove);
    document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
    blockToMove.classList.add('active-block-highlight');

    repaginate();
    saveHistoryState();
    blockToMove.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const copiedBlockRef = useRef<string | null>(null);

  const handleCopyBlock = () => {
    if (!activeBlock) return;
    const dossierRoot = document.getElementById('dossier-root');

    // If activeBlock is a page container (direct child of root), try to find the actual content block
    let blockToCopy = activeBlock;
    if (dossierRoot && activeBlock.parentElement === dossierRoot && !activeBlock.classList.contains('page-break')) {
      const focused = document.activeElement as HTMLElement;
      if (focused && activeBlock.contains(focused)) {
        const correctBlock = findBlockForElement(focused);
        if (correctBlock && correctBlock !== activeBlock && correctBlock.parentElement !== dossierRoot) {
          blockToCopy = correctBlock;
        }
      }
    }
    copiedBlockRef.current = blockToCopy.outerHTML;
  };

  const handlePasteBlock = () => {
    if (copiedBlockRef.current) {
      saveHistoryState();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = copiedBlockRef.current;
      const blockToInsert = tempDiv.firstElementChild as HTMLElement;
      
      if (blockToInsert) {
        // Generate new IDs for the pasted block and its children to avoid duplicate IDs
        const generateNewIds = (el: HTMLElement) => {
          if (el.id) {
            el.id = el.id.split('-')[0] + '-' + Date.now() + Math.floor(Math.random() * 1000);
          }
          Array.from(el.children).forEach(child => generateNewIds(child as HTMLElement));
        };
        generateNewIds(blockToInsert);

        if (activeBlock && activeBlock.parentNode) {
          const dossierRoot = document.getElementById('dossier-root');
          const isPageContainer = activeBlock.parentElement === dossierRoot && !activeBlock.classList.contains('page-break');
          if (isPageContainer) {
            activeBlock.appendChild(blockToInsert);
          } else {
            activeBlock.parentNode.insertBefore(blockToInsert, activeBlock.nextSibling);
          }
        } else {
          document.getElementById('dossier-root')?.appendChild(blockToInsert);
        }
        
        setTimeout(() => {
          blockToInsert.scrollIntoView({ behavior: 'smooth', block: 'center' });
          saveHistoryState();
        }, 50);
      }
    }
  };

  const handleAddPageBreak = () => {
    saveHistoryState();
    const root = document.getElementById('dossier-root');
    if (!root) return;

    const isSkippedPage = (el: Element) =>
      el.classList.contains('page-break') ||
      el.classList.contains('cover-page-wrapper') ||
      el.classList.contains('cover-page-container') ||
      el.hasAttribute('data-cover');

    const getPageClass = (): string => {
      for (const child of Array.from(root.children)) {
        if (!isSkippedPage(child)) return child.className;
      }
      return 'p-[2.5cm]';
    };

    const insertNewPage = (page: HTMLElement): HTMLElement => {
      const newPage = document.createElement('div');
      newPage.className = getPageClass();
      const newPB = document.createElement('div');
      newPB.className = 'page-break avoid-break';
      const afterPage = page.nextElementSibling;
      if (afterPage?.classList.contains('page-break')) {
        afterPage.after(newPage);
        newPage.after(newPB);
      } else {
        page.after(newPB);
        newPB.after(newPage);
      }
      return newPage;
    };

    // Find the page container (direct child of dossier-root) that contains activeBlock
    let currentPage: HTMLElement | null = null;
    if (activeBlock) {
      let el: HTMLElement | null = activeBlock;
      while (el && el.parentElement !== root) {
        el = el.parentElement as HTMLElement | null;
      }
      if (el && el.parentElement === root && !isSkippedPage(el)) {
        currentPage = el;
      }
    }

    if (!currentPage) {
      // No active block — append a new empty page at the end
      const pages = Array.from(root.children).filter(c => !isSkippedPage(c));
      const lastPage = pages[pages.length - 1] as HTMLElement | undefined;
      if (lastPage) insertNewPage(lastPage);
      saveHistoryState();
      return;
    }

    // Collect all blocks AFTER activeBlock within the current page
    const blocksToMove: Element[] = [];
    let found = false;
    for (const child of Array.from(currentPage.children)) {
      if (found) blocksToMove.push(child);
      if (child === activeBlock) found = true;
    }

    // Create a new page immediately after the current page
    const newPage = insertNewPage(currentPage);

    // Move subsequent blocks onto the new page
    blocksToMove.forEach(block => newPage.appendChild(block));

    resetPageScrollTops();
    saveHistoryState();
  };

  const handleDeleteBlock = () => {
    const root = document.getElementById('dossier-root');
    if (!root) return;

    // 1. Wenn ein spezifisches Textfeld (Editable) fokussiert ist UND es nicht das einzige im Block ist
    if (activeEditable && activeBlock && activeBlock.contains(activeEditable)) {
      const editables = activeBlock.querySelectorAll('.editable');
      const isCell = activeEditable.tagName === 'TD' || activeEditable.tagName === 'TH';
      
      if (editables.length > 1 && !isCell) {
        saveHistoryState();
        activeEditable.remove();
        setActiveEditable(null);
        saveHistoryState();
        return;
      }
    }

    // 2. Sonst den ganzen Block löschen
    if (!activeBlock || !root.contains(activeBlock)) return;

    saveHistoryState();
    activeBlock.remove();
    setActiveBlock(null);
    document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
    saveHistoryState();
  };

  const handleDeleteEditable = () => {
    if (!activeEditable) return;
    saveHistoryState();
    activeEditable.remove();
    setActiveEditable(null);
    saveHistoryState();
  };

  const changeBlockColor = (color: string) => {
    if (!activeBlock) return;
    saveHistoryState();
    activeBlock.style.backgroundColor = color;
    saveHistoryState();
  };

  const handleImageUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    saveHistoryState();
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const id = 'img-' + Date.now();
      const imgHtml = `<div id="${id}" class="draggable-image-wrapper group relative avoid-break" style="width: 300px; display: block; margin: 0 auto 1rem auto;" contenteditable="false" draggable="true">
        <div class="absolute top-2 right-2 hidden group-hover:flex gap-1 bg-white p-1 rounded shadow z-10" contenteditable="false">
          <button class="align-img-left px-2 py-1 bg-gray-100 hover:bg-gray-100 rounded text-xs" title="Links">⬅️</button>
          <button class="align-img-center px-2 py-1 bg-gray-100 hover:bg-gray-100 rounded text-xs" title="Zentriert">⬆️</button>
          <button class="align-img-right px-2 py-1 bg-gray-100 hover:bg-gray-100 rounded text-xs" title="Rechts">➡️</button>
          <button class="delete-img px-2 py-1 bg-red-100 hover:bg-red-100 text-red-600 rounded text-xs" title="Löschen">🗑️</button>
        </div>
        <img src="${base64}" alt="Hochgeladenes Bild" referrerPolicy="no-referrer" draggable="false" class="w-full h-auto" />
      </div>`;
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = imgHtml;
      const imgElement = tempDiv.firstChild as HTMLElement;

      if (pendingImageTarget) {
        pendingImageTarget.parentNode?.replaceChild(imgElement, pendingImageTarget);
        setPendingImageTarget(null);
      } else if (activeBlock) {
        activeBlock.appendChild(imgElement);
      } else {
        document.getElementById('dossier-root')?.appendChild(imgElement);
      }
      saveHistoryState();
    };
    reader.readAsDataURL(file);
    if (imageUploadRef.current) imageUploadRef.current.value = '';
  };

  // Handle image placeholder clicks
  useEffect(() => {
    const handlePlaceholderClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement;
      if (!target) return;
      if (target.nodeType === 3) target = target.parentElement as HTMLElement;
      if (!target || !target.closest) return;

      const placeholder = target.closest('.image-placeholder-trigger');
      if (placeholder) {
        e.preventDefault();
        e.stopPropagation();
        setPendingImageTarget(placeholder as HTMLElement);
        imageUploadRef.current?.click();
      }
    };

    const root = document.getElementById('dossier-root');
    root?.addEventListener('click', handlePlaceholderClick);
    return () => root?.removeEventListener('click', handlePlaceholderClick);
  }, []);

  const handleAddRow = () => {
    if (!activeTableCell) return;
    saveHistoryState();
    const row = activeTableCell.closest('tr');
    const table = activeTableCell.closest('table');
    if (row && table) {
      const isRechenmauer = table.classList.contains('rechenmauer-table');
      const newRow = row.cloneNode(true) as HTMLTableRowElement;
      newRow.querySelectorAll('.editable').forEach(el => el.innerHTML = '...');
      
      if (isRechenmauer) {
        // Bei Rechenmauer: Ein Feld mehr hinzufügen
        const lastCell = newRow.cells[newRow.cells.length - 1];
        if (lastCell) {
          const newCell = lastCell.cloneNode(true) as HTMLTableCellElement;
          newCell.innerHTML = '...';
          newRow.appendChild(newCell);
        }
      }
      
      row.parentNode?.insertBefore(newRow, row.nextSibling);
    }
    saveHistoryState();
  };

  const handleDeleteRow = () => {
    if (!activeTableCell) return;
    saveHistoryState();
    const row = activeTableCell.closest('tr');
    if (row) row.remove();
    setActiveTableCell(null);
    saveHistoryState();
  };

  const handleAddColumn = () => {
    if (!activeTableCell) return;
    saveHistoryState();
    const table = activeTableCell.closest('table');
    const cellIndex = (activeTableCell as HTMLTableCellElement).cellIndex;
    if (table) {
      Array.from(table.rows).forEach((row: any) => {
        const newCell = row.cells[cellIndex].cloneNode(true) as HTMLTableCellElement;
        newCell.innerHTML = '...';
        row.insertBefore(newCell, row.cells[cellIndex].nextSibling);
      });
    }
    saveHistoryState();
  };

  const handleAddSubTask = async () => {
    try {
      if (!activeBlock) {
        setNotification({ message: 'Bitte wähle zuerst einen Block aus', type: 'error' });
        return;
      }
    
    // 1. Identify structure (Table, List, or Generic)
    const tables = activeBlock.querySelectorAll('table');
    const lists = activeBlock.querySelectorAll('ul, ol');
    const contentWrapper = activeBlock.querySelector('.content-wrapper');

    let type: 'table' | 'list' | 'structure' = 'structure';
    if (tables.length > 0) type = 'table';
    else if (lists.length > 0) type = 'list';

    let unitToClone: HTMLElement | null = null;
    let container: HTMLElement | null = null;

    if (type === 'table') {
      const lastTable = tables[tables.length - 1];
      container = lastTable.querySelector('tbody') || lastTable;
      const rows = container.querySelectorAll('tr');
      if (rows.length > 0) unitToClone = rows[rows.length - 1] as HTMLElement;
    } else if (type === 'list') {
      container = lists[lists.length - 1] as HTMLElement;
      const items = container.querySelectorAll('li');
      if (items.length > 0) unitToClone = items[items.length - 1] as HTMLElement;
    } else if (contentWrapper && contentWrapper.children.length > 0) {
      container = contentWrapper as HTMLElement;
      unitToClone = contentWrapper.children[contentWrapper.children.length - 1] as HTMLElement;
    }

    if (!unitToClone || !container) {
      setNotification({ message: 'Kein passendes Aufgabenformat gefunden', type: 'error' });
      return;
    }

    saveHistoryState();

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setNotification({ message: 'API Key fehlt', type: 'error' });
      return;
    }
    const ai = new GoogleGenAI({ apiKey });

    const blacklist = Array.from(container.children)
      .slice(-10)
      .map(el => (el as HTMLElement).innerText?.trim() || '')
      .filter(t => t && t !== '...' && t.length > 2)
      .join(', ');

    // Pattern recognition for lists
    let prefixPattern = '';
    let separatorPattern = ' – '; // Default separator
    
    if (type === 'list' && lists.length > 0) {
      const lastList = lists[lists.length - 1];
      const items = Array.from(lastList.querySelectorAll('li')).slice(-2);
      if (items.length >= 1) {
        const lastItemText = (items[items.length - 1] as HTMLElement).innerText?.trim() || '';
        // Extract prefix (e.g., "a) ", "1. ", "• ")
        const prefixMatch = lastItemText.match(/^([a-z]\)|[0-9]+\.|[•\-\*])\s*/i);
        if (prefixMatch) {
          prefixPattern = prefixMatch[1];
        }
        
        // Extract separator
        if (lastItemText.includes(' – ')) separatorPattern = ' – ';
        else if (lastItemText.includes(' / ')) separatorPattern = ' / ';
        else if (lastItemText.includes(', ')) separatorPattern = ', ';
      }
    }

    setIsGeneratingAi(true);

    // We generate one by one to keep the "pulse" feedback and avoid complex multi-unit parsing
    let currentAnchor = unitToClone;
    for (let i = 0; i < aiSubtaskCount; i++) {
        // Re-query container and unitToClone in case they changed during loop
        if (type === 'table') {
          const lastTable = tables[tables.length - 1];
          container = lastTable.querySelector('tbody') || lastTable;
        } else if (type === 'list') {
          container = lists[lists.length - 1] as HTMLElement;
        } else if (contentWrapper && contentWrapper.children.length > 0) {
          container = contentWrapper as HTMLElement;
        }

        if (!container || !currentAnchor) break;

        // Check if the anchor is already a placeholder
        const isPlaceholder = (el: HTMLElement) => {
          if (!el) return false;
          const editables = el.querySelectorAll('.editable');
          if (editables.length === 0) return el.innerText?.trim() === '...';
          return Array.from(editables).every(e => e.innerHTML?.trim() === '...');
        };

        let targetUnit: HTMLElement;
        
        // 1. Raus aus dem Element: Finde LI oder DIV.avoid-break
        let anchor = currentAnchor;
        if (type === 'list') {
          anchor = currentAnchor.closest('li') || currentAnchor;
        } else if (type === 'structure') {
          anchor = currentAnchor.closest('.avoid-break') || currentAnchor;
        }

        if (isPlaceholder(anchor) && i === 0) {
          targetUnit = anchor;
        } else {
          targetUnit = anchor.cloneNode(true) as HTMLElement;
          
          // 2. Harter Reset: Verhindere Injektion in bestehende Wörter
          const editables = targetUnit.querySelectorAll('.editable');
          if (editables.length > 0) {
            // Wir leeren den Inhalt, behalten aber die editierbaren Container
            // Wir setzen innerHTML auf die Platzhalter der editierbaren Felder
            const editablePlaceholders = Array.from(editables).map(() => 
              '<span class="editable" contenteditable="true">...</span>'
            ).join(' ');
            targetUnit.innerHTML = editablePlaceholders;
          } else {
            targetUnit.innerHTML = '...';
          }
          
        // 3. Harter Umbruch: insertAdjacentElement('afterend')
        if (anchor.parentElement) {
          anchor.insertAdjacentElement('afterend', targetUnit);
          currentAnchor = targetUnit; // Move anchor forward
        } else {
          console.warn('Anchor has no parent element, appending to container');
          container.appendChild(targetUnit);
          currentAnchor = targetUnit;
        }
        }

        targetUnit.classList.add('animate-pulse', 'bg-blue-50/50');
        try {
          targetUnit.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {
          // Ignore scroll errors
        }

        const blockText = activeBlock?.innerText || '';
        const editableFields = targetUnit.querySelectorAll('.editable');
        const fieldCount = editableFields.length || 1;

        const prompt = `Du bist ein präziser Content-Generator für Lehrmittel.
        Generiere EINE neue, inhaltlich passende Teilaufgabe für dieses Dossier.
        Kontext des Blocks: "${blockText.substring(0, 300)}"
        Bereits vorhandene Aufgaben (Blacklist): ${blacklist}
        
        ANFORDERUNGEN:
        - Erstelle EXAKT ${fieldCount} kurze, prägnante Inhalte.
        - Falls es eine Liste ist: Nutze das Präfix "${prefixPattern}" (falls vorhanden).
        - Falls es ein Lückentext ist: Nutze das Trennzeichen "${separatorPattern}".
        - Gib NUR die Inhalte zurück, getrennt durch das Zeichen "|".
        - KEINE Formatierung, KEIN HTML, NUR der reine Text.
        - Beispiel für 2 Felder: "Inhalt 1 | Inhalt 2"`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-preview',
          contents: prompt,
        });
        
        if (!response.text) {
          throw new Error('KI hat keinen Text zurückgegeben');
        }
        
        const aiResponse = response.text.trim();
        
        // 1. Text-Only: HTML-Tags säubern (stripTags)
        let cleanResponse = aiResponse.replace(/<[^>]*>?/gm, '');
        
        // 2. No-Echo Prinzip: Falls KI ein -> zur Erklärung nutzt, nimm den letzten Teil
        if (cleanResponse.includes('->')) {
          const parts = cleanResponse.split('->');
          if (parts.length > 1 && parts[0].length > 5) {
             cleanResponse = parts[parts.length - 1].trim();
          }
        }
        
        // 3. Bullet-Points entfernen
        cleanResponse = cleanResponse.replace(/^[•\-\*\d\.]+\s*/, '').trim();
        
        // 4. Kontext-Sperre: Nummerierung automatisch inkrementieren
        const numberMatch = cleanResponse.match(/^(\d+)\.\s*(.*)/);
        if (numberMatch) {
          const currentNum = parseInt(numberMatch[1]);
          const restText = numberMatch[2];
          
          // Prüfe existierende Nummern im Container
          const existingItems = Array.from(container.children);
          const existingNumbers = existingItems.map(el => {
            const m = (el as HTMLElement).innerText?.trim()?.match(/^(\d+)\./);
            return m ? parseInt(m[1]) : 0;
          });
          
          if (existingNumbers.includes(currentNum)) {
            const maxNum = Math.max(...existingNumbers, 0);
            cleanResponse = `${maxNum + 1}. ${restText}`;
          }
        }
        
        const values = cleanResponse.split('|').map(v => v.trim());
        if (editableFields.length > 0) {
          editableFields.forEach((el, idx) => {
            el.innerHTML = values[idx] || (values[0] && idx === 0 ? values[0] : '...');
          });
        } else {
          targetUnit.innerHTML = cleanResponse;
        }

        targetUnit.classList.remove('animate-pulse', 'bg-blue-50/50');
        // Small delay between generations for visual rhythm
        if (aiSubtaskCount > 1) await new Promise(r => setTimeout(r, 300));
      }

      setNotification({ message: `${aiSubtaskCount} KI-Teilaufgabe(n) hinzugefügt`, type: 'success' });
    } catch (err) {
      console.error('AI Subtask Error:', err);
      setNotification({ message: 'KI-Fehler. Bitte manuell ausfüllen.', type: 'error' });
    } finally {
      setIsGeneratingAi(false);
      saveHistoryState();
    }
  };

  const handleDeleteColumn = () => {
    if (!activeTableCell) return;
    saveHistoryState();
    const table = activeTableCell.closest('table');
    const cellIndex = (activeTableCell as HTMLTableCellElement).cellIndex;
    if (table) {
      Array.from(table.rows).forEach((row: any) => {
        if (row.cells[cellIndex]) row.cells[cellIndex].remove();
      });
    }
    setActiveTableCell(null);
    saveHistoryState();
  };

  const handleRootKeyDown = (e: any) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSaveProject();
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const activeEl = document.activeElement as HTMLElement;
      if (!activeEl) return;
      const isEditable = activeEl.classList.contains('editable') || activeEl.closest('.editable');
      const isInput = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA';
      
      // Wenn wir in einem editierbaren Feld sind und es leer ist
      const isEmptyEditable = isEditable && activeEl.innerText?.trim() === '';
      
      // Wenn wir gar nicht editieren (Fokus auf root oder body)
      const isNotEditing = !isEditable && !isInput;

      // Lösche den Block nur automatisch, wenn wir nicht editieren ODER wenn es ein einfacher Block (z.B. Textabsatz) ist
      const isSimpleBlock = activeBlock && activeBlock.querySelectorAll('.editable').length <= 1;

      if ((isNotEditing && activeBlock) || (isEmptyEditable && activeBlock && isSimpleBlock)) {
        e.preventDefault();
        handleDeleteBlock();
      } else if (isEmptyEditable && activeBlock && !isSimpleBlock) {
        // Innerhalb eines komplexen Blocks: Lösche das leere Feld und springe zum vorherigen/nächsten
        const isCell = activeEl.tagName === 'TD' || activeEl.tagName === 'TH';
        if (!isCell) {
          e.preventDefault();
          const editables = Array.from(activeBlock.querySelectorAll('.editable')) as HTMLElement[];
          const index = editables.indexOf(activeEl);
          
          if (index > 0) {
            const prev = editables[index - 1];
            saveHistoryState();
            activeEl.remove();
            prev.focus();
            // Cursor ans Ende setzen
            try {
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(prev);
              range.collapse(false);
              sel?.removeAllRanges();
              sel?.addRange(range);
            } catch (err) {
              console.warn("Could not set cursor position", err);
            }
            saveHistoryState();
          } else if (index === 0 && editables.length > 1) {
            const next = editables[1];
            saveHistoryState();
            activeEl.remove();
            next.focus();
            saveHistoryState();
          }
        }
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Enter in komplexen <li>-Elementen: neue eigenständige <li> erzeugen
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const anchor = sel.anchorNode;
      const el = anchor instanceof HTMLElement ? anchor : anchor?.parentElement;
      if (!el) return;

      const li = el.closest('li');
      if (!li || !li.closest('#dossier-root')) return;

      // Einfache <li> (direkt editierbar) → Browser-Default lassen
      const childEditables = li.querySelectorAll('.editable');
      if (childEditables.length <= 1 && li.hasAttribute('contenteditable')) return;

      // Komplexe <li> → neue eigenständige <li> erzeugen
      e.preventDefault();
      saveHistoryState();

      const newLi = li.cloneNode(false) as HTMLElement;
      Array.from(li.children).forEach(child => {
        const clone = (child as HTMLElement).cloneNode(false) as HTMLElement;
        clone.textContent = '';
        clone.setAttribute('contenteditable', 'true');
        if (!clone.classList.contains('editable')) clone.classList.add('editable');
        newLi.appendChild(clone);
      });

      li.after(newLi);

      const firstEditable = newLi.querySelector('.editable') as HTMLElement;
      if (firstEditable) {
        firstEditable.focus();
        const range = document.createRange();
        range.selectNodeContents(firstEditable);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      saveHistoryState();
    }
  };

  const toggleSolutions = () => {
    const nextState = !showSolutions;
    setShowSolutions(nextState);
    const root = document.getElementById('dossier-root');
    if (root) {
      if (!nextState) {
        root.classList.add('hide-solutions');
      } else {
        root.classList.remove('hide-solutions');
      }
    }
  };

  const handleUpdateToC = () => {
    handleAutoNumbering(); // Zuerst Nummerierung synchronisieren
    saveHistoryState();
    const root = document.getElementById('dossier-root');
    if (!root) return;
    const tocList = root.querySelector('#toc-list');
    if (!tocList) {
      console.error("Kein Inhaltsverzeichnis (ul#toc-list) gefunden!");
      return;
    }
    tocList.innerHTML = '';
    
    // Scan for headings and page breaks to determine page numbers
    const elements = root.querySelectorAll('h1, h2, .page-break');
    
    // Find how many pages are before the ToC to adjust numbering
    let pagesBeforeToC = 0;
    const allElements = Array.from(root.querySelectorAll('*'));
    const tocListIndex = allElements.indexOf(tocList as Element);
    const allPageBreaks = Array.from(root.querySelectorAll('.page-break'));
    for (const pb of allPageBreaks) {
      if (allElements.indexOf(pb) < tocListIndex) {
        pagesBeforeToC++;
      }
    }

    let currentPage = 1;
    
    elements.forEach(el => {
      if (el.classList.contains('page-break')) {
        currentPage++;
        return;
      }
      
      const heading = el as HTMLElement;
      if (heading.textContent?.includes('Inhaltsverzeichnis')) return;
      
      const li = document.createElement('li');
      li.className = heading.tagName === 'H1' ? 'font-bold mt-4 flex justify-between' : 'ml-6 text-gray-700 flex justify-between';
      
      const titleSpan = document.createElement('span');
      titleSpan.textContent = heading.textContent;
      titleSpan.contentEditable = 'true';
      titleSpan.className = 'editable';
      
      const pageSpan = document.createElement('span');
      // Adjust page number based on ToC position
      const displayPage = Math.max(1, currentPage - pagesBeforeToC);
      pageSpan.textContent = displayPage.toString();
      pageSpan.className = 'text-gray-400 font-normal ml-2';
      
      li.appendChild(titleSpan);
      li.appendChild(pageSpan);
      tocList.appendChild(li);
    });
    
    saveHistoryState();
  };

  // Helper to force color resolution to rgb/rgba for compatibility (e.g. with html2pdf/html2canvas)
  const hasModernColor = (str: string | null | undefined) => {
    if (!str) return false;
    return /oklch|oklab|lch|lab|color-mix|hwb|color\(/.test(str);
  };

  const resolveColorToRgb = (colorStr: string, ctx: CanvasRenderingContext2D, cache: Map<string, string>) => {
    if (!hasModernColor(colorStr)) return colorStr;
    if (cache.has(colorStr)) return cache.get(colorStr)!;
    
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = colorStr;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      const resolved = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
      cache.set(colorStr, resolved);
      return resolved;
    } catch (e) {
      return 'transparent';
    }
  };

  const flattenElementStyles = (source: HTMLElement, target: HTMLElement) => {
    const allOriginal = [source, ...Array.from(source.querySelectorAll('*'))];
    const allClone = [target, ...Array.from(target.querySelectorAll('*'))];
    
    const colorCache = new Map<string, string>();
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const colorProps = [
      'color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor',
      'borderBottomColor', 'borderLeftColor', 'fill', 'stroke', 'outlineColor',
      'stopColor', 'floodColor', 'lightingColor', 'caretColor', 'accentColor'
      // Note: textDecorationColor intentionally excluded — setting it inline interferes
      // with html2canvas rendering of text-decoration-line (e.g. line-through).
    ];

    for (let i = 0; i < allOriginal.length; i++) {
      const el = allOriginal[i] as HTMLElement;
      const cloneEl = allClone[i] as HTMLElement;
      if (!cloneEl) continue;

      try {
        const style = window.getComputedStyle(el);
        
        colorProps.forEach(prop => {
          // @ts-ignore
          const val = style[prop];
          if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
            // @ts-ignore
            cloneEl.style[prop] = hasModernColor(val) ? resolveColorToRgb(val, ctx, colorCache) : val;
          }
        });
        
        // Flatten border-radius and border-style so html2canvas renders the correct
        // shape (e.g. square vs circle) even when Tailwind v4 uses CSS variables.
        const br = style.borderRadius;
        if (br && br !== '0px') cloneEl.style.borderRadius = br;
        const bs = style.borderStyle;
        if (bs && bs !== 'none') cloneEl.style.borderStyle = bs;
        const bw = style.borderWidth;
        if (bw && bw !== '0px') cloneEl.style.borderWidth = bw;

        // Aggressively strip anything that might contain oklch and we haven't handled
        if (hasModernColor(style.boxShadow)) cloneEl.style.boxShadow = 'none';
        if (hasModernColor(style.textShadow)) cloneEl.style.textShadow = 'none';
        if (hasModernColor(style.backgroundImage)) cloneEl.style.backgroundImage = 'none';
        if (hasModernColor(style.borderImage)) cloneEl.style.borderImage = 'none';
        if (hasModernColor(style.outline)) cloneEl.style.outline = 'none';

        // Ensure tables have borders in PDF
        if (el.tagName === 'TABLE') {
          cloneEl.style.borderCollapse = 'collapse';
          cloneEl.style.width = '100%';
        }
        if (el.tagName === 'TD' || el.tagName === 'TH') {
          cloneEl.style.border = '1px solid #000';
        }
      } catch (e) {
        console.warn('Style flattening error for element', el, e);
      }
    }
  };

  const handleSaveProject = () => {
    const root = document.getElementById('dossier-root');
    if (!root) return;
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
    
    // Convert oklch to rgb in the saved HTML for better compatibility
    flattenElementStyles(root, clone);

    const dataToSave = {
      globalFont: globalFont,
      fullHTML: clone.innerHTML
    };
    const blob = new Blob([JSON.stringify(dataToSave)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Mein_Deutsch_Dossier_Backup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (!result) return;
        const data = JSON.parse(result as string);
        if (data.fullHTML) {
          const root = document.getElementById('dossier-root');
          if (root) {
            root.innerHTML = data.fullHTML;
            if (data.globalFont) setGlobalFont(data.globalFont);
            historyRef.current = [data.fullHTML];
            historyIndexRef.current = 0;
            onChange(data.fullHTML);
          }
        }
      } catch (err) {
        console.error("Fehler beim Laden der Datei", err);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Repaginate before export to ensure no page overflows (user may have edited since last repaginate)
    repaginate();

    // Off-screen staging area outside #dossier-root so none of its !important CSS rules apply
    const stage = document.createElement('div');
    stage.style.cssText = 'position:absolute;left:-9999px;top:0;';
    document.body.appendChild(stage);

    try {
      const root = document.getElementById('dossier-root');
      if (!root) throw new Error('dossier-root not found');

      const pages = Array.from(root.children).filter(
        c => !c.classList.contains('page-break')
      ) as HTMLElement[];
      if (pages.length === 0) throw new Error('No pages found');

      let tocPageIndex = -1;
      pages.forEach((page, idx) => {
        if (tocPageIndex === -1 && page.querySelector('#toc-list')) tocPageIndex = idx;
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const A4_W_MM = 210;
      const A4_H_MM = 297;

      // Reset ALL scrollTops before rendering (not just direct children of root)
      for (const page of pages) {
        page.scrollTop = 0;
        page.querySelectorAll('*').forEach(el => { (el as HTMLElement).scrollTop = 0; });
      }

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageW = page.offsetWidth;
        const pageH = page.offsetHeight;

        // --- Clone the page into the staging area (outside #dossier-root) ---
        // The CSS rule "#dossier-root > *" does NOT match here, so overflow:clip !important
        // and height:29.7cm !important don't apply. We set them explicitly as safe inline styles.
        const clone = page.cloneNode(true) as HTMLElement;
        clone.style.width = `${pageW}px`;
        clone.style.height = `${pageH}px`;
        clone.style.overflow = 'hidden';   // html2canvas supports 'hidden', not 'clip'
        clone.style.boxShadow = 'none';
        clone.style.margin = '0';
        clone.style.display = 'block';
        clone.style.boxSizing = 'border-box';
        clone.style.position = 'relative';

        // (Top-margin shift is applied post-render by cropping the canvas — see below.)

        // IMPORTANT: Flatten colors FIRST, before any DOM modifications that change element count.
        // flattenElementStyles matches live ↔ clone elements by array index.
        // Adding/removing elements to the clone afterwards would shift indices and break matching.
        flattenElementStyles(page, clone);

        // --- Now apply all clone modifications (may change element count) ---

        // Strip editor-only decorations
        clone.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
        clone.querySelectorAll<HTMLElement>('.no-print').forEach(el => { el.style.display = 'none'; });
        clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        clone.querySelectorAll<HTMLElement>('.resizable-cover-image-wrapper').forEach(el => {
          el.style.border = 'none'; el.style.outline = 'none';
        });

        // Fix absolute+transform positioning for html2canvas compatibility (cover page).
        const liveAbsEls = page.querySelectorAll<HTMLElement>('[style*="translate"]');
        const cloneAbsEls = clone.querySelectorAll<HTMLElement>('[style*="translate"]');
        for (let j = 0; j < liveAbsEls.length && j < cloneAbsEls.length; j++) {
          const liveEl = liveAbsEls[j];
          const cloneEl = cloneAbsEls[j];
          const liveRect = liveEl.getBoundingClientRect();
          const parentEl = liveEl.offsetParent as HTMLElement | null;
          if (parentEl) {
            const parentRect = parentEl.getBoundingClientRect();
            cloneEl.style.left = `${liveRect.left - parentRect.left}px`;
            cloneEl.style.top = `${liveRect.top - parentRect.top}px`;
            cloneEl.style.transform = 'none';
          }
        }

        // Strip .editable class (editor-only padding/margin that causes overlap)
        clone.querySelectorAll<HTMLElement>('.editable').forEach(el => {
          el.classList.remove('editable');
        });

        // Fix schreib-linie: html2canvas doesn't support background-attachment:local or CSS variables.
        // Draw lines at the BOTTOM of each line-height block (not the top), so text sits above lines.
        clone.querySelectorAll<HTMLElement>('.schreib-linie').forEach(el => {
          const lineH = 40; // 2.5rem ≈ 40px
          el.style.lineHeight = `${lineH}px`;
          // Line at bottom of each block: transparent for 39px, then 1px colored line
          el.style.backgroundImage = `linear-gradient(transparent ${lineH - 1}px, #cbd5e1 ${lineH - 1}px)`;
          el.style.backgroundSize = `100% ${lineH}px`;
          el.style.backgroundAttachment = 'scroll';
          el.style.backgroundRepeat = 'repeat';
          el.style.backgroundPosition = '0 0';
          el.style.paddingTop = '0';
          el.style.resize = 'none';
          el.style.overflow = 'visible';
        });

        stage.appendChild(clone);

        // Fix flex-centered boxes: html2canvas has limited flex support.
        // Target fixed-size boxes (answer squares, emoji frames) but skip full-width layout containers.
        const liveFlexEls = page.querySelectorAll<HTMLElement>('.flex.items-center.justify-center');
        const cloneFlexEls = clone.querySelectorAll<HTMLElement>('.flex.items-center.justify-center');
        for (let j = 0; j < liveFlexEls.length && j < cloneFlexEls.length; j++) {
          const liveEl = liveFlexEls[j];
          const cloneEl = cloneFlexEls[j];
          const h = liveEl.offsetHeight;
          const w = liveEl.offsetWidth;
          // Fix boxes up to ~200px (answer squares w-8/h-8, emoji frames w-24/h-24, etc.)
          // Skip large layout containers (full-width rows, page sections)
          const isCenterBox = h > 0 && h <= 200 && w > 0 && w <= 200;
          if (isCenterBox) {
            // Measure actual content height from live element to compute exact padding
            const firstChild = liveEl.firstElementChild as HTMLElement | null;
            // Use getBoundingClientRect for accurate height of inline elements (spans)
            const contentH = firstChild ? firstChild.getBoundingClientRect().height : (liveEl.scrollHeight - (liveEl.offsetHeight - liveEl.clientHeight));
            // Account for borders: with border-box, padding shares space with borders
            const liveStyle = window.getComputedStyle(liveEl);
            const borderT = parseFloat(liveStyle.borderTopWidth) || 0;
            const borderB = parseFloat(liveStyle.borderBottomWidth) || 0;
            const innerH = h - borderT - borderB;
            // Emojis (larger boxes) need +5px down nudge on padding
            const isSmallBox = h <= 60;
            const emojiNudge = isSmallBox ? 0 : 5;
            const padTop = Math.max(0, Math.round((innerH - contentH) / 2) + emojiNudge);

            cloneEl.style.display = 'block';
            cloneEl.style.width = `${w}px`;
            cloneEl.style.height = `${h}px`;
            cloneEl.style.boxSizing = 'border-box';
            cloneEl.style.textAlign = 'center';
            cloneEl.style.paddingTop = `${padTop}px`;
            cloneEl.style.paddingLeft = '0';
            cloneEl.style.paddingRight = '0';
            cloneEl.style.paddingBottom = '0';
            cloneEl.style.overflow = 'visible';
            // Reset children to inline for horizontal text-align centering
            cloneEl.querySelectorAll<HTMLElement>(':scope > *').forEach(child => {
              child.style.display = 'inline';
              child.style.lineHeight = 'normal';
              child.style.verticalAlign = 'top';
              // Small number boxes: shift content up 5px with relative positioning
              // (padding approach can't go negative, so use position offset instead)
              if (isSmallBox) {
                child.style.position = 'relative';
                child.style.top = '-5px';
              }
            });
          }
        }

        // Fix highlight: html2canvas renders background-color at the top of the line box,
        // but the visible text sits lower. Replace background-color with a gradient that
        // starts 7px from the top — text is unaffected, background shifts down.
        clone.querySelectorAll<HTMLElement>('.is-highlight-answer').forEach(cloneEl => {
          cloneEl.style.backgroundColor = 'transparent';
          // Gradient starts 7px from top (background shifts down) and extends 7px
          // below the element via padding-bottom (background grows downward).
          cloneEl.style.backgroundImage = 'linear-gradient(transparent 7px, #fef08a 7px)';
          cloneEl.style.backgroundRepeat = 'no-repeat';
          cloneEl.style.backgroundSize = '100% 100%';
          // Extend padding-bottom by 7px so the yellow area reaches further down
          const existingPadBottom = parseFloat(window.getComputedStyle(cloneEl).paddingBottom) || 0;
          cloneEl.style.paddingBottom = `${existingPadBottom + 7}px`;
        });

        // Fix strikethrough: html2canvas misrenders text-decoration: line-through.
        // MUST run AFTER stage.appendChild(clone) so offsetHeight is available.
        clone.querySelectorAll<HTMLElement>('.is-strikethrough-answer').forEach(cloneEl => {
          cloneEl.style.textDecoration = 'none';
          cloneEl.style.position = 'relative';
          cloneEl.style.display = 'inline-block';
          cloneEl.style.color = '#2563eb';
          // Now that clone is in the DOM, offsetHeight returns the real height
          const h = cloneEl.offsetHeight;
          const lineTop = Math.round(h / 2) + 8;
          const line = document.createElement('div');
          line.style.cssText = `position:absolute;left:-1px;right:-1px;top:${lineTop}px;height:2px;background:#2563eb;pointer-events:none;`;
          cloneEl.appendChild(line);
        });

        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: pageW,
          height: pageH,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc: Document) => {
            // Strip any residual oklch from the cloned stylesheets (inline styles above win on specificity)
            clonedDoc.querySelectorAll('style').forEach(styleEl => {
              try {
                let css = styleEl.innerHTML;
                css = css.replace(/overflow\s*:\s*clip(\s*!important)?/g, 'overflow: hidden !important');
                css = css.replace(/oklch\s*\([^)]+\)/gs, 'transparent');
                css = css.replace(/oklab\s*\([^)]+\)/gs, 'transparent');
                css = css.replace(/color-mix\s*\([^)]+\)/gs, 'transparent');
                styleEl.innerHTML = css;
              } catch (_) {}
            });
          },
        });

        stage.removeChild(clone);

        // Dynamic per-page margin balancing: scan the rendered canvas to find
        // the first row with non-white pixels (= where visible content starts),
        // then shift content so every page has the same effective top margin.
        // This handles pages with different internal spacing (exercises vs Merkblätter).
        const canvasCtx = canvas.getContext('2d')!;
        const imgPixels = canvasCtx.getImageData(0, 0, canvas.width, Math.min(canvas.height, 400));
        const pixels = imgPixels.data;
        const cw = canvas.width;

        // Find first row containing a non-white pixel (threshold 250 to ignore JPEG artifacts)
        let firstContentRow = 0;
        findRow:
        for (let row = 0; row < imgPixels.height; row++) {
          for (let col = 0; col < cw; col++) {
            const idx = (row * cw + col) * 4;
            if (pixels[idx] < 250 || pixels[idx + 1] < 250 || pixels[idx + 2] < 250) {
              firstContentRow = row;
              break findRow;
            }
          }
        }

        // Target: first visible content should be at this many canvas-pixels from the top.
        // ~90 CSS-px at scale 2 = 180 canvas-px ≈ 2.4cm from page edge.
        const TARGET_TOP = 180;
        const cropPx = Math.max(0, firstContentRow - TARGET_TOP);

        let finalCanvas: HTMLCanvasElement;
        if (cropPx > 0) {
          finalCanvas = document.createElement('canvas');
          finalCanvas.width = canvas.width;
          finalCanvas.height = canvas.height;
          const sCtx = finalCanvas.getContext('2d')!;
          sCtx.fillStyle = '#ffffff';
          sCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
          sCtx.drawImage(
            canvas,
            0, cropPx, canvas.width, canvas.height - cropPx,
            0, 0, canvas.width, canvas.height - cropPx
          );
        } else {
          finalCanvas = canvas;
        }

        const imgData = finalCanvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, A4_W_MM, A4_H_MM);
      }

      if (tocPageIndex >= 0) {
        const totalPages = pdf.getNumberOfPages();
        for (let i = tocPageIndex + 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(10);
          pdf.setTextColor(120, 120, 120);
          pdf.text(`Seite ${i - tocPageIndex}`, A4_W_MM / 2, A4_H_MM - 7, { align: 'center' });
        }
      }

      pdf.save('Mein_Dossier.pdf');

    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('PDF Download Fehler:', err);
      setNotification({ message: `PDF Fehler: ${msg}`, type: 'error' });
    } finally {
      document.body.removeChild(stage);
      setIsDownloadingPdf(false);
    }
  };


  const resetPageScrollTops = () => {
    const root = document.getElementById('dossier-root');
    if (!root) return;
    Array.from(root.children).forEach(c => {
      if (!c.classList.contains('page-break')) (c as HTMLElement).scrollTop = 0;
    });
  };

  const repaginate = () => {
    const root = document.getElementById('dossier-root');
    if (!root) return;

    // Ensure no page is scrolled (browser may auto-scroll contenteditable containers)
    resetPageScrollTops();

    // --- Phase 0: Unwrap the outer wrapper if present ---
    // The AI generates: root → outerWrapper(max-w-4xl) → [page1, pb, page2, pb, ...]
    // We need:          root → [page1, pb, page2, pb, ...]
    // Without unwrapping, repaginate can't properly manage individual pages.
    const nonPbDirectChildren = Array.from(root.children).filter(
      c => !c.classList.contains('page-break') && !c.classList.contains('cover-page-wrapper') && !c.hasAttribute('data-cover')
    );
    if (nonPbDirectChildren.length === 1) {
      const wrapper = nonPbDirectChildren[0] as HTMLElement;
      // Detect outer wrapper: has mx-auto (layout wrapper), multiple children, and is NOT itself a page container
      const looksLikeWrapper = wrapper.classList.contains('mx-auto') && wrapper.children.length > 1
        && !wrapper.classList.contains('cover-page-container');
      if (looksLikeWrapper) {
        // Move all children out of the wrapper into root (preserving order)
        while (wrapper.firstChild) {
          root.insertBefore(wrapper.firstChild, wrapper);
        }
        root.removeChild(wrapper);
      }
    }

    const isSkipped = (el: Element) =>
      el.classList.contains('page-break') ||
      el.classList.contains('cover-page-wrapper') ||
      el.classList.contains('cover-page-container') ||
      el.classList.contains('title-page-placeholder') ||
      el.hasAttribute('data-cover');

    const getPageClass = (): string => {
      for (const child of Array.from(root.children)) {
        if (!isSkipped(child)) return child.className;
      }
      return 'p-[2.5cm]';
    };

    // Always inserts a brand-new page immediately after `page` (before any existing next page).
    // Structure: page → existingPB → [newPage → newPB] → existingNextPage
    const insertNewPageAfter = (page: HTMLElement): HTMLElement => {
      const newPage = document.createElement('div');
      newPage.className = getPageClass();
      const newPB = document.createElement('div');
      newPB.className = 'page-break avoid-break';
      const afterPage = page.nextElementSibling;
      if (afterPage?.classList.contains('page-break')) {
        // page → afterPB → [newPage → newPB] → rest
        afterPage.after(newPage);
        newPage.after(newPB);
      } else {
        // page → [newPB → newPage] → rest
        page.after(newPB);
        newPB.after(newPage);
      }
      return newPage;
    };

    let iterations = 0;
    let anyChange = true;
    while (anyChange && iterations++ < 300) {
      anyChange = false;
      for (const child of Array.from(root.children)) {
        const page = child as HTMLElement;
        if (isSkipped(page)) continue;

        // Measure available content area using actual computed padding
        const style = window.getComputedStyle(page);
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const paddingBottom = parseFloat(style.paddingBottom) || 0;
        // offsetHeight includes padding+border (box-sizing:border-box from Tailwind preflight)
        const CONTENT_H = page.offsetHeight - paddingTop - paddingBottom;

        // Sum children heights including margins, skipping page-break divs.
        // offsetHeight does NOT include margins, so we add them explicitly.
        let childrenH = 0;
        for (const c of Array.from(page.children)) {
          const child = c as HTMLElement;
          if (child.classList?.contains('page-break')) continue;
          const cs = window.getComputedStyle(child);
          const mt = parseFloat(cs.marginTop) || 0;
          const mb = parseFloat(cs.marginBottom) || 0;
          childrenH += child.offsetHeight + mt + mb;
        }
        if (childrenH <= CONTENT_H) continue;

        // Filter out page-break children for the move/split logic
        const contentChildren = Array.from(page.children).filter(
          c => !(c as HTMLElement).classList?.contains('page-break')
        ) as HTMLElement[];

        if (contentChildren.length > 1) {
          // Move last content block to a brand-new page immediately after this one.
          // If the second-to-last block is a heading (h1–h4), move it together
          // with the last block so titles are never stranded without their content.
          const lastBlock = contentChildren[contentChildren.length - 1];
          const prevBlock = contentChildren.length > 2 ? contentChildren[contentChildren.length - 2] : null;
          const isHeading = prevBlock && /^H[1-4]$/.test(prevBlock.tagName);
          const newPage = insertNewPageAfter(page);
          if (isHeading) newPage.appendChild(prevBlock!);
          newPage.appendChild(lastBlock);
          resetPageScrollTops();
          anyChange = true;
          break;
        } else if (contentChildren.length === 1) {
          // Single oversized block — split its children in half
          const block = contentChildren[0];
          const kids = Array.from(block.children);
          if (kids.length < 2) break;
          const mid = Math.ceil(kids.length / 2);
          const newBlock = document.createElement(block.tagName);
          newBlock.className = block.className;
          kids.slice(mid).forEach(k => newBlock.appendChild(k));
          const newPage = insertNewPageAfter(page);
          newPage.appendChild(newBlock);
          resetPageScrollTops();
          anyChange = true;
          break;
        }
      }
    }
  };

  const handleRootInput = () => {
    resetPageScrollTops();
    // Ensure any newly created elements (e.g. new <li> from Enter key) are editable
    const root = document.getElementById('dossier-root');
    if (root) {
      root.querySelectorAll('li, p, h1, h2, h3, h4, td, th, ol, ul, span, b, i, strong, em').forEach(el => {
        const element = el as HTMLElement;
        if (!element.hasAttribute('contenteditable') &&
            !element.classList.contains('page-break') &&
            !element.classList.contains('avoid-break') &&
            !element.classList.contains('cover-page-container') &&
            !element.classList.contains('cover-page-wrapper') &&
            !element.classList.contains('draggable-image-wrapper') &&
            element.id !== 'toc-list' &&
            element.parentElement?.id !== 'dossier-root') {
          element.setAttribute('contenteditable', 'true');
          element.style.userSelect = 'text';
          element.style.webkitUserSelect = 'text';
          if (!element.classList.contains('editable') && !element.classList.contains('is-answer')) {
            element.classList.add('editable');
          }
        }
      });
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      repaginate();
      saveHistoryState();
    }, 800);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    const root = document.getElementById('dossier-root');
    if (!root || !e.dataTransfer) return;

    const dragData = e.dataTransfer.getData('text/plain');
    if (dragData && dragData.startsWith('img-')) {
      e.preventDefault();
      const draggedEl = document.getElementById(dragData);
      if (draggedEl) {
        // Find drop position
        let range: Range | null = null;
        if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(e.clientX, e.clientY);
        } else if ((e as any).rangeParent) {
          range = document.createRange();
          range.setStart((e as any).rangeParent, (e as any).rangeOffset);
        }

        if (range) {
          range.insertNode(draggedEl);
        } else {
          // Fallback to end of root
          root.appendChild(draggedEl);
        }
        saveHistoryState();
      }
    } else {
      // Small delay for native drops
      setTimeout(() => {
        saveHistoryState();
      }, 50);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (markerMode) {
      e.preventDefault();
      return;
    }
    let target = e.target as HTMLElement;
    if (!target) return;
    if (target.nodeType === 3) target = target.parentElement as HTMLElement;
    if (!target || !target.closest) return;

    const wrapper = target.closest('.draggable-image-wrapper');
    if (wrapper && wrapper.id) {
      e.dataTransfer.setData('text/plain', wrapper.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  // --- NEU: GEMINI AI FUNKTIONEN (Sicheres Fetch-Handling ohne Crashes) ---
  const handleAutoNumbering = () => {
    const root = document.getElementById('dossier-root');
    if (!root) return;

    let currentTaskIndex = 0;
    let themeLetter = '';

    // Wir suchen NUR Aufgabentitel (h3), wie vom Nutzer gewünscht
    // Alle anderen Überschriften (h1, h2) werden ignoriert und bleiben unverändert
    const tasks = Array.from(root.querySelectorAll('h3'));
    
    tasks.forEach((header) => {
      const el = header as HTMLElement;

      if (el.tagName === 'H3') {
        // WICHTIG: Wir synchronisieren NUR, wenn es bereits wie eine Aufgabe aussieht
        // um zu verhindern, dass normale Überschriften (h3) überschrieben werden.
        const originalText = el.innerText?.trim() || '';
        const isTaskPattern = /^(Aufgabe|([A-Z]\.\d+)|(\d+\.))/i.test(originalText);
        
        if (!isTaskPattern && !originalText.toLowerCase().startsWith('aufgabe')) {
          // Keine Aufgabe erkannt -> Überspringen
          return;
        }

        // 1. Extrahiere Buchstabe und Zahl falls vorhanden
        const matchFull = originalText.match(/^(Aufgabe\s+)?([A-Z])\.(\d+)([:\s]*)(.*)/i);
        const matchNum = originalText.match(/^(Aufgabe\s+)?(\d+)([:\s]*)(.*)/i);
        
        let prefix = 'Aufgabe ';
        let separator = ': ';
        let text = '';
        let extractedLetter = '';
        let extractedNumber = 0;
        
        if (matchFull) {
          prefix = matchFull[1] || '';
          extractedLetter = matchFull[2].toUpperCase();
          extractedNumber = parseInt(matchFull[3], 10);
          separator = matchFull[4] || (matchFull[5] ? ': ' : '');
          text = matchFull[5] || '';
        } else if (matchNum) {
          prefix = matchNum[1] || '';
          extractedNumber = parseInt(matchNum[2], 10);
          separator = matchNum[3] || (matchNum[4] ? ': ' : '');
          text = matchNum[4] || '';
        } else {
          // Fallback für "Aufgabe: Titel"
          text = originalText.replace(/^Aufgabe[:\s]*/i, '').trim();
          prefix = 'Aufgabe ';
          separator = text ? ': ' : '';
        }

        // 2. Logik: Falls ein neuer Buchstabe auftaucht, übernehmen wir ihn
        if (extractedLetter && extractedLetter !== themeLetter) {
          themeLetter = extractedLetter;
          currentTaskIndex = extractedNumber;
        } else {
          // Ansonsten einfach weiterzählen
          currentTaskIndex++;
        }
        
        // 3. Text setzen - Wir behalten das Präfix (Aufgabe oder leer) bei
        if (themeLetter) {
          el.innerText = `${prefix}${themeLetter}.${currentTaskIndex}${separator}${text}`;
        } else {
          el.innerText = `${prefix}${currentTaskIndex}${separator}${text}`;
        }
      }
    });

    saveHistoryState();
    setNotification({ message: "Nummerierung wurde aktualisiert.", type: 'success' });
  };

  const handleGenerateAiExercise = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    setAiError('');
    
    // Take snapshot before AI action
    onAddSnapshot('Vor KI-Aufgabe');

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key fehlt in der Umgebung.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const themeColor = theme || 'blue';
      const systemInstruction = `Du bist ein brillanter Assistent für Lehrpersonen. Erstelle eine inhaltliche Aufgabe passend zum Thema des Nutzers.
      WICHTIG: Gib AUSSCHLIESSLICH validen HTML-Code zurück, keine Markdown-Erklärungen, kein \`\`\`html davor.
      
      STRUKTUR & NUMMERIERUNG (WICHTIG):
      - Erstelle KEINE Kapitel (h1) oder Unterthemen (h2).
      - Erstelle NUR die Aufgabe (h3).
      - Format für den Titel (h3): "Aufgabe [Themenbuchstabe].[Nummer]: [Titel]" (z.B. "Aufgabe D.3: Ein Tag im Wald").
      - Falls der Kontext (Themenbuchstabe/Nummer) unbekannt ist, nutze Platzhalter wie "X.Y" oder lass es weg, der Nutzer kann es mit "Aufg.-Sync" korrigieren.
      
      SCHRIFTGRADE:
      - Aufgabentitel (h3): text-[14pt]
      - Aufgabenstellung (p): text-[12pt]
      - Inhalt der Aufgabe (div/p): text-[12pt]
      
      Das HTML MUSS genau dieses Format nutzen:
      <div class="avoid-break relative mb-8 mt-4 transition-all text-[12pt]">
        <div class="content-wrapper p-8 border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 leading-loose">
          <h3 class="editable font-bold text-[14pt] mb-2 text-${themeColor}-700" contenteditable="true" suppresscontenteditablewarning="true">Aufgabe: [Titel]</h3>
          <p class="editable mb-4 text-gray-600 italic" contenteditable="true" suppresscontenteditablewarning="true">[Arbeitsanweisung für Schüler]</p>
          <div class="editable text-justify" contenteditable="true" suppresscontenteditablewarning="true">[Hier der Text, Lückentext oder die Aufgabe]</div>
        </div>
      </div>
      TIPP: Um Lösungen oder Lücken einzubauen, umschließe die Wörter mit:
      - <span class="gap-line is-answer" contenteditable="true">Lösungswort</span> (Lösung direkt auf der Schreiblinie. Im Schülermodus unsichtbar, aber die Linie bleibt!)
      - <span class="is-answer" contenteditable="true">Lösung</span> (Text, der im Schülermodus komplett unsichtbar ist, ohne Linie)
      - <span class="is-strikethrough-answer" contenteditable="true">Falsches Wort</span> (Wort, das im Lösungsmodus durchgestrichen ist, im Schülermodus normal)
      - <div class="schreib-linie editable" contenteditable="true"><span class="is-answer">Musterlösung</span></div> (Für längere Freitext-Antworten wie Professor Zipp Schreibaufgaben oder "Was fällt dir auf?" Fragen)
      Generiere die Aufgabe nun basierend auf diesem Thema:`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: aiPrompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      let generatedHtml = response.text || '';
      generatedHtml = generatedHtml.replace(/\`\`\`html/gi, '').replace(/\`\`\`/g, '').trim();

      if (!generatedHtml) {
          throw new Error("Leere Antwort von der KI erhalten.");
      }

      saveHistoryState();
      
      const newBlock = document.createElement('div');
      newBlock.innerHTML = generatedHtml;
      
      let htmlElement = newBlock.firstElementChild as HTMLElement;
      if (!htmlElement) {
         htmlElement = document.createElement('div');
         htmlElement.className = 'avoid-break mb-8 mt-4 transition-all';
         htmlElement.innerHTML = generatedHtml;
      }
      
      if (activeBlock) {
         activeBlock.parentNode?.insertBefore(htmlElement, activeBlock.nextSibling);
         setTimeout(() => htmlElement.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      } else {
         const root = document.getElementById('dossier-root');
         if(root) {
             root.appendChild(htmlElement);
             setTimeout(() => root.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
         }
      }
      
      setTimeout(saveHistoryState, 50);
      setShowAiModal(false);
      setAiPrompt('');
    } catch (error: any) {
      let errorMessage = "Es gab einen Fehler bei der Generierung: " + error.message;
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = "⚠️ Rate-Limit erreicht (Anfragen pro Minute). Bitte warte kurz und versuche es gleich noch einmal.";
      }
      setAiError(errorMessage);
      console.log("API Error:", error.message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApplyFrame = (frameId: string) => {
    if (!activeBlock) return;
    saveHistoryState();

    // 1. Ensure structure: .avoid-break > .frame-overlay + .content-wrapper
    let block = activeBlock;
    if (!block.classList.contains('avoid-break')) {
      // If we clicked something inside, find the parent block
      block = block.closest('.avoid-break') as HTMLElement || activeBlock;
    }

    // Ensure position relative
    block.style.position = 'relative';
    block.classList.add('avoid-break');

    // Wrap content if not already wrapped
    let contentWrapper = block.querySelector('.content-wrapper') as HTMLElement;
    if (!contentWrapper) {
      const wrapper = document.createElement('div');
      wrapper.className = 'content-wrapper p-8 relative z-0';
      while (block.firstChild) {
        wrapper.appendChild(block.firstChild);
      }
      block.appendChild(wrapper);
      contentWrapper = wrapper;
    } else {
      // If it already existed, move any background colors to the parent block
      // to ensure the frame area has the same color as the content area.
      const allPossibleColors = [
        'bg-white', 'bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-red-50', 
        'bg-purple-50', 'bg-orange-50', 'bg-emerald-50', 'bg-cyan-50', 'bg-pink-50',
        'bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-red-100', 'bg-purple-100',
        'bg-gray-50', 'bg-gray-100'
      ];
      allPossibleColors.forEach(color => {
        if (contentWrapper.classList.contains(color)) {
          contentWrapper.classList.remove(color);
          block.classList.add(color);
        }
      });
    }

    // 2. Handle SVG Overlay
    let svgOverlay = block.querySelector('.frame-overlay') as HTMLElement;
    if (svgOverlay) svgOverlay.remove();

    if (frameId === 'none') {
      contentWrapper.style.padding = '';
      saveHistoryState();
      setNotification({ message: `Rahmen entfernt`, type: 'success' });
      return;
    }

    // Create new SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "frame-overlay");
    svg.setAttribute("viewBox", "0 0 1000 1000");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.position = 'absolute';
    svg.style.inset = '0';
    svg.style.zIndex = '10';
    svg.style.pointerEvents = 'none';
    svg.style.width = '100%';
    svg.style.height = '100%';

    let svgContent = '';

    if (frameId === 'vintage') {
      svgContent = `
        <rect x="20" y="20" width="960" height="960" fill="none" stroke="#4b2c20" stroke-width="2" />
        <path d="M50 20 L20 20 L20 50 M950 20 L980 20 L980 50 M20 950 L20 980 L50 980 M950 980 L980 980 L980 950" fill="none" stroke="#4b2c20" stroke-width="8" stroke-linecap="round" />
        <circle cx="35" cy="35" r="5" fill="#4b2c20" />
        <circle cx="965" cy="35" r="5" fill="#4b2c20" />
        <circle cx="35" cy="965" r="5" fill="#4b2c20" />
        <circle cx="965" cy="965" r="5" fill="#4b2c20" />
      `;
    } else if (frameId === 'floral') {
      svgContent = `
        <defs>
          <g id="small-flower">
            <circle cx="0" cy="0" r="6" fill="#f87171" />
            <!-- 7 Petals -->
            <ellipse cx="0" cy="-10" rx="5" ry="8" fill="#fca5a5" transform="rotate(0)" />
            <ellipse cx="0" cy="-10" rx="5" ry="8" fill="#fca5a5" transform="rotate(51.4)" />
            <ellipse cx="0" cy="-10" rx="5" ry="8" fill="#fca5a5" transform="rotate(102.8)" />
            <ellipse cx="0" cy="-10" rx="5" ry="8" fill="#fca5a5" transform="rotate(154.2)" />
            <ellipse cx="0" cy="-10" rx="5" ry="8" fill="#fca5a5" transform="rotate(205.7)" />
            <ellipse cx="0" cy="-10" rx="5" ry="8" fill="#fca5a5" transform="rotate(257.1)" />
            <ellipse cx="0" cy="-10" rx="5" ry="8" fill="#fca5a5" transform="rotate(308.5)" />
            <circle cx="0" cy="0" r="3" fill="#fef08a" />
          </g>
          <g id="large-flower">
            <circle cx="0" cy="0" r="15" fill="#be123c" />
            <!-- 7 Petals -->
            <ellipse cx="0" cy="-22" rx="12" ry="18" fill="#fb7185" transform="rotate(0)" />
            <ellipse cx="0" cy="-22" rx="12" ry="18" fill="#fb7185" transform="rotate(51.4)" />
            <ellipse cx="0" cy="-22" rx="12" ry="18" fill="#fb7185" transform="rotate(102.8)" />
            <ellipse cx="0" cy="-22" rx="12" ry="18" fill="#fb7185" transform="rotate(154.2)" />
            <ellipse cx="0" cy="-22" rx="12" ry="18" fill="#fb7185" transform="rotate(205.7)" />
            <ellipse cx="0" cy="-22" rx="12" ry="18" fill="#fb7185" transform="rotate(257.1)" />
            <ellipse cx="0" cy="-22" rx="12" ry="18" fill="#fb7185" transform="rotate(308.5)" />
            <circle cx="0" cy="0" r="7" fill="#facc15" />
          </g>
        </defs>
        
        <rect x="50" y="50" width="900" height="900" fill="none" stroke="#d4af37" stroke-width="2" opacity="0.5" />
        
        <!-- Corner Flowers (Clusters of 2-3) -->
        <g transform="translate(50,50)">
          <g scale="0.7"><use href="#large-flower" /></g>
          <g transform="translate(30,10) scale(0.4)"><use href="#large-flower" /></g>
          <g transform="translate(10,30) scale(0.3)"><use href="#large-flower" /></g>
        </g>
        <g transform="translate(950,50)">
          <g scale="0.7"><use href="#large-flower" /></g>
          <g transform="translate(-30,10) scale(0.4)"><use href="#large-flower" /></g>
          <g transform="translate(-10,30) scale(0.3)"><use href="#large-flower" /></g>
        </g>
        <g transform="translate(50,950)">
          <g scale="0.7"><use href="#large-flower" /></g>
          <g transform="translate(30,-10) scale(0.4)"><use href="#large-flower" /></g>
          <g transform="translate(10,-30) scale(0.3)"><use href="#large-flower" /></g>
        </g>
        <g transform="translate(950,950)">
          <g scale="0.7"><use href="#large-flower" /></g>
          <g transform="translate(-30,-10) scale(0.4)"><use href="#large-flower" /></g>
          <g transform="translate(-10,-30) scale(0.3)"><use href="#large-flower" /></g>
        </g>
        
        <!-- Edge Flowers (Small) -->
        <g opacity="0.8">
          <!-- Top -->
          <use href="#small-flower" x="150" y="40" />
          <use href="#small-flower" x="250" y="55" />
          <use href="#small-flower" x="350" y="45" />
          <use href="#small-flower" x="450" y="60" />
          <use href="#small-flower" x="550" y="40" />
          <use href="#small-flower" x="650" y="55" />
          <use href="#small-flower" x="750" y="45" />
          <use href="#small-flower" x="850" y="60" />
          
          <!-- Bottom -->
          <use href="#small-flower" x="150" y="960" />
          <use href="#small-flower" x="250" y="945" />
          <use href="#small-flower" x="350" y="955" />
          <use href="#small-flower" x="450" y="940" />
          <use href="#small-flower" x="550" y="960" />
          <use href="#small-flower" x="650" y="945" />
          <use href="#small-flower" x="750" y="955" />
          <use href="#small-flower" x="850" y="940" />
          
          <!-- Left -->
          <use href="#small-flower" x="40" y="150" />
          <use href="#small-flower" x="55" y="250" />
          <use href="#small-flower" x="45" y="350" />
          <use href="#small-flower" x="60" y="450" />
          <use href="#small-flower" x="40" y="550" />
          <use href="#small-flower" x="55" y="650" />
          <use href="#small-flower" x="45" y="750" />
          <use href="#small-flower" x="60" y="850" />
          
          <!-- Right -->
          <use href="#small-flower" x="960" y="150" />
          <use href="#small-flower" x="945" y="250" />
          <use href="#small-flower" x="955" y="350" />
          <use href="#small-flower" x="940" y="450" />
          <use href="#small-flower" x="960" y="550" />
          <use href="#small-flower" x="945" y="650" />
          <use href="#small-flower" x="955" y="750" />
          <use href="#small-flower" x="940" y="850" />
        </g>
      `;
    } else if (frameId === 'botanical') {
      svgContent = `
        <defs>
          <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4a6741" />
            <stop offset="100%" stop-color="#2d4a22" />
          </linearGradient>
          <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#7a9a6b" />
            <stop offset="100%" stop-color="#4a6741" />
          </linearGradient>
          <filter id="leafShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="1" result="offsetblur" />
            <feComponentTransfer><feFuncA type="linear" slope="0.2" /></feComponentTransfer>
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <g id="small-leaf-pair">
            <path d="M0 0 Q 15 -10, 30 0 Q 15 10, 0 0" fill="#4a6741" />
            <path d="M0 0 Q 15 10, 30 0 Q 15 -10, 0 0" fill="#7a9a6b" transform="rotate(30, 0, 0)" />
          </g>
        </defs>
        
        <!-- Copper Frame Line -->
        <rect x="40" y="40" width="920" height="920" fill="none" stroke="#c5a07d" stroke-width="1" opacity="0.6" />
        
        <!-- Corner Foliage - Half size and pushed to extreme corners -->
        <g transform="translate(-60,-60) scale(0.5) rotate(-15)" filter="url(#leafShadow)">
          <path d="M0 100 Q 150 0, 350 100 Q 200 250, 0 100" fill="url(#leafGrad1)" />
          <path d="M50 50 Q 200 -50, 400 50 Q 250 200, 500 50" fill="url(#leafGrad2)" transform="rotate(20, 250, 50)" />
        </g>
        
        <g transform="translate(850,-60) scale(0.5) rotate(25)" filter="url(#leafShadow)">
          <path d="M0 150 Q 100 0, 300 150 Q 150 300, 0 150" fill="url(#leafGrad1)" />
          <path d="M100 0 Q 150 100, 100 200" fill="none" stroke="#2d4a22" stroke-width="2" opacity="0.3" />
        </g>
        
        <g transform="translate(-80,850) scale(0.5) rotate(-15)" filter="url(#leafShadow)">
          <path d="M0 200 Q 250 0, 500 200 Q 300 450, 0 200" fill="url(#leafGrad1)" />
        </g>
        
        <g transform="translate(850,880) scale(0.5) rotate(15)" filter="url(#leafShadow)">
          <path d="M0 150 Q 150 0, 350 150 Q 200 350, 0 150" fill="url(#leafGrad2)" />
        </g>

        <!-- Massive amount of small leaves along the edges (Doubled) -->
        <g opacity="0.7">
          <!-- Top Edge -->
          <use href="#small-leaf-pair" x="100" y="20" transform="rotate(10, 100, 20)" />
          <use href="#small-leaf-pair" x="200" y="15" transform="rotate(-5, 200, 15)" />
          <use href="#small-leaf-pair" x="300" y="25" transform="rotate(15, 300, 25)" />
          <use href="#small-leaf-pair" x="400" y="10" transform="rotate(-10, 400, 10)" />
          <use href="#small-leaf-pair" x="500" y="20" transform="rotate(5, 500, 20)" />
          <use href="#small-leaf-pair" x="600" y="15" transform="rotate(-5, 600, 15)" />
          <use href="#small-leaf-pair" x="700" y="25" transform="rotate(10, 700, 25)" />
          <use href="#small-leaf-pair" x="800" y="10" transform="rotate(-15, 800, 10)" />
          <use href="#small-leaf-pair" x="900" y="20" transform="rotate(5, 900, 20)" />
          
          <!-- Bottom Edge -->
          <use href="#small-leaf-pair" x="100" y="960" transform="rotate(170, 100, 960)" />
          <use href="#small-leaf-pair" x="200" y="975" transform="rotate(190, 200, 975)" />
          <use href="#small-leaf-pair" x="300" y="965" transform="rotate(185, 300, 965)" />
          <use href="#small-leaf-pair" x="400" y="980" transform="rotate(175, 400, 980)" />
          <use href="#small-leaf-pair" x="500" y="970" transform="rotate(180, 500, 970)" />
          <use href="#small-leaf-pair" x="600" y="960" transform="rotate(165, 600, 960)" />
          <use href="#small-leaf-pair" x="700" y="975" transform="rotate(195, 700, 975)" />
          <use href="#small-leaf-pair" x="800" y="965" transform="rotate(185, 800, 965)" />
          <use href="#small-leaf-pair" x="900" y="980" transform="rotate(170, 900, 980)" />

          <!-- Left Edge -->
          <use href="#small-leaf-pair" x="10" y="100" transform="rotate(80, 10, 100)" />
          <use href="#small-leaf-pair" x="25" y="200" transform="rotate(100, 25, 200)" />
          <use href="#small-leaf-pair" x="15" y="300" transform="rotate(90, 15, 300)" />
          <use href="#small-leaf-pair" x="30" y="400" transform="rotate(110, 30, 400)" />
          <use href="#small-leaf-pair" x="20" y="500" transform="rotate(85, 20, 500)" />
          <use href="#small-leaf-pair" x="10" y="600" transform="rotate(95, 10, 600)" />
          <use href="#small-leaf-pair" x="25" y="700" transform="rotate(105, 25, 700)" />
          <use href="#small-leaf-pair" x="15" y="800" transform="rotate(80, 15, 800)" />
          <use href="#small-leaf-pair" x="30" y="900" transform="rotate(115, 30, 900)" />

          <!-- Right Edge -->
          <use href="#small-leaf-pair" x="970" y="100" transform="rotate(-80, 970, 100)" />
          <use href="#small-leaf-pair" x="985" y="200" transform="rotate(-100, 985, 200)" />
          <use href="#small-leaf-pair" x="975" y="300" transform="rotate(-90, 975, 300)" />
          <use href="#small-leaf-pair" x="990" y="400" transform="rotate(-110, 990, 400)" />
          <use href="#small-leaf-pair" x="980" y="500" transform="rotate(-85, 980, 500)" />
          <use href="#small-leaf-pair" x="970" y="600" transform="rotate(-95, 970, 600)" />
          <use href="#small-leaf-pair" x="985" y="700" transform="rotate(-105, 985, 700)" />
          <use href="#small-leaf-pair" x="975" y="800" transform="rotate(-80, 975, 800)" />
          <use href="#small-leaf-pair" x="990" y="900" transform="rotate(-115, 990, 900)" />

          <!-- Random scattered clusters -->
          <g transform="translate(50,50) scale(0.6)"><use href="#small-leaf-pair" /></g>
          <g transform="translate(950,50) scale(0.6)"><use href="#small-leaf-pair" /></g>
          <g transform="translate(50,950) scale(0.6)"><use href="#small-leaf-pair" /></g>
          <g transform="translate(950,950) scale(0.6)"><use href="#small-leaf-pair" /></g>
          <g transform="translate(500,40) scale(0.7)"><use href="#small-leaf-pair" /></g>
          <g transform="translate(500,960) scale(0.7)"><use href="#small-leaf-pair" /></g>
          <g transform="translate(40,500) scale(0.7)"><use href="#small-leaf-pair" /></g>
          <g transform="translate(960,500) scale(0.7)"><use href="#small-leaf-pair" /></g>
        </g>
      `;
    } else if (frameId === 'waves') {
      svgContent = `
        <defs>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#1e3a8a" />
            <stop offset="50%" stop-color="#3b82f6" />
            <stop offset="100%" stop-color="#1e3a8a" />
          </linearGradient>
          <filter id="waveShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="0" dy="1" result="offsetblur" />
            <feComponentTransfer><feFuncA type="linear" slope="0.2" /></feComponentTransfer>
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <g id="bubble">
            <circle cx="0" cy="0" r="4" fill="white" opacity="0.5" />
            <circle cx="-1" cy="-1" r="1" fill="white" opacity="0.8" />
          </g>
        </defs>

        <!-- Continuous Wavy Border -->
        <g filter="url(#waveShadow)">
          <!-- Top Wave -->
          <path d="M0 15 Q 50 0, 100 15 T 200 15 T 300 15 T 400 15 T 500 15 T 600 15 T 700 15 T 800 15 T 900 15 T 1000 15 L 1000 0 L 0 0 Z" fill="url(#waveGrad)" opacity="0.8" />
          <path d="M0 25 Q 50 10, 100 25 T 200 25 T 300 25 T 400 25 T 500 25 T 600 25 T 700 25 T 800 25 T 900 25 T 1000 25" fill="none" stroke="#60a5fa" stroke-width="2" opacity="0.4" />
          
          <!-- Bottom Wave -->
          <g transform="translate(1000, 1000) rotate(180)">
            <path d="M0 15 Q 50 0, 100 15 T 200 15 T 300 15 T 400 15 T 500 15 T 600 15 T 700 15 T 800 15 T 900 15 T 1000 15 L 1000 0 L 0 0 Z" fill="url(#waveGrad)" opacity="0.8" />
            <path d="M0 25 Q 50 10, 100 25 T 200 25 T 300 25 T 400 25 T 500 25 T 600 25 T 700 25 T 800 25 T 900 25 T 1000 25" fill="none" stroke="#60a5fa" stroke-width="2" opacity="0.4" />
          </g>
          
          <!-- Left Wave -->
          <g transform="translate(0, 1000) rotate(-90)">
            <path d="M0 15 Q 50 0, 100 15 T 200 15 T 300 15 T 400 15 T 500 15 T 600 15 T 700 15 T 800 15 T 900 15 T 1000 15 L 1000 0 L 0 0 Z" fill="url(#waveGrad)" opacity="0.8" />
            <path d="M0 25 Q 50 10, 100 25 T 200 25 T 300 25 T 400 25 T 500 25 T 600 25 T 700 25 T 800 25 T 900 25 T 1000 25" fill="none" stroke="#60a5fa" stroke-width="2" opacity="0.4" />
          </g>
          
          <!-- Right Wave -->
          <g transform="translate(1000, 0) rotate(90)">
            <path d="M0 15 Q 50 0, 100 15 T 200 15 T 300 15 T 400 15 T 500 15 T 600 15 T 700 15 T 800 15 T 900 15 T 1000 15 L 1000 0 L 0 0 Z" fill="url(#waveGrad)" opacity="0.8" />
            <path d="M0 25 Q 50 10, 100 25 T 200 25 T 300 25 T 400 25 T 500 25 T 600 25 T 700 25 T 800 25 T 900 25 T 1000 25" fill="none" stroke="#60a5fa" stroke-width="2" opacity="0.4" />
          </g>
        </g>

        <!-- Small Bubbles -->
        <g opacity="0.5">
          <use href="#bubble" x="50" y="10" />
          <use href="#bubble" x="250" y="8" />
          <use href="#bubble" x="450" y="12" />
          <use href="#bubble" x="650" y="7" />
          <use href="#bubble" x="850" y="11" />
          
          <use href="#bubble" x="10" y="150" />
          <use href="#bubble" x="12" y="350" />
          <use href="#bubble" x="8" y="550" />
          <use href="#bubble" x="11" y="750" />
          <use href="#bubble" x="9" y="950" />
          
          <use href="#bubble" x="990" y="250" />
          <use href="#bubble" x="988" y="450" />
          <use href="#bubble" x="992" y="650" />
          <use href="#bubble" x="989" y="850" />
          
          <use href="#bubble" x="150" y="990" />
          <use href="#bubble" x="350" y="992" />
          <use href="#bubble" x="550" y="988" />
          <use href="#bubble" x="750" y="991" />
          <use href="#bubble" x="950" y="989" />
        </g>
      `;
    } else if (frameId === 'abstract') {
      svgContent = `
        <rect x="10" y="10" width="980" height="980" fill="none" stroke="#3b82f6" stroke-width="2" />
        <path d="M0 0 L150 0 L0 150 Z" fill="#3b82f6" />
        <path d="M1000 0 L850 0 L1000 150 Z" fill="#3b82f6" />
        <path d="M0 1000 L150 1000 L0 850 Z" fill="#3b82f6" />
        <path d="M1000 1000 L850 1000 L1000 850 Z" fill="#3b82f6" />
      `;
    } else if (frameId === 'dotted') {
      svgContent = `
        <rect x="5" y="5" width="990" height="990" fill="none" stroke="#6366f1" stroke-width="2" stroke-dasharray="1 20" stroke-linecap="round" />
        <circle cx="50" cy="50" r="10" fill="#6366f1" />
        <circle cx="950" cy="50" r="10" fill="#6366f1" />
        <circle cx="50" cy="950" r="10" fill="#6366f1" />
        <circle cx="950" cy="950" r="10" fill="#6366f1" />
      `;
    }

    svg.innerHTML = svgContent;
    block.insertBefore(svg, block.firstChild);
    
    // Adjust padding to ensure content doesn't touch frame
    contentWrapper.style.padding = (frameId === 'botanical' || frameId === 'floral') ? '80px' : (frameId === 'waves' ? '60px' : '32px');

    saveHistoryState();
    setNotification({ message: `Rahmen angewendet`, type: 'success' });
  };

  const handleApplyColor = (colorClass: string) => {
    if (!activeBlock) return;
    saveHistoryState();
    
    // Find the main block container (the one with 'avoid-break')
    let block = activeBlock;
    if (!block.classList.contains('avoid-break')) {
      block = block.closest('.avoid-break') as HTMLElement || activeBlock;
    }

    const themedColors = [
      'slate', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 
      'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 
      'violet', 'purple', 'fuchsia', 'pink', 'rose', 'gray'
    ];

    // 1. Identify the new theme color
    const colorParts = colorClass.split('-');
    const colorName = colorParts.length >= 2 ? colorParts[1] : (colorClass === 'bg-white' ? 'white' : null);

    // 2. Update the block background itself
    const allPossibleBgColors: string[] = [];
    themedColors.forEach(tc => {
      allPossibleBgColors.push(`bg-${tc}-50`, `bg-${tc}-100`, `bg-${tc}-200`);
    });
    allPossibleBgColors.push('bg-white', 'bg-gray-50', 'bg-gray-100', 'bg-gray-200');

    block.classList.remove(...allPossibleBgColors);
    if (colorClass !== 'bg-white') {
      block.classList.add(colorClass);
    }

    if (colorName) {
      // 3. Update all nested elements
      const elementsToUpdate = [block, ...Array.from(block.querySelectorAll('*'))];
      
      elementsToUpdate.forEach(el => {
        const element = el as HTMLElement;
        if (!element.classList || element.classList.length === 0) return;

        const isMainBlock = element === block;
        const currentClasses = Array.from(element.classList);

        // Aggressively replace themed classes (text, border, bg)
        currentClasses.forEach(c => {
          const prefixes = ['text', 'border', 'bg'];
          for (const prefix of prefixes) {
            if (c.startsWith(`${prefix}-`)) {
              const isThemed = themedColors.some(tc => c.startsWith(`${prefix}-${tc}-`));
              if (isThemed) {
                const parts = c.split('-');
                const weight = parts[parts.length - 1];
                element.classList.remove(c);

                if (colorName === 'white' || colorName === 'gray') {
                  if (prefix === 'text') element.classList.add('text-gray-800');
                  if (prefix === 'border') element.classList.add('border-gray-300');
                  // For bg, we don't add a default if it was themed, let it be white/transparent
                } else {
                  let newWeight = weight;
                  if (prefix === 'border') newWeight = '500';
                  if (prefix === 'text') {
                    const nw = parseInt(weight);
                    newWeight = isNaN(nw) ? '700' : (nw < 600 ? '700' : weight);
                  }
                  if (prefix === 'bg' && !isMainBlock) newWeight = '50';
                  
                  // Don't re-add background to main block here (already handled)
                  if (!(prefix === 'bg' && isMainBlock)) {
                    element.classList.add(`${prefix}-${colorName}-${newWeight}`);
                  }
                }
              }
            }
          }
        });

        // 4. Handle structural borders and white boxes
        const isWhiteBox = (element.classList.contains('bg-white') || element.classList.contains('bg-gray-50')) && !isMainBlock;
        const hasAnyBorder = currentClasses.some(c => c === 'border' || (c.startsWith('border-') && !c.startsWith('border-opacity')));
        
        if (isWhiteBox || (hasAnyBorder && !isMainBlock)) {
          // Ensure it has a themed border color if we are in a themed block
          if (colorName !== 'white' && colorName !== 'gray') {
            // Check if it already has a themed border (might have been added above)
            const hasThemedBorder = Array.from(element.classList).some(c => themedColors.some(tc => c.startsWith(`border-${tc}-`)));
            if (!hasThemedBorder) {
              element.classList.add(`border-${colorName}-500`);
            }
          } else if (isWhiteBox) {
            // For white/gray theme, ensure white boxes have a neutral border
            element.classList.add('border-gray-300');
          }
        }
      });
    }
    
    saveHistoryState();
    setNotification({ message: `Farbe angewendet`, type: 'success' });
  };

  const handleApplyEmoji = (emoji: string) => {
    if (!activeBlock) return;
    
    const selection = window.getSelection();
    let range: Range | null = null;
    
    // 1. Try current selection in the window
    if (selection && selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0);
      // Only use it if it's actually inside our active block
      if (activeBlock.contains(currentRange.commonAncestorContainer)) {
        range = currentRange;
      }
    }
    
    // 2. Fallback to last tracked range
    if (!range && lastRange) {
      // Check if lastRange is still valid and inside the active block
      try {
        if (activeBlock.contains(lastRange.commonAncestorContainer)) {
          range = lastRange;
        }
      } catch (e) {
        range = null;
      }
    }

    if (range) {
      try {
        saveHistoryState();
        range.deleteContents();
        
        // Create a fragment to insert the emoji
        const textNode = document.createTextNode(emoji);
        range.insertNode(textNode);
        
        // Move caret after the inserted emoji
        const newRange = document.createRange();
        newRange.setStartAfter(textNode);
        newRange.setEndAfter(textNode);
        selection?.removeAllRanges();
        selection?.addRange(newRange);
        
        // Update lastRange for consecutive inserts
        setLastRange(newRange.cloneRange());
        
        saveHistoryState();
        setNotification({ message: `Emoji eingefügt`, type: 'success' });
        return;
      } catch (err) {
        console.warn("Could not insert emoji at range", err);
      }
    }

    // 3. Final Fallback: Insert at the beginning of the first editable element in the block
    const editable = activeBlock.classList.contains('editable') || activeBlock.getAttribute('contenteditable') === 'true'
      ? activeBlock 
      : activeBlock.querySelector('.editable, [contenteditable="true"]') as HTMLElement;

    if (editable) {
      saveHistoryState();
      const textNode = document.createTextNode(emoji + ' ');
      if (editable.firstChild) {
        editable.insertBefore(textNode, editable.firstChild);
      } else {
        editable.appendChild(textNode);
      }
      saveHistoryState();
      setNotification({ message: `Emoji am Anfang eingefügt`, type: 'success' });
    }
  };

  const handleGenerateCover = async () => {
    if (!coverTitle.trim()) return;
    setIsGeneratingCover(true);
    setCoverError('');

    // Take snapshot before cover generation
    onAddSnapshot('Vor Titelseite');

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key fehlt in der Umgebung.");
      }
      const ai = new GoogleGenAI({ apiKey });

      // Generate Image
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: `Ein professionelles Titelbild für ein Schuldossier. Motiv: ${coverImageDesc}. Stil: ${coverImageStyle}. Farbschema: ${theme || 'Blau'}. WICHTIG: Generiere absolut KEINEN Text, keine Buchstaben, keine Wörter und keine Banner im Bild. Das Bild darf nur grafische Elemente enthalten.` }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let imageUrl = '';
      const imageParts = imageResponse.candidates?.[0]?.content?.parts;
      if (imageParts) {
        for (const part of imageParts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      const imgSrc = imageUrl || 'https://picsum.photos/seed/cover/800/800';
      const safePrompt = coverImageDesc.replace(/"/g, '&quot;');
      const themeColor = theme || 'blue';

      // Build deterministic HTML with fixed standard layout
      const extraTextBlock = coverExtraText.trim()
        ? `<div class="cover-draggable" style="position: absolute; left: 5%; top: 78%; width: 90%; resize: both; overflow: hidden; min-width: 100px; min-height: 30px; cursor: move;">
            <p contenteditable="true" class="editable text-[12pt] text-gray-500 italic text-center" style="cursor: text;">${coverExtraText}</p>
          </div>`
        : '';

      const generatedHtml = `<div class="cover-page-wrapper" data-cover="true">
  <div class="cover-page-container avoid-break relative w-full h-[27cm] p-[2cm] box-border bg-white print:bg-white overflow-hidden">
    <div class="cover-inner-container relative w-full h-full">
      <!-- Name: top right -->
      <div class="cover-draggable" style="position: absolute; right: 0; top: 0; resize: both; overflow: hidden; min-width: 120px; min-height: 30px; cursor: move;">
        <p contenteditable="true" class="editable text-[14pt] text-right" style="cursor: text;">Name: _______________________</p>
      </div>
      <!-- Title: center upper area -->
      <div class="cover-draggable" style="position: absolute; left: 5%; right: 5%; top: 18%; resize: both; overflow: hidden; min-width: 100px; min-height: 40px; cursor: move;">
        <h1 contenteditable="true" class="editable text-[36pt] leading-tight font-black text-${themeColor}-800 text-center" style="cursor: text;">${coverTitle}</h1>
      </div>
      <!-- Subtitle: below title -->
      <div class="cover-draggable" style="position: absolute; left: 5%; right: 5%; top: 32%; resize: both; overflow: hidden; min-width: 100px; min-height: 30px; cursor: move;">
        <p contenteditable="true" class="editable text-[20pt] leading-snug font-medium text-gray-600 text-center" style="cursor: text;">${coverSubtitle || ''}</p>
      </div>
      <!-- Image: center lower half -->
      <div class="cover-draggable resizable-cover-image-wrapper" style="width: 300px; resize: both; overflow: hidden; position: absolute; left: 50%; top: 55%; transform: translate(-50%, -50%); cursor: move;">
        <img src="${imgSrc}" data-prompt="${safePrompt}" class="cover-image w-full h-full object-contain border-2 border-gray-300 rounded-xl p-2 shadow-sm" style="cursor: move;" />
      </div>
      ${extraTextBlock}
    </div>
  </div>
  <div class="page-break"></div>
</div>`;

      saveHistoryState();

      const root = document.getElementById('dossier-root');
      if (root) {
        // Remove all existing cover pages
        const existingWrappers = root.querySelectorAll('.cover-page-wrapper, [data-cover="true"], .title-page-placeholder');
        existingWrappers.forEach(wrapper => {
          const nextSibling = wrapper.nextElementSibling;
          if (nextSibling && nextSibling.classList.contains('page-break')) {
            nextSibling.remove();
          }
          wrapper.remove();
        });

        const existingCovers = root.querySelectorAll('.cover-page-container');
        existingCovers.forEach(existingCover => {
          const nextSibling = existingCover.nextElementSibling;
          if (nextSibling && nextSibling.classList.contains('page-break')) {
            nextSibling.remove();
          }
          existingCover.remove();
        });

        root.querySelectorAll('.cover-image').forEach(el => el.remove());

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = generatedHtml;

        const frag = document.createDocumentFragment();
        let firstElement: HTMLElement | null = null;
        while (tempDiv.firstChild) {
          if (!firstElement && tempDiv.firstChild.nodeType === 1) {
            firstElement = tempDiv.firstChild as HTMLElement;
          }
          frag.appendChild(tempDiv.firstChild);
        }

        root.insertBefore(frag, root.firstChild);

        if (firstElement) {
          setTimeout(() => firstElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
      }

      setTimeout(saveHistoryState, 50);
      setShowCoverModal(false);
      setCoverStep(1);
      setCoverTitle('');
      setCoverSubtitle('');
      setCoverImageDesc('');
      setCoverExtraText('');
    } catch (error: any) {
      let errorMessage = "Fehler bei der Generierung: " + error.message;
      if (error.message?.includes('429')) {
        errorMessage = "⚠️ Rate-Limit erreicht. Bitte kurz warten.";
      }
      setCoverError(errorMessage);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleRegenerateCoverImage = async (imgElement: HTMLImageElement, prompt: string) => {
    // Take snapshot before image regeneration
    onAddSnapshot('Vor Bild-Regenerierung');

    try {
      const originalSrc = imgElement.src;
      // Set temporary loading styles (not saved to history yet)
      imgElement.style.opacity = '0.4';
      imgElement.style.cursor = 'wait';
      imgElement.classList.add('animate-pulse');
      
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ text: prompt }],
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      let newImageUrl = '';
      const parts = imageResponse.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            newImageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (newImageUrl) {
        // Reset styles BEFORE saving to history so we don't save the "loading" state
        imgElement.style.opacity = '1';
        imgElement.style.cursor = 'pointer';
        imgElement.classList.remove('animate-pulse');
        
        imgElement.src = newImageUrl;
        saveHistoryState();
      } else {
        imgElement.src = originalSrc;
        imgElement.style.opacity = '1';
        imgElement.style.cursor = 'pointer';
        imgElement.classList.remove('animate-pulse');
      }
    } catch (error) {
      console.error("Error regenerating image:", error);
      imgElement.style.opacity = '1';
      imgElement.style.cursor = 'pointer';
      imgElement.classList.remove('animate-pulse');
    }
  };

  const handleRootClick = (e: any) => {
    let target = e.target as HTMLElement;
    if (!target) return;
    if (target.nodeType === 3) target = target.parentElement as HTMLElement;
    if (!target || !target.closest) return;

    // 2. Delete Marker Logic
    if (target.closest('.delete-marker')) {
      const marker = target.closest('.image-marker');
      const container = marker?.parentElement;
      marker?.remove();
      
      // Renumber remaining markers in this container
      if (container) {
        const remaining = container.querySelectorAll('.image-marker');
        remaining.forEach((m, idx) => {
          const span = m.querySelector('span');
          if (span) span.innerText = (idx + 1).toString();
        });
      }
      
      saveHistoryState();
      return;
    }

    // Handle image alignment buttons
    if (target.closest('.align-img-left')) {
      const wrapper = target.closest('.draggable-image-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.style.float = 'left';
        wrapper.style.margin = '0 1rem 1rem 0';
        wrapper.style.display = 'block';
        saveHistoryState();
      }
      return;
    } else if (target.closest('.align-img-right')) {
      const wrapper = target.closest('.draggable-image-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.style.float = 'right';
        wrapper.style.margin = '0 0 1rem 1rem';
        wrapper.style.display = 'block';
        saveHistoryState();
      }
      return;
    } else if (target.closest('.align-img-center')) {
      const wrapper = target.closest('.draggable-image-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.style.float = 'none';
        wrapper.style.margin = '0 auto 1rem auto';
        wrapper.style.display = 'block';
        saveHistoryState();
      }
      return;
    } else if (target.closest('.delete-img')) {
      const wrapper = target.closest('.draggable-image-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.remove();
        saveHistoryState();
      }
      return;
    }

    // Handle block selection
    const root = document.getElementById('dossier-root');
    let block = findBlockForElement(target);

    if (block && block !== root) {
      const isEditable = target.classList.contains('editable') || target.closest('.editable') || target.contentEditable === 'true';
      const isCover = block.classList.contains('cover-page-wrapper') || block.classList.contains('cover-page-container') || block.hasAttribute('data-cover');
      
      if (activeBlock !== block) {
        setActiveBlock(block);
      }

      // Immer den aktiven Block hervorheben, außer es ist eine ganze Seite und wir klicken auf Text
      document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
      
      if (!isCover || !isEditable) {
        block.classList.add('active-block-highlight');
      }

      if (!isEditable) {
        root?.focus({ preventScroll: true });
      }
    } else if (target.getAttribute('id') === 'dossier-root' && root) {
      // Find closest child based on Y coordinate if clicking on the background
      const children = Array.from(root.children) as HTMLElement[];
      const y = e.clientY;
      let closest = null;
      let minDistance = Infinity;
      
      children.forEach(child => {
        const rect = child.getBoundingClientRect();
        const distance = Math.abs(y - (rect.top + rect.height / 2));
        if (distance < minDistance) {
          minDistance = distance;
          closest = child;
        }
      });
      
      if (closest) {
        block = closest;
        setActiveBlock(block);
        document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
        (block as HTMLElement).classList.add('active-block-highlight');
        root.focus({ preventScroll: true });
      } else {
        document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
        setActiveBlock(null);
      }
    }

    if (target.tagName === 'TD' && target.classList.contains('cursor-pointer')) {
        saveHistoryState();
        const hasX = target.innerText.trim() === 'X';
        target.innerHTML = hasX ? '' : '<span class="is-answer">X</span>';
        saveHistoryState();
    }
  };

  const handleRootDoubleClick = (e: React.MouseEvent) => {
    let target = e.target as HTMLElement;
    if (!target) return;
    if (target.nodeType === 3) target = target.parentElement as HTMLElement;
    if (!target || !target.closest) return;

    // Handle cover image change on double-click (regenerate or upload own image)
    if (target.tagName === 'IMG' && target.classList.contains('cover-image')) {
      const prompt = target.getAttribute('data-prompt') || '';
      setRegenTarget({ img: target as HTMLImageElement, prompt });
      setShowRegenConfirm(true);
      return;
    }

    // Handle double-click on cover text elements: lock element in place for text editing
    // and select all text so the user can immediately apply formatting (e.g. font size).
    const coverDraggable = target.closest('.cover-draggable') as HTMLElement | null;
    if (coverDraggable && !coverDraggable.classList.contains('resizable-cover-image-wrapper')) {
      coverDraggable.setAttribute('data-editing', 'true');
      coverDraggable.style.cursor = 'text';
      // Select all text in the editable child after the browser's own word-selection has fired
      const editable = coverDraggable.querySelector('[contenteditable="true"]') as HTMLElement | null;
      if (editable) {
        editable.focus();
        setTimeout(() => {
          const range = document.createRange();
          range.selectNodeContents(editable);
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }, 0);
      }
      return;
    }

    const root = document.getElementById('dossier-root');
    if (!root) return;

    // Use findBlockForElement to get the correct exercise block (not the page container)
    const block = findBlockForElement(target);

    if (block && block !== root) {
      const isEditable = target.classList.contains('editable') || target.closest('.editable') || target.contentEditable === 'true';
      const isCover = block.classList.contains('cover-page-wrapper') || block.classList.contains('cover-page-container') || block.hasAttribute('data-cover');

      if (!isEditable) {
        e.preventDefault();
        // Clear text selection to make it clear the block is selected
        window.getSelection()?.removeAllRanges();

        document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
        if (!isCover) {
          block.classList.add('active-block-highlight');
        }
        setActiveBlock(block);

        // Focus root to receive key events
        root.focus({ preventScroll: true });
      } else {
        // Bei Doppelklick auf Text: Normales Verhalten (Text auswählen),
        // aber Block-Highlight beibehalten damit der aktive Block sichtbar bleibt
        const currentBlock = findBlockForElement(target);
        if (currentBlock) {
          document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
          if (!isCover) {
            currentBlock.classList.add('active-block-highlight');
          }
          setActiveBlock(currentBlock);
        }
      }
    }
  };

  const handleRootPaste = (e: React.ClipboardEvent) => {
    if (!e.clipboardData) return;
    const htmlData = e.clipboardData.getData('text/html');
    
    // If pasting a whole block (like an exercise box), preserve its HTML structure
    if (htmlData && (htmlData.includes('avoid-break') || htmlData.includes('bg-white'))) {
      e.preventDefault();
      saveHistoryState();
      
      const tempDiv = document.createElement('div');
      let cleanHtml = htmlData;
      const startMatch = htmlData.match(/<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/);
      if (startMatch && startMatch[1]) {
        cleanHtml = startMatch[1];
      }
      tempDiv.innerHTML = cleanHtml;
      
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        
        const frag = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          frag.appendChild(tempDiv.firstChild);
        }
        
        range.insertNode(frag);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      
      setTimeout(() => {
        saveHistoryState();
      }, 50);
      return;
    }

    // Let the browser handle normal text/table paste first, then clean up tables
    setTimeout(() => {
      const root = document.getElementById('dossier-root');
      if (!root) return;
      
      let modified = false;
      root.querySelectorAll('table').forEach(table => {
        const htmlTable = table as HTMLElement;
        
        // Only apply standard classes if it doesn't already have them, to preserve custom formats
        if (!htmlTable.classList.contains('w-full')) {
          htmlTable.classList.add('w-full', 'border-collapse', 'mb-4');
        }
        modified = true;
        
        // If a table was pasted inside a paragraph, move it out to prevent layout issues
        const parentP = htmlTable.closest('p');
        if (parentP && parentP.parentNode) {
          parentP.parentNode.insertBefore(htmlTable, parentP.nextSibling);
          if (parentP.innerHTML.trim() === '') {
            parentP.remove();
          }
        }

        // If the table is a direct child of the root, wrap it in a standard block
        const parent = htmlTable.parentElement;
        if (parent === root) {
          const wrapper = document.createElement('div');
          wrapper.className = 'mb-4 relative group avoid-break table-wrapper-block';
          root.insertBefore(wrapper, htmlTable);
          wrapper.appendChild(htmlTable);
        }
      });
      
      if (modified) {
        saveHistoryState();
      }
    }, 10);
  };

  // Handle zoom changes without re-rendering the root
  useEffect(() => {
    const wrapper = document.getElementById('dossier-wrapper');
    if (wrapper) {
      // Use transform scale for visual zoom without reflowing the layout
      wrapper.style.transform = `scale(${zoom})`;
      wrapper.style.transformOrigin = 'top center';
      
      // Adjust margin to account for the scaled height so the scrollbar works correctly
      // A4 is roughly 29.7cm high. We add the difference as margin.
      const heightAdjustment = (zoom - 1) * 100; // rough percentage
      wrapper.style.marginBottom = zoom > 1 ? `${heightAdjustment}%` : '0';
    }
  }, [zoom]);

  const dossierContent = useMemo(() => {
    return (
      <div 
        id="dossier-root" 
        tabIndex={0}
        onInput={handleRootInput} 
        onClick={handleRootClick} 
        onMouseDown={handleMarkerMouseDown}
        onMouseMove={handleRootMouseMove}
        onDoubleClick={handleRootDoubleClick}
        onKeyDown={handleRootKeyDown}
        onPaste={handleRootPaste}
        onDrop={handleRootDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragStart={handleDragStart}
        className={`overflow-hidden text-[12pt] leading-relaxed transition-all pb-32 outline-none ${markerMode ? 'marker-mode-active' : ''}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }, []); // Reverted to empty deps to prevent content loss on marker toggle

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
          setActiveBlock(null);
        }
      }}
      className="flex-1 h-full relative overflow-hidden flex flex-col bg-gray-100 font-sans text-gray-900 transition-all"
    >
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-4 right-4 z-[9999] px-6 py-3 rounded-xl shadow-2xl animate-bounce flex items-center gap-3 ${
          notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          <span>{notification.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="font-bold">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">✕</button>
        </div>
      )}

      {/* AI MODAL - Moved to top of container for better positioning */}
      {showAiModal && (
        <div className="absolute inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-10 w-full max-w-3xl my-8 border border-indigo-100 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black text-indigo-900 flex items-center gap-3">
                <span className="bg-indigo-100 p-2 rounded-xl">✨</span>
                KI-Aufgabengenerator
              </h2>
              <button onClick={() => setShowAiModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all text-2xl font-bold">&times;</button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-indigo-700 mb-2 ml-1 uppercase tracking-wider">Was soll erstellt werden?</label>
                <p className="text-gray-500 text-sm mb-3 ml-1">Beschreibe kurz das Thema (z.B. "Lückentext über Verben im Präteritum" oder "Matheaufgaben zu Brüchen").</p>
                <textarea 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full border-2 border-indigo-50 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none min-h-[160px] resize-y text-lg transition-all shadow-inner bg-gray-50/50"
                  placeholder="Thema oder Art der Aufgabe eingeben..."
                  autoFocus
                />
              </div>

              {aiError && (
                <div className="p-4 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-bold rounded-2xl flex items-center gap-3">
                  <span className="text-xl">⚠️</span>
                  {aiError}
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <button 
                  onClick={() => setShowAiModal(false)}
                  className="px-6 py-3 text-gray-500 hover:text-gray-700 font-bold transition-colors"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={handleGenerateAiExercise}
                  disabled={isGeneratingAi || !aiPrompt.trim()}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2 transform active:scale-95"
                >
                  {isGeneratingAi ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      KI arbeitet...
                    </>
                  ) : (
                    <>🚀 Aufgabe erstellen</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KI-MODAL FÜR TITELBILD */}
      {showCoverModal && (
        <div className="absolute inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-10 w-full max-w-3xl my-8 border border-indigo-100 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black text-indigo-900 flex items-center gap-3">
                <span className="bg-indigo-100 p-2 rounded-xl">🎨</span>
                Titelbild-Designer
              </h2>
              <button onClick={() => { setShowCoverModal(false); setCoverStep(1); }} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all text-2xl font-bold">&times;</button>
            </div>
            
            <div className="mb-8 flex items-center justify-center gap-4">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all ${coverStep === s ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-100' : coverStep > s ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {coverStep > s ? '✓' : s}
                  </div>
                  <div className={`text-xs font-bold uppercase tracking-wider ${coverStep === s ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {s === 1 ? 'Titel' : 'Abbildung'}
                  </div>
                  {s < 2 && <div className="w-8 h-px bg-gray-100"></div>}
                </div>
              ))}
            </div>

            <div className="space-y-6">
              {coverStep === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div>
                    <label className="block text-sm font-bold text-indigo-700 mb-2 ml-1 uppercase tracking-wider">Haupttitel</label>
                    <input 
                      type="text"
                      value={coverTitle}
                      onChange={(e) => setCoverTitle(e.target.value)}
                      className="w-full border-2 border-indigo-50 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-lg transition-all shadow-inner bg-gray-50/50"
                      placeholder="z.B. Ökosystem Wald"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-indigo-700 mb-2 ml-1 uppercase tracking-wider">Untertitel</label>
                    <input
                      type="text"
                      value={coverSubtitle}
                      onChange={(e) => setCoverSubtitle(e.target.value)}
                      className="w-full border-2 border-indigo-50 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-lg transition-all shadow-inner bg-gray-50/50"
                      placeholder="z.B. Eine Entdeckungsreise durch die Natur"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-indigo-700 mb-2 ml-1 uppercase tracking-wider">Optionaler Zusatztext</label>
                    <input
                      type="text"
                      value={coverExtraText}
                      onChange={(e) => setCoverExtraText(e.target.value)}
                      className="w-full border-2 border-indigo-50 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-lg transition-all shadow-inner bg-gray-50/50"
                      placeholder="z.B. Klasse 5b – Frühling 2026 (erscheint unter dem Bild)"
                    />
                  </div>
                </div>
              )}

              {coverStep === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div>
                    <label className="block text-sm font-bold text-indigo-700 mb-2 ml-1 uppercase tracking-wider">Was soll abgebildet sein?</label>
                    <textarea 
                      value={coverImageDesc}
                      onChange={(e) => setCoverImageDesc(e.target.value)}
                      className="w-full border-2 border-indigo-50 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none min-h-[120px] resize-y text-lg transition-all shadow-inner bg-gray-50/50"
                      placeholder="Beschreibe das Motiv (z.B. Ein dichter Mischwald mit Sonnenstrahlen)..."
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-indigo-700 mb-2 ml-1 uppercase tracking-wider">Stil der Abbildung</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['aquarell', 'gezeichnet', 'realistisch', 'clipart', 'retro', 'comic'].map(style => (
                        <button
                          key={style}
                          onClick={() => setCoverImageStyle(style)}
                          className={`p-3 rounded-xl border-2 font-bold capitalize transition-all ${coverImageStyle === style ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' : 'border-gray-100 hover:border-indigo-100 text-gray-500'}`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {coverError && (
                <div className="p-4 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-bold rounded-2xl flex items-center gap-3">
                  <span className="text-xl">⚠️</span>
                  {coverError}
                </div>
              )}

              <div className="flex justify-between items-center pt-4">
                <div>
                  {coverStep > 1 && (
                    <button 
                      onClick={() => setCoverStep(prev => prev - 1)}
                      className="px-6 py-3 text-indigo-600 hover:text-indigo-800 font-bold transition-colors flex items-center gap-2"
                    >
                      ← Zurück
                    </button>
                  )}
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => { setShowCoverModal(false); setCoverStep(1); }}
                    className="px-6 py-3 text-gray-500 hover:text-gray-700 font-bold transition-colors"
                  >
                    Abbrechen
                  </button>
                  {coverStep < 2 ? (
                    <button
                      onClick={() => setCoverStep(prev => prev + 1)}
                      disabled={coverStep === 1 && !coverTitle.trim()}
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      Weiter →
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerateCover}
                      disabled={isGeneratingCover || !coverImageDesc.trim()}
                      className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2 transform active:scale-95"
                    >
                      {isGeneratingCover ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          KI gestaltet...
                        </>
                      ) : (
                        <>🎨 Titelseite generieren</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BESTÄTIGUNGS-MODAL FÜR BILD-REGENERIERUNG */}
      {showRegenConfirm && (
        <div className="absolute inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 w-full max-w-md border border-indigo-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-indigo-900 mb-4 flex items-center gap-3">
              <span className="text-3xl">🖼️</span>
              Titelbild ändern?
            </h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Möchtest du das Titelbild neu generieren lassen oder ein eigenes Bild von deinem Computer einfügen?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  if (regenTarget && regenTarget.prompt) {
                    handleRegenerateCoverImage(regenTarget.img, regenTarget.prompt);
                  }
                  setShowRegenConfirm(false);
                  setRegenTarget(null);
                }}
                disabled={!regenTarget?.prompt}
                className={`w-full py-3 font-black rounded-2xl shadow-lg transition-all transform active:scale-95 ${regenTarget?.prompt ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100' : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}`}
              >
                🔄 Neu generieren
              </button>
              <button
                onClick={() => {
                  coverUploadInputRef.current?.click();
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-100 transition-all transform active:scale-95"
              >
                📁 Eigenes Bild einfügen
              </button>
              <button
                onClick={() => { setShowRegenConfirm(false); setRegenTarget(null); }}
                className="w-full py-3 text-gray-500 hover:text-gray-700 font-bold transition-colors"
              >
                Abbrechen
              </button>
            </div>
            <input
              ref={coverUploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || !regenTarget) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const dataUrl = ev.target?.result as string;
                  if (dataUrl && regenTarget.img) {
                    onAddSnapshot('Vor eigenes Bild einfügen');
                    regenTarget.img.src = dataUrl;
                    regenTarget.img.removeAttribute('data-prompt');
                    regenTarget.img.setAttribute('data-custom-upload', 'true');
                    saveHistoryState();
                  }
                  setShowRegenConfirm(false);
                  setRegenTarget(null);
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      )}

      {/* HAUPT-NAVIGATION OBEN (Angepasst für das Dashboard) */}
      <div className="no-print bg-white shadow-md z-40 p-3 flex justify-between items-center border-b-2 border-gray-200 gap-4 transition-all w-full">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
          </div>
          <div>
            <h1 className="font-black text-xl text-gray-800">Live-Editor</h1>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 items-end">
          {/* Reihe 1: TOC, Laden, Speichern */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={historyDropdownRef}>
              <button 
                onClick={() => setShowHistory(!showHistory)} 
                className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${showHistory ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 hover:bg-gray-100 text-gray-700'}`}
                title="Versionsverlauf anzeigen"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden md:inline">Verlauf</span>
              </button>

              {showHistory && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Versionsverlauf</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {snapshots.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-xs italic">
                        Noch keine Snapshots vorhanden.
                      </div>
                    ) : (
                      snapshots.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleRestore(s)}
                          className="w-full text-left p-3 hover:bg-indigo-50 border-b border-gray-50 transition-colors group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm text-gray-800 group-hover:text-indigo-700 truncate pr-2">
                              {s.name}
                            </span>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                              {formatTimestamp(s.timestamp)}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 truncate">
                            {s.html.substring(0, 50).replace(/<[^>]*>/g, '')}...
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="p-2 bg-gray-50 border-t border-gray-100 text-[10px] text-center text-gray-400">
                    Die letzten 15 Snapshots werden lokal gespeichert.
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleAutoNumbering} className="flex items-center gap-1 bg-gray-100 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors text-sm" title="Synchronisiert alle Aufgabennummern (A.1, A.2 etc.)">
              <Hash size={16} />
              <span className="hidden md:inline">Aufg.-Sync</span>
            </button>

            <button onClick={handleUpdateToC} className="flex items-center gap-1 bg-gray-100 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors text-sm" title="Aktualisiert das Inhaltsverzeichnis">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
              <span className="hidden md:inline">Auto-Sync</span>
            </button>

            <input type="file" accept=".json" onChange={handleLoadProject} ref={fileInputRef} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 bg-gray-100 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors text-sm" title="Projekt laden">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              <span className="hidden md:inline">Laden</span>
            </button>
            
            <button onClick={handleSaveProject} className="flex items-center gap-1 bg-gray-100 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors text-sm" title="Projekt als Datei speichern">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
              <span className="hidden md:inline">Speichern</span>
            </button>
          </div>

          {/* Reihe 2: Titelbild, PDF, Drucken */}
          <div className="flex items-center gap-3 relative">
            <div className="relative" ref={designDropdownRef}>
              <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (activeBlock) {
                    setDesignDropdownOpen(!designDropdownOpen);
                    setDesignSubMenu('main');
                  } else {
                    alert('Bitte wähle zuerst einen Block aus (klicke in eine Aufgabe).');
                  }
                }} 
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm" 
                title="Block designen / dekorieren"
              >
                <Sparkles size={16} />
                <span className="hidden md:inline">Design</span>
              </button>

              {/* DESIGN DROPDOWN */}
              {designDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-blue-100 z-[10000] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {designSubMenu === 'main' && (
                    <div className="p-2 flex flex-col gap-1">
                      <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setDesignSubMenu('frame')}
                        className="flex items-center justify-between w-full p-3 hover:bg-blue-50 rounded-lg text-left transition-colors group"
                      >
                        <span className="flex items-center gap-3 font-bold text-blue-900">
                          <span className="text-xl">🖼️</span> Rahmen
                        </span>
                        <ChevronRight size={16} className="text-blue-300 group-hover:translate-x-1 transition-transform" />
                      </button>
                      <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setDesignSubMenu('color')}
                        className="flex items-center justify-between w-full p-3 hover:bg-blue-50 rounded-lg text-left transition-colors group"
                      >
                        <span className="flex items-center gap-3 font-bold text-blue-900">
                          <span className="text-xl">🎨</span> Blockfarbe
                        </span>
                        <ChevronRight size={16} className="text-blue-300 group-hover:translate-x-1 transition-transform" />
                      </button>
                      <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setDesignSubMenu('emoji')}
                        className="flex items-center justify-between w-full p-3 hover:bg-blue-50 rounded-lg text-left transition-colors group"
                      >
                        <span className="flex items-center gap-3 font-bold text-blue-900">
                          <span className="text-xl">😀</span> Emojis
                        </span>
                        <ChevronRight size={16} className="text-blue-300 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}

                  {designSubMenu === 'frame' && (
                    <div className="p-2">
                      <button onMouseDown={(e) => e.preventDefault()} onClick={() => setDesignSubMenu('main')} className="flex items-center gap-2 p-2 text-xs font-bold text-blue-400 hover:text-blue-600 mb-2">
                        <ChevronLeft size={14} /> Zurück
                      </button>
                      <div className="grid grid-cols-1 gap-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {FRAME_DESIGNS.map((design) => (
                          <button
                            key={design.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              handleApplyFrame(design.id);
                              setDesignDropdownOpen(false);
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg text-left transition-colors"
                          >
                            <span className="text-2xl">{design.icon}</span>
                            <div>
                              <div className="font-bold text-gray-800 text-sm">{design.name}</div>
                              <div className="text-[10px] text-gray-500">{design.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {designSubMenu === 'color' && (
                    <div className="p-2">
                      <button onMouseDown={(e) => e.preventDefault()} onClick={() => setDesignSubMenu('main')} className="flex items-center gap-2 p-2 text-xs font-bold text-blue-400 hover:text-blue-600 mb-2">
                        <ChevronLeft size={14} /> Zurück
                      </button>
                      <div className="grid grid-cols-2 gap-2 p-1">
                        {COLOR_OPTIONS.map((color) => (
                          <button
                            key={color.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              handleApplyColor(color.id);
                              setDesignDropdownOpen(false);
                            }}
                            className="flex flex-col items-center gap-1 p-2 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          >
                            <div 
                              className={`w-10 h-10 rounded-lg shadow-inner border border-gray-200 ${color.id}`}
                              style={{ backgroundColor: color.hex }}
                            ></div>
                            <span className="text-[10px] font-bold text-gray-600">{color.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {designSubMenu === 'emoji' && (
                    <div className="p-2">
                      <button onMouseDown={(e) => e.preventDefault()} onClick={() => setDesignSubMenu('main')} className="flex items-center gap-2 p-2 text-xs font-bold text-blue-400 hover:text-blue-600 mb-2">
                        <ChevronLeft size={14} /> Zurück
                      </button>
                      <div className="grid grid-cols-6 gap-1 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onMouseDown={(e) => e.preventDefault()} // WICHTIG: Verhindert Fokusverlust
                            onClick={() => handleApplyEmoji(emoji)}
                            className="text-xl p-1.5 hover:bg-blue-50 rounded-lg transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 p-2 text-[9px] text-gray-400 text-center italic border-t border-gray-50">
                        Klicke im Text, um Emoji dort einzufügen.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => setShowCoverModal(true)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm" title="Generiert eine professionelle Titelseite">
              <span className="text-lg">🎨</span>
              <span className="hidden md:inline">Cover-Design</span>
            </button>

            <button onClick={handleDownloadPDF} disabled={isDownloadingPdf} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm text-sm disabled:opacity-50">
              {isDownloadingPdf ? (
                <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Lädt...</>
              ) : (
                <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> PDF Download</>
              )}
            </button>

          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-8 pb-40 bg-slate-300">
        <style dangerouslySetInnerHTML={{__html: `
        .editable { transition: all 0.2s ease; border-radius: 4px; padding: 2px 4px; margin: -2px -4px; outline: none; }
        .editable:hover { background-color: #e2e8f0; cursor: text; }
        .editable:focus { background-color: #f1f5f9; outline: 2px dashed #cbd5e1; }

        .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        /* Einheitlicher Abstand zwischen aufeinanderfolgenden Inhaltsblöcken */
        #dossier-root .avoid-break + .avoid-break { margin-top: 2rem !important; }

        .page-break { height: 2rem; background: transparent !important; border: none; margin: 0; padding: 0; display: block; pointer-events: none; outline: none !important; }
        .page-break::after { display: none; }
        #dossier-root > *:not(.page-break) {
          background-color: white !important;
          outline: none !important;
          width: 21cm !important;
          height: 29.7cm !important;
          min-height: unset !important;
          margin: 0 auto !important;
          display: block !important;
          box-sizing: border-box !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.18);
          overflow: clip !important;
        }
        
        .cover-page-container {
          min-height: 27cm;
          display: flex;
          flex-direction: column;
          background: white;
          position: relative;
          z-index: 1;
          padding: 2cm;
          box-sizing: border-box;
        }

        .resizable-cover-image-wrapper {
          display: inline-block;
          resize: both;
          overflow: hidden;
          border: 2px dashed transparent;
          padding: 5px;
          transition: border-color 0.2s;
        }
        .resizable-cover-image-wrapper:hover {
          border-color: #cbd5e1;
        }

        span[contentEditable="true"]:empty::before { content: '\\200b'; }

        .is-answer { 
          color: #2563eb; 
          font-weight: 500;
          transition: color 0.2s;
          cursor: text;
          display: inline-block;
          min-width: 1ch;
        }

        .gap-line .is-answer {
          display: inline;
          min-width: 0;
        }

        .hide-solutions .is-answer {
          color: transparent !important;
          background: transparent !important;
        }

        .gap-line {
          border-bottom: 1.5px solid #000;
          min-width: 40px;
          display: inline-block;
          text-align: center;
          padding: 0 4px;
        }

        .hide-solutions .gap-line {
          border-bottom-color: #000 !important;
        }

        .is-strikethrough-answer {
          text-decoration: line-through;
          color: #2563eb;
          text-decoration-thickness: 2px;
          transition: all 0.2s;
          cursor: text;
        }

        .hide-solutions .is-strikethrough-answer {
          text-decoration: none !important;
          color: inherit !important;
        }

        .is-highlight-answer {
          background-color: #fef08a;
          color: inherit;
          padding: 0 2px;
          border-radius: 2px;
          transition: all 0.2s;
          cursor: text;
        }

        .hide-solutions .is-highlight-answer {
          background-color: transparent !important;
        }

        table td, table th {
          height: 45px !important;
          min-width: 50px;
        }

        .active-block-highlight {
           outline: 2px dashed #3b82f6 !important;
           outline-offset: 2px;
           border-radius: 4px;
           background-color: transparent !important;
        }

        /* FRAME DESIGNS - New SVG Overlay System */
        .avoid-break {
          position: relative;
          z-index: 0;
        }

        .frame-overlay {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          width: 100%;
          height: 100%;
        }

        .content-wrapper {
          position: relative;
          z-index: 1;
          transition: padding 0.3s ease;
        }

        /* Sicherstellen, dass leere Blöcke im Editor klickbar bleiben */
        #dossier-root > *:empty {
          min-height: 1.5em;
          border: 1px dashed #e2e8f0;
          margin-bottom: 0.5rem;
        }
        
        .draggable-image-wrapper {
          display: inline-block;
          width: 300px;
          min-width: 50px;
          max-width: 100%;
          resize: both;
          overflow: hidden;
          border: 2px dashed transparent;
          padding: 2px;
          padding-right: 15px;
          padding-bottom: 15px;
          border-radius: 8px;
          transition: border-color 0.2s;
          vertical-align: middle;
          cursor: grab;
        }
        .draggable-image-wrapper:hover {
          border-color: #cbd5e1;
        }
        .draggable-image-wrapper:active {
          cursor: grabbing;
        }

        /* Marker Mode Styles */
        .marker-mode-active .draggable-image-wrapper,
        .marker-mode-active .marker-container,
        .marker-mode-active img {
          cursor: crosshair !important;
        }
        .marker-mode-active .draggable-image-wrapper {
          user-drag: none;
          -webkit-user-drag: none;
        }

        .marker-label {
          display: inline-block;
          min-width: 1.2em;
          outline: none;
          cursor: text;
        }

        .draggable-image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 6px;
          pointer-events: none;
        }

        @media print {
          /* 1. Reset Layout for Print */
          html, body, #root, .flex-1, .h-full, .overflow-y-auto, .overflow-hidden {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* 2. Hide UI Elements */
          .no-print, .no-print * { display: none !important; }
          .active-block-highlight { outline: none !important; border: none !important; }
          .draggable-image-wrapper { resize: none !important; border: none !important; padding: 0 !important; margin: 0 !important; }
          .cover-page-container { visibility: visible !important; display: flex !important; }
          
          /* 3. Page Breaks */
          .page-break { 
            border: none !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            height: 0 !important; 
            page-break-after: always !important; 
            break-after: page !important; 
            visibility: hidden !important;
          }
          .page-break::after, .page-break::before { 
            display: none !important; 
            content: none !important; 
          }
          
          /* 4. Fidelity (Colors, Backgrounds) */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* 5. Dossier Wrapper */
          #dossier-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            width: 100% !important;
            box-shadow: none !important;
          }
          #dossier-root {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #dossier-root > *:empty {
            display: none !important;
          }

          /* 6. Tables */
          table { 
            border-collapse: collapse !important; 
            width: 100% !important; 
            page-break-inside: auto !important;
          }
          tr { page-break-inside: avoid !important; page-break-after: auto !important; }
          th, td { 
            border: 1pt solid #000 !important; 
            padding: 8px !important;
          }
          
          /* 7. Gap Lines */
          .gap-line { border-bottom: 1.5pt solid #000 !important; }
          
          /* 8. Page Settings */
          @page {
            margin: 2cm;
          }
        }
      `}} />
      
      {/* HAUPTBEREICH DOKUMENT */}
      <div className="flex-1 overflow-y-auto py-10 pb-40 bg-slate-400">
        <div
          id="dossier-wrapper"
          style={{ fontFamily: globalFont }}
          className="transition-all"
        >
          {dossierContent}
        </div>
      </div>
    </div>

    {/* DIE SCHWEBENDE FORMATIERUNGS-LEISTE (Dock unten) */}
    <div className="no-print absolute bottom-2 left-1/2 transform -translate-x-1/2 z-50 bg-white border-2 border-indigo-300 p-3 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] flex flex-col items-center gap-3 w-[95%] max-w-[21cm] transition-all">
      
      {/* REIHE 1: History, Text-Formatierung, Medien, Tabellen */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
        {/* --- HISTORY --- */}
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-1 py-1 rounded-lg">
          <button onMouseDown={(e) => e.preventDefault()} onClick={handleUndo} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-gray-600" title="Rückgängig (Strg+Z)">
            <Undo2 size={18} />
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={handleRedo} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-gray-600" title="Wiederholen (Strg+Y)">
            <Redo2 size={18} />
          </button>
        </div>

        <div className="h-8 w-px bg-gray-300 mx-1"></div>

        {/* --- TEXT-FORMATIERUNG --- */}
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-1 py-1 rounded-lg">
          <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => { restoreSelection(); saveHistoryState(); document.execCommand('bold', false); saveHistoryState(); }} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded font-bold transition-colors" title="Fett">B</button>
          <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => { restoreSelection(); saveHistoryState(); document.execCommand('italic', false); saveHistoryState(); }} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded italic transition-colors" title="Kursiv">I</button>
          <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => { restoreSelection(); saveHistoryState(); document.execCommand('underline', false); saveHistoryState(); }} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded underline transition-colors" title="Unterstrichen">U</button>
          
          <select defaultValue="18px" onMouseDown={() => saveSelection()} onChange={(e) => applyExactFontSize(e.target.value)} className="h-8 bg-white border border-gray-300 rounded text-xs px-1 outline-none focus:border-blue-500" title="Schriftgröße">
            <option value="8px">8px</option>
            <option value="14px">14px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="32px">32px</option>
            <option value="40px">40px</option>
            <option value="48px">48px</option>
            <option value="56px">56px</option>
            <option value="64px">64px</option>
            <option value="72px">72px</option>
          </select>

          <div className="relative" ref={colorPickerRef}>
            <button 
              onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-gray-600" 
              title="Textfarbe"
            >
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold leading-none">A</span>
                <div className="w-4 h-1 mt-0.5 bg-black rounded-full"></div>
              </div>
            </button>
            
            {showColorPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-64 z-[60]">
                {theme && THEME_TEXT_COLORS[theme] && (
                  <>
                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider">Aktuelles Farbschema</div>
                    <div className="flex gap-1.5 mb-3">
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyTextColor(THEME_TEXT_COLORS[theme])}
                        className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                        style={{ backgroundColor: THEME_TEXT_COLORS[theme] }}
                        title={`Thema: ${theme}`}
                      />
                    </div>
                  </>
                )}

                <div className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider">Standardfarben</div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {STANDARD_TEXT_COLORS.map((color) => (
                    <button
                      key={color.hex}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyTextColor(color.hex)}
                      className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>

                <div className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider">Schwarz & Weiß</div>
                <div className="flex gap-1.5">
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyTextColor('#000000')}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform bg-black"
                    title="Schwarz"
                  />
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyTextColor('#ffffff')}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform bg-white"
                    title="Weiß"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-8 w-px bg-gray-300 mx-1"></div>

        {/* --- MEDIEN --- */}
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-1 py-1 rounded-lg">
          <input type="file" accept="image/*" onChange={handleImageUpload} ref={imageUploadRef} className="hidden" />
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => imageUploadRef.current?.click()} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-gray-600" title="Bild hochladen">
            <Image size={18} />
          </button>
          <button 
            onMouseDown={(e) => e.preventDefault()} 
            onClick={() => {
              setMarkerMode(!markerMode);
              if (!markerMode) {
                setNotification({ message: 'Marker-Modus aktiviert: Klicke auf ein Bild, um Nummern zu setzen.', type: 'success' });
              }
            }} 
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${markerMode ? 'bg-indigo-600 text-white shadow-inner' : 'hover:bg-gray-100 text-gray-600'}`} 
            title="Bild-Nummerierung (Marker) setzen"
          >
            <MapPin size={18} />
          </button>
        </div>

        <div className="h-8 w-px bg-gray-300 mx-1"></div>

        {/* --- KI-TEILAUFGABEN (Eigener Rahmen) --- */}
        <div className="flex items-center gap-0 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg transition-all">
          <input 
            type="number" 
            min="1" 
            max="10" 
            value={aiSubtaskCount} 
            onChange={(e) => setAiSubtaskCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            className="w-6 bg-transparent text-center font-bold text-sm focus:outline-none text-gray-700"
            title="Anzahl der zu generierenden Teilaufgaben"
          />
          <button onMouseDown={(e) => e.preventDefault()} onClick={handleAddSubTask} className="w-6 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-gray-600 font-bold" title="Teilaufgabe(n) hinzufügen">
            <Plus size={16} />
          </button>
        </div>

        <div className="h-8 w-px bg-gray-300 mx-1"></div>

        {/* --- TABELLEN-WERKZEUGE --- */}
        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-1 py-1 rounded-lg">
          <button onMouseDown={(e) => e.preventDefault()} onClick={handleAddRow} className="w-10 h-8 flex items-center justify-center hover:bg-emerald-100 rounded transition-colors text-emerald-700" title="Zeile hinzufügen">
            <Plus size={14} /><span className="text-[10px] font-bold ml-0.5">Z</span>
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={handleDeleteRow} className="w-10 h-8 flex items-center justify-center hover:bg-red-100 rounded transition-colors text-red-600" title="Zeile löschen">
            <Minus size={14} /><span className="text-[10px] font-bold ml-0.5">Z</span>
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={handleAddColumn} className="w-10 h-8 flex items-center justify-center hover:bg-emerald-100 rounded transition-colors text-emerald-700" title="Spalte hinzufügen">
            <Plus size={14} /><span className="text-[10px] font-bold ml-0.5">S</span>
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={handleDeleteColumn} className="w-10 h-8 flex items-center justify-center hover:bg-red-100 rounded transition-colors text-red-600" title="Spalte löschen">
            <Minus size={14} /><span className="text-[10px] font-bold ml-0.5">S</span>
          </button>
        </div>
      </div>

      {/* REIHE 2: Lösungs-Funktionen */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
        {/* --- FORMATIERUNG --- */}
        <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-1 py-1 rounded-lg">
          <span className="text-sm font-bold text-blue-800 mr-1 hidden lg:block">Format:</span>
          <select onMouseDown={() => saveSelection()} onChange={(e) => applyHeadingType(e.target.value)} className="h-8 bg-white border border-blue-300 rounded text-xs px-2 outline-none focus:border-blue-500 font-bold text-blue-800" value="">
            <option value="" disabled>Typ wählen...</option>
            <option value="h1">Haupttitel (36pt)</option>
            <option value="h2">Untertitel (20pt)</option>
            <option value="h3">Aufgabentitel (14pt)</option>
            <option value="p">Standardtext (12pt)</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-1 py-1 rounded-lg">
          <span className="text-sm font-bold text-blue-800 mr-1 hidden lg:block">Lösungen:</span>
          <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={markAsAnswer} className="px-2 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors" title="Markierten Text als Lösung kennzeichnen">Markieren</button>
          <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={markAsGapLine} className="px-2 h-8 flex items-center justify-center bg-white border border-blue-300 text-blue-600 hover:bg-blue-100 text-xs font-bold rounded transition-colors" title="Lücke einfügen">Lücke</button>
          <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={markAsStrikethrough} className="px-2 h-8 flex items-center justify-center bg-white border border-blue-300 text-blue-600 hover:bg-blue-100 text-xs font-bold rounded transition-colors" title="Wort durchstreichen (Lösung)">Durchstr.</button>
          <button onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={markAsHighlight} className="px-2 h-8 flex items-center justify-center bg-white border border-blue-300 text-blue-600 hover:bg-blue-100 text-xs font-bold rounded transition-colors" title="Wort anstreichen (Lösung)">Anstreichen</button>
          
          <button onMouseDown={(e) => e.preventDefault()} onClick={toggleSolutions} className={`w-8 h-8 flex items-center justify-center rounded transition-colors border ${showSolutions ? 'bg-white border-blue-300 text-blue-600 hover:bg-blue-100' : 'bg-blue-600 border-blue-600 text-white'}`} title="Lösungen verbergen/anzeigen">
            {showSolutions ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
      </div>

      {/* REIHE 3: Struktur & Block-Steuerung */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg">
          <select onChange={(e) => handleAddTemplate(e.target.value)} className="h-8 bg-white border border-indigo-300 rounded text-xs px-2 outline-none focus:border-indigo-500 font-bold text-indigo-800" value="">
            <option value="" disabled>➕ Struktur einfügen...</option>
            <option value="text">Textabschnitt</option>
            <option value="merkblatt">Merkblatt (Box)</option>
            <option value="merkblatt2">Merkblatt II (Regeln)</option>
            <option value="toc">Inhaltsverzeichnis</option>
            <optgroup label="Aufgaben-Vorlagen">
              {EXERCISE_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </optgroup>
          </select>

          <button onMouseDown={(e) => e.preventDefault()} onClick={() => setShowAiModal(true)} className="px-3 h-8 flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-bold rounded shadow-sm transition-all" title="KI generiert neue Aufgabe">
            <Sparkles size={14} />
            <span>KI-Aufgabe</span>
          </button>

          <div className="flex items-center gap-1 border-l border-indigo-200 pl-2 ml-1">
            <button onMouseDown={(e) => e.preventDefault()} onClick={handleCopyBlock} className="w-8 h-8 flex items-center justify-center hover:bg-indigo-100 rounded transition-colors text-indigo-600" title="Block kopieren">
              <Copy size={18} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={handlePasteBlock} className="w-8 h-8 flex items-center justify-center hover:bg-indigo-100 rounded transition-colors text-indigo-600" title="Block einfügen">
              <Clipboard size={18} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleMoveBlock('up')} className="w-8 h-8 flex items-center justify-center hover:bg-indigo-100 rounded transition-colors text-indigo-600" title="Block nach oben">
              <ArrowUp size={18} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleMoveBlock('down')} className="w-8 h-8 flex items-center justify-center hover:bg-indigo-100 rounded transition-colors text-indigo-600" title="Block nach unten">
              <ArrowDown size={18} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={handleAddPageBreak} className="w-8 h-8 flex items-center justify-center hover:bg-indigo-100 rounded transition-colors text-indigo-600" title="Seitenumbruch einfügen">
              <Scissors size={18} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={handleDeleteBlock} className="w-8 h-8 flex items-center justify-center hover:bg-red-100 text-red-600 rounded transition-colors" title="Block löschen">
              <Trash2 size={18} />
            </button>
          </div>

          {/* --- ZOOM --- */}
          <div className="flex items-center gap-1 border-l border-indigo-200 pl-2 ml-1">
            <button onMouseDown={(e) => e.preventDefault()} onClick={handleZoomOut} className="w-10 h-8 flex items-center justify-center hover:bg-indigo-100 rounded transition-colors" title="Herauszoomen">
              <ZoomOut size={18} className="text-indigo-600" />
            </button>
            <span className="text-[10px] font-bold text-indigo-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onMouseDown={(e) => e.preventDefault()} onClick={handleZoomIn} className="w-10 h-8 flex items-center justify-center hover:bg-indigo-100 rounded transition-colors" title="Hineinzoomen">
              <ZoomIn size={18} className="text-indigo-600" />
            </button>
          </div>
        </div>
      </div>
      
    </div>
  </div>
);
}
