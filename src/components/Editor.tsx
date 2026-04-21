import { useState, useRef, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GoogleGenAI } from '@google/genai';
import { Snapshot } from '../types';
import { EXERCISE_TEMPLATES } from '../constants';
import { renderAudiencePromptBlock, type AudienceLevel } from '../lib/audienceProfiles';
import { renderDidacticPromptBlock, type DidacticApproach, type DidacticScope } from '../lib/didacticProfiles';
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
  projectName?: string;
  targetAudience?: string;
  didacticApproach?: DidacticApproach;
  didacticScope?: DidacticScope;
  didacticChapters?: string;
  snapshots: Snapshot[];
  onRestoreSnapshot: (snapshot: Snapshot) => void;
  onAddSnapshot: (name: string) => void;
  onSendChatPrompt?: (prompt: string, options?: { autoSend?: boolean; hiddenContext?: string }) => void;
}


export function Editor({ html, onChange, theme, projectName, targetAudience, didacticApproach, didacticScope, didacticChapters, snapshots, onRestoreSnapshot, onAddSnapshot, onSendChatPrompt }: EditorProps) {
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
  const [confirmDeletePos, setConfirmDeletePos] = useState<{ top: number; left: number } | null>(null);
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

    // Table resize is handled by the document-level capture listener in the useEffect below.

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

    const cell = target.closest('td, th') as HTMLTableCellElement | null;
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
  const [showStructureMenu, setShowStructureMenu] = useState(false);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const structureMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showStructureMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (structureMenuRef.current && !structureMenuRef.current.contains(e.target as Node)) {
        setShowStructureMenu(false);
        setOpenSubject(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showStructureMenu]);
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
    { id: 'botanical', name: 'Botanisch', icon: '🌿', description: 'Eukalyptus-Aquarell' },
    { id: 'floral', name: 'Blumen', icon: '🌼', description: 'blaues Blumenarrangement' },
    { id: 'rose', name: 'Kirschblüten', icon: '🌸', description: 'rosa Kirschblüten' },
    { id: 'konfetti', name: 'Konfetti', icon: '✨', description: 'Goldenes Konfetti' },
    { id: 'welle', name: 'Wellen', icon: '🌊', description: 'Blaue Wellen' },
    { id: 'vintage', name: 'Vintage', icon: '📜', description: 'Viktorianische Verzierungen' },
    { id: 'abstract', name: 'Abstrakt gemalt', icon: '🎨', description: 'Abstrakte Pinselstriche' },
    { id: 'none', name: 'Kein Rahmen', icon: '🗑️', description: 'Rahmen entfernen' },
  ];

  const FRAME_PADDING: Record<string, string> = {
    botanical: '30px',
    abstract: '30px',
    welle: '30px',
    floral: '32px 38px 52px 38px',
    konfetti: '50px 85px 65px 85px',
    vintage: '50px',
    rose: '40px',
  };

  const COLOR_OPTIONS = [
    { id: 'bg-white', name: 'Weiß', hex: '#ffffff' },
    { id: 'bg-blue-100', name: 'Blau', hex: '#dbeafe' },
    { id: 'bg-green-100', name: 'Grün', hex: '#dcfce7' },
    { id: 'bg-yellow-100', name: 'Gelb', hex: '#fef9c3' },
    { id: 'bg-red-100', name: 'Rot', hex: '#fee2e2' },
    { id: 'bg-purple-100', name: 'Violett', hex: '#f3e8ff' },
    { id: 'bg-orange-100', name: 'Orange', hex: '#ffedd5' },
    { id: 'bg-emerald-100', name: 'Smaragd', hex: '#d1fae5' },
    { id: 'bg-cyan-100', name: 'Cyan', hex: '#cffafe' },
    { id: 'bg-pink-100', name: 'Rosa', hex: '#fce7f3' },
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

  // KI-Bild-Bearbeitung: Doppelklick auf .ai-image-slot öffnet dieses Modal.
  // Der Slot ist ein Wrapper-DIV, dessen Inhalt variiert: <img> (nach Generate
  // oder eigenem Upload) oder leerer Rahmen (Zeichnungs-Platzhalter).
  const [showAiImageModal, setShowAiImageModal] = useState(false);
  const [aiImageSlot, setAiImageSlot] = useState<HTMLElement | null>(null);
  const [aiImagePromptDraft, setAiImagePromptDraft] = useState('');
  const [isRegeneratingAiImage, setIsRegeneratingAiImage] = useState(false);
  const [aiImageError, setAiImageError] = useState('');
  const aiImageUploadRef = useRef<HTMLInputElement>(null);
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
    targetRow: HTMLTableRowElement | null;
    startY: number;
    startRowHeight: number;
  }>({
    active: false, type: null,
    leftCells: [], rightCells: [],
    startX: 0, startLeftWidth: 0, startRightWidth: 0,
    targetRow: null, startY: 0, startRowHeight: 0,
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
      // Externes HTML-Update (z.B. KI-Edit oder Snapshot-Restore): NICHT die History
      // resetten, sondern den neuen Zustand an die aktuelle Position pushen, damit
      // Ctrl+Z auch KI-Änderungen rückgängig machen kann.
      const currentHistory = historyRef.current;
      const currentIndex = historyIndexRef.current;
      if (currentIndex >= 0 && currentHistory.length > 0) {
        if (currentHistory[currentIndex] !== html) {
          const trimmed = currentHistory.slice(0, currentIndex + 1);
          const newHistory = [...trimmed, html].slice(-50);
          historyRef.current = newHistory;
          historyIndexRef.current = newHistory.length - 1;
        }
      } else {
        historyRef.current = [html];
        historyIndexRef.current = 0;
      }
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

        // Check if it's a structural container or answer marker we should NOT make editable
        if (
          element.classList.contains('page-break') ||
          element.classList.contains('avoid-break') ||
          element.classList.contains('cover-page-container') ||
          element.classList.contains('cover-page-wrapper') ||
          element.classList.contains('draggable-image-wrapper') ||
          element.classList.contains('gap-line') ||
          element.classList.contains('is-answer') ||
          element.classList.contains('is-highlight-answer') ||
          element.classList.contains('is-strikethrough-answer') ||
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

      // Cleanup: Remove stale editable/contenteditable from answer markers
      root.querySelectorAll('.gap-line, .is-answer, .is-highlight-answer, .is-strikethrough-answer').forEach(el => {
        el.removeAttribute('contenteditable');
        el.classList.remove('editable');
        (el as HTMLElement).style.removeProperty('user-select');
        (el as HTMLElement).style.removeProperty('-webkit-user-select');
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
  // Uses document-level listeners (capture phase for mousedown) so it works
  // independently of the useMemo-cached dossierContent JSX.
  useEffect(() => {
    const MIN_COL = 30;
    const MIN_ROW = 20;
    const THRESHOLD = 12;

    const getCols = (table: HTMLTableElement, colIndex: number): HTMLElement[] => {
      const cells: HTMLElement[] = [];
      Array.from(table.rows).forEach(r => {
        const c = r.cells[colIndex] as HTMLElement | undefined;
        if (c) cells.push(c);
      });
      return cells;
    };

    // Zahlenstrahl tick drag state
    const tickDrag = { active: false, tick: null as HTMLElement | null, container: null as HTMLElement | null, startX: 0 };

    const onMouseDown = (e: MouseEvent) => {
      let target = e.target as HTMLElement;
      if (!target) return;
      if (target.nodeType === 3) target = target.parentElement as HTMLElement;
      if (!target?.closest) return;

      // Zahlenstrahl: detect tick drag
      let walkEl: HTMLElement | null = target;
      while (walkEl && walkEl.parentElement) {
        const p = walkEl.parentElement;
        if (p.classList.contains('flex') && p.classList.contains('justify-between')
            && p.classList.contains('h-1') && p.classList.contains('bg-gray-800')
            && !walkEl.classList.contains('absolute') && p.closest('#dossier-root')) {
          e.preventDefault();
          tickDrag.active = true;
          tickDrag.tick = walkEl;
          tickDrag.container = p;
          tickDrag.startX = e.clientX;
          document.body.style.cursor = 'grabbing';
          document.body.style.userSelect = 'none';
          return;
        }
        walkEl = p;
      }

      const cell = target.closest('td, th') as HTMLTableCellElement | null;
      if (!cell) return;
      const table = cell.closest('table') as HTMLTableElement | null;
      if (!table || table.classList.contains('rechenmauer-table')) return;
      // Only act inside #dossier-root
      if (!cell.closest('#dossier-root')) return;

      const rect = cell.getBoundingClientRect();
      const row = cell.closest('tr') as HTMLTableRowElement | null;
      if (!row) return;
      const isLastCol = cell === row.cells[row.cells.length - 1];
      const isFirstCol = cell.cellIndex === 0;

      const nearRightEdge = Math.abs(e.clientX - rect.right) <= THRESHOLD && !isLastCol;
      const nearLeftEdge = Math.abs(e.clientX - rect.left) <= THRESHOLD && !isFirstCol;

      // --- Column resize ---
      if (nearRightEdge || nearLeftEdge) {
        e.preventDefault();
        e.stopImmediatePropagation();
        table.style.tableLayout = 'fixed';
        const root = document.getElementById('dossier-root');
        if (root) root.classList.add('table-col-resize');
        const leftColIndex = nearLeftEdge ? cell.cellIndex - 1 : cell.cellIndex;
        const rightColIndex = leftColIndex + 1;
        const leftCells = getCols(table, leftColIndex);
        const rightCells = getCols(table, rightColIndex);
        const lw = (row.cells[leftColIndex] as HTMLElement).getBoundingClientRect().width;
        const rw = (row.cells[rightColIndex] as HTMLElement).getBoundingClientRect().width;
        leftCells.forEach(c => { c.style.width = lw + 'px'; });
        rightCells.forEach(c => { c.style.width = rw + 'px'; });
        tableResizeRef.current = {
          active: true, type: 'col', leftCells, rightCells,
          startX: e.clientX, startLeftWidth: lw, startRightWidth: rw,
          targetRow: null, startY: 0, startRowHeight: 0,
        };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        return;
      }

      // --- Row resize ---
      const nearBottomEdge = Math.abs(e.clientY - rect.bottom) <= THRESHOLD;
      const isActualFirstRow = row.rowIndex === 0;
      const nearTopEdge = Math.abs(e.clientY - rect.top) <= THRESHOLD && !isActualFirstRow;

      if (nearBottomEdge || nearTopEdge) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const root = document.getElementById('dossier-root');
        if (root) root.classList.add('table-row-resize');
        let targetRow: HTMLTableRowElement;
        if (nearTopEdge) {
          const allRows = Array.from(table.rows);
          const idx = allRows.indexOf(row);
          targetRow = allRows[idx - 1];
        } else {
          targetRow = row;
        }
        if (!targetRow) return;
        // Clean up stale min-height/height on cells from earlier resize attempts
        // (min-height does NOT work on table-cell elements in Tailwind's CSS).
        Array.from(targetRow.cells).forEach(c => {
          (c as HTMLElement).style.minHeight = '';
          (c as HTMLElement).style.height = '';
          (c as HTMLElement).style.overflow = '';
        });
        // Height must be set on <tr>, not <td> — Tailwind's base CSS prevents
        // style.height from working on table-cell elements.
        const rh = targetRow.getBoundingClientRect().height;
        targetRow.style.height = rh + 'px';
        tableResizeRef.current = {
          active: true, type: 'row', leftCells: [], rightCells: [],
          startX: 0, startLeftWidth: 0, startRightWidth: 0,
          targetRow, startY: e.clientY, startRowHeight: rh,
        };
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        return;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      // Zahlenstrahl tick drag: reorder on move
      if (tickDrag.active && tickDrag.tick && tickDrag.container) {
        const ticks = Array.from(tickDrag.container.children).filter(
          c => !c.classList.contains('absolute')
        ) as HTMLElement[];
        const curIdx = ticks.indexOf(tickDrag.tick);
        for (let j = 0; j < ticks.length; j++) {
          if (j === curIdx) continue;
          const sibRect = ticks[j].getBoundingClientRect();
          const sibCenter = sibRect.left + sibRect.width / 2;
          if (j < curIdx && e.clientX < sibCenter) {
            tickDrag.container.insertBefore(tickDrag.tick, ticks[j]);
            break;
          }
          if (j > curIdx && e.clientX > sibCenter) {
            tickDrag.container.insertBefore(tickDrag.tick, ticks[j].nextSibling);
            break;
          }
        }
        return;
      }

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
      } else if (s.type === 'row' && s.targetRow) {
        const newH = Math.max(MIN_ROW, s.startRowHeight + (e.clientY - s.startY));
        s.targetRow.style.height = newH + 'px';
      }
    };

    const onMouseUp = () => {
      // Zahlenstrahl tick drag: finalize
      if (tickDrag.active) {
        tickDrag.active = false;
        tickDrag.tick = null;
        tickDrag.container = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        saveHistoryState();
        return;
      }

      if (!tableResizeRef.current.active) return;

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const root = document.getElementById('dossier-root');
      if (root) {
        root.classList.remove('table-col-resize', 'table-row-resize');
      }
      // Row height is kept as style.height on <tr> (not converted to min-height,
      // because min-height does not apply to table-row elements in CSS).
      tableResizeRef.current = {
        active: false, type: null,
        leftCells: [], rightCells: [],
        startX: 0, startLeftWidth: 0, startRightWidth: 0,
        targetRow: null, startY: 0, startRowHeight: 0,
      };
      saveHistoryState();
    };

    // Capture phase: fires BEFORE React handlers and contenteditable behavior
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
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

      // Drag zone = wrapper padding. Click on inner editable text → skip drag so native
      // text selection / editing works. Image wrapper is excluded (whole image drags).
      const isClickOnEditableContent = !!(
        target.classList.contains('editable') || target.closest('.editable')
      );
      if (isClickOnEditableContent && !el.classList.contains('resizable-cover-image-wrapper')) return;

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

    let guideEl: HTMLDivElement | null = null;
    const SNAP_PX = 6;

    const updateCenterGuide = (centered: boolean) => {
      if (!centered || !innerContainerRect) {
        guideEl?.remove();
        guideEl = null;
        return;
      }
      if (!guideEl) {
        guideEl = document.createElement('div');
        guideEl.style.cssText = 'position:fixed;width:1px;background:#ec4899;box-shadow:0 0 4px rgba(236,72,153,0.6);pointer-events:none;z-index:9999;';
        document.body.appendChild(guideEl);
      }
      guideEl.style.left = `${innerContainerRect.left + innerContainerRect.width / 2}px`;
      guideEl.style.top = `${innerContainerRect.top}px`;
      guideEl.style.height = `${innerContainerRect.height}px`;
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

      // Horizontal-center snap via measured center (works for both plain and translate(-50%) wrappers)
      const elRect = dragTarget.getBoundingClientRect();
      const deltaPx = (elRect.left + elRect.width / 2) - (innerContainerRect.left + innerContainerRect.width / 2);
      const isCentered = Math.abs(deltaPx) < SNAP_PX;
      if (isCentered && Math.abs(deltaPx) > 0.25) {
        const corrected = newLeft - (deltaPx / innerContainerRect.width) * 100;
        dragTarget.style.left = `${corrected.toFixed(2)}%`;
      }
      updateCenterGuide(isCentered);
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
      updateCenterGuide(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      guideEl?.remove();
    };
  }, []);

  // Mindmap: draggable nodes + dynamic SVG connectors between center and branches
  useEffect(() => {
    const root = document.getElementById('dossier-root');
    if (!root) return;

    const redrawContainer = (container: HTMLElement) => {
      const svg = container.querySelector(':scope > .mindmap-svg') as SVGSVGElement | null;
      const center = container.querySelector(':scope > .mindmap-center') as HTMLElement | null;
      if (!svg || !center) return;
      const nodes = container.querySelectorAll(':scope > .mindmap-node:not(.mindmap-center)');
      const crect = container.getBoundingClientRect();
      const centerRect = center.getBoundingClientRect();
      const cx = centerRect.left + centerRect.width / 2 - crect.left;
      const cy = centerRect.top + centerRect.height / 2 - crect.top;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      nodes.forEach((node) => {
        const nr = (node as HTMLElement).getBoundingClientRect();
        const nx = nr.left + nr.width / 2 - crect.left;
        const ny = nr.top + nr.height / 2 - crect.top;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(cx));
        line.setAttribute('y1', String(cy));
        line.setAttribute('x2', String(nx));
        line.setAttribute('y2', String(ny));
        line.setAttribute('stroke', '#cbd5e1');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-linecap', 'round');
        svg.appendChild(line);
      });
    };

    const redrawAll = () => {
      root.querySelectorAll<HTMLElement>('.mindmap-container').forEach(redrawContainer);
    };

    redrawAll();
    const obs = new MutationObserver((mutations) => {
      // Ignore mutations caused by our own SVG redraw (prevents infinite loop)
      const hasMeaningfulChange = mutations.some(
        (m) => !(m.target as Element).closest?.('.mindmap-svg')
      );
      if (hasMeaningfulChange) redrawAll();
    });
    obs.observe(root, { childList: true, subtree: true });
    const onResize = () => redrawAll();
    window.addEventListener('resize', onResize);

    let isDragging = false;
    let dragNode: HTMLElement | null = null;
    let dragContainer: HTMLElement | null = null;
    let containerRect: DOMRect | null = null;
    let startMouseX = 0, startMouseY = 0, startLeft = 0, startTop = 0, hasMoved = false;

    const onMouseDown = (e: MouseEvent) => {
      let target = e.target as HTMLElement;
      if (!target) return;
      if (target.nodeType === 3) target = target.parentElement as HTMLElement;
      if (!target?.closest) return;

      const node = target.closest('.mindmap-node') as HTMLElement | null;
      if (!node) return;
      const container = node.closest('.mindmap-container') as HTMLElement | null;
      if (!container) return;

      // Drag only when clicking on the node's padding (target === node).
      // Clicks on the inner editable fall through to native text selection/editing.
      if (target !== node) return;

      isDragging = true;
      dragNode = node;
      dragContainer = container;
      containerRect = container.getBoundingClientRect();
      startMouseX = e.clientX;
      startMouseY = e.clientY;
      const nodeRect = node.getBoundingClientRect();
      startLeft = node.style.left
        ? parseFloat(node.style.left)
        : ((nodeRect.left - containerRect.left) / containerRect.width) * 100;
      startTop = node.style.top
        ? parseFloat(node.style.top)
        : ((nodeRect.top - containerRect.top) / containerRect.height) * 100;
      hasMoved = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragNode || !dragContainer || !containerRect) return;
      const dx = e.clientX - startMouseX;
      const dy = e.clientY - startMouseY;
      if (!hasMoved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (!hasMoved) {
        hasMoved = true;
        dragNode.style.userSelect = 'none';
        dragNode.style.cursor = 'grabbing';
        (document.activeElement as HTMLElement)?.blur();
      }
      e.preventDefault();
      const newLeft = Math.max(0, Math.min(95, startLeft + (dx / containerRect.width) * 100));
      const newTop = Math.max(0, Math.min(92, startTop + (dy / containerRect.height) * 100));
      dragNode.style.left = `${newLeft.toFixed(1)}%`;
      dragNode.style.top = `${newTop.toFixed(1)}%`;
      redrawContainer(dragContainer);
    };

    const onMouseUp = () => {
      if (isDragging && hasMoved && dragNode) {
        dragNode.style.userSelect = '';
        dragNode.style.cursor = 'move';
        saveHistoryState();
      }
      isDragging = false;
      dragNode = null;
      dragContainer = null;
      containerRect = null;
      hasMoved = false;
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      obs.disconnect();
      window.removeEventListener('resize', onResize);
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

  const handleZoomBy = (delta: number) => {
    const wrapper = document.getElementById('dossier-wrapper');
    const newZoom = Math.max(0.5, Math.min(2, zoom + delta));
    if (newZoom === zoom) return;
    if (!wrapper) { setZoom(newZoom); return; }

    // Find the actual scrolling ancestor (walks up until overflow-y allows scroll)
    let scroller: HTMLElement = wrapper.parentElement as HTMLElement;
    while (scroller && scroller !== document.documentElement) {
      const o = getComputedStyle(scroller).overflowY;
      if ((o === 'auto' || o === 'scroll') && scroller.scrollHeight > scroller.clientHeight) break;
      scroller = scroller.parentElement as HTMLElement;
    }
    if (!scroller) scroller = document.documentElement;
    const usesWindowScroll = scroller === document.documentElement;

    // Mathematical approach: pick the layout Y inside the wrapper that's currently at the
    // viewport's vertical center; after zoom, set scrollTop so that same layout Y stays there.
    //
    //   visualTop_of_wrapper_top = wrapperRect.top (accounts for scrollTop already)
    //   contentY_in_unzoomed = (viewportCenterY - wrapperRect.top) / zoom
    //   afterZoom, new visualTop_of_wrapper_top unchanged (transformOrigin:top center keeps top).
    //   We want: viewportCenterY - (new wrapperRect.top after scroll adjust) = contentY * newZoom
    //   Scrolling changes wrapperRect.top by -scrollDelta. So:
    //     newWrapperTop = wrapperRect.top - scrollDelta
    //     viewportCenterY - (wrapperRect.top - scrollDelta) = contentY * newZoom
    //     scrollDelta = contentY * newZoom - (viewportCenterY - wrapperRect.top)
    //              = contentY * newZoom - contentY * zoom
    //              = contentY * (newZoom - zoom)
    // Anchor: content currently at the viewport's TOP should stay there after zoom.
    // Formula: Y_anchor = (viewportTopY - wrapperRect.top) / zoom; scrollDelta = Y_anchor * (newZoom - zoom).
    const wRect = wrapper.getBoundingClientRect();
    const viewportTopY = usesWindowScroll ? 0 : scroller.getBoundingClientRect().top;
    const contentY = (viewportTopY - wRect.top) / zoom;
    const scrollDelta = contentY * (newZoom - zoom);

    // Apply the new transform synchronously
    wrapper.style.transform = `scale(${newZoom})`;
    wrapper.style.transformOrigin = 'top center';
    const heightAdjustment = (newZoom - 1) * 100;
    wrapper.style.marginBottom = newZoom > 1 ? `${heightAdjustment}%` : '0';

    // Apply the scroll compensation
    if (scrollDelta !== 0) {
      if (usesWindowScroll) window.scrollBy(0, scrollDelta);
      else scroller.scrollTop += scrollDelta;
    }

    setZoom(newZoom);
  };

  const handleZoomIn = () => handleZoomBy(0.1);
  const handleZoomOut = () => handleZoomBy(-0.1);

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

  // Refs auf die neuesten Handler-Funktionen, damit der globale keydown-Listener
  // nicht bei jedem Render neu registriert werden muss.
  const handleUndoRef = useRef(handleUndo);
  const handleRedoRef = useRef(handleRedo);
  handleUndoRef.current = handleUndo;
  handleRedoRef.current = handleRedo;

  // Globaler Ctrl+Z / Ctrl+Shift+Z Handler für Dossier-Undo, auch wenn der Fokus
  // außerhalb von #dossier-root liegt (z.B. nach einem KI-Edit im Chat). Bei
  // aktivem Text-Input (input/textarea/contenteditable) überlassen wir Ctrl+Z
  // dem Browser, damit native Text-Undo erhalten bleibt.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key !== 'z' && e.key !== 'Z') return;
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (active.isContentEditable) return;
      }
      e.preventDefault();
      if (e.shiftKey) handleRedoRef.current();
      else handleUndoRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
    if (!size) return;
    document.getElementById('dossier-root')?.focus();
    restoreSelection();
    saveHistoryState();
    document.execCommand('fontSize', false, '7'); // Dummy size to find it
    // Convert live collection to static array to avoid skipping elements
    const fontElements = Array.from(document.getElementsByTagName('font'));
    for (const el of fontElements) {
        if (el.size === '7') {
            el.removeAttribute('size');
            el.style.fontSize = size;
            // Clean up: unwrap parent <font> tags to prevent nested conflicts
            let parent = el.parentElement;
            while (parent && parent.tagName === 'FONT') {
              if (parent.style.fontSize) {
                parent.style.removeProperty('font-size');
              }
              // If parent <font> has no remaining styles/attributes, unwrap it
              if (!parent.style.cssText.trim() && !parent.getAttribute('color') && !parent.getAttribute('face')) {
                const grandparent = parent.parentNode;
                if (grandparent) {
                  while (parent.firstChild) grandparent.insertBefore(parent.firstChild, parent);
                  grandparent.removeChild(parent);
                }
                break;
              }
              parent = parent.parentElement;
            }
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

      // Auto-Nummerierung: Zähle bestehende Aufgaben-Blöcke und mache den Titel eindeutig.
      // Ersetzt "Aufgabe: <X>" durch "Aufgabe N: <Template-Name>", wobei N die nächste freie Nummer ist.
      try {
        const existingH3s = root.querySelectorAll('div.avoid-break > h3');
        let maxNumber = 0;
        existingH3s.forEach((h) => {
          const m = (h.textContent || '').match(/^Aufgabe\s+(\d+)\s*[:\-]/i);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!Number.isNaN(n) && n > maxNumber) maxNumber = n;
          }
        });
        const nextNumber = maxNumber + 1;
        const newTitle = `Aufgabe ${nextNumber}: ${template.name}`;
        // Ersetze den ersten "Aufgabe: ..."-Titel durch den nummerierten.
        htmlToAdd = htmlToAdd.replace(
          /(<h3[^>]*>)\s*Aufgabe:\s*[^<]*(<\/h3>)/,
          `$1${newTitle}$2`,
        );
      } catch (e) {
        // Falls die DOM-Zählung scheitert, bleibt der Default-Titel.
        console.warn('Auto-Nummerierung fehlgeschlagen:', e);
      }
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

    // Ensure every inserted block gets a unique ID (exercise templates don't include one)
    if (!htmlElement.id) htmlElement.id = id;

    if (activeBlock) {
      // Detect if activeBlock IS a page container (not a block within a page).
      // This happens when the dossier uses an outer wrapper:
      //   root → outerWrapper → pageContainers (p-[2.5cm]) → blocks
      // In that case findBlockForElement returns the pageContainer itself.
      // We must append INSIDE the page container, not after it.
      const isPageContainer =
        (activeBlock.parentElement === root && !activeBlock.classList.contains('page-break')) ||
        activeBlock.className.includes('p-[2.5cm]') ||
        activeBlock.className.includes('p-[2cm]');
      if (isPageContainer) {
        activeBlock.appendChild(htmlElement);
      } else {
        activeBlock.parentNode?.insertBefore(htmlElement, activeBlock.nextSibling);
      }
    } else {
      // No active block: append to the last page container (any direct non-page-break child of root).
      const pageContainers = Array.from(root.children).filter(
        el => !el.classList.contains('page-break')
      ) as HTMLElement[];
      const lastContainer = pageContainers[pageContainers.length - 1];
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

    // Whole-page move: activeBlock is a page container (direct child of dossier-root, not a page-break).
    // Move the entire page before/after the adjacent page and normalize page-break separators.
    if (pageContainer === dossierRoot) {
      if (blockToMove.classList.contains('page-break')) return;

      let target: Element | null = direction === 'up'
        ? blockToMove.previousElementSibling
        : blockToMove.nextElementSibling;
      while (target && target.classList.contains('page-break')) {
        target = direction === 'up' ? target.previousElementSibling : target.nextElementSibling;
      }
      if (!target) return;

      saveHistoryState();

      if (direction === 'up') target.before(blockToMove);
      else target.after(blockToMove);

      while (dossierRoot.firstElementChild?.classList.contains('page-break')) dossierRoot.firstElementChild.remove();
      while (dossierRoot.lastElementChild?.classList.contains('page-break')) dossierRoot.lastElementChild.remove();
      Array.from(dossierRoot.querySelectorAll('.page-break')).forEach(pb => {
        const nxt = pb.nextElementSibling;
        if (nxt && nxt.classList.contains('page-break')) nxt.remove();
      });
      const kids = Array.from(dossierRoot.children);
      for (let i = 0; i < kids.length - 1; i++) {
        const a = kids[i], b = kids[i + 1];
        if (!a.classList.contains('page-break') && !b.classList.contains('page-break')) {
          const pb = document.createElement('div');
          pb.className = 'page-break avoid-break';
          a.after(pb);
        }
      }

      setActiveBlock(blockToMove);
      document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
      blockToMove.classList.add('active-block-highlight');

      saveHistoryState();
      blockToMove.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
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

    // 0a. Mindmap branch node: delete the whole node (not just the inner editable)
    if (activeEditable && activeBlock) {
      const mindmapNode = activeEditable.closest('.mindmap-node:not(.mindmap-center)') as HTMLElement | null;
      if (mindmapNode && activeBlock.contains(mindmapNode)) {
        saveHistoryState();
        mindmapNode.remove();
        setActiveEditable(null);
        saveHistoryState();
        return;
      }
    }

    // 0. Suchsel: delete the word block if cursor is inside .suchsel-woerter
    if (activeEditable && activeBlock) {
      const suchselBlock = activeEditable.closest('.suchsel-woerter');
      if (suchselBlock && activeBlock.contains(suchselBlock)) {
        saveHistoryState();
        suchselBlock.remove();
        setActiveEditable(null);
        saveHistoryState();
        return;
      }
    }

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

    // Confirmation for deleting a page container with content: show popover anchored to delete button
    const isPageContainer = activeBlock.parentElement === root && !activeBlock.classList.contains('page-break');
    if (isPageContainer && activeBlock.children.length > 0) {
      const btn = document.querySelector('button[title="Block löschen"]') as HTMLElement | null;
      if (btn) {
        const r = btn.getBoundingClientRect();
        setConfirmDeletePos({ top: r.top, left: r.left + r.width / 2 });
      } else {
        setConfirmDeletePos({ top: window.innerHeight / 2, left: window.innerWidth / 2 });
      }
      return;
    }

    performBlockDelete();
  };

  const performBlockDelete = () => {
    const root = document.getElementById('dossier-root');
    if (!root || !activeBlock || !root.contains(activeBlock)) return;

    saveHistoryState();
    activeBlock.remove();

    const pageBreaks = Array.from(root.querySelectorAll('.page-break'));
    for (const pb of pageBreaks) {
      const next = pb.nextElementSibling;
      if (next && next.classList.contains('page-break')) next.remove();
    }
    while (root.firstElementChild?.classList.contains('page-break')) root.firstElementChild.remove();
    while (root.lastElementChild?.classList.contains('page-break')) root.lastElementChild.remove();

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

      const placeholder = target.closest('.image-placeholder-trigger') as HTMLElement | null;
      if (placeholder) {
        // Steckbrief-Templates markieren ihren Placeholder zusätzlich als
        // .ai-image-slot → hier soll NUR Doppelklick das 3+1-Options-Modal
        // öffnen (über handleRootDoubleClick). Single-Click lassen wir durch,
        // damit der Text-Cursor normal gesetzt werden kann.
        if (placeholder.classList.contains('ai-image-slot')) {
          return;
        }
        // Alte Templates ohne ai-image-slot: Single-Click öffnet direkt den
        // File-Upload-Dialog (bestehendes Verhalten, unverändert).
        e.preventDefault();
        e.stopPropagation();
        setPendingImageTarget(placeholder);
        imageUploadRef.current?.click();
      }
    };

    const root = document.getElementById('dossier-root');
    root?.addEventListener('click', handlePlaceholderClick);
    return () => root?.removeEventListener('click', handlePlaceholderClick);
  }, []);

  const clearClonedContent = (element: HTMLElement) => {
    // Nur echte Eingabefelder leeren, Strukturelemente (→, Labels) beibehalten
    element.querySelectorAll('.editable[contenteditable="true"]').forEach(el => {
      (el as HTMLElement).innerHTML = '...';
    });
    if (element.classList.contains('editable') &&
        element.getAttribute('contenteditable') === 'true') {
      element.innerHTML = '...';
    }
  };

  const getRepeatableGroup = (item: HTMLElement): HTMLElement[] => {
    const parent = item.parentElement;
    if (!parent) return [item];
    const children = Array.from(parent.children) as HTMLElement[];
    const idx = children.indexOf(item);
    if (idx === -1) return [item];

    const tag = item.tagName;
    const group: HTMLElement[] = [item];

    for (let i = idx + 1; i < children.length; i++) {
      if (children[i].tagName === tag) break;
      group.push(children[i]);
    }

    return group;
  };

  const findRepeatableItem = (element: HTMLElement, boundary: HTMLElement): HTMLElement | null => {
    const blockTags = ['div', 'p', 'section', 'article'];
    const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    let current: HTMLElement | null = element;

    while (current && current !== boundary) {
      const parent = current.parentElement;
      if (!parent || parent === boundary.parentElement) break;

      const tag = current.tagName.toLowerCase();
      if (!blockTags.includes(tag) || headingTags.includes(tag)) {
        current = parent;
        continue;
      }

      const sameTagSiblings = Array.from(parent.children).filter(child => {
        if (child === current) return false;
        const childTag = child.tagName.toLowerCase();
        if (headingTags.includes(childTag)) return false;
        if ((child as HTMLElement).classList?.contains('no-print')) return false;
        return childTag === tag;
      });

      if (sameTagSiblings.length >= 1) {
        return current;
      }

      // Allow cloning a single contenteditable element inside a non-boundary wrapper
      // (e.g. Lückentext: <div class="leading-loose"><p contenteditable>...</p></div>)
      if (current.getAttribute('contenteditable') === 'true' && parent !== boundary) {
        return current;
      }

      current = parent;
    }

    return null;
  };

  const handleAddRow = () => {
    // Fall 1: Tabellenzelle (bestehende Logik)
    if (activeTableCell) {
      saveHistoryState();
      const row = activeTableCell.closest('tr');
      const table = activeTableCell.closest('table');
      if (row && table) {
        const isRechenmauer = table.classList.contains('rechenmauer-table');

        if (isRechenmauer) {
          // Rechenmauer: neue Zeile IMMER am Ende mit einem Feld mehr als die letzte Reihe.
          const tbody = table.querySelector('tbody') || table;
          const rows = tbody.querySelectorAll(':scope > tr');
          const lastRow = rows[rows.length - 1] as HTMLTableRowElement | undefined;
          if (lastRow) {
            const newRow = lastRow.cloneNode(true) as HTMLTableRowElement;
            newRow.querySelectorAll('.editable').forEach(el => el.innerHTML = '...');
            const lastCell = newRow.cells[newRow.cells.length - 1];
            if (lastCell) {
              const newCell = lastCell.cloneNode(true) as HTMLTableCellElement;
              newCell.innerHTML = '...';
              newRow.appendChild(newCell);
            }
            lastRow.parentNode?.appendChild(newRow);
          }
        } else {
          const newRow = row.cloneNode(true) as HTMLTableRowElement;
          newRow.querySelectorAll('.editable').forEach(el => el.innerHTML = '...');
          row.parentNode?.insertBefore(newRow, row.nextSibling);
        }
      }
      saveHistoryState();
      return;
    }

    // Fall 2 & 3: Nicht-Tabellen-Aufgabenblöcke
    // activeEditable wird bei jedem selectionchange gesetzt und bleibt erhalten,
    // auch wenn der Fokus durch den Button-Klick zum Toolbar wechselt.
    if (!activeEditable) return;
    const element = activeEditable;

    const editorRoot = document.getElementById('dossier-root');
    if (!editorRoot || !editorRoot.contains(element)) return;

    // Fall 2: Listen-Element
    const listItem = element.closest('li') as HTMLElement;
    if (listItem && editorRoot.contains(listItem)) {
      saveHistoryState();
      const newItem = listItem.cloneNode(true) as HTMLElement;
      clearClonedContent(newItem);
      listItem.parentNode?.insertBefore(newItem, listItem.nextSibling);
      saveHistoryState();
      return;
    }

    // Fall 3: Wiederholendes Block-Element (div, p)
    const boundary = (element.closest('.avoid-break') as HTMLElement) || activeBlock;
    if (!boundary) return;

    const repeatableItem = findRepeatableItem(element, boundary);
    if (repeatableItem) {
      saveHistoryState();
      const group = getRepeatableGroup(repeatableItem);
      const lastInGroup = group[group.length - 1];
      let insertAfter = lastInGroup;

      for (const el of group) {
        const clone = el.cloneNode(true) as HTMLElement;
        clearClonedContent(clone);
        insertAfter.parentNode?.insertBefore(clone, insertAfter.nextSibling);
        insertAfter = clone;
      }
      saveHistoryState();
      return;
    }
  };

  const handleDeleteRow = () => {
    if (!activeTableCell) return;
    saveHistoryState();
    const row = activeTableCell.closest('tr');
    if (row) row.remove();
    setActiveTableCell(null);
    saveHistoryState();
  };

  // Helper: find the Zahlenstrahl flex container and the active tick column
  const findNumberLineTick = (): { container: HTMLElement, tick: HTMLElement } | null => {
    // Strategy 1: walk up from activeEditable to find a .zahlenstrahl-tick
    if (activeEditable) {
      const tickCol = activeEditable.closest('.zahlenstrahl-tick') as HTMLElement;
      if (tickCol) {
        const container = tickCol.parentElement as HTMLElement;
        if (container) return { container, tick: tickCol };
      }
      // Legacy: old structure (flex justify-between h-1 bg-gray-800)
      let el: HTMLElement | null = activeEditable;
      while (el) {
        const parent = el.parentElement;
        if (parent && parent.classList.contains('flex') && parent.classList.contains('justify-between')
            && parent.classList.contains('h-1') && parent.classList.contains('bg-gray-800')) {
          if (!el.classList.contains('absolute')) return { container: parent, tick: el };
        }
        el = parent;
      }
    }
    // Strategy 2: if activeBlock contains a zahlenstrahl, return the last tick column
    if (activeBlock) {
      const zs = activeBlock.querySelector('.zahlenstrahl-container') as HTMLElement;
      if (zs) {
        const flexRow = zs.querySelector('.flex.justify-between') as HTMLElement;
        if (flexRow) {
          const ticks = flexRow.querySelectorAll('.zahlenstrahl-tick');
          if (ticks.length > 0) return { container: flexRow, tick: ticks[ticks.length - 1] as HTMLElement };
        }
      }
      // Legacy fallback
      const nl = activeBlock.querySelector('.flex.justify-between.h-1.bg-gray-800') as HTMLElement;
      if (nl) {
        const ticks = Array.from(nl.children).filter(t => !t.classList.contains('absolute')) as HTMLElement[];
        if (ticks.length > 0) return { container: nl, tick: ticks[ticks.length - 1] };
      }
    }
    return null;
  };

  const handleAddColumn = () => {
    // Zahlenstrahl: add a tick column when inside a number line
    const nlTick = findNumberLineTick();
    if (nlTick) {
      saveHistoryState();
      // New structure: .zahlenstrahl-tick flex column
      if (nlTick.tick.classList.contains('zahlenstrahl-tick')) {
        const col = document.createElement('div');
        col.className = 'zahlenstrahl-tick flex flex-col items-center';
        const mark = document.createElement('div');
        mark.className = 'h-6 w-0.5 bg-gray-800';
        const label = document.createElement('div');
        label.className = 'editable text-center font-bold mt-1';
        label.contentEditable = 'true';
        label.style.minWidth = '1.5rem';
        label.textContent = '\u00A0';
        col.appendChild(mark);
        col.appendChild(label);
        nlTick.container.insertBefore(col, nlTick.tick.nextSibling);
      } else {
        // Legacy structure
        const tick = document.createElement('div');
        tick.className = 'relative h-6 w-0.5 bg-gray-800 -mt-3';
        const label = document.createElement('div');
        label.className = 'absolute top-8 left-1/2 -translate-x-1/2 editable text-center font-bold';
        label.contentEditable = 'true';
        label.style.minWidth = '1.5rem';
        label.textContent = '\u00A0';
        tick.appendChild(label);
        nlTick.container.insertBefore(tick, nlTick.tick.nextSibling);
      }
      saveHistoryState();
      return;
    }

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

  const handleAddSubTask = () => {
    if (!activeBlock) {
      setNotification({ message: 'Bitte wähle zuerst einen Block aus', type: 'error' });
      return;
    }
    if (!onSendChatPrompt) {
      setNotification({ message: 'Chat-Anbindung fehlt – bitte App neu laden', type: 'error' });
      return;
    }

    // Block-Titel: erstes h1/h2/h3 im Block. Fallback: erste Zeile des innerText.
    const headingEl = activeBlock.querySelector('h1, h2, h3') as HTMLElement | null;
    const blockTitle = (headingEl?.innerText || activeBlock.innerText.split('\n')[0] || '')
      .trim()
      .slice(0, 140);

    if (!blockTitle) {
      setNotification({ message: 'Block hat keinen erkennbaren Titel', type: 'error' });
      return;
    }

    // Vollständiges Block-HTML, damit die KI das existierende Format sieht –
    // wird als Hidden Context mitgeschickt, aber nicht im Chat-Bubble angezeigt.
    const blockHtml = activeBlock.outerHTML;
    const count = aiSubtaskCount;
    const plural = count === 1 ? '1 neue Teilaufgabe' : `${count} neue Teilaufgaben`;

    // Sichtbarer Chat-Bubble: kurz & lesbar.
    const visibleText = `Füge **${plural}** zum Block «${blockTitle}» hinzu – gleiches Format (gap-line, is-answer, schreib-linie), bestehende Teilaufgaben unverändert lassen, keine Duplikate.`;

    // Hidden Context: die detaillierten Regeln + aktuelles Block-HTML. Wird nur an die API geschickt.
    const hiddenContext = `Nutze dafür das Tool update_block und übergib den kompletten Block neu. Das HTML MUSS:
- die bestehende Struktur (Tabelle, Liste, content-wrapper, avoid-break etc.) beibehalten,
- das bestehende Antwort-Format nutzen (gap-line, is-answer, is-strikethrough-answer, schreib-linie etc.),
- die vorhandenen Teilaufgaben unverändert lassen und die ${count === 1 ? 'neue Teilaufgabe' : `${count} neuen Teilaufgaben`} einfach anhängen,
- keine Duplikate vorhandener Inhalte erzeugen.

Hier das aktuelle HTML des Blocks (inkl. aller bestehenden Teilaufgaben als Stilreferenz):

\`\`\`html
${blockHtml}
\`\`\``;

    onSendChatPrompt(visibleText, { autoSend: true, hiddenContext });
    setNotification({ message: `Teilaufgaben-Prompt an Chat gesendet (${count})`, type: 'success' });
  };

  const handleDeleteColumn = () => {
    // Zahlenstrahl: delete a tick
    const nlTick = findNumberLineTick();
    if (nlTick) {
      saveHistoryState();
      nlTick.tick.remove();
      saveHistoryState();
      return;
    }

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
        // Use per-side border properties (not shorthand) so asymmetric borders
        // like Tailwind's `border-b` are preserved correctly in the clone.
        (['Top', 'Right', 'Bottom', 'Left'] as const).forEach(side => {
          const bsVal = (style as any)[`border${side}Style`];
          if (bsVal && bsVal !== 'none') (cloneEl.style as any)[`border${side}Style`] = bsVal;
          const bwVal = (style as any)[`border${side}Width`];
          if (bwVal && bwVal !== '0px') (cloneEl.style as any)[`border${side}Width`] = bwVal;
        });

        // Flatten typography so #dossier-root-scoped font rules survive outside that container.
        (['fontSize', 'fontWeight', 'fontFamily', 'lineHeight',
          'letterSpacing', 'textTransform', 'fontStyle'] as const).forEach(prop => {
          const val = (style as any)[prop];
          if (val) (cloneEl.style as any)[prop] = val;
        });

        // Aggressively strip anything that might contain oklch and we haven't handled
        if (hasModernColor(style.boxShadow)) cloneEl.style.boxShadow = 'none';
        if (hasModernColor(style.textShadow)) cloneEl.style.textShadow = 'none';
        if (hasModernColor(style.backgroundImage)) cloneEl.style.backgroundImage = 'none';
        if (hasModernColor(style.borderImage)) cloneEl.style.borderImage = 'none';
        if (hasModernColor(style.outline)) cloneEl.style.outline = 'none';

        // Flatten list properties so bullet position/style survive outside #dossier-root
        const tag = el.tagName;
        if (tag === 'UL' || tag === 'OL') {
          cloneEl.style.listStyleType = style.listStyleType;
          cloneEl.style.listStylePosition = style.listStylePosition;
          cloneEl.style.paddingLeft = style.paddingLeft;
        }

        // Ensure tables have borders in PDF
        if (el.tagName === 'TABLE') {
          cloneEl.style.borderCollapse = 'collapse';
          cloneEl.style.width = '100%';
        }
        if (el.tagName === 'TD' || el.tagName === 'TH') {
          cloneEl.style.border = '1px solid #000';
          // Flatten cell dimensions so table rows match the editor height
          const cellH = style.height;
          if (cellH && cellH !== 'auto') cloneEl.style.height = cellH;
          const cellMinW = style.minWidth;
          if (cellMinW && cellMinW !== '0px') cloneEl.style.minWidth = cellMinW;
          cloneEl.style.paddingTop = style.paddingTop;
          cloneEl.style.paddingRight = style.paddingRight;
          cloneEl.style.paddingBottom = style.paddingBottom;
          cloneEl.style.paddingLeft = style.paddingLeft;
          cloneEl.style.verticalAlign = style.verticalAlign;
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
    const safeName = (projectName || 'Mein_Dossier').replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').replace(/\s+/g, '_');
    link.download = `${safeName}_Backup.json`;
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

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
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

        // Propagate hide-solutions state so .hide-solutions .is-answer CSS rules still match
        if (root.classList.contains('hide-solutions')) {
          clone.classList.add('hide-solutions');
        }

        // Strip editor-only decorations
        clone.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
        clone.querySelectorAll<HTMLElement>('.no-print').forEach(el => { el.style.display = 'none'; });
        clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        clone.querySelectorAll<HTMLElement>('.resizable-cover-image-wrapper').forEach(el => {
          el.style.border = 'none'; el.style.outline = 'none';
        });

        // Fix cover-draggable overflow clipping (Name field etc.)
        clone.querySelectorAll<HTMLElement>('.cover-draggable').forEach(el => {
          el.style.overflow = 'visible';
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

        // Strip .editable class for PDF export. In the editor, .editable applies
        // margin: -2px -4px; padding: 2px 4px. The padding and margin cancel out
        // horizontally (net 0), and vertically the -2px margin causes slight overlap
        // that html2canvas exaggerates. Strategy:
        // - Text tags (P, H1-H6, LI): keep .editable's padding for correct element
        //   sizing and descender buffer. Zero vertical margins to prevent both
        //   browser defaults (1em), Tailwind oversized margins (mb-4=16px), and
        //   html2canvas negative-margin overlap. Keep -4px horizontal margin so
        //   text stays at the same horizontal position as in the editor.
        // - Non-text elements (TD, TH, SPAN, DIV, UL, etc.): just strip .editable.
        //   Their padding/dimensions were already flattened by flattenElementStyles.
        {
          const textTags = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI']);
          const liveEditables = page.querySelectorAll<HTMLElement>('.editable');
          const cloneEditables = clone.querySelectorAll<HTMLElement>('.editable');
          for (let j = 0; j < liveEditables.length && j < cloneEditables.length; j++) {
            if (textTags.has(liveEditables[j].tagName)) {
              cloneEditables[j].style.margin = '0 -4px';
              cloneEditables[j].style.padding = '2px 4px';
            }
            cloneEditables[j].classList.remove('editable');
          }
        }

        // Fix border-bottom on inline-block spans (e.g. cover page Name/Klasse/Datum lines).
        // html2canvas doesn't reliably render border-bottom on empty elements — replace
        // the CSS border with a background-image gradient line (no new DOM elements needed).
        {
          const liveBorderEls = page.querySelectorAll<HTMLElement>('span.border-b, span[class*="border-b-"]');
          const cloneBorderEls = clone.querySelectorAll<HTMLElement>('span.border-b, span[class*="border-b-"]');
          for (let j = 0; j < liveBorderEls.length && j < cloneBorderEls.length; j++) {
            const liveEl = liveBorderEls[j];
            const cloneEl = cloneBorderEls[j];
            const cs = window.getComputedStyle(liveEl);
            const bw = parseFloat(cs.borderBottomWidth);
            if (bw > 0 && liveEl.offsetHeight > 0) {
              // Use the already-resolved rgb color from flattenElementStyles
              const bColor = cloneEl.style.borderBottomColor || cs.borderBottomColor || '#9ca3af';
              cloneEl.style.borderBottomWidth = '0';
              cloneEl.style.display = cs.display;
              cloneEl.style.width = cs.width;
              cloneEl.style.height = cs.height;
              // Draw the line at the very bottom via gradient
              cloneEl.style.backgroundImage = `linear-gradient(to top, ${bColor} ${Math.max(bw, 1)}px, transparent ${Math.max(bw, 1)}px)`;
              cloneEl.style.backgroundSize = '100% 100%';
              cloneEl.style.backgroundRepeat = 'no-repeat';
            }
          }
        }

        // Fix gap-line: html2canvas renders border-bottom too high on inline-block elements,
        // causing text to sit directly on the line instead of above it.
        // Replace border with an absolutely positioned div for correct placement.
        {
          const liveGapLines = page.querySelectorAll<HTMLElement>('.gap-line');
          const cloneGapLines = clone.querySelectorAll<HTMLElement>('.gap-line');
          for (let j = 0; j < liveGapLines.length && j < cloneGapLines.length; j++) {
            const liveEl = liveGapLines[j];
            const cloneEl = cloneGapLines[j];
            const cs = window.getComputedStyle(liveEl);
            const bw = parseFloat(cs.borderBottomWidth);
            if (bw > 0) {
              const bColor = cs.borderBottomColor || '#000';
              cloneEl.style.borderBottom = 'none';
              cloneEl.style.position = 'relative';
              cloneEl.style.overflow = 'visible';
              const line = document.createElement('div');
              line.style.cssText = `position:absolute;left:0;right:0;bottom:-3px;height:${Math.max(bw, 1.5)}px;background:${bColor};pointer-events:none;`;
              cloneEl.appendChild(line);
            }
          }
        }

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
        // Skip when hide-solutions is active — highlights must be invisible in student mode.
        const isHideSolutions = clone.classList.contains('hide-solutions');
        clone.querySelectorAll<HTMLElement>('.is-highlight-answer').forEach(cloneEl => {
          cloneEl.style.backgroundColor = 'transparent';
          if (isHideSolutions) {
            cloneEl.style.backgroundImage = 'none';
          } else {
            // Gradient starts 7px from top (background shifts down) and extends 7px
            // below the element via padding-bottom (background grows downward).
            cloneEl.style.backgroundImage = 'linear-gradient(transparent 7px, #fef08a 7px)';
            cloneEl.style.backgroundRepeat = 'no-repeat';
            cloneEl.style.backgroundSize = '100% 100%';
            // Extend padding-bottom by 7px so the yellow area reaches further down
            const existingPadBottom = parseFloat(window.getComputedStyle(cloneEl).paddingBottom) || 0;
            cloneEl.style.paddingBottom = `${existingPadBottom + 7}px`;
          }
        });

        // Fix strikethrough: html2canvas misrenders text-decoration: line-through.
        // MUST run AFTER stage.appendChild(clone) so offsetHeight is available.
        // Skip when hide-solutions is active — strikethrough answers must look normal in student mode.
        clone.querySelectorAll<HTMLElement>('.is-strikethrough-answer').forEach(cloneEl => {
          cloneEl.style.textDecoration = 'none';
          if (isHideSolutions) {
            // Student mode: remove blue color, show as normal text
            cloneEl.style.color = 'inherit';
          } else {
            // Teacher mode: draw the strikethrough line manually
            cloneEl.style.position = 'relative';
            cloneEl.style.display = 'inline-block';
            cloneEl.style.color = '#2563eb';
            const h = cloneEl.offsetHeight;
            const lineTop = Math.round(h / 2) + 8;
            const line = document.createElement('div');
            line.style.cssText = `position:absolute;left:-1px;right:-1px;top:${lineTop}px;height:2px;background:#2563eb;pointer-events:none;`;
            cloneEl.appendChild(line);
          }
        });

        // Final safety pass: scrub any remaining oklch/oklab from ALL elements in the clone
        // (covers elements added after flattenElementStyles, e.g. strikethrough line divs).
        {
          const scrubCanvas = document.createElement('canvas');
          scrubCanvas.width = 1; scrubCanvas.height = 1;
          const scrubCtx = scrubCanvas.getContext('2d', { willReadFrequently: true })!;
          const scrubCache = new Map<string, string>();
          const scrubProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor',
            'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];
          clone.querySelectorAll<HTMLElement>('*').forEach(el => {
            const cs = window.getComputedStyle(el);
            scrubProps.forEach(prop => {
              const val = (cs as any)[prop];
              if (val && hasModernColor(val)) {
                (el.style as any)[prop] = resolveColorToRgb(val, scrubCtx, scrubCache);
              }
            });
          });
        }

        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: pageW,
          height: pageH,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc: Document) => {
            // Strip any residual oklch from ALL stylesheets (inline styles above win on specificity).
            // Process <style> tags by text replacement:
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
            // Also strip oklch from CSSOM rules (covers <link> stylesheets and Vite-injected styles):
            try {
              for (const sheet of Array.from(clonedDoc.styleSheets)) {
                try {
                  const rules = sheet.cssRules;
                  for (let r = rules.length - 1; r >= 0; r--) {
                    const ruleText = rules[r].cssText;
                    if (/oklch|oklab|color-mix/.test(ruleText)) {
                      const fixed = ruleText
                        .replace(/oklch\s*\([^)]+\)/g, 'transparent')
                        .replace(/oklab\s*\([^)]+\)/g, 'transparent')
                        .replace(/color-mix\s*\([^)]+\)/g, 'transparent');
                      sheet.deleteRule(r);
                      sheet.insertRule(fixed, r);
                    }
                  }
                } catch (_) {} // CORS blocked stylesheets
              }
            } catch (_) {}
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
        const isCoverPage = page.hasAttribute('data-cover') || page.querySelector('.cover-page-container') !== null;
        const cropPx = isCoverPage ? 0 : Math.max(0, firstContentRow - TARGET_TOP);

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

        const imgData = finalCanvas.toDataURL('image/png');
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, A4_W_MM, A4_H_MM);
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

      const safePdfName = (projectName || 'Mein_Dossier').replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '').replace(/\s+/g, '_');
      pdf.save(`${safePdfName}.pdf`);

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

        // Measure actual content overflow using getBoundingClientRect to avoid
        // overcounting collapsed sibling margins and the trailing margin-bottom
        // of the last block (which is just empty padding-area space).
        const style = window.getComputedStyle(page);
        const paddingBottom = parseFloat(style.paddingBottom) || 0;

        // Filter out page-break children for the move/split logic
        const contentChildren = Array.from(page.children).filter(
          c => !(c as HTMLElement).classList?.contains('page-break')
        ) as HTMLElement[];
        if (contentChildren.length === 0) continue;

        const lastChild = contentChildren[contentChildren.length - 1];
        const pageRect = page.getBoundingClientRect();
        const lastRect = lastChild.getBoundingClientRect();
        const contentBottom = lastRect.bottom - pageRect.top;
        const availableBottom = page.offsetHeight - paddingBottom;
        if (contentBottom <= availableBottom) continue;

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

  const handleRootInput = (e?: React.FormEvent<HTMLElement>) => {
    resetPageScrollTops();

    // If the user edited a digital clock-time inside an .analog-clock, rotate the hands to match.
    const inputTarget = e?.target as HTMLElement | undefined;
    if (inputTarget && typeof inputTarget.closest === 'function') {
      const clock = inputTarget.closest('.analog-clock') as HTMLElement | null;
      if (clock) {
        const timeEl = clock.querySelector('.clock-time') as HTMLElement | null;
        const text = (timeEl?.textContent || '').trim();
        const m = text.match(/(\d{1,2})\s*[:.]\s*(\d{1,2})/);
        if (m) {
          const hours = parseInt(m[1], 10);
          const minutes = parseInt(m[2], 10);
          if (!isNaN(hours) && !isNaN(minutes) && minutes >= 0 && minutes < 60) {
            const hAngle = ((hours % 12) + minutes / 60) * 30;
            const mAngle = minutes * 6;
            const hourHand = clock.querySelector('.clock-hand-hour');
            const minuteHand = clock.querySelector('.clock-hand-minute');
            hourHand?.setAttribute('transform', `rotate(${hAngle} 50 50)`);
            minuteHand?.setAttribute('transform', `rotate(${mAngle} 50 50)`);
          }
        }
      }
    }

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

    // Scheme-Regex. Reihenfolge: spezifischer vor generischer.
    // - lettered-dotted:  "Aufgabe A.1", "A.1"
    // - hierarchical:     "1.1", "Aufgabe 2.3"
    // - lettered-compact: "A1", "Aufgabe B2"  (Sub-Form "A1.1" wird separat geprüft und übersprungen)
    // - simple:           "Aufgabe 1", "1."
    type Scheme = 'simple' | 'lettered-dotted' | 'lettered-compact' | 'hierarchical';
    const LETTERED_DOTTED  = /^(Aufgabe\s+)?([A-Z])\.(\d+)([:\s]*)(.*)$/i;
    const HIERARCHICAL     = /^(Aufgabe\s+)?(\d+)\.(\d+)([:\s]*)(.*)$/i;
    const LETTERED_COMPACT_SUB = /^(?:Aufgabe\s+)?[A-Z]\d+\.\d+/i;
    const LETTERED_COMPACT = /^(Aufgabe\s+)?([A-Z])(\d+)([:\s]*)(.*)$/i;
    const SIMPLE           = /^(Aufgabe\s+)?(\d+)\.?([:\s]*)(.*)$/i;
    const GENERIC_TASK     = /^(Aufgabe|[A-Z]\d+|[A-Z]\.\d+|\d+\.)/i;

    const headers = Array.from(root.querySelectorAll('h3')) as HTMLElement[];
    const taskHeaders = headers.filter(el => {
      const t = el.innerText?.trim() || '';
      return GENERIC_TASK.test(t) || t.toLowerCase().startsWith('aufgabe');
    });
    if (taskHeaders.length === 0) {
      setNotification({ message: "Nummerierung wurde aktualisiert.", type: 'success' });
      return;
    }

    // Schema-Erkennung anhand der ersten erkannten Aufgabe.
    let scheme: Scheme = 'simple';
    for (const el of taskHeaders) {
      const t = el.innerText?.trim() || '';
      if (LETTERED_COMPACT_SUB.test(t)) continue; // Sub-Aufgaben zählen nicht für Erkennung
      if (LETTERED_DOTTED.test(t))  { scheme = 'lettered-dotted';  break; }
      if (HIERARCHICAL.test(t))     { scheme = 'hierarchical';     break; }
      if (LETTERED_COMPACT.test(t)) { scheme = 'lettered-compact'; break; }
      if (SIMPLE.test(t))           { scheme = 'simple';           break; }
    }

    // State je nach Schema
    let currentLetter = '';        // lettered-dotted, lettered-compact
    let currentSection = 0;        // hierarchical
    let currentSub = 0;            // hierarchical
    let counter = 0;               // simple, lettered-dotted, lettered-compact

    taskHeaders.forEach((el) => {
      const originalText = el.innerText?.trim() || '';

      if (scheme === 'lettered-compact' && LETTERED_COMPACT_SUB.test(originalText)) {
        // Unter-Aufgaben (A1.1) bleiben unverändert
        return;
      }

      if (scheme === 'lettered-dotted') {
        const m = originalText.match(LETTERED_DOTTED);
        if (!m) return;
        const prefix = m[1] || '';
        const letter = m[2].toUpperCase();
        const num = parseInt(m[3], 10);
        const sep = m[4] || (m[5] ? ': ' : '');
        const text = m[5] || '';
        if (letter !== currentLetter) { currentLetter = letter; counter = num; }
        else { counter++; }
        el.innerText = `${prefix}${currentLetter}.${counter}${sep}${text}`;
      } else if (scheme === 'hierarchical') {
        const m = originalText.match(HIERARCHICAL);
        if (!m) return;
        const prefix = m[1] || '';
        const section = parseInt(m[2], 10);
        const sub = parseInt(m[3], 10);
        const sep = m[4] || (m[5] ? ': ' : '');
        const text = m[5] || '';
        if (section !== currentSection) { currentSection = section; currentSub = sub; }
        else { currentSub++; }
        el.innerText = `${prefix}${currentSection}.${currentSub}${sep}${text}`;
      } else if (scheme === 'lettered-compact') {
        const m = originalText.match(LETTERED_COMPACT);
        if (!m) return;
        const prefix = m[1] || '';
        const letter = m[2].toUpperCase();
        const num = parseInt(m[3], 10);
        const sep = m[4] || (m[5] ? ': ' : '');
        const text = m[5] || '';
        if (letter !== currentLetter) { currentLetter = letter; counter = num; }
        else { counter++; }
        el.innerText = `${prefix}${currentLetter}${counter}${sep}${text}`;
      } else {
        // simple
        const m = originalText.match(SIMPLE);
        let prefix = 'Aufgabe ';
        let sep = ': ';
        let text = '';
        if (m) {
          prefix = m[1] || '';
          sep = m[3] || (m[4] ? ': ' : '');
          text = m[4] || '';
        } else {
          text = originalText.replace(/^Aufgabe[:\s]*/i, '').trim();
          sep = text ? ': ' : '';
        }
        counter++;
        el.innerText = `${prefix}${counter}${sep}${text}`;
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
      <div class="avoid-break relative mb-8 transition-all text-[12pt]">
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

${renderAudiencePromptBlock(targetAudience as AudienceLevel | '' | undefined)}

${renderDidacticPromptBlock(didacticApproach, didacticScope, didacticChapters)}

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
         htmlElement.className = 'avoid-break mb-8 transition-all';
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

    // Ensure position relative with stacking context and allow frame overflow
    block.style.position = 'relative';
    block.style.zIndex = '0';
    block.style.overflow = 'visible';
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

    // Clear stale inline styles from previous frame applications
    block.style.marginTop = '';
    // Remove konfetti's border:none so other frames get correct dimensions
    if (block.style.border === 'none') block.style.border = '';
    if (contentWrapper && contentWrapper.style.border === 'none') contentWrapper.style.border = '';

    if (frameId === 'none') {
      // Restore original block formatting
      block.style.position = '';
      block.style.zIndex = '';
      block.style.overflow = '';
      block.style.marginTop = '';

      // Unwrap content-wrapper: move all children back into the block
      if (contentWrapper) {
        while (contentWrapper.firstChild) {
          block.appendChild(contentWrapper.firstChild);
        }
        contentWrapper.remove();
      }

      saveHistoryState();
      setNotification({ message: `Rahmen entfernt`, type: 'success' });
      return;
    }

    // Apply padding FIRST so block dimensions are final before measuring
    if (frameId === 'abstract' && !block.classList.contains('p-6')) {
      contentWrapper.style.padding = '40px';
    } else if (frameId === 'floral' && !block.classList.contains('p-6')) {
      contentWrapper.style.padding = '42px 38px 52px 38px';
    } else if (frameId === 'vintage') {
      // Merkblatt-style blocks (p-6): tighter top so the heading sits closer to the frame.
      // Task blocks: symmetric extra side inset so text clears the vertical scrollwork.
      if (block.classList.contains('p-6')) {
        contentWrapper.style.padding = '20px 50px 50px 50px';
      } else {
        contentWrapper.style.padding = '50px 58px 50px 58px';
      }
    } else {
      contentWrapper.style.padding = FRAME_PADDING[frameId] || '32px';
    }

    // Force synchronous layout so the new padding is applied before we measure.
    // Without this, the first frame application reads stale (pre-padding) dimensions.
    void block.offsetHeight;
    const blockRect = block.getBoundingClientRect();
    const W = Math.round(blockRect.width);
    const H = Math.round(blockRect.height);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "frame-overlay");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.position = 'absolute';
    svg.style.inset = '0';
    svg.style.zIndex = '10';
    svg.style.pointerEvents = 'none';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.overflow = 'visible';

    let svgContent = '';

    // Note: vintage, floral & botanical frames use external SVG files (img elements) via cornerFrameConfig.
    // They are handled separately in the insertion code below.
    if (frameId === 'waves') {
      const h78 = Math.round(H * 0.78);
      const h85 = Math.round(H * 0.85);
      const h91 = Math.round(H * 0.91);
      svgContent = `
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.15"/>
            <stop offset="30%" stop-color="#38bdf8" stop-opacity="0.25"/>
            <stop offset="60%" stop-color="#0284c7" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.15"/>
          </linearGradient>
          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#0284c7" stop-opacity="0.2"/>
            <stop offset="40%" stop-color="#0ea5e9" stop-opacity="0.35"/>
            <stop offset="70%" stop-color="#38bdf8" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0.2"/>
          </linearGradient>
          <linearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25"/>
            <stop offset="50%" stop-color="#7dd3fc" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.25"/>
          </linearGradient>
        </defs>
        <path d="M0,${h78} C${W*0.1},${h78-25} ${W*0.2},${h78+8} ${W*0.3},${h78-15} C${W*0.4},${h78-35} ${W*0.5},${h78-5} ${W*0.6},${h78-20} C${W*0.7},${h78-35} ${W*0.8},${h78-10} ${W*0.9},${h78-30} C${W*0.95},${h78-38} ${W},${h78-22} ${W},${h78-22} L${W},${H} L0,${H} Z" fill="url(#waveGrad1)"/>
        <path d="M0,${h85} C${W*0.08},${h85-16} ${W*0.16},${h85+8} ${W*0.28},${h85-12} C${W*0.4},${h85-30} ${W*0.48},${h85-2} ${W*0.6},${h85-8} C${W*0.72},${h85-18} ${W*0.83},${h85+2} ${W*0.92},${h85-15} C${W*0.96},${h85-22} ${W},${h85-10} ${W},${h85-10} L${W},${H} L0,${H} Z" fill="url(#waveGrad2)"/>
        <path d="M0,${h91} C${W*0.12},${h91-15} ${W*0.22},${h91+8} ${W*0.35},${h91-8} C${W*0.48},${h91-20} ${W*0.56},${h91+5} ${W*0.68},${h91-5} C${W*0.8},${h91-15} ${W*0.88},${h91+5} ${W*0.95},${h91-8} C${W*0.98},${h91-12} ${W},${h91-3} ${W},${h91-3} L${W},${H} L0,${H} Z" fill="url(#waveGrad3)"/>
        <path d="M0,${h85} C${W*0.08},${h85-16} ${W*0.16},${h85+8} ${W*0.28},${h85-12} C${W*0.4},${h85-30} ${W*0.48},${h85-2} ${W*0.6},${h85-8} C${W*0.72},${h85-18} ${W*0.83},${h85+2} ${W*0.92},${h85-15} C${W*0.96},${h85-22} ${W},${h85-10} ${W},${h85-10}" fill="none" stroke="#bae6fd" stroke-width="1.5" opacity="0.4"/>
      `;
    }
    // Note: konfetti frame uses external SVG file via cornerFrameConfig (fullFrame mode).

    // Two-piece corner frames: botanical and abstract
    const cornerFrameConfig: Record<string, { top: string; bottom: string; topTransform: string; bottomTransform: string; width?: string; bottomWidth?: string; fullFrame?: boolean; fourCorners?: boolean; rose?: boolean; blossomsSrc?: string }> = {
      botanical: {
        top: '/frames/botanical-top.svg',
        bottom: '/frames/botanical-bottom.svg',
        topTransform: 'translate(-16.57%, -20.69%)',    // sharp edge at x=137, y=175 in 827×846
        bottomTransform: 'translate(14.83%, 20.09%)',   // sharp edge at x=712, y=553 in 836×692
      },
      abstract: {
        top: '/frames/abstract-top.svg',
        bottom: '/frames/abstract-bottom.svg',
        topTransform: 'none',                           // flush inside the block corner
        bottomTransform: 'none',
      },
      floral: {
        top: '/frames/floral-top.svg',
        bottom: '/frames/floral-bottom.svg',
        topTransform: 'translate(-24.4%, -23.4%)',
        bottomTransform: 'translate(22.4%, 22.4%)',
        width: '55%',
        bottomWidth: '45%',
      },
      welle: {
        top: '/frames/welle-top.svg',
        bottom: '/frames/welle-bottom.svg',
        topTransform: 'translate(-10.7%, -12.3%)',
        bottomTransform: 'translate(9.0%, 11.3%)',
        width: '65%',
        bottomWidth: '75%',
      },
      konfetti: {
        top: '/frames/konfetti.svg',
        bottom: '',
        topTransform: 'none',
        bottomTransform: 'none',
        fullFrame: true,
      },
      vintage: {
        top: '/frames/vintage-corner.svg',
        bottom: '',
        topTransform: 'none',
        bottomTransform: 'none',
        fourCorners: true,
      },
      rose: {
        top: '/frames/rose-top-left.svg',
        bottom: '/frames/rose-bottom-right.svg',
        topTransform: 'translate(-10%, -22%)',
        bottomTransform: 'translate(12%, 14%)',
        width: '55%',
        bottomWidth: '32%',
        rose: true,
        blossomsSrc: '/frames/rose-blossoms.svg',
      },
    };

    if (cornerFrameConfig[frameId]) {
      const cfg = cornerFrameConfig[frameId];
      const frameDiv = document.createElement('div');
      frameDiv.className = 'frame-overlay';
      frameDiv.style.position = 'absolute';
      frameDiv.style.inset = '0';
      frameDiv.style.zIndex = '-1';
      frameDiv.style.pointerEvents = 'none';
      frameDiv.style.overflow = 'visible';

      if (cfg.fullFrame) {
        // Single SVG covering the entire block (e.g. konfetti)
        const fullImg = document.createElement('img');
        fullImg.src = cfg.top;
        fullImg.style.position = 'absolute';
        fullImg.style.inset = '0';
        fullImg.style.width = '100%';
        fullImg.style.height = '100%';
        fullImg.style.objectFit = 'fill';
        fullImg.style.pointerEvents = 'none';
        // Soft feathered edges via CSS mask
        const fade = '18px';
        fullImg.style.maskImage = `linear-gradient(to right, transparent, black ${fade}, black calc(100% - ${fade}), transparent), linear-gradient(to bottom, transparent, black ${fade}, black calc(100% - ${fade}), transparent)`;
        fullImg.style.maskComposite = 'intersect';
        (fullImg.style as any).webkitMaskImage = fullImg.style.maskImage;
        (fullImg.style as any).webkitMaskComposite = 'source-in';
        frameDiv.appendChild(fullImg);
      }

      if (cfg.fourCorners) {
        // Four identical corner SVGs mirrored, plus CSS-drawn lines connecting them.
        // Clean corner SVG viewBox: 347 x 353. The SVG is a curl ornament with built-in
        // scrollwork "tongues" extending right (top edge) and down (left edge) but with
        // NO straight line segments — CSS draws all parallel lines (2 solid + 1 dotted).
        // Lines pass under the corners (z-index layering), visible only mid-edge.
        const svgW = 347;
        const svgH = 353;
        const cornerScale = 0.32; // 1 SVG unit ≈ 0.32 screen px → corner ≈ 111 × 113 px
        const cornerW = svgW * cornerScale;
        const cornerH = svgH * cornerScale;
        const lineColor = '#a79168'; // matches scrollwork gold

        // Line offsets in SVG units, placed within the scrollwork tongue area (y/x ≈ 20-65)
        // so the CSS lines visually continue the corner ornament's curls.
        const outerSolid = { pos: 22 * cornerScale, thick: 2.5 };
        const innerSolid = { pos: 38 * cornerScale, thick: 1.5 };
        const dotted     = { pos: 54 * cornerScale, thick: 2.5 };

        // Place 4 corner images, each at z-index 2 (above the lines).
        const corners: Array<{ top?: string; bottom?: string; left?: string; right?: string; transform: string }> = [
          { top: '0', left: '0', transform: 'none' },                // top-left
          { top: '0', right: '0', transform: 'scaleX(-1)' },          // top-right
          { bottom: '0', left: '0', transform: 'scaleY(-1)' },        // bottom-left
          { bottom: '0', right: '0', transform: 'scale(-1, -1)' },    // bottom-right
        ];
        corners.forEach(pos => {
          const cornerImg = document.createElement('img');
          cornerImg.src = cfg.top;
          cornerImg.style.position = 'absolute';
          if (pos.top !== undefined) cornerImg.style.top = pos.top;
          if (pos.bottom !== undefined) cornerImg.style.bottom = pos.bottom;
          if (pos.left !== undefined) cornerImg.style.left = pos.left;
          if (pos.right !== undefined) cornerImg.style.right = pos.right;
          cornerImg.style.width = `${cornerW}px`;
          cornerImg.style.height = `${cornerH}px`;
          cornerImg.style.transform = pos.transform;
          cornerImg.style.zIndex = '2';
          cornerImg.style.pointerEvents = 'none';
          frameDiv.appendChild(cornerImg);
        });

        // Gap (px) between where each corner ends and where the connecting line starts.
        // Lines stop short of the corners so the corners' transparent areas don't show
        // a stray line underneath the scrollwork.
        const cornerGap = 5;

        // Horizontal line: starts cornerGap px past the left corner, ends cornerGap px before the right corner.
        const addHLine = (yOffset: number, thickness: number, fromTop: boolean, isDotted: boolean) => {
          const line = document.createElement('div');
          line.style.position = 'absolute';
          if (fromTop) line.style.top = `${yOffset - thickness / 2}px`;
          else line.style.bottom = `${yOffset - thickness / 2}px`;
          line.style.left = `${cornerW + cornerGap}px`;
          line.style.right = `${cornerW + cornerGap}px`;
          line.style.height = `${thickness}px`;
          line.style.zIndex = '1';
          line.style.pointerEvents = 'none';
          if (isDotted) {
            const dotSize = thickness;
            const spacing = dotSize * 2.2;
            line.style.backgroundImage = `radial-gradient(circle, ${lineColor} 45%, transparent 46%)`;
            line.style.backgroundSize = `${spacing}px ${dotSize}px`;
            line.style.backgroundRepeat = 'repeat-x';
            line.style.backgroundPosition = 'center';
          } else {
            line.style.background = lineColor;
          }
          frameDiv.appendChild(line);
        };

        // Vertical line: starts cornerGap px below the top corner, ends cornerGap px above the bottom corner.
        const addVLine = (xOffset: number, thickness: number, fromLeft: boolean, isDotted: boolean) => {
          const line = document.createElement('div');
          line.style.position = 'absolute';
          if (fromLeft) line.style.left = `${xOffset - thickness / 2}px`;
          else line.style.right = `${xOffset - thickness / 2}px`;
          line.style.top = `${cornerH + cornerGap}px`;
          line.style.bottom = `${cornerH + cornerGap}px`;
          line.style.width = `${thickness}px`;
          line.style.zIndex = '1';
          line.style.pointerEvents = 'none';
          if (isDotted) {
            const dotSize = thickness;
            const spacing = dotSize * 2.2;
            line.style.backgroundImage = `radial-gradient(circle, ${lineColor} 45%, transparent 46%)`;
            line.style.backgroundSize = `${dotSize}px ${spacing}px`;
            line.style.backgroundRepeat = 'repeat-y';
            line.style.backgroundPosition = 'center';
          } else {
            line.style.background = lineColor;
          }
          frameDiv.appendChild(line);
        };

        // Top edge: 3 lines from top
        addHLine(outerSolid.pos, outerSolid.thick, true, false);
        addHLine(innerSolid.pos, innerSolid.thick, true, false);
        addHLine(dotted.pos,     dotted.thick,     true, true);
        // Bottom edge: 3 lines from bottom
        addHLine(outerSolid.pos, outerSolid.thick, false, false);
        addHLine(innerSolid.pos, innerSolid.thick, false, false);
        addHLine(dotted.pos,     dotted.thick,     false, true);
        // Left edge: 3 lines from left
        addVLine(outerSolid.pos, outerSolid.thick, true, false);
        addVLine(innerSolid.pos, innerSolid.thick, true, false);
        addVLine(dotted.pos,     dotted.thick,     true, true);
        // Right edge: 3 lines from right
        addVLine(outerSolid.pos, outerSolid.thick, false, false);
        addVLine(innerSolid.pos, innerSolid.thick, false, false);
        addVLine(dotted.pos,     dotted.thick,     false, true);
      }

      const topImg = document.createElement('img');
      topImg.src = cfg.top;
      topImg.style.position = 'absolute';
      topImg.style.top = '0';
      topImg.style.left = '0';
      topImg.style.width = cfg.width || '50%';
      topImg.style.height = 'auto';
      topImg.style.pointerEvents = 'none';
      topImg.style.transform = cfg.topTransform;
      // Rose: nudge top-left corner 8px left
      if (cfg.rose) topImg.style.left = '-8px';

      const bottomImg = document.createElement('img');
      bottomImg.src = cfg.bottom;
      bottomImg.style.position = 'absolute';
      bottomImg.style.bottom = '0';
      bottomImg.style.right = '0';
      bottomImg.style.width = cfg.bottomWidth || cfg.width || '50%';
      bottomImg.style.height = 'auto';
      bottomImg.style.pointerEvents = 'none';
      bottomImg.style.transform = cfg.bottomTransform;
      // Rose: nudge bottom-right corner 8px up
      if (cfg.rose) bottomImg.style.bottom = '8px';

      // Add flowing edge lines for welle frame
      if (frameId === 'welle') {
        const svgNS = 'http://www.w3.org/2000/svg';
        const bw = block.clientWidth;
        const bh = block.clientHeight;
        const edgeSvg = document.createElementNS(svgNS, 'svg');
        edgeSvg.setAttribute('viewBox', `-15 -15 ${bw + 30} ${bh + 30}`);
        edgeSvg.setAttribute('overflow', 'visible');
        edgeSvg.style.position = 'absolute';
        edgeSvg.style.top = '-15px';
        edgeSvg.style.left = '-15px';
        edgeSvg.style.width = 'calc(100% + 30px)';
        edgeSvg.style.height = 'calc(100% + 30px)';
        edgeSvg.style.pointerEvents = 'none';

        const wavePath = (x1: number, y1: number, x2: number, y2: number, amp: number, segs: number, phase: number) => {
          const dx = x2 - x1, dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = -dy / len, ny = dx / len;
          let d = `M${x1.toFixed(1)},${y1.toFixed(1)}`;
          for (let i = 0; i < segs; i++) {
            const a = amp * Math.sin(Math.PI * (phase + i * 0.8));
            const mx = x1 + dx * (i + 0.5) / segs + nx * a;
            const my = y1 + dy * (i + 0.5) / segs + ny * a;
            const ex = x1 + dx * (i + 1) / segs;
            const ey = y1 + dy * (i + 1) / segs;
            d += ` Q${mx.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
          }
          return d;
        };

        const edgeLines = [
          { color: '#DAEEF8', w: 5, op: 0.6, amp: 12, phase: 0 },
          { color: '#B9DDF0', w: 3.5, op: 0.7, amp: 9, phase: 1.3 },
          { color: '#8EC6E6', w: 2.5, op: 0.55, amp: 7, phase: 2.6 },
          { color: '#73B6DE', w: 2, op: 0.65, amp: 5, phase: 0.8 },
        ];

        const edges = [
          [0, 0, bw, 0],     // top
          [bw, 0, bw, bh],   // right
          [bw, bh, 0, bh],   // bottom
          [0, bh, 0, 0],     // left
        ];

        edgeLines.forEach((line) => {
          edges.forEach(([x1, y1, x2, y2]) => {
            const len = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
            const segs = Math.max(5, Math.round(len / 45));
            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', wavePath(x1, y1, x2, y2, line.amp, segs, line.phase));
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', line.color);
            path.setAttribute('stroke-width', String(line.w));
            path.setAttribute('opacity', String(line.op));
            path.setAttribute('stroke-linecap', 'round');
            edgeSvg.appendChild(path);
          });
        });

        frameDiv.appendChild(edgeSvg);
      }

      // Add scattered leaf decorations along edges for floral frame
      if (frameId === 'floral') {
        const svgNS = 'http://www.w3.org/2000/svg';
        const bw = block.clientWidth;
        const bh = block.clientHeight;
        const leafSvg = document.createElementNS(svgNS, 'svg');
        leafSvg.setAttribute('viewBox', `0 0 ${bw} ${bh}`);
        leafSvg.setAttribute('overflow', 'visible');
        leafSvg.style.position = 'absolute';
        leafSvg.style.top = '0';
        leafSvg.style.left = '0';
        leafSvg.style.width = '100%';
        leafSvg.style.height = '100%';
        leafSvg.style.pointerEvents = 'none';

        const leafColors = ['#566678', '#5c6e83', '#6f7e8c', '#748396', '#46576c'];
        // Leaf shape: pointed oval with a center vein
        const makeLeaf = (size: number, color: string, opacity: number, tx: number, ty: number, rot: number) => {
          const g = document.createElementNS(svgNS, 'g');
          g.setAttribute('transform', `translate(${tx.toFixed(1)},${ty.toFixed(1)}) rotate(${rot.toFixed(0)})`);
          g.setAttribute('opacity', String(opacity.toFixed(2)));
          // Leaf body
          const body = document.createElementNS(svgNS, 'path');
          body.setAttribute('d', `M0,0 C${size * 0.25},${-size * 0.5} ${size * 0.75},${-size * 0.5} ${size},0 C${size * 0.75},${size * 0.15} ${size * 0.25},${size * 0.15} 0,0 Z`);
          body.setAttribute('fill', color);
          g.appendChild(body);
          // Center vein
          const vein = document.createElementNS(svgNS, 'line');
          vein.setAttribute('x1', String(size * 0.1));
          vein.setAttribute('y1', '0');
          vein.setAttribute('x2', String(size * 0.9));
          vein.setAttribute('y2', '0');
          vein.setAttribute('stroke', '#3a4a5c');
          vein.setAttribute('stroke-width', '0.5');
          vein.setAttribute('opacity', '0.4');
          g.appendChild(vein);
          return g;
        };

        // Seeded pseudo-random for consistent placement
        const seeded = (i: number) => ((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;

        // Manually place leaf clusters matching the reference layout
        // Each entry: position on edge (0-1), edge index, and slight variation seed
        // Edges: 0=left (top→bottom), 1=top (left→right), 2=right (top→bottom), 3=bottom (left→right)
        // flowAngle: left=90 (down), top=0 (right), right=90 (down), bottom=0 (right)
        // perpOverride: force perpendicular offset (0 = on line, negative = outside block)
        // rotOverride: force main leaf rotation angle
        const leafPositions: Array<{ edge: number; t: number; perpOverride?: number; rotOverride?: number }> = [
          // LEFT edge — dense, ~6 clusters flowing downward
          { edge: 0, t: 0.12 },
          { edge: 0, t: 0.24 },
          { edge: 0, t: 0.37 },
          { edge: 0, t: 0.52 },
          { edge: 0, t: 0.68 },   // #2: shifted 20px down (was 0.65)
          { edge: 0, t: 0.882 },  // shifted 25px further down from visual position
          // TOP edge — 3 clusters flowing rightward
          { edge: 1, t: 0.38 },
          { edge: 1, t: 0.55, rotOverride: 0, perpOverride: 0 },  // #1: middle leaf → point RIGHT, touch line
          { edge: 1, t: 0.814, perpOverride: 0 },  // shifted 30px right, touch line
          // RIGHT edge — 3-4 clusters flowing downward
          { edge: 2, t: 0.19, perpOverride: 0 },   // #4: shifted 20px up (was 0.22), touch line
          { edge: 2, t: 0.42 },
          { edge: 2, t: 0.62 },
          { edge: 2, t: 0.78 },
          // BOTTOM edge — dense, ~5 clusters flowing rightward
          { edge: 3, t: 0.15, perpOverride: 0 },    // #3: shifted 20px left (was 0.18), touch line
          { edge: 3, t: 0.32, perpOverride: 0 },    // #3: touch line
          { edge: 3, t: 0.48, perpOverride: 0 },    // #3: touch line
          { edge: 3, t: 0.62 },
          { edge: 3, t: 0.78 },
        ];

        const edgeCoords = [
          { x1: 0, y1: 0, x2: 0, y2: bh, flowAngle: 90 },      // left: top→bottom, tips DOWN
          { x1: 0, y1: 0, x2: bw, y2: 0, flowAngle: 0 },        // top: left→right, tips RIGHT
          { x1: bw, y1: 0, x2: bw, y2: bh, flowAngle: 90 },     // right: top→bottom, tips DOWN
          { x1: 0, y1: bh, x2: bw, y2: bh, flowAngle: 0 },      // bottom: left→right, tips RIGHT
        ];

        leafPositions.forEach((pos, idx) => {
          const ec = edgeCoords[pos.edge];
          const dx = ec.x2 - ec.x1;
          const dy = ec.y2 - ec.y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = -dy / len; // outward normal (points INTO block)
          const ny = dx / len;

          // Position on the edge with MORE jitter for irregular spacing
          const cx = ec.x1 + dx * pos.t;
          const cy = ec.y1 + dy * pos.t;
          const jitterAlong = (seeded(idx * 11 + 1) - 0.5) * 30;
          // Perpendicular: use override if set, otherwise random
          const perpOffset = pos.perpOverride !== undefined ? pos.perpOverride : (seeded(idx * 11 + 12) - 0.5) * 18;
          const px = cx + (dx / len) * jitterAlong + nx * perpOffset;
          const py = cy + (dy / len) * jitterAlong + ny * perpOffset;

          // Main leaf — 13-21px
          const size = 13 + seeded(idx * 11 + 2) * 8;
          const color = leafColors[Math.floor(seeded(idx * 11 + 3) * leafColors.length)];
          const opacity = 0.55 + seeded(idx * 11 + 4) * 0.25;
          // Rotation: use override if set, otherwise random with irregularity
          let rot: number;
          if (pos.rotOverride !== undefined) {
            rot = pos.rotOverride;
          } else {
            const rotBase = ec.flowAngle + (seeded(idx * 11 + 5) - 0.5) * 120;
            const flipOutward = seeded(idx * 11 + 13) > 0.65;
            rot = flipOutward ? rotBase + 180 : rotBase;
          }
          leafSvg.appendChild(makeLeaf(size, color, opacity, px, py, rot));

          // Companion leaf — slightly splayed, also irregular
          const size2 = size * (0.5 + seeded(idx * 11 + 6) * 0.25);
          const rot2 = rot + 20 + seeded(idx * 11 + 7) * 50; // 20-70° offset, more varied
          const spreadDist = size * (0.15 + seeded(idx * 11 + 14) * 0.2); // varied spread
          const spreadAngle = (rot - 30 + seeded(idx * 11 + 15) * 60) * Math.PI / 180;
          const lx2 = px + Math.cos(spreadAngle) * spreadDist;
          const ly2 = py + Math.sin(spreadAngle) * spreadDist;
          const color2 = leafColors[Math.floor(seeded(idx * 11 + 8) * leafColors.length)];
          leafSvg.appendChild(makeLeaf(size2, color2, opacity * 0.85, lx2, ly2, rot2));

          // Optional third tiny leaf for some clusters
          if (seeded(idx * 11 + 9) > 0.5) {
            const size3 = size * 0.4;
            const rot3 = rot - 25 - seeded(idx * 11 + 10) * 40; // more variation
            const lx3 = px - Math.cos((rot + 20) * Math.PI / 180) * spreadDist * 0.8;
            const ly3 = py - Math.sin((rot + 20) * Math.PI / 180) * spreadDist * 0.8;
            const color3 = leafColors[Math.floor(seeded(idx * 11 + 11) * leafColors.length)];
            leafSvg.appendChild(makeLeaf(size3, color3, opacity * 0.7, lx3, ly3, rot3));
          }
        });

        frameDiv.appendChild(leafSvg);
      }

      // Rose frame: inner border lines that CONTINUE the stems already drawn inside the corner SVGs.
      // Stem exit positions provided by the user (visually verified):
      //   - TL right  edge: y ≈ 22.5% of TL height → top CSS line
      //   - TL bottom edge: x ≈ 12.5% of TL width  → left CSS line
      //   - BR top    edge: x ≈ 87% of BR width    → right CSS line
      //   - BR left   edge: y ≈ 89.5% of BR height → bottom CSS line
      if (cfg.rose) {
        const lineColor = '#b59d84'; // tan/brown matching the rose stems
        const lineThick = 1.5;
        const blockW = block.clientWidth;
        const blockH = block.clientHeight;

        // TL image geometry (width 55%, translate(-10%, -22%), left=-8px)
        const tlImgW = 0.55 * blockW;
        const tlImgH = tlImgW * (647 / 1093); // SVG aspect ratio
        const tlLeft = -8 - 0.10 * tlImgW;
        const tlTop  = 0 - 0.22 * tlImgH;

        // BR image geometry (width 32%, translate(12%, 14%), bottom=8px → shifted 8px up)
        const brImgW = 0.32 * blockW;
        const brImgH = brImgW * (1372 / 1062);
        const brRight  = blockW + 0.12 * brImgW;
        const brBottom = blockH - 8 + 0.14 * brImgH;
        const brLeft = brRight  - brImgW;
        const brTop  = brBottom - brImgH;

        // Stem exit positions (user-marked, visually verified)
        // Lines extend under each SVG to avoid gaps
        const tlOverlap = 25; // TL needs more overlap
        const brOverlap = 10;
        const tlRightStemY  = tlTop  + 0.225 * tlImgH;
        const tlRightStemX  = tlLeft + 1.000 * tlImgW - tlOverlap; // extend under TL svg
        const tlBottomStemX = tlLeft + 0.125 * tlImgW;
        const tlBottomStemY = tlTop  + 1.000 * tlImgH - tlOverlap; // extend under TL svg
        const brTopStemX    = brLeft + 0.870 * brImgW;
        const brTopStemY    = brTop  + 0.000 * brImgH + brOverlap; // extend under BR svg
        const brLeftStemY   = brTop  + 0.895 * brImgH;
        const brLeftStemX   = brLeft + 0.000 * brImgW + brOverlap; // extend under BR svg

        // 4 lines forming a quadrilateral whose corners are at the intersections
        // of the stem lines (TL contributes top-Y and left-X; BR contributes bottom-Y and right-X).
        const innerLeft   = tlBottomStemX;
        const innerRight  = brTopStemX;
        const innerTop    = tlRightStemY;
        const innerBottom = brLeftStemY;

        const mkLine = (top: number, left: number, w: number, h: number, radius?: string) => {
          const d = document.createElement('div');
          d.style.cssText = `position:absolute;top:${top}px;left:${left}px;width:${w}px;height:${h}px;background:${lineColor};pointer-events:none;z-index:1${radius ? `;border-radius:${radius}` : ''}`;
          frameDiv.appendChild(d);
        };

        const topLineThick = 3;
        const sideLineThick = 2;
        const cornerR = 12;

        // TOP horizontal: from TL svg → to top-right corner (rounded)
        mkLine(innerTop - topLineThick / 2, tlRightStemX, innerRight - tlRightStemX, topLineThick, `0 ${cornerR}px 0 0`);
        // LEFT vertical: from TL svg → to bottom-left corner (rounded)
        mkLine(tlBottomStemY, innerLeft - sideLineThick / 2, sideLineThick, innerBottom - tlBottomStemY, `0 0 0 ${cornerR}px`);
        // BOTTOM horizontal: from bottom-left corner (rounded) → to BR svg
        mkLine(innerBottom - lineThick / 2, innerLeft, brLeftStemX - innerLeft, lineThick, `0 0 0 ${cornerR}px`);
        // RIGHT vertical: from top-right corner (rounded) → to BR svg
        mkLine(innerTop, innerRight - sideLineThick / 2, sideLineThick, brTopStemY - innerTop, `0 ${cornerR}px 0 0`);

        // Scattered blossoms at user-specified coordinates (x%, y%, rotation)
        const blossomCoords: Array<{ x: number; y: number; rot: number; size: number }> = [
          // LEFT edge — tip pointing down
          { x: 0, y: 25, rot: 180, size: 32 },
          { x: 1, y: 40, rot: 180, size: 24 },
          { x: -1, y: 80, rot: 180, size: 24 },
          // BOTTOM edge — tip pointing left
          { x: 60, y: 100, rot: -90, size: 26 },
          { x: 40, y: 99, rot: -90, size: 24 },
          { x: 30, y: 100, rot: -90, size: 22 },
          // TOP edge — tip pointing right
          { x: 55, y: 0, rot: 90, size: 24 },
          { x: 70, y: 0.5, rot: 90, size: 26 },
          // RIGHT edge — tip pointing up
          { x: 100, y: 70, rot: 0, size: 20 },
          { x: 101, y: 55, rot: 0, size: 24 },
          { x: 99, y: 30, rot: 0, size: 26 },
        ];

        // Each blossom SVG has a different natural tip direction; baseRot normalises tip to "up"
        const singleBlossoms = [
          { src: '/frames/rose-blossom-1.svg', baseRot: 90 },
          { src: '/frames/rose-blossom-2.svg', baseRot: 45 },
          { src: '/frames/rose-blossom-3.svg', baseRot: 0 },
        ];
        blossomCoords.forEach((p, idx) => {
          const b = singleBlossoms[idx % singleBlossoms.length];
          const img = document.createElement('img');
          img.src = b.src;
          img.style.position = 'absolute';
          img.style.width = `${p.size}px`;
          img.style.height = 'auto';
          img.style.pointerEvents = 'none';
          img.style.zIndex = '4';
          img.style.left = `${p.x}%`;
          img.style.top = `${p.y}%`;
          img.style.transform = `translate(-50%, -50%) rotate(${p.rot + b.baseRot}deg)`;
          frameDiv.appendChild(img);
        });
      }

      if (!cfg.fullFrame && !cfg.fourCorners) {
        // Rose corners sit above the inner border line
        if (cfg.rose) {
          topImg.style.zIndex = '3';
          bottomImg.style.zIndex = '3';
        }
        frameDiv.appendChild(topImg);
        frameDiv.appendChild(bottomImg);
      }
      block.insertBefore(frameDiv, block.firstChild);
    } else {
      svg.innerHTML = svgContent;
      block.insertBefore(svg, block.firstChild);
    }

    // For full-frame / four-corner / rose designs, hide the block/content-wrapper border
    // so only the frame's own lines are visible
    if (cornerFrameConfig[frameId]?.fullFrame || cornerFrameConfig[frameId]?.fourCorners || cornerFrameConfig[frameId]?.rose) {
      contentWrapper.style.border = 'none';
      block.style.border = 'none';
    }

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

    // Clear inline styles that would override Tailwind classes
    block.style.removeProperty('background-color');
    block.style.removeProperty('border-color');
    block.style.removeProperty('border-style');
    block.style.removeProperty('border-width');

    // Remove border classes from main block — borders are managed by the Rahmen feature
    const blockClasses = Array.from(block.classList);
    blockClasses.forEach(c => {
      if (c === 'border' || c === 'border-2' || c === 'border-4' ||
          themedColors.some(tc => c.startsWith(`border-${tc}-`)) ||
          c.startsWith('border-gray-') || c.startsWith('border-white')) {
        block.classList.remove(c);
      }
    });

    if (colorName) {
      // 3. Update all nested elements (excluding the main block)
      const nestedElements = Array.from(block.querySelectorAll('*'));

      nestedElements.forEach(el => {
        const element = el as HTMLElement;
        if (!element.classList || element.classList.length === 0) return;

        // Clear inline color styles so Tailwind classes take effect
        element.style.removeProperty('background-color');
        element.style.removeProperty('border-color');
        element.style.removeProperty('color');

        const currentClasses = Array.from(element.classList);

        // Replace themed classes (text, border, bg) on nested elements
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
                } else {
                  let newWeight = weight;
                  if (prefix === 'border') newWeight = '500';
                  if (prefix === 'text') {
                    const nw = parseInt(weight);
                    newWeight = isNaN(nw) ? '700' : (nw < 600 ? '700' : weight);
                  }
                  if (prefix === 'bg') newWeight = '50';

                  element.classList.add(`${prefix}-${colorName}-${newWeight}`);
                }
              }
            }
          }
        });

        // 4. Handle structural borders and white boxes
        const isWhiteBox = element.classList.contains('bg-white') || element.classList.contains('bg-gray-50');
        const hasAnyBorder = currentClasses.some(c => c === 'border' || (c.startsWith('border-') && !c.startsWith('border-opacity')));

        if (isWhiteBox || hasAnyBorder) {
          if (colorName !== 'white' && colorName !== 'gray') {
            const hasThemedBorder = Array.from(element.classList).some(c => themedColors.some(tc => c.startsWith(`border-${tc}-`)));
            if (!hasThemedBorder) {
              element.classList.add(`border-${colorName}-500`);
            }
          } else if (isWhiteBox) {
            element.classList.add('border-gray-300');
          }
        }
      });
    }

    // Apply the new background class after the loop so it doesn't get removed
    if (colorClass !== 'bg-white') {
      block.classList.add(colorClass);
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

  const coverTargetRef = useRef<{ target: HTMLElement; mode: 'replace' | 'prepend' } | null>(null);

  const resolveCoverTarget = (): { target: HTMLElement; mode: 'replace' | 'prepend' } | { error: string } => {
    const root = document.getElementById('dossier-root');
    if (!root) return { error: 'Editor ist nicht bereit.' };

    const firstPage = Array.from(root.children).find(c => !c.classList.contains('page-break')) as HTMLElement | undefined;

    let target: HTMLElement | null = null;
    if (activeBlock && activeBlock.parentElement === root && !activeBlock.classList.contains('page-break')) {
      target = activeBlock;
    }
    if (!target) target = firstPage || null;
    if (!target) return { error: 'Keine Seite im Dossier gefunden.' };

    const isFirst = target === firstPage;
    const isCover = target.classList.contains('cover-page-wrapper')
      || target.hasAttribute('data-cover')
      || target.classList.contains('title-page-placeholder');
    const isEmpty = target.children.length === 0;

    if (!isFirst && !isEmpty && !isCover) {
      return { error: 'Cover-Design geht nur auf der ersten Seite oder einer leeren Seite. Wähle eine leere Seite aus oder hebe die Auswahl auf.' };
    }

    return { target, mode: (isCover || isEmpty) ? 'replace' : 'prepend' };
  };

  const openCoverModal = () => {
    const res = resolveCoverTarget();
    if ('error' in res) {
      setNotification({ message: res.error, type: 'error' });
      return;
    }
    coverTargetRef.current = res;
    setShowCoverModal(true);
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
  <div class="cover-page-container avoid-break relative w-full h-[29.7cm] p-[2cm] box-border bg-white print:bg-white overflow-hidden">
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

        const targetInfo = coverTargetRef.current;
        if (targetInfo && root.contains(targetInfo.target)) {
          if (targetInfo.mode === 'replace') {
            targetInfo.target.replaceWith(frag);
          } else {
            root.insertBefore(frag, targetInfo.target);
          }
        } else {
          // Fallback: legacy behavior — wipe existing covers, prepend
          root.querySelectorAll('.cover-page-wrapper, [data-cover="true"], .title-page-placeholder').forEach(wrapper => {
            const nx = wrapper.nextElementSibling;
            if (nx && nx.classList.contains('page-break')) nx.remove();
            wrapper.remove();
          });
          root.querySelectorAll('.cover-page-container').forEach(c => {
            const nx = c.nextElementSibling;
            if (nx && nx.classList.contains('page-break')) nx.remove();
            c.remove();
          });
          root.querySelectorAll('.cover-image').forEach(el => el.remove());
          root.insertBefore(frag, root.firstChild);
        }

        coverTargetRef.current = null;

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

  // --- KI-Bild-Bearbeitung (Steckbrief etc.): 3 Aktionen ---

  const closeAiImageModal = () => {
    setShowAiImageModal(false);
    setAiImageSlot(null);
    setAiImagePromptDraft('');
    setIsRegeneratingAiImage(false);
    setAiImageError('');
  };

  // Ersetzt den Inhalt des Slots durch ein neues Element und behält dabei die
  // .ai-image-slot-Klasse + das data-ai-prompt-Attribut, damit Doppelklick
  // weiter funktioniert, auch nach Wechsel zwischen Bild / Zeichnung.
  const replaceSlotContent = (slot: HTMLElement, newChild: HTMLElement, prompt: string) => {
    while (slot.firstChild) slot.removeChild(slot.firstChild);
    slot.appendChild(newChild);
    slot.setAttribute('data-ai-prompt', prompt);
    slot.setAttribute('title', 'Doppelklick zum Bearbeiten');
    slot.classList.add('ai-image-slot');
  };

  const handleAiImageRegenerate = async () => {
    if (!aiImageSlot) return;
    const newPrompt = aiImagePromptDraft.trim();
    if (!newPrompt) {
      setAiImageError('Bitte gib einen Prompt an.');
      return;
    }
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setAiImageError('Gemini-API-Key fehlt in der Umgebung.');
      return;
    }

    setIsRegeneratingAiImage(true);
    setAiImageError('');
    onAddSnapshot('Vor Bild-Regenerierung');
    const slot = aiImageSlot;
    slot.style.opacity = '0.4';
    slot.classList.add('animate-pulse');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const fullPrompt = `${newPrompt}. Style: clean educational illustration suitable for a school handout, clear shapes, neutral background, friendly and age-appropriate, no text or labels in the image.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: fullPrompt,
      });

      let newImageUrl = '';
      const parts = (response as any)?.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part?.inlineData?.data) {
          newImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!newImageUrl) {
        throw new Error('Keine Bilddaten in der Antwort (evtl. Safety-Filter).');
      }

      const doc = slot.ownerDocument || document;
      const img = doc.createElement('img');
      img.setAttribute('src', newImageUrl);
      img.setAttribute('alt', newPrompt);
      // Bild füllt den Slot komplett; Slot ist resize-bar, Bild skaliert mit.
      img.className = 'block w-full h-full object-contain';
      replaceSlotContent(slot, img, newPrompt);

      slot.style.opacity = '1';
      slot.classList.remove('animate-pulse');
      saveHistoryState();
      closeAiImageModal();
      setNotification({ message: 'Bild neu generiert.', type: 'success' });
    } catch (err: any) {
      slot.style.opacity = '1';
      slot.classList.remove('animate-pulse');
      const msg = err?.message || String(err);
      const friendly = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')
        ? 'API-Kontingent erschöpft. Bitte später erneut versuchen.'
        : `Fehler: ${msg}`;
      setAiImageError(friendly);
      setIsRegeneratingAiImage(false);
    }
  };

  const handleAiImageUpload = (file: File) => {
    if (!aiImageSlot || !file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      onAddSnapshot('Vor eigenes Bild einfügen');
      const doc = aiImageSlot.ownerDocument || document;
      const img = doc.createElement('img');
      img.setAttribute('src', dataUrl);
      img.setAttribute('alt', file.name);
      img.className = 'block w-full h-full object-contain';
      // Prompt beibehalten (falls vorhanden), damit "Neu generieren" weiterhin
      // einen sinnvollen Startwert hat.
      const existingPrompt = aiImageSlot.getAttribute('data-ai-prompt') || '';
      replaceSlotContent(aiImageSlot, img, existingPrompt);
      saveHistoryState();
      closeAiImageModal();
      setNotification({ message: 'Eigenes Bild eingefügt.', type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  /**
   * Verschiebt den Bild-Slot relativ zu seinen Geschwister-Elementen. Nutzt
   * Float-Layout (statt Flex), damit Schreiblinien-Felder unterhalb des Bildes
   * die volle Breite nutzen, sobald das Bild sie nicht mehr "besetzt":
   *   - left/right: Slot float-left/right, Felder fließen daneben und wrappen
   *     darunter auf volle Breite.
   *   - top/bottom: Slot block, mittig begrenzt; Felder darüber/darunter full.
   *
   * Der Container muss overflow-hidden (oder display: flow-root) haben, damit
   * er die Float-Höhe einbezieht. Alte Flex-Klassen werden entfernt.
   */
  const handleAiImageReposition = (position: 'top' | 'bottom' | 'left' | 'right') => {
    if (!aiImageSlot) return;
    const container = aiImageSlot.parentElement;
    if (!container) return;

    onAddSnapshot(`Vor Bild-Reposition (${position})`);

    // Container: Flex-Layout-Reste entfernen, Float-BFC sicherstellen.
    const containerClassesToRemove = [
      'flex',
      'flex-col', 'flex-col-reverse', 'flex-row', 'flex-row-reverse',
      'items-center', 'items-start', 'items-end', 'items-stretch',
      'justify-center', 'justify-start', 'justify-end', 'justify-between',
      'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-5', 'gap-6', 'gap-8',
    ];
    containerClassesToRemove.forEach((c) => container.classList.remove(c));
    container.classList.add('overflow-hidden');

    // Slot: alle Positions-/Breiten-/Float-Klassen resetten.
    const slotClassesToRemove = [
      'float-left', 'float-right',
      'w-1/4', 'w-1/3', 'w-1/2', 'w-2/3', 'w-3/4', 'w-full',
      'max-w-sm', 'max-w-xs', 'max-w-md',
      'mx-auto', 'mr-6', 'ml-6', 'mt-4', 'mb-4',
      'self-center', 'self-start', 'self-end',
      'block',
      'ai-slot-centered',
    ];
    slotClassesToRemove.forEach((c) => aiImageSlot.classList.remove(c));

    // Geschwister-Elemente von Flex-Layout-Resten befreien (falls alter Steckbrief
    // mit inner-wrapper – dort lag die w-2/3-Spalte). Sie fließen jetzt frei.
    const siblings = Array.from(container.children).filter(
      (c) => c !== aiImageSlot,
    ) as HTMLElement[];
    const siblingClassesToRemove = [
      'w-1/3', 'w-1/2', 'w-2/3', 'w-full',
      'flex', 'flex-col', 'flex-row',
      'justify-center', 'justify-start', 'justify-end',
    ];
    siblings.forEach((s) =>
      siblingClassesToRemove.forEach((c) => s.classList.remove(c)),
    );

    // Inline-margin zurücksetzen (falls von vorigem Reposition übrig).
    aiImageSlot.style.marginLeft = '';
    aiImageSlot.style.marginRight = '';

    switch (position) {
      case 'top':
        // Slot ans DOM-Anfang → erscheint oben, Felder darunter.
        // ai-slot-centered (CSS mit !important) erzwingt display:block +
        // margin:auto, weil Tailwind-Utilities das bei flex-Containern sonst
        // nicht zuverlässig hinkriegen.
        if (container.firstChild !== aiImageSlot) {
          container.insertBefore(aiImageSlot, container.firstChild);
        }
        aiImageSlot.classList.add('ai-slot-centered', 'mb-4');
        break;
      case 'bottom':
        // Slot ans DOM-Ende → erscheint unten, Felder darüber.
        container.appendChild(aiImageSlot);
        aiImageSlot.classList.add('ai-slot-centered', 'mt-4');
        break;
      case 'left':
        // Slot als erstes Kind mit float-left → Felder fließen rechts daneben
        // und wrappen unter dem Bild auf volle Breite.
        if (container.firstChild !== aiImageSlot) {
          container.insertBefore(aiImageSlot, container.firstChild);
        }
        aiImageSlot.classList.add('float-left', 'w-1/3', 'mb-4');
        // Inline-margin garantiert ≥ 1.5rem Abstand zum Text, auch wenn
        // Tailwind-Utilities oder Resize-Width das überschreiben könnten.
        aiImageSlot.style.marginRight = '1.5rem';
        break;
      case 'right':
        if (container.firstChild !== aiImageSlot) {
          container.insertBefore(aiImageSlot, container.firstChild);
        }
        aiImageSlot.classList.add('float-right', 'w-1/3', 'mb-4');
        aiImageSlot.style.marginLeft = '1.5rem';
        break;
    }

    saveHistoryState();
    closeAiImageModal();
    const labelMap: Record<typeof position, string> = {
      top: 'nach oben verschoben',
      bottom: 'nach unten verschoben',
      left: 'nach links verschoben',
      right: 'nach rechts verschoben',
    };
    setNotification({ message: `Bild ${labelMap[position]}.`, type: 'success' });
  };

  const handleAiImagePlaceholder = () => {
    if (!aiImageSlot) return;
    onAddSnapshot('Vor Zeichnungs-Platzhalter');

    const doc = aiImageSlot.ownerDocument || document;

    // Falls der Slot noch keine explizite Höhe hat (nur min-height aus Template):
    // aktuelle Darstellungs-Höhe als inline-style setzen, damit der Rahmen sofort
    // genauso groß ist wie das vorherige Bild UND per resize-Handle veränderbar.
    const rect = aiImageSlot.getBoundingClientRect();
    if (!aiImageSlot.style.height && rect.height > 0) {
      aiImageSlot.style.height = `${Math.round(rect.height)}px`;
    }

    // Innerer Rahmen ohne Text, füllt den Slot komplett (resize am Slot greift).
    const frame = doc.createElement('div');
    frame.className = 'w-full h-full rounded-lg border-2 border-dashed border-gray-400 bg-white';
    frame.setAttribute('data-drawing-placeholder', 'true');

    // Prompt des Slots beibehalten, damit User später wieder auf "Neu generieren"
    // wechseln kann und der alte Prompt noch da ist.
    const existingPrompt = aiImageSlot.getAttribute('data-ai-prompt') || '';
    replaceSlotContent(aiImageSlot, frame, existingPrompt);

    saveHistoryState();
    closeAiImageModal();
    setNotification({ message: 'Platzhalter für Zeichnung eingefügt.', type: 'success' });
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

    // Handle "+ Zeile" button in numbered label list (Bildbeschriftung template)
    const addLabelBtn = target.closest('.add-label-line') as HTMLElement | null;
    if (addLabelBtn) {
      e.preventDefault();
      const list = addLabelBtn.closest('.numbered-label-list') as HTMLElement | null;
      if (list) {
        const rows = list.querySelectorAll('.numbered-label-row');
        const nextNum = rows.length + 1;
        const row = document.createElement('p');
        row.className = 'numbered-label-row flex items-end gap-2 editable';
        row.setAttribute('contenteditable', 'true');
        row.innerHTML = `<span class="numbered-label-index font-bold text-gray-500">${nextNum}.</span> <span class="schreib-linie inline-block min-w-[9rem]"><span class="is-answer"></span></span>`;
        list.insertBefore(row, addLabelBtn);
        saveHistoryState();
      }
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

      if (activeBlock !== block) {
        setActiveBlock(block);
      }

      document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
      block.classList.add('active-block-highlight');

      if (!isEditable) {
        root?.focus({ preventScroll: true });
      }
    } else if (target.getAttribute('id') === 'dossier-root' && root) {
      // Click on the root background (left/right of pages) → deselect
      document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
      setActiveBlock(null);
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

    // Doppelklick auf KI-Bild-Slot (z.B. im Steckbrief) → 3-Options-Modal.
    // Slot enthält entweder ein <img> oder einen Zeichnungs-Rahmen; egal was.
    const slot = target.closest('.ai-image-slot') as HTMLElement | null;
    if (slot) {
      e.preventDefault();
      const prompt = slot.getAttribute('data-ai-prompt') || '';
      setAiImageSlot(slot);
      setAiImagePromptDraft(prompt);
      setAiImageError('');
      setShowAiImageModal(true);
      return;
    }

    const root = document.getElementById('dossier-root');
    if (!root) return;

    // Use findBlockForElement to get the correct exercise block (not the page container)
    const block = findBlockForElement(target);

    if (block && block !== root) {
      const isEditable = target.classList.contains('editable') || target.closest('.editable') || target.contentEditable === 'true';

      if (!isEditable) {
        e.preventDefault();
        // Clear text selection to make it clear the block is selected
        window.getSelection()?.removeAllRanges();

        document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
        block.classList.add('active-block-highlight');
        setActiveBlock(block);

        // Focus root to receive key events
        root.focus({ preventScroll: true });
      } else {
        const currentBlock = findBlockForElement(target);
        if (currentBlock) {
          document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
          currentBlock.classList.add('active-block-highlight');
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

      {/* CONFIRM POPOVER: Seite mit Inhalt löschen — direkt über dem Lösch-Button */}
      {confirmDeletePos && (
        <div
          data-confirm-popover
          className="fixed z-[9999] bg-white border-2 border-red-300 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] px-4 py-3 animate-in fade-in zoom-in duration-150"
          style={{
            top: confirmDeletePos.top,
            left: confirmDeletePos.left,
            transform: 'translate(-50%, calc(-100% - 10px))',
          }}
        >
          <div className="text-sm font-medium text-gray-800 mb-2 whitespace-nowrap">
            Diese Seite enthält Inhalt. Wirklich löschen?
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setConfirmDeletePos(null)}
              className="px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={() => { performBlockDelete(); setConfirmDeletePos(null); }}
              className="px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Löschen
            </button>
          </div>
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid #fca5a5',
            }}
          />
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

      {/* KI-BILD-BEARBEITUNG: 3-Options-Modal (z.B. Doppelklick auf Steckbrief-Bild) */}
      {showAiImageModal && aiImageSlot && (
        <div
          className="absolute inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={(e) => {
            // Klick auf Backdrop schließt (aber nicht während Regenerierung)
            if (e.target === e.currentTarget && !isRegeneratingAiImage) closeAiImageModal();
          }}
        >
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 w-full max-w-lg border border-indigo-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-indigo-900 mb-2 flex items-center gap-3">
              <span className="text-3xl">🖼️</span>
              Bild bearbeiten
            </h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Wähle eine Aktion für dieses Bild:
            </p>

            {/* 1. Bild neu generieren */}
            <div className="border border-gray-200 rounded-2xl p-4 mb-3 bg-gray-50">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                🔄 Bild neu generieren
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Passe den Prompt an und lass ein neues Bild erzeugen.
              </p>
              <textarea
                value={aiImagePromptDraft}
                onChange={(e) => setAiImagePromptDraft(e.target.value)}
                disabled={isRegeneratingAiImage}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y min-h-[60px] disabled:bg-gray-100"
                placeholder="z.B. Eine Eiche im Herbst mit bunten Blättern"
              />
              <button
                onClick={handleAiImageRegenerate}
                disabled={isRegeneratingAiImage || !aiImagePromptDraft.trim()}
                className="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition-all transform active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none text-sm"
              >
                {isRegeneratingAiImage ? '⏳ Generiere Bild …' : '🔄 Neu generieren'}
              </button>
            </div>

            {/* 2. Eigenes Bild einfügen */}
            <button
              onClick={() => aiImageUploadRef.current?.click()}
              disabled={isRegeneratingAiImage}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow transition-all transform active:scale-95 mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📁 Eigenes Bild einfügen
            </button>
            <input
              ref={aiImageUploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAiImageUpload(file);
                e.target.value = '';
              }}
            />

            {/* 3. Platzhalter für Zeichnung */}
            <button
              onClick={handleAiImagePlaceholder}
              disabled={isRegeneratingAiImage}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow transition-all transform active:scale-95 mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✏️ Platzhalter für Zeichnung
            </button>

            {/* 4. Reposition – nur wenn der Slot in einem Container mit Geschwister-Feldern sitzt */}
            {aiImageSlot.parentElement && aiImageSlot.parentElement.children.length > 1 && aiImageSlot.getAttribute('data-no-reposition') !== 'true' && (
              <div className="border border-gray-200 rounded-2xl p-4 mb-3 bg-gray-50">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  ↕️ Position des Bildes
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Bild/Rahmen relativ zu den Schreiblinien verschieben. Die Linien passen sich automatisch an.
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleAiImageReposition('top')}
                    disabled={isRegeneratingAiImage}
                    className="flex flex-col items-center gap-1 py-2 bg-white hover:bg-indigo-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Bild über den Schreiblinien"
                  >
                    <ArrowUp size={18} />
                    Oben
                  </button>
                  <button
                    onClick={() => handleAiImageReposition('bottom')}
                    disabled={isRegeneratingAiImage}
                    className="flex flex-col items-center gap-1 py-2 bg-white hover:bg-indigo-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Bild unter den Schreiblinien"
                  >
                    <ArrowDown size={18} />
                    Unten
                  </button>
                  <button
                    onClick={() => handleAiImageReposition('left')}
                    disabled={isRegeneratingAiImage}
                    className="flex flex-col items-center gap-1 py-2 bg-white hover:bg-indigo-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Bild links, Schreiblinien rechts"
                  >
                    <ChevronLeft size={18} />
                    Links
                  </button>
                  <button
                    onClick={() => handleAiImageReposition('right')}
                    disabled={isRegeneratingAiImage}
                    className="flex flex-col items-center gap-1 py-2 bg-white hover:bg-indigo-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Bild rechts, Schreiblinien links"
                  >
                    <ChevronRight size={18} />
                    Rechts
                  </button>
                </div>
              </div>
            )}

            {aiImageError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {aiImageError}
              </div>
            )}

            <button
              onClick={closeAiImageModal}
              disabled={isRegeneratingAiImage}
              className="w-full py-2 text-gray-500 hover:text-gray-700 font-bold transition-colors text-sm disabled:opacity-40"
            >
              Abbrechen
            </button>
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
                    Die letzten 10 Snapshots werden lokal gespeichert.
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

            <button onClick={openCoverModal} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm" title="Erstellt ein Cover für die ausgewählte Seite (erste Seite oder leere Seite)">
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

      <div className="flex-1 overflow-y-auto py-8 pb-40 bg-slate-300" style={{ overflowAnchor: 'none' }}>
        <style dangerouslySetInnerHTML={{__html: `
        .editable { transition: all 0.2s ease; border-radius: 4px; padding: 2px 4px; margin: -2px -4px; outline: none; }
        .editable:hover { background-color: #e2e8f0; cursor: text; }
        .editable:focus { background-color: #f1f5f9; outline: 2px dashed #cbd5e1; }

        .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        /* Einheitlicher Abstand zwischen aufeinanderfolgenden Inhaltsblöcken */
        #dossier-root .avoid-break + .avoid-break { margin-top: 2rem !important; }
        #dossier-root h2 + .avoid-break { margin-top: 7px !important; }

        .page-break { height: 2rem; background: transparent !important; border: none; margin: 0; padding: 0; display: block; pointer-events: none; outline: none !important; }
        .page-break::after { display: none; }

        /* Analog clock: hide hands when the digital time is NOT marked as an answer
           (plain text = student has to draw the hands themselves). */
        .analog-clock:not(:has(.clock-time .is-answer)) .clock-hand-hour,
        .analog-clock:not(:has(.clock-time .is-answer)) .clock-hand-minute {
          visibility: hidden;
        }

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
          padding-bottom: 2cm !important;
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
        /* Inner relative container must fill the cover page so absolutely-positioned children
           (Name, Titel, Subtitle, Bild etc.) resolve their top/left percentages against the full
           page height. h-full (height: 100%) fails in this flex-column layout because browsers
           treat the main-size as indefinite for percentage resolution. */
        .cover-page-container > .relative {
          flex: 1 1 auto;
          min-height: 0;
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
        }

        #dossier-root > .active-block-highlight:not(.page-break) {
          outline: none !important;
          box-shadow:
            inset 0 0 0 3px #3b82f6,
            0 4px 20px rgba(0,0,0,0.18) !important;
          background-color: #eff6ff !important;
        }

        /* Cover-draggable: padding acts as drag zone, inner editable for text selection */
        .cover-draggable:not(.resizable-cover-image-wrapper) {
          padding: 6px !important;
          border-radius: 4px;
        }
        .cover-draggable:not(.resizable-cover-image-wrapper):hover {
          box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.45);
        }
        .cover-draggable .editable,
        .cover-draggable [contenteditable="true"] {
          cursor: text;
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
          overflow: visible;
        }

        /* Corner frames that extend above the block — auto-apply top margin */
        #dossier-root .avoid-break:has(.frame-overlay img[src*="botanical"]),
        #dossier-root .avoid-break:has(.frame-overlay img[src*="floral"]),
        #dossier-root .avoid-break:has(.frame-overlay img[src*="welle"]) {
          margin-top: 50px !important;
        }

        /* Rose frame: extra 25px gap when a title precedes the block */
        #dossier-root h1 + .avoid-break:has(.frame-overlay img[src*="rose"]),
        #dossier-root h2 + .avoid-break:has(.frame-overlay img[src*="rose"]),
        #dossier-root h3 + .avoid-break:has(.frame-overlay img[src*="rose"]) {
          margin-top: 25px !important;
        }

        .content-wrapper {
          position: relative;
          z-index: 1;
          transition: padding 0.3s ease;
        }

        /* Sicherstellen, dass leere Blöcke im Editor klickbar bleiben.
           .page-break ausgenommen, da diese bewusst leer sind und sonst
           als gestrichelte Linie am Seitenrand sichtbar würden. */
        #dossier-root > *:empty:not(.page-break) {
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
          #dossier-root > .active-block-highlight:not(.page-break) { box-shadow: none !important; background-color: white !important; }
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
      <div
        className="flex-1 overflow-y-auto py-10 pb-40 bg-slate-400"
        style={{ overflowAnchor: 'none' }}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('#dossier-root')) {
            setActiveBlock(null);
            document.querySelectorAll('.active-block-highlight').forEach(el => el.classList.remove('active-block-highlight'));
          }
        }}
      >
        <div
          id="dossier-wrapper"
          style={{ fontFamily: globalFont, transitionProperty: 'none' }}
          className=""
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
          
          <select value="" onMouseDown={() => saveSelection()} onChange={(e) => { applyExactFontSize(e.target.value); e.target.value = ''; }} className="h-8 bg-white border border-gray-300 rounded text-xs px-1 outline-none focus:border-blue-500" title="Schriftgröße">
            <option value="" disabled>Größe</option>
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
          <div className="relative" ref={structureMenuRef}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setShowStructureMenu(v => !v); setOpenSubject(null); }}
              className="h-8 bg-white border border-indigo-300 rounded text-xs px-2 outline-none focus:border-indigo-500 font-bold text-indigo-800 hover:bg-indigo-50"
            >
              ➕ Struktur einfügen...
            </button>
            {showStructureMenu && (() => {
              const pick = (id: string) => { handleAddTemplate(id); setShowStructureMenu(false); setOpenSubject(null); };
              const byId = (id: string) => EXERCISE_TEMPLATES.find(t => t.id === id);
              const subjects: { label: string; ids: string[] }[] = [
                { label: 'Mathematik', ids: ['geld_rechnen', 'rechengitter', 'punktraster', 'rechenmauer', 'sachaufgabe', 'stellenwerttafel', 'uhrzeit', 'zeitspanne_tabelle', 'zahlenhaus', 'zahlenreihe', 'zahlenstrahl'] },
                { label: 'NMG', ids: ['matching', 'bildbeschriftung', 'experiment', 'film_fragen', 'interview', 'klassifizierung', 'lebenszyklus', 'lueckentext', 'bild_beschriftung_multi', 'mindmap', 'offene_frage', 'recherche', 'steckbrief', 'steckbrief_gross', 't_chart', 'anstreichen_nmg', 'ursache_wirkung', 'venn_diagramm', 'vergleichstabelle', 'was_faellt_auf', 'zeitstrahl'] },
                { label: 'Sprachen', ids: ['abc_liste', 'bildgeschichte', 'dialog_luecken', 'geschichte', 'klassifizierung', 'konjugations_faecher', 'korrektur_zeile', 'klammer_luecken', 'lueckentext', 'professor_zipp', 'reimpaare', 'satz_transformator', 'suchsel', 'anstreichen', 'liste_zweispaltig', 'w_fragen', 'was_faellt_auf', 'eindringling'] },
                { label: 'Allgemein', ids: ['checkbox-table', 'klassifizierung', 'kwl_chart', 'offene_frage', 'reflexion', 'table', 'suchsel', 't_chart', 'anstreichen', 'venn_diagramm', 'zeichnungsauftrag', 'ziel_checkliste'] },
              ];
              const itemCls = "w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-100 text-indigo-900 whitespace-nowrap";
              return (
                <div className="absolute bottom-9 left-0 z-50 bg-white border border-indigo-300 rounded shadow-lg min-w-[220px] py-1">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick('text')} className={itemCls}>Textabschnitt</button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick('merkblatt')} className={itemCls}>Merkblatt (Box)</button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick('merkblatt2')} className={itemCls}>Merkblatt II (Regeln)</button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick('toc')} className={itemCls}>Inhaltsverzeichnis</button>
                  <div className="border-t border-indigo-100 my-1" />
                  {subjects.map(s => (
                    <div
                      key={s.label}
                      className="relative"
                      onMouseEnter={() => setOpenSubject(s.label)}
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setOpenSubject(openSubject === s.label ? null : s.label)}
                        className={`${itemCls} flex items-center justify-between font-bold`}
                      >
                        <span>{s.label}</span>
                        <ChevronRight size={14} />
                      </button>
                      {openSubject === s.label && (
                        <div className="absolute bottom-0 left-full ml-0 bg-white border border-indigo-300 rounded shadow-lg min-w-[240px] py-1 max-h-[70vh] overflow-y-auto">
                          {s.ids.map(id => {
                            const t = byId(id);
                            if (!t) return null;
                            return (
                              <button
                                key={id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pick(id)}
                                className={itemCls}
                              >
                                {t.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

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
