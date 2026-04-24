import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Project } from '../types';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onClearCache: () => void;
  onExpand?: () => void;
}

export function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  onClearCache,
  onExpand,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const handleRenameSubmit = (id: string) => {
    if (editName.trim()) {
      onRenameProject(id, editName.trim());
    }
    setEditingId(null);
  };

  if (collapsed) {
    return (
      <div className="w-14 bg-gray-900 text-gray-100 flex flex-col items-center h-full border-r border-gray-800 shrink-0">
        <div className="p-2 border-b border-gray-800 w-full flex items-center justify-center gap-1">
          <span className="text-lg">📄</span>
          <button
            onClick={() => { setCollapsed(false); onExpand?.(); }}
            className="p-0.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
            title="Seitenleiste ausklappen"
          >
            <span className="inline-block -rotate-90 text-sm">▾</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-900 text-gray-100 flex flex-col h-full border-r border-gray-800 shrink-0">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-2">
        <h2 className="font-bold text-lg text-gray-100 flex items-center gap-2">
          <span>📄</span>
          Dossiers
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateProject}
            className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-100 rounded-md transition-colors text-[#0D47A1] text-2xl font-black leading-none shadow-sm"
            title="Neues Dossier"
          >
            <span className="inline-block -translate-y-[3px]">+</span>
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
            title="Seitenleiste einklappen"
          >
            <span className="inline-block rotate-90 text-sm">▾</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
              activeProjectId === project.id
                ? 'bg-navy-900/60 text-white'
                : 'hover:bg-gray-800 text-gray-300'
            }`}
            onClick={() => {
              if (editingId !== project.id) {
                onSelectProject(project.id);
              }
            }}
          >
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <span className="shrink-0 opacity-70">📄</span>
              {editingId === project.id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRenameSubmit(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(project.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="bg-gray-800 text-white px-1 py-0.5 rounded w-full outline-none border border-cyan-500 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate text-sm font-medium">{project.name}</span>
              )}
            </div>
            
            {editingId !== project.id && (
              <div className="flex items-center gap-1 opacity-40 hover:opacity-100 group-hover:opacity-100 transition-opacity ml-2">
                {confirmDeleteId === project.id ? (
                  <div className="flex items-center gap-1 bg-red-900/80 p-1 rounded animate-pulse">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                        setConfirmDeleteId(null);
                      }}
                      className="text-[10px] font-bold text-white hover:underline"
                    >
                      LÖSCHEN?
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(null);
                      }}
                      className="text-[10px] text-gray-300 hover:text-white"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditName(project.name);
                        setEditingId(project.id);
                      }}
                      className="p-1 hover:bg-gray-700 rounded text-gray-500 hover:text-white transition-colors"
                      title="Umbenennen"
                    >
                      <Pencil size={13} strokeWidth={2} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(project.id);
                      }}
                      className="p-1 hover:bg-red-900/50 rounded text-gray-500 hover:text-red-400 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        {projects.length === 0 && (
          <div className="text-center p-4 text-gray-500 text-sm">
            Keine Dossiers vorhanden.
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={onClearCache}
          className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors flex items-center justify-center gap-2"
          title="Löscht alle Backups (Snapshots), um Speicherplatz freizugeben"
        >
          <span>🧹</span> Speicherplatz freigeben
        </button>
      </div>
    </div>
  );
}
