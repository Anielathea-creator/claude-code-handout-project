/**
 * Tool-Registry für den KI-Chat.
 *
 * Definiert die FunctionDeclarations, die Gemini beim chats.create()
 * mitgegeben werden, und einen Dispatcher, der die Tool-Aufrufe auf die
 * Block-Engine + Bildgenerierung routet.
 */

import { Type, type FunctionDeclaration, type GoogleGenAI } from '@google/genai';
import {
  appendBlock,
  deleteBlock,
  findBlock,
  formatBlockOverview,
  injectImageIntoBlock,
  insertBlockAfter,
  parseBlocks,
  parseTaskTitle,
  renumberAfterInsert,
  replaceBlock,
  type BlockMatchFail,
} from './blockOps';
import { generateImage, type AspectRatio } from './imageGen';
import { EXERCISE_TEMPLATES } from '../constants';

export const AVAILABLE_THEMES = ['blue', 'emerald', 'violet', 'indigo', 'amber', 'rose'] as const;
export type ThemeName = typeof AVAILABLE_THEMES[number];

/** Template-IDs, die über insert_template einfügbar sind. */
export const TEMPLATE_IDS = EXERCISE_TEMPLATES.map((t) => t.id);

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'insert_template',
    description:
      'BEVORZUGTES Tool zum Einfügen einer neuen Aufgabe, wenn der Aufgabentyp einem vorhandenen Template entspricht (Steckbrief, Lückentext, Tabelle, Matching, Venn-Diagramm etc.). Fügt das EXAKTE Template-HTML ein und setzt den angegebenen Titel. Dies garantiert korrekte Layouts (z.B. Bild-Platzhalter im Steckbrief) und einen EINZIGEN avoid-break-Block. Nutze insert_block NUR, wenn kein passendes Template existiert.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        template_id: {
          type: Type.STRING,
          enum: [...TEMPLATE_IDS],
          description:
            'Die ID des einzufügenden Templates (z.B. "steckbrief", "lueckentext", "table", "matching").',
        },
        title: {
          type: Type.STRING,
          description:
            'Der neue Aufgaben-Titel (ersetzt den Platzhalter "Aufgabe: …" im Template). Z.B. "Aufgabe A.3: Steckbrief zur Eiche".',
        },
        after_block_title: {
          type: Type.STRING,
          description:
            'Titel des Blocks, nach dem eingefügt werden soll. Leer lassen, um am Ende anzuhängen.',
        },
      },
      required: ['template_id', 'title'],
    },
  },
  {
    name: 'get_block',
    description:
      'Liefert den vollständigen HTML-Code eines Blocks (Aufgabe oder Merkblatt) zurück, identifiziert per Titel (<h3>-Text) oder per Index-Syntax "#0", "#1", …',
    parameters: {
      type: Type.OBJECT,
      properties: {
        block_title: {
          type: Type.STRING,
          description:
            'Titel des Ziel-Blocks (z.B. "Aufgabe 3: Lückentext") oder Index-Syntax (z.B. "#2").',
        },
      },
      required: ['block_title'],
    },
  },
  {
    name: 'update_block',
    description:
      'Ersetzt einen bestehenden Block komplett durch neues HTML. Nutze dies für Änderungen an einer einzelnen Aufgabe/Merkblatt. Das new_html MUSS ein <div class="avoid-break …"> … </div> mit einem <h3>-Titel sein.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        block_title: {
          type: Type.STRING,
          description:
            'Titel des Ziel-Blocks (z.B. "Aufgabe 3: Lückentext") oder Index-Syntax (z.B. "#2").',
        },
        new_html: {
          type: Type.STRING,
          description:
            'Vollständiger neuer HTML-Block inkl. <div class="avoid-break …"> und <h3>-Titel.',
        },
      },
      required: ['block_title', 'new_html'],
    },
  },
  {
    name: 'insert_block',
    description:
      'Fügt einen neuen Block ein – entweder direkt nach einem Referenzblock (after_block_title) oder am Ende des Dossiers. Der new_html MUSS ein <div class="avoid-break …"> … </div> mit einem <h3>-Titel sein.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        new_html: {
          type: Type.STRING,
          description: 'Vollständiger neuer HTML-Block.',
        },
        after_block_title: {
          type: Type.STRING,
          description:
            'Titel des Blocks, nach dem eingefügt werden soll. Leer lassen, um am Ende anzuhängen.',
        },
      },
      required: ['new_html'],
    },
  },
  {
    name: 'delete_block',
    description: 'Entfernt einen Block vollständig aus dem Dossier.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        block_title: {
          type: Type.STRING,
          description: 'Titel des zu löschenden Blocks oder Index-Syntax ("#2").',
        },
      },
      required: ['block_title'],
    },
  },
  {
    name: 'update_theme',
    description: 'Wechselt das Farbschema des gesamten Dossiers.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        theme: {
          type: Type.STRING,
          enum: [...AVAILABLE_THEMES],
          description: 'Neues Farbschema.',
        },
      },
      required: ['theme'],
    },
  },
  {
    name: 'generate_image',
    description:
      'Generiert ein Bild per KI und setzt es in den angegebenen Block ein (ersetzt dort ggf. einen image-placeholder-trigger oder ein bestehendes <img>).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description:
            'Detaillierter englischer oder deutscher Prompt für die Bildgenerierung (z.B. "Eine Eiche im Herbst mit bunten Blättern").',
        },
        target_block_title: {
          type: Type.STRING,
          description: 'Titel des Blocks, in den das Bild eingefügt werden soll.',
        },
        aspect_ratio: {
          type: Type.STRING,
          enum: ['1:1', '4:3', '16:9', '3:4', '9:16'],
          description: 'Seitenverhältnis (default 4:3).',
        },
      },
      required: ['prompt', 'target_block_title'],
    },
  },
];

/** Resultat eines Tool-Aufrufs, das an die KI zurückgespielt wird. */
export interface ToolResult {
  /** Ob die Operation erfolgreich war. */
  success: boolean;
  /** Menschenlesbare Meldung für die KI UND für das Chat-UI. */
  message: string;
  /** Optionale strukturierte Details (z.B. Liste der Kandidaten bei Mehrdeutigkeit). */
  details?: any;
  /** Menschenlesbare Zusammenfassung für den Snapshot-Namen. */
  snapshotLabel?: string;
}

export interface ToolContext {
  /** Aktueller HTML-Stand des Dossiers. */
  getHtml(): string;
  /** Aktuelles Theme. */
  getTheme(): string;
  /** HTML aktualisieren (löst onUpdateHtml aus). */
  setHtml(newHtml: string): void;
  /** Theme aktualisieren (löst onUpdateTheme aus). */
  setTheme(newTheme: string): void;
  /** Gemini-Client für Bildgenerierung. */
  aiClient: GoogleGenAI;
  /** Optionaler Progress-Callback für Langläufer (Bildgenerierung). */
  onProgress?(msg: string): void;
}

/**
 * Führt einen einzelnen Tool-Aufruf aus.
 */
export async function executeTool(
  name: string,
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<ToolResult> {
  switch (name) {
    case 'get_block':
      return doGetBlock(args, ctx);
    case 'update_block':
      return doUpdateBlock(args, ctx);
    case 'insert_block':
      return doInsertBlock(args, ctx);
    case 'insert_template':
      return doInsertTemplate(args, ctx);
    case 'delete_block':
      return doDeleteBlock(args, ctx);
    case 'update_theme':
      return doUpdateTheme(args, ctx);
    case 'generate_image':
      return doGenerateImage(args, ctx);
    default:
      return { success: false, message: `Unbekanntes Tool: "${name}".` };
  }
}

// ---------------------------------------------------------------------------
// Einzelne Tool-Handler

function doGetBlock(args: Record<string, any>, ctx: ToolContext): ToolResult {
  const target = String(args.block_title ?? '').trim();
  if (!target) return { success: false, message: 'block_title ist leer.' };
  const m = findBlock(ctx.getHtml(), target);
  if (m.ok) {
    return {
      success: true,
      message: `Block #${m.block.index} "${m.block.title}" gefunden.`,
      details: { index: m.block.index, title: m.block.title, html: m.block.outerHtml },
    };
  }
  return missToResult(m as BlockMatchFail);
}

function doUpdateBlock(args: Record<string, any>, ctx: ToolContext): ToolResult {
  const target = String(args.block_title ?? '').trim();
  const newHtml = String(args.new_html ?? '').trim();
  if (!target) return { success: false, message: 'block_title ist leer.' };
  if (!newHtml) return { success: false, message: 'new_html ist leer.' };

  const res = replaceBlock(ctx.getHtml(), target, newHtml);
  if (res.ok) {
    ctx.setHtml(res.html);
    return {
      success: true,
      message: `Block "${res.replaced.title}" wurde aktualisiert.`,
      snapshotLabel: `Block editiert: ${res.replaced.title}`,
    };
  }
  return missToResult(res as BlockMatchFail);
}

function doInsertBlock(args: Record<string, any>, ctx: ToolContext): ToolResult {
  const newHtml = String(args.new_html ?? '').trim();
  const after = String(args.after_block_title ?? '').trim();
  if (!newHtml) return { success: false, message: 'new_html ist leer.' };

  if (!after) {
    const updated = appendBlock(ctx.getHtml(), newHtml);
    ctx.setHtml(updated);
    const blocks = parseBlocks(updated);
    const lastTitle = blocks.length > 0 ? blocks[blocks.length - 1].title : '(unbenannt)';
    return {
      success: true,
      message: `Block "${lastTitle}" am Ende eingefügt.`,
      snapshotLabel: `Block eingefügt: ${lastTitle}`,
    };
  }

  const res = insertBlockAfter(ctx.getHtml(), after, newHtml);
  if (!res.ok) return missToResult(res as BlockMatchFail);

  const insertedIndex = res.afterBlock.index + 1;
  let finalHtml = res.html;

  // Auto-Renumbering: Wenn der neue Block dem Schema "Aufgabe X.N:" folgt UND
  // keine Teilaufgabe ist, schiebe alle nachfolgenden Aufgaben mit gleichem
  // Präfix um +1 weiter, damit keine doppelten Nummern entstehen.
  const newBlocks = parseBlocks(finalHtml);
  const newBlock = newBlocks[insertedIndex];
  const parsed = newBlock ? parseTaskTitle(newBlock.title) : null;
  let renumbered = false;
  if (parsed && !parsed.letterSuffix) {
    const before = finalHtml;
    finalHtml = renumberAfterInsert(finalHtml, insertedIndex);
    if (finalHtml !== before) renumbered = true;
  }

  ctx.setHtml(finalHtml);
  const newTitle = newBlock?.title ?? '(unbenannt)';
  const renumberNote = renumbered ? ' – Folge-Aufgaben automatisch umnummeriert.' : '';
  return {
    success: true,
    message: `Block "${newTitle}" wurde nach "${res.afterBlock.title}" eingefügt.${renumberNote}`,
    snapshotLabel: `Block eingefügt: ${newTitle}`,
  };
}

function doInsertTemplate(args: Record<string, any>, ctx: ToolContext): ToolResult {
  const templateId = String(args.template_id ?? '').trim();
  const title = String(args.title ?? '').trim();
  const after = String(args.after_block_title ?? '').trim();

  if (!templateId) return { success: false, message: 'template_id ist leer.' };
  if (!title) return { success: false, message: 'title ist leer.' };

  const template = EXERCISE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return {
      success: false,
      message: `Template "${templateId}" existiert nicht. Verfügbare Templates: ${TEMPLATE_IDS.join(', ')}`,
    };
  }

  // Template-HTML vorbereiten: THEME durch aktuelles Theme ersetzen und den
  // Platzhalter-Titel ("Aufgabe: …") durch den übergebenen Titel ersetzen.
  const theme = ctx.getTheme() || 'blue';
  let html = template.html.replace(/THEME/g, theme);

  // Ersetze den ersten <h3>-Inhalt durch den gewünschten Titel (egal wie das
  // Platzhalter-"Aufgabe: …" formuliert war).
  html = html.replace(
    /(<h3[^>]*>)([\s\S]*?)(<\/h3>)/,
    (_m, open, _inner, close) => `${open}${title}${close}`,
  );

  // Einfügen
  if (!after) {
    const updated = appendBlock(ctx.getHtml(), html);
    ctx.setHtml(updated);
    // Den konkret eingefügten Block (mit finalem Titel) zurückgeben, damit die
    // KI ohne weiteren get_block-Call ein update_block für thematische Anpassung
    // machen kann.
    const blocksAfter = parseBlocks(updated);
    const insertedBlock = blocksAfter[blocksAfter.length - 1];
    return {
      success: true,
      message: `Template "${template.name}" als "${title}" am Ende eingefügt.`,
      snapshotLabel: `Template eingefügt: ${title}`,
      details: {
        inserted_block_title: insertedBlock?.title ?? title,
        inserted_block_html: insertedBlock?.outerHtml ?? html,
        hint: 'Falls der Nutzer ein konkretes Thema nannte (z.B. "Steckbrief zu CSS"): Rufe jetzt update_block auf, um die Template-Labels und Beispiel-Werte thematisch anzupassen. Die Feld-Struktur und Klassen MÜSSEN erhalten bleiben.',
      },
    };
  }

  const res = insertBlockAfter(ctx.getHtml(), after, html);
  if (!res.ok) return missToResult(res as BlockMatchFail);

  const insertedIndex = res.afterBlock.index + 1;
  let finalHtml = res.html;

  // Auto-Renumbering wie bei insert_block
  const parsed = parseTaskTitle(title);
  let renumbered = false;
  if (parsed && !parsed.letterSuffix) {
    const before = finalHtml;
    finalHtml = renumberAfterInsert(finalHtml, insertedIndex);
    if (finalHtml !== before) renumbered = true;
  }

  ctx.setHtml(finalHtml);

  const blocksAfter = parseBlocks(finalHtml);
  const insertedBlock = blocksAfter[insertedIndex];

  const renumberNote = renumbered ? ' – Folge-Aufgaben automatisch umnummeriert.' : '';
  return {
    success: true,
    message: `Template "${template.name}" als "${title}" nach "${res.afterBlock.title}" eingefügt.${renumberNote}`,
    snapshotLabel: `Template eingefügt: ${title}`,
    details: {
      inserted_block_title: insertedBlock?.title ?? title,
      inserted_block_html: insertedBlock?.outerHtml ?? html,
      hint: 'Falls der Nutzer ein konkretes Thema nannte (z.B. "Steckbrief zu CSS"): Rufe jetzt update_block auf, um die Template-Labels und Beispiel-Werte thematisch anzupassen. Die Feld-Struktur und Klassen MÜSSEN erhalten bleiben.',
    },
  };
}

function doDeleteBlock(args: Record<string, any>, ctx: ToolContext): ToolResult {
  const target = String(args.block_title ?? '').trim();
  if (!target) return { success: false, message: 'block_title ist leer.' };

  const res = deleteBlock(ctx.getHtml(), target);
  if (res.ok) {
    ctx.setHtml(res.html);
    return {
      success: true,
      message: `Block "${res.deleted.title}" wurde gelöscht.`,
      snapshotLabel: `Block gelöscht: ${res.deleted.title}`,
    };
  }
  return missToResult(res as BlockMatchFail);
}

function doUpdateTheme(args: Record<string, any>, ctx: ToolContext): ToolResult {
  const theme = String(args.theme ?? '').trim();
  if (!AVAILABLE_THEMES.includes(theme as ThemeName)) {
    return {
      success: false,
      message: `Ungültiges Theme "${theme}". Erlaubt: ${AVAILABLE_THEMES.join(', ')}.`,
    };
  }
  ctx.setTheme(theme);
  return {
    success: true,
    message: `Farbschema auf "${theme}" gewechselt.`,
    snapshotLabel: `Theme gewechselt: ${theme}`,
  };
}

async function doGenerateImage(
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const prompt = String(args.prompt ?? '').trim();
  const targetTitle = String(args.target_block_title ?? '').trim();
  const aspectRatio = (String(args.aspect_ratio ?? '4:3') as AspectRatio) || '4:3';

  if (!prompt) return { success: false, message: 'prompt ist leer.' };
  if (!targetTitle) return { success: false, message: 'target_block_title ist leer.' };

  const match = findBlock(ctx.getHtml(), targetTitle);
  if (!match.ok) return missToResult(match as BlockMatchFail);
  const block = match.block;

  ctx.onProgress?.(`Generiere Bild für "${block.title}" …`);

  const imgRes = await generateImage(ctx.aiClient, prompt, aspectRatio);
  if (imgRes.ok === false) {
    return { success: false, message: imgRes.error };
  }

  // Block nach der Bildgenerierung ERNEUT holen – während der ~5 s Generierung
  // kann der User oder ein anderes Tool das HTML verändert haben, sonst würden
  // wir ein veraltetes outerHtml injizieren und die Änderung ginge verloren.
  const freshMatch = findBlock(ctx.getHtml(), block.index);
  if (!freshMatch.ok) {
    return {
      success: false,
      message: `Block "${block.title}" ist während der Bildgenerierung verschwunden.`,
    };
  }
  const freshBlock = freshMatch.block;

  const newBlockHtml = injectImageIntoBlock(freshBlock.outerHtml, imgRes.dataUrl, prompt);
  const replaceRes = replaceBlock(ctx.getHtml(), freshBlock.index, newBlockHtml);
  if (replaceRes.ok) {
    ctx.setHtml(replaceRes.html);
    return {
      success: true,
      message: `Bild in Block "${freshBlock.title}" eingefügt.`,
      snapshotLabel: `Bild generiert: ${freshBlock.title}`,
    };
  }
  return missToResult(replaceRes as BlockMatchFail);
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen

function missToResult(
  m: Exclude<ReturnType<typeof findBlock>, { ok: true }>,
): ToolResult {
  if (m.reason === 'ambiguous') {
    const list = m.candidates
      .map((b) => `  #${b.index} "${b.title}"`)
      .join('\n');
    return {
      success: false,
      message:
        `Der Titel ist nicht eindeutig – mehrere passende Blöcke gefunden.\n` +
        `Bitte nutze den exakten Titel oder die Index-Syntax ("#0", "#1", …):\n${list}`,
      details: { candidates: m.candidates },
    };
  }
  // not_found
  const list = m.available
    .map((b) => `  #${b.index} "${b.title}"`)
    .join('\n');
  return {
    success: false,
    message:
      `Kein passender Block gefunden.\n` +
      `Verfügbare Blöcke:\n${list || '  (keine)'}`,
    details: { available: m.available },
  };
}

/**
 * Baut einen Überblick der verfügbaren Templates für den System-Prompt.
 */
export function formatTemplatesForPrompt(selectedTemplateIds: string[] | undefined): string {
  if (!selectedTemplateIds || selectedTemplateIds.length === 0) {
    return 'Keine spezifischen Templates gewählt. Nutze eigene Strukturen mit den bekannten Tailwind-Klassen.';
  }
  const selected = EXERCISE_TEMPLATES.filter((t) => selectedTemplateIds.includes(t.id));
  return selected
    .map((t) => `Template "${t.id}" (${t.name}):\n${t.html}`)
    .join('\n\n---\n\n');
}

export { formatBlockOverview };
