export type DidacticApproach = 'inductive' | 'deductive' | 'free';
export type DidacticScope = 'all' | 'selected';

export interface DidacticOption {
  id: DidacticApproach;
  label: string;
  description: string;
}

export const DIDACTIC_OPTIONS: DidacticOption[] = [
  { id: 'inductive', label: 'Induktiv', description: 'Entdecken → Üben → Vertiefen (SuS leiten Regel selbst ab)' },
  { id: 'deductive', label: 'Deduktiv', description: 'Merkblatt → Üben → Anwenden (Regel wird zuerst gegeben)' },
  { id: 'free',      label: 'Keine Vorgabe', description: 'KI entscheidet Struktur und Reihenfolge frei' },
];

interface PhaseBlock {
  name: string;
  aufgabenzahl: string;
  ziel: string[];
  templates: string[];
  importHinweis?: string;
  merkblatt?: string;
}

const INDUCTIVE_PHASES: PhaseBlock[] = [
  {
    name: 'Phase A (Entdecken)',
    aufgabenzahl: '1–2 Aufgaben',
    ziel: [
      'Einstieg OHNE vorherige Regel oder Merkblatt.',
      'Schüler leiten das Prinzip selbst ab durch Vergleichen, Sortieren oder Muster erkennen.',
      'Fragen wie "Was fällt dir auf?", "Was haben diese Wörter gemeinsam?", "Sortiere diese Begriffe".',
    ],
    templates: ['was_faellt_auf', 'klassifizierung', 'vergleichstabelle', 'venn_diagramm', 'matching', 'liste_zweispaltig', 'anstreichen', 'anstreichen_nmg'],
    merkblatt: 'KEIN Merkblatt vor dieser Phase.',
  },
  {
    name: 'Phase B (Üben)',
    aufgabenzahl: 'Hauptteil (2–4+ Aufgaben)',
    ziel: [
      'Geleitete Festigung des entdeckten Prinzips.',
      'Klare Aufgabenstellungen mit definierten Lösungen.',
    ],
    templates: ['lueckentext', 'bildbeschriftung', 'konjugations_faecher', 'sachaufgabe', 'rechengitter', 'professor_zipp', 'klammer_luecken', 'dialog_luecken', 'korrektur_zeile', 'matching', 'suchsel'],
    importHinweis: 'Im Import-Modus landen ALLE hochgeladenen Originalaufgaben in dieser Phase. Keine Aufgabe weglassen.',
  },
  {
    name: 'Phase C (Vertiefen)',
    aufgabenzahl: '1 Aufgabe',
    ziel: [
      'Offene, kreative Transfer-Aufgabe in neuem Kontext.',
      'Schüler wenden das Gelernte selbstständig auf ein unbekanntes Szenario an.',
    ],
    templates: ['offene_frage', 'geschichte', 'interview', 'recherche', 'zeichnungsauftrag', 'reflexion', 'bildgeschichte', 'was_faellt_auf'],
  },
];

const DEDUCTIVE_PHASES: PhaseBlock[] = [
  {
    name: 'Phase A (Einführung / Merkblatt)',
    aufgabenzahl: '1 Merkblatt (keine Aufgabe)',
    ziel: [
      'Merkblatt am Kapitelanfang präsentiert die Regel oder das Konzept direkt.',
      'Klar strukturiert, mit Beispielen, einprägsam.',
    ],
    templates: [],
    merkblatt: 'Merkblatt ist PFLICHT am Kapitelanfang, auch wenn der Lehrer keinen expliziten Inhalt angegeben hat. Die KI erstellt ihn themengerecht.',
  },
  {
    name: 'Phase B (Üben)',
    aufgabenzahl: 'Hauptteil (2–4+ Aufgaben)',
    ziel: [
      'Geleitete Festigung der zuvor eingeführten Regel.',
    ],
    templates: ['lueckentext', 'bildbeschriftung', 'konjugations_faecher', 'sachaufgabe', 'rechengitter', 'professor_zipp', 'klammer_luecken', 'korrektur_zeile', 'matching'],
    importHinweis: 'Im Import-Modus landen ALLE hochgeladenen Originalaufgaben in dieser Phase. Keine Aufgabe weglassen.',
  },
  {
    name: 'Phase C (Anwenden)',
    aufgabenzahl: '1 Aufgabe',
    ziel: [
      'Transfer auf einen neuen Kontext. Weniger offen als im induktiven Modus, aber durchaus anspruchsvoll.',
    ],
    templates: ['offene_frage', 'geschichte', 'interview', 'recherche', 'zeichnungsauftrag', 'reflexion'],
  },
];

function renderPhases(phases: PhaseBlock[]): string {
  return phases.map(p => {
    const parts: string[] = [];
    parts.push(`${p.name} — ${p.aufgabenzahl}:`);
    p.ziel.forEach(z => parts.push(`- ${z}`));
    if (p.templates.length > 0) {
      parts.push(`- Bevorzugte Templates: ${p.templates.join(', ')}.`);
    }
    if (p.importHinweis) {
      parts.push(`- ${p.importHinweis}`);
    }
    if (p.merkblatt) {
      parts.push(`- ${p.merkblatt}`);
    }
    return parts.join('\n');
  }).join('\n\n');
}

/**
 * Baut den Prompt-Block für die didaktische Struktur.
 * Gibt "" zurück, wenn approach === 'free' oder undefined.
 */
export function renderDidacticPromptBlock(
  approach: DidacticApproach | '' | undefined,
  scope: DidacticScope | undefined,
  chapters: string | undefined,
): string {
  if (!approach || approach === 'free') return '';

  const phases = approach === 'inductive' ? INDUCTIVE_PHASES : DEDUCTIVE_PHASES;
  const modeLabel = approach === 'inductive'
    ? 'Induktiv — Entdecken → Üben → Vertiefen'
    : 'Deduktiv — Merkblatt → Üben → Anwenden';

  const trimmedChapters = chapters?.trim();
  const scopeLine = (scope === 'selected' && trimmedChapters)
    ? `Wende diese Struktur AUSSCHLIESSLICH auf Kapitel an, deren Titel sinngemäss zu folgenden Namen passen: "${trimmedChapters}". Alle anderen Kapitel strukturierst du frei, ohne Phasen-Vorgabe.`
    : `Wende diese Struktur auf JEDES Kapitel im Dossier an.`;

  const merkblattRule = approach === 'inductive'
    ? 'MERKBLATT-REGEL: Generiere für induktive Kapitel standardmässig KEIN Merkblatt. Füge nur dann eines ein, wenn der Lehrer im Briefing (Feld "Merkblätter" oder "Spezifische Anweisungen") explizit Inhalt oder einen Merkblatt-Wunsch angegeben hat. Falls ein Merkblatt gewünscht ist, platziere es VOR Phase A des betroffenen Kapitels.'
    : 'MERKBLATT-REGEL: Für deduktive Kapitel ist das Merkblatt PFLICHT am Kapitelanfang (= Phase A). Die KI erstellt den Inhalt themengerecht, auch ohne explizite Lehrer-Angabe.';

  return `DIDAKTISCHER AUFBAU (PFLICHT – strukturiert die Aufgabenreihenfolge pro Kapitel):
Modus: ${modeLabel}.

${renderPhases(phases)}

GELTUNGSBEREICH:
${scopeLine}

${merkblattRule}

PHASEN-VERTEILUNG:
Verteile die Gesamt-Aufgabenzahl selbständig auf die Phasen (Schwerpunkt Phase B). Halte dich an konkrete Mengen-Angaben des Lehrers, falls vorhanden (diese stehen in "Spezifische Anweisungen").

KEINE sichtbaren Phasen-Labels, Badges, Überschriften oder Hinweise wie "Phase A", "Entdecken", "🔍", "Üben" etc. im generierten HTML. Die Struktur wirkt ausschliesslich durch die Reihenfolge der Aufgaben.`;
}

export function getDidacticShortLabel(approach: DidacticApproach | '' | undefined): string | null {
  if (!approach) return null;
  return DIDACTIC_OPTIONS.find(o => o.id === approach)?.label ?? null;
}

export function formatDidacticBriefing(
  approach: DidacticApproach | '' | undefined,
  scope: DidacticScope | undefined,
  chapters: string | undefined,
): string {
  if (!approach || approach === 'free') return 'Keine didaktische Vorgabe';
  const label = getDidacticShortLabel(approach);
  const trimmed = chapters?.trim();
  if (scope === 'selected' && trimmed) {
    return `${label} (nur für: ${trimmed})`;
  }
  return `${label} (ganzes Dossier)`;
}
