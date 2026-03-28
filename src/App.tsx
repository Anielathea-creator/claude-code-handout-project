import { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { AIChat } from './components/AIChat';
import { Editor } from './components/Editor';
import { Project, ChatMessage } from './types';
import { INITIAL_HTML, EXERCISE_TEMPLATES } from './constants';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WizardModal, WizardData } from './components/WizardModal';
import { saveProjects, loadProjects } from './lib/storage';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSnapshotTimeRef = useRef<number>(Date.now());
  const lastSnapshotHtmlRef = useRef<string>('');

  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleAddSnapshot = useCallback((name: string) => {
    if (!activeProjectId || !activeProject) return;
    const newSnapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      name,
      html: activeProject.html,
      theme: activeProject.theme,
    };

    lastSnapshotTimeRef.current = Date.now();
    lastSnapshotHtmlRef.current = activeProject.html;

    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        const snapshots = [newSnapshot, ...(p.snapshots || [])].slice(0, 3);
        return { ...p, snapshots };
      }
      return p;
    }));
  }, [activeProjectId, activeProject]);

  // Auto-Snapshot every 60 seconds if changes occurred
  useEffect(() => {
    const interval = setInterval(() => {
      const activeProject = projects.find(p => p.id === activeProjectId);
      if (!activeProject || !activeProject.html) return;
      
      const now = Date.now();
      const timeSinceLastSnapshot = now - lastSnapshotTimeRef.current;
      
      if (timeSinceLastSnapshot >= 60000 && activeProject.html !== lastSnapshotHtmlRef.current) {
        handleAddSnapshot('Automatisches Backup');
        console.log('Auto-snapshot created after 60s of changes');
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [activeProjectId, projects, handleAddSnapshot]);

  // Save to localStorage on page unload as a safety net for the 3s debounce
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem('dossier_quicksave', JSON.stringify(projects));
      } catch (e) {
        // localStorage may be full (e.g. many large base64 images) — silently ignore
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [projects]);

  // Load from storage on mount
  useEffect(() => {
    const initStorage = async () => {
      try {
        // 1. Try loading from IndexedDB first
        let savedProjects = await loadProjects();

        // 2. Check for a quicksave written to localStorage on the last page unload.
        //    This catches cases where the IndexedDB auto-save (3 s debounce) hadn't
        //    fired yet before the user reloaded the page.
        const quickSaveStr = localStorage.getItem('dossier_quicksave');
        if (quickSaveStr) {
          try {
            const quickProjects = JSON.parse(quickSaveStr);
            if (Array.isArray(quickProjects) && quickProjects.length > 0) {
              // Prefer the quicksave — it reflects the most recent in-memory state
              savedProjects = quickProjects;
            }
          } catch (_) { /* ignore malformed quicksave */ }
          // Always clear it so a future reload won't use a stale quicksave
          localStorage.removeItem('dossier_quicksave');
        }

        // 3. If IndexedDB is empty and no quicksave, check LocalStorage for legacy migration
        if (!savedProjects) {
          const legacyData = localStorage.getItem('dossier_projects');
          if (legacyData) {
            savedProjects = JSON.parse(legacyData);
          }
        }

        if (savedProjects && Array.isArray(savedProjects)) {
          // Migration: Update 48pt to 36pt and remove line spacing (leading-tight to leading-none) in existing projects
          let parsed = savedProjects.map((p: Project) => {
            let updatedHtml = p.html;
            if (updatedHtml) {
              if (updatedHtml.includes('text-[48pt]')) {
                updatedHtml = updatedHtml.replaceAll('text-[48pt]', 'text-[36pt]');
              }
              if (updatedHtml.includes('leading-tight')) {
                updatedHtml = updatedHtml.replaceAll('leading-tight', 'leading-none');
              }
            }
            if (updatedHtml !== p.html) {
              return { ...p, html: updatedHtml };
            }
            return p;
          });

          // Deduplicate by ID just in case
          const uniqueProjects = parsed.filter((p, index, self) =>
            index === self.findIndex((t) => t.id === p.id)
          );
          setProjects(uniqueProjects);
          if (uniqueProjects.length > 0) {
            setActiveProjectId(uniqueProjects[0].id);
          }
        } else {
          // Create initial project if none exist
          const initialProject: Project = {
            id: crypto.randomUUID(),
            name: 'Mein erstes Dossier',
            html: INITIAL_HTML,
            chatHistory: [],
          };
          setProjects([initialProject]);
          setActiveProjectId(initialProject.id);
          await saveProjects([initialProject]);
        }
      } catch (e) {
        console.error("Failed to initialize storage", e);
      }
    };

    initStorage();
  }, []);

  // Save to storage whenever projects change (Debounced 3000ms)
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveProjects(projects);
        console.log('Auto-saved to IndexedDB');
      } catch (e) {
        console.error("Failed to save projects to IndexedDB", e);
        alert('Fehler beim Speichern! Dein Browser-Speicher könnte voll sein oder ein Problem haben.');
      }
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [projects]);

  const handleCreateProject = () => {
    setShowWizard(true);
  };

  const handleWizardSubmit = (data: WizardData) => {
    setShowWizard(false);
    
    let briefingMessage = '';
    let initialChatHistory: any[] = [];

    if (data.mode === 'generate') {
      const selectedTemplates = EXERCISE_TEMPLATES.filter(t => data.selectedTemplateIds.includes(t.id));
      const templateNames = selectedTemplates.map(t => t.name).join(', ');

      briefingMessage = `**Dossier-Briefing (KI-Generierung):**
- **Thema:** ${data.topic}
- **Zielgruppe:** ${data.targetAudience || 'Nicht spezifiziert'}
- **Gewählte Aufgaben-Templates:** ${templateNames || 'Keine spezifischen (KI entscheidet)'}
- **Anzahl Aufgaben:** ${data.taskCount || 'Nicht spezifiziert'}
- **Unterthemen:** ${data.subtopics || 'Nicht spezifiziert'}
- **Merkblätter:** ${data.cheatSheetContent || 'Keine spezifischen'}
- **Spezifische Anweisungen:** ${data.taskInstructions || 'Keine'}
- **Visueller Stil:** ${data.theme}

Bitte erstelle basierend auf diesem Briefing zunächst NUR einen groben Entwurf (Inhaltsübersicht) für das Dossier. Generiere noch keinen HTML-Code für den Editor. Warte auf meine Bestätigung dieses Entwurfs.`;
      
      initialChatHistory = [{ role: 'user', content: briefingMessage }];
    } else {
      briefingMessage = `**Dossier-Briefing (Aufgaben-Import):**
- **Thema:** ${data.topic}
- **Zielgruppe:** ${data.targetAudience || 'Nicht spezifiziert'}
- **Visueller Stil:** ${data.theme}
- **Spezifische Anweisungen:** ${data.importInstructions || 'Keine spezifischen Anweisungen'}

Ich habe eine Datei mit bestehenden Aufgaben hochgeladen. Bitte extrahiere die Aufgaben aus der Datei und übertrage sie direkt in das HTML-Layout des Dossiers. Befolge dabei meine spezifischen Anweisungen strikt.`;

      const parts: any[] = [{ text: briefingMessage }];
      
      if (data.importedFile) {
        parts.push({
          inlineData: {
            data: data.importedFile.data,
            mimeType: data.importedFile.mimeType
          }
        });
      }

      initialChatHistory = [{ role: 'user', content: '', parts }];
    }

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: data.topic.trim() || 'Neues Dossier',
      html: '', // Empty initially, waiting for draft confirmation
      chatHistory: initialChatHistory,
      isDrafting: data.mode === 'generate',
      isImporting: data.mode === 'import',
      theme: data.theme,
      selectedTemplateIds: data.selectedTemplateIds,
      taskInstructions: data.taskInstructions,
    };

    setProjects(prev => {
      // Final safety check against duplicates
      if (prev.some(p => p.id === newProject.id)) return prev;
      return [...prev, newProject];
    });
    setActiveProjectId(newProject.id);
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => {
      const filtered = prev.filter(p => p.id !== id);
      if (activeProjectId === id) {
        setActiveProjectId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const handleRenameProject = (id: string, newName: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const uniqueProjects = projects.filter((p, index, self) =>
    index === self.findIndex((t) => t.id === p.id)
  );

  const handleUpdateHtml = (newHtml: string) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, html: newHtml } : p));
  };

  const handleUpdateTheme = (newTheme: string) => {
    if (!activeProjectId || !activeProject) return;
    
    // Attempt to update existing task titles in HTML
    let updatedHtml = activeProject.html;
    const oldTheme = activeProject.theme || 'blue';
    
    if (updatedHtml && oldTheme !== newTheme) {
      // Replace theme colors in h3 tags and other theme-bound elements
      const colorRegex = new RegExp(`text-${oldTheme}-700`, 'g');
      const borderRegex = new RegExp(`border-${oldTheme}-100`, 'g');
      const bgRegex = new RegExp(`bg-${oldTheme}-50`, 'g');
      const border600Regex = new RegExp(`border-${oldTheme}-600`, 'g');
      const text900Regex = new RegExp(`text-${oldTheme}-900`, 'g');
      const hoverBgRegex = new RegExp(`hover:bg-${oldTheme}-50`, 'g');

      updatedHtml = updatedHtml
        .replace(colorRegex, `text-${newTheme}-700`)
        .replace(borderRegex, `border-${newTheme}-100`)
        .replace(bgRegex, `bg-${newTheme}-50`)
        .replace(border600Regex, `border-${newTheme}-600`)
        .replace(text900Regex, `text-${newTheme}-900`)
        .replace(hoverBgRegex, `hover:bg-${newTheme}-50`);
    }

    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, theme: newTheme, html: updatedHtml } : p));
  };

  const handleUpdateChatHistory = (newHistory: ChatMessage[]) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, chatHistory: newHistory } : p));
  };

  const handleRestoreSnapshot = (snapshot: any) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return { ...p, html: snapshot.html, theme: snapshot.theme || p.theme };
      }
      return p;
    }));
  };

  const handleConfirmDraft = (generatedHtml: string) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, isDrafting: false, isImporting: false, html: generatedHtml } : p));
  };

  const handleClearCache = () => {
    if (confirm('Möchtest du ALLE Backups (Snapshots) von ALLEN Dossiers löschen? Dies gibt viel Speicherplatz frei. Deine aktuellen Dossiers bleiben erhalten.')) {
      const cleared = projects.map(p => ({ ...p, snapshots: [] }));
      setProjects(cleared);
      saveProjects(cleared).then(() => {
        alert('Speicherplatz wurde erfolgreich freigegeben.');
      }).catch(() => {
        alert('Fehler beim Freigeben des Speichers.');
      });
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-full overflow-hidden bg-gray-100">
        <Sidebar
          projects={uniqueProjects}
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          onRenameProject={handleRenameProject}
          onClearCache={handleClearCache}
        />
        
        {activeProject ? (
          <>
            <AIChat
              key={`chat-${activeProject.id}`}
              chatHistory={activeProject.chatHistory}
              onUpdateHistory={handleUpdateChatHistory}
              currentHtml={activeProject.html}
              isDrafting={activeProject.isDrafting}
              isImporting={activeProject.isImporting}
              onConfirmDraft={handleConfirmDraft}
              theme={activeProject.theme}
              selectedTemplateIds={activeProject.selectedTemplateIds}
              taskInstructions={activeProject.taskInstructions}
              onAddSnapshot={handleAddSnapshot}
              onUpdateHtml={handleUpdateHtml}
              onUpdateTheme={handleUpdateTheme}
            />
            {!activeProject.isDrafting && !activeProject.isImporting ? (
              <Editor
                key={`editor-${activeProject.id}`} // Force remount when switching projects to reset history
                html={activeProject.html}
                onChange={handleUpdateHtml}
                theme={activeProject.theme}
                snapshots={activeProject.snapshots || []}
                onRestoreSnapshot={handleRestoreSnapshot}
                onAddSnapshot={handleAddSnapshot}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
                <div className="text-6xl mb-6 animate-bounce">🏗️</div>
                <h2 className="text-3xl font-black text-gray-800 mb-4">
                  {activeProject.isImporting ? 'Dossier wird importiert...' : 'Dossier wird entworfen...'}
                </h2>
                <p className="text-gray-500 max-w-md text-lg">
                  {activeProject.isImporting 
                    ? 'Die KI liest deine Datei und formatiert die Aufgaben. Dies kann einen Moment dauern.'
                    : 'Der KI-Assistent erstellt gerade einen Entwurf basierend auf deinem Briefing. Bitte überprüfe den Vorschlag im Chat und bestätige ihn, um den Live-Editor zu öffnen.'}
                </p>
                <button 
                  onClick={() => handleDeleteProject(activeProject.id)}
                  className="mt-8 text-sm text-red-400 hover:text-red-500 hover:underline transition-colors"
                >
                  Vorgang abbrechen & Dossier löschen
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Wähle ein Dossier aus oder erstelle ein neues.
          </div>
        )}

        {showWizard && (
          <WizardModal
            onClose={() => setShowWizard(false)}
            onSubmit={handleWizardSubmit}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
