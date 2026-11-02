# MESLite — strona internetowa, etap 3 (animacja odsłaniania SVG)

Kompletna, samodzielna wersja strony MESLite obejmująca **zatwierdzony układ i treść etapu 1**, **generator geometrii SVG z etapu 2** i **animację tła z etapu 3**. Generator i wygląd wzoru pozostały bez zmian względem etapu 2; dostrajanie jego estetyki zostało świadomie odłożone.

Projekt jest statyczny: HTML5, CSS, SVG i zwykły JavaScript, bez npm, bundlera, bibliotek i backendu.

## Uruchomienie w VS Code

1. Rozpakuj ZIP i otwórz folder `meslite-etap-3` w Visual Studio Code.
2. Uruchom `index.html` przez rozszerzenie **Live Server** (Open with Live Server).
3. Przewijaj stronę w dół i w górę, obserwując odsłanianie lub ukrywanie wzoru.

Alternatywnie uruchom dowolny serwer statyczny, np. w katalogu projektu: `python -m http.server 8000`, a następnie otwórz `http://localhost:8000/`. Przy bezpośrednim otwieraniu przez `file://` osobny plik z ikonami SVG może być blokowany przez przeglądarkę — zalecany jest serwer statyczny.

## Struktura plików

```text
meslite-etap-3/
├── index.html                 # Wszystkie 6 sekcji, treść, skrypty i kontenery SVG
├── style.css                  # Zatwierdzony layout, kolory, typografia i responsywność
├── config.js                  # Seed, parametry generatora i animacji
├── background-generator.js   # Deterministyczne SVG i jego regeneracja po zmianie rozmiaru
├── background-animation.js   # Granica odsłaniania, maski SVG, scroll i RAF
├── assets/
│   ├── meslite-mark.svg       # Roboczy symbol logo z ulotki
│   └── icons.svg              # Liniowe ikony
└── README.md
```

## Mechanizm animacji

- Generator najpierw tworzy **całą, gotową geometrię** każdej sekcji, nie animuje ścieżek ani nie zmienia ich rozmieszczenia podczas przewijania.
- Dla wszystkich sekcji obowiązuje **jedna granica odsłaniania w współrzędnych całego dokumentu**: `scrollY + viewportHeight - revealOffsetPx`. Każde SVG otrzymuje lokalne położenie tej samej granicy.
- Maski SVG mają płynny pionowy gradient od pełnej widoczności do zera; kolor tła sekcji nie jest maskowany ani animowany.
- Scroll w dół: globalna granica płynnie zmierza do celu z bezwładnością opartą na czasie (`requestAnimationFrame`, interpolacja wykładnicza); nie ma stałego opóźnienia-timera.
- Scroll w górę: granica jest ograniczana natychmiast za pomocą `Math.min(currentRevealY, targetRevealY)`. Nie może wtedy przypadkowo przesunąć się w dół i odsłonić dodatkowego wzoru.
- Na start, przy odświeżeniu i powrocie do strony przyjmowana jest bieżąca pozycja przewijania. Zmiana rozmiaru okna aktualizuje lokalne maski; podmienione SVG po regeneracji automatycznie otrzymują nową maskę.
- `prefers-reduced-motion: reduce` pokazuje **cały statyczny wzór** i nie prowadzi animacji. Zmiana tego ustawienia podczas oglądania strony jest obsługiwana.
- Bez JavaScriptu wszystkie teksty, nawigacja i kolory sekcji nadal działają; nie jest wtedy wyświetlane dekoracyjne SVG.

## Strojenie animacji — `config.js`

W sekcji `animation` znajdują się trzy niezależne parametry (startowe wartości są propozycją do oceny, nie zatwierdzonym finalnym efektem):

| Parametr | Wartość startowa | Znaczenie |
| --- | ---: | --- |
| `revealOffsetPx` | `100` | Ile pikseli ponad dolną krawędzią okna znajduje się docelowa granica odsłaniania. |
| `revealLagMs` | `150` | Stała czasowa wygładzania podczas przewijania w dół; `0` usuwa bezwładność. |
| `revealFadePx` | `30` | Wysokość półprzezroczystej strefy przejścia do niewidoczności. |

Jeśli chcesz zmieniać **sam wzór**, nadal służą do tego dotychczasowe ustawienia `grid`, `seed` oraz `palette.dark` / `palette.light` w `config.js`:

| Parametr | Funkcja |
| --- | --- |
| `seed` | Deterministyczny wybór kompozycji. |
| `grid.desktop` / `grid.mobile`, `mobileBelowPx` | Odstępy siatki, skala, strefy boczne i gęstość. |
| `grid.branchProbability`, `grayGroupProbability`, `accentGroupProbability` | Grupy i wyróżnienia segmentów. |
| `grid.nodeProbability`, `accentNodeProbability` | Kropki w wybranych węzłach. |
| `palette.dark` / `palette.light` | Barwy, grubości, krycie linii i rozmiary punktów. |

Kolory **pełnych powierzchni sekcji** nadal definiuje `style.css` (`--color-dark`, `--color-light`).

## Testy wykonane w etapie 3

Automatycznie przetestowano rzeczywisty HTML/CSS/JS/SVG w Chromium, w izolowanym dokumencie przeglądarki (z plikami CSS i JS wstrzykniętymi bezpośrednio, ponieważ środowisko testowe blokowało nawigację na adres lokalnego serwera):

- sześć niezależnych SVG i masek, wspólna granica we współrzędnych dokumentu;
- identyczność geometrii segmentów i liczby kropek względem etapu 2;
- opóźnienie i doganianie granicy podczas scrolla w dół;
- natychmiastowe cofanie po scrollu w górę, także przy zmianie kierunku w trakcie bezwładności;
- regeneracja SVG i ponowne podpięcie maski po zmianie wysokości sekcji;
- inicjalizacja granicy po zdarzeniu `pageshow` przy przewiniętej pozycji;
- aktualizacja po zmianie szerokości i wysokości viewportu;
- włączenie/wyłączenie `prefers-reduced-motion` w trakcie działania;
- układ i maski na szerokościach **280, 320, 375, 390, 560, 699, 700, 768, 900, 1024, 1440 i 1920 px**, bez poziomego przewijania i błędów JavaScriptu;
- czytelność treści po wyłączeniu JS.

**Pozostaje do ręcznego sprawdzenia** w zwykłej przeglądarce uruchomionej przez Live Server: subiektywna płynność efektu podczas scrollowania myszą i dotykiem, wejście przez kotwicę `#kontakt` przy pierwszym załadowaniu, odświeżenie strony na różnych pozycjach oraz dłuższe korzystanie na rzeczywistym urządzeniu mobilnym. Test izolowanego dokumentu obejmował logikę przywrócenia pozycji (`pageshow`), ale nie rzeczywistą nawigację HTTP do kotwicy.

## Świadomie odłożone i niezmienione elementy

- **Wzór dekoracji jest celowo niedopracowany** — pozostaje dokładnie ten z zatwierdzonego tymczasowo etapu 2. Można go później dostroić bez przepisywania animacji.
- Brak ukośnych połączeń, kwadratowych węzłów, bitmap, animacji poszczególnych ścieżek oraz ciągłości siatki pomiędzy sekcjami.
- Symbol logo pozostaje roboczą, uproszczoną wersją wektorową na podstawie ulotki.
- Etap 4 — końcowa integracja, pełne testy i wersja publikacyjna — **nie został rozpoczęty**.
