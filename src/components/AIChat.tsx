import { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage } from '../types';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { EXERCISE_TEMPLATES } from '../constants';

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
  onAddSnapshot?: (name: string) => void;
  onUpdateHtml?: (html: string) => void;
  onUpdateTheme?: (theme: string) => void;
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
  onAddSnapshot, 
  onUpdateHtml, 
  onUpdateTheme 
}: AIChatProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showSnapshotFeedback, setShowSnapshotFeedback] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasRequestedDraftRef = useRef(false);

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
          const chat = aiClient.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
              systemInstruction: `Du bist ein erfahrener Lehrmittelautor. Erstelle basierend auf dem Briefing einen strukturierten Entwurf (Inhaltsübersicht) für ein Dossier. Antworte in Markdown. Generiere noch keinen HTML-Code.
              
              STRUKTUR & NUMMERIERUNG (WICHTIG):
              - Kapitel (h1): "Kapitel 1: [Titel]", "Kapitel 2: [Titel]" etc. (Wenn es nur 1 Kapitel gibt, lass die Nummer weg).
              - Unterthemen (h2): "A: [Titel]", "B: [Titel]" etc.
              - Aufgaben (h3): "Aufgabe [Themenbuchstabe].[Nummer]: [Titel]" (z.B. "Aufgabe A.1: ...", "Aufgabe B.2: ...").`,
            },
          });
          
          const messageContent = chatHistory[0].parts ? chatHistory[0].parts : chatHistory[0].content;
          setStreamingText('');
          const stream = await chat.sendMessageStream({ message: messageContent as any });
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

          const chat = aiClient.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
              maxOutputTokens: 32768,
              systemInstruction: `Du bist ein Frontend-Entwickler und Lehrmittelautor. Der Nutzer hat ein Dokument mit Aufgaben hochgeladen und Anweisungen gegeben.
Generiere nun den vollständigen HTML-Code für das Dossier basierend auf dem Dokument und den Anweisungen.
Verwende Tailwind CSS für das Styling. Das Farbschema ist: ${theme || 'blue'}.

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

MINDEST-INHALTSANFORDERUNGEN (PFLICHT beim Generieren):
- Tabellen: Mindestens 6-8 Zeilen mit vollständigem, themenspezifischem Inhalt
- Lückentexte: Ein vollständiger Absatz (5-8 Sätze) mit 8-15 Lücken, kontextreich und zusammenhängend
- Eindringling / Sortieraufgaben: Mindestens 6-8 Einträge (a bis h)
- Matching / Zuordnen: Mindestens 6-8 Paare
- Ankreuz-Tabellen: Mindestens 6-8 Aussagen/Kriterien
- Klassifizierung / Wörter sortieren: Mindestens 12-16 Wörter/Begriffe
- Offene Fragen / Schreibaufgaben: Eine ausführliche, präzise Frage mit konkretem Kontext (kein allgemeiner Platzhalter)
- Textarbeit / Anstreichen: Ein ganzer Absatz (8-12 Sätze) mit genügend relevanten Elementen

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
   a) <div class="p-[2.5cm] space-y-6"> mit h2 + Merkblatt (Merkblatt MUSS in <div class="avoid-break ..."> gewrappt sein!) </div>
   b) <div class="page-break avoid-break"></div>
   c) <div class="p-[2.5cm] space-y-6"> mit ersten Aufgaben (2-3 je nach Grösse) </div>
   d) Falls mehr Aufgaben: <div class="page-break avoid-break"></div> + neuer <div class="p-[2.5cm] space-y-6"> usw.`,
            },
          });

          const messageContent = chatHistory[0].parts ? chatHistory[0].parts : chatHistory[0].content;
          setStreamingText('');
          const stream = await chat.sendMessageStream({ message: messageContent as any });
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

  const handleSend = async () => {
    if (!input.trim() || isGenerating || isGeneratingHtml) return;
    if (!aiClient) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newHistory = [...chatHistory, userMessage];
    onUpdateHistory(newHistory);
    setInput('');
    setIsGenerating(true);

    // Strip base64 images to save tokens and prevent "Token count exceeded" errors
    const cleanHtml = currentHtml.replace(/src="data:image\/[^;]+;base64,[^"]+"/g, 'src="[BILD_ENTFERNT_UM_TOKENS_ZU_SPAREN]"');

    const truncatedHtml = cleanHtml.length > 200000 
      ? cleanHtml.substring(0, 200000) + "\n... [HTML gekürzt wegen Überlänge]" 
      : cleanHtml;

    try {
      const selectedTemplates = EXERCISE_TEMPLATES.filter(t => selectedTemplateIds?.includes(t.id));
      const templatesHtml = selectedTemplates.map(t => `Template ID: ${t.id}\nName: ${t.name}\nHTML: ${t.html}`).join('\n\n---\n\n');

      const chat = aiClient.chats.create({
        model: 'gemini-3-flash-preview',
        history: pruneHistoryForApi(chatHistory),
        config: {
          systemInstruction: isDrafting 
            ? `Du bist ein erfahrener Lehrmittelautor. Passe den Entwurf basierend auf dem Feedback des Nutzers an. Antworte in Markdown. Generiere noch keinen HTML-Code.
            
            WICHTIG FÜR AUFGABEN (STRIKTER MODUS):
            Du darfst für Aufgaben AUSSCHLIESSLICH die mitgelieferten HTML-Templates verwenden. Erfinde kein eigenes HTML für Aufgaben.
            Beachte zudem folgende spezifische Anweisungen des Lehrers: ${taskInstructions || 'Keine'}

            VERFÜGBARE TEMPLATES:
            ${templatesHtml || 'Keine spezifischen Templates gewählt. Nutze Standard-Strukturen.'}

            STRUKTUR & NUMMERIERUNG (WICHTIG):
            - Kapitel (h1): "Kapitel 1: [Titel]", "Kapitel 2: [Titel]" etc. (Wenn es nur 1 Kapitel gibt, lass die Nummer weg).
            - Unterthemen (h2): "A: [Titel]", "B: [Titel]" etc.
            - Aufgaben (h3): "Aufgabe [Themenbuchstabe].[Nummer]: [Titel]" (z.B. "Aufgabe A.1: ...", "Aufgabe B.2: ...").`
            : `Du bist ein hilfreicher Assistent für Lehrpersonen.
Hier ist der aktuelle HTML-Code des Dossiers, an dem der Nutzer arbeitet:
\`\`\`html
${truncatedHtml}
\`\`\`
Aktuelles Farbschema: ${theme || 'blue'}

WICHTIG FÜR AUFGABEN (STRIKTER MODUS):
Du darfst für Aufgaben AUSSCHLIESSLICH die mitgelieferten HTML-Templates verwenden. Erfinde kein eigenes HTML für Aufgaben.
Beachte zudem folgende spezifische Anweisungen des Lehrers: ${taskInstructions || 'Keine'}

VERFÜGBARE TEMPLATES:
${templatesHtml || 'Keine spezifischen Templates gewählt. Nutze Standard-Strukturen.'}

STRUKTUR & NUMMERIERUNG (WICHTIG):
- Kapitel (h1): "Kapitel 1: [Titel]", "Kapitel 2: [Titel]" etc. (Wenn es nur 1 Kapitel gibt, lass die Nummer weg).
- Unterthemen (h2): "A: [Titel]", "B: [Titel]" etc.
- Aufgaben (h3): "Aufgabe [Themenbuchstabe].[Nummer]: [Titel]" (z.B. "Aufgabe A.1: ...", "Aufgabe B.2: ...").
- Wenn du eine NEUE Aufgabe generierst, erstelle KEINE Kapitel (h1) oder Unterthemen (h2). Nutze nur h3 für den Aufgabentitel.
- Für längere Freitext-Antworten (z.B. Professor Zipp Schreibaufgaben oder "Was fällt dir auf?" Fragen) nutze IMMER: <div class="schreib-linie editable" contenteditable="true"><span class="is-answer">Musterlösung</span></div>
- Für Lückentexte nutze: <span class="gap-line is-answer" contenteditable="true">Lösung</span>
- Nutze für Titel (h1, h2, h3) immer die Klasse "editable".

Du kannst das Dossier direkt bearbeiten, indem du spezielle <action>-Tags in deiner Antwort verwendest:
- Um das Dossier zu ändern: <action type="update_html">VOLLSTÄNDIGER geänderter HTML-Code hier...</action>
- Um das Farbschema zu ändern: <action type="update_theme">blue|emerald|violet|indigo|amber|rose</action>

KRITISCH – MINIMALE ÄNDERUNG (HÖCHSTE PRIORITÄT):
Wenn du <action type="update_html"> verwendest, MUSST du den EXAKT GLEICHEN HTML-Code des bestehenden Dossiers zurückgeben – mit NUR den minimal notwendigen Änderungen für die konkrete Anfrage.
⛔ VERBOTEN: Den HTML von Grund auf neu generieren oder umstrukturieren
⛔ VERBOTEN: Aufgaben, Texte, Tabellen, Lückentexte oder Übungen ändern, die NICHT explizit in der Anfrage genannt wurden
⛔ VERBOTEN: Seitenstruktur, page-breaks, Container-Reihenfolge oder Layout verändern
⛔ VERBOTEN: Neue Aufgaben erfinden oder bestehende ersetzen
✅ ERLAUBT: Nur den exakt angefragten Teil ändern (z.B. einen Satz in einem Merkblatt ergänzen)

Strategie: Kopiere den bestehenden HTML-Code vollständig. Suche gezielt die angefragte Stelle. Ändere nur diese. Gib das Ergebnis zurück.

Beantworte Fragen und gib Erklärungen ansonsten normal in Markdown (ohne <action>-Tag).
Wenn du <action type="update_html"> nutzt, antworte NUR mit diesem Tag und dem vollständigen Code darin.`,
        },
      });

      setStreamingText('');
      const stream = await chat.sendMessageStream({ message: userMessage.content });
      let responseText = '';
      for await (const chunk of stream) {
        responseText += (chunk.text || '');
        setStreamingText(responseText);
      }
      setStreamingText('');

      // Check for actions in the response
      if (responseText.includes('<action')) {
        // Take a snapshot before applying any action
        if (onAddSnapshot) {
          onAddSnapshot('Vor KI-Aktion');
          setShowSnapshotFeedback(true);
          setTimeout(() => setShowSnapshotFeedback(false), 2000);
        }

        // Parse actions
        const htmlMatch = responseText.match(/<action type="update_html">([\s\S]*?)<\/action>/);
        if (htmlMatch && onUpdateHtml) {
          onUpdateHtml(htmlMatch[1].trim());
        }

        const themeMatch = responseText.match(/<action type="update_theme">(.*?)<\/action>/);
        if (themeMatch && onUpdateTheme) {
          onUpdateTheme(themeMatch[1].trim());
        }
      }
      
      onUpdateHistory([
        ...newHistory,
        { role: 'model', content: responseText || 'Keine Antwort erhalten.' },
      ]);
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorMessage = `Fehler: ${error.message}`;
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = '⚠️ Dein KI-Quota für heute ist aufgebraucht. Bitte versuche es später erneut.';
      }
      onUpdateHistory([
        ...newHistory,
        { role: 'model', content: errorMessage },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

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

      const chat = aiClient.chats.create({
        model: 'gemini-3-flash-preview',
        history: pruneHistoryForApi(chatHistory),
        config: {
          maxOutputTokens: 32768,
          systemInstruction: `Du bist ein Frontend-Entwickler und Lehrmittelautor. Der Nutzer hat den Entwurf bestätigt.
Generiere nun den vollständigen HTML-Code für das Dossier basierend auf dem Entwurf und dem Briefing.
Verwende Tailwind CSS für das Styling. Das Farbschema ist: ${theme || 'blue'}.

WICHTIG FÜR AUFGABEN:
Nutze die mitgelieferten HTML-Templates als STRUKTURELLE VORLAGE (HTML-Klassen, Layout). Die Templates enthalten absichtlich minimalen Platzhalter-Inhalt für manuelle Bearbeitung – beim GENERIEREN musst du den Inhalt massiv ausbauen!

MINDEST-INHALTSANFORDERUNGEN (PFLICHT beim Generieren):
- Tabellen: Mindestens 6-8 Zeilen mit vollständigem, themenspezifischem Inhalt
- Lückentexte: Ein vollständiger Absatz (5-8 Sätze) mit 8-15 Lücken, kontextreich und zusammenhängend
- Eindringling / Sortieraufgaben: Mindestens 6-8 Einträge (a bis h)
- Matching / Zuordnen: Mindestens 6-8 Paare
- Ankreuz-Tabellen: Mindestens 6-8 Aussagen/Kriterien
- Klassifizierung / Wörter sortieren: Mindestens 12-16 Wörter/Begriffe
- Offene Fragen / Schreibaufgaben: Eine ausführliche, präzise Frage mit konkretem Kontext (kein allgemeiner Platzhalter)
- Textarbeit / Anstreichen: Ein ganzer Absatz (8-12 Sätze) mit genügend relevanten Elementen

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
   a) <div class="p-[2.5cm] space-y-6"> mit h2 + Merkblatt (Merkblatt MUSS in <div class="avoid-break ..."> gewrappt sein!) </div>
   b) <div class="page-break avoid-break"></div>
   c) <div class="p-[2.5cm] space-y-6"> mit ersten Aufgaben (2-3 je nach Grösse) </div>
   d) Falls mehr Aufgaben: <div class="page-break avoid-break"></div> + neuer <div class="p-[2.5cm] space-y-6"> usw.`,
        },
      });

      setStreamingText('');
      const stream = await chat.sendMessageStream({ message: "Entwurf bestätigt. Generiere jetzt das HTML." });
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
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200 w-80 lg:w-96">
      <div className="p-4 bg-white border-b border-gray-200 shadow-sm z-10 relative">
        <h2 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
          <span>🤖</span>
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
              {msg.role === 'user' ? '👤' : '🤖'}
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
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
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
              🤖
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
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isDrafting ? "Änderungswünsche zum Entwurf..." : "Frag mich etwas..."}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            disabled={isGenerating || isGeneratingHtml}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating || isGeneratingHtml}
            className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <span>🚀</span>
          </button>
        </div>
      </div>
    </div>
  );
}
