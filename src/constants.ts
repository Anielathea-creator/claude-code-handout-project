export interface ExerciseTemplate {
  id: string;
  name: string;
  html: string;
}

// Renders an analog clock face (SVG) with all 12 numbers and adjustable hands.
// Hour/minute hands are rotated via the SVG `transform` attribute so Editor.tsx
// can update them when the digital time (`.clock-time` text) is edited.
const clockSvg = (hours: number, minutes: number, sizeClass: string = 'w-28 h-28'): string => {
  const hAngle = ((hours % 12) + minutes / 60) * 30;
  const mAngle = (minutes % 60) * 6;
  return `<svg viewBox="0 0 100 100" class="${sizeClass}">
    <circle cx="50" cy="50" r="48" fill="white" stroke="#374151" stroke-width="2"/>
    <text x="50" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">12</text>
    <text x="67" y="23" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">1</text>
    <text x="79" y="36" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">2</text>
    <text x="84" y="53" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">3</text>
    <text x="79" y="70" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">4</text>
    <text x="67" y="82" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">5</text>
    <text x="50" y="87" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">6</text>
    <text x="33" y="82" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">7</text>
    <text x="21" y="70" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">8</text>
    <text x="16" y="53" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">9</text>
    <text x="21" y="36" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">10</text>
    <text x="33" y="23" text-anchor="middle" font-size="9" font-weight="bold" fill="#374151">11</text>
    <line class="clock-hand-hour" x1="50" y1="50" x2="50" y2="28" stroke="#111827" stroke-width="3" stroke-linecap="round" transform="rotate(${hAngle} 50 50)"/>
    <line class="clock-hand-minute" x1="50" y1="50" x2="50" y2="14" stroke="#111827" stroke-width="2" stroke-linecap="round" transform="rotate(${mAngle} 50 50)"/>
    <circle cx="50" cy="50" r="2.5" fill="#111827"/>
  </svg>`;
};

export const EXERCISE_TEMPLATES: ExerciseTemplate[] = [
  {
    id: "table",
    name: "Standard-Tabelle",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Tabelle</h3>
  <p class="editable mb-2" contenteditable="true">Aufgabenstellung für die Tabelle...</p>
  <table class="w-full border-collapse border-2 border-gray-300">
    <thead>
      <tr class="bg-gray-100">
        <th class="border-2 border-gray-300 p-3 editable font-bold" contenteditable="true">Header 1</th>
        <th class="border-2 border-gray-300 p-3 editable font-bold" contenteditable="true">Header 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border-2 border-gray-300 p-3 editable" contenteditable="true">Zelle 1</td>
        <td class="border-2 border-gray-300 p-3 editable" contenteditable="true">Zelle 2</td>
      </tr>
    </tbody>
  </table>
</div>`
  },
  {
    id: "checkbox-table",
    name: "Ankreuz-Tabelle",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Ankreuzen</h3>
  <p class="editable mb-2" contenteditable="true">Aufgabenstellung für die Tabelle...</p>
  <table class="w-full border-collapse border-2 border-gray-300">
    <thead>
      <tr class="bg-gray-100">
        <th class="border-2 border-gray-300 p-3 editable font-bold" contenteditable="true">Kriterium</th>
        <th class="border-2 border-gray-300 p-3 text-center w-16">Ja</th>
        <th class="border-2 border-gray-300 p-3 text-center w-16">Nein</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border-2 border-gray-300 p-3 editable" contenteditable="true">Beispiel Kriterium</td>
        <td class="border-2 border-gray-300 p-3 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
        <td class="border-2 border-gray-300 p-3 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
      </tr>
    </tbody>
  </table>
</div>`
  },
  {
    id: "lueckentext",
    name: "Lückentext (mit Wörtern)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Lückentext</h3>
  <p class="editable text-gray-600 mb-3 italic" contenteditable="true">Setze die passenden Wörter ein: Baum, Haus, Katze, Sonne</p>
  <div class="leading-loose">
    <p class="editable" contenteditable="true">Das ist ein wunderschönes <span class="gap-line"><span class="is-answer">Haus</span></span>. Daneben steht ein alter, großer <span class="gap-line"><span class="is-answer">Baum</span></span> im Garten.</p>
  </div>
</div>`
  },
  {
    id: "anstreichen",
    name: "Text zum Anstreichen (Sprachen)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Textarbeit</h3>
  <p class="editable text-gray-600 mb-3" contenteditable="true">Übermale alle Verben (Tunwörter) im folgenden Text.</p>
  <div class="p-6 bg-gray-50 border border-gray-200 rounded-xl leading-loose">
    <p class="editable" contenteditable="true">Der Hund <span class="is-highlight-answer">rennt</span> schnell über die weite Wiese. Die kleine Katze <span class="is-highlight-answer">schläft</span> lieber gemütlich auf dem weichen Sofa.</p>
  </div>
</div>`
  },
  {
    id: "anstreichen_nmg",
    name: "Text zum Anstreichen (NMG)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Textarbeit – Wald</h3>
  <p class="editable text-gray-600 mb-3" contenteditable="true">Lies den Text und markiere alle Baumarten, die vorkommen.</p>
  <div class="p-6 bg-gray-50 border border-gray-200 rounded-xl leading-loose">
    <p class="editable" contenteditable="true">Der Schweizer Wald ist vielfältig. Im Mittelland findet man vor allem die <span class="is-highlight-answer">Buche</span> und die <span class="is-highlight-answer">Eiche</span>. In den höheren Lagen wachsen dagegen die <span class="is-highlight-answer">Fichte</span> und die <span class="is-highlight-answer">Tanne</span>. Entlang von Flüssen sieht man oft die <span class="is-highlight-answer">Weide</span> und die <span class="is-highlight-answer">Erle</span>. Im Herbst leuchten die Blätter der <span class="is-highlight-answer">Birke</span> und des <span class="is-highlight-answer">Ahorns</span> besonders schön. Auch die <span class="is-highlight-answer">Linde</span> ist ein häufiger Baum in vielen Dörfern.</p>
  </div>
</div>`
  },
  {
    id: "geschichte",
    name: "Lesetext / Geschichte",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[16pt] mb-3 text-THEME-700" contenteditable="true">Titel der Geschichte</h3>
  <div class="p-6 bg-white border-2 border-THEME-100 rounded-xl leading-relaxed space-y-3">
    <p class="editable text-gray-900" contenteditable="true">Es war einmal ein kleiner Hund, der jeden Morgen durch das Dorf lief. Er kannte jede Gasse und jede Tür.</p>
    <p class="editable text-gray-900" contenteditable="true">Eines Tages entdeckte er hinter einem alten Zaun etwas, das er noch nie zuvor gesehen hatte …</p>
    <p class="editable text-gray-900" contenteditable="true">(Hier kannst du die Geschichte weiterschreiben oder von der KI ergänzen lassen.)</p>
  </div>
</div>`
  },
  {
    id: "eindringling",
    name: "Wortfamilien-Eindringling",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Finde den Eindringling</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Streiche das Wort durch, das nicht zur Wortfamilie gehört.</p>
  <ul class="space-y-3 list-none pl-0">
    <li class="editable" contenteditable="true">a) fahren – die Fahrt – <span class="is-strikethrough-answer">die Gefahr</span> – das Fahrzeug</li>
    <li class="editable" contenteditable="true">b) spielen – das Spielzeug – <span class="is-strikethrough-answer">der Spiegel</span> – verspielt</li>
  </ul>
</div>`
  },
  {
    id: "klassifizierung",
    name: "Klassifizierungs-Tabelle",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Wörter sortieren</h3>
  <p class="editable text-gray-600 mb-2" contenteditable="true">Ordne die Wörter in die richtige Spalte ein.</p>
  <p class="editable text-gray-600 mb-4 italic" contenteditable="true">laufen, Tisch, schön, schnell, Hund, arbeiten</p>
  <table class="w-full border-collapse border-2 border-gray-300">
    <thead>
      <tr class="bg-gray-100">
        <th class="border border-gray-300 p-3 editable w-1/3 font-bold" contenteditable="true">Nomen</th>
        <th class="border border-gray-300 p-3 editable w-1/3 font-bold" contenteditable="true">Verben</th>
        <th class="border border-gray-300 p-3 editable w-1/3 font-bold" contenteditable="true">Adjektive</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-gray-300 p-3 align-top leading-loose" contenteditable="true"><span class="is-answer">Tisch<br>Hund</span></td>
        <td class="border border-gray-300 p-3 align-top leading-loose" contenteditable="true"><span class="is-answer">laufen<br>arbeiten</span></td>
        <td class="border border-gray-300 p-3 align-top leading-loose" contenteditable="true"><span class="is-answer">schön<br>schnell</span></td>
      </tr>
    </tbody>
  </table>
</div>`
  },
  {
    id: "steckbrief",
    name: "Steckbrief",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Steckbrief</h3>
  <div class="border-2 border-gray-300 rounded-xl p-6 bg-white shadow-sm overflow-hidden">
    <div class="ai-image-slot resize overflow-hidden w-1/3 float-left mr-6 mb-4 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 editable cursor-pointer hover:bg-gray-100 transition-colors image-placeholder-trigger" contenteditable="true" title="Doppelklick für Bild-Optionen – Ecke unten rechts zum Vergrößern">
      [Bild hier einfügen]
    </div>
    <div class="mb-4">
      <span class="font-bold editable" contenteditable="true">Name:</span>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Rotfuchs</span></div>
    </div>
    <div class="mb-4">
      <span class="font-bold editable" contenteditable="true">Lebensraum:</span>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Wälder, Wiesen, Städte</span></div>
    </div>
    <div>
      <span class="font-bold editable" contenteditable="true">Nahrung:</span>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Mäuse, Beeren, Insekten</span></div>
    </div>
  </div>
</div>`
  },
  {
    id: "matching",
    name: "Begriffs-Paare (Matching)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Begriffe zuordnen</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Schreibe die richtige Nummer aus der linken Spalte in das Kästchen der rechten Spalte.</p>
  <div class="flex gap-8">
    <div class="w-1/2 flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 flex items-center justify-center font-bold shrink-0">1.</div>
        <span class="editable flex-1 p-2 bg-gray-50 border border-gray-200 rounded" contenteditable="true">Apfel</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 flex items-center justify-center font-bold shrink-0">2.</div>
        <span class="editable flex-1 p-2 bg-gray-50 border border-gray-200 rounded" contenteditable="true">Hund</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 flex items-center justify-center font-bold shrink-0">3.</div>
        <span class="editable flex-1 p-2 bg-gray-50 border border-gray-200 rounded" contenteditable="true">Auto</span>
      </div>
    </div>
    <div class="w-1/2 flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 border-2 border-gray-400 rounded flex items-center justify-center font-bold editable shrink-0" contenteditable="true"><span class="is-answer">3</span></div>
        <span class="editable flex-1 p-2 bg-gray-50 border border-gray-200 rounded" contenteditable="true">Fahrzeug</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 border-2 border-gray-400 rounded flex items-center justify-center font-bold editable shrink-0" contenteditable="true"><span class="is-answer">1</span></div>
        <span class="editable flex-1 p-2 bg-gray-50 border border-gray-200 rounded" contenteditable="true">Frucht</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 border-2 border-gray-400 rounded flex items-center justify-center font-bold editable shrink-0" contenteditable="true"><span class="is-answer">2</span></div>
        <span class="editable flex-1 p-2 bg-gray-50 border border-gray-200 rounded" contenteditable="true">Tier</span>
      </div>
    </div>
  </div>
</div>`
  },
  {
    id: "venn_diagramm",
    name: "Venn-Diagramm",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Gemeinsamkeiten & Unterschiede</h3>
  <p class="editable text-gray-600 mb-6" contenteditable="true">Trage die Eigenschaften in das Venn-Diagramm ein.</p>
  
  <div class="relative flex justify-center h-[280px] w-full max-w-2xl mx-auto mt-4">
    <div class="absolute left-0 w-[60%] h-full rounded-full border-4 border-blue-300 bg-transparent z-10"></div>
    <div class="absolute right-0 w-[60%] h-full rounded-full border-4 border-emerald-300 bg-transparent z-10"></div>
    
    <div class="absolute left-[8%] top-[30%] w-[25%] text-center editable z-20" contenteditable="true">
      <span class="font-bold text-blue-700">Thema A</span><br><br>
      <span class="is-answer">Eigenschaft 1</span>
    </div>
    
    <div class="absolute right-[8%] top-[30%] w-[25%] text-center editable z-20" contenteditable="true">
      <span class="font-bold text-emerald-700">Thema B</span><br><br>
      <span class="is-answer">Eigenschaft 2</span>
    </div>
    
    <div class="absolute left-[37.5%] top-[30%] w-[25%] text-center editable z-20" contenteditable="true">
      <span class="font-bold text-gray-700">Gemeinsam</span><br><br>
      <span class="is-answer">Eigenschaft 3</span>
    </div>
  </div>
</div>`
  },
  {
    id: "bildbeschriftung",
    name: "Bildbeschriftung",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Bild beschriften</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Schreibe die passenden Begriffe auf die Linien.</p>
  <div class="flex flex-col items-center border-2 border-gray-100 rounded-xl p-6 bg-white shadow-sm">
    <div class="ai-image-slot resize overflow-hidden w-full max-w-md min-h-[12rem] border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 editable cursor-pointer hover:bg-gray-100 transition-colors image-placeholder-trigger" contenteditable="true" data-no-reposition="true" title="Ecke unten rechts zum Vergrößern ziehen">
      [Bild hier einfügen]
    </div>
    <div class="numbered-label-list numbered-label-list-3col grid grid-cols-[auto_auto_auto] gap-x-6 gap-y-1 justify-between w-full mt-6">
       <p class="numbered-label-row flex items-end gap-2 editable" contenteditable="true"><span class="numbered-label-index font-bold text-gray-500">1.</span> <span class="schreib-linie inline-block min-w-[9rem]"><span class="is-answer">Beschriftung 1</span></span></p>
       <p class="numbered-label-row flex items-end gap-2 editable" contenteditable="true"><span class="numbered-label-index font-bold text-gray-500">2.</span> <span class="schreib-linie inline-block min-w-[9rem]"><span class="is-answer">Beschriftung 2</span></span></p>
       <p class="numbered-label-row flex items-end gap-2 editable" contenteditable="true"><span class="numbered-label-index font-bold text-gray-500">3.</span> <span class="schreib-linie inline-block min-w-[9rem]"><span class="is-answer">Beschriftung 3</span></span></p>
       <p class="numbered-label-row flex items-end gap-2 editable" contenteditable="true"><span class="numbered-label-index font-bold text-gray-500">4.</span> <span class="schreib-linie inline-block min-w-[9rem]"><span class="is-answer">Beschriftung 4</span></span></p>
       <p class="numbered-label-row flex items-end gap-2 editable" contenteditable="true"><span class="numbered-label-index font-bold text-gray-500">5.</span> <span class="schreib-linie inline-block min-w-[9rem]"><span class="is-answer">Beschriftung 5</span></span></p>
       <p class="numbered-label-row flex items-end gap-2 editable" contenteditable="true"><span class="numbered-label-index font-bold text-gray-500">6.</span> <span class="schreib-linie inline-block min-w-[9rem]"><span class="is-answer">Beschriftung 6</span></span></p>
       <button type="button" class="add-label-line col-span-3 justify-self-start text-xs mt-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 cursor-pointer" contenteditable="false" title="Neue Zeile hinzufügen">+ Zeile</button>
    </div>
  </div>
</div>`
  },
  {
    id: "mindmap",
    name: "Mind-Map-Starter",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Mind-Map erstellen</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Sammle deine Ideen rund um das Hauptthema. Ziehe die Knoten am Rand an die gewünschte Position.</p>
  <div class="mindmap-container relative w-full h-[400px] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
    <svg class="mindmap-svg absolute inset-0 w-full h-full pointer-events-none" style="z-index:1;"></svg>
    <div class="mindmap-node mindmap-center absolute flex items-center justify-center text-center font-bold rounded-full bg-white border-2 border-THEME-500 shadow text-THEME-900" style="left:40%;top:42%;z-index:10;min-width:130px;min-height:70px;padding:10px;cursor:move;">
      <div contenteditable="true" class="editable" style="cursor:text;">Hauptthema</div>
    </div>
    <div class="mindmap-node absolute flex items-center justify-center text-center rounded-xl bg-white border border-gray-400 shadow-sm" style="left:5%;top:7%;z-index:5;min-width:95px;min-height:45px;padding:8px;cursor:move;">
      <div contenteditable="true" class="editable" style="cursor:text;"><span class="is-answer">Idee 1</span></div>
    </div>
    <div class="mindmap-node absolute flex items-center justify-center text-center rounded-xl bg-white border border-gray-400 shadow-sm" style="left:72%;top:7%;z-index:5;min-width:95px;min-height:45px;padding:8px;cursor:move;">
      <div contenteditable="true" class="editable" style="cursor:text;"><span class="is-answer">Idee 2</span></div>
    </div>
    <div class="mindmap-node absolute flex items-center justify-center text-center rounded-xl bg-white border border-gray-400 shadow-sm" style="left:2%;top:42%;z-index:5;min-width:95px;min-height:45px;padding:8px;cursor:move;">
      <div contenteditable="true" class="editable" style="cursor:text;"><span class="is-answer">Idee 3</span></div>
    </div>
    <div class="mindmap-node absolute flex items-center justify-center text-center rounded-xl bg-white border border-gray-400 shadow-sm" style="left:78%;top:42%;z-index:5;min-width:95px;min-height:45px;padding:8px;cursor:move;">
      <div contenteditable="true" class="editable" style="cursor:text;"><span class="is-answer">Idee 4</span></div>
    </div>
    <div class="mindmap-node absolute flex items-center justify-center text-center rounded-xl bg-white border border-gray-400 shadow-sm" style="left:5%;top:78%;z-index:5;min-width:95px;min-height:45px;padding:8px;cursor:move;">
      <div contenteditable="true" class="editable" style="cursor:text;"><span class="is-answer">Idee 5</span></div>
    </div>
    <div class="mindmap-node absolute flex items-center justify-center text-center rounded-xl bg-white border border-gray-400 shadow-sm" style="left:72%;top:78%;z-index:5;min-width:95px;min-height:45px;padding:8px;cursor:move;">
      <div contenteditable="true" class="editable" style="cursor:text;"><span class="is-answer">Idee 6</span></div>
    </div>
  </div>
</div>`
  },
  {
    id: "offene_frage",
    name: "Offene Frage (Schreiblinien)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Freie Antwort</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Beantworte die Frage in vollständigen Sätzen.</p>
  <p class="editable font-bold mb-4" contenteditable="true">Warum ist der Umweltschutz so wichtig?</p>
  
  <div class="schreib-linie editable text-blue-600 italic" contenteditable="true">
    <span class="is-answer">Hier steht die Musterlösung des Lehrers, die perfekt auf den Linien sitzt...</span>
  </div>
  
  <p class="text-[10px] text-gray-400 italic mt-2 no-print" contenteditable="true">
    Tipp: Ziehe die Box an der rechten unteren Ecke, um mehr Linien zu erhalten.
  </p>
</div>`
  },
  {
    id: "professor_zipp",
    name: "Professor Zipp (Kreative Schreibaufgabe)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <div class="flex gap-6 items-start">
    <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-4xl border-2 border-dashed border-gray-300 shrink-0 image-placeholder-trigger cursor-pointer hover:bg-gray-200 transition-colors" contenteditable="true">
      👨‍🏫
    </div>
    <div class="flex-1">
      <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Professor Zipp: Kreative Schreibaufgabe</h3>
      <p class="editable text-gray-600 mb-4" contenteditable="true">Professor Zipp hat eine knifflige Frage für dich. Überlege dir eine kreative Antwort!</p>
      <div class="p-4 bg-THEME-50 border-l-4 border-THEME-400 rounded-r-xl mb-4">
        <p class="editable italic font-medium text-THEME-900" contenteditable="true">"Stell dir vor, du könntest mit Tieren sprechen. Was würdest du sie als Erstes fragen?"</p>
      </div>
    </div>
  </div>
  
  <div class="schreib-linie editable text-blue-600 italic mt-4" contenteditable="true">
    <span class="is-answer">Hier könnte deine kreative Antwort stehen...</span>
  </div>
  
  <p class="text-[10px] text-gray-400 italic mt-2 no-print" contenteditable="true">
    Tipp: Ziehe die Box an der rechten unteren Ecke, um mehr Linien zu erhalten.
  </p>
</div>`
  },
  {
    id: "was_faellt_auf",
    name: "Was fällt dir auf? (Beobachtung)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Was fällt dir auf?</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Betrachte die Beispiele genau. Welche Regel oder Besonderheit kannst du entdecken?</p>
  
  <div class="grid grid-cols-2 gap-4 mb-6">
    <div class="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold editable" contenteditable="true">Beispiel A</div>
    <div class="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold editable" contenteditable="true">Beispiel B</div>
  </div>

  <p class="editable font-bold mb-2" contenteditable="true">Meine Beobachtung:</p>
  <div class="schreib-linie editable text-blue-600 italic" contenteditable="true">
    <span class="is-answer">Mir fällt auf, dass...</span>
  </div>
  
  <p class="text-[10px] text-gray-400 italic mt-2 no-print" contenteditable="true">
    Tipp: Ziehe die Box an der rechten unteren Ecke, um mehr Linien zu erhalten.
  </p>
</div>`
  },
  {
    id: "liste_zweispaltig",
    name: "Umwandeln/Übersetzen",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Wörter verwandeln</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Bilde Nomen mit den passenden Wortbausteinen <span class="font-bold">-keit, -heit, -ung, -nis</span>.</p>
  
  <div class="grid grid-cols-2 gap-x-16 gap-y-2 w-full leading-loose">
    <p class="editable text-gray-900" contenteditable="true">• lesen → <span class="gap-line"><span class="is-answer">die Lesung</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• dunkel → <span class="gap-line"><span class="is-answer">die Dunkelheit</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• gesund → <span class="gap-line"><span class="is-answer">die Gesundheit</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• müde → <span class="gap-line"><span class="is-answer">die Müdigkeit</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• krank → <span class="gap-line"><span class="is-answer">die Krankheit</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• geheim → <span class="gap-line"><span class="is-answer">das Geheimnis</span></span></p>
  </div>
</div>`
  },
  {
    id: "rechenmauer",
    name: "Rechenmauer",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-4 text-THEME-700" contenteditable="true">Aufgabe: Rechenmauer</h3>
  <table class="rechenmauer-table mx-auto border-separate border-spacing-1">
    <tbody>
      <tr>
        <td class="w-20 h-12 border-2 border-gray-500 flex items-center justify-center font-bold editable text-THEME-600 text-xl" contenteditable="true"><span class="is-answer">10</span></td>
      </tr>
      <tr>
        <td class="w-20 h-12 border-2 border-gray-500 flex items-center justify-center font-bold editable text-xl" contenteditable="true">4</td>
        <td class="w-20 h-12 border-2 border-gray-500 flex items-center justify-center font-bold editable text-THEME-600 text-xl" contenteditable="true"><span class="is-answer">6</span></td>
      </tr>
      <tr>
        <td class="w-20 h-12 border-2 border-gray-500 flex items-center justify-center font-bold editable text-xl" contenteditable="true">1</td>
        <td class="border-2 border-gray-500 w-20 h-12 flex items-center justify-center font-bold editable text-xl" contenteditable="true">3</td>
        <td class="border-2 border-gray-500 w-20 h-12 flex items-center justify-center font-bold editable text-xl" contenteditable="true">3</td>
      </tr>
    </tbody>
  </table>
  <p class="text-[10px] text-gray-400 italic mt-4 no-print text-center" contenteditable="true">Tipp: Klicke in ein Feld und nutze "Zeile hinzufügen" in der Toolbar, um die Mauer nach unten zu erweitern.</p>
</div>`
  },
  {
    id: "stellenwerttafel",
    name: "Stellenwerttafel",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Stellenwerttafel</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Übertrage die folgenden Zahlen in die Stellenwerttafel: <span class="font-bold">1045, 2703, 890, 3156</span>.</p>
  <table class="w-full border-collapse border-2 border-gray-800 text-center text-xl">
    <thead>
      <tr class="bg-gray-100 border-b-4 border-gray-800">
        <th class="border-2 border-gray-400 p-2 editable font-black" contenteditable="true">T</th>
        <th class="border-2 border-gray-400 p-2 editable font-black" contenteditable="true">H</th>
        <th class="border-2 border-gray-400 p-2 editable font-black" contenteditable="true">Z</th>
        <th class="border-2 border-gray-400 p-2 editable font-black" contenteditable="true">E</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">1</span></td>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">0</span></td>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">4</span></td>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">5</span></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">2</span></td>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">7</span></td>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">0</span></td>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">3</span></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer"></span></td>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">8</span></td>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">9</span></td>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">0</span></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">3</span></td>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">1</span></td>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">5</span></td>
        <td class="border-2 border-gray-400 p-2 editable h-12 text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">6</span></td>
      </tr>
    </tbody>
  </table>
  <p class="text-[10px] text-gray-400 italic mt-2 no-print" contenteditable="true">Tipp: Klicke in eine Spalte und nutze den "Spalte löschen"-Button in der Toolbar, wenn du z.B. die Tausender (T) nicht brauchst.</p>
</div>`
  },
  {
    id: "rechengitter",
    name: "Gitter (Schriftliches Rechnen)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Schriftlich rechnen</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Rechne die Aufgaben im Gitter aus.</p>
  <div class="grid grid-cols-2 gap-8">
    <table class="border-collapse bg-white font-mono text-xl font-bold">
      <tbody>
        <tr>
          <td class="border border-THEME-200 w-10 h-10 text-center editable" contenteditable="true"></td>
          <td class="border border-THEME-200 w-10 h-10 text-center editable" contenteditable="true">4</td>
          <td class="border border-THEME-200 w-10 h-10 text-center editable" contenteditable="true">5</td>
        </tr>
        <tr>
          <td class="border border-THEME-200 w-10 h-10 text-center editable border-b-4 border-b-gray-800" contenteditable="true">+</td>
          <td class="border border-THEME-200 w-10 h-10 text-center editable border-b-4 border-b-gray-800" contenteditable="true">2</td>
          <td class="border border-THEME-200 w-10 h-10 text-center editable border-b-4 border-b-gray-800" contenteditable="true">7</td>
        </tr>
        <tr>
          <td class="border border-THEME-200 w-10 h-10 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer"></span></td>
          <td class="border border-THEME-200 w-10 h-10 text-center editable text-THEME-600 border-b-4 border-b-double border-b-gray-800" contenteditable="true"><span class="is-answer">7</span></td>
          <td class="border border-THEME-200 w-10 h-10 text-center editable text-THEME-600 border-b-4 border-b-double border-b-gray-800" contenteditable="true"><span class="is-answer">2</span></td>
        </tr>
      </tbody>
    </table>
    <table class="border-collapse bg-white font-mono text-xl font-bold">
      <tbody>
        <tr>
          <td class="border border-THEME-200 w-10 h-10 text-center editable" contenteditable="true"></td>
          <td class="border border-THEME-200 w-10 h-10 text-center editable" contenteditable="true"></td>
          <td class="border border-THEME-200 w-10 h-10 text-center editable" contenteditable="true"></td>
        </tr>
        <tr>
          <td class="border border-THEME-200 w-10 h-10 text-center editable border-b-4 border-b-gray-800" contenteditable="true">+</td>
          <td class="border border-THEME-200 w-10 h-10 text-center editable border-b-4 border-b-gray-800" contenteditable="true"></td>
          <td class="border border-THEME-200 w-10 h-10 text-center editable border-b-4 border-b-gray-800" contenteditable="true"></td>
        </tr>
        <tr>
          <td class="border border-THEME-200 w-10 h-10 text-center editable text-THEME-600" contenteditable="true"></td>
          <td class="border border-THEME-200 w-10 h-10 text-center editable text-THEME-600 border-b-4 border-b-double border-b-gray-800" contenteditable="true"></td>
          <td class="border border-THEME-200 w-10 h-10 text-center editable text-THEME-600 border-b-4 border-b-double border-b-gray-800" contenteditable="true"></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>`
  },
  {
    id: "zahlenstrahl",
    name: "Zahlenstrahl",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-6 text-THEME-700" contenteditable="true">Aufgabe: Zahlenstrahl</h3>
  <p class="editable text-gray-900 mb-8" contenteditable="true">Trage die fehlenden Zahlen ein.</p>
  <div class="zahlenstrahl-container relative mt-8 mb-8">
    <div class="absolute left-0 right-0 top-[11px] h-1 bg-gray-800">
      <div class="absolute -right-2 -top-1.5 w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-gray-800"></div>
    </div>
    <div class="flex justify-between relative">
      <div class="zahlenstrahl-tick flex flex-col items-center"><div class="h-6 w-0.5 bg-gray-800"></div><div class="editable text-center font-bold mt-1" style="min-width:1.5rem" contenteditable="true">0</div></div>
      <div class="zahlenstrahl-tick flex flex-col items-center"><div class="h-6 w-0.5 bg-gray-800"></div><div class="editable text-center font-bold mt-1" style="min-width:1.5rem" contenteditable="true">&nbsp;</div></div>
      <div class="zahlenstrahl-tick flex flex-col items-center"><div class="h-6 w-0.5 bg-gray-800"></div><div class="editable text-center font-bold mt-1 text-THEME-600" style="min-width:1.5rem" contenteditable="true"><span class="is-answer">10</span></div></div>
      <div class="zahlenstrahl-tick flex flex-col items-center"><div class="h-6 w-0.5 bg-gray-800"></div><div class="editable text-center font-bold mt-1" style="min-width:1.5rem" contenteditable="true">&nbsp;</div></div>
      <div class="zahlenstrahl-tick flex flex-col items-center"><div class="h-6 w-0.5 bg-gray-800"></div><div class="editable text-center font-bold mt-1" style="min-width:1.5rem" contenteditable="true">20</div></div>
    </div>
  </div>
</div>`
  },
  {
    id: "sachaufgabe",
    name: "Sachaufgabe (R-A-F)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Sachaufgabe</h3>
  <p class="editable text-gray-900 mb-4 font-bold text-lg leading-relaxed" contenteditable="true">In einem Bus sitzen 15 Personen. An der Haltestelle steigen 4 aus und 7 ein. Wie viele Personen sind nun im Bus?</p>
  <div class="mb-4">
    <span class="font-bold text-gray-500 text-sm uppercase tracking-wider editable" contenteditable="true">Rechnung / Skizze</span>
    <div class="w-full min-h-[150px] border-2 border-gray-200 rounded-xl mt-1 editable p-4 text-THEME-600 font-mono text-lg" contenteditable="true"><span class="is-answer">15 - 4 + 7 = 18</span></div>
  </div>
  <div>
    <span class="font-bold text-gray-500 text-sm uppercase tracking-wider editable" contenteditable="true">Antwortsatz</span>
    <div class="schreib-linie editable text-THEME-600 italic mt-1" contenteditable="true">
      <span class="is-answer">Es sitzen nun 18 Personen im Bus.</span>
    </div>
  </div>
</div>`
  },
  {
    id: "zeichnungsauftrag",
    name: "Zeichnungsauftrag",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Zeichnen</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Mache eine genaue Skizze von dem Blatt, das du gefunden hast.</p>
  <div class="w-full min-h-[300px] border-2 border-dashed border-gray-400 rounded-xl bg-gray-50/50 flex items-center justify-center text-gray-400 editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors" contenteditable="true">
    [Hier zeichnen]
  </div>
</div>`
  },
  {
    id: "experiment",
    name: "Experiment-Protokoll",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-6 text-THEME-700" contenteditable="true">Aufgabe: Forscher-Protokoll</h3>
  <div class="space-y-6">
    <div>
      <h4 class="font-bold text-gray-900 mb-1 editable flex items-center gap-2" contenteditable="true"><span class="text-xl">❓</span> Fragestellung</h4>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Was passiert, wenn...</span></div>
    </div>
    <div>
      <h4 class="font-bold text-gray-900 mb-1 editable flex items-center gap-2" contenteditable="true"><span class="text-xl">🤔</span> Vermutung</h4>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Ich glaube, dass...</span></div>
    </div>
    <div>
      <h4 class="font-bold text-gray-900 mb-1 editable flex items-center gap-2" contenteditable="true"><span class="text-xl">👀</span> Beobachtung</h4>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Ich habe gesehen, dass...</span></div>
    </div>
    <div>
      <h4 class="font-bold text-gray-900 mb-1 editable flex items-center gap-2" contenteditable="true"><span class="text-xl">💡</span> Erklärung</h4>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Das passiert, weil...</span></div>
    </div>
  </div>
</div>`
  },
  {
    id: "t_chart",
    name: "T-Chart (Pro/Contra)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Vor- und Nachteile</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Sammle Argumente und schreibe sie in die Tabelle.</p>
  <div class="grid grid-cols-2 gap-6">
    <div>
      <div class="font-black text-green-700 border-b-4 border-green-700 pb-2 mb-2 editable text-center uppercase tracking-wider" contenteditable="true">Dafür (Pro)</div>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></div>
    </div>
    <div>
      <div class="font-black text-red-700 border-b-4 border-red-700 pb-2 mb-2 editable text-center uppercase tracking-wider" contenteditable="true">Dagegen (Contra)</div>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></div>
    </div>
  </div>
</div>`
  },
  {
    id: "steckbrief_gross",
    name: "Steckbrief (Ausführlich)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-6 text-THEME-700" contenteditable="true">Aufgabe: Ausführlicher Steckbrief</h3>
  <div class="overflow-hidden">
    <div class="ai-image-slot resize overflow-hidden w-1/3 float-left mr-6 mb-4 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 editable cursor-pointer hover:bg-gray-100 transition-colors image-placeholder-trigger" contenteditable="true" title="Doppelklick für Bild-Optionen – Ecke unten rechts zum Vergrößern">
      [Bild]
    </div>
    <div class="mb-4">
      <span class="font-bold text-gray-900 editable uppercase tracking-wider text-sm" contenteditable="true">Name des Tieres:</span>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Stockente</span></div>
    </div>
    <div class="mb-4">
      <span class="font-bold text-gray-900 editable uppercase tracking-wider text-sm" contenteditable="true">Aussehen & Größe:</span>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Männchen haben einen grünen Kopf...</span></div>
    </div>
    <div class="mb-4">
      <span class="font-bold text-gray-900 editable uppercase tracking-wider text-sm" contenteditable="true">Lebensraum:</span>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Seen, Flüsse, Teiche...</span></div>
    </div>
    <div class="mb-4">
      <span class="font-bold text-gray-900 editable uppercase tracking-wider text-sm" contenteditable="true">Nahrung:</span>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Wasserpflanzen, kleine Fische...</span></div>
    </div>
    <div>
      <span class="font-bold text-gray-900 editable uppercase tracking-wider text-sm" contenteditable="true">Besonderheiten:</span>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Ihr Gefieder ist wasserabweisend...</span></div>
    </div>
  </div>
</div>`
  },
  {
    id: "interview",
    name: "Interview-Notizfeld",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-6 text-THEME-700" contenteditable="true">Aufgabe: Experten-Interview</h3>
  <div class="flex gap-6 mb-6">
    <div class="w-1/2 border-b-2 border-gray-400 pb-1 flex items-baseline gap-2">
      <span class="font-bold text-gray-500 uppercase tracking-wider text-xs shrink-0 editable" contenteditable="true">Interview-Partner:</span>
      <span class="flex-1 editable text-THEME-600" contenteditable="true"><span class="is-answer italic">Herr Müller</span></span>
    </div>
    <div class="w-1/2 border-b-2 border-gray-400 pb-1 flex items-baseline gap-2">
      <span class="font-bold text-gray-500 uppercase tracking-wider text-xs shrink-0 editable" contenteditable="true">Thema:</span>
      <span class="flex-1 editable text-THEME-600" contenteditable="true"><span class="is-answer italic">Beruf Bäcker</span></span>
    </div>
  </div>
  <h4 class="font-bold text-gray-900 mb-2 editable" contenteditable="true">Meine Notizen:</h4>
  <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true">
    <span class="is-answer">Hier kannst du stichpunktartig alles Wichtige mitschreiben. Durch die Linien bleibt es übersichtlich.</span>
  </div>
</div>`
  },
  {
    id: "film_fragen",
    name: "Fragen zum Film / Text",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Fragen beantworten</h3>
  <p class="editable text-gray-900 mb-6" contenteditable="true">Beantworte die folgenden Fragen in ganzen Sätzen.</p>
  <ul class="space-y-6 list-none pl-0">
    <li class="avoid-break relative group">
      <p class="editable font-bold text-gray-900 mb-2" contenteditable="true">1. Was passiert am Anfang der Geschichte?</p>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></div>
    </li>
    <li class="avoid-break relative group">
      <p class="editable font-bold text-gray-900 mb-2" contenteditable="true">2. Warum handelt die Hauptfigur so?</p>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></div>
    </li>
  </ul>
  <p class="text-[10px] text-gray-400 italic mt-2 no-print" contenteditable="true">Tipp: Klicke auf eine Frage und nutze das "+" in der Toolbar, um eine neue Frage anzuhängen.</p>
</div>`
  },
  {
    id: "suchsel",
    name: "Suchsel (Wortgitter)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Suchsel</h3>
  <p class="editable text-gray-900 mb-6" contenteditable="true">Finde die versteckten Wörter. Sie können von links nach rechts oder von oben nach unten gelesen werden.</p>
  <table class="border-collapse border-4 border-gray-800 font-mono text-base text-center uppercase bg-white mx-auto mb-6">
    <tbody>
${(() => {
  const grid = [
    'BAUMXKLPQRWD',
    'GNOSVJZCFHEY',
    'TWRHAUSBDKIM',
    'PLEGNJVQXCZF',
    'STIERWKDHMBA',
    'VGNPLQJXCFZO',
    'DHKMWFREIBST',
    'ACPLXNVGQJZR',
    'OEGSBDHKMWFN',
    'LPVQJXCATZGS',
    'RKDHMWFNBEOP',
    'STAGNJVQXCLZ'
  ];
  const ans = new Set([
    '0,0','0,1','0,2','0,3',
    '2,3','2,4','2,5','2,6',
    '4,1','4,2','4,3','4,4',
    '6,5','6,6','6,7','6,8',
    '1,10','2,10'
  ]);
  return grid.map((row, r) =>
    '      <tr>\n' + row.split('').map((ch, c) => {
      const inner = ans.has(r+','+c) ? '<span class="is-highlight-answer">'+ch+'</span>' : ch;
      return '        <td class="border border-gray-300 w-8 h-8 editable" contenteditable="true">'+inner+'</td>';
    }).join('\n') + '\n      </tr>'
  ).join('\n');
})()}
    </tbody>
  </table>
  <div class="suchsel-woerter bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4">
    <h4 class="text-gray-900 mb-2 editable uppercase tracking-wider text-sm" contenteditable="true">Versteckte Wörter:</h4>
    <p class="editable text-gray-500 text-sm" contenteditable="true">BAUM, EI, HAUS, TIER, FREI</p>
  </div>
</div>`
  },
  {
    id: "bild_beschriftung_multi",
    name: "Mehrere Bilder beschriften",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Bilder benennen</h3>
  <p class="editable text-gray-900 mb-6" contenteditable="true">Schreibe den passenden Begriff unter jedes Bild.</p>
  <div class="grid grid-cols-3 gap-8">
    <div class="flex flex-col items-center">
      <div class="w-full ai-image-slot resize overflow-hidden border-2 border-gray-300 rounded-xl mb-3 flex items-center justify-center text-gray-400 bg-white shadow-sm editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors" contenteditable="true" data-no-reposition="true">[Bild 1]</div>
      <div class="editable w-full text-center mt-2" contenteditable="true"><span class="schreib-linie inline-block min-w-[8rem]"><span class="is-answer">rennen</span></span></div>
    </div>
    <div class="flex flex-col items-center">
      <div class="w-full ai-image-slot resize overflow-hidden border-2 border-gray-300 rounded-xl mb-3 flex items-center justify-center text-gray-400 bg-white shadow-sm editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors" contenteditable="true" data-no-reposition="true">[Bild 2]</div>
      <div class="editable w-full text-center mt-2" contenteditable="true"><span class="schreib-linie inline-block min-w-[8rem]"><span class="is-answer">essen</span></span></div>
    </div>
    <div class="flex flex-col items-center">
      <div class="w-full ai-image-slot resize overflow-hidden border-2 border-gray-300 rounded-xl mb-3 flex items-center justify-center text-gray-400 bg-white shadow-sm editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors" contenteditable="true" data-no-reposition="true">[Bild 3]</div>
      <div class="editable w-full text-center mt-2" contenteditable="true"><span class="schreib-linie inline-block min-w-[8rem]"><span class="is-answer">springen</span></span></div>
    </div>
  </div>
</div>`
  },
  {
    id: "satz_transformator",
    name: "Satz-Transformator (mit Pfeil)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Sätze verwandeln</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Schreibe den Satz in der geforderten Form neu auf.</p>
  <div class="mb-6">
    <p class="editable font-bold text-gray-900 mb-1" contenteditable="true">Ich baue ein Baumhaus. (Futur)</p>
    <div class="flex gap-2 items-start">
      <span class="text-gray-500 font-bold mt-2">→</span>
      <div class="schreib-linie editable text-THEME-600 italic flex-1" style="min-height: 2.5rem;" contenteditable="true">
        <span class="is-answer">Ich werde ein Baumhaus bauen.</span>
      </div>
    </div>
  </div>
  <div class="mb-6">
    <p class="editable font-bold text-gray-900 mb-1" contenteditable="true">Der Zug fährt ab. (Präteritum)</p>
    <div class="flex gap-2 items-start">
      <span class="text-gray-500 font-bold mt-2">→</span>
      <div class="schreib-linie editable text-THEME-600 italic flex-1" style="min-height: 2.5rem;" contenteditable="true">
        <span class="is-answer">Der Zug fuhr ab.</span>
      </div>
    </div>
  </div>
</div>`
  },
  {
    id: "klammer_luecken",
    name: "Lückentext (Klammer-Modus)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Verben einsetzen</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Setze das Verb in der Klammer in der passenden Personalform ein.</p>
  <div class="leading-loose space-y-1">
    <p class="editable text-gray-900" contenteditable="true">
      Gestern <span class="gap-line min-w-[100px] inline-block text-center"><span class="is-answer text-THEME-600 italic">fiel</span></span> (fallen) der Junge auf die Nase.
    </p>
    <p class="editable text-gray-900" contenteditable="true">
      Wir <span class="gap-line min-w-[100px] inline-block text-center"><span class="is-answer text-THEME-600 italic">lachten</span></span> (lachen) über den lustigen Witz.
    </p>
  </div>
</div>`
  },
  {
    id: "konjugations_faecher",
    name: "Konjugations-Fächer",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Konjugieren</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Setze das Verb "singen" in alle Personalformen.</p>
  <div class="grid grid-cols-2 gap-y-2 gap-x-12 w-full max-w-lg leading-loose">
    <p class="editable text-gray-900" contenteditable="true"><span class="font-bold">ich</span> <span class="gap-line"><span class="is-answer text-THEME-600 italic">singe</span></span></p>
    <p class="editable text-gray-900" contenteditable="true"><span class="font-bold">wir</span> <span class="gap-line"><span class="is-answer text-THEME-600 italic">singen</span></span></p>
    <p class="editable text-gray-900" contenteditable="true"><span class="font-bold">du</span> <span class="gap-line"><span class="is-answer text-THEME-600 italic">singst</span></span></p>
    <p class="editable text-gray-900" contenteditable="true"><span class="font-bold">ihr</span> <span class="gap-line"><span class="is-answer text-THEME-600 italic">singt</span></span></p>
    <p class="editable text-gray-900" contenteditable="true"><span class="font-bold">er/sie/es</span> <span class="gap-line"><span class="is-answer text-THEME-600 italic">singt</span></span></p>
    <p class="editable text-gray-900" contenteditable="true"><span class="font-bold">sie</span> <span class="gap-line"><span class="is-answer text-THEME-600 italic">singen</span></span></p>
  </div>
</div>`
  },
  {
    id: "korrektur_zeile",
    name: "Korrektur-Zeile (Fehler finden)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Fehler reparieren</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Streiche das falsch gebildete Wort durch und schreibe es richtig auf die Linie.</p>
  <div class="space-y-1 leading-loose">
    <p class="editable text-gray-900" contenteditable="true">Der Hund <span class="is-strikethrough-answer text-red-600">beisste</span> in den Knochen. → <span class="gap-line"><span class="is-answer text-THEME-600 italic">biss</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">Gestern <span class="is-strikethrough-answer text-red-600">fallte</span> ich vom Stuhl. → <span class="gap-line"><span class="is-answer text-THEME-600 italic">fiel</span></span></p>
  </div>
</div>`
  },
  {
    id: "zahlenreihe",
    name: "Zahlenreihe fortsetzen",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Zahlenmuster fortsetzen</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Erkenne die Regel und setze die Zahlenreihe fort.</p>
  <div class="space-y-3 leading-loose">
    <p class="editable font-mono text-lg" contenteditable="true">a) 2, 4, 6, <span class="gap-line"><span class="is-answer">8</span></span>, <span class="gap-line"><span class="is-answer">10</span></span>, <span class="gap-line"><span class="is-answer">12</span></span>, <span class="gap-line"><span class="is-answer">14</span></span>, <span class="gap-line"><span class="is-answer">16</span></span>, <span class="gap-line"><span class="is-answer">18</span></span>, <span class="gap-line"><span class="is-answer">20</span></span>, <span class="gap-line"><span class="is-answer">22</span></span></p>
    <p class="editable font-mono text-lg" contenteditable="true">b) 5, 10, 15, <span class="gap-line"><span class="is-answer">20</span></span>, <span class="gap-line"><span class="is-answer">25</span></span>, <span class="gap-line"><span class="is-answer">30</span></span>, <span class="gap-line"><span class="is-answer">35</span></span>, <span class="gap-line"><span class="is-answer">40</span></span>, <span class="gap-line"><span class="is-answer">45</span></span>, <span class="gap-line"><span class="is-answer">50</span></span>, <span class="gap-line"><span class="is-answer">55</span></span></p>
    <p class="editable font-mono text-lg" contenteditable="true">c) 100, 90, 80, <span class="gap-line"><span class="is-answer">70</span></span>, <span class="gap-line"><span class="is-answer">60</span></span>, <span class="gap-line"><span class="is-answer">50</span></span>, <span class="gap-line"><span class="is-answer">40</span></span>, <span class="gap-line"><span class="is-answer">30</span></span>, <span class="gap-line"><span class="is-answer">20</span></span>, <span class="gap-line"><span class="is-answer">10</span></span>, <span class="gap-line"><span class="is-answer">0</span></span></p>
  </div>
</div>`
  },
  {
    id: "uhrzeit",
    name: "Uhrzeit ablesen",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Uhrzeit ablesen</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Lies die Uhrzeit von jeder analogen Uhr ab und trage sie digital ein. Oder zeichne die Zeiger so, dass sie die angegebene Zeit zeigen.</p>
  <div class="flex items-start justify-around my-6 gap-4">
    <div class="analog-clock flex flex-col items-center gap-2">
      ${clockSvg(3, 0)}
      <div class="clock-time gap-line w-24 text-center text-THEME-600 italic editable" contenteditable="true"><span class="is-answer">3:00</span></div>
    </div>
    <div class="analog-clock flex flex-col items-center gap-2">
      ${clockSvg(7, 30)}
      <div class="clock-time gap-line w-24 text-center text-THEME-600 italic editable" contenteditable="true"><span class="is-answer">7:30</span></div>
    </div>
    <div class="analog-clock flex flex-col items-center gap-2">
      ${clockSvg(10, 45)}
      <div class="clock-time gap-line w-24 text-center text-THEME-600 italic editable" contenteditable="true"><span class="is-answer">10:45</span></div>
    </div>
  </div>
  <p class="text-[10px] text-gray-400 italic mt-2 no-print" contenteditable="true">Tipp: Schreibe die gewünschte Zeit in das Feld unter der Uhr (z.B. "3:45"), dann passen sich die Zeiger automatisch an.</p>
</div>`
  },
  {
    id: "zeitspanne_tabelle",
    name: "Zeitspanne (Tabelle)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Zeitspannen berechnen</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Berechne für jede Zeile, wie viel Zeit zwischen Start und Ende vergangen ist.</p>
  <table class="w-full border-collapse border-2 border-gray-700 text-base">
    <thead>
      <tr class="bg-gray-100">
        <th class="border-2 border-gray-700 p-2 editable font-bold" contenteditable="true">Start</th>
        <th class="border-2 border-gray-700 p-2 editable font-bold" contenteditable="true">Ende</th>
        <th class="border-2 border-gray-700 p-2 editable font-bold" contenteditable="true">Dauer</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border-2 border-gray-700 p-2 text-center editable" contenteditable="true">8:15</td>
        <td class="border-2 border-gray-700 p-2 text-center editable" contenteditable="true">9:45</td>
        <td class="border-2 border-gray-700 p-2 text-center editable text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">1 h 30 min</span></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-700 p-2 text-center editable" contenteditable="true">10:30</td>
        <td class="border-2 border-gray-700 p-2 text-center editable" contenteditable="true">13:00</td>
        <td class="border-2 border-gray-700 p-2 text-center editable text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">2 h 30 min</span></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-700 p-2 text-center editable" contenteditable="true">14:20</td>
        <td class="border-2 border-gray-700 p-2 text-center editable" contenteditable="true">16:05</td>
        <td class="border-2 border-gray-700 p-2 text-center editable text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">1 h 45 min</span></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-700 p-2 text-center editable" contenteditable="true">7:50</td>
        <td class="border-2 border-gray-700 p-2 text-center editable" contenteditable="true">12:15</td>
        <td class="border-2 border-gray-700 p-2 text-center editable text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">4 h 25 min</span></td>
      </tr>
    </tbody>
  </table>
</div>`
  },
  {
    id: "geld_rechnen",
    name: "Geld-Rechnen (CHF)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Wechselgeld berechnen</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Rechne aus, wie viel Rückgeld du bekommst.</p>
  <table class="w-full border-collapse border-2 border-gray-300">
    <thead>
      <tr class="bg-gray-100">
        <th class="border-2 border-gray-300 p-3 editable font-bold" contenteditable="true">Preis</th>
        <th class="border-2 border-gray-300 p-3 editable font-bold" contenteditable="true">Bezahlt</th>
        <th class="border-2 border-gray-300 p-3 editable font-bold" contenteditable="true">Rückgeld</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border-2 border-gray-300 p-3 editable text-center" contenteditable="true">CHF 3.50</td>
        <td class="border-2 border-gray-300 p-3 editable text-center" contenteditable="true">CHF 5.00</td>
        <td class="border-2 border-gray-300 p-3 editable text-center text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">CHF 1.50</span></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-300 p-3 editable text-center" contenteditable="true">CHF 7.20</td>
        <td class="border-2 border-gray-300 p-3 editable text-center" contenteditable="true">CHF 10.00</td>
        <td class="border-2 border-gray-300 p-3 editable text-center text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">CHF 2.80</span></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-300 p-3 editable text-center" contenteditable="true">CHF 12.40</td>
        <td class="border-2 border-gray-300 p-3 editable text-center" contenteditable="true">CHF 20.00</td>
        <td class="border-2 border-gray-300 p-3 editable text-center text-THEME-600 font-bold" contenteditable="true"><span class="is-answer">CHF 7.60</span></td>
      </tr>
    </tbody>
  </table>
</div>`
  },
  {
    id: "zahlenhaus",
    name: "Zahlenhaus (Zerlegung)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Zahlenhaus</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Zerlege die Zahl im Dach in alle möglichen Summen.</p>
  <div class="grid grid-cols-3 gap-4">
    <table class="w-full border-collapse border-2 border-gray-700 font-bold">
      <thead>
        <tr>
          <th colspan="2" class="h-12 bg-THEME-50 text-xl text-THEME-700 editable border-b-2 border-gray-700" contenteditable="true">10</th>
        </tr>
      </thead>
      <tbody class="text-base">
        <tr>
          <td class="border border-gray-700 w-1/2 h-9 text-center editable" contenteditable="true">0</td>
          <td class="border border-gray-700 w-1/2 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">10</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true">1</td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">9</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true">2</td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">8</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true">3</td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">7</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true">4</td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">6</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true">5</td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">5</span></td>
        </tr>
      </tbody>
    </table>
    <table class="w-full border-collapse border-2 border-gray-700 font-bold">
      <thead>
        <tr>
          <th colspan="2" class="h-12 bg-THEME-50 text-xl text-THEME-700 editable border-b-2 border-gray-700" contenteditable="true">8</th>
        </tr>
      </thead>
      <tbody class="text-base">
        <tr>
          <td class="border border-gray-700 w-1/2 h-9 text-center editable" contenteditable="true">0</td>
          <td class="border border-gray-700 w-1/2 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">8</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true">1</td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">7</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true">2</td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">6</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true">3</td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">5</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true">4</td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">4</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true"></td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"></td>
        </tr>
      </tbody>
    </table>
    <table class="w-full border-collapse border-2 border-gray-700 font-bold">
      <thead>
        <tr>
          <th colspan="2" class="h-12 bg-THEME-50 text-xl text-THEME-700 editable border-b-2 border-gray-700" contenteditable="true">6</th>
        </tr>
      </thead>
      <tbody class="text-base">
        <tr>
          <td class="border border-gray-700 w-1/2 h-9 text-center editable" contenteditable="true">0</td>
          <td class="border border-gray-700 w-1/2 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">6</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true">1</td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">5</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true">2</td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">4</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true">3</td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"><span class="is-answer">3</span></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true"></td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"></td>
        </tr>
        <tr>
          <td class="border border-gray-700 h-9 text-center editable" contenteditable="true"></td>
          <td class="border border-gray-700 h-9 text-center editable text-THEME-600" contenteditable="true"></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>`
  },
  {
    id: "punktraster",
    name: "Punktraster / Geobrett",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Im Punktraster zeichnen</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Zeichne die geometrische Figur genau ins Raster.</p>
  <div class="w-full h-80 border-2 border-gray-300 rounded-xl bg-white" style="background-image: radial-gradient(circle, #6b7280 1.5px, transparent 1.5px); background-size: 24px 24px; background-position: 12px 12px; print-color-adjust: exact; -webkit-print-color-adjust: exact;"></div>
</div>`
  },
  {
    id: "zeitstrahl",
    name: "Zeitstrahl (Geschichte)",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Zeitstrahl</h3>
  <p class="editable text-gray-900 mb-6" contenteditable="true">Schreibe zu jedem Jahr das passende historische Ereignis auf die Linie.</p>
  <div class="relative mt-8 mb-4">
    <div class="absolute left-0 right-0 top-[11px] h-1 bg-gray-800">
      <div class="absolute -right-2 -top-1.5 w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-gray-800"></div>
    </div>
    <div class="flex justify-between relative gap-2">
      <div class="flex flex-col items-center flex-1">
        <div class="h-6 w-0.5 bg-gray-800"></div>
        <div class="editable text-center font-bold mt-1 text-THEME-700" contenteditable="true">1291</div>
        <div class="mt-2 schreib-linie editable italic text-THEME-600 w-full text-center text-sm" contenteditable="true"><span class="is-answer">Bundesbrief</span></div>
      </div>
      <div class="flex flex-col items-center flex-1">
        <div class="h-6 w-0.5 bg-gray-800"></div>
        <div class="editable text-center font-bold mt-1 text-THEME-700" contenteditable="true">1499</div>
        <div class="mt-2 schreib-linie editable italic text-THEME-600 w-full text-center text-sm" contenteditable="true"><span class="is-answer">Schwabenkrieg</span></div>
      </div>
      <div class="flex flex-col items-center flex-1">
        <div class="h-6 w-0.5 bg-gray-800"></div>
        <div class="editable text-center font-bold mt-1 text-THEME-700" contenteditable="true">1798</div>
        <div class="mt-2 schreib-linie editable italic text-THEME-600 w-full text-center text-sm" contenteditable="true"><span class="is-answer">Helvetische Republik</span></div>
      </div>
      <div class="flex flex-col items-center flex-1">
        <div class="h-6 w-0.5 bg-gray-800"></div>
        <div class="editable text-center font-bold mt-1 text-THEME-700" contenteditable="true">1848</div>
        <div class="mt-2 schreib-linie editable italic text-THEME-600 w-full text-center text-sm" contenteditable="true"><span class="is-answer">Bundesverfassung</span></div>
      </div>
      <div class="flex flex-col items-center flex-1">
        <div class="h-6 w-0.5 bg-gray-800"></div>
        <div class="editable text-center font-bold mt-1 text-THEME-700" contenteditable="true">1971</div>
        <div class="mt-2 schreib-linie editable italic text-THEME-600 w-full text-center text-sm" contenteditable="true"><span class="is-answer">Frauenstimmrecht</span></div>
      </div>
    </div>
  </div>
</div>`
  },
  {
    id: "vergleichstabelle",
    name: "Vergleichstabelle",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Vergleichen</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Vergleiche die beiden Objekte anhand der Merkmale.</p>
  <table class="w-full border-collapse border-2 border-gray-300">
    <thead>
      <tr class="bg-gray-100">
        <th class="border-2 border-gray-300 p-3 editable font-bold text-left w-1/3" contenteditable="true">Merkmal</th>
        <th class="border-2 border-gray-300 p-3 editable font-bold w-1/3" contenteditable="true">Objekt A</th>
        <th class="border-2 border-gray-300 p-3 editable font-bold w-1/3" contenteditable="true">Objekt B</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border-2 border-gray-300 p-3 editable font-bold" contenteditable="true">Aussehen</td>
        <td class="border-2 border-gray-300 p-3 editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></td>
        <td class="border-2 border-gray-300 p-3 editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-300 p-3 editable font-bold" contenteditable="true">Lebensraum</td>
        <td class="border-2 border-gray-300 p-3 editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></td>
        <td class="border-2 border-gray-300 p-3 editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-300 p-3 editable font-bold" contenteditable="true">Nahrung</td>
        <td class="border-2 border-gray-300 p-3 editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></td>
        <td class="border-2 border-gray-300 p-3 editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-300 p-3 editable font-bold" contenteditable="true">Besonderheit</td>
        <td class="border-2 border-gray-300 p-3 editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></td>
        <td class="border-2 border-gray-300 p-3 editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></td>
      </tr>
    </tbody>
  </table>
</div>`
  },
  {
    id: "ursache_wirkung",
    name: "Ursache → Wirkung",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Ursache und Wirkung</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Schreibe zu jeder Ursache die passende Wirkung auf die Linie.</p>
  <div class="flex flex-col gap-2 w-full leading-loose">
    <p class="editable text-gray-900" contenteditable="true">• Es regnet stark → <span class="gap-line"><span class="is-answer">die Strasse wird nass</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• Die Sonne scheint → <span class="gap-line"><span class="is-answer">es wird wärmer</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• Man isst zu viel → <span class="gap-line"><span class="is-answer">der Bauch tut weh</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• Das Eis schmilzt → <span class="gap-line"><span class="is-answer">es wird Wasser</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• Der Baum wird gefällt → <span class="gap-line"><span class="is-answer">Vögel verlieren ihr Zuhause</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• Man übt viel → <span class="gap-line"><span class="is-answer">man wird besser</span></span></p>
  </div>
</div>`
  },
  {
    id: "lebenszyklus",
    name: "Lebenszyklus",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Lebenszyklus</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Beschrifte die vier Phasen des Lebenszyklus.</p>
  <div class="flex items-center justify-between gap-2">
    <div class="flex-1 flex flex-col items-center">
      <div class="ai-image-slot resize overflow-hidden w-full aspect-square border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors text-xs" contenteditable="true" data-no-reposition="true">[Bild 1]</div>
      <div class="mt-2 w-full text-center text-sm editable" contenteditable="true"><span class="schreib-linie inline-block min-w-[6rem]"><span class="is-answer">Ei</span></span></div>
    </div>
    <div class="text-3xl text-gray-400 font-bold shrink-0">→</div>
    <div class="flex-1 flex flex-col items-center">
      <div class="ai-image-slot resize overflow-hidden w-full aspect-square border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors text-xs" contenteditable="true" data-no-reposition="true">[Bild 2]</div>
      <div class="mt-2 w-full text-center text-sm editable" contenteditable="true"><span class="schreib-linie inline-block min-w-[6rem]"><span class="is-answer">Raupe</span></span></div>
    </div>
    <div class="text-3xl text-gray-400 font-bold shrink-0">→</div>
    <div class="flex-1 flex flex-col items-center">
      <div class="ai-image-slot resize overflow-hidden w-full aspect-square border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors text-xs" contenteditable="true" data-no-reposition="true">[Bild 3]</div>
      <div class="mt-2 w-full text-center text-sm editable" contenteditable="true"><span class="schreib-linie inline-block min-w-[6rem]"><span class="is-answer">Puppe</span></span></div>
    </div>
    <div class="text-3xl text-gray-400 font-bold shrink-0">→</div>
    <div class="flex-1 flex flex-col items-center">
      <div class="ai-image-slot resize overflow-hidden w-full aspect-square border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors text-xs" contenteditable="true" data-no-reposition="true">[Bild 4]</div>
      <div class="mt-2 w-full text-center text-sm editable" contenteditable="true"><span class="schreib-linie inline-block min-w-[6rem]"><span class="is-answer">Schmetterling</span></span></div>
    </div>
  </div>
</div>`
  },
  {
    id: "recherche",
    name: "Recherche-Leitfaden",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-6 text-THEME-700" contenteditable="true">Aufgabe: Recherche-Leitfaden</h3>
  <div class="space-y-5">
    <div>
      <h4 class="font-bold text-gray-900 mb-1 editable flex items-center gap-2" contenteditable="true"><span class="text-xl">🔍</span> Meine Forschungsfrage</h4>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Wie leben Bienen im Winter?</span></div>
    </div>
    <div>
      <h4 class="font-bold text-gray-900 mb-1 editable flex items-center gap-2" contenteditable="true"><span class="text-xl">📚</span> Meine Quellen</h4>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Buch: ..., Internet: ...</span></div>
    </div>
    <div>
      <h4 class="font-bold text-gray-900 mb-1 editable flex items-center gap-2" contenteditable="true"><span class="text-xl">📝</span> Wichtige Erkenntnisse</h4>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></div>
    </div>
    <div>
      <h4 class="font-bold text-gray-900 mb-1 editable flex items-center gap-2" contenteditable="true"><span class="text-xl">✅</span> Meine Antwort</h4>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">...</span></div>
    </div>
  </div>
</div>`
  },
  {
    id: "bildgeschichte",
    name: "Bildgeschichte ordnen",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Bildgeschichte ordnen</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Bringe die Bilder in die richtige Reihenfolge (1–4) und schreibe dann eine Geschichte dazu.</p>
  <div class="grid grid-cols-4 gap-3 mb-4">
    <div class="flex flex-col items-center">
      <div class="ai-image-slot resize overflow-hidden w-full aspect-square border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors text-xs" contenteditable="true" data-no-reposition="true">[Bild A]</div>
      <div style="margin-top: 10px;" class="w-10 h-10 border-2 border-gray-500 rounded flex items-center justify-center font-bold text-lg editable text-THEME-600" contenteditable="true"><span class="is-answer">2</span></div>
    </div>
    <div class="flex flex-col items-center">
      <div class="ai-image-slot resize overflow-hidden w-full aspect-square border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors text-xs" contenteditable="true" data-no-reposition="true">[Bild B]</div>
      <div style="margin-top: 10px;" class="w-10 h-10 border-2 border-gray-500 rounded flex items-center justify-center font-bold text-lg editable text-THEME-600" contenteditable="true"><span class="is-answer">4</span></div>
    </div>
    <div class="flex flex-col items-center">
      <div class="ai-image-slot resize overflow-hidden w-full aspect-square border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors text-xs" contenteditable="true" data-no-reposition="true">[Bild C]</div>
      <div style="margin-top: 10px;" class="w-10 h-10 border-2 border-gray-500 rounded flex items-center justify-center font-bold text-lg editable text-THEME-600" contenteditable="true"><span class="is-answer">1</span></div>
    </div>
    <div class="flex flex-col items-center">
      <div class="ai-image-slot resize overflow-hidden w-full aspect-square border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors text-xs" contenteditable="true" data-no-reposition="true">[Bild D]</div>
      <div style="margin-top: 10px;" class="w-10 h-10 border-2 border-gray-500 rounded flex items-center justify-center font-bold text-lg editable text-THEME-600" contenteditable="true"><span class="is-answer">3</span></div>
    </div>
  </div>
  <p class="editable font-bold mb-2" contenteditable="true">Meine Geschichte:</p>
  <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Es war einmal...</span></div>
</div>`
  },
  {
    id: "w_fragen",
    name: "W-Fragen zum Text",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: W-Fragen zum Text</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Beantworte die W-Fragen zum gelesenen Text.</p>
  <div class="space-y-2 leading-loose">
    <p class="editable" contenteditable="true"><span class="font-bold text-THEME-700 inline-block w-24">Wer?</span> <span class="gap-line"><span class="is-answer">...</span></span></p>
    <p class="editable" contenteditable="true"><span class="font-bold text-THEME-700 inline-block w-24">Was?</span> <span class="gap-line"><span class="is-answer">...</span></span></p>
    <p class="editable" contenteditable="true"><span class="font-bold text-THEME-700 inline-block w-24">Wann?</span> <span class="gap-line"><span class="is-answer">...</span></span></p>
    <p class="editable" contenteditable="true"><span class="font-bold text-THEME-700 inline-block w-24">Wo?</span> <span class="gap-line"><span class="is-answer">...</span></span></p>
    <p class="editable" contenteditable="true"><span class="font-bold text-THEME-700 inline-block w-24">Warum?</span> <span class="gap-line"><span class="is-answer">...</span></span></p>
    <p class="editable" contenteditable="true"><span class="font-bold text-THEME-700 inline-block w-24">Wie?</span> <span class="gap-line"><span class="is-answer">...</span></span></p>
  </div>
</div>`
  },
  {
    id: "abc_liste",
    name: "ABC-Liste",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: ABC-Liste</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Finde zu jedem Buchstaben ein passendes Wort zum Thema.</p>
  <div class="grid grid-cols-2 gap-x-8 gap-y-1">
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">A</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">N</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">B</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">O</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">C</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">P</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">D</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">Q</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">E</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">R</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">F</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">S</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">G</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">T</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">H</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">U</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">I</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">V</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">J</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">W</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">K</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">X</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">L</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">Y</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">M</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
    <p class="editable flex items-baseline gap-2" contenteditable="true"><span class="font-bold text-THEME-700 w-6 shrink-0">Z</span><span class="gap-line flex-1"><span class="is-answer">...</span></span></p>
  </div>
</div>`
  },
  {
    id: "reimpaare",
    name: "Reimpaare",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Finde einen Reim</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Schreibe zu jedem Wort ein passendes Reimwort auf die Linie.</p>
  <div class="grid grid-cols-2 gap-x-16 gap-y-2 leading-loose">
    <p class="editable text-gray-900" contenteditable="true">• Haus – <span class="gap-line"><span class="is-answer">Maus</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• Katze – <span class="gap-line"><span class="is-answer">Tatze</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• Baum – <span class="gap-line"><span class="is-answer">Schaum</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• Hand – <span class="gap-line"><span class="is-answer">Wand</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• Nacht – <span class="gap-line"><span class="is-answer">Pracht</span></span></p>
    <p class="editable text-gray-900" contenteditable="true">• Stein – <span class="gap-line"><span class="is-answer">klein</span></span></p>
  </div>
</div>`
  },
  {
    id: "dialog_luecken",
    name: "Dialog-Lücken",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Dialog ergänzen</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Ergänze den Dialog mit passenden Antworten.</p>
  <div class="space-y-4">
    <div class="flex gap-3 items-start">
      <div class="w-12 h-12 rounded-full bg-THEME-100 flex items-center justify-center text-2xl shrink-0">👧</div>
      <div class="flex-1 bg-THEME-50 border border-THEME-200 rounded-xl rounded-tl-none p-3">
        <p class="editable text-THEME-900" contenteditable="true">Hallo! Wie heisst du?</p>
      </div>
    </div>
    <div class="flex gap-3 items-start flex-row-reverse">
      <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl shrink-0">🧒</div>
      <div class="flex-1 bg-gray-50 border border-gray-200 rounded-xl rounded-tr-none p-3">
        <p class="editable text-gray-900" contenteditable="true"><span class="gap-line"><span class="is-answer">Ich heisse Tim. Und du?</span></span></p>
      </div>
    </div>
    <div class="flex gap-3 items-start">
      <div class="w-12 h-12 rounded-full bg-THEME-100 flex items-center justify-center text-2xl shrink-0">👧</div>
      <div class="flex-1 bg-THEME-50 border border-THEME-200 rounded-xl rounded-tl-none p-3">
        <p class="editable text-THEME-900" contenteditable="true">Ich heisse Anna. Wohin gehst du?</p>
      </div>
    </div>
    <div class="flex gap-3 items-start flex-row-reverse">
      <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl shrink-0">🧒</div>
      <div class="flex-1 bg-gray-50 border border-gray-200 rounded-xl rounded-tr-none p-3">
        <p class="editable text-gray-900" contenteditable="true"><span class="gap-line"><span class="is-answer">Ich gehe zur Schule.</span></span></p>
      </div>
    </div>
  </div>
</div>`
  },
  {
    id: "kwl_chart",
    name: "Kennen-Wissen-Lernen-Chart",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Kennen-Wissen-Lernen-Chart</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Fülle die drei Spalten zum Thema aus.</p>
  <table class="w-full border-collapse border-2 border-gray-300">
    <thead>
      <tr>
        <th class="border-2 border-gray-300 p-3 bg-blue-50 text-blue-800 editable font-bold w-1/3" contenteditable="true">K – Was ich weiss</th>
        <th class="border-2 border-gray-300 p-3 bg-amber-50 text-amber-800 editable font-bold w-1/3" contenteditable="true">W – Was ich wissen will</th>
        <th class="border-2 border-gray-300 p-3 bg-green-50 text-green-800 editable font-bold w-1/3" contenteditable="true">L – Was ich gelernt habe</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border-2 border-gray-300 p-3 align-top leading-loose editable text-THEME-600 italic" style="min-height:120px;" contenteditable="true"><span class="is-answer">...</span></td>
        <td class="border-2 border-gray-300 p-3 align-top leading-loose editable text-THEME-600 italic" style="min-height:120px;" contenteditable="true"><span class="is-answer">...</span></td>
        <td class="border-2 border-gray-300 p-3 align-top leading-loose editable text-THEME-600 italic" style="min-height:120px;" contenteditable="true"><span class="is-answer">...</span></td>
      </tr>
    </tbody>
  </table>
</div>`
  },
  {
    id: "reflexion",
    name: "Reflexions-Skala",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Selbsteinschätzung</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Wie gut kannst du die Aufgaben lösen? Kreuze die passende Antwort an.</p>
  <table class="w-full border-collapse border-2 border-gray-300">
    <thead>
      <tr class="bg-gray-100">
        <th class="border-2 border-gray-300 p-2 editable font-bold text-left" contenteditable="true">Ich kann...</th>
        <th class="border-2 border-gray-300 p-2 text-2xl w-16">😄</th>
        <th class="border-2 border-gray-300 p-2 text-2xl w-16">🙂</th>
        <th class="border-2 border-gray-300 p-2 text-2xl w-16">😐</th>
        <th class="border-2 border-gray-300 p-2 text-2xl w-16">😕</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border-2 border-gray-300 p-2 editable" contenteditable="true">... das Thema in eigenen Worten erklären.</td>
        <td class="border-2 border-gray-300 p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
        <td class="border-2 border-gray-300 p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
        <td class="border-2 border-gray-300 p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
        <td class="border-2 border-gray-300 p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-300 p-2 editable" contenteditable="true">... Beispiele dazu nennen.</td>
        <td class="border-2 border-gray-300 p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
        <td class="border-2 border-gray-300 p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
        <td class="border-2 border-gray-300 p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
        <td class="border-2 border-gray-300 p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
      </tr>
      <tr>
        <td class="border-2 border-gray-300 p-2 editable" contenteditable="true">... die Aufgaben selbstständig lösen.</td>
        <td class="border-2 border-gray-300 p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
        <td class="border-2 border-gray-300 p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
        <td class="border-2 border-gray-300 p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
        <td class="border-2 border-gray-300 p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors"></td>
      </tr>
    </tbody>
  </table>
</div>`
  },
  {
    id: "ziel_checkliste",
    name: "Ziel-Checkliste",
    html: `<div class="avoid-break mb-8 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Meine Lernziele</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Hake ab, was du schon erreicht hast.</p>
  <ul class="space-y-2 list-none pl-0">
    <li class="editable flex items-start gap-3" contenteditable="true"><span class="inline-block w-5 h-5 border-2 border-gray-500 rounded shrink-0 mt-0.5"></span><span class="flex-1">Ich kann die wichtigsten Begriffe erklären.</span></li>
    <li class="editable flex items-start gap-3" contenteditable="true"><span class="inline-block w-5 h-5 border-2 border-gray-500 rounded shrink-0 mt-0.5"></span><span class="flex-1">Ich kann ein Beispiel nennen.</span></li>
    <li class="editable flex items-start gap-3" contenteditable="true"><span class="inline-block w-5 h-5 border-2 border-gray-500 rounded shrink-0 mt-0.5"></span><span class="flex-1">Ich kann das Gelernte anwenden.</span></li>
    <li class="editable flex items-start gap-3" contenteditable="true"><span class="inline-block w-5 h-5 border-2 border-gray-500 rounded shrink-0 mt-0.5"></span><span class="flex-1">Ich kann die Ergebnisse anderen erklären.</span></li>
  </ul>
</div>`
  }
];

