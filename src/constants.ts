export const INITIAL_HTML = `
<div class="p-[2cm] min-h-[29.7cm] flex flex-col justify-center items-center relative border-b border-gray-100">
  <div class="text-center space-y-8 mt-20">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-semibold text-gray-600 uppercase tracking-widest">DEUTSCH-DOSSIER</h3>
    <h1 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[36pt] font-black text-gray-900 leading-none">Stammmorpheme, <br>Wortbausteine &amp; <br>Zeitformen</h1>
    <div class="w-24 h-1 bg-blue-600 rounded-full my-8 mx-auto"></div>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[12pt] text-gray-500 max-w-lg mx-auto">Ein Übungsheft für die 4. Klasse zum Entdecken von Wortfamilien, Verben und den wichtigsten Zeiten.</p>
  </div>
  <div class="absolute bottom-[2cm] left-[2cm] right-[2cm] border-t-2 border-gray-200 pt-8 flex justify-between font-bold text-gray-700 text-[12pt]">
    <div contenteditable="true" suppresscontenteditablewarning="true" class="editable">
      <span class="inline-block mb-4">Name: <span class="border-b border-gray-400 w-48 inline-block h-6"></span></span><br>
      <span>Klasse: <span class="border-b border-gray-400 w-48 inline-block h-6"></span></span>
    </div>
    <div contenteditable="true" suppresscontenteditablewarning="true" class="editable">Datum: <span class="border-b border-gray-400 w-32 inline-block h-6">03.02.</span></div>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm]">
  <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold mb-6 border-b-2 border-black pb-2">Inhaltsverzeichnis</h2>
  <ul id="toc-list" class="space-y-1 mb-8 max-w-2xl text-[20pt]"></ul>
</div>
<div class="page-break"></div>
<div class="p-[2cm]">
  <h1 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[36pt] font-black text-center mb-10 uppercase tracking-widest">Kapitel 1: <br> Stammmorpheme &amp; Wortbausteine</h1>
  <div class="avoid-break p-6 rounded-xl border-2 bg-blue-50 border-blue-200 transition-all mb-6 text-[12pt]">
    <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold mb-3 flex items-center text-blue-900"><span class="text-[24pt] mr-3">💡</span> Merkblatt: Der Kern der Wörter</h2>
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold mt-4 mb-1 text-[14pt]">Was ist ein Wortstamm?</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-4">Der Wortstamm (oder das Stammmorphem) ist der Kern eines Wortes. Er gibt dem Wort seine Bedeutung. Wörter mit dem gleichen Wortstamm bilden zusammen eine <strong>Wortfamilie</strong>.</p>
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold mb-1 text-[14pt]">Die Bausteine (Morpheme):</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-2">Ein Wort kann aus bis zu drei Teilen bestehen:</p>
    <ul class="list-disc pl-8 mb-4 space-y-2">
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable"><strong>Vormorphem (Vorsilbe):</strong> Steht vor dem Stamm (z. B. ver-, ge-, be-).</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable"><strong>Stammmorphem (Wortstamm):</strong> Der wichtigste Teil in der Mitte (z. B. spiel).</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable"><strong>Nachmorphem (Nachsilbe):</strong> Steht nach dem Stamm (z. B. -ung, -heit, -bar, -ig).</li>
    </ul>
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold mb-1 text-[14pt]">Die Rechtschreib-Regel:</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-2">Der Apfel fällt nicht weit vom Stamm! Ein Wortstamm wird überall gleich geschrieben und enthält nie Umlaute (ä, ö, ü).</p>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[12pt] bg-white p-3 rounded border-2 border-dashed border-emerald-100 italic">Tipp: Ein Wort schreibt man mit „ä" oder „äu", wenn es ein verwandtes Wort mit „a" oder „au" (z. B. kalt &rarr; kälter, Haus &rarr; Häuser).</p>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm] space-y-8 text-[12pt]">
  <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold border-b-2 border-gray-800 pb-2">Teil 1: Wortstämme erkennen und zuordnen</h2>
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-1 text-emerald-700">Aufgabe 1: Wortfamilien ergänzen</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-3">Ergänze die beiden Wortfamilien mit passenden Wörtern.</p>
    <table class="w-full border-collapse border border-gray-400">
      <thead><tr class="bg-gray-100"><th class="border border-gray-400 p-2 text-left" contenteditable="true" suppresscontenteditablewarning="true">Stamm: fahr</th><th class="border border-gray-400 p-2 text-left" contenteditable="true" suppresscontenteditablewarning="true">Stamm: lieb</th></tr></thead>
      <tbody>
        <tr><td class="border border-gray-400 p-2" contenteditable="true" suppresscontenteditablewarning="true">das Fahrverbot</td><td class="border border-gray-400 p-2" contenteditable="true" suppresscontenteditablewarning="true">Das Spiel</td></tr>
        <tr><td class="border border-gray-400 p-2" contenteditable="true" suppresscontenteditablewarning="true">umfahren</td><td class="border border-gray-400 p-2" contenteditable="true" suppresscontenteditablewarning="true">überspielen</td></tr>
        <tr><td class="border border-gray-400 p-2" contenteditable="true" suppresscontenteditablewarning="true">der Fahrstuhl</td><td class="border border-gray-400 p-2" contenteditable="true" suppresscontenteditablewarning="true">Die Spielwiese</td></tr>
        <tr><td class="border border-gray-400 p-2 h-8" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border border-gray-400 p-2 h-8" contenteditable="true" suppresscontenteditablewarning="true"></td></tr>
      </tbody>
    </table>
  </div>
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-1 text-blue-700">Aufgabe 2: Stämme herausschreiben</h3>
    <ul class="space-y-4">
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="w-2/3 editable">springen, sprangen, gesprungen, Absprung &rarr;</span><strong contenteditable="true" suppresscontenteditablewarning="true" class="w-1/3 border-b border-gray-400 font-bold editable">spring, sprang, sprung</strong></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="w-2/3 editable">hüpfen, Hüpfburg, hüpfend, gehüpft &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="w-1/3 border-b border-gray-400 h-6 editable"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="w-2/3 editable">laufen, gelaufen, Läuferin, liefen, läufst &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="w-1/3 border-b border-gray-400 h-6 editable"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="w-2/3 editable">reiten, ritt, geritten, ausreiten, Ausritt &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="w-1/3 border-b border-gray-400 h-6 editable"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="w-2/3 editable">rennen, rannte, gerannt, Rennstrecke &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="w-1/3 border-b border-gray-400 h-6 editable"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="w-2/3 editable">schwimmen, Schwimmhalle, geschwommen &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="w-1/3 border-b border-gray-400 h-6 editable"></span></li>
    </ul>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm] space-y-8">
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-1 text-blue-700">Aufgabe 3: Sammelbegriff finden</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-3">Zu welchem gemeinsamen Wortstamm (Sammelbegriff) gehören diese Begriffe?</p>
    <ul class="space-y-4">
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="w-3/4 editable">a) die Schreibschrift, das Schreibheft, aufschreiben &rarr; Stamm:</span><span contenteditable="true" suppresscontenteditablewarning="true" class="w-1/4 border-b border-gray-400 h-6 editable"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="w-3/4 editable">b) das Lächeln, auslachen, lächerlich, das Gelächter &rarr; Stamm:</span><span contenteditable="true" suppresscontenteditablewarning="true" class="w-1/4 border-b border-gray-400 h-6 editable"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="w-3/4 editable">c) die Schwimmweste, der Schwimmer, schwimmend &rarr; Stamm:</span><span contenteditable="true" suppresscontenteditablewarning="true" class="w-1/4 border-b border-gray-400 h-6 editable"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="w-3/4 editable">d) der Koch, gekocht, köcheln, die Köchin &rarr; Stamm:</span><span contenteditable="true" suppresscontenteditablewarning="true" class="w-1/4 border-b border-gray-400 h-6 editable"></span></li>
    </ul>
  </div>
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-1 text-blue-700">Aufgabe 4: Welches Wort gehört nicht dazu?</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-3">Streiche in jeder Reihe den „Eindringling“ durch, der nicht zur Wortfamilie gehört.</p>
    <ul class="space-y-4">
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">a) erfahren – die Fahrt – Fackel – der Gefährte – der Fahrweg</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">b) der Gehweg – gegen – aufgehen – weggehen – untergehen</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">c) der Verlauf – entlaufen – der Langstreckenlauf – der Schuh</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">d) das Spiel – verspielt – das Brettspiel – der Fussball</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">e) der Verkauf – der Verkehr – die Verkäuferin – verkauft</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">f) die Arbeit – arbeiten – die Arbeitsstelle – tun – bearbeiten</li>
    </ul>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm] space-y-8">
  <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold border-b-2 border-gray-800 pb-2">Teil 2: Wörter bauen und verwandeln</h2>
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-1 text-blue-700">Aufgabe 5: Nomen-Baukasten (Nachmorpheme)</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-3">Bilde Nomen mit den passenden Wortbausteinen <strong>-keit, -heit, -ung, -nis</strong>.</p>
    <div class="grid grid-cols-2 gap-6">
      <div class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/3">lesen &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-2/3 border-b border-gray-400 italic">die Lesung</span></div>
      <div class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/3">krank &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-2/3 border-b border-gray-400 h-6"></span></div>
      <div class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/3">dunkel &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-2/3 border-b border-gray-400 h-6"></span></div>
      <div class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/3">geheim &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-2/3 border-b border-gray-400 h-6"></span></div>
      <div class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/3">gesund &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-2/3 border-b border-gray-400 h-6"></span></div>
      <div class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/3">hindern &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-2/3 border-b border-gray-400 h-6"></span></div>
      <div class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/3">müde &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-2/3 border-b border-gray-400 h-6"></span></div>
      <div class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/3">entdecken &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-2/3 border-b border-gray-400 h-6"></span></div>
    </div>
  </div>
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-1 text-blue-700">Aufgabe 6: Die Wort-Maschine</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-3">Kombiniere den Stamm <strong>„sicht“</strong> mit passenden Bausteinen. Bilde mindestens 5 sinnvolle Wörter.</p>
    <ul class="list-disc pl-8 mb-4 space-y-1">
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable"><strong>Vorsilben:</strong> vor-, an-, um-, be-, nach-</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable"><strong>Nachsilben:</strong> -lich, -ung, -bar, -ig</li>
    </ul>
    <div class="mt-4">
      <p class="editable font-bold mb-2" contenteditable="true">Deine Wörter:</p>
      <div class="schreib-linie editable" contenteditable="true"></div>
    </div>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm] space-y-8">
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-1 text-blue-700">Aufgabe 7: Wortarten verändern – Vom Verb/Adjektiv zum Nomen</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-3">Der Wortstamm bleibt gleich, aber die Wortart ändert sich! Verwandle die folgenden Wörter in ein passendes Nomen. Vergiss den Begleiter (Artikel) nicht.</p>
    <ul class="space-y-4 w-3/4">
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2">verbinden &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2 border-b border-gray-400 italic">die Verbindung</span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2">sicher &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2 border-b border-gray-400 h-6"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2">dumm &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2 border-b border-gray-400 h-6"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2">leiten &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2 border-b border-gray-400 h-6"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2">warm &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2 border-b border-gray-400 h-6"></span></li>
    </ul>
  </div>
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-1 text-blue-700">Aufgabe 8: Wortarten verändern – Vom Nomen/Adjektiv zum Verb</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-3">Jetzt machen wir es umgekehrt. Verwandle die folgenden Wörter in ein Verb (Tu-Wort).</p>
    <ul class="space-y-4 w-3/4">
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2">besser &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2 border-b border-gray-400 italic">verbessern</span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2">die Farbe &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2 border-b border-gray-400 h-6"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2">der Traum &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2 border-b border-gray-400 h-6"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2">die Arbeit &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2 border-b border-gray-400 h-6"></span></li>
      <li class="flex items-baseline gap-2"><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2">mutig &rarr;</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/2 border-b border-gray-400 h-6"></span></li>
    </ul>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm] space-y-8">
  <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold border-b-2 border-gray-800 pb-2">Teil 3: Der Wortstamm-Detektiv im Einsatz</h2>
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-2 text-blue-700">Aufgabe 9: Wortstämme im Text markieren</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-3">In diesem Text haben sich viele Wörter mit dem Stamm <strong>„lauf / läuf“</strong> versteckt. Male den Wortstamm im Text in der richtigen Farbe an:</p>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-4 text-center font-bold">Nomen = Braun &nbsp; * &nbsp; Verb = Blau &nbsp; * &nbsp; Adjektiv = Gelb</p>
    <div class="p-8 border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 text-[12pt] leading-loose">
      <p contenteditable="true" suppresscontenteditablewarning="true" class="editable text-justify italic">„Heute findet der große Stadtlauf statt. Die Läufer machen sich bereit. Tim läuft sich schon warm. Er trägt seine leichten Laufschuhe. Beiläufig erwähnt er, dass er gewinnen will. Dann erfolgt der Startschuss und alle laufen los.“</p>
    </div>
  </div>
  <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold border-b-2 border-gray-800 pb-2 mt-8">Teil 4: Rechtschreibung mit der Stammregel</h2>
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-2 text-blue-700">Aufgabe 10: „Ä“ oder „e“?</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-4">Setze den richtigen Buchstaben ein. Denke an die Wortstamm-Regel!</p>
    <ol class="list-decimal pl-8 space-y-4">
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">Die h<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">ä</span></span>rigen W<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">e</span></span>lpen haben schon scharfe Z<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">ä</span></span>hne und sind ziemlich gef<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">ä</span></span>hrlich.</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">Die g<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">e</span></span>lben K<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">ä</span></span>hne schl<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">ä</span></span>ngeln sich durch sumpfige Gew<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">ä</span></span>sser.</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">Für deine l<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">ä</span></span>cherliche Erkl<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">ä</span></span>rung habe ich kein Verst<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">ä</span></span>ndnis!</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">Der n<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">e</span></span>tte B<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">ä</span></span>cker zw<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">ä</span></span>ngt sich ständig in H<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">e</span></span>mden mit zu <span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">e</span></span>ngen <span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">Ä</span></span>rmeln.</li>
    </ol>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm] space-y-8">
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-2 text-blue-700">Aufgabe 11: „äu“ oder „eu“?</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-4">Setze ein. Auch hier hilft dir oft der Wortstamm!</p>
    <ol class="list-decimal pl-8 space-y-4">
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">1. B<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">eu</span></span>teltiere, K<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">äu</span></span>ze und <span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">Eu</span></span>len tr<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">äu</span></span>men in den B<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">äu</span></span>men.</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">2. N<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">eu</span></span>nzig bed<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">eu</span></span>tende L<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">eu</span></span>te ärgern sich über das Glockengel<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">äu</span></span>te.</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">3. Der L<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">äu</span></span>fer sch<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">äu</span></span>mte vor Wut, als er den Mann hinter dem St<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">eu</span></span>er sah.</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">4. Meine Fr<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">eu</span></span>ndin ist sehr gl<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">äu</span></span>big und bekr<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">eu</span></span>zigt sich h<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">ä</span></span>ufig.</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">5. Die abergl<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">äu</span></span>bische B<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">äu</span></span>uerin r<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">äu</span></span>mt schl<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">eu</span></span>nigst das H<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">eu</span></span> in die Sch<span class="gap-line" contenteditable="true" suppresscontenteditablewarning="true"><span class="is-answer">eu</span></span>ne.</li>
    </ol>
  </div>
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-2 text-blue-700">Aufgabe 12: Wortstamm-Check</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-4">Unterstreiche den Wortstamm. Korrigiere das Wort auf der Linie, falls es falsch geschrieben ist, und erkläre es mit dem passenden Stamm-Wort.</p>
    <table class="w-full border-collapse border border-gray-400">
      <thead>
        <tr class="bg-gray-100">
          <th class="border border-gray-400 p-2 text-left w-1/4">Falsches Wort</th>
          <th class="border border-gray-400 p-2 text-left w-1/4">So ist es richtig</th>
          <th class="border border-gray-400 p-2 text-left w-2/4">Begründung (Wortstamm)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="border p-2" contenteditable="true" suppresscontenteditablewarning="true">1. teglich</td>
          <td class="border p-2 italic" contenteditable="true" suppresscontenteditablewarning="true">täglich</td>
          <td class="border p-2 italic" contenteditable="true" suppresscontenteditablewarning="true">weil es von "Tag" kommt</td>
        </tr>
        <tr>
          <td class="border p-2" contenteditable="true" suppresscontenteditablewarning="true">2. der Schmärz</td>
          <td class="border p-2 h-10" contenteditable="true" suppresscontenteditablewarning="true"></td>
          <td class="border p-2 h-10" contenteditable="true" suppresscontenteditablewarning="true"></td>
        </tr>
        <tr>
          <td class="border p-2" contenteditable="true" suppresscontenteditablewarning="true">3. die Verscherfung</td>
          <td class="border p-2 h-10" contenteditable="true" suppresscontenteditablewarning="true"></td>
          <td class="border p-2 h-10" contenteditable="true" suppresscontenteditablewarning="true"></td>
        </tr>
        <tr>
          <td class="border p-2" contenteditable="true" suppresscontenteditablewarning="true">4. Ansträngend</td>
          <td class="border p-2 h-10" contenteditable="true" suppresscontenteditablewarning="true"></td>
          <td class="border p-2 h-10" contenteditable="true" suppresscontenteditablewarning="true"></td>
        </tr>
        <tr>
          <td class="border p-2" contenteditable="true" suppresscontenteditablewarning="true">5. Geschwetzig</td>
          <td class="border p-2 h-10" contenteditable="true" suppresscontenteditablewarning="true"></td>
          <td class="border p-2 h-10" contenteditable="true" suppresscontenteditablewarning="true"></td>
        </tr>
        <tr>
          <td class="border p-2" contenteditable="true" suppresscontenteditablewarning="true">6. Geferbt</td>
          <td class="border p-2 h-10" contenteditable="true" suppresscontenteditablewarning="true"></td>
          <td class="border p-2 h-10" contenteditable="true" suppresscontenteditablewarning="true"></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm] space-y-8">
  <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold border-b-2 border-gray-800 pb-2 mb-4">Teil 5: Die Brücke zu den Zeitformen (Präteritum)</h2>
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-2 text-blue-700">Aufgabe 13: Die Präteritum-Maschine</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-4">Bei regelmäßigen Verben hängst du in der Vergangenheit (Präteritum) einfach ein <strong>-te-</strong> an den Wortstamm! Finde den Stamm und bilde das Präteritum in der <em>ich</em>-Form.</p>
    <ul class="space-y-4">
      <li class="flex items-baseline gap-2">
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/4">sagen &rarr;</span>
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/4">Stamm: <strong>sag</strong> &rarr;</span>
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-2/4 border-b border-gray-400 inline-block">ich sag<strong>te</strong></span>
      </li>
      <li class="flex items-baseline gap-2">
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/4">bauen &rarr;</span>
        <span class="w-1/4 flex items-baseline gap-1">Stamm: <span class="border-b border-gray-400 flex-grow inline-block h-6" contenteditable="true" suppresscontenteditablewarning="true"></span> &rarr;</span>
        <span class="w-2/4 flex items-baseline gap-1">ich <span class="border-b border-gray-400 flex-grow inline-block h-6" contenteditable="true" suppresscontenteditablewarning="true"></span></span>
      </li>
      <li class="flex items-baseline gap-2">
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/4">lernen &rarr;</span>
        <span class="w-1/4 flex items-baseline gap-1">Stamm: <span class="border-b border-gray-400 flex-grow inline-block h-6" contenteditable="true" suppresscontenteditablewarning="true"></span> &rarr;</span>
        <span class="w-2/4 flex items-baseline gap-1">ich <span class="border-b border-gray-400 flex-grow inline-block h-6" contenteditable="true" suppresscontenteditablewarning="true"></span></span>
      </li>
      <li class="flex items-baseline gap-2">
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/4">suchen &rarr;</span>
        <span class="w-1/4 flex items-baseline gap-1">Stamm: <span class="border-b border-gray-400 flex-grow inline-block h-6" contenteditable="true" suppresscontenteditablewarning="true"></span> &rarr;</span>
        <span class="w-2/4 flex items-baseline gap-1">ich <span class="border-b border-gray-400 flex-grow inline-block h-6" contenteditable="true" suppresscontenteditablewarning="true"></span></span>
      </li>
      <li class="flex items-baseline gap-2">
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable w-1/4">grillen &rarr;</span>
        <span class="w-1/4 flex items-baseline gap-1">Stamm: <span class="border-b border-gray-400 flex-grow inline-block h-6" contenteditable="true" suppresscontenteditablewarning="true"></span> &rarr;</span>
        <span class="w-2/4 flex items-baseline gap-1">ich <span class="border-b border-gray-400 flex-grow inline-block h-6" contenteditable="true" suppresscontenteditablewarning="true"></span></span>
      </li>
    </ul>
  </div>
  <div class="avoid-break mt-8">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-2 text-blue-700">Aufgabe 14: Präteritum im Satz</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-4">Setze das Verb in der Klammer in der richtigen Präteritum-Form ein. Nutze den Wortstamm!</p>
    <ol class="list-decimal pl-6 space-y-5">
      <li class="flex items-baseline gap-2">
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable">1. Die Kinder</span>
        <span class="w-40 border-b border-gray-400 h-6" contenteditable="true" suppresscontenteditablewarning="true"></span>
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable">(tanzen) fröhlich im Kreis.</span>
      </li>
      <li class="flex items-baseline gap-2">
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable">2. Der Hund</span>
        <span class="w-40 border-b border-gray-400 h-6" contenteditable="true" suppresscontenteditablewarning="true"></span>
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable">(bellen) laut, als der Postbote came.</span>
      </li>
      <li class="flex items-baseline gap-2">
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable">3. Wir</span>
        <span class="w-40 border-b border-gray-400 h-6" contenteditable="true" suppresscontenteditablewarning="true"></span>
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable">(lachen) über den lustigen Witz.</span>
      </li>
      <li class="flex items-baseline gap-2">
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable">4. Du</span>
        <span class="w-40 border-b border-gray-400 h-6" contenteditable="true" suppresscontenteditablewarning="true"></span>
        <span contenteditable="true" suppresscontenteditablewarning="true" class="editable">(fragen) den Lehrer nach der Lösung.</span>
      </li>
    </ol>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm] space-y-8">
  <h1 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[36pt] font-black text-center mb-10 uppercase tracking-widest">Kapitel 2: <br> Verben &amp; Personalformen</h1>
  <div class="avoid-break p-6 rounded-xl border-2 bg-indigo-50 border-indigo-200 shadow-sm transition-all mb-6">
    <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold mb-3 flex items-center text-indigo-900"><span class="text-[24pt] mr-3">📝</span> Merkblatt: Verben &amp; Personalformen</h2>
    <ul class="list-disc pl-8 mb-6 space-y-2">
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">Verben schreibt man immer klein.</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">Verben erzählen uns, was getan wird oder geschieht.</li>
      <li contenteditable="true" suppresscontenteditablewarning="true" class="editable">Verben haben eine Befehlsform (Komm! / Kommt!).</li>
    </ul>
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold mt-4 mb-2 text-indigo-800">Die Verben-Probe:</h3>
    <div class="bg-white p-4 rounded-lg border border-indigo-100 flex flex-col md:flex-row gap-6 text-[12pt] mb-6 shadow-sm">
      <div class="md:w-1/2"><strong class="text-indigo-700 text-[12pt]">1. Personal-Probe:</strong><br><span class="inline-block mt-1 mb-2">Setze "ich", "du" oder "wir" davor.</span><br><em>singen</em> &rarr; ich singe (Das klappt! = Verb)</div>
      <div class="md:w-1/2"><strong class="text-indigo-700 text-[12pt]">2. Zeit-Probe:</strong><br><span class="inline-block mt-1 mb-2">Setze das Wort in eine andere Zeit.</span><br><em>singen</em> &rarr; ich sang (Das klappt! = Verb)</div>
    </div>
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold mt-4 mb-2 text-indigo-800">Die Personalformen (Konjugieren):</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-3">Der Wortstamm bleibt meistens gleich, aber die Endung (Nachmorphem) ändert sich!</p>
    <div class="bg-white p-5 rounded-lg border border-indigo-200 grid grid-cols-2 gap-8 font-medium shadow-sm">
      <div contenteditable="true" suppresscontenteditablewarning="true" class="editable leading-loose">ich spiel-<strong>e</strong><br>du spiel-<strong>st</strong><br>er/sie/es spiel-<strong>t</strong></div>
      <div contenteditable="true" suppresscontenteditablewarning="true" class="editable leading-loose">wir spiel-<strong>en</strong><br>ihr spiel-<strong>t</strong><br>sie spiel-<strong>en</strong></div>
    </div>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm] space-y-8">
  <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold border-b-2 border-gray-800 pb-2">Teil 1: Verben erkennen und anpassen</h2>
  <div class="avoid-break">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-2 text-green-700">Aufgabe 15: Der Böögg brennt</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-4 text-gray-600">Im folgenden Text stecken <strong>19 Verben</strong>. Markiere sie blau! (Die Verben-Probe hilft dir).</p>
    <div class="p-8 border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 text-[12pt] leading-loose">
      <p contenteditable="true" suppresscontenteditablewarning="true" class="editable text-justify">Von den Kirchtürmen der Stadt Zürich schlägt es sechs Uhr. Der mächtige Holzstoss wird angezündet. Schon lodern die ersten Flammen empor. Hei, wie das knistert, knackt und prasselt! Eine dunkle Rauchsäule steigt zum Himmel. Schon züngelt eine Flamme bis zum Böögg hinauf. Oh weh, der arme Kerl fängt schon Feuer! Sein Arm brennt; sein Besen wackelt. Jetzt knallt, kracht und zischt es im Bauch des Schneemannes. Fetzen seines weissen Leibes fliegen weg. Mit gewaltigem Knall zerplatzt der Kopf, und der Hut fällt ins Feuer. Nun neigt sich der Böögg und stürzt unter dem Jubel der Zuschauer in die Flammen.</p>
    </div>
  </div>
  <div class="avoid-break mt-10">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-2 text-green-700">Aufgabe 16: Kinder fragen viel</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-4 text-gray-600">Schreibe die Verben in der Grundform, in der 2. Person Singular (du) und in der 2. Person Plural (ihr).</p>
    <table class="w-full border-collapse border border-gray-400 text-center">
      <thead><tr class="bg-gray-100"><th class="border p-3">Grundform</th><th class="border p-3">2. Person Singular (du)</th><th class="border p-3">2. Person Plural (ihr)</th></tr></thead>
      <tbody>
        <tr><td class="border p-3 font-medium" contenteditable="true" suppresscontenteditablewarning="true">backen</td><td class="border p-3 italic" contenteditable="true" suppresscontenteditablewarning="true">du bäckst</td><td class="border p-3 italic" contenteditable="true" suppresscontenteditablewarning="true">ihr backt</td></tr>
        <tr><td class="border p-3 font-medium" contenteditable="true" suppresscontenteditablewarning="true">anfangen</td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td></tr>
        <tr><td class="border p-3 font-medium" contenteditable="true" suppresscontenteditablewarning="true">halten</td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td></tr>
        <tr><td class="border p-3 font-medium" contenteditable="true" suppresscontenteditablewarning="true">waschen</td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td></tr>
        <tr><td class="border p-3 font-medium" contenteditable="true" suppresscontenteditablewarning="true">verraten</td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td></tr>
      </tbody>
    </table>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm] space-y-8">
  <h1 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[36pt] font-black text-center mb-10 uppercase tracking-widest">Kapitel 3: <br> Die Zeitformen</h1>
  <div class="avoid-break p-6 rounded-xl border-2 bg-amber-50 border-amber-200 shadow-sm transition-all mb-6">
    <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold mb-4 flex items-center text-amber-900"><span class="text-[24pt] mr-3">⏳</span> Merkblatt: Präsens, Präteritum, Perfekt</h2>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-6 text-amber-900 text-[12pt] font-medium">Wir unterscheiden im Deutschen drei wichtige Zeiten:</p>
    <div class="space-y-5">
      <div class="bg-white p-4 rounded-lg border border-amber-200 shadow-sm">
        <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-amber-800 mb-1 text-[14pt]">1. Das Präsens (Die Gegenwart)</h3>
        <p contenteditable="true" suppresscontenteditablewarning="true" class="editable text-gray-700 mb-1">Wir benutzen es für Dinge, die genau jetzt passieren.</p>
        <p contenteditable="true" suppresscontenteditablewarning="true" class="editable text-gray-800 font-medium"><em>Beispiel: "Ich lerne für den Test."</em></p>
      </div>
      <div class="bg-white p-4 rounded-lg border border-amber-200 shadow-sm">
        <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-amber-800 mb-1 text-[14pt]">2. Das Präteritum (Die 1. Vergangenheit)</h3>
        <p contenteditable="true" suppresscontenteditablewarning="true" class="editable text-gray-700 mb-1">Man nennt es auch "Erzählzeit" (Bücher und Märchen).</p>
        <p contenteditable="true" suppresscontenteditablewarning="true" class="editable text-gray-800 font-medium"><em>Beispiel: "Ich lernte für den Test."</em></p>
      </div>
      <div class="bg-white p-4 rounded-lg border border-amber-200 shadow-sm">
        <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-amber-800 mb-1 text-[14pt]">3. Das Perfekt (Die 2. Vergangenheit)</h3>
        <p contenteditable="true" suppresscontenteditablewarning="true" class="editable text-gray-700 mb-1">Wir benutzen es meistens, wenn wir miteinander sprechen. <br>Hilfsverb (haben/sein) + Hauptverb mit ge-.</p>
        <p contenteditable="true" suppresscontenteditablewarning="true" class="editable text-gray-800 font-medium"><em>Beispiel: "Ich habe für den Test gelernt."</em></p>
      </div>
    </div>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm] space-y-8">
  <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold border-b-2 border-gray-800 pb-2">Teil 1: Die Zeiten erkennen</h2>
  <div class="avoid-break mb-10">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-2 text-amber-700">Aufgabe 17: In welcher Zeit steht der Satz?</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-4 text-gray-600">Lies die Sätze. Unterstreiche das Verb und kreuze an.</p>
    <table class="w-full border-collapse border border-gray-400">
      <thead><tr class="bg-gray-100"><th class="border p-3 text-left w-1/2">Satz</th><th class="border p-3">Präsens</th><th class="border p-3">Präteritum</th><th class="border p-3">Perfekt</th></tr></thead>
      <tbody>
        <tr><td class="border p-3" contenteditable="true" suppresscontenteditablewarning="true">Die Sonne scheint hell am Himmel.</td><td class="border p-3 text-center checkbox-cell cursor-pointer font-bold text-[12pt] hover:bg-gray-50"></td><td class="border p-3 text-center checkbox-cell cursor-pointer font-bold text-[12pt] hover:bg-gray-50"></td><td class="border p-3 text-center checkbox-cell cursor-pointer font-bold text-[12pt] hover:bg-gray-50"></td></tr>
        <tr><td class="border p-3" contenteditable="true" suppresscontenteditablewarning="true">Gestern fuhren wir mit dem Zug.</td><td class="border p-3 text-center checkbox-cell cursor-pointer font-bold text-[12pt] hover:bg-gray-50"></td><td class="border p-3 text-center checkbox-cell cursor-pointer font-bold text-[12pt] hover:bg-gray-50"></td><td class="border p-3 text-center checkbox-cell cursor-pointer font-bold text-[12pt] hover:bg-gray-50"></td></tr>
        <tr><td class="border p-3" contenteditable="true" suppresscontenteditablewarning="true">Wir haben eine tolle Sandburg gebaut.</td><td class="border p-3 text-center checkbox-cell cursor-pointer font-bold text-[12pt] hover:bg-gray-50"></td><td class="border p-3 text-center checkbox-cell cursor-pointer font-bold text-[12pt] hover:bg-gray-50"></td><td class="border p-3 text-center checkbox-cell cursor-pointer font-bold text-[12pt] hover:bg-gray-50"></td></tr>
        <tr><td class="border p-3" contenteditable="true" suppresscontenteditablewarning="true">Der Hund bellt den Briefträger an.</td><td class="border p-3 text-center checkbox-cell cursor-pointer font-bold text-[12pt] hover:bg-gray-50"></td><td class="border p-3 text-center checkbox-cell cursor-pointer font-bold text-[12pt] hover:bg-gray-50"></td><td class="border p-3 text-center checkbox-cell cursor-pointer font-bold text-[12pt] hover:bg-gray-50"></td></tr>
      </tbody>
    </table>
  </div>
  <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold border-b-2 border-gray-800 pb-2 mt-12">Teil 2: Sätze in eine andere Zeit setzen</h2>
  <div class="avoid-break mt-6">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-2 text-amber-700">Aufgabe 18: Vom Präsens ins Perfekt</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-4 text-gray-600">Die folgenden Sätze stehen im Präsens. Setze sie ins <strong>Perfekt</strong>.</p>
    <ul class="space-y-6">
      <li>
        <div contenteditable="true" suppresscontenteditablewarning="true" class="editable font-medium text-gray-800 mb-1">Ich spiele Fussball auf der Wiese.</div>
        <div class="flex items-baseline gap-2"><span class="text-amber-700 font-bold">Perfekt:</span><span contenteditable="true" suppresscontenteditablewarning="true" class="editable border-b border-gray-400 flex-grow inline-block text-gray-700 italic">Ich habe auf der Wiese Fussball gespielt.</span></div>
      </li>
      <li>
        <div contenteditable="true" suppresscontenteditablewarning="true" class="editable font-medium text-gray-800 mb-1">Tim rennt schnell zur Schule.</div>
        <div class="flex items-baseline gap-2"><span class="text-amber-700 font-bold">Perfekt:</span><span class="border-b border-gray-400 flex-grow inline-block h-6" contenteditable="true" suppresscontenteditablewarning="true"></span></div>
      </li>
      <li>
        <div contenteditable="true" suppresscontenteditablewarning="true" class="editable font-medium text-gray-800 mb-1">Wir backen einen Schokoladenkuchen.</div>
        <div class="flex items-baseline gap-2"><span class="text-amber-700 font-bold">Perfekt:</span><span class="border-b border-gray-400 flex-grow inline-block h-6" contenteditable="true" suppresscontenteditablewarning="true"></span></div>
      </li>
    </ul>
  </div>
</div>
<div class="page-break"></div>
<div class="p-[2cm]">
  <h2 contenteditable="true" suppresscontenteditablewarning="true" class="editable text-[20pt] font-bold border-b-2 border-gray-800 pb-2 mb-6">Teil 3: Die grosse Verben-Tabelle</h2>
  <div class="avoid-break mb-6">
    <h3 contenteditable="true" suppresscontenteditablewarning="true" class="editable font-bold text-[14pt] mb-2 text-amber-700">Aufgabe 19: Die drei Zeiten</h3>
    <p contenteditable="true" suppresscontenteditablewarning="true" class="editable mb-4 text-gray-600">Fülle die Tabelle aus. Achte auf die vorgegebene Person (ich, du, er...).</p>
    <table class="w-full border-collapse border border-gray-400 text-center mt-4">
      <thead><tr class="bg-gray-100"><th class="border p-3">Grundform</th><th class="border p-3">Präsens (er)</th><th class="border p-3">Präteritum (er)</th><th class="border p-3">Perfekt (er)</th></tr></thead>
      <tbody>
        <tr><td class="border p-3 font-medium" contenteditable="true" suppresscontenteditablewarning="true">lachen</td><td class="border p-3 italic" contenteditable="true" suppresscontenteditablewarning="true">er lacht</td><td class="border p-3 italic" contenteditable="true" suppresscontenteditablewarning="true">er lachte</td><td class="border p-3 italic" contenteditable="true" suppresscontenteditablewarning="true">er hat gelacht</td></tr>
        <tr><td class="border p-3 font-medium" contenteditable="true" suppresscontenteditablewarning="true">singen</td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td></tr>
        <tr><td class="border p-3 font-medium" contenteditable="true" suppresscontenteditablewarning="true">gehen</td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td></tr>
        <tr><td class="border p-3 font-medium" contenteditable="true" suppresscontenteditablewarning="true">trinken</td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td></tr>
        <tr><td class="border p-3 font-medium" contenteditable="true" suppresscontenteditablewarning="true">fallen</td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td><td class="border p-3 h-12" contenteditable="true" suppresscontenteditablewarning="true"></td></tr>
      </tbody>
    </table>
  </div>
</div>
`;

export interface ExerciseTemplate {
  id: string;
  name: string;
  html: string;
}

export const EXERCISE_TEMPLATES: ExerciseTemplate[] = [
  {
    id: "table",
    name: "Standard-Tabelle",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Lückentext</h3>
  <p class="editable text-gray-600 mb-3 italic" contenteditable="true">Setze die passenden Wörter ein: Baum, Haus, Katze, Sonne</p>
  <div class="leading-loose">
    <p class="editable" contenteditable="true">Das ist ein wunderschönes <span class="gap-line"><span class="is-answer">Haus</span></span>. Daneben steht ein alter, großer <span class="gap-line"><span class="is-answer">Baum</span></span> im Garten.</p>
  </div>
</div>`
  },
  {
    id: "anstreichen",
    name: "Text zum Anstreichen",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Textarbeit</h3>
  <p class="editable text-gray-600 mb-3" contenteditable="true">Übermale alle Verben (Tunwörter) im folgenden Text.</p>
  <div class="p-6 bg-gray-50 border border-gray-200 rounded-xl leading-loose">
    <p class="editable" contenteditable="true">Der Hund <span class="is-highlight-answer">rennt</span> schnell über die weite Wiese. Die kleine Katze <span class="is-highlight-answer">schläft</span> lieber gemütlich auf dem weichen Sofa.</p>
  </div>
</div>`
  },
  {
    id: "eindringling",
    name: "Wortfamilien-Eindringling",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Steckbrief</h3>
  <div class="border-2 border-gray-300 rounded-xl p-6 bg-white shadow-sm flex gap-6">
    <div class="w-1/3 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 min-h-[150px] text-gray-400 editable cursor-pointer hover:bg-gray-100 transition-colors image-placeholder-trigger" contenteditable="true">
      [Bild hier einfügen]
    </div>
    <div class="w-2/3 flex flex-col gap-4 justify-center">
      <div class="flex items-end border-b border-gray-400 pb-1">
        <span class="font-bold w-32 editable" contenteditable="true">Name:</span>
        <span class="flex-1 editable" contenteditable="true"><span class="is-answer text-blue-600">Rotfuchs</span></span>
      </div>
      <div class="flex items-end border-b border-gray-400 pb-1">
        <span class="font-bold w-32 editable" contenteditable="true">Lebensraum:</span>
        <span class="flex-1 editable" contenteditable="true"><span class="is-answer text-blue-600">Wälder, Wiesen, Städte</span></span>
      </div>
      <div class="flex items-end border-b border-gray-400 pb-1">
        <span class="font-bold w-32 editable" contenteditable="true">Nahrung:</span>
        <span class="flex-1 editable" contenteditable="true"><span class="is-answer text-blue-600">Mäuse, Beeren, Insekten</span></span>
      </div>
    </div>
  </div>
</div>`
  },
  {
    id: "matching",
    name: "Begriffs-Paare (Matching)",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Begriffe zuordnen</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Schreibe die richtige Nummer aus der linken Spalte in das Kästchen der rechten Spalte.</p>
  <div class="flex gap-8">
    <div class="w-1/2 flex flex-col gap-3">
      <div class="flex items-center gap-2"><span class="font-bold w-6">1.</span><span class="editable flex-1 p-2 bg-gray-50 border border-gray-200 rounded" contenteditable="true">Apfel</span></div>
      <div class="flex items-center gap-2"><span class="font-bold w-6">2.</span><span class="editable flex-1 p-2 bg-gray-50 border border-gray-200 rounded" contenteditable="true">Hund</span></div>
      <div class="flex items-center gap-2"><span class="font-bold w-6">3.</span><span class="editable flex-1 p-2 bg-gray-50 border border-gray-200 rounded" contenteditable="true">Auto</span></div>
    </div>
    <div class="w-1/2 flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 border-2 border-gray-400 rounded flex items-center justify-center font-bold editable" contenteditable="true"><span class="is-answer">3</span></div>
        <span class="editable flex-1 p-2 bg-gray-50 border border-gray-200 rounded" contenteditable="true">Fahrzeug</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 border-2 border-gray-400 rounded flex items-center justify-center font-bold editable" contenteditable="true"><span class="is-answer">1</span></div>
        <span class="editable flex-1 p-2 bg-gray-50 border border-gray-200 rounded" contenteditable="true">Frucht</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 border-2 border-gray-400 rounded flex items-center justify-center font-bold editable" contenteditable="true"><span class="is-answer">2</span></div>
        <span class="editable flex-1 p-2 bg-gray-50 border border-gray-200 rounded" contenteditable="true">Tier</span>
      </div>
    </div>
  </div>
</div>`
  },
  {
    id: "venn_diagramm",
    name: "Venn-Diagramm",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Bild beschriften</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Schreibe die passenden Begriffe auf die Linien.</p>
  <div class="flex flex-col items-center border-2 border-gray-100 rounded-xl p-6 bg-white shadow-sm">
    <div class="w-full max-w-md h-48 border-2 border-dashed border-gray-300 bg-gray-50 mb-6 flex items-center justify-center text-gray-400 editable cursor-pointer hover:bg-gray-100 transition-colors image-placeholder-trigger" contenteditable="true">
      [Bild hier einfügen]
    </div>
    <div class="grid grid-cols-2 gap-x-12 gap-y-4 w-full px-8">
       <div class="flex items-end gap-2"><span class="font-bold text-gray-500">1.</span> <span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer">Teil 1</span></span></div>
       <div class="flex items-end gap-2"><span class="font-bold text-gray-500">2.</span> <span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer">Teil 2</span></span></div>
       <div class="flex items-end gap-2"><span class="font-bold text-gray-500">3.</span> <span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer">Teil 3</span></span></div>
       <div class="flex items-end gap-2"><span class="font-bold text-gray-500">4.</span> <span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer">Teil 4</span></span></div>
    </div>
  </div>
</div>`
  },
  {
    id: "mindmap",
    name: "Mind-Map-Starter",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Mind-Map erstellen</h3>
  <p class="editable text-gray-600 mb-6" contenteditable="true">Sammle deine Ideen in den Ästen der Mind-Map.</p>
  
  <div class="relative h-[250px] w-full max-w-lg mx-auto flex items-center justify-center">
    <svg class="absolute inset-0 w-full h-full z-0" pointer-events="none">
      <line x1="50%" y1="50%" x2="25%" y2="20%" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
      <line x1="50%" y1="50%" x2="75%" y2="20%" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
      <line x1="50%" y1="50%" x2="25%" y2="80%" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
      <line x1="50%" y1="50%" x2="75%" y2="80%" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
    </svg>
    
    <div class="absolute z-20 w-36 h-20 bg-blue-50 border-2 border-blue-300 rounded-3xl flex items-center justify-center text-center font-bold editable shadow-sm text-blue-900" contenteditable="true">
      Hauptthema
    </div>
    
    <div class="absolute top-0 left-[5%] w-32 h-12 border-b-2 border-gray-400 flex items-end justify-center editable z-10" contenteditable="true"><span class="is-answer">Idee 1</span></div>
    <div class="absolute top-0 right-[5%] w-32 h-12 border-b-2 border-gray-400 flex items-end justify-center editable z-10" contenteditable="true"><span class="is-answer">Idee 2</span></div>
    <div class="absolute bottom-4 left-[5%] w-32 h-12 border-b-2 border-gray-400 flex items-end justify-center editable z-10" contenteditable="true"><span class="is-answer">Idee 3</span></div>
    <div class="absolute bottom-4 right-[5%] w-32 h-12 border-b-2 border-gray-400 flex items-end justify-center editable z-10" contenteditable="true"><span class="is-answer">Idee 4</span></div>
  </div>
</div>`
  },
  {
    id: "offene_frage",
    name: "Offene Frage (Schreiblinien)",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Wörter verwandeln</h3>
  <p class="editable text-gray-600 mb-4" contenteditable="true">Bilde Nomen mit den passenden Wortbausteinen <span class="font-bold">-keit, -heit, -ung, -nis</span>.</p>
  
  <div class="grid grid-cols-2 gap-x-16 gap-y-4 w-full">
    <div class="flex items-end gap-2"><span class="text-gray-400 font-bold">•</span><span class="editable min-w-[80px]" contenteditable="true">lesen</span><span>→</span><span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer">die Lesung</span></span></div>
    <div class="flex items-end gap-2"><span class="text-gray-400 font-bold">•</span><span class="editable min-w-[80px]" contenteditable="true">dunkel</span><span>→</span><span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer">die Dunkelheit</span></span></div>
    <div class="flex items-end gap-2"><span class="text-gray-400 font-bold">•</span><span class="editable min-w-[80px]" contenteditable="true">gesund</span><span>→</span><span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer">die Gesundheit</span></span></div>
    <div class="flex items-end gap-2"><span class="text-gray-400 font-bold">•</span><span class="editable min-w-[80px]" contenteditable="true">müde</span><span>→</span><span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer">die Müdigkeit</span></span></div>
    <div class="flex items-end gap-2"><span class="text-gray-400 font-bold">•</span><span class="editable min-w-[80px]" contenteditable="true">krank</span><span>→</span><span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer">die Krankheit</span></span></div>
    <div class="flex items-end gap-2"><span class="text-gray-400 font-bold">•</span><span class="editable min-w-[80px]" contenteditable="true">geheim</span><span>→</span><span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer">das Geheimnis</span></span></div>
  </div>
</div>`
  },
  {
    id: "rechenmauer",
    name: "Rechenmauer",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Stellenwerttafel</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Trage die Zahlen richtig in die Tafel ein.</p>
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
        <td class="border-2 border-gray-400 p-2 editable h-12" contenteditable="true"></td>
        <td class="border-2 border-gray-400 p-2 editable h-12" contenteditable="true"></td>
        <td class="border-2 border-gray-400 p-2 editable h-12" contenteditable="true"></td>
        <td class="border-2 border-gray-400 p-2 editable h-12" contenteditable="true"></td>
      </tr>
    </tbody>
  </table>
  <p class="text-[10px] text-gray-400 italic mt-2 no-print" contenteditable="true">Tipp: Klicke in eine Spalte und nutze den "Spalte löschen"-Button in der Toolbar, wenn du z.B. die Tausender (T) nicht brauchst.</p>
</div>`
  },
  {
    id: "rechengitter",
    name: "Gitter (Schriftliches Rechnen)",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-6 text-THEME-700" contenteditable="true">Aufgabe: Zahlenstrahl</h3>
  <p class="editable text-gray-900 mb-8" contenteditable="true">Trage die fehlenden Zahlen ein.</p>
  <div class="relative w-full h-1 bg-gray-800 mt-8 mb-12 flex justify-between">
    <div class="absolute -right-2 -top-1.5 w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-gray-800"></div>
    <div class="relative h-6 w-0.5 bg-gray-800 -mt-3"><div class="absolute top-8 left-1/2 -translate-x-1/2 editable text-center font-bold" contenteditable="true">0</div></div>
    <div class="relative h-4 w-0.5 bg-gray-800 -mt-2"></div>
    <div class="relative h-6 w-0.5 bg-gray-800 -mt-3"><div class="absolute top-8 left-1/2 -translate-x-1/2 editable text-center font-bold text-THEME-600" contenteditable="true"><span class="is-answer">10</span></div></div>
    <div class="relative h-4 w-0.5 bg-gray-800 -mt-2"></div>
    <div class="relative h-6 w-0.5 bg-gray-800 -mt-3"><div class="absolute top-8 left-1/2 -translate-x-1/2 editable text-center font-bold" contenteditable="true">20</div></div>
  </div>
</div>`
  },
  {
    id: "sachaufgabe",
    name: "Sachaufgabe (R-A-F)",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-6 text-THEME-700" contenteditable="true">Aufgabe: Ausführlicher Steckbrief</h3>
  <div class="flex gap-8">
    <div class="w-1/3 border-2 border-dashed border-gray-400 rounded-xl min-h-[180px] flex items-center justify-center text-gray-400 bg-gray-50 editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors" contenteditable="true">
      [Bild]
    </div>
    <div class="w-2/3 flex flex-col gap-4">
      <div>
        <span class="font-bold text-gray-900 editable uppercase tracking-wider text-sm" contenteditable="true">Name des Tieres:</span>
        <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Stockente</span></div>
      </div>
      <div>
        <span class="font-bold text-gray-900 editable uppercase tracking-wider text-sm" contenteditable="true">Aussehen & Größe:</span>
        <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Männchen haben einen grünen Kopf...</span></div>
      </div>
    </div>
  </div>
  <div class="mt-6 flex flex-col gap-6">
    <div>
      <span class="font-bold text-gray-900 editable uppercase tracking-wider text-sm" contenteditable="true">Lebensraum:</span>
      <div class="schreib-linie editable text-THEME-600 italic" contenteditable="true"><span class="is-answer">Seen, Flüsse, Teiche...</span></div>
    </div>
    <div>
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-6 text-THEME-700" contenteditable="true">Aufgabe: Experten-Interview</h3>
  <div class="flex gap-6 mb-6">
    <div class="w-1/2 border-b-2 border-gray-400 pb-1 flex items-end">
      <span class="font-bold text-gray-500 uppercase tracking-wider text-xs mr-3 editable" contenteditable="true">Interview-Partner:</span> 
      <span class="flex-1 editable font-bold text-lg text-THEME-600" contenteditable="true"><span class="is-answer italic">Herr Müller</span></span>
    </div>
    <div class="w-1/2 border-b-2 border-gray-400 pb-1 flex items-end">
      <span class="font-bold text-gray-500 uppercase tracking-wider text-xs mr-3 editable" contenteditable="true">Thema:</span> 
      <span class="flex-1 editable font-bold text-lg text-THEME-600" contenteditable="true"><span class="is-answer italic">Beruf Bäcker</span></span>
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Suchsel</h3>
  <p class="editable text-gray-900 mb-6" contenteditable="true">Finde die versteckten Wörter. Sie können von links nach rechts oder von oben nach unten gelesen werden.</p>
  <div class="flex gap-10">
    <table class="border-collapse border-4 border-gray-800 font-mono text-xl font-bold text-center uppercase bg-white">
      <tbody>
        <tr>
          <td class="border border-gray-300 w-10 h-10 editable" contenteditable="true">H</td>
          <td class="border border-gray-300 w-10 h-10 editable bg-THEME-100" contenteditable="true"><span class="is-answer text-THEME-800">B</span></td>
          <td class="border border-gray-300 w-10 h-10 editable bg-THEME-100" contenteditable="true"><span class="is-answer text-THEME-800">A</span></td>
          <td class="border border-gray-300 w-10 h-10 editable bg-THEME-100" contenteditable="true"><span class="is-answer text-THEME-800">U</span></td>
          <td class="border border-gray-300 w-10 h-10 editable bg-THEME-100" contenteditable="true"><span class="is-answer text-THEME-800">M</span></td>
        </tr>
        <tr>
          <td class="border border-gray-300 w-10 h-10 editable bg-THEME-100" contenteditable="true"><span class="is-answer text-THEME-800">E</span></td>
          <td class="border border-gray-300 w-10 h-10 editable" contenteditable="true">X</td>
          <td class="border border-gray-300 w-10 h-10 editable" contenteditable="true">L</td>
          <td class="border border-gray-300 w-10 h-10 editable" contenteditable="true">P</td>
          <td class="border border-gray-300 w-10 h-10 editable" contenteditable="true">Q</td>
        </tr>
        <tr>
          <td class="border border-gray-300 w-10 h-10 editable bg-THEME-100" contenteditable="true"><span class="is-answer text-THEME-800">I</span></td>
          <td class="border border-gray-300 w-10 h-10 editable" contenteditable="true">A</td>
          <td class="border border-gray-300 w-10 h-10 editable" contenteditable="true">S</td>
          <td class="border border-gray-300 w-10 h-10 editable" contenteditable="true">D</td>
          <td class="border border-gray-300 w-10 h-10 editable" contenteditable="true">F</td>
        </tr>
      </tbody>
    </table>
    <div class="flex-1 bg-gray-50 p-6 rounded-xl border border-gray-200">
      <h4 class="font-bold text-gray-900 mb-4 editable uppercase tracking-wider" contenteditable="true">Diese Wörter sind versteckt:</h4>
      <ul class="list-disc pl-5 editable text-gray-900 leading-loose text-lg font-bold" contenteditable="true">
        <li>BAUM</li>
        <li>EI</li>
      </ul>
    </div>
  </div>
</div>`
  },
  {
    id: "bild_beschriftung_multi",
    name: "Mehrere Bilder beschriften",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-2 text-THEME-700" contenteditable="true">Aufgabe: Bilder benennen</h3>
  <p class="editable text-gray-900 mb-6" contenteditable="true">Schreibe den passenden Begriff unter jedes Bild.</p>
  <div class="grid grid-cols-3 gap-8">
    <div class="flex flex-col items-center">
      <div class="w-full h-40 border-2 border-gray-300 rounded-xl mb-3 flex items-center justify-center text-gray-400 bg-white shadow-sm editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors" contenteditable="true">[Bild 1]</div>
      <div class="schreib-linie editable text-THEME-600 italic w-full text-center font-bold" contenteditable="true"><span class="is-answer">rennen</span></div>
    </div>
    <div class="flex flex-col items-center">
      <div class="w-full h-40 border-2 border-gray-300 rounded-xl mb-3 flex items-center justify-center text-gray-400 bg-white shadow-sm editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors" contenteditable="true">[Bild 2]</div>
      <div class="schreib-linie editable text-THEME-600 italic w-full text-center font-bold" contenteditable="true"><span class="is-answer">essen</span></div>
    </div>
    <div class="flex flex-col items-center">
      <div class="w-full h-40 border-2 border-gray-300 rounded-xl mb-3 flex items-center justify-center text-gray-400 bg-white shadow-sm editable image-placeholder-trigger cursor-pointer hover:bg-gray-100 transition-colors" contenteditable="true">[Bild 3]</div>
      <div class="schreib-linie editable text-THEME-600 italic w-full text-center font-bold" contenteditable="true"><span class="is-answer">springen</span></div>
    </div>
  </div>
</div>`
  },
  {
    id: "satz_transformator",
    name: "Satz-Transformator (mit Pfeil)",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
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
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Verben einsetzen</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Setze das Verb in der Klammer in der passenden Personalform ein.</p>
  <div class="leading-loose space-y-2">
    <p class="editable text-gray-900" contenteditable="true">
      Gestern <span class="gap-line min-w-[100px] inline-block text-center"><span class="is-answer text-THEME-600 italic">fiel</span></span> der Junge auf die Nase. (fallen)
    </p>
    <p class="editable text-gray-900" contenteditable="true">
      Wir <span class="gap-line min-w-[100px] inline-block text-center"><span class="is-answer text-THEME-600 italic">lachten</span></span> über den lustigen Witz. (lachen)
    </p>
  </div>
</div>`
  },
  {
    id: "konjugations_faecher",
    name: "Konjugations-Fächer",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Konjugieren</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Setze das Verb "singen" in alle Personalformen.</p>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 w-full max-w-lg">
    <div class="flex items-end gap-2 text-gray-900"><span class="w-20 font-bold editable" contenteditable="true">ich</span> <span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer text-THEME-600 italic">singe</span></span></div>
    <div class="flex items-end gap-2 text-gray-900"><span class="w-20 font-bold editable" contenteditable="true">wir</span> <span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer text-THEME-600 italic">singen</span></span></div>
    <div class="flex items-end gap-2 text-gray-900"><span class="w-20 font-bold editable" contenteditable="true">du</span> <span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer text-THEME-600 italic">singst</span></span></div>
    <div class="flex items-end gap-2 text-gray-900"><span class="w-20 font-bold editable" contenteditable="true">ihr</span> <span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer text-THEME-600 italic">singt</span></span></div>
    <div class="flex items-end gap-2 text-gray-900"><span class="w-20 font-bold editable" contenteditable="true">er/sie/es</span> <span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer text-THEME-600 italic">singt</span></span></div>
    <div class="flex items-end gap-2 text-gray-900"><span class="w-20 font-bold editable" contenteditable="true">sie</span> <span class="gap-line flex-1 editable" contenteditable="true"><span class="is-answer text-THEME-600 italic">singen</span></span></div>
  </div>
</div>`
  },
  {
    id: "korrektur_zeile",
    name: "Korrektur-Zeile (Fehler finden)",
    html: `<div class="avoid-break mb-8 mt-4 text-[12pt]">
  <h3 class="editable font-bold text-[14pt] mb-1 text-THEME-700" contenteditable="true">Aufgabe: Fehler reparieren</h3>
  <p class="editable text-gray-900 mb-4" contenteditable="true">Streiche das falsch gebildete Wort durch und schreibe es richtig auf die Linie.</p>
  <div class="space-y-4">
    <div class="flex items-end gap-4">
      <p class="editable text-gray-900 flex-1" contenteditable="true">Der Hund <span class="is-strikethrough-answer text-red-600">beisste</span> in den Knochen.</p>
      <span class="text-gray-500 font-bold">→</span>
      <div class="w-40 border-b border-gray-400 editable text-center leading-tight pb-1" contenteditable="true"><span class="is-answer text-THEME-600 italic">biss</span></div>
    </div>
    <div class="flex items-end gap-4">
      <p class="editable text-gray-900 flex-1" contenteditable="true">Gestern <span class="is-strikethrough-answer text-red-600">fallte</span> ich vom Stuhl.</p>
      <span class="text-gray-500 font-bold">→</span>
      <div class="w-40 border-b border-gray-400 editable text-center leading-tight pb-1" contenteditable="true"><span class="is-answer text-THEME-600 italic">fiel</span></div>
    </div>
  </div>
</div>`
  }
];

