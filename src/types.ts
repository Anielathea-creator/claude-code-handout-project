export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  parts?: any[];
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
  snapshots?: Snapshot[];
}
