import { EXERCISE_TEMPLATES } from '../constants';

interface SubjectGroup {
  label: string;
  icon: string;
  tagline: string;
  ids: string[];
}

// Templates exklusiv in GENAU EINER Gruppe – keine Dopplungen in der Galerie.
// Reihenfolge der Gruppen = Reihenfolge im Dossier.
const SUBJECT_GROUPS: SubjectGroup[] = [
  {
    label: 'Mathematik',
    icon: '🧮',
    tagline: 'Rechnen, Zahlenräume, mathematische Darstellungen.',
    ids: [
      'geld_rechnen', 'rechengitter', 'punktraster', 'rechenmauer',
      'sachaufgabe', 'stellenwerttafel', 'uhrzeit', 'zeitspanne_tabelle',
      'zahlenhaus', 'zahlenreihe', 'zahlenstrahl',
    ],
  },
  {
    label: 'Natur, Mensch, Gesellschaft',
    icon: '🌱',
    tagline: 'Experimente, Steckbriefe, Zeitachsen, Recherche.',
    ids: [
      'matching', 'bildbeschriftung', 'experiment', 'film_fragen', 'interview',
      'lebenszyklus', 'bild_beschriftung_multi', 'mindmap', 'recherche',
      'steckbrief', 'steckbrief_gross', 'anstreichen_nmg', 'ursache_wirkung',
      'vergleichstabelle', 'zeitstrahl',
    ],
  },
  {
    label: 'Sprachen',
    icon: '📖',
    tagline: 'Wortschatz, Grammatik, Lese- und Schreibtexte.',
    ids: [
      'abc_liste', 'bildgeschichte', 'dialog_luecken', 'geschichte',
      'konjugations_faecher', 'korrektur_zeile', 'klammer_luecken', 'lueckentext',
      'professor_zipp', 'reimpaare', 'satz_transformator', 'anstreichen',
      'liste_zweispaltig', 'w_fragen', 'eindringling',
    ],
  },
  {
    label: 'Allgemein',
    icon: '📚',
    tagline: 'Vielseitige Templates für alle Fächer.',
    ids: [
      'checkbox-table', 'klassifizierung', 'kwl_chart', 'offene_frage',
      'reflexion', 'table', 'suchsel', 't_chart', 'venn_diagramm',
      'zeichnungsauftrag', 'ziel_checkliste', 'was_faellt_auf',
    ],
  },
];

const coverPage = (): string => `
<div class="p-[2cm] min-h-[29.7cm] flex flex-col justify-center items-center relative border-b border-gray-100">
  <div class="text-center space-y-8 mt-20">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-semibold text-gray-600 uppercase tracking-widest">TEACHER STUDIO</h3>
    <h1 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[36pt] font-black text-gray-900 leading-none">Überblick &ndash; <br>Funktionen &amp; Templates</h1>
    <div class="w-24 h-1 bg-blue-600 rounded-full my-8 mx-auto"></div>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[12pt] text-gray-500 max-w-lg mx-auto">Dein Einstiegs-Dossier. Hier findest du alle Editor-Funktionen und die verfügbaren Aufgaben-Templates nach Fächern sortiert. Du kannst dieses Dossier jederzeit löschen, wenn du es nicht mehr brauchst.</p>
  </div>
</div>
<div class="page-break"></div>`;

const tocPage = (): string => `
<div class="p-[2cm]">
  <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold mb-6 border-b-2 border-black pb-2">Inhaltsverzeichnis</h2>
  <ul id="toc-list" class="space-y-1 mb-8 max-w-2xl text-[20pt]"></ul>
</div>
<div class="page-break"></div>`;

const chapterCover = (num: number, title: string, icon: string, tagline: string): string => `
<div class="p-[2cm] min-h-[29.7cm] flex flex-col justify-center items-center">
  <div class="text-center space-y-6">
    <div class="text-[80pt] leading-none">${icon}</div>
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[14pt] font-semibold text-gray-500 uppercase tracking-widest">Kapitel ${num}</h3>
    <h1 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[36pt] font-black text-gray-900 leading-none">${title}</h1>
    <div class="w-24 h-1 bg-blue-600 rounded-full my-8 mx-auto"></div>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[14pt] text-gray-600 max-w-lg mx-auto">${tagline}</p>
  </div>
</div>
<div class="page-break"></div>`;

const featureBox = (icon: string, title: string, items: { name: string; desc: string }[]): string => {
  const li = items.map(i =>
    `<li class="editable" contenteditable="true"><strong contenteditable="true" class="editable">${i.name}</strong> – ${i.desc}</li>`
  ).join('\n      ');
  return `
<div class="p-[2cm]">
  <div class="avoid-break p-6 rounded-xl border-2 bg-blue-50 border-blue-200 mb-6 text-[12pt]">
    <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold mb-3 flex items-center text-blue-900"><span class="text-[24pt] mr-3">${icon}</span>${title}</h2>
    <ul class="list-disc mb-2 editable" contenteditable="true">
      ${li}
    </ul>
  </div>
</div>`;
};

const featuresChapter = (): string => {
  const cover = chapterCover(
    1,
    'Funktionen',
    '🛠️',
    'Ein Überblick über die Editor-Werkzeuge – Toolbar-Reihen, KI-Chat, Verwaltung, Export.',
  );

  const reihe1 = featureBox('🎨', 'Toolbar Reihe 1 – Inhalt & Formatieren', [
    { name: 'Rückgängig / Wiederholen', desc: 'Schritt zurück bzw. vor (Ctrl+Z / Ctrl+Shift+Z).' },
    { name: 'Fett / Kursiv / Unterstrichen', desc: 'Textauszeichnung für markierten Text.' },
    { name: 'Grösse', desc: 'Schriftgrösse von 10pt bis 36pt.' },
    { name: 'Textfarbe', desc: 'Farbpalette per Klick auf das A-Symbol.' },
    { name: 'Bild einfügen', desc: 'Lokales Bild hochladen oder KI-Bild generieren lassen.' },
    { name: 'Image-Marker', desc: 'Nummerierte Marker auf Bildern platzieren (für Beschriftungsaufgaben).' },
    { name: 'Teilaufgabe hinzufügen (+)', desc: 'KI hängt neue Teilaufgaben im gleichen Format an den aktiven Block an.' },
  ]);

  const reihe2 = featureBox('🗂', 'Toolbar Reihe 2 – Struktur & Lösungen', [
    { name: 'Struktur einfügen', desc: 'Vorgefertigte Blöcke: Textabschnitt, Merkblätter, Inhaltsverzeichnis, alle Fach-Templates.' },
    { name: 'Format wählen', desc: 'Markierten Text zu Haupttitel (h1), Untertitel (h2), Aufgabentitel (h3) oder Standardtext (p) umwandeln.' },
    { name: 'Markieren', desc: 'Markierten Text als Lösung kennzeichnen (im Schülermodus unsichtbar).' },
    { name: 'Lücke', desc: 'Lücke mit Linie einfügen – Lösung erscheint auf der Linie im Lehrermodus.' },
    { name: 'Durchstr.', desc: 'Wort im Lösungsmodus durchgestrichen anzeigen.' },
    { name: 'Anstreichen', desc: 'Wort im Lösungsmodus farbig hinterlegen.' },
    { name: 'Lösungs-Toggle 👁', desc: 'Zwischen Schüler- und Lehrer-Ansicht umschalten.' },
  ]);

  const reihe3 = featureBox('✨', 'Toolbar Reihe 3 – KI, Block & Zoom', [
    { name: 'Smart-Paste', desc: 'Text/Tabelle aus Zwischenablage mit KI zu einer Aufgabe umformen – optional an Dossier-Thema anpassen.' },
    { name: 'KI-Aufgabe', desc: 'Neue Aufgabe per Thema-Prompt generieren – delegiert an den Chat mit vollem Dossier-Kontext.' },
    { name: 'Block kopieren / einfügen', desc: 'Ganzen Block in die Zwischenablage legen und woanders einsetzen.' },
    { name: 'Block nach oben / unten', desc: 'Reihenfolge der Blöcke ändern.' },
    { name: 'Seitenumbruch', desc: 'Manueller Page-Break – erzwingt neue Seite im PDF.' },
    { name: 'Block löschen', desc: 'Entfernt den aktiven Block mit Bestätigung.' },
    { name: 'Zoom +/−', desc: 'Editor-Darstellung vergrössern (beeinflusst nicht den PDF-Export).' },
  ]);

  const chat = featureBox('💬', 'KI-Chat (Seitenleiste)', [
    { name: 'Kontext-bewusst', desc: 'Kennt das aktuelle Dossier und alle Blöcke.' },
    { name: 'Blöcke ändern', desc: 'Auf Anweisung kann der Chat einzelne Blöcke umschreiben, ergänzen oder kürzen.' },
    { name: 'Templates einfügen', desc: 'Fragt z.B. nach "Lückentext zum Herbst" und der Chat wählt das passende Template.' },
    { name: 'Bilder generieren', desc: 'Erzeugt KI-Bilder direkt in Template-Slots (z.B. Steckbrief-Bild).' },
    { name: 'Theme ändern', desc: 'Farbschema des Dossiers per Befehl umstellen.' },
  ]);

  const mgmt = featureBox('📋', 'Dossier-Verwaltung (Kopfzeile)', [
    { name: 'Verlauf', desc: 'Snapshots vor jeder KI-Aktion – Versionen wiederherstellen.' },
    { name: 'Aufg.-Sync', desc: 'Aufgaben-Nummerierung automatisch korrigieren (A.1, A.2, A.3 …).' },
    { name: 'Auto-Sync', desc: 'Periodisches Speichern im Browser ein-/ausschalten.' },
    { name: 'Laden / Speichern', desc: 'Dossier als JSON-Datei exportieren und später wieder einlesen.' },
  ]);

  const design = featureBox('🎨', 'Design & Export', [
    { name: 'Design', desc: 'Rahmen, Hintergrundfarben und Emoji-Symbole auf Blöcke anwenden.' },
    { name: 'Cover-Design', desc: 'Titelseite gestalten – Hintergrundbild, Layout, Typografie.' },
    { name: 'PDF Download', desc: 'Dossier als mehrseitiges A4-PDF exportieren – mit Titelseite und Inhaltsverzeichnis.' },
  ]);

  return [
    cover,
    reihe1,
    reihe2,
    reihe3,
    '<div class="page-break"></div>',
    chat,
    mgmt,
    design,
  ].join('\n');
};

const templateCard = (name: string, html: string): string => {
  // THEME-Platzhalter aus Template-HTML mit einer neutralen Farbe ersetzen.
  const themed = html.replace(/THEME/g, 'blue');
  return `
<div class="p-[2cm]">
  <div class="mb-2 pb-2 border-b border-gray-300">
    <span class="text-[10pt] font-semibold text-gray-500 uppercase tracking-widest">Template</span>
    <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[18pt] font-bold text-gray-900 mt-1">${name}</h2>
  </div>
  ${themed}
</div>`;
};

const subjectChapter = (num: number, group: SubjectGroup): string => {
  const cover = chapterCover(num, group.label, group.icon, group.tagline);
  const cards: string[] = [];
  for (const id of group.ids) {
    const tpl = EXERCISE_TEMPLATES.find(t => t.id === id);
    if (!tpl) continue;
    cards.push(templateCard(tpl.name, tpl.html));
  }
  return [cover, cards.join('\n<div class="page-break"></div>\n')].join('\n');
};

export function buildWelcomeHTML(): string {
  const chapters: string[] = [];
  chapters.push(coverPage());
  chapters.push(tocPage());
  chapters.push(featuresChapter());

  SUBJECT_GROUPS.forEach((group, i) => {
    chapters.push('<div class="page-break"></div>');
    chapters.push(subjectChapter(i + 2, group));
  });

  return chapters.join('\n');
}
