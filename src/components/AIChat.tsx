import { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage, ToolCallRecord } from '../types';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { EXERCISE_TEMPLATES } from '../constants';
import {
  TOOL_DECLARATIONS,
  executeTool,
  formatBlockOverview,
  formatTemplatesForPrompt,
  type ToolContext,
  type ToolResult,
} from '../lib/aiTools';
import { withRetry } from '../lib/retry';
import { renderAudiencePromptBlock, type AudienceLevel } from '../lib/audienceProfiles';
import { renderDidacticPromptBlock, type DidacticApproach, type DidacticScope } from '../lib/didacticProfiles';

interface AIChatProps {
  chatHistory: ChatMessage[];
  onUpdateHistory: (history: ChatMessage[]) => void;
  currentHtml: string;
  isDrafting?: boolean;
  isImporting?: boolean;
  onConfirmDraft?: (html: string) => void;
  theme?: string;
  selectedTemplateIds?: string[];
  taskInstructions?: string;
  targetAudience?: AudienceLevel | string;
  didacticApproach?: DidacticApproach;
  didacticScope?: DidacticScope;
  didacticChapters?: string;
  width?: number;
  onAddSnapshot?: (name: string) => void;
  onUpdateHtml?: (html: string) => void;
  onUpdateTheme?: (theme: string) => void;
  pendingPrompt?: { text: string; autoSend: boolean; hiddenContext?: string; nonce: number } | null;
}

export function AIChat({
  chatHistory,
  onUpdateHistory,
  currentHtml,
  isDrafting,
  isImporting,
  onConfirmDraft,
  theme,
  selectedTemplateIds,
  taskInstructions,
  targetAudience,
  didacticApproach,
  didacticScope,
  didacticChapters,
  width,
  onAddSnapshot,
  onUpdateHtml,
  onUpdateTheme,
  pendingPrompt
}: AIChatProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showSnapshotFeedback, setShowSnapshotFeedback] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasRequestedDraftRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastPendingPromptNonceRef = useRef<number | null>(null);

  // Textarea-Höhe zurücksetzen, wenn der Input-State von außen geleert wird
  // (z.B. nach dem Senden). onInput triggert dabei nicht, deshalb hier explizit.
  useEffect(() => {
    if (textareaRef.current && input === '') {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  // Helper to prune history for API calls to avoid token limits
  const pruneHistoryForApi = (history: ChatMessage[], maxMessages = 15) => {
    // Keep only the last N messages for context
    const recentHistory = history.slice(-maxMessages);
    
    return recentHistory.map((msg, index, arr) => {
      const isLastMessage = index === arr.length - 1;
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: msg.parts?.map(part => {
          // If it's not the last message and it has large inlineData (base64), replace it
          if (part.inlineData && !isLastMessage) {
            return { text: "[Anhang aus früherer Nachricht entfernt]" };
          }
          return part;
        }) || [{ text: msg.content }]
      };
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isGenerating, isGeneratingHtml]);

  useEffect(() => {
    if (streamingText) scrollToBottom();
  }, [streamingText]);

  const aiClient = useMemo(() => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    return key ? new GoogleGenAI({ apiKey: key }) : null;
  }, []);

  // Auto-send initial briefing if in drafting mode and only 1 message exists
  useEffect(() => {
    if (isDrafting && chatHistory.length === 1 && chatHistory[0].role === 'user' && !isGenerating && aiClient && !hasRequestedDraftRef.current) {
      const generateDraft = async () => {
        hasRequestedDraftRef.current = true;
        setIsGenerating(true);
        try {
          const audienceBlock = renderAudiencePromptBlock(targetAudience as AudienceLevel | '' | undefined, taskInstructions);
          const didacticBlock = renderDidacticPromptBlock(didacticApproach, didacticScope, didacticChapters);
          const chat = aiClient.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
              systemInstruction: `Du bist ein erfahrener Lehrmittelautor. Erstelle basierend auf dem Briefing einen strukturierten Entwurf (Inhaltsübersicht) für ein Dossier. Antworte in Markdown. Generiere noch keinen HTML-Code.

              STRUKTUR & NUMMERIERUNG (WICHTIG):
              - Kapitel (h1): "Kapitel 1: [Titel]", "Kapitel 2: [Titel]" etc. (Wenn es nur 1 Kapitel gibt, lass die Nummer weg).
              - Unterthemen (h2): "A: [Titel]", "B: [Titel]" etc.
              - Aufgaben (h3): "Aufgabe [Themenbuchstabe].[Nummer]: [Titel]" (z.B. "Aufgabe A.1: ...", "Aufgabe B.2: ...").

${audienceBlock}

${didacticBlock}`,
            },
          });
          
          const messageContent = chatHistory[0].parts ? chatHistory[0].parts : chatHistory[0].content;
          setStreamingText('');
          const stream = await withRetry(
            () => chat.sendMessageStream({ message: messageContent as any }),
            {
              onRetry: (attempt) => {
                setStreamingText(`⏳ Server \u00fcberlastet – Versuch ${attempt + 1}/4 …`);
              },
            },
          );
          let fullText = '';
          for await (const chunk of stream) {
            fullText += (chunk.text || '');
            setStreamingText(fullText);
          }
          setStreamingText('');

          onUpdateHistory([
            ...chatHistory,
            { role: 'model', content: fullText || 'Kein Entwurf generiert.' },
          ]);
        } catch (error: any) {
          console.error('Draft error:', error);
          let errorMessage = `Fehler beim Erstellen des Entwurfs: ${error.message}`;
          
          if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
            errorMessage = '⚠️ Dein KI-Quota für heute ist aufgebraucht. Bitte versuche es in ein paar Stunden erneut.';
            // Do NOT reset hasRequestedDraftRef.current here to avoid infinite loop
          } else if (error.message?.includes('Unsupported MIME type')) {
            errorMessage = '⚠️ Das Dateiformat wird aktuell nicht direkt unterstützt. Bitte wandle dein Dokument in ein PDF oder eine Textdatei (.txt) um.';
          } else {
            hasRequestedDraftRef.current = false; // Allow retry for other errors
          }
          
          onUpdateHistory([
            ...chatHistory,
            { role: 'model', content: errorMessage },
          ]);
        } finally {
          setIsGenerating(false);
        }
      };
      generateDraft();
    }
  }, [isDrafting, chatHistory, isGenerating, aiClient, onUpdateHistory]);

  // Show error if AI client is not available (missing API key)
  useEffect(() => {
    if ((isDrafting || isImporting) && chatHistory.length === 1 && !aiClient && !hasRequestedDraftRef.current) {
      hasRequestedDraftRef.current = true;
      onUpdateHistory([
        ...chatHistory,
        { role: 'model', content: '⚠️ **Kein API-Key gefunden.** Bitte setze die Umgebungsvariable `VITE_GEMINI_API_KEY` oder `GEMINI_API_KEY` und starte den Server neu.' },
      ]);
    }
  }, [isDrafting, isImporting, chatHistory, aiClient, onUpdateHistory]);

  // Auto-generate HTML directly if in importing mode
  useEffect(() => {
    if (isImporting && chatHistory.length === 1 && chatHistory[0].role === 'user' && !isGeneratingHtml && aiClient && !hasRequestedDraftRef.current && onConfirmDraft) {
      const generateImportHtml = async () => {
        hasRequestedDraftRef.current = true;
        setIsGeneratingHtml(true);
        try {
          // In import mode, provide ALL templates so the AI can match each task to the best fitting one
          const allTemplatesForImport = EXERCISE_TEMPLATES.map(t => `Template ID: ${t.id}\nName: ${t.name}\nHTML:\n${t.html}`).join('\n\n---\n\n');
          const audienceBlock = renderAudiencePromptBlock(targetAudience as AudienceLevel | '' | undefined, taskInstructions);
          const didacticBlockImport = renderDidacticPromptBlock(didacticApproach, didacticScope, didacticChapters);
          const amountsSection = audienceBlock
            ? `${audienceBlock}\n\nDie MENGEN im Profil oben ERSETZEN alle globalen Mindestwerte. Folge ausschliesslich den Zahlen im Profil.`
            : `MINDEST-INHALTSANFORDERUNGEN (PFLICHT beim Generieren):
- Tabellen: Mindestens 6-8 Zeilen mit vollständigem, themenspezifischem Inhalt
- Lückentexte: Ein vollständiger Absatz (5-8 Sätze) mit 8-15 Lücken, kontextreich und zusammenhängend
- Eindringling / Sortieraufgaben: Mindestens 6-8 Einträge (a bis h)
- Matching / Zuordnen: Mindestens 6-8 Paare
- Ankreuz-Tabellen: Mindestens 6-8 Aussagen/Kriterien
- Klassifizierung / Wörter sortieren: Mindestens 12-16 Wörter/Begriffe
- Offene Fragen / Schreibaufgaben: Eine ausführliche, präzise Frage mit konkretem Kontext (kein allgemeiner Platzhalter)
- Textarbeit / Anstreichen: Ein ganzer Absatz (8-12 Sätze) mit genügend relevanten Elementen`;

          const chat = aiClient.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
              maxOutputTokens: 32768,
              systemInstruction: `Du bist ein Frontend-Entwickler und Lehrmittelautor. Der Nutzer hat ein Dokument mit Aufgaben hochgeladen und Anweisungen gegeben.
Generiere nun den vollständigen HTML-Code für das Dossier basierend auf dem Dokument und den Anweisungen.
Verwende Tailwind CSS für das Styling.

FARBSCHEMA (OBERSTE STYLE-REGEL – MUSS SICHTBAR SEIN):
Das Farbschema ist "${theme || 'blue'}". Das komplette Dossier MUSS in dieser Farbe gestaltet sein.
Verwende IMMER ${theme || 'blue'}-Varianten der Tailwind-Farbskala – NIEMALS schwarz, grau oder default.
Konkrete Pflicht-Klassen:
- Haupttitel <h1>: class="editable text-[36pt] font-black text-${theme || 'blue'}-700 text-center"
- Kapitel <h2>: class="editable text-[20pt] font-bold text-${theme || 'blue'}-700 border-b-2 border-${theme || 'blue'}-300 pb-1"
- Aufgaben-Titel <h3>: class="editable font-bold text-[14pt] mb-1 text-${theme || 'blue'}-700"
- Merkblatt-Container: class="bg-${theme || 'blue'}-50 border-l-4 border-${theme || 'blue'}-500 p-4 rounded-r-lg"
- Tabellen-Header <th>: class="editable bg-${theme || 'blue'}-100 border border-${theme || 'blue'}-300 p-2 font-bold"
- Akzent-Borders: border-${theme || 'blue'}-200 / border-${theme || 'blue'}-300
Prüfe am Ende der Generierung: Jede Überschrift und jeder Akzent muss ${theme || 'blue'}-Klassen enthalten. Wenn nicht → korrigiere.

VOLLSTÄNDIGKEIT (PFLICHT – OBERSTE PRIORITÄT):
Du MUSST JEDE EINZELNE Aufgabe aus dem hochgeladenen Dokument übernehmen – ohne Ausnahme.
- Keine Aufgabe darf ausgelassen, zusammengefasst oder mit einer anderen verschmolzen werden.
- Erstelle so viele Seiten wie nötig, um ALLE Aufgaben unterzubringen.
- Falls das Dokument 20 Aufgaben enthält, müssen exakt 20 Aufgaben im generierten HTML erscheinen.
- Wenn du unsicher bist, ob etwas eine eigenständige Aufgabe ist: Übernimm es als eigene Aufgabe.
- Zähle beim Generieren die Aufgaben mit und stelle sicher, dass die Anzahl mit dem Dokument übereinstimmt.

AUFGABEN-ZUORDNUNG ZU TEMPLATES (PFLICHT):
Analysiere jede Aufgabe aus dem hochgeladenen Dokument und ordne sie dem am besten passenden Template aus der Liste unten zu. Gehe dabei so vor:
1. Erkenne den Aufgabentyp (z.B. Lückentext, Konjugation, Fehler korrigieren, offene Frage, Tabelle, usw.)
2. Wähle das Template, dessen Struktur und Layout am besten zum Aufgabentyp passt.
3. Nutze die HTML-Struktur dieses Templates als Gerüst und fülle es mit dem echten Inhalt aus dem Dokument.
4. Wenn keine Aufgabe exakt zu einem Template passt: Gestalte diese Aufgabe selbst, aber verwende dabei dieselben CSS-Klassen, Abstände und Layout-Elemente wie die anderen Templates (editable, gap-line, schreib-linie, is-answer, avoid-break usw.), damit das Gesamtbild einheitlich bleibt.

WICHTIG: Die Templates enthalten absichtlich minimalen Platzhalter-Inhalt – beim Generieren musst du den echten Inhalt aus dem hochgeladenen Dokument einsetzen und bei Bedarf ausbauen!

${amountsSection}

${didacticBlockImport}

Passe das Theme-Farbschema an: text-${theme || 'blue'}-700
Beachte zudem folgende spezifische Anweisungen des Lehrers: ${taskInstructions || 'Keine'}

ALLE VERFÜGBAREN TEMPLATES (wähle für jede Aufgabe das passendste):
${allTemplatesForImport}

WICHTIG FÜR DAS LAYOUT:
ACHTUNG: Jeder direkte Container im Dossier ist EXAKT EINE A4-Seite (29.7cm hoch). Inhalt der überläuft wird HART ABGESCHNITTEN! Du musst die Seitenaufteilung selbst steuern.
WICHTIG: Erstelle so viele Seiten-Container wie nötig, um ALLE Aufgaben unterzubringen. Die Anzahl der Seiten ist NICHT begrenzt. Kürze oder überspringe NIEMALS Aufgaben, um sie auf weniger Seiten zu pressen.

1. TITELBLATT: Nur ein einfacher Platzhalter mit dem Hauptthema als Überschrift – KEINE Bilder, KEINE Name/Datum-Felder, KEINE Dekoration. Die Gestaltung erfolgt später durch den Nutzer.
2. Seitenränder: Nutze überall "p-[2.5cm]" für alle Seiten-Container.
3. SEITENAUFTEILUNG – PFLICHT:
   a) Titelblatt: 1 Container → page-break
   b) Inhaltsverzeichnis: 1 Container → page-break
   c) Pro Unterthema: h2-Überschrift + Merkblatt in EIGENEM Container (1 Seite) → page-break
   d) Aufgaben: Verteile auf mehrere Container je nach Grösse:
      - Kurze Aufgaben (1-3 Zeilen): 3-4 pro Seiten-Container
      - Mittlere Aufgaben (Tabelle, Liste 4-8 Zeilen): 2 pro Seiten-Container
      - Grosse Aufgaben (langer Text, viele Zeilen): 1 pro Seiten-Container
      - Nach jedem vollen Seiten-Container: page-break + neuer Container
4. AUFGABEN: Jede Aufgabe in "avoid-break mb-6" wrappen (verhindert Schnitt mitten in der Aufgabe).
5. Lösungen in Lückentexten:
   - <span class="gap-line is-answer" contenteditable="true">Lösung</span>
   - Reine Lücke: <span class="gap-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
   - <span class="is-strikethrough-answer">Falsches Wort</span>
   - Längere Freitext-Antworten: <div class="schreib-linie editable" contenteditable="true"><span class="is-answer">Musterlösung</span></div>
6. Jedes Textelement (p, h1, h2, h3, td, th, li) das editierbar sein soll: Klasse "editable" + contenteditable="true".
7. Aufgabentitel (h3): class="editable font-bold text-[14pt] mb-2 text-${theme || 'blue'}-700"

WICHTIG FÜR DIE ANTWORT:
Antworte AUSSCHLIESSLICH mit dem HTML-Code. Keine Markdown-Formatierung, kein Text davor/danach.
Strukturiere das HTML wie folgt:
1. Start-Container: <div class="max-w-4xl mx-auto bg-white shadow-lg rounded-xl">
2. Titelseite – NUR ein einfacher Platzhalter mit dem Hauptthema als Überschrift. KEINE aufwändige Gestaltung, KEIN Bild, KEINE Name/Datum-Felder. Exakt dieses HTML verwenden:
   <div class="title-page-placeholder p-[2.5cm] min-h-[29.7cm] flex flex-col justify-center items-center relative border-b border-gray-100">
     <h1 contenteditable="true" class="editable text-[36pt] font-black text-${theme || 'blue'}-700 text-center">[HAUPTTHEMA HIER EINSETZEN]</h1>
   </div>
3. <div class="page-break avoid-break"></div>
4. Inhaltsverzeichnis: <div class="p-[2.5cm]"><h2 class="editable text-[20pt] font-bold mb-6 border-b-2 border-black pb-2" contenteditable="true">Inhaltsverzeichnis</h2><ul id="toc-list" class="space-y-1 mb-8 max-w-2xl text-[14pt]"><li class="italic text-gray-500">Klicke oben auf "Inhaltsverzeichnis Auto-Sync"...</li></ul></div>
5. <div class="page-break avoid-break"></div>
6. Für jedes Unterthema:
   a) <div class="p-[2.5cm] space-y-6"> mit h2 und — NUR falls die MERKBLATT-REGEL des DIDAKTISCHEN AUFBAUS dies vorschreibt oder der Lehrer im Briefing explizit Merkblatt-Inhalt angegeben hat — einem Merkblatt (Merkblatt MUSS in <div class="avoid-break ..."> gewrappt sein!). Ohne Merkblatt enthält dieser Container nur die h2-Überschrift.</div>
   b) <div class="page-break avoid-break"></div>
   c) <div class="p-[2.5cm] space-y-6"> mit ersten Aufgaben (2-3 je nach Grösse) </div>
   d) Falls mehr Aufgaben: <div class="page-break avoid-break"></div> + neuer <div class="p-[2.5cm] space-y-6"> usw.`,
            },
          });

          const messageContent = chatHistory[0].parts ? chatHistory[0].parts : chatHistory[0].content;
          setStreamingText('');
          const stream = await withRetry(
            () => chat.sendMessageStream({ message: messageContent as any }),
            {
              onRetry: (attempt) => {
                setStreamingText(`⏳ Server \u00fcberlastet – Versuch ${attempt + 1}/4 …`);
              },
            },
          );
          let html = '';
          for await (const chunk of stream) {
            html += (chunk.text || '');
            setStreamingText(html);
          }
          setStreamingText('');

          // Clean up markdown formatting if the model still includes it
          html = html.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();

          onConfirmDraft(html);
        } catch (error: any) {
          console.error('Import HTML generation error:', error);
          let errorMessage = `Fehler bei der HTML-Generierung: ${error.message}`;
          
          if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
            errorMessage = '⚠️ Dein KI-Quota für heute ist aufgebraucht. Bitte versuche es später erneut.';
            // Do NOT reset hasRequestedDraftRef.current here to avoid infinite loop
          } else if (error.message?.includes('Unsupported MIME type')) {
            errorMessage = '⚠️ Das Dateiformat wird nicht unterstützt. Bitte nutze PDF oder Textdateien.';
          } else {
            hasRequestedDraftRef.current = false; // Allow retry for other errors
          }
          
          onUpdateHistory([
            ...chatHistory,
            { role: 'model', content: errorMessage },
          ]);
        } finally {
          setIsGeneratingHtml(false);
        }
      };
      generateImportHtml();
    }
  }, [isImporting, chatHistory, isGeneratingHtml, aiClient, onConfirmDraft, theme]);

  const handleSend = async (overrideText?: string, overrideHiddenContext?: string) => {
    const messageText = overrideText ?? input;
    if (!messageText.trim() || isGenerating || isGeneratingHtml) return;
    if (!aiClient) return;

    const userMessage: ChatMessage = { role: 'user', content: messageText };
    // Was an das Modell geschickt wird – enthält optional den Hidden Context, der NICHT in der History landet.
    const modelMessageText = overrideHiddenContext
      ? `${messageText}\n\n---\nKONTEXT (intern, nur für diesen Call):\n${overrideHiddenContext}`
      : messageText;
    const newHistory = [...chatHistory, userMessage];
    onUpdateHistory(newHistory);
    if (overrideText === undefined) {
      setInput('');
    }
    setIsGenerating(true);

    // --------------- Drafting-Mode: Feedback zum Entwurf (unverändert, kein Tool-Calling) ---------------
    if (isDrafting) {
      try {
        const templatesPrompt = formatTemplatesForPrompt(selectedTemplateIds);
        const audienceBlockDraftUpdate = renderAudiencePromptBlock(targetAudience as AudienceLevel | '' | undefined, taskInstructions);
        const didacticBlockDraftUpdate = renderDidacticPromptBlock(didacticApproach, didacticScope, didacticChapters);
        const chat = aiClient.chats.create({
          model: 'gemini-3-flash-preview',
          history: pruneHistoryForApi(chatHistory),
          config: {
            systemInstruction: `Du bist ein erfahrener Lehrmittelautor. Passe den Entwurf basierend auf dem Feedback des Nutzers an. Antworte in Markdown. Generiere noch keinen HTML-Code.

WICHTIG FÜR AUFGABEN (STRIKTER MODUS):
Du darfst für Aufgaben AUSSCHLIESSLICH die mitgelieferten HTML-Templates verwenden. Erfinde kein eigenes HTML für Aufgaben.
Beachte zudem folgende spezifische Anweisungen des Lehrers: ${taskInstructions || 'Keine'}

VERFÜGBARE TEMPLATES:
${templatesPrompt}

STRUKTUR & NUMMERIERUNG:
- Kapitel (h1): "Kapitel 1: …", "Kapitel 2: …" (bei nur 1 Kapitel Nummer weglassen)
- Unterthemen (h2): "A: …", "B: …"
- Aufgaben (h3): "Aufgabe [Themenbuchstabe].[Nummer]: [Titel]"

${audienceBlockDraftUpdate}

${didacticBlockDraftUpdate}`,
          },
        });

        setStreamingText('');
        const stream = await withRetry(
          () => chat.sendMessageStream({ message: modelMessageText }),
          {
            onRetry: (attempt) => {
              setStreamingText(`⏳ Server \u00fcberlastet – Versuch ${attempt + 1}/4 …`);
            },
          },
        );
        let responseText = '';
        for await (const chunk of stream) {
          responseText += (chunk.text || '');
          setStreamingText(responseText);
        }
        setStreamingText('');

        onUpdateHistory([
          ...newHistory,
          { role: 'model', content: responseText || 'Keine Antwort erhalten.' },
        ]);
      } catch (error: any) {
        console.error('Chat error (drafting):', error);
        let errorMessage = `Fehler: ${error.message}`;
        if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
          errorMessage = '⚠️ Dein KI-Quota für heute ist aufgebraucht. Bitte versuche es später erneut.';
        }
        onUpdateHistory([...newHistory, { role: 'model', content: errorMessage }]);
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // --------------- Editor-Mode: Function-Calling mit Block-Tools ---------------

    // Snapshot einmal pro Turn (bevor irgendein Tool ausgeführt wird)
    let snapshotTakenThisTurn = false;
    const takeSnapshotOnce = (label: string) => {
      if (snapshotTakenThisTurn || !onAddSnapshot) return;
      onAddSnapshot(label);
      snapshotTakenThisTurn = true;
      setShowSnapshotFeedback(true);
      setTimeout(() => setShowSnapshotFeedback(false), 2000);
    };

    // Mutable "live"-State für den Tool-Context. Tools greifen auf den aktuellsten
    // Stand innerhalb dieses Turns zu; Updates werden per onUpdateHtml/onUpdateTheme
    // zusätzlich an die App propagiert.
    let liveHtml = currentHtml;
    let liveTheme = theme || 'blue';

    const ctx: ToolContext = {
      getHtml: () => liveHtml,
      getTheme: () => liveTheme,
      setHtml: (h: string) => {
        liveHtml = h;
        onUpdateHtml?.(h);
      },
      setTheme: (t: string) => {
        liveTheme = t;
        onUpdateTheme?.(t);
      },
      aiClient,
      onProgress: (msg) => setStreamingText((prev) => (prev ? prev + '\n_' + msg + '_' : '_' + msg + '_')),
    };

    try {
      const templatesPrompt = formatTemplatesForPrompt(selectedTemplateIds);
      const blockOverview = formatBlockOverview(currentHtml);

      const systemInstruction = `Du bist ein hilfreicher Assistent für Lehrpersonen beim Bearbeiten eines Dossiers.

AKTUELLES FARBSCHEMA: ${liveTheme}

AKTUELLE BLÖCKE IM DOSSIER (Aufgaben & Merkblätter):
${blockOverview}

TOOLS ZUM BEARBEITEN DES DOSSIERS:
- get_block(block_title) – liefert den HTML-Code eines Blocks, wenn du ihn für eine Änderung sehen musst.
- update_block(block_title, new_html) – ersetzt einen einzelnen Block.
- insert_template(template_id, title, after_block_title?) – **BEVORZUGT zum Einfügen einer neuen Aufgabe**, wenn der Typ einem Template entspricht. Fügt das EXAKTE Template-HTML mit allen Platzhaltern (insbesondere image-placeholder-trigger für Bilder) ein.
- insert_block(new_html, after_block_title?) – nur als FALLBACK: freier HTML-Block, wenn kein Template passt.
- delete_block(block_title) – entfernt einen Block.
- update_theme(theme) – wechselt das Farbschema (blue|emerald|violet|indigo|amber|rose).
- generate_image(prompt, target_block_title, aspect_ratio?) – generiert ein Bild und fügt es in den Ziel-Block ein (ersetzt den image-placeholder-trigger des Templates).

EIN BLOCK = EINE AUFGABE (striktes Gebot):
- Eine einzelne Aufgabe MUSS genau EINEN avoid-break-Block bilden. Titel (h3), Aufgabenstellung, Eingabefelder, Bild-Platzhalter etc. gehören ALLE in den gleichen <div class="avoid-break …">.
- Rufe NIEMALS mehrere insert_block / insert_template-Calls hintereinander auf, um eine einzige Aufgabe aufzuspalten.
- Erfinde NIEMALS eigene Bild-Platzhalter mit Texten wie "Bild wird generiert", "Platzhalter für Bild" o.Ä. – nutze IMMER die Template-Struktur mit Klasse "image-placeholder-trigger", die bereits in den Templates vorhanden ist.

TEMPLATE-TREUE (STRIKTESTE REGEL – gilt VOR allen anderen Stil-Überlegungen):
Wenn ein bestehender Block auf einem Template basiert (erkennbar an Template-spezifischen Strukturen bzw. Klassen wie .rechenmauer-table, .steckbrief, .zahlenstrahl, .stellenwerttafel, .suchsel, .mindmap, .zahlenhaus, .konjugations-faecher, .venn, .t-chart, gap-line-Lückentexten, Tabellen mit festen w-/h-Klassen usw.) oder wenn es für die Aufgabenart ein passendes Template gibt:
- Die HTML-STRUKTUR bleibt 1:1 erhalten: ALLE Tailwind-Klassen auf allen Elementen (insbesondere Zell-Breiten w-16/w-20/w-24, Höhen h-10/h-12, border-*, bg-*, flex-/grid-/table-Klassen, Abstände mb-*, p-*, gap-*), sowie die gesamte Tag-Struktur (table/tr/td, div-Verschachtelung, span.gap-line > span.is-answer).
- Du darfst AUSSCHLIESSLICH den reinen Textinhalt und die Werte in <span class="is-answer">…</span> ändern. Sonst nichts.
- Erfinde keine Zusatz-Stilisierungen wie "gegebene Zellen weiß und fett, Lösungszellen beige in kleinerer Breite". Solche Varianten zerstören z.B. bei .rechenmauer-table die Flex-Pyramiden-Ausrichtung (alle <td> müssen identische w-/h-Klassen behalten!).
- Ändere keine Zeilen-Anzahl, Spalten-Anzahl, Zellen-Anzahl, Reihenfolge der Tabellenzeilen etc., außer der Nutzer fordert das explizit.
- Entferne keine Tipp-/Hinweis-Paragrafen (<p class="… no-print …">) am Ende von Templates.

VORGEHEN BEI "Nur Lösungen einfüllen" / "vervollständigen" / "Antworten eintragen":
1. get_block aufrufen, um das vorhandene HTML zu sehen.
2. Das ORIGINAL-HTML als Ausgangspunkt nehmen. Nicht von Null neu schreiben.
3. NUR die Lösungs-Textwerte (in <span class="is-answer">LÖSUNG</span> bzw. im leeren Zellen-Text) ersetzen. Alle umgebenden Klassen, Attribute und Strukturen bleiben BYTE-GENAU gleich.
4. update_block mit diesem minimal geänderten HTML aufrufen.
Wenn du unsicher bist, ob eine Änderung strukturell ist: änder sie NICHT.

WORKFLOW FÜR "Neue Aufgabe mit Bild" (z.B. Steckbrief zu einem Thema):
1. insert_template(template_id="steckbrief", title="Aufgabe X.N: Steckbrief zu <Thema>")
   → Antwort enthält in "details.inserted_block_html" das gerade eingefügte HTML mit Standard-Platzhaltern (z.B. Name/Lebensraum/Nahrung bei Steckbrief).
2. WENN der Nutzer ein konkretes Thema nannte (z.B. "CSS", "die Eiche", "Venedig"):
   SOFORT update_block(block_title="Aufgabe X.N: …", new_html=<angepasster Block>) aufrufen.
   - Ersetze die Default-Labels durch thematisch passende (biologischer Steckbrief: Name/Lebensraum/Nahrung; technischer Steckbrief: Name der Technologie/Zweck/Wichtige Konzepte; Stadt-Steckbrief: Name/Einwohner/Sehenswürdigkeiten; …).
   - Fülle die rechten Spalten mit sinnvollen Beispiel-Antworten zum Thema (als <span class="is-answer">…</span>).
   - Behalte die HTML-STRUKTUR (alle Klassen, das border-Layout, den image-placeholder-trigger bzw. ai-image-slot) EXAKT bei, ändere NUR die Label- und Antwort-Texte.
3. generate_image(prompt="zum Thema passendes Motiv", target_block_title="Aufgabe X.N: …") – ersetzt den Platzhalter mit dem Bild.

NIEMALS insert_block-Calls zwischen diesen Schritten einstreuen! Der Block, den insert_template liefert, bleibt durchgängig die Arbeits-Einheit.

Es gibt KEIN Tool, um das gesamte Dossier auf einmal zu ersetzen. Für jede Änderung musst du die obigen Block-Tools kombinieren. Wenn eine gewünschte Änderung so umfangreich ist, dass sie nur als kompletter Neuaufbau Sinn ergibt: Sage dem Nutzer, dass er stattdessen über den Wizard ein neues Dossier starten soll.

ARBEITSWEISE:
1. Identifiziere anhand der Block-Übersicht, welche Blöcke du ändern musst.
2. Wenn du den Inhalt eines Blocks nicht kennst (aber ändern willst), rufe zuerst get_block auf.
3. Ändere nur die angefragten Blöcke. Verändere niemals andere Blöcke oder das Layout (page-breaks, Container) ohne expliziten Auftrag.
4. Beantworte Fragen und Erklärungen in Markdown, OHNE Tools aufzurufen.

MEHRDEUTIGKEIT (SEHR WICHTIG – STRIKTE REGEL):
Wenn der Nutzer "das Lückentext-Template", "die Aufgabe" o.ä. ohne Index oder präzisen Titel nennt UND es in der Block-Übersicht mehrere passende Blöcke gibt:
- Rufe NIEMALS einfach mehrere update_block hintereinander auf, um "alle" zu bearbeiten.
- Rufe NIEMALS update_block für ALLE Matches auf.
- STATTDESSEN: Antworte mit einer Markdown-Rückfrage und liste die Kandidaten mit ihren #N-Indizes auf, z.B.:
  "Ich habe mehrere passende Blöcke gefunden – welchen meinst du?
   - #2 Aufgabe 1: Lückentext
   - #3 Aufgabe 2: Lückentext
   Bitte gib die Nummer an (z.B. #2)."
  Rufe dann in dieser Runde KEIN Tool auf.
- Erst wenn der Nutzer die Auswahl präzisiert hat, machst du update_block mit "#N" als block_title.

INSERT-VERHALTEN (NEUE AUFGABE EINFÜGEN):
Wenn der Nutzer "füge eine neue Aufgabe/Tabelle/Lückentext ein" sagt:
- Füge IMMER eine eigenständige neue Aufgabe ein. Frage NICHT zurück, ob es eine Teilaufgabe sein soll.
- Nummeriere fortlaufend im vorhandenen Schema (z.B. nach "Aufgabe A.2" kommt "Aufgabe A.3").
- Nur wenn der Nutzer EXPLIZIT nach einer Teilaufgabe fragt (z.B. "als Teilaufgabe", "a/b/c-Suffix", "Unteraufgabe"), nutze den Buchstaben-Suffix (A.2a, A.2b, A.2c …).

LÜCKENTEXT-QUALITÄT (PFLICHT – STRIKTE REGELN, sonst ist die Aufgabe kaputt):

Jede Lücke MUSS so in den Satz eingebettet sein, dass sie GENAU DIE STELLE markiert, an der das Lösungswort stehen soll. Die Lösung steht IN der Lücke (als inneres <span class="is-answer">).

Das EXAKTE Format (genau so, keine Varianten):
  <span class="gap-line"><span class="is-answer">LÖSUNG</span></span>

KORREKTES VOLLSTÄNDIGES LÜCKENTEXT-BEISPIEL (so und nicht anders generieren!):
<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-${liveTheme}-700" contenteditable="true">Aufgabe A.1: Wortfamilien ergänzen</h3>
  <p class="editable text-gray-600 mb-3 italic" contenteditable="true">Setze die passenden Wörter ein: Eiche, Wurzel, Blätter, Herbst</p>
  <div class="leading-loose">
    <p class="editable" contenteditable="true">Im <span class="gap-line"><span class="is-answer">Herbst</span></span> verfärben sich die <span class="gap-line"><span class="is-answer">Blätter</span></span> der <span class="gap-line"><span class="is-answer">Eiche</span></span> bunt. Ihre lange <span class="gap-line"><span class="is-answer">Wurzel</span></span> reicht tief in den Boden.</p>
  </div>
</div>

VERBOTEN (macht die Aufgabe kaputt):
  <p>Im ___ verfärben sich die ___ der ___ bunt...</p>
  <p>Lösungen: Herbst, Blätter, Eiche</p>

Das obige ist FALSCH, weil:
1. "___" ist keine echte Lücke, sondern nur Unterstriche.
2. Die Lösungen werden am Ende gesammelt statt in den Lücken selbst.
3. Es gibt keine <span class="gap-line"><span class="is-answer">…</span></span>-Struktur.

Produziere NIEMALS gesammelte Lösungen am Ende. Produziere NIEMALS Unterstriche "___" als Lücke. Nutze IMMER die verschachtelte gap-line/is-answer-Span-Struktur wie im Beispiel.

AUFGABEN-KONVENTIONEN (bei update_block / insert_block):
- Jeder Aufgaben-Block MUSS ein <div class="avoid-break mb-8 text-[12pt]"> mit <h3 class="editable font-bold text-[14pt] mb-1 text-${liveTheme}-700" contenteditable="true">TITEL</h3> sein.
- Lückentexte: <span class="gap-line"><span class="is-answer">Lösung</span></span> (siehe Beispiel oben!)
- Reine Lücke (ohne vorgegebene Lösung): <span class="gap-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
- Längere Freitext-Antworten: <div class="schreib-linie editable" contenteditable="true"><span class="is-answer">Musterlösung</span></div>
- Anstreichen: <span class="is-highlight-answer">Wort</span>
- Durchstreichen: <span class="is-strikethrough-answer">Wort</span>
- Editierbarer Text: Klasse "editable" + contenteditable="true".

LEHRER-ANWEISUNGEN: ${taskInstructions || 'Keine'}

VERFÜGBARE TEMPLATES ALS STRUKTURREFERENZ:
${templatesPrompt}

${renderAudiencePromptBlock(targetAudience as AudienceLevel | '' | undefined, taskInstructions)}

${renderDidacticPromptBlock(didacticApproach, didacticScope, didacticChapters)}`;

      const chat = aiClient.chats.create({
        model: 'gemini-3-flash-preview',
        history: pruneHistoryForApi(chatHistory),
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
        },
      });

      const toolCallRecords: ToolCallRecord[] = [];
      let finalText = '';
      // Erste Nachricht: User-Input (inkl. optional Hidden Context, der NICHT in der History landet).
      let nextMessage: any = modelMessageText;

      // Multi-Turn-Loop: solange die KI Tools aufruft, weiter senden
      const MAX_TOOL_ROUNDS = 6;
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        setStreamingText('');
        const stream = await withRetry(
          () => chat.sendMessageStream({ message: nextMessage }),
          {
            onRetry: (attempt) => {
              setStreamingText(`⏳ Server \u00fcberlastet – Versuch ${attempt + 1}/4 …`);
            },
          },
        );

        let roundText = '';
        const roundCalls: Array<{ name: string; args: Record<string, any>; id?: string }> = [];

        for await (const chunk of stream) {
          if (chunk.text) {
            roundText += chunk.text;
            setStreamingText(roundText);
          }
          const fc = (chunk as any).functionCalls;
          if (Array.isArray(fc) && fc.length > 0) {
            for (const call of fc) {
              roundCalls.push({
                name: call.name,
                args: call.args ?? {},
                id: call.id,
              });
            }
          }
        }

        finalText += (finalText && roundText ? '\n\n' : '') + roundText;

        // Legacy-Fallback: alte <action>-Tags aus Text parsen
        if (roundCalls.length === 0 && roundText.includes('<action')) {
          takeSnapshotOnce('Vor KI-Aktion (legacy)');
          const htmlMatch = roundText.match(/<action type="update_html">([\s\S]*?)<\/action>/);
          if (htmlMatch) {
            liveHtml = htmlMatch[1].trim();
            onUpdateHtml?.(liveHtml);
            toolCallRecords.push({
              name: 'update_full_html (legacy)',
              args: {},
              success: true,
              message: 'HTML über Legacy-Action-Tag aktualisiert.',
            });
          }
          const themeMatch = roundText.match(/<action type="update_theme">(.*?)<\/action>/);
          if (themeMatch) {
            liveTheme = themeMatch[1].trim();
            onUpdateTheme?.(liveTheme);
            toolCallRecords.push({
              name: 'update_theme (legacy)',
              args: { theme: liveTheme },
              success: true,
              message: `Theme auf ${liveTheme} gewechselt.`,
            });
          }
        }

        if (roundCalls.length === 0) break; // Keine weiteren Tools → Ende

        // Snapshot EINMAL pro Turn (bevor mutierende Tools laufen)
        const mutates = roundCalls.some(
          (c) =>
            c.name === 'update_block' ||
            c.name === 'insert_block' ||
            c.name === 'delete_block' ||
            c.name === 'update_full_html' ||
            c.name === 'generate_image' ||
            c.name === 'update_theme',
        );
        if (mutates) {
          takeSnapshotOnce(`Vor KI-Aktion (${roundCalls.map((c) => c.name).join(', ')})`);
        }

        // Tools ausführen
        const functionResponses: any[] = [];
        for (const call of roundCalls) {
          let result: ToolResult;
          try {
            result = await executeTool(call.name, call.args, ctx);
          } catch (err: any) {
            result = { success: false, message: `Tool-Fehler: ${err?.message || String(err)}` };
          }
          toolCallRecords.push({
            name: call.name,
            args: call.args,
            success: result.success,
            message: result.message,
          });
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: {
                success: result.success,
                message: result.message,
                ...(result.details ? { details: result.details } : {}),
              },
            },
          });
        }

        // Function-Responses an die KI zurückspielen
        nextMessage = functionResponses;
      }

      setStreamingText('');

      onUpdateHistory([
        ...newHistory,
        {
          role: 'model',
          content: finalText || (toolCallRecords.length > 0 ? '(Aktionen ausgeführt)' : 'Keine Antwort erhalten.'),
          toolCalls: toolCallRecords.length > 0 ? toolCallRecords : undefined,
        },
      ]);
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorMessage = `Fehler: ${error.message}`;
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = '⚠️ Dein KI-Quota für heute ist aufgebraucht. Bitte versuche es später erneut.';
      }
      onUpdateHistory([...newHistory, { role: 'model', content: errorMessage }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Externe Prompts (z.B. vom Teilaufgaben-Button im Editor) entgegennehmen.
  // Bei autoSend=true wird direkt abgeschickt; sonst wird der Text in die Textarea
  // geschrieben und der User bestätigt selbst mit Enter.
  useEffect(() => {
    if (!pendingPrompt) return;
    if (lastPendingPromptNonceRef.current === pendingPrompt.nonce) return;
    lastPendingPromptNonceRef.current = pendingPrompt.nonce;

    if (isDrafting || isImporting) {
      onUpdateHistory([
        ...chatHistory,
        { role: 'model', content: '⚠️ Der Chat ist aktuell im Entwurfs-/Import-Modus. Teilaufgaben-Prompts erst nach Abschluss des Entwurfs nutzen.' },
      ]);
      return;
    }

    if (isGenerating || isGeneratingHtml) {
      onUpdateHistory([
        ...chatHistory,
        { role: 'model', content: '⚠️ Der Chat läuft gerade – bitte warte, bis die aktuelle Generierung abgeschlossen ist, und versuche es dann erneut.' },
      ]);
      return;
    }

    if (!aiClient) {
      onUpdateHistory([
        ...chatHistory,
        { role: 'user', content: pendingPrompt.text },
        { role: 'model', content: '⚠️ **Kein API-Key gefunden.** Bitte setze die Umgebungsvariable `VITE_GEMINI_API_KEY` und starte den Server neu, damit der Prompt ausgeführt werden kann.' },
      ]);
      return;
    }

    if (pendingPrompt.autoSend) {
      handleSend(pendingPrompt.text, pendingPrompt.hiddenContext);
    } else {
      setInput(pendingPrompt.text);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [pendingPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteMessage = (index: number) => {
    const newHistory = [...chatHistory];
    newHistory.splice(index, 1);
    onUpdateHistory(newHistory);
  };

  const handleConfirm = async () => {
    if (!aiClient || !onConfirmDraft) return;
    setIsGeneratingHtml(true);

    // Take snapshot before full generation
    if (onAddSnapshot) {
      onAddSnapshot('Vor Dossier-Generierung');
      setShowSnapshotFeedback(true);
      setTimeout(() => setShowSnapshotFeedback(false), 2000);
    }

    try {
      const selectedTemplates = EXERCISE_TEMPLATES.filter(t => selectedTemplateIds?.includes(t.id));
      const templatesHtml = selectedTemplates.map(t => `Template ID: ${t.id}\nName: ${t.name}\nHTML: ${t.html}`).join('\n\n---\n\n');
      const audienceBlockHtml = renderAudiencePromptBlock(targetAudience as AudienceLevel | '' | undefined, taskInstructions);
      const didacticBlockHtml = renderDidacticPromptBlock(didacticApproach, didacticScope, didacticChapters);
      const amountsSectionHtml = audienceBlockHtml
        ? `${audienceBlockHtml}\n\nDie MENGEN im Profil oben ERSETZEN alle globalen Mindestwerte. Folge ausschliesslich den Zahlen im Profil.`
        : `MINDEST-INHALTSANFORDERUNGEN (PFLICHT beim Generieren):
- Tabellen: Mindestens 6-8 Zeilen mit vollständigem, themenspezifischem Inhalt
- Lückentexte: Ein vollständiger Absatz (5-8 Sätze) mit 8-15 Lücken, kontextreich und zusammenhängend
- Eindringling / Sortieraufgaben: Mindestens 6-8 Einträge (a bis h)
- Matching / Zuordnen: Mindestens 6-8 Paare
- Ankreuz-Tabellen: Mindestens 6-8 Aussagen/Kriterien
- Klassifizierung / Wörter sortieren: Mindestens 12-16 Wörter/Begriffe
- Offene Fragen / Schreibaufgaben: Eine ausführliche, präzise Frage mit konkretem Kontext (kein allgemeiner Platzhalter)
- Textarbeit / Anstreichen: Ein ganzer Absatz (8-12 Sätze) mit genügend relevanten Elementen`;

      const chat = aiClient.chats.create({
        model: 'gemini-3-flash-preview',
        history: pruneHistoryForApi(chatHistory),
        config: {
          maxOutputTokens: 32768,
          systemInstruction: `Du bist ein Frontend-Entwickler und Lehrmittelautor. Der Nutzer hat den Entwurf bestätigt.
Generiere nun den vollständigen HTML-Code für das Dossier basierend auf dem Entwurf und dem Briefing.
Verwende Tailwind CSS für das Styling.

FARBSCHEMA (OBERSTE STYLE-REGEL – MUSS SICHTBAR SEIN):
Das Farbschema ist "${theme || 'blue'}". Das komplette Dossier MUSS in dieser Farbe gestaltet sein.
Verwende IMMER ${theme || 'blue'}-Varianten der Tailwind-Farbskala – NIEMALS schwarz, grau oder default.
Konkrete Pflicht-Klassen:
- Haupttitel <h1>: class="editable text-[36pt] font-black text-${theme || 'blue'}-700 text-center"
- Kapitel <h2>: class="editable text-[20pt] font-bold text-${theme || 'blue'}-700 border-b-2 border-${theme || 'blue'}-300 pb-1"
- Aufgaben-Titel <h3>: class="editable font-bold text-[14pt] mb-1 text-${theme || 'blue'}-700"
- Merkblatt-Container: class="bg-${theme || 'blue'}-50 border-l-4 border-${theme || 'blue'}-500 p-4 rounded-r-lg"
- Tabellen-Header <th>: class="editable bg-${theme || 'blue'}-100 border border-${theme || 'blue'}-300 p-2 font-bold"
- Akzent-Borders: border-${theme || 'blue'}-200 / border-${theme || 'blue'}-300
Prüfe am Ende der Generierung: Jede Überschrift und jeder Akzent muss ${theme || 'blue'}-Klassen enthalten. Wenn nicht → korrigiere.

WICHTIG FÜR AUFGABEN:
Nutze die mitgelieferten HTML-Templates als STRUKTURELLE VORLAGE (HTML-Klassen, Layout). Die Templates enthalten absichtlich minimalen Platzhalter-Inhalt für manuelle Bearbeitung – beim GENERIEREN musst du den Inhalt massiv ausbauen!

${amountsSectionHtml}

${didacticBlockHtml}

Passe das Theme-Farbschema an: text-${theme || 'blue'}-700
Beachte zudem folgende spezifische Anweisungen des Lehrers: ${taskInstructions || 'Keine'}

VERFÜGBARE TEMPLATES (Strukturvorlagen):
${templatesHtml || 'Keine spezifischen Templates gewählt. Nutze Standard-Strukturen.'}

WICHTIG FÜR DAS LAYOUT:
ACHTUNG: Jeder direkte Container im Dossier ist EXAKT EINE A4-Seite (29.7cm hoch). Inhalt der überläuft wird HART ABGESCHNITTEN! Du musst die Seitenaufteilung selbst steuern.
WICHTIG: Erstelle so viele Seiten-Container wie nötig, um ALLE Aufgaben unterzubringen. Die Anzahl der Seiten ist NICHT begrenzt. Kürze oder überspringe NIEMALS Aufgaben, um sie auf weniger Seiten zu pressen.

1. TITELBLATT: Nur ein einfacher Platzhalter mit dem Hauptthema als Überschrift – KEINE Bilder, KEINE Name/Datum-Felder, KEINE Dekoration. Die Gestaltung erfolgt später durch den Nutzer.
2. Seitenränder: Nutze überall "p-[2.5cm]" für alle Seiten-Container.
3. SEITENAUFTEILUNG – PFLICHT:
   a) Titelblatt: 1 Container → page-break
   b) Inhaltsverzeichnis: 1 Container → page-break
   c) Pro Unterthema: h2-Überschrift + Merkblatt in EIGENEM Container (1 Seite) → page-break
   d) Aufgaben: Verteile auf mehrere Container je nach Grösse:
      - Kurze Aufgaben (1-3 Zeilen): 3-4 pro Seiten-Container
      - Mittlere Aufgaben (Tabelle, Liste 4-8 Zeilen): 2 pro Seiten-Container
      - Grosse Aufgaben (langer Text, viele Zeilen): 1 pro Seiten-Container
      - Nach jedem vollen Seiten-Container: page-break + neuer Container
4. AUFGABEN: Jede Aufgabe in "avoid-break mb-6" wrappen (verhindert Schnitt mitten in der Aufgabe).
5. Lösungen in Lückentexten:
   - <span class="gap-line is-answer" contenteditable="true">Lösung</span>
   - Reine Lücke: <span class="gap-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
   - <span class="is-strikethrough-answer">Falsches Wort</span>
   - Längere Freitext-Antworten: <div class="schreib-linie editable" contenteditable="true"><span class="is-answer">Musterlösung</span></div>
6. Jedes Textelement (p, h1, h2, h3, td, th, li) das editierbar sein soll: Klasse "editable" + contenteditable="true".
7. Aufgabentitel (h3): class="editable font-bold text-[14pt] mb-2 text-${theme || 'blue'}-700"

WICHTIG FÜR DIE ANTWORT:
Antworte AUSSCHLIESSLICH mit dem HTML-Code. Keine Markdown-Formatierung, kein Text davor/danach.
Strukturiere das HTML wie folgt:
1. Start-Container: <div class="max-w-4xl mx-auto bg-white shadow-lg rounded-xl">
2. Titelseite – NUR ein einfacher Platzhalter mit dem Hauptthema als Überschrift. KEINE aufwändige Gestaltung, KEIN Bild, KEINE Name/Datum-Felder. Exakt dieses HTML verwenden:
   <div class="title-page-placeholder p-[2.5cm] min-h-[29.7cm] flex flex-col justify-center items-center relative border-b border-gray-100">
     <h1 contenteditable="true" class="editable text-[36pt] font-black text-${theme || 'blue'}-700 text-center">[HAUPTTHEMA HIER EINSETZEN]</h1>
   </div>
3. <div class="page-break avoid-break"></div>
4. Inhaltsverzeichnis: <div class="p-[2.5cm]"><h2 class="editable text-[20pt] font-bold mb-6 border-b-2 border-black pb-2" contenteditable="true">Inhaltsverzeichnis</h2><ul id="toc-list" class="space-y-1 mb-8 max-w-2xl text-[14pt]"><li class="italic text-gray-500">Klicke oben auf "Inhaltsverzeichnis Auto-Sync"...</li></ul></div>
5. <div class="page-break avoid-break"></div>
6. Für jedes Unterthema:
   a) <div class="p-[2.5cm] space-y-6"> mit h2 und — NUR falls die MERKBLATT-REGEL des DIDAKTISCHEN AUFBAUS dies vorschreibt oder der Lehrer im Briefing explizit Merkblatt-Inhalt angegeben hat — einem Merkblatt (Merkblatt MUSS in <div class="avoid-break ..."> gewrappt sein!). Ohne Merkblatt enthält dieser Container nur die h2-Überschrift.</div>
   b) <div class="page-break avoid-break"></div>
   c) <div class="p-[2.5cm] space-y-6"> mit ersten Aufgaben (2-3 je nach Grösse) </div>
   d) Falls mehr Aufgaben: <div class="page-break avoid-break"></div> + neuer <div class="p-[2.5cm] space-y-6"> usw.`,
        },
      });

      setStreamingText('');
      const stream = await withRetry(
        () => chat.sendMessageStream({ message: "Entwurf bestätigt. Generiere jetzt das HTML." }),
        {
          onRetry: (attempt) => {
            setStreamingText(`⏳ Server \u00fcberlastet – Versuch ${attempt + 1}/4 …`);
          },
        },
      );
      let html = '';
      for await (const chunk of stream) {
        html += (chunk.text || '');
        setStreamingText(html);
      }
      setStreamingText('');
      
      // Clean up markdown formatting if the model still includes it
      html = html.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
      
      onConfirmDraft(html);
    } catch (error: any) {
      console.error('HTML generation error:', error);
      let errorMessage = `Fehler bei der HTML-Generierung: ${error.message}`;
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = '⚠️ API-Limit erreicht. Bitte warte einen Moment und versuche es später noch einmal.';
      }
      onUpdateHistory([
        ...chatHistory,
        { role: 'model', content: errorMessage },
      ]);
    } finally {
      setIsGeneratingHtml(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200 shrink-0" style={{ width: width ?? 384 }}>
      <div className="p-4 bg-white border-b border-gray-200 shadow-sm z-10 relative">
        <h2 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
          <span>✨</span>
          KI-Assistent
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {isImporting ? 'Importiert Aufgaben...' : isDrafting ? 'Entwurfsmodus' : 'Kennt den aktuellen Dossier-Inhalt'}
        </p>
        
        {showSnapshotFeedback && (
          <div className="absolute top-4 right-4 bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full animate-bounce flex items-center gap-1">
            <span>📸</span> Snapshot erstellt
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 && !isDrafting && (
          <div className="text-center text-gray-400 text-sm mt-10">
            Stelle eine Frage zu deinem Dossier oder lass dir Ideen generieren.
          </div>
        )}
        {chatHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'
              }`}
            >
              {msg.role === 'user' ? '👤' : '✨'}
            </div>
            <div className="relative max-w-[80%]">
              <div
                className={`p-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm prose prose-sm prose-indigo'
                }`}
              >
                {msg.role === 'model' ? (
                  <>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                        {msg.toolCalls.map((tc, i) => (
                          <span
                            key={i}
                            title={tc.message || ''}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              tc.success === false
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {tc.success === false ? '⚠️' : '🔧'} {tc.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="whitespace-pre-wrap">
                    {msg.content || (msg.parts && msg.parts.map((p: any, i: number) =>
                      p.text ? <div key={i}>{p.text}</div> :
                      p.inlineData ? <div key={i} className="mt-2 p-2 bg-indigo-700/30 rounded text-xs flex items-center gap-2">📎 {p.inlineData.mimeType} angehängt</div> : null
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDeleteMessage(idx)}
                className={`absolute top-0 ${msg.role === 'user' ? '-left-8' : '-right-8'} p-1 opacity-30 group-hover:opacity-100 hover:opacity-100 transition-opacity text-xs hover:bg-gray-100 rounded-full`}
                title="Nachricht löschen"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        {(isGenerating || isGeneratingHtml) && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              ✨
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
              {streamingText ? (
                <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                  <ReactMarkdown>{streamingText + ' \u25CD'}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="animate-pulse">{isGeneratingHtml ? '\u2699\uFE0F' : '\u23F3'}</span>
                  <span className="text-sm text-gray-500">
                    {isGeneratingHtml ? 'Generiere Dossier...' : 'Denkt nach...'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isDrafting && chatHistory.length > 1 && !isGenerating && !isGeneratingHtml && (
        <div className="p-4 bg-indigo-50 border-t border-indigo-100">
          <button
            onClick={handleConfirm}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <span>✨</span> Entwurf bestätigen & generieren
          </button>
        </div>
      )}

      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={(e) => {
              // Auto-resize: Textarea wächst mit dem Inhalt nach oben, bis max 200px,
              // danach scrollt der interne Inhalt.
              const ta = e.currentTarget;
              ta.style.height = 'auto';
              ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
            }}
            onKeyDown={(e) => {
              // Enter sendet; Shift+Enter erzeugt einen Zeilenumbruch.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder={isDrafting ? "Änderungswünsche zum Entwurf..." : "Shift+Enter = neue Zeile"}
            className="chat-textarea flex-1 border border-gray-300 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none overflow-y-auto leading-relaxed"
            disabled={isGenerating || isGeneratingHtml}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isGenerating || isGeneratingHtml}
            className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            title="Senden (Enter)"
          >
            <span className="text-lg leading-none">➤</span>
          </button>
        </div>
      </div>
    </div>
  );
}
