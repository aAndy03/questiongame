/**
 * *What's new* — what changed for the people running a show (P12.10).
 *
 * Written for operators, not developers: what they can now do, what works
 * better, in plain words. Every release says the same things in every
 * language the app speaks; `whatsNew.test.ts` holds the languages together
 * and keeps developer words out. Settings and buttons are named the way
 * Studio shows them, which is in English.
 *
 * Newest release first. Add a release at the top when it ships.
 */

export const WHATS_NEW_LANGUAGES = ['en', 'ro'] as const
export type WhatsNewLanguage = (typeof WHATS_NEW_LANGUAGES)[number]

export const WHATS_NEW_LANGUAGE_NAME: Readonly<Record<WhatsNewLanguage, string>> = {
  en: 'English',
  ro: 'Română',
}

export interface WhatsNewNote {
  readonly title: string
  readonly body: string
}

export interface WhatsNewRelease {
  readonly version: string
  readonly notes: Readonly<Record<WhatsNewLanguage, readonly WhatsNewNote[]>>
  /** Built and never published (2.0.0-beta.7): shown to an update that spans it, never in the list of releases. */
  readonly unreleased?: true | undefined
}

export const WHATS_NEW: readonly WhatsNewRelease[] = [
  {
    version: '2.0.0-beta.11',
    notes: {
      en: [
        {
          title: 'Tips that teach as you go',
          body: 'Now and then, when it fits what you are doing, a short tip appears at the bottom right: make a domain before your first question, import many questions with the AI template, drag questions onto a domain, run a show from the keyboard. It draws keys and gestures as small badges, stays as long as it takes to read, waits while your pointer is on it, and opens the right page of Help if you want more. Nothing dims, nothing takes your keys.',
        },
        {
          title: 'Fewer as you learn',
          body: 'A new operator sees more tips, an experienced one hardly any. Each time you use something, its tips grow less likely, and something you use often stops being explained; leave it for months and a reminder can come back. Close a tip and it waits longer before it returns. There are no tips during a show, except a rehearsal.',
        },
        {
          title: 'Your choice',
          body: 'Settings ▸ Help & tips turns tips off, or starts them over as if you were new. Each operator has their own.',
        },
      ],
      ro: [
        {
          title: 'Sfaturi care te învață pe parcurs',
          body: 'Din când în când, când se potrivește cu ce faci, apare un sfat scurt în dreapta jos: fă un domeniu înainte de prima întrebare, importă multe întrebări cu șablonul pentru AI, trage întrebările pe un domeniu, condu un show de la tastatură. Arată tastele și gesturile ca insigne mici, stă cât îți trebuie să-l citești, așteaptă cât ții cursorul pe el și deschide pagina potrivită din Help dacă vrei mai mult. Nimic nu se întunecă, nimic nu-ți ia tastele.',
        },
        {
          title: 'Tot mai puține pe măsură ce înveți',
          body: 'Un operator nou vede mai multe sfaturi, unul cu experiență aproape deloc. De fiecare dată când folosești ceva, sfaturile despre el devin mai rare, iar ce folosești des nu mai e explicat; dacă nu-l folosești luni de zile, poate reveni o amintire. Un sfat închis așteaptă mai mult până revine. În timpul unui show nu apar sfaturi, cu excepția unei repetiții.',
        },
        {
          title: 'Alegerea ta',
          body: 'Settings ▸ Help & tips oprește sfaturile sau le ia de la capăt, ca pentru un începător. Fiecare operator le are pe ale lui.',
        },
      ],
    },
  },
  {
    version: '2.0.0-beta.10',
    // Built, never published on its own: it went out inside 2.0.0-beta.11.
    unreleased: true,
    notes: {
      en: [
        {
          title: 'Studio’s own title bar',
          body: 'Studio’s header is now the window’s title bar: drag it by any empty part, double-click it to maximize. On Windows, minimize, maximize and close sit at its right end; on a Mac the traffic lights stay where they are and Studio leaves them room. Prefer the system’s bar? Settings ▸ Window ▸ Use the system title bar, and it changes at once.',
        },
        {
          title: 'Stage goes where you send it',
          body: 'Stage now checks that it really landed on the display you chose, tries again once, and tells you if it could not. If you drag Stage, or Statistics, to another display yourself, Studio follows and remembers it. On a Mac, displays are called by their own names, a display that only mirrors another says so and how to make it a display of its own (AirPlay: Use as Separate Display), and Studio warns when Displays have separate Spaces is off. Still stuck? Settings ▸ Monitors ▸ Copy display report, and paste it into your bug report.',
        },
        {
          title: 'Close Stage',
          body: 'Open Stage is now a switch: Close Stage takes it down and the Play keeps going; the next Open Stage puts it back where it was. Stage closed some other way (Alt+F4, the taskbar, ⌘W) is noticed too, so Studio no longer thinks it is still open. Untick any display to take Stage off it: a mirror stops, the main one hands over to the next, and the last one closes Stage.',
        },
        {
          title: 'Updating from 1.x, explained',
          body: 'A library brought over from 1.x is told what happened before it is asked for anything: it was copied before anything changed, everything is still here, and what a workspace is for. Then one thing to do: name it, with My library already filled in, and rename it any time.',
        },
        {
          title: 'Pick up where you left off',
          body: 'With nothing loaded, Control lists the games you played or edited last, with when, and Load into Control on each. Go to Games is still there, under them.',
        },
        {
          title: 'Help, and F1',
          body: 'Help has its own place at the bottom of the sidebar, and F1 opens it from anywhere: how the game plays, preparing a show, the library, running a show, Stage and displays, and every shortcut and gesture, with a search over all of it. Settings ▸ Keyboard shortcuts now also lists the mouse and keyboard gestures that cannot be changed.',
        },
      ],
      ro: [
        {
          title: 'Bara de titlu a Studio',
          body: 'Antetul Studio este acum bara de titlu a ferestrei: o tragi de orice parte goală și, cu dublu clic, o maximizezi. Pe Windows, minimizarea, maximizarea și închiderea stau în capătul din dreapta; pe Mac, cele trei butoane colorate rămân unde sunt, iar Studio le lasă loc. Preferi bara sistemului? Settings ▸ Window ▸ Use the system title bar, și se schimbă pe loc.',
        },
        {
          title: 'Stage merge unde îl trimiți',
          body: 'Stage verifică acum că a ajuns chiar pe ecranul ales, mai încearcă o dată și îți spune dacă nu a reușit. Dacă tragi tu Stage sau Statistics pe alt ecran, Studio te urmează și ține minte. Pe Mac, ecranele apar cu numele lor, un ecran care doar oglindește altul spune asta și cum îl faci ecran separat (AirPlay: Use as Separate Display), iar Studio te avertizează când Displays have separate Spaces e oprit. Tot nu merge? Settings ▸ Monitors ▸ Copy display report și lipește-l în raportul de eroare.',
        },
        {
          title: 'Închide Stage',
          body: 'Open Stage e acum un comutator: Close Stage îl închide, iar Play-ul continuă; următorul Open Stage îl pune înapoi unde era. Și un Stage închis altfel (Alt+F4, bara de activități, ⌘W) e observat, așa că Studio nu mai crede că e încă deschis. Debifează orice ecran ca să scoți Stage de pe el: o oglindă se oprește, cel principal predă următorului, iar ultimul închide Stage.',
        },
        {
          title: 'Actualizarea de la 1.x, explicată',
          body: 'O bibliotecă adusă din 1.x află întâi ce s-a întâmplat: a fost copiată înainte de orice schimbare, totul e încă aici și la ce folosește un workspace. Apoi un singur lucru de făcut: să-i dai un nume, cu My library deja completat, pe care îl poți schimba oricând.',
        },
        {
          title: 'Continuă de unde ai rămas',
          body: 'Când nu e nimic încărcat, Control arată jocurile jucate sau editate ultima dată, cu momentul, și Load into Control pe fiecare. Go to Games e tot acolo, sub ele.',
        },
        {
          title: 'Help și F1',
          body: 'Help are locul lui jos în bara laterală, iar F1 îl deschide de oriunde: cum se joacă, pregătirea unui show, biblioteca, conducerea unui show, Stage și ecranele, plus fiecare scurtătură și gest, cu căutare în tot. Settings ▸ Keyboard shortcuts arată acum și gesturile de mouse și tastatură care nu se pot schimba.',
        },
      ],
    },
  },
  {
    version: '2.0.0-beta.9',
    notes: {
      en: [
        {
          title: 'Drag questions onto a domain',
          body: 'On Domains & Questions, drag a question, or the questions you ticked, onto a domain in the Domains pane to add them to it; hold Ctrl (⌘ on a Mac) as you let go to move them there instead, out of every other domain. As you drag, a small chip says how many domains they are in now, and with Ctrl how many the move will replace. Only a release right on a domain counts: let go anywhere else, or press Escape, and nothing changes. A short note says what was added, what was already there and what was left out. Add to domain… and Move to domain… in a question’s menu and in Edit… do the same from the keyboard.',
        },
        {
          title: 'See where the search hit',
          body: 'The words you search for are marked in the list, in the pickers and in the question opened beside the list. When a question is found by one of its answers or its explanation, its row shows them, marked, cut so the word you searched for is always in view.',
        },
        {
          title: 'Keep your place',
          body: 'As a long list scrolls, its column headings stay at the top and the group you are in stays under them, smaller; in grid view and in the pickers too. On a game’s Board, an open domain’s row stays at the top while its questions scroll, and lets go where the domain ends.',
        },
        {
          title: 'More room for the list',
          body: 'Lists run down to the bottom of the window, and their pages (1–50 of 1,022, the page size, the page links) sit in the status bar. Page subtitles are gone and the spacing is tighter. The Domains pane is narrower, with smaller rows and a smaller form, and only the domains scroll in it. The game status pill stays in the middle of the window.',
        },
        {
          title: 'Import, laid out wide',
          body: 'Import questions puts the file, where its rows go and what it holds in a column on the left, and its rows, or its text in a tab of its own, beside them, with the pages at the bottom. Copy template now explains the file to whoever fills it in, an AI assistant included: that the examples are not a pattern, that the right answer can stand anywhere, how to spread difficulties and what makes a question incomplete.',
        },
        {
          title: 'Displays at a glance',
          body: 'The displays in the status bar open a smaller window: the displays come first, with a tick for where Stage shows, on as many displays as you like, and one for where Statistics shows. To move Stage from one display to another, use the arrow beside a display. Opening Stage, Statistics and the Monitors settings are the small icons at the top.',
        },
        {
          title: 'Every release in What’s new',
          body: 'What’s new now lists every version, stable and beta, newest first. The newest is shown when it opens, any other is a click away, and the ones an update has just brought are marked New.',
        },
      ],
      ro: [
        {
          title: 'Trage întrebările pe un domeniu',
          body: 'În Domains & Questions, trage o întrebare, sau întrebările bifate, pe un domeniu din panoul Domains ca să le adaugi în el; ține apăsat Ctrl (⌘ pe Mac) când le lași ca să le muți acolo, scoase din toate celelalte domenii. În timp ce tragi, o etichetă mică spune în câte domenii sunt acum, iar cu Ctrl câte va înlocui mutarea. Contează doar o eliberare chiar pe un domeniu: dacă le lași în altă parte sau apeși Escape, nu se schimbă nimic. O notă scurtă spune ce s-a adăugat, ce era deja acolo și ce a rămas pe dinafară. Add to domain… și Move to domain… din meniul unei întrebări și din Edit… fac același lucru de la tastatură.',
        },
        {
          title: 'Vezi unde a găsit căutarea',
          body: 'Cuvintele căutate sunt marcate în listă, în ferestrele de alegere și în întrebarea deschisă lângă listă. Când o întrebare e găsită după un răspuns sau după explicație, rândul ei le arată, marcate, tăiate astfel încât cuvântul căutat să se vadă mereu.',
        },
        {
          title: 'Nu-ți pierzi locul',
          body: 'Când o listă lungă se derulează, titlurile coloanelor rămân sus, iar grupul în care ești rămâne sub ele, mai mic; la fel în grilă și în ferestrele de alegere. Pe Board-ul unui joc, rândul unui domeniu deschis rămâne sus cât timp i se derulează întrebările și se oprește unde se termină domeniul.',
        },
        {
          title: 'Mai mult loc pentru listă',
          body: 'Listele merg până jos în fereastră, iar paginile lor (1–50 of 1,022, mărimea paginii, linkurile de pagină) stau în bara de stare. Subtitlurile paginilor au dispărut, iar spațiile sunt mai strânse. Panoul Domains e mai îngust, cu rânduri și formular mai mici, și în el se derulează doar domeniile. Eticheta cu starea jocului rămâne în mijlocul ferestrei.',
        },
        {
          title: 'Import, pe toată lățimea',
          body: 'Import questions pune fișierul, unde merg rândurile și ce conține într-o coloană în stânga, iar rândurile, sau textul într-un tab separat, lângă ele, cu paginile jos. Copy template explică acum fișierul celui care îl completează, inclusiv unui asistent AI: că exemplele nu sunt un tipar, că răspunsul corect poate sta oriunde, cum să împartă dificultățile și ce face o întrebare incompletă.',
        },
        {
          title: 'Ecranele dintr-o privire',
          body: 'Ecranele din bara de stare deschid o fereastră mai mică: întâi ecranele, cu o bifă pentru unde apare Stage, pe câte ecrane vrei, și una pentru unde apare Statistics. Ca să muți Stage de pe un ecran pe altul, folosește săgeata de lângă ecran. Deschiderea Stage, Statistics și setările Monitors sunt iconițele mici de sus.',
        },
        {
          title: 'Toate versiunile în What’s new',
          body: 'What’s new arată acum fiecare versiune, stabilă și beta, de la cea mai nouă. La deschidere vezi cea mai nouă, oricare alta e la un clic distanță, iar cele aduse chiar de actualizare sunt marcate Nou.',
        },
      ],
    },
  },
  {
    version: '2.0.0-beta.8',
    notes: {
      en: [
        {
          title: 'Share questions',
          body: 'On Domains & Questions, Share in the selection bar or in a question’s menu copies the questions you picked as text, complete: every option and which are right, the difficulty, every domain, the tags and the explanation. Paste it into Import questions… in any library: a domain with the same name is joined, a missing one is created, and a question that is already there is not added twice.',
        },
        {
          title: 'A selection that stays',
          body: 'What you tick stays ticked when you search, filter, change page or pick another domain, so you can tick some, search, tick more and act on all of them. The bar says how many are selected and how many of them are on this page. Select all ticks or unticks what is in view, on every page; Clear empties the selection.',
        },
        {
          title: 'Shift and Ctrl',
          body: 'Shift+click ticks every row from the last one you ticked to the one you click, in table and grid view and in the pickers; Ctrl+click (⌘+click on a Mac) ticks a row without opening it. In the Domains pane, Ctrl+click and Shift+click pick several domains, and their questions are listed together.',
        },
        {
          title: 'A tidier toolbar and selection bar',
          body: 'The filters in force sit beside the Filters button as small chips, as many as there is room for, then +N, which opens Filters, where all of them are listed with Clear all. When the window is narrow, the search box shrinks first, then Filters, Sort and Group and the selection bar’s actions become their icons, with their names in a tooltip, instead of wrapping or scrolling. The Filters menu is more compact, and numbers line up everywhere.',
        },
      ],
      ro: [
        {
          title: 'Distribuie întrebări',
          body: 'În Domains & Questions, Share din bara de selecție sau din meniul unei întrebări copiază întrebările alese ca text, complet: fiecare variantă și care sunt corecte, dificultatea, toate domeniile, etichetele și explicația. Lipește-l în Import questions… în orice bibliotecă: un domeniu cu același nume e folosit, unul care lipsește e creat, iar o întrebare care există deja nu e adăugată a doua oară.',
        },
        {
          title: 'O selecție care rămâne',
          body: 'Ce bifezi rămâne bifat când cauți, filtrezi, schimbi pagina sau alegi alt domeniu, așa că poți bifa câteva, căuta, bifa altele și lucra cu toate deodată. Bara spune câte sunt selectate și câte dintre ele sunt pe pagina aceasta. Select all bifează sau debifează ce se vede, pe toate paginile; Clear golește selecția.',
        },
        {
          title: 'Shift și Ctrl',
          body: 'Shift+clic bifează toate rândurile de la ultimul bifat până la cel pe care dai clic, în tabel, în grilă și în ferestrele de alegere; Ctrl+clic (⌘+clic pe Mac) bifează un rând fără să-l deschidă. În panoul Domains, Ctrl+clic și Shift+clic aleg mai multe domenii, iar întrebările lor apar împreună.',
        },
        {
          title: 'O bară de unelte și o bară de selecție mai ordonate',
          body: 'Filtrele active stau lângă butonul Filters ca niște etichete mici, câte încap, apoi +N, care deschide Filters, unde le găsești pe toate, cu Clear all. Când fereastra e îngustă, întâi se micșorează căutarea, apoi Filters, Sort și Group și acțiunile din bara de selecție devin iconițe, cu numele lor la trecerea mouse-ului, în loc să treacă pe alt rând sau să se deruleze. Meniul Filters e mai compact, iar cifrele se aliniază peste tot.',
        },
      ],
    },
  },
  {
    version: '2.0.0-beta.7',
    unreleased: true,
    notes: {
      en: [
        {
          title: 'A smaller scale',
          body: 'Page titles, toolbars and every button are smaller, so lists and the Board get more of the window. Menus, dropdowns and their lists are tighter, the pagination strip is smaller and the Domains pane narrower. In the Dark theme a message in the corner is gray instead of black.',
        },
        {
          title: 'Health and notices in one place',
          body: 'Health and the latest notice are one button in the status bar. It opens a panel of a fixed size, so a long list scrolls inside it, with every notice compact and Clear all at the top.',
        },
        {
          title: 'Stage and Statistics on every display',
          body: 'The status bar draws your displays as small screens, marked where Stage and Statistics are. Press them to send Stage to a display, mirror it on another, move it, or show and close Statistics, from any page. Settings ▸ Monitors is the same picture: a map of where the displays stand and a row for each, with a Stage and a Statistics column. Pointing at a row lights its display on the map.',
        },
        {
          title: 'More room in Control',
          body: 'Mute, Reset layout and Control settings sit in the top bar beside the theme and the operator while Control is open, and Unload game is the ✕ beside the game’s name. The display pickers moved to the status bar, so the panels start right under the top bar.',
        },
        {
          title: 'Manage workspaces, like every list',
          body: 'Manage workspaces shows a grid or a table, and you can tick several to Archive, Restore or Move to workspace group… at once. The workspace you are in is never archived with them.',
        },
      ],
      ro: [
        {
          title: 'O scară mai mică',
          body: 'Titlurile paginilor, barele de unelte și toate butoanele sunt mai mici, așa că listele și Board-ul primesc mai mult din fereastră. Meniurile, listele derulante și ce deschid ele sunt mai strânse, banda de pagini e mai mică, iar panoul Domains mai îngust. În tema Dark, mesajul din colț e gri în loc de negru.',
        },
        {
          title: 'Starea și notificările într-un singur loc',
          body: 'Starea aplicației și ultima notificare sunt un singur buton în bara de stare. Deschide un panou de mărime fixă, în care o listă lungă se derulează, cu fiecare notificare compactă și Clear all sus.',
        },
        {
          title: 'Stage și Statistics pe orice ecran',
          body: 'Bara de stare îți desenează ecranele ca niște ecrane mici, marcate acolo unde sunt Stage și Statistics. Apasă pe ele ca să trimiți Stage pe un ecran, să-l oglindești pe altul, să-l muți sau să deschizi și să închizi Statistics, din orice pagină. Settings ▸ Monitors arată la fel: o hartă cu așezarea ecranelor și câte un rând pentru fiecare, cu o coloană Stage și una Statistics. Când treci peste un rând, ecranul lui se aprinde pe hartă.',
        },
        {
          title: 'Mai mult loc în Control',
          body: 'Cât timp Control e deschis, Mute, Reset layout și Control settings stau în bara de sus, lângă temă și operator, iar Unload game e ✕-ul de lângă numele jocului. Alegerea ecranelor s-a mutat în bara de stare, așa că panourile încep imediat sub bara de sus.',
        },
        {
          title: 'Manage workspaces, ca orice listă',
          body: 'Manage workspaces arată o grilă sau un tabel și poți bifa mai multe ca să le dai Archive, Restore sau Move to workspace group… deodată. Spațiul de lucru în care ești nu e arhivat niciodată odată cu ele.',
        },
      ],
    },
  },
  {
    version: '2.0.0-beta.6',
    notes: {
      en: [
        {
          title: 'Calmer pages that use the width',
          body: 'The Dark theme is dark gray instead of black, and the top bar, the sidebar and the status bar share the page’s colour with no lines between them. Editors put Cancel and Save at the top, beside the title, and a team’s preview, a question’s domains and question tags, or the operator’s PIN beside the form. Lists no longer jump when you open a row, tick one or change a filter, and a question’s difficulty reads as one pill, such as Easy · 20.',
        },
        {
          title: 'Menus in sections, and managers',
          body: 'A row’s menu groups its actions under names such as Copy and move, Status and Danger zone, and an action you cannot take says why. Question tags…, Domain groups… and Folders and game tags… open a manager that lists each one with its count and what it holds, to rename, merge, delete or Show in list. A game’s Folder and Game tags are set on the Game page, or for many games with Edit… on the Games list.',
        },
        {
          title: 'Import, row by row',
          body: 'Import questions lists the file’s rows with search, filters and sorts, duplicates and rejected rows first; tick a row to import it or leave it out, or open it beside the list to fix it, then Apply and next. Copy template gives a fuller example, with question tags, a multiple-answer question and an incomplete one.',
        },
        {
          title: 'The Board, Rules and Settings, easier to read',
          body: 'The Board shows a row per domain with its questions, difficulty span and points, and a big board opens with its domains closed, with Open all. Rules reads like Settings, in the same groups with the same controls, so a timer’s Duration is in seconds, and Settings lists its sections under On this page. Add teams…, Add domains… and Choose questions… take the window’s width and keep what you chose beside the list.',
        },
        {
          title: 'Drag to change the order',
          body: 'Drag a team on the Roster, a domain on the Board or a question’s option by its handle, and the others slide aside; the Roster’s arrows are gone. From the keyboard, Space picks a row up, the arrow keys move it, Space puts it down and Escape cancels.',
        },
        {
          title: 'Statistics, picture first',
          body: 'Live opens on tiles — Leading, Questions, Accuracy, Round, Fastest lock — then the teams ranked as on the Scoreboard, Score over turns, and charts By domain and By difficulty. All data sums up Plays, Turns, Accuracy and Points, draws the chart before the table, keeps its options under More options and shows the first 50 rows, with Show all.',
        },
      ],
      ro: [
        {
          title: 'Pagini mai liniștite, care folosesc lățimea',
          body: 'Tema Dark e gri închis în loc de negru, iar bara de sus, bara laterală și bara de stare au culoarea paginii, fără linii între ele. Editoarele pun Cancel și Save sus, lângă titlu, iar lângă formular previzualizarea unei echipe, domeniile și etichetele unei întrebări sau PIN-ul operatorului. Listele nu mai sar când deschizi un rând, bifezi unul sau schimbi un filtru, iar dificultatea unei întrebări se citește într-o singură etichetă, de pildă Easy · 20.',
        },
        {
          title: 'Meniuri pe secțiuni și ferestre de administrare',
          body: 'Meniul unui rând își grupează acțiunile sub nume precum Copy and move, Status și Danger zone, iar o acțiune pe care nu o poți face spune de ce. Question tags…, Domain groups… și Folders and game tags… deschid o fereastră care arată fiecare intrare cu numărul și conținutul ei, ca s-o redenumești, s-o unești cu alta, s-o ștergi sau s-o găsești cu Show in list. Folder și Game tags ale unui joc se pun din pagina jocului sau, pentru mai multe jocuri deodată, cu Edit… din lista Games.',
        },
        {
          title: 'Import rând cu rând',
          body: 'Import questions arată rândurile fișierului cu căutare, filtre și sortări, cu duplicatele și rândurile respinse la început; bifezi un rând ca să-l imporți sau îl lași deoparte, ori îl deschizi lângă listă ca să-l corectezi, apoi Apply and next. Copy template dă un exemplu mai bogat, cu etichete de întrebare, o întrebare cu mai multe răspunsuri și una neterminată.',
        },
        {
          title: 'Board, Rules și Settings mai ușor de citit',
          body: 'Board arată un rând pe domeniu, cu întrebările, intervalul de dificultate și punctele lui, iar un Board mare se deschide cu domeniile strânse și cu Open all. Rules se citește ca Settings, în aceleași grupuri și cu aceleași controale, așa că Duration a cronometrului e în secunde, iar Settings își arată secțiunile în On this page. Add teams…, Add domains… și Choose questions… folosesc lățimea ferestrei și țin ce ai ales lângă listă.',
        },
        {
          title: 'Tragi ca să schimbi ordinea',
          body: 'Tragi de mâner o echipă din Roster, un domeniu din Board sau o variantă de răspuns a unei întrebări, iar celelalte se dau la o parte; săgețile din Roster au dispărut. De la tastatură, Space ridică un rând, săgețile îl mută, Space îl așază și Escape renunță.',
        },
        {
          title: 'Statistics: întâi imaginea',
          body: 'Live începe cu casete — Leading, Questions, Accuracy, Round, Fastest lock — apoi echipele clasate ca pe Scoreboard, Score over turns și graficele By domain și By difficulty. All data adună Plays, Turns, Accuracy și Points, arată graficul înaintea tabelului, își ține opțiunile în More options și arată primele 50 de rânduri, cu Show all.',
        },
      ],
    },
  },
  {
    version: '2.0.0-beta.5',
    notes: {
      en: [
        {
          title: 'See where the copies are',
          body: 'A team, a question or a domain now shows the other workspaces that hold a copy of it, and Stop following its copies makes it a row of its own. A question also shows its tags and its domain group in each domain.',
        },
        {
          title: 'Duplicate here',
          body: 'Teams, domains and questions can be duplicated inside the same workspace, one or many at once. The duplicate is named “(copy)”, keeps the same domains and groups, and is not tied to the original.',
        },
        {
          title: 'Workspaces as a list',
          body: 'Manage workspaces can be searched, sorted and grouped like the other lists, and says what each workspace holds. Statistics names the workspace it counts, can group by workspace when All workspaces is on, and a team’s Plays count only this workspace’s games.',
        },
        {
          title: 'Clearer words, and a library check',
          body: 'Workspace groups and domain groups, question tags and game tags are now named apart. Health now says when the library holds a reference that points nowhere (Repair removes just that), when a game here would not load, and when a tag is spelled two ways.',
        },
      ],
      ro: [
        {
          title: 'Vezi unde sunt copiile',
          body: 'O echipă, o întrebare sau un domeniu arată acum celelalte spații de lucru care au o copie a lui, iar Stop following its copies îl face un rând de sine stătător. O întrebare își arată și etichetele și grupul din fiecare domeniu.',
        },
        {
          title: 'Duplicare aici',
          body: 'Echipele, domeniile și întrebările pot fi duplicate în același spațiu de lucru, una sau mai multe deodată. Duplicatul se numește „(copy)”, păstrează aceleași domenii și grupuri și nu e legat de original.',
        },
        {
          title: 'Spațiile de lucru ca listă',
          body: 'Manage workspaces poate fi căutat, sortat și grupat ca celelalte liste și spune ce conține fiecare spațiu de lucru. Statistics numește spațiul de lucru pe care îl numără, poate grupa după el când All workspaces e activ, iar Plays ale unei echipe numără doar jocurile din acest spațiu.',
        },
        {
          title: 'Cuvinte mai clare și o verificare a bibliotecii',
          body: 'Grupurile de spații de lucru și grupurile de domenii, etichetele întrebărilor și ale jocurilor au acum nume diferite. Health spune acum când biblioteca are o trimitere spre nimic (Repair o elimină doar pe ea), când un joc de aici nu s-ar încărca și când o etichetă e scrisă în două feluri.',
        },
      ],
    },
  },
  {
    version: '2.0.0-beta.4',
    notes: {
      en: [
        {
          title: 'Build a board in minutes',
          body: 'Add teams…, Add domains… and Choose questions… open a list you can search, filter by difficulty or tag, group by the domain’s groups and page through. Tick a group’s header to take all of it: one question per difficulty, unless the game allows repeats.',
        },
        {
          title: 'Difficulty in a dialog',
          body: 'Changing a question’s difficulty on the board opens a small dialog. Apply to original now offers to update the question’s copies too.',
        },
        {
          title: 'More from the Game page and the Games list',
          body: 'The Game page can duplicate, copy and move its game from More actions. The Games list has a bulk bar to archive, restore, copy or move several games; the game playing in Control is left as it is.',
        },
        {
          title: 'Clearer before Load',
          body: 'An archived team on a roster is marked, the Rules tab names any archived team, domain or question a game still uses, and Load says which one stops it, on the Roster. Plays are numbered Play 1, Play 2 and so on.',
        },
      ],
      ro: [
        {
          title: 'Un Board construit în câteva minute',
          body: 'Add teams…, Add domains… și Choose questions… deschid o listă în care poți căuta, filtra după dificultate sau etichetă, grupa după grupurile domeniului și răsfoi pe pagini. Bifează antetul unui grup ca să-l iei întreg: o întrebare pe dificultate, dacă jocul nu permite repetări.',
        },
        {
          title: 'Dificultatea într-o fereastră',
          body: 'Schimbarea dificultății unei întrebări din Board deschide o fereastră mică. Apply to original se oferă acum să actualizeze și copiile întrebării.',
        },
        {
          title: 'Mai mult din pagina jocului și din lista de jocuri',
          body: 'Pagina jocului poate duplica, copia și muta jocul din More actions. Lista Games are o bară pentru mai multe jocuri deodată: arhivare, restaurare, copiere sau mutare; jocul care rulează în Control rămâne neatins.',
        },
        {
          title: 'Mai limpede înainte de Load',
          body: 'O echipă arhivată din listă e marcată, fila Rules numește orice echipă, domeniu sau întrebare arhivată pe care jocul încă o folosește, iar Load spune, pe Roster, care anume îl oprește. Jocurile rulate sunt numerotate Play 1, Play 2 și așa mai departe.',
        },
      ],
    },
  },
  {
    version: '2.0.0-beta.3',
    notes: {
      en: [
        {
          title: 'A copied game always loads',
          body: 'Copying a game no longer reuses a question whose copy in the other workspace has a different difficulty or is unfinished: it copies that question fresh. Archived questions and teams arrive archived.',
        },
        {
          title: 'Import tells you where each question goes',
          body: 'The preview now names the domain each question lands in, new or existing, its tags, and which question a duplicate repeats. When two domains share a name, the oldest is used and the preview says so.',
        },
        {
          title: 'Saving a question is all or nothing',
          body: 'A question and its domains are saved together, so a refused domain never leaves half a save behind. Update copies is asked only when the question itself changed, not its domains.',
        },
        {
          title: 'Messages name things',
          body: 'When something cannot be archived or moved, questiongame names it and the games that use it, for one row or many. A name already used in the workspace is pointed out beside the field, and a team in a theme colour shows its swatch.',
        },
      ],
      ro: [
        {
          title: 'Un joc copiat se încarcă mereu',
          body: 'Când copiezi un joc, nu mai este refolosită o întrebare a cărei copie din celălalt spațiu de lucru are altă dificultate sau e neterminată: întrebarea e copiată din nou. Întrebările și echipele arhivate ajung arhivate.',
        },
        {
          title: 'Importul îți spune unde ajunge fiecare întrebare',
          body: 'Previzualizarea arată acum domeniul în care ajunge fiecare întrebare, nou sau existent, etichetele ei și ce întrebare repetă un duplicat. Când două domenii au același nume, este folosit cel mai vechi, iar previzualizarea o spune.',
        },
        {
          title: 'Salvarea unei întrebări e totul sau nimic',
          body: 'O întrebare și domeniile ei se salvează împreună, așa că un domeniu refuzat nu lasă în urmă o salvare pe jumătate. Actualizarea copiilor este cerută doar când s-a schimbat întrebarea, nu domeniile ei.',
        },
        {
          title: 'Mesajele numesc lucrurile',
          body: 'Când ceva nu poate fi arhivat sau mutat, questiongame îl numește, împreună cu jocurile care îl folosesc, pentru un rând sau mai multe. Un nume deja folosit în spațiul de lucru e semnalat lângă câmp, iar o echipă cu o culoare din temă își arată mostra.',
        },
      ],
    },
  },
  {
    version: '2.0.0-beta.2',
    notes: {
      en: [
        {
          title: 'No more shared library',
          body: 'A team, domain or question now lives in one workspace. What was shared is now a copy in each workspace that saw it, so nothing is missing, and the copies still know each other: change one and questiongame offers to update the others.',
        },
        {
          title: 'Copying a question brings its domain',
          body: 'Copy to… now puts a question in its domain in the other workspace: the copy already there, or a new one holding just the questions you copied. Turn off Bring their domains to copy the question alone.',
        },
        {
          title: 'Switching workspace starts clean',
          body: 'Screens, Statistics and the Back button no longer show anything from the workspace you left, and the Statistics window names the workspace it shows.',
        },
      ],
      ro: [
        {
          title: 'Nu mai există bibliotecă partajată',
          body: 'O echipă, un domeniu sau o întrebare stă acum într-un singur spațiu de lucru. Ce era partajat este acum o copie în fiecare spațiu care îl vedea, așa că nu lipsește nimic, iar copiile rămân legate între ele: schimbi una și questiongame se oferă să le actualizeze pe celelalte.',
        },
        {
          title: 'O întrebare copiată își aduce domeniul',
          body: 'Copy to… pune acum întrebarea în domeniul ei din celălalt spațiu de lucru: copia care e deja acolo sau una nouă, doar cu întrebările copiate. Oprește Bring their domains ca să copiezi doar întrebarea.',
        },
        {
          title: 'Schimbarea spațiului de lucru pornește curat',
          body: 'Screens, Statistics și butonul Back nu mai arată nimic din spațiul de lucru pe care l-ai părăsit, iar fereastra Statistics spune ce spațiu de lucru arată.',
        },
      ],
    },
  },
  {
    version: '2.0.0-beta.1',
    notes: {
      en: [
        {
          title: 'Workspaces',
          body: 'One questiongame can now hold several libraries — a season, a school, a club — each with its own teams, domains, questions and games. Pick one at the top of the sidebar. Everything you had is in your first workspace: give it a name and carry on.',
        },
        {
          title: 'A shared library',
          body: 'Make a team, domain or question shared and every workspace sees it. Where on Teams and on Domains & Questions shows this workspace’s rows or the shared ones, and a shared row says Shared.',
        },
        {
          title: 'Copy and move between workspaces',
          body: 'Copy to… and Move to… take a row, or a whole game, to another workspace with what it needs — a domain brings its questions, a game its teams and board. Before anything happens Studio says what comes along and, if something still uses a row, who.',
        },
        {
          title: 'Edit once, update the copies',
          body: 'When you save a team, domain or question that has copies in other workspaces, choose Save here only or Also update the copies. A copy the change would break on one of its boards is left alone, and Studio says why.',
        },
        {
          title: 'Groups, duplicates and a clean-up',
          body: 'Manage workspaces puts them in groups, renames, duplicates (without the Plays) and archives them. An archived workspace can be deleted for good; questiongame takes a backup first, and the one taken before workspaces is always kept.',
        },
        {
          title: 'Groups inside a domain',
          body: 'Open a domain and choose Groups… to make groups of your own — Romans, Medieval, Warm-ups — and put questions in them. A domain with groups opens grouped by them. Groups only organise: games and Plays ignore them.',
        },
        {
          title: 'Tags on questions',
          body: 'Give a question tags as you write it, in any domain. Find them with the Tag filter or by searching, see a list grouped by tag, and rename, merge or delete a tag everywhere from Manage tags….',
        },
        {
          title: 'Change many questions at once',
          body: 'Select questions and choose Edit… to tag or untag them, put them in a group, add them to a domain or take them out of one, or set their difficulty — Studio says how many will change before anything does.',
        },
      ],
      ro: [
        {
          title: 'Spații de lucru',
          body: 'Un singur questiongame poate ține acum mai multe biblioteci — un sezon, o școală, un club — fiecare cu echipele, domeniile, întrebările și jocurile ei. Alegi una sus, în bara laterală. Tot ce aveai e în primul tău spațiu de lucru: dă-i un nume și continuă.',
        },
        {
          title: 'O bibliotecă comună',
          body: 'Fă o echipă, un domeniu sau o întrebare comună și o vede fiecare spațiu de lucru. Where, în Teams și în Domains & Questions, arată rândurile acestui spațiu sau pe cele comune, iar un rând comun poartă eticheta Shared.',
        },
        {
          title: 'Copiezi și muți între spații de lucru',
          body: 'Copy to… și Move to… duc un rând, sau un joc întreg, în alt spațiu de lucru, cu tot ce îi trebuie — un domeniu își ia întrebările, un joc echipele și tabla. Înainte să se întâmple ceva, Studio îți spune ce vine odată cu el și, dacă un rând e încă folosit, de cine.',
        },
        {
          title: 'Modifici o dată, se actualizează și copiile',
          body: 'Când salvezi o echipă, un domeniu sau o întrebare care are copii în alte spații de lucru, alegi Save here only sau actualizezi și copiile. O copie pe care schimbarea ar strica-o pe una dintre tablele ei rămâne neatinsă, iar Studio îți spune de ce.',
        },
        {
          title: 'Grupuri, duplicate și curățenie',
          body: 'Manage workspaces le pune în grupuri, le redenumește, le duplică (fără partidele jucate) și le arhivează. Un spațiu arhivat poate fi șters definitiv; questiongame face mai întâi o copie de siguranță, iar cea făcută înainte de spațiile de lucru se păstrează mereu.',
        },
        {
          title: 'Grupuri într-un domeniu',
          body: 'Deschizi un domeniu și alegi Groups… ca să-ți faci grupurile tale — Romani, Ev Mediu, Încălzire — și pui întrebări în ele. Un domeniu cu grupuri se deschide grupat după ele. Grupurile doar organizează: jocurile și partidele nu țin cont de ele.',
        },
        {
          title: 'Etichete pe întrebări',
          body: 'Pui etichete unei întrebări când o scrii, în orice domeniu. Le găsești cu filtrul Tag sau căutând, vezi lista grupată pe etichete și redenumești, unești sau ștergi o etichetă peste tot din Manage tags….',
        },
        {
          title: 'Schimbi mai multe întrebări deodată',
          body: 'Selectezi întrebări și alegi Edit… ca să le pui sau să le scoți o etichetă, să le pui într-un grup, să le adaugi într-un domeniu sau să le scoți din el, ori să le stabilești dificultatea — Studio îți spune câte se vor schimba înainte să se schimbe ceva.',
        },
      ],
    },
  },
  {
    version: '1.1.1',
    notes: {
      en: [
        {
          title: 'Works in a smaller window',
          body: 'Below a window width of 1280 pixels, opening a team, question or operator now shows it over the list. At any width it now closes: with Close, with Escape, by clicking the same row again or by clicking an empty part of the list. Beside it, the list keeps the text readable.',
        },
        {
          title: 'Difficulty in a dialog',
          body: 'Changing a question’s difficulty on the Board opens a small dialog with This game only and Apply to original, instead of a browser prompt.',
        },
        {
          title: 'Small fixes',
          body: 'Plays are numbered Play 1, Play 2 and so on. A theme colour shows as its swatch, not as code. Saving a question saves its domains in the same step. A refusal says what is wrong in plain words, and dialog buttons stay inside the dialog.',
        },
        {
          title: 'Credits',
          body: 'Settings ▸ About and the installer now name the two co-founders of questiongame, Darius and Andy.',
        },
      ],
      ro: [
        {
          title: 'Merge și într-o fereastră mai mică',
          body: 'Sub o lățime de 1280 de pixeli, deschiderea unei echipe, întrebări sau a unui operator o arată acum peste listă. La orice lățime se închide acum: cu Close, cu Escape, cu un nou clic pe același rând sau cu un clic pe o parte goală a listei. Lângă ea, lista își păstrează textul lizibil.',
        },
        {
          title: 'Dificultatea într-o fereastră',
          body: 'Schimbarea dificultății unei întrebări din Board deschide o fereastră mică, cu This game only și Apply to original, în locul unei casete a browserului.',
        },
        {
          title: 'Mici reparații',
          body: 'Play-urile sunt numerotate Play 1, Play 2 și așa mai departe. O culoare din temă apare ca mostră, nu ca cod. Salvarea unei întrebări îi salvează și domeniile în același pas. Un refuz spune în cuvinte simple ce nu e în regulă, iar butoanele rămân în fereastră.',
        },
        {
          title: 'Mulțumiri',
          body: 'Settings ▸ About și programul de instalare numesc acum cei doi cofondatori ai questiongame, Darius și Andy.',
        },
      ],
    },
  },
  {
    version: '1.1.0',
    notes: {
      en: [
        {
          title: 'Find questions faster',
          body: 'Every list now has Filters. On Domains & Questions, show only the hard ones, only multiple answers, only the incomplete ones, or only some domains — the filters in force sit under the toolbar, and each can be removed with one click.',
        },
        {
          title: 'Choose the order',
          body: 'Sort any list by name, difficulty, plays, when it changed and more. In table view, click a column’s title to sort by it, and click again to turn the order around.',
        },
        {
          title: 'See them by domain or by difficulty',
          body: 'Group breaks a list into sections with a title and a count — questions by domain, difficulty or completeness, games by folder or status, teams by whether they have played.',
        },
        {
          title: 'A page at a time',
          body: 'Long lists show 100 rows a page, or 50, 250 or all of them. Open a question and come back: you are on the same page, with the same filters.',
        },
        {
          title: 'Archive or restore many at once',
          body: 'Show Active, Archived or All. Select a page, or every matching row on every page, and archive or restore them together — Studio says how many are on this page and how many in all. Search now finds every match, however many there are.',
        },
      ],
      ro: [
        {
          title: 'Găsești întrebările mai repede',
          body: 'Fiecare listă are acum Filters. În Domains & Questions poți afișa doar întrebările grele, doar cele cu mai multe răspunsuri, doar cele neterminate sau doar câteva domenii — filtrele active stau sub bara de unelte și fiecare se scoate cu un clic.',
        },
        {
          title: 'Alegi ordinea',
          body: 'Poți ordona orice listă după nume, dificultate, partide jucate, data modificării și altele. În vizualizarea tabel, apasă pe titlul unei coloane ca să ordonezi după ea, și încă o dată ca să inversezi ordinea.',
        },
        {
          title: 'Le vezi pe domenii sau pe dificultate',
          body: 'Group împarte o listă în secțiuni cu titlu și număr — întrebările pe domenii, dificultate sau completitudine, jocurile pe dosare sau stare, echipele după dacă au jucat.',
        },
        {
          title: 'O pagină odată',
          body: 'Listele lungi arată 100 de rânduri pe pagină — sau 50, 250 sau toate. Deschizi o întrebare și te întorci: ești pe aceeași pagină, cu aceleași filtre.',
        },
        {
          title: 'Arhivezi sau restaurezi mai multe deodată',
          body: 'Alege Active, Archived sau All. Selectează o pagină sau toate rândurile potrivite din toate paginile și arhivează-le ori restaurează-le împreună — Studio îți spune câte sunt pe pagina aceasta și câte în total. Căutarea găsește acum toate potrivirile, oricâte ar fi.',
        },
      ],
    },
  },
  {
    version: '1.0.2',
    notes: {
      en: [
        {
          title: 'More than one question at the same difficulty',
          body: 'In a game’s Board, turn on “Allow repeated difficulties”. A domain can then hold several questions at the same level. They are asked one after another and are worth the same points.',
        },
        {
          title: 'Clearer when a game can’t be loaded',
          body: 'If something on the Board stops a game from loading, questiongame now tells you straight away, wherever you are, and “Show” takes you to the problem. The Board is marked in red until it is fixed.',
        },
        {
          title: 'Know when a new version is out',
          body: 'When it starts, questiongame checks once whether a newer version is available and lets you know. You can also check yourself, or turn this off, in Settings ▸ About.',
        },
        {
          title: 'Your library is kept safe when you update',
          body: 'Before a new version changes anything, your teams, questions and games are copied to a backup. To update, simply install the new version over this one — there is no need to uninstall first.',
        },
        {
          title: 'Smoother and up to date',
          body: 'Everything questiongame is built on has been brought up to date, so it runs smoothly and safely.',
        },
      ],
      ro: [
        {
          title: 'Mai multe întrebări de aceeași dificultate',
          body: 'În Board-ul unui joc, activează „Allow repeated difficulties”. Un domeniu poate avea atunci mai multe întrebări de același nivel. Sunt puse una după alta și valorează la fel de multe puncte.',
        },
        {
          title: 'Mai clar când un joc nu se poate încărca',
          body: 'Dacă ceva din Board împiedică încărcarea unui joc, questiongame îți spune imediat, oriunde te-ai afla, iar „Show” te duce direct la problemă. Board rămâne marcat cu roșu până când e rezolvat.',
        },
        {
          title: 'Afli când apare o versiune nouă',
          body: 'La pornire, questiongame verifică o dată dacă există o versiune mai nouă și te anunță. Poți verifica și singur, sau poți opri verificarea, din Settings ▸ About.',
        },
        {
          title: 'Biblioteca ta e în siguranță la actualizare',
          body: 'Înainte ca o versiune nouă să schimbe ceva, echipele, întrebările și jocurile tale sunt copiate într-o copie de siguranță. Ca să actualizezi, instalează pur și simplu versiunea nouă peste aceasta — nu e nevoie să o dezinstalezi.',
        },
        {
          title: 'Mai fluid și la zi',
          body: 'Tot ce stă la baza questiongame a fost adus la zi, ca aplicația să meargă fluid și sigur.',
        },
      ],
    },
  },
]

export const WHATS_NEW_COPY: Readonly<
  Record<WhatsNewLanguage, { title: (version: string) => string; close: string; language: string; releases: string; fresh: string; beta: string; option: (version: string, fresh: boolean) => string }>
> = {
  en: { title: (version) => `What’s new in questiongame ${version}`, close: 'Got it', language: 'Language', releases: 'Releases', fresh: 'New', beta: 'Beta', option: (version, fresh) => (fresh ? `${version}, new` : version) },
  ro: { title: (version) => `Ce e nou în questiongame ${version}`, close: 'Am înțeles', language: 'Limba', releases: 'Versiuni', fresh: 'Nou', beta: 'Beta', option: (version, fresh) => (fresh ? `${version}, nou` : version) },
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

/**
 * SemVer 2.0 precedence: `1.0.10` after `1.0.9`, `2.0.0-beta.2` before
 * `2.0.0-beta.10`, and a prerelease before its release. Build metadata is
 * ignored. Something that is not a version sorts below every version and
 * never throws — a bad entry must not take the window down.
 */
export function compareVersions(a: string, b: string): number {
  const pa = SEMVER.exec(a)
  const pb = SEMVER.exec(b)
  if (pa === null || pb === null) return (pa === null ? 0 : 1) - (pb === null ? 0 : 1)
  for (let i = 1; i <= 3; i++) {
    const d = Number(pa[i]) - Number(pb[i])
    if (d !== 0) return d
  }
  const preA = pa[4]
  const preB = pb[4]
  if (preA === undefined || preB === undefined) return (preA === undefined ? 1 : 0) - (preB === undefined ? 1 : 0)
  const ia = preA.split('.')
  const ib = preB.split('.')
  for (let i = 0; i < Math.max(ia.length, ib.length); i++) {
    const x = ia[i]
    const y = ib[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    const nx = /^\d+$/.test(x)
    const ny = /^\d+$/.test(y)
    if (nx && ny) {
      const d = Number(x) - Number(y)
      if (d !== 0) return d
    } else if (nx !== ny) {
      return nx ? -1 : 1
    } else if (x !== y) {
      return x < y ? -1 : 1
    }
  }
  return 0
}

/**
 * The releases newer than `since` and no newer than `current`, newest first.
 * Someone on a stable version is never shown a beta's notes: the stable
 * release that follows them summarises them (review, P13.1).
 */
export function notesAfter(since: string, current: string, releases: readonly WhatsNewRelease[] = WHATS_NEW): WhatsNewRelease[] {
  const onStable = !since.includes('-') && !current.includes('-')
  return releases
    .filter((r) => !(onStable && r.version.includes('-')))
    .filter((r) => compareVersions(r.version, since) > 0 && compareVersions(r.version, current) <= 0)
    .sort((a, b) => compareVersions(b.version, a.version))
}
