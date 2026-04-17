/**
 * Block-Engine für das Dossier-HTML.
 *
 * Ein "Block" ist ein Aufgaben- oder Merkblatt-Container in der Form
 *   <div class="avoid-break …"> <h3 class="editable …">TITEL</h3> … </div>
 * (konsistent in allen 32 Exercise-Templates aus constants.ts).
 *
 * Die Engine erlaubt es der KI, einen einzelnen Block per Titel anzusprechen,
 * statt das gesamte Dossier-HTML zu ersetzen.
 */

export interface BlockInfo {
  /** 0-basierte Position im Dokument (Reihenfolge der Blöcke). */
  index: number;
  /** Innertext des <h3>, getrimmt. */
  title: string;
  /** outerHTML des ganzen <div class="avoid-break …">-Wrappers. */
  outerHtml: string;
}

export interface BlockMatchOk {
  ok: true;
  block: BlockInfo;
}

export interface BlockMatchAmbiguous {
  ok: false;
  reason: 'ambiguous';
  candidates: BlockInfo[];
}

export interface BlockMatchNotFound {
  ok: false;
  reason: 'not_found';
  available: BlockInfo[];
}

export type BlockMatchFail = BlockMatchAmbiguous | BlockMatchNotFound;
export type BlockMatch = BlockMatchOk | BlockMatchFail;

/** Nur im Browser verfügbar (DOMParser). Für Tests: jsdom. */
function getParser(): DOMParser {
  if (typeof DOMParser === 'undefined') {
    throw new Error('blockOps benötigt DOMParser (nur im Browser verfügbar).');
  }
  return new DOMParser();
}

/**
 * Parst das HTML und gibt alle "avoid-break"-Blöcke zurück, die ein direktes
 * <h3>-Kind als Titel haben. Überschriften-Container ohne h3-Titel (z.B.
 * page-break-Divs) werden ignoriert.
 */
export function parseBlocks(html: string): BlockInfo[] {
  if (!html) return [];
  const parser = getParser();
  const doc = parser.parseFromString(`<div id="__root__">${html}</div>`, 'text/html');
  const root = doc.getElementById('__root__');
  if (!root) return [];

  const wrappers = root.querySelectorAll('div.avoid-break');
  const blocks: BlockInfo[] = [];
  let idx = 0;

  wrappers.forEach((el) => {
    // Nur Wrapper mit einem <h3> als Titel zählen als "Block".
    const h3 = el.querySelector(':scope > h3');
    if (!h3) return;
    const title = (h3.textContent || '').trim();
    if (!title) return;
    blocks.push({
      index: idx++,
      title,
      outerHtml: el.outerHTML,
    });
  });

  return blocks;
}

/**
 * Normalisiert einen Titel für den Fuzzy-Vergleich:
 * - lowercase
 * - mehrfache Whitespaces → ein Space
 * - führende/abschließende Satzzeichen & "Aufgabe …:" Präfix entfernt
 */
function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^aufgabe\s*[a-z0-9.]*\s*[:\-–]\s*/i, '')
    .replace(/[:\-–]\s*$/, '')
    .trim();
}

/**
 * Findet einen Block per Titel (oder per "#N"-Index-Syntax als Fallback).
 *
 * Match-Strategie:
 *   1. Index-Syntax: "#3" → Block mit index === 3.
 *   2. Exakter Titel (nach trim).
 *   3. Exakter normalisierter Titel (lowercase, ohne "Aufgabe X:"-Präfix).
 *   4. Substring-Match (normalisiert).
 */
export function findBlock(html: string, titleOrIndex: string | number): BlockMatch {
  const blocks = parseBlocks(html);

  // Index-Zugriff
  if (typeof titleOrIndex === 'number') {
    const b = blocks[titleOrIndex];
    return b
      ? { ok: true, block: b }
      : { ok: false, reason: 'not_found', available: blocks };
  }

  const raw = titleOrIndex.trim();

  // "#N" Syntax
  const hashMatch = raw.match(/^#(\d+)$/);
  if (hashMatch) {
    const n = parseInt(hashMatch[1], 10);
    const b = blocks[n];
    return b
      ? { ok: true, block: b }
      : { ok: false, reason: 'not_found', available: blocks };
  }

  // 2. Exakter Titel
  const exact = blocks.filter((b) => b.title === raw);
  if (exact.length === 1) return { ok: true, block: exact[0] };
  if (exact.length > 1) return { ok: false, reason: 'ambiguous', candidates: exact };

  // 3. Exakter normalisierter Titel
  const normQuery = normalizeTitle(raw);
  const normExact = blocks.filter((b) => normalizeTitle(b.title) === normQuery);
  if (normExact.length === 1) return { ok: true, block: normExact[0] };
  if (normExact.length > 1) return { ok: false, reason: 'ambiguous', candidates: normExact };

  // 4. Substring-Match
  const substr = blocks.filter((b) => normalizeTitle(b.title).includes(normQuery));
  if (substr.length === 1) return { ok: true, block: substr[0] };
  if (substr.length > 1) return { ok: false, reason: 'ambiguous', candidates: substr };

  return { ok: false, reason: 'not_found', available: blocks };
}

/**
 * Hilfsfunktion: Parst das HTML und liefert das Ziel-Block-Element zurück
 * (+ Root-Element zum späteren Serialisieren). Liefert null bei Fehler.
 */
function locateBlockElement(
  html: string,
  target: string | number,
): { root: HTMLElement; block: Element; blockInfo: BlockInfo; doc: Document } | null {
  const match = findBlock(html, target);
  if (!match.ok) return null;

  const parser = getParser();
  const doc = parser.parseFromString(`<div id="__root__">${html}</div>`, 'text/html');
  const root = doc.getElementById('__root__');
  if (!root) return null;

  // Iteriere in Dokumentreihenfolge und zähle gültige Blöcke (wie parseBlocks)
  const wrappers = root.querySelectorAll('div.avoid-break');
  let idx = 0;
  let targetEl: Element | null = null;
  wrappers.forEach((el) => {
    if (targetEl) return;
    const h3 = el.querySelector(':scope > h3');
    if (!h3) return;
    if (!(h3.textContent || '').trim()) return;
    if (idx === match.block.index) {
      targetEl = el;
    }
    idx++;
  });

  if (!targetEl) return null;
  return { root, block: targetEl, blockInfo: match.block, doc };
}

/**
 * Ersetzt einen Block durch neues HTML. Das newBlockHtml muss ein
 * `<div class="avoid-break …"> … </div>` sein (wie aus den Templates).
 *
 * Nutzt DOM-Swap (nicht String-Replace), weil das vom DOMParser zurückgegebene
 * outerHtml nicht immer byte-identisch mit dem Quell-HTML ist (Whitespace,
 * Attribut-Reihenfolge, Entity-Encoding). String-Replace würde dann silent fehlschlagen.
 */
export function replaceBlock(
  html: string,
  target: string | number,
  newBlockHtml: string,
): { ok: true; html: string; replaced: BlockInfo } | BlockMatchFail {
  const located = locateBlockElement(html, target);
  if (!located) {
    const match = findBlock(html, target);
    return match.ok ? ({ ok: false, reason: 'not_found', available: parseBlocks(html) } as BlockMatchFail) : (match as BlockMatchFail);
  }
  const { root, block, blockInfo, doc } = located;

  const wrap = doc.createElement('div');
  wrap.innerHTML = newBlockHtml;
  const newEl = wrap.firstElementChild;
  if (!newEl) {
    // Fallback auf String-Replace, falls die KI kein <div>-Wrapper geliefert hat
    const updated = html.replace(blockInfo.outerHtml, newBlockHtml);
    return { ok: true, html: updated, replaced: blockInfo };
  }

  block.replaceWith(newEl);
  return { ok: true, html: root.innerHTML, replaced: blockInfo };
}

/**
 * Fügt einen neuen Block direkt nach dem Ziel-Block ein.
 */
export function insertBlockAfter(
  html: string,
  target: string | number,
  newBlockHtml: string,
): { ok: true; html: string; afterBlock: BlockInfo } | BlockMatchFail {
  const located = locateBlockElement(html, target);
  if (!located) {
    const match = findBlock(html, target);
    return match.ok ? ({ ok: false, reason: 'not_found', available: parseBlocks(html) } as BlockMatchFail) : (match as BlockMatchFail);
  }
  const { root, block, blockInfo, doc } = located;

  const wrap = doc.createElement('div');
  wrap.innerHTML = newBlockHtml;
  const newEl = wrap.firstElementChild;
  if (!newEl) {
    const updated = html.replace(
      blockInfo.outerHtml,
      blockInfo.outerHtml + '\n' + newBlockHtml,
    );
    return { ok: true, html: updated, afterBlock: blockInfo };
  }

  block.parentNode?.insertBefore(newEl, block.nextSibling);
  return { ok: true, html: root.innerHTML, afterBlock: blockInfo };
}

/**
 * Hängt einen neuen Block ans Ende des letzten Seiten-Containers (p-[2.5cm]) an.
 * Fallback: Nach dem letzten bestehenden Block; sonst ans Ende des HTML.
 *
 * Nutzt DOMParser, um Klammern sauber zu matchen – Regex-Varianten scheitern an
 * verschachtelten <div>-Containern und platzieren den Block sonst mitten drin.
 */
export function appendBlock(html: string, newBlockHtml: string): string {
  if (!html) return newBlockHtml;

  // 1. Versuch: letzten p-[2.5cm]-Container via DOM finden und dort innen anhängen
  try {
    const parser = getParser();
    const doc = parser.parseFromString(`<div id="__root__">${html}</div>`, 'text/html');
    const root = doc.getElementById('__root__');
    if (root) {
      const pageContainers = root.querySelectorAll('div[class*="p-[2.5cm]"]');
      if (pageContainers.length > 0) {
        const lastContainer = pageContainers[pageContainers.length - 1];
        // outerHTML des Containers VOR der Mutation merken
        const originalOuter = lastContainer.outerHTML;
        // Neuen Block als String in den Container parsen und anhängen
        const wrap = doc.createElement('div');
        wrap.innerHTML = newBlockHtml;
        while (wrap.firstChild) {
          lastContainer.appendChild(wrap.firstChild);
        }
        const mutatedOuter = lastContainer.outerHTML;
        // Byte-exakter Replace im Original-HTML, um Whitespace u.ä. zu bewahren
        if (html.includes(originalOuter)) {
          return html.replace(originalOuter, mutatedOuter);
        }
        // Fallback: kompletter Root-Rebuild
        return root.innerHTML;
      }
    }
  } catch {
    // DOMParser fehlt → auf String-Fallback zurückfallen
  }

  // 2. Fallback: Nach dem letzten Block (avoid-break mit h3) anhängen
  const blocks = parseBlocks(html);
  if (blocks.length > 0) {
    const last = blocks[blocks.length - 1];
    if (html.includes(last.outerHtml)) {
      return html.replace(last.outerHtml, last.outerHtml + '\n' + newBlockHtml);
    }
  }

  // 3. Letzter Fallback: ans Ende des HTML-Strings
  return html + '\n' + newBlockHtml;
}

/**
 * Löscht einen Block aus dem HTML.
 */
export function deleteBlock(
  html: string,
  target: string | number,
): { ok: true; html: string; deleted: BlockInfo } | BlockMatchFail {
  const located = locateBlockElement(html, target);
  if (!located) {
    const match = findBlock(html, target);
    return match.ok ? ({ ok: false, reason: 'not_found', available: parseBlocks(html) } as BlockMatchFail) : (match as BlockMatchFail);
  }
  const { root, block, blockInfo } = located;
  block.remove();
  return { ok: true, html: root.innerHTML, deleted: blockInfo };
}

/**
 * Parst einen Aufgaben-Titel wie "Aufgabe A.3: ..." oder "Aufgabe 2b: ..." oder
 * "Aufgabe 1.2: ..." in seine Bestandteile.
 *
 * Erkannt werden:
 *   - Optionaler Kapitel-Prefix (Buchstabe ODER Zahl gefolgt von Punkt, z.B. "A." oder "1.")
 *   - Haupt-Nummer
 *   - Optionaler Buchstaben-Suffix für Teilaufgaben (z.B. "b")
 */
export interface ParsedTaskTitle {
  /** Kapitel-Prefix inkl. Punkt ("A." | "1." | ""). */
  prefix: string;
  /** Haupt-Nummer (z.B. 3). */
  number: number;
  /** Buchstaben-Suffix für Teilaufgaben ("a" | "b" | undefined). */
  letterSuffix?: string;
  /** Rest hinter dem Doppelpunkt. */
  rest: string;
}

const TASK_TITLE_REGEX = /^Aufgabe\s+([A-Za-z]\.|\d+\.)?(\d+)([a-z])?\s*:\s*(.*)$/;

export function parseTaskTitle(title: string): ParsedTaskTitle | null {
  const m = title.trim().match(TASK_TITLE_REGEX);
  if (!m) return null;
  return {
    prefix: m[1] ?? '',
    number: parseInt(m[2], 10),
    letterSuffix: m[3],
    rest: m[4].trim(),
  };
}

function formatTaskTitle(p: ParsedTaskTitle): string {
  return `Aufgabe ${p.prefix}${p.number}${p.letterSuffix ?? ''}: ${p.rest}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Nach einem Insert eigenständiger Aufgaben (ohne letterSuffix) die Folge-Blöcke
 * mit gleichem Prefix um delta (+1 oder -1) in der Nummerierung verschieben.
 *
 * Beispiel: Eingefügt "Aufgabe A.3: Neu" zwischen "A.2" und "A.3" alt.
 * Danach: "A.3 alt" → "A.4", "A.4 alt" → "A.5" etc.
 *
 * Teilaufgaben-Titel (mit letterSuffix) werden NICHT verschoben, weil sie zu
 * ihrer Haupt-Aufgabe gehören.
 *
 * Gibt das neue HTML zurück (unverändert, falls das eingefügte Block-Titel kein
 * erkennbares Schema hat oder selbst eine Teilaufgabe ist).
 */
export function renumberAfterInsert(html: string, insertedIndex: number): string {
  const blocks = parseBlocks(html);
  const inserted = blocks[insertedIndex];
  if (!inserted) return html;
  const parsed = parseTaskTitle(inserted.title);
  if (!parsed) return html;
  if (parsed.letterSuffix) return html; // Teilaufgabe: nicht verschieben

  const prefix = parsed.prefix;
  const startNumber = parsed.number;

  const parser = getParser();
  const doc = parser.parseFromString(`<div id="__root__">${html}</div>`, 'text/html');
  const root = doc.getElementById('__root__');
  if (!root) return html;

  const wrappers = root.querySelectorAll('div.avoid-break');
  let idx = 0;
  let changed = false;
  wrappers.forEach((el) => {
    const h3 = el.querySelector(':scope > h3');
    if (!h3 || !(h3.textContent || '').trim()) return;
    const currentIdx = idx;
    idx++;

    if (currentIdx <= insertedIndex) return; // nur Nachfolger

    const title = (h3.textContent || '').trim();
    const p = parseTaskTitle(title);
    if (!p) return;
    if (p.prefix !== prefix) return; // anderes Kapitel
    if (p.letterSuffix) return; // Teilaufgabe
    if (p.number < startNumber) return; // nur gleiche/höhere Nummern

    const newTitle = formatTaskTitle({ ...p, number: p.number + 1 });

    // Nur den h3-Text ersetzen, innere HTML-Struktur (spans etc.) so weit wie
    // möglich erhalten. Wenn der h3 nur Text enthält, reicht textContent=.
    const onlyText = h3.children.length === 0;
    if (onlyText) {
      h3.textContent = newTitle;
    } else {
      // Fallback: finde den ersten Text-Node der den alten Titel enthält und ersetze.
      // Die allermeisten Templates haben Plain-Text im <h3> – das obere greift.
      h3.textContent = newTitle;
    }
    changed = true;
  });

  if (!changed) return html;
  return root.innerHTML;
}

/**
 * Erzeugt eine kompakte Block-Übersicht als Text, die dem KI-System-Prompt
 * statt des vollen HTML mitgegeben werden kann.
 */
export function formatBlockOverview(html: string): string {
  const blocks = parseBlocks(html);
  if (blocks.length === 0) {
    return 'Das Dossier enthält noch keine Aufgaben-/Merkblatt-Blöcke.';
  }
  return blocks
    .map((b) => `  #${b.index}  "${b.title}"  (${b.outerHtml.length} Zeichen)`)
    .join('\n');
}

/**
 * Ersetzt im gegebenen Block-HTML das erste Element mit der Klasse
 * "image-placeholder-trigger" oder das erste <img>-Tag durch ein <img> mit
 * der übergebenen data-URL. Wenn kein Platzhalter gefunden wird, wird ein
 * neues <img> vor dem schließenden </div> eingefügt.
 */
export function injectImageIntoBlock(blockHtml: string, dataUrl: string, alt: string = ''): string {
  const parser = getParser();
  const doc = parser.parseFromString(`<div id="__wrap__">${blockHtml}</div>`, 'text/html');
  const wrap = doc.getElementById('__wrap__');
  if (!wrap) return blockHtml;

  // 1. image-placeholder-trigger – Placeholder-Wrapper (z.B. w-1/3-Flex-Feld im Steckbrief)
  //    BEHALTEN und den inneren Platzhalter-Text durch ein <img> ersetzen. Dadurch
  //    bleibt das äußere Layout (Breite, Flex, Rahmen) des Platzhalters intakt.
  const placeholder = wrap.querySelector('.image-placeholder-trigger');
  if (placeholder) {
    // Placeholder-eigene "leeres Feld"-Deko entfernen; Bild übernimmt die Fläche.
    // "flex" BLEIBT – wir nutzen flex+items-stretch (default), damit das innere
    // <img> mit h-full sauber auf Slot-Höhe resolvieren kann.
    placeholder.classList.remove(
      'image-placeholder-trigger',
      'border-dashed',
      'border-2',
      'border-gray-300',
      'border-gray-400',
      'bg-gray-50',
      'text-gray-400',
      'cursor-pointer',
      'hover:bg-gray-100',
      'hover:bg-gray-200',
      'transition-colors',
      'items-center',
      'justify-center',
    );
    placeholder.removeAttribute('contenteditable');
    // Wrapper als editierbaren KI-Bild-Slot markieren. Doppelklick im Editor
    // findet diesen per .ai-image-slot – egal ob der Inhalt img, Drawing-
    // Placeholder oder Eigenes-Upload ist.
    // resize/overflow-hidden + min-height macht den Slot per Corner-Handle
    // vertikal/horizontal vergrößerbar. Kinder (img/frame) füllen den Slot.
    placeholder.classList.add('ai-image-slot', 'resize', 'overflow-hidden', 'rounded-lg', 'flex');
    placeholder.setAttribute('data-ai-prompt', alt);
    placeholder.setAttribute('title', 'Doppelklick zum Bearbeiten – oder Ecke unten rechts ziehen zum Vergrößern');
    // Platzhalter-Text/Inhalt entfernen und durch <img> ersetzen
    while (placeholder.firstChild) placeholder.removeChild(placeholder.firstChild);
    const img = doc.createElement('img');
    img.setAttribute('src', dataUrl);
    img.setAttribute('alt', alt);
    img.setAttribute('class', 'block w-full h-full object-contain');
    placeholder.appendChild(img);
    return wrap.innerHTML;
  }

  // 2. Erstes <img> – wir hüllen es in einen ai-image-slot-Wrapper ein, damit
  //    Doppelklick auch hier greift.
  const existingImg = wrap.querySelector('img');
  if (existingImg) {
    existingImg.setAttribute('src', dataUrl);
    if (alt) existingImg.setAttribute('alt', alt);
    // Falls schon in einem Slot: Slot markieren und Prompt aktualisieren.
    const parent = existingImg.parentElement;
    if (parent && parent.classList.contains('ai-image-slot')) {
      parent.setAttribute('data-ai-prompt', alt);
      parent.classList.add('resize', 'overflow-hidden', 'flex');
      existingImg.className = 'block w-full h-full object-contain';
    } else if (parent) {
      const slot = doc.createElement('div');
      slot.className = 'ai-image-slot resize overflow-hidden rounded-lg flex';
      slot.setAttribute('data-ai-prompt', alt);
      slot.setAttribute('title', 'Doppelklick zum Bearbeiten – oder Ecke unten rechts ziehen zum Vergrößern');
      parent.insertBefore(slot, existingImg);
      slot.appendChild(existingImg);
      existingImg.className = 'block w-full h-full object-contain';
    }
    return wrap.innerHTML;
  }

  // 3. Vor </div> einfügen – als ai-image-slot-Wrapper mit <img> innen.
  const target = wrap.firstElementChild;
  if (target) {
    const slot = doc.createElement('div');
    slot.className = 'ai-image-slot resize overflow-hidden rounded-lg mt-2 flex';
    slot.style.minHeight = '200px';
    slot.setAttribute('data-ai-prompt', alt);
    slot.setAttribute('title', 'Doppelklick zum Bearbeiten – oder Ecke unten rechts ziehen zum Vergrößern');
    const img = doc.createElement('img');
    img.setAttribute('src', dataUrl);
    img.setAttribute('alt', alt);
    img.setAttribute('class', 'block w-full h-full object-contain');
    slot.appendChild(img);
    target.appendChild(slot);
    return wrap.innerHTML;
  }

  return blockHtml;
}
