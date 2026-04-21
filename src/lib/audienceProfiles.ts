export type AudienceLevel = 'KL_1_2' | 'KL_3_4' | 'KL_5_6' | 'SEK_1';

export interface AudienceOption {
  id: AudienceLevel;
  label: string;
  shortLabel: string;
  description: string;
}

export const AUDIENCE_LEVELS: AudienceOption[] = [
  {
    id: 'KL_1_2',
    label: '1.–2. Klasse (6–8 Jahre)',
    shortLabel: '1./2. Klasse',
    description: 'Leseanfänger, einfachste Sprache, viel Bild',
  },
  {
    id: 'KL_3_4',
    label: '3.–4. Klasse (8–10 Jahre)',
    shortLabel: '3./4. Klasse',
    description: 'Erweiterter Grundwortschatz, einfache Nebensätze',
  },
  {
    id: 'KL_5_6',
    label: '5.–6. Klasse (10–12 Jahre)',
    shortLabel: '5./6. Klasse',
    description: 'Fachbegriffe mit Kontext, differenzierte Aufgaben',
  },
  {
    id: 'SEK_1',
    label: '7.–9. Klasse / Sek I (12–15 Jahre)',
    shortLabel: '7.–9. Klasse',
    description: 'Abstraktes Denken, Fachsprache, komplexe Aufgaben',
  },
];

interface ProfileBlock {
  stufe: string;
  satzbau: string[];
  wortwahl: string[];
  beispielGut: string;
  beispielZuSchwer: string | null;
  kognitiv: string[];
  mengen: string[];
  ton: string[];
  pruefung: string;
}

const PROFILES: Record<AudienceLevel, ProfileBlock> = {
  KL_1_2: {
    stufe: '1.–2. Klasse (6–8 Jahre, Zyklus 1 Ende)',
    satzbau: [
      'Satzlänge durchschnittlich 6–9 Wörter, absolut maximal 9.',
      'Fast ausschliesslich Hauptsätze (Parataxe). Keine Nebensätze.',
      'Keine Passivkonstruktionen. Kein Konjunktiv. Keine Nominalisierungen.',
      'Kurze Wörter bevorzugen (1,2–1,4 Silben pro Wort).',
    ],
    wortwahl: [
      'Nur Grundwortschatz der 1./2. Klasse (ca. 500–800 aktive Wörter).',
      'Keine Fremdwörter. Wenn ein Fachbegriff nötig ist, im selben Satz mit Alltagswort erklären.',
      'Konkrete, bildhafte Wörter aus dem unmittelbaren Umfeld: Familie, Schule, Tiere, Jahreszeiten, Essen.',
    ],
    beispielGut: 'Die Katze schläft auf dem Sofa.',
    beispielZuSchwer: 'Das Tier befindet sich in einem Ruhezustand auf dem Polstermöbel.',
    kognitiv: [
      'Anforderungsniveau I (Bloom: Erinnern, Verstehen).',
      'Typische Operatoren: benennen, erkennen, zeigen, anmalen, verbinden, nachsprechen.',
      'Maximal 1–2 neue Konzepte pro Aufgabe.',
    ],
    mengen: [
      'Lückentexte: 2–3 kurze Sätze mit insgesamt 2–4 Lücken.',
      'Tabellen: 4–5 Zeilen.',
      'Matching / Zuordnung: 4–6 Paare.',
      'Klassifizierung / Wörter sortieren: 6–8 Begriffe.',
      'Offene Fragen: Eine einzige, konkrete Frage mit Bildbezug.',
      'Arbeitsdauer pro Aufgabe: 3–5 Minuten.',
    ],
    ton: [
      'Du-Form, spielerisch, ermutigend.',
      'Kurze, klare Imperative: "Male an", "Kreise ein", "Verbinde".',
      'Soviel Bild wie möglich (60–80 % der Aufgaben sollen Bildbezug haben).',
    ],
    pruefung: 'Würde ein Erstklässler den Text laut vorlesen und danach verstehen, was zu tun ist?',
  },
  KL_3_4: {
    stufe: '3.–4. Klasse (8–10 Jahre, Zyklus 2 Anfang)',
    satzbau: [
      'Satzlänge durchschnittlich 8–12 Wörter, maximal 12.',
      '75–80 % Hauptsätze, 20–25 % einfache Nebensätze (weil, dass, wenn, damit).',
      'Keine Passivkonstruktionen. Kein Konjunktiv. Keine Nominalisierungen.',
      'Wortlänge 1,4–1,6 Silben pro Wort.',
    ],
    wortwahl: [
      'Erweiterter Grundwortschatz der 3./4. Klasse (ca. 1500–2000 Wörter).',
      'Fremdwörter nur mit Erklärung im selben Satz ("Metamorphose = Verwandlung").',
      'Konkrete Themenbezüge: Schule, Sport, Tiere, Sachthemen aus NMG (Raum, Zeit, Natur).',
    ],
    beispielGut: 'Die Raupe frisst viele Blätter. Danach verpuppt sie sich an einem Ast.',
    beispielZuSchwer: 'Die Larve durchläuft anschliessend eine Verpuppungsphase an einem geeigneten Substrat.',
    kognitiv: [
      'Anforderungsniveau I–II (Verstehen, Anwenden).',
      'Typische Operatoren: benennen, erklären, vergleichen, ordnen, beschreiben, einfach begründen.',
      'Maximal 2–3 neue Konzepte pro Aufgabe.',
      'Progression pro Unterthema: Einstieg (wiedererkennen) → Vertiefung (erklären/anwenden).',
    ],
    mengen: [
      'Lückentexte: 3–5 Sätze mit insgesamt 6–10 Lücken.',
      'Tabellen: 5–7 Zeilen.',
      'Matching / Zuordnung: 6–8 Paare.',
      'Klassifizierung / Wörter sortieren: 10–12 Begriffe.',
      'Offene Fragen: Eine Frage mit konkretem, altersnahem Kontextsatz.',
      'Arbeitsdauer pro Aufgabe: 5–10 Minuten.',
    ],
    ton: [
      'Du-Form, handlungsorientierte Verben: "Schau dir an", "Überlege", "Vergleiche".',
      'Ermutigend, konkret, mit Alltagsbezug.',
      '40–60 % der Aufgaben mit Bildbezug.',
    ],
    pruefung: 'Würde ein durchschnittliches Kind der 3. Klasse den Text ohne Hilfe lesen und sinngemäss verstehen?',
  },
  KL_5_6: {
    stufe: '5.–6. Klasse (10–12 Jahre, Zyklus 2 Ende)',
    satzbau: [
      'Satzlänge durchschnittlich 12–16 Wörter, maximal 16.',
      'Hauptsätze und Nebensätze gemischt (ca. 50/50), inkl. Relativsätze.',
      'Passiv nur gelegentlich und nur, wenn inhaltlich sinnvoll ("Das Schloss wurde gebaut").',
      'Konjunktiv vereinzelt. Nominalisierungen sparsam.',
    ],
    wortwahl: [
      'Differenzierter Wortschatz (ca. 2500–3500 Wörter).',
      'Fachbegriffe aus NMG (Geographie, Geschichte, Naturwissenschaft) sind erlaubt und erwünscht, wenn sie im Kontext eingeführt werden.',
      '10–15 % Fremdwörter/Fachbegriffe, davon wichtige mit Glossar-Erklärung.',
    ],
    beispielGut: 'Vulkane entstehen, wenn flüssiges Magma aus dem Erdinnern an die Oberfläche dringt.',
    beispielZuSchwer: 'Vulkanismus resultiert aus tektonischen Prozessen im Erdmantel unter Einwirkung konvektiver Strömungen.',
    kognitiv: [
      'Anforderungsniveau II mit Ansätzen zu III (Anwenden, Analysieren, einfache Synthese).',
      'Typische Operatoren: analysieren, untersuchen, begründen, vergleichen, schlussfolgern, bewerten (einfach).',
      '3–4 neue Konzepte pro Aufgabe verkraftbar.',
      'Mehrschrittige Aufgaben sind erwartbar.',
    ],
    mengen: [
      'Lückentexte: 5–7 Sätze mit insgesamt 8–12 Lücken.',
      'Tabellen: 6–8 Zeilen.',
      'Matching / Zuordnung: 8–10 Paare.',
      'Klassifizierung / Wörter sortieren: 12–16 Begriffe.',
      'Offene Fragen: Präzise Operatorenfrage mit konkretem Kontext, ggf. mehrstufig.',
      'Arbeitsdauer pro Aufgabe: 10–15 Minuten.',
    ],
    ton: [
      'Du-Form, präzise Operatoren ("Begründe", "Vergleiche", "Erkläre, warum ...").',
      'Sachlich, aber noch nicht formal.',
      '20–40 % Bildbezug — Bilder dienen der Analyse, nicht nur der Dekodierungshilfe.',
    ],
    pruefung: 'Hat die Aufgabe einen klaren Operator und einen sinnvollen Schwierigkeitsgrad für die 5./6. Klasse?',
  },
  SEK_1: {
    stufe: '7.–9. Klasse / Sekundarstufe I (12–15 Jahre, Zyklus 3)',
    satzbau: [
      'Satzlänge durchschnittlich 14–20 Wörter, maximal 20.',
      'Nebensätze, Relativsätze, Konjunktiv (ca. 15 %) und Passiv (ca. 10 %) sind normal.',
      'Nominalisierungen erlaubt, wenn sie der Präzision dienen.',
    ],
    wortwahl: [
      'Differenzierter Wortschatz (3500–4500+ Wörter), fachsprachlich korrekt.',
      'Fremdwörter und Fachbegriffe (15–25 %) müssen nicht mehr obligatorisch erklärt werden — Schüler sollen Kontext-Dekodierung üben.',
      'Themen dürfen abstrakt sein: Demokratie, Globalisierung, chemische Bindungen, historische Perspektiven.',
    ],
    beispielGut: 'Die industrielle Revolution veränderte die Arbeitswelt grundlegend, weil Maschinen menschliche Arbeit ersetzten und neue Fabriksysteme entstanden.',
    beispielZuSchwer: null,
    kognitiv: [
      'Anforderungsniveau II–III dominant (Analysieren, Bewerten, Begründen, Reflektieren).',
      'Typische Operatoren: analysieren, bewerten, begründen, reflektieren, Stellung nehmen, hypothetisieren, erörtern, kritisch prüfen.',
      '4–5 neue Konzepte pro Aufgabe möglich.',
      'Aufgaben dürfen mehrere akzeptable Antworten haben; Transfer ist erwartet.',
    ],
    mengen: [
      'Lückentexte: 6–10 Sätze mit insgesamt 10–15 Lücken.',
      'Tabellen: 7–10 Zeilen.',
      'Matching / Zuordnung: 10–12 Paare.',
      'Klassifizierung / Wörter sortieren: 15–20 Begriffe.',
      'Offene Fragen: Ausführliche Operatorenfrage, ggf. mit Teilaufgaben und Quellenbezug.',
      'Arbeitsdauer pro Aufgabe: 15–25 Minuten.',
    ],
    ton: [
      'Du-Form in interaktiven Aufgaben, Sie-Form in formellen schriftlichen Kontexten.',
      'Sachlich, präzise, fachlich. Selbstverantwortung wird vorausgesetzt.',
      'Bilder nur noch bei Bedarf (<20 % der Aufgaben), dann analytisch.',
    ],
    pruefung: 'Fordert die Aufgabe eigenständiges Denken auf Sek-I-Niveau und ist sie fachlich präzis formuliert?',
  },
};

function renderProfile(p: ProfileBlock): string {
  const beispielZeile = p.beispielZuSchwer
    ? `    GUT:       "${p.beispielGut}"\n    ZU SCHWER: "${p.beispielZuSchwer}"`
    : `    GUT: "${p.beispielGut}"`;

  return `ZIELGRUPPEN-PROFIL (PFLICHT – jeder Inhalt muss dazu passen):
Stufe: ${p.stufe}

SPRACHE & SATZBAU:
${p.satzbau.map(s => `- ${s}`).join('\n')}

WORTWAHL:
${p.wortwahl.map(s => `- ${s}`).join('\n')}
- Beispielstil:
${beispielZeile}

KOGNITIVE TIEFE:
${p.kognitiv.map(s => `- ${s}`).join('\n')}

MENGEN (ERSETZEN die globalen Mindestwerte – folge DIESEN Zahlen):
${p.mengen.map(s => `- ${s}`).join('\n')}

ANREDE & TON:
${p.ton.map(s => `- ${s}`).join('\n')}

PRÜFE nach jeder Aufgabe: ${p.pruefung}
Falls nicht erfüllt → vereinfachen bzw. anpassen.`;
}

/**
 * Baut den Prompt-Block, der in eine systemInstruction eingehängt wird.
 * Gibt "" zurück, wenn keine Stufe gesetzt ist (Rückwärtskompatibilität).
 */
export function renderAudiencePromptBlock(
  level: AudienceLevel | '' | undefined,
  teacherOverride?: string,
): string {
  if (!level) return '';
  const profile = PROFILES[level as AudienceLevel];
  if (!profile) return '';

  let block = renderProfile(profile);

  const trimmedOverride = teacherOverride?.trim();
  if (trimmedOverride) {
    block += `\n\nWICHTIG: Der Lehrer hat spezifische Anweisungen gegeben, die dieses Profil bei Konflikten ÜBERSCHREIBEN:\n"${trimmedOverride}"`;
  }
  return block;
}

export function getAudienceShortLabel(level: AudienceLevel | '' | undefined): string | null {
  if (!level) return null;
  return AUDIENCE_LEVELS.find(l => l.id === level)?.shortLabel ?? null;
}

export function getAudienceLabel(level: AudienceLevel | '' | undefined): string | null {
  if (!level) return null;
  return AUDIENCE_LEVELS.find(l => l.id === level)?.label ?? null;
}
