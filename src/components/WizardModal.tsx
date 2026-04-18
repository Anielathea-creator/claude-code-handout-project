import { useState, useRef } from 'react';
import { EXERCISE_TEMPLATES } from '../constants';

interface WizardModalProps {
  onClose: () => void;
  onSubmit: (data: WizardData) => void;
}

export interface WizardData {
  mode: 'generate' | 'import' | 'empty';
  topic: string;
  targetAudience: string;
  selectedTemplateIds: string[];
  taskCount: string;
  subtopics: string;
  cheatSheetContent: string;
  taskInstructions: string;
  importedFile: { data: string, mimeType: string, name: string } | null;
  importInstructions: string;
  theme: string;
}

const SUBJECT_TEMPLATE_IDS: Record<string, string[]> = {
  Mathematik: ['geld_rechnen', 'rechengitter', 'punktraster', 'rechenmauer', 'sachaufgabe', 'stellenwerttafel', 'uhrzeit', 'zeitspanne_tabelle', 'zahlenhaus', 'zahlenreihe', 'zahlenstrahl'],
  NMG: ['matching', 'bildbeschriftung', 'experiment', 'film_fragen', 'interview', 'klassifizierung', 'lebenszyklus', 'lueckentext', 'bild_beschriftung_multi', 'mindmap', 'offene_frage', 'recherche', 'steckbrief', 'steckbrief_gross', 't_chart', 'anstreichen', 'ursache_wirkung', 'venn_diagramm', 'vergleichstabelle', 'was_faellt_auf', 'zeitstrahl'],
  Sprachen: ['abc_liste', 'bildgeschichte', 'dialog_luecken', 'klassifizierung', 'konjugations_faecher', 'korrektur_zeile', 'klammer_luecken', 'lueckentext', 'professor_zipp', 'reimpaare', 'satz_transformator', 'suchsel', 'anstreichen', 'liste_zweispaltig', 'w_fragen', 'was_faellt_auf', 'eindringling'],
  Allgemein: ['checkbox-table', 'klassifizierung', 'kwl_chart', 'offene_frage', 'reflexion', 'table', 'suchsel', 't_chart', 'anstreichen', 'venn_diagramm', 'zeichnungsauftrag', 'ziel_checkliste'],
};
const SUBJECT_TABS = ['Alle', 'Mathematik', 'NMG', 'Sprachen', 'Allgemein'] as const;

const THEMES = [
  { id: 'blue', name: 'Blau (Klassisch)', color: 'bg-blue-500' },
  { id: 'emerald', name: 'Smaragd (Natur)', color: 'bg-emerald-500' },
  { id: 'purple', name: 'Lila (Kreativ)', color: 'bg-purple-500' },
  { id: 'amber', name: 'Bernstein (Warm)', color: 'bg-amber-500' },
  { id: 'rose', name: 'Rose (Verspielt)', color: 'bg-rose-500' },
];

export function WizardModal({ onClose, onSubmit }: WizardModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templateTab, setTemplateTab] = useState<typeof SUBJECT_TABS[number]>('Alle');
  const [templateSearch, setTemplateSearch] = useState('');
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
            <span className="bg-indigo-100 p-2 rounded-xl">🏗️</span>
            Dossier-Architekt
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors">&times;</button>
        </div>

        <div className="mb-6 flex gap-2">
          {(data.mode === 'empty' ? [1, 4] : [1, 2, 3, 4]).map((i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${step >= i ? 'bg-indigo-600' : 'bg-gray-100'}`} />
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
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${data.mode === 'generate' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-indigo-300 text-gray-600'}`}
                  >
                    <span className={`text-3xl ${data.mode === 'generate' ? 'opacity-100' : 'opacity-50 grayscale'}`}>✨</span>
                    <span className="font-bold text-center text-sm">Aufgaben durch KI generieren</span>
                  </button>
                  <button
                    onClick={() => setData({ ...data, mode: 'import' })}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${data.mode === 'import' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-indigo-300 text-gray-600'}`}
                  >
                    <span className={`text-3xl ${data.mode === 'import' ? 'opacity-100' : 'opacity-50 grayscale'}`}>📤</span>
                    <span className="font-bold text-center text-sm">Eigene Aufgaben importieren</span>
                  </button>
                  <button
                    onClick={() => setData({ ...data, mode: 'empty' })}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${data.mode === 'empty' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-indigo-300 text-gray-600'}`}
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
                      className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 outline-none transition-colors"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Wer ist die Zielgruppe?</label>
                    <input
                      type="text"
                      value={data.targetAudience}
                      onChange={(e) => setData({ ...data, targetAudience: e.target.value })}
                      placeholder="z.B. 5. Klasse, Anfänger, Erwachsene"
                      className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && data.mode === 'generate' && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-gray-800">2. Aufgaben-Konfiguration</h3>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Welche Aufgabenarten sind gewünscht?</label>
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
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                            >
                              {tab}
                              {count > 0 && (
                                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700'}`}>{count}</span>
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
                          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const current = new Set(data.selectedTemplateIds);
                            if (allSelected) visibleIds.forEach(id => current.delete(id));
                            else visibleIds.forEach(id => current.add(id));
                            setData({ ...data, selectedTemplateIds: Array.from(current) });
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
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
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] text-gray-700 font-medium truncate" title={template.name}>{template.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Wie viele Aufgaben insgesamt?</label>
                  <input
                    type="number"
                    value={data.taskCount}
                    onChange={(e) => setData({ ...data, taskCount: e.target.value })}
                    placeholder="z.B. 5"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 outline-none transition-colors"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Welche Unterthemen?</label>
                  <input
                    type="text"
                    value={data.subtopics}
                    onChange={(e) => setData({ ...data, subtopics: e.target.value })}
                    placeholder="z.B. Vorsilben, Nachsilben"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 outline-none transition-colors"
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
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="text-5xl mb-4 opacity-50 grayscale">📤</span>
                  <p className="text-gray-700 font-bold mb-1">Klicke hier, um eine Datei auszuwählen</p>
                  <p className="text-gray-500 text-sm">PDF, TXT, CSV, MD (max. 10MB)</p>
                  <p className="text-indigo-500 text-[10px] mt-2 italic">Hinweis: .docx wird aktuell nicht direkt unterstützt. Bitte als PDF speichern.</p>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.txt,.csv,.md"
                  />
                </div>
              ) : (
                <div className="border-2 border-indigo-200 bg-indigo-50 rounded-2xl p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 text-2xl">
                      📄
                    </div>
                    <div>
                      <p className="font-bold text-indigo-900">{data.importedFile.name}</p>
                      <p className="text-indigo-600 text-sm">Erfolgreich hochgeladen</p>
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
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 outline-none transition-colors min-h-[80px] resize-y text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Spezifische Anweisungen zu den Aufgaben</label>
                <textarea
                  value={data.taskInstructions}
                  onChange={(e) => setData({ ...data, taskInstructions: e.target.value })}
                  placeholder="z.B. Nutze für das Thema Präteritum einen Lückentext. Baue für Thema XY einen Steckbrief ein."
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 outline-none transition-colors min-h-[80px] resize-y text-sm"
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
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 outline-none transition-colors min-h-[160px] resize-y"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-gray-800">4. Visueller Stil</h3>
              <p className="text-gray-600 text-sm mb-4">Wähle ein Farbschema für das Dossier aus.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setData({ ...data, theme: t.id })}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${data.theme === t.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                  >
                    <div className={`w-12 h-12 rounded-full ${t.color} shadow-inner`} />
                    <span className="font-bold text-sm text-gray-700">{t.name}</span>
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
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
            >
              Weiter
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !data.topic.trim() || (data.mode === 'import' && !data.importedFile)}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Wird erstellt...' : (data.mode === 'empty' ? '📄 Leeres Dossier erstellen' : '🚀 Dossier entwerfen')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
