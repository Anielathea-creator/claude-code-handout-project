export interface ToolCallRecord {
  name: string;
  args: Record<string, any>;
  /** true = Tool wurde erfolgreich ausgeführt, false = Fehler / Abbruch. */
  success?: boolean;
  /** Kurzer Text, der im Chat neben dem Tool-Call angezeigt wird. */
  message?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  parts?: any[];
  /** Tool-Aufrufe, die in dieser Nachricht getätigt wurden (nur bei role='model'). */
  toolCalls?: ToolCallRecord[];
}

export interface Snapshot {
  id: string;
  timestamp: number;
  name: string;
  html: string;
  theme?: string;
}

export interface Project {
  id: string;
  name: string;
  html: string;
  chatHistory: ChatMessage[];
  isDrafting?: boolean;
  isImporting?: boolean;
  theme?: string;
  selectedTemplateIds?: string[];
  taskInstructions?: string;
  targetAudience?: string;
  didacticApproach?: 'inductive' | 'deductive' | 'free';
  didacticScope?: 'all' | 'selected';
  didacticChapters?: string;
  snapshots?: Snapshot[];
}
