import { useState, useRef } from 'react';
import { EXERCISE_TEMPLATES } from '../constants';
import { AUDIENCE_LEVELS, type AudienceLevel } from '../lib/audienceProfiles';
import { DIDACTIC_OPTIONS, type DidacticApproach, type DidacticScope } from '../lib/didacticProfiles';

interface WizardModalProps {
  onClose: () => void;
  onSubmit: (data: WizardData) => void;
}

export interface WizardData {
  mode: 'generate' | 'import' | 'empty';
  topic: string;
  targetAudience: AudienceLevel | '';
  selectedTemplateIds: string[];
  taskCount: string;
  subtopics: string;
  cheatSheetContent: string;
  taskInstructions: string;
  importedFile: { data: string, mimeType: string, name: string } | null;
  importInstructions: string;
  theme: string;
  didacticApproach: DidacticApproach;
  didacticScope: DidacticScope;
  didacticChapters: string;
}

const SUBJECT_TEMPLATE_IDS: Record<string, string[]> = {
  Mathematik: ['geld_rechnen', 'rechengitter', 'punktraster', 'rechenmauer', 'sachaufgabe', 'stellenwerttafel', 'uhrzeit', 'zeitspanne_tabelle', 'zahlenhaus', 'zahlenreihe', 'zahlenstrahl'],
  NMG: ['matching', 'bildbeschriftung', 'experiment', 'film_fragen', 'interview', 'klassifizierung', 'lebenszyklus', 'lueckentext', 'bild_beschriftung_multi', 'mindmap', 'offene_frage', 'recherche', 'steckbrief', 'steckbrief_gross', 't_chart', 'anstreichen_nmg', 'ursache_wirkung', 'venn_diagramm', 'vergleichstabelle', 'was_faellt_auf', 'zeitstrahl'],
  Sprachen: ['abc_liste', 'bildgeschichte', 'dialog_luecken', 'geschichte', 'klassifizierung', 'konjugations_faecher', 'korrektur_zeile', 'klammer_luecken', 'lueckentext', 'professor_zipp', 'reimpaare', 'satz_transformator', 'suchsel', 'anstreichen', 'liste_zweispaltig', 'w_fragen', 'was_faellt_auf', 'eindringling'],
  Allgemein: ['checkbox-table', 'klassifizierung', 'kwl_chart', 'offene_frage', 'reflexion', 'table', 'suchsel', 't_chart', 'anstreichen', 'venn_diagramm', 'zeichnungsauftrag', 'ziel_checkliste'],
};
const SUBJECT_TABS = ['Alle', 'Mathematik', 'NMG', 'Sprachen', 'Allgemein'] as const;

const THEMES = [
  // Row 1: kühle Blautöne
  { id: 'cyan',     name: 'Türkis',     color: 'bg-cyan-400' },
  { id: 'sky',      name: 'Himmelblau', color: 'bg-sky-400' },
  { id: 'blue',     name: 'Blau',       color: 'bg-blue-500' },
  { id: 'navy',     name: 'Navy',       color: 'bg-navy-700' },

  // Row 2: Grüntöne + Petrol
  { id: 'lime',     name: 'Limette',    color: 'bg-lime-500' },
  { id: 'emerald',  name: 'Smaragd',    color: 'bg-emerald-500' },
  { id: 'olive',    name: 'Olive',      color: 'bg-olive-500' },
  { id: 'petrol',   name: 'Petrol',     color: 'bg-petrol-600' },

  // Row 3: Warm Gelb → Orange
  { id: 'yellow',   name: 'Gelb',       color: 'bg-yellow-400' },
  { id: 'amber',    name: 'Bernstein',  color: 'bg-amber-500' },
  { id: 'orange',   name: 'Orange',     color: 'bg-orange-500' },
  { id: 'koralle',  name: 'Koralle',    color: 'bg-koralle-600' },

  // Row 4: warme Rot/Pink-Töne
  { id: 'lachs',    name: 'Lachs',      color: 'bg-lachs-400' },
  { id: 'pink',     name: 'Pink',       color: 'bg-pink-500' },
  { id: 'red',      name: 'Rot',        color: 'bg-red-500' },
  { id: 'weinrot',  name: 'Weinrot',    color: 'bg-weinrot-700' },

  // Row 5: Magenta/Violett → Neutral
  { id: 'fuchsia',  name: 'Magenta',    color: 'bg-fuchsia-500' },
  { id: 'violet',   name: 'Violett',    color: 'bg-violet-600' },
  { id: 'braun',    name: 'Braun',      color: 'bg-braun-500' },
  { id: 'neutral',  name: 'Monochrom',  color: 'bg-neutral-700' },
];

export function WizardModal({ onClose, onSubmit }: WizardModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templateTab, setTemplateTab] = useState<typeof SUBJECT_TABS[number]>('Alle');
  const [templateSearch, setTemplateSearch] = useState('');
  const [expandedPanel, setExpandedPanel] = useState<'templates' | 'didactic' | null>('templates');
  const togglePanel = (panel: 'templates' | 'didactic') => setExpandedPanel(prev => prev === panel ? null : panel);
  const [data, setData] = useState<WizardData>({
    mode: 'generate',
    topic: '',
    targetAudience: '',
    selectedTemplateIds: [],
    taskCount: '',
    subtopics: '',
    cheatSheetContent: '',
    taskInstructions: '',
    importedFile: null,
    importInstructions: '',
    theme: 'emerald',
    didacticApproach: 'inductive',
    didacticScope: 'all',
    didacticChapters: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => setStep((s) => {
    if (data.mode === 'empty' && s === 1) return 4;
    return Math.min(s + 1, 4);
  });
  const handleBack = () => setStep((s) => {
    if (data.mode === 'empty' && s === 4) return 1;
    return Math.max(s - 1, 1);
  });

  const handleSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onSubmit(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];
      setData({
        ...data,
        importedFile: {
          data: base64Data,
          mimeType: file.type || 'text/plain',
          name: file.name
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setData({ ...data, importedFile: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
            <span className="bg-white border border-gray-200 p-2 rounded-xl">🏗️</span>
            Architekt
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors">&times;</button>
        </div>

        <div className="mb-6 flex gap-2">
          {(data.mode === 'empty' ? [1, 4] : [1, 2, 3, 4]).map((i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${step >= i ? 'bg-navy-700' : 'bg-gray-100'}`} />
          ))}
        </div>

        <div className="min-h-[300px]">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">1. Wie möchtest du starten?</h3>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setData({ ...data, mode: 'generate' })}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${data.mode === 'generate' ? 'border-blue-300 bg-blue-50 text-gray-800' : 'border-gray-200 hover:border-gray-400 text-gray-600'}`}
                  >
                    <span className={`text-3xl ${data.mode === 'generate' ? 'opacity-100' : 'opacity-50 grayscale'}`}>✨</span>
                    <span className="font-bold text-center text-sm">Aufgaben durch KI generieren</span>
                  </button>
                  <button
                    onClick={() => setData({ ...data, mode: 'import' })}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${data.mode === 'import' ? 'border-blue-300 bg-blue-50 text-gray-800' : 'border-gray-200 hover:border-gray-400 text-gray-600'}`}
                  >
                    <span className={`text-3xl ${data.mode === 'import' ? 'opacity-100' : 'opacity-50 grayscale'}`}>📤</span>
                    <span className="font-bold text-center text-sm">Eigene Aufgaben importieren</span>
                  </button>
                  <button
                    onClick={() => setData({ ...data, mode: 'empty' })}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${data.mode === 'empty' ? 'border-blue-300 bg-blue-50 text-gray-800' : 'border-gray-200 hover:border-gray-400 text-gray-600'}`}
                  >
                    <span className={`text-3xl ${data.mode === 'empty' ? 'opacity-100' : 'opacity-50 grayscale'}`}>📄</span>
                    <span className="font-bold text-center text-sm">Leeres Dossier erstellen</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Thema & Zielgruppe</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Was ist das Hauptthema?</label>
                    <input
                      type="text"
                      value={data.topic}
                      onChange={(e) => setData({ ...data, topic: e.target.value })}
                      placeholder="z.B. Wortstämme, Brüche, Französische Revolution"
                      className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-gray-500 outline-none transition-colors"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Wer ist die Zielgruppe?</label>
                    <p className="text-xs text-gray-500 mb-2">Wähle die passende Stufe. Die KI passt Satzbau, Wortwahl und Aufgabenumfang automatisch an.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {AUDIENCE_LEVELS.map(level => {
                        const active = data.targetAudience === level.id;
                        return (
                          <button
                            key={level.id}
                            type="button"
                            onClick={() => setData({ ...data, targetAudience: active ? '' : level.id })}
                            className={`text-left p-3 rounded-xl border-2 transition-all ${active ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-400 bg-white'}`}
                          >
                            <div className={`font-bold text-sm ${active ? 'text-gray-900' : 'text-gray-800'}`}>{level.shortLabel}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{level.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && data.mode === 'generate' && (
            <div className="space-y-3 animate-in slide-in-from-right-4 min-h-[520px]">
              <h3 className="text-xl font-bold text-gray-800">2. Aufgaben-Konfiguration</h3>

              {/* Panel 1: Aufgabenarten */}
              <div className="border-2 border-gray-100 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => togglePanel('templates')}
                  className={`w-full flex items-center justify-between p-3 transition-colors ${expandedPanel === 'templates' ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">Aufgabenarten</span>
                    {data.selectedTemplateIds.length > 0 && (
                      <span className="text-[11px] bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full font-bold">{data.selectedTemplateIds.length} ausgewählt</span>
                    )}
                  </span>
                  <span className={`text-gray-400 transition-transform ${expandedPanel === 'templates' ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {expandedPanel === 'templates' && (
                  <div className="p-3 border-t border-gray-100">
                    <label className="block text-xs text-gray-500 mb-2">Welche Aufgabenarten sind gewünscht?</label>
                    {(() => {
                  const search = templateSearch.trim().toLowerCase();
                  const tabIds = templateTab === 'Alle'
                    ? EXERCISE_TEMPLATES.map(t => t.id)
                    : SUBJECT_TEMPLATE_IDS[templateTab] || [];
                  const uniqueIds = Array.from(new Set(tabIds));
                  const visibleTemplates = uniqueIds
                    .map(id => EXERCISE_TEMPLATES.find(t => t.id === id))
                    .filter((t): t is typeof EXERCISE_TEMPLATES[number] => !!t)
                    .filter(t => !search || t.name.toLowerCase().includes(search))
                    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
                  const visibleIds = visibleTemplates.map(t => t.id);
                  const allSelected = visibleIds.length > 0 && visibleIds.every(id => data.selectedTemplateIds.includes(id));
                  const countInTab = (tab: typeof SUBJECT_TABS[number]) => {
                    const ids = tab === 'Alle' ? EXERCISE_TEMPLATES.map(t => t.id) : (SUBJECT_TEMPLATE_IDS[tab] || []);
                    return Array.from(new Set(ids)).filter(id => data.selectedTemplateIds.includes(id)).length;
                  };
                  return (
                    <div className="mt-2 border-2 border-gray-100 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-1 bg-gray-50 border-b border-gray-100 p-1">
                        {SUBJECT_TABS.map(tab => {
                          const count = countInTab(tab);
                          const active = templateTab === tab;
                          return (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setTemplateTab(tab)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${active ? 'bg-blue-200 text-blue-900' : 'text-gray-600 hover:bg-gray-200'}`}
                            >
                              {tab}
                              {count > 0 && (
                                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-white text-gray-800' : 'bg-gray-200 text-gray-800'}`}>{count}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 p-2 border-b border-gray-100">
                        <input
                          type="text"
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          placeholder="Suchen…"
                          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-gray-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const current = new Set(data.selectedTemplateIds);
                            if (allSelected) visibleIds.forEach(id => current.delete(id));
                            else visibleIds.forEach(id => current.add(id));
                            setData({ ...data, selectedTemplateIds: Array.from(current) });
                          }}
                          className="text-xs font-bold text-gray-700 hover:text-gray-900 whitespace-nowrap"
                        >
                          {allSelected ? 'Keine' : 'Alle'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-2 max-h-[220px] overflow-y-auto">
                        {visibleTemplates.length === 0 && (
                          <div className="col-span-2 text-center text-xs text-gray-400 py-4">Keine Treffer</div>
                        )}
                        {visibleTemplates.map(template => (
                          <label key={template.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                            <input
                              type="checkbox"
                              checked={data.selectedTemplateIds.includes(template.id)}
                              onChange={(e) => {
                                const ids = e.target.checked
                                  ? [...data.selectedTemplateIds, template.id]
                                  : data.selectedTemplateIds.filter(id => id !== template.id);
                                setData({ ...data, selectedTemplateIds: ids });
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-gray-700 focus:ring-gray-500"
                            />
                            <span className="text-[11px] text-gray-700 font-medium truncate" title={template.name}>{template.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                  </div>
                )}
              </div>

              {/* Panel 2: Didaktischer Aufbau */}
              {(() => {
                const didacticSummary = (() => {
                  const opt = DIDACTIC_OPTIONS.find(o => o.id === data.didacticApproach);
                  if (!opt) return '';
                  if (data.didacticApproach === 'free') return opt.label;
                  const scopePart = data.didacticScope === 'selected'
                    ? (data.didacticChapters.trim() ? `nur: ${data.didacticChapters.trim()}` : 'keine Kapitel angegeben')
                    : 'ganzes Dossier';
                  return `${opt.label} · ${scopePart}`;
                })();
                return (
                  <div className="border-2 border-gray-100 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => togglePanel('didactic')}
                      className={`w-full flex items-center justify-between p-3 transition-colors ${expandedPanel === 'didactic' ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800">Didaktischer Aufbau</span>
                        <span className="text-[11px] text-gray-500">{didacticSummary}</span>
                      </span>
                      <span className={`text-gray-400 transition-transform ${expandedPanel === 'didactic' ? 'rotate-180' : ''}`}>▾</span>
                    </button>
                    {expandedPanel === 'didactic' && (
                      <div className="p-3 border-t border-gray-100 space-y-3">
                        <select
                          value={data.didacticApproach}
                          onChange={(e) => setData({ ...data, didacticApproach: e.target.value as DidacticApproach })}
                          className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-gray-500 outline-none transition-colors bg-white"
                        >
                          {DIDACTIC_OPTIONS.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label} — {opt.description}</option>
                          ))}
                        </select>
                        {data.didacticApproach === 'inductive' && (
                          <p className="text-xs text-amber-600">
                            Merkblätter werden beim induktiven Aufbau standardmässig nicht generiert
                            <br />— nur wenn du sie im nächsten Schritt explizit anforderst.
                          </p>
                        )}
                        {data.didacticApproach !== 'free' && (
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-gray-700">Geltungsbereich</div>
                            <div className="grid grid-cols-2 gap-2">
                              {([
                                { id: 'all' as const, label: 'Ganzes Dossier' },
                                { id: 'selected' as const, label: 'Nur bestimmte Kapitel' },
                              ]).map(opt => {
                                const active = data.didacticScope === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setData({ ...data, didacticScope: opt.id })}
                                    className={`p-2 rounded-xl border-2 text-sm font-bold transition-all ${active ? 'border-blue-300 bg-blue-50 text-gray-800' : 'border-gray-200 hover:border-gray-400 text-gray-700 bg-white'}`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                            {data.didacticScope === 'selected' && (
                              <div>
                                <input
                                  type="text"
                                  value={data.didacticChapters}
                                  onChange={(e) => setData({ ...data, didacticChapters: e.target.value })}
                                  placeholder="z.B. Präsens, Perfekt"
                                  className="w-full border-2 border-gray-200 rounded-xl p-2 text-sm focus:border-gray-500 outline-none transition-colors"
                                />
                                {!data.didacticChapters.trim() && (
                                  <p className="text-xs text-amber-600 mt-1">Bitte mindestens ein Kapitel angeben, sonst wirkt der didaktische Aufbau nirgends.</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Anzahl Aufgaben</label>
                  <input
                    type="number"
                    value={data.taskCount}
                    onChange={(e) => setData({ ...data, taskCount: e.target.value })}
                    placeholder="z.B. 5"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-gray-500 outline-none transition-colors"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Welche Unterthemen?</label>
                  <textarea
                    value={data.subtopics}
                    onChange={(e) => setData({ ...data, subtopics: e.target.value })}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }}
                    rows={1}
                    placeholder="z.B. Vorsilben, Nachsilben"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-gray-500 outline-none transition-colors resize-none overflow-hidden leading-normal"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && data.mode === 'import' && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-gray-800">2. Dokumenten-Upload</h3>
              <p className="text-gray-600 text-sm mb-2">Lade deine bestehenden Aufgaben als PDF, Word oder Textdatei hoch.</p>
              
              {!data.importedFile ? (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="text-5xl mb-4 opacity-50 grayscale">📤</span>
                  <p className="text-gray-700 font-bold mb-1">Klicke hier, um eine Datei auszuwählen</p>
                  <p className="text-gray-500 text-sm">PDF, TXT, CSV, MD (max. 10MB)</p>
                  <p className="text-gray-600 text-[10px] mt-2 italic">Hinweis: .docx wird aktuell nicht direkt unterstützt. Bitte als PDF speichern.</p>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.txt,.csv,.md"
                  />
                </div>
              ) : (
                <div className="border-2 border-blue-200 bg-blue-50 rounded-2xl p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-xl text-blue-700 text-2xl">
                      📄
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{data.importedFile.name}</p>
                      <p className="text-blue-700 text-sm">Erfolgreich hochgeladen</p>
                    </div>
                  </div>
                  <button 
                    onClick={removeFile}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xl"
                    title="Datei entfernen"
                  >
                    ❌
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 3 && data.mode === 'generate' && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-gray-800">3. Merkblätter & Instruktionen</h3>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Zu welchen spezifischen Inhalten soll ein Merkblatt-Block erstellt werden?</label>
                <textarea
                  value={data.cheatSheetContent}
                  onChange={(e) => setData({ ...data, cheatSheetContent: e.target.value })}
                  placeholder="z.B. Die wichtigsten Regeln für die Bildung von Wortstämmen..."
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-gray-500 outline-none transition-colors min-h-[80px] resize-y text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Spezifische Anweisungen zu den Aufgaben</label>
                <textarea
                  value={data.taskInstructions}
                  onChange={(e) => setData({ ...data, taskInstructions: e.target.value })}
                  placeholder="z.B. Nutze für das Thema Präteritum einen Lückentext. Baue für Thema XY einen Steckbrief ein."
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-gray-500 outline-none transition-colors min-h-[80px] resize-y text-sm"
                />
              </div>
            </div>
          )}

          {step === 3 && data.mode === 'import' && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-gray-800">3. Bemerkungen & Anweisungen</h3>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Gibt es spezielle Anweisungen für die KI?</label>
                <p className="text-gray-500 text-xs mb-2">Wie sollen die importierten Aufgaben formatiert werden? Sollen zusätzliche Merkblätter generiert werden?</p>
                <textarea
                  value={data.importInstructions}
                  onChange={(e) => setData({ ...data, importInstructions: e.target.value })}
                  placeholder="z.B. Formatiere die Aufgaben und erstelle zusätzlich zu jedem Überkapitel ein passendes Merkblatt."
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-gray-500 outline-none transition-colors min-h-[160px] resize-y"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-gray-800">4. Visueller Stil</h3>
              <p className="text-gray-600 text-sm mb-4">Wähle ein Farbschema für das Dossier aus.</p>
              <div className="grid grid-cols-4 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setData({ ...data, theme: t.id })}
                    className={`p-2 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${data.theme === t.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    <div className={`w-7 h-7 rounded-full ${t.color} shadow-inner`} />
                    <span className="text-[11px] font-medium text-gray-700 leading-tight">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="px-6 py-2.5 text-gray-500 hover:text-gray-700 font-bold disabled:opacity-30 transition-colors"
          >
            Zurück
          </button>
          
          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-navy-700 hover:bg-navy-800 text-white font-bold rounded-xl transition-colors"
            >
              Weiter
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !data.topic.trim() || (data.mode === 'import' && !data.importedFile)}
              className="px-6 py-2.5 bg-navy-700 hover:bg-navy-800 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Wird erstellt...' : (data.mode === 'empty' ? 'Leeres Dossier erstellen' : 'Entwerfen')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
