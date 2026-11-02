# MESLite — strona internetowa, etap 3 (generator SVG i animacja)

Aktualna wersja strony zawiera:

- zatwierdzoną strukturę, teksty i wygląd z etapu 1;
- proceduralnie generowaną dekorację SVG z etapu 2;
- animację odsłaniania dekoracji podczas przewijania z etapu 3.

**Stan prac:** etap 3. Wygląd samej siatki pozostaje wersją roboczą przeznaczoną do dalszego dostrajania. Animacja została zaakceptowana. Etap 4 nie został rozpoczęty.

Projekt jest statyczny: HTML, CSS, SVG i JavaScript bez bibliotek, npm, bundlera ani backendu.

## 1. Uruchomienie

1. Rozpakuj archiwum projektu i otwórz folder `meslite-etap-3` w Visual Studio Code.
2. Uruchom `index.html` przez rozszerzenie **Live Server** (opcja **Open with Live Server**).
3. Przewijaj stronę, aby sprawdzić odsłanianie dekoracji.

Możesz również uruchomić serwer statyczny w folderze projektu:

```bash
python -m http.server 8000
```

Następnie otwórz `http://localhost:8000/`.

Nie zaleca się otwierania `index.html` bezpośrednio przez `file://`, ponieważ przeglądarka może zablokować odwołania do osobnego pliku z ikonami SVG.

## 2. Struktura plików

```text
meslite-etap-3/
├── index.html                 # Sześć sekcji, treści, nawigacja, miejsca na SVG
├── style.css                  # Układ strony, typografia, barwy sekcji, responsywność
├── config.js                  # Wszystkie dostępne ustawienia generatora i animacji
├── background-generator.js   # Generowanie geometrii oraz reagowanie na rozmiar sekcji
├── background-animation.js   # Maska SVG i zachowanie przy przewijaniu
├── assets/
│   ├── logo.webp              # logo MESLite
│   └── icons.svg              # Ikony liniowe
└── README.md
```

Zmiany wyglądu dekoracji wykonuje się zasadniczo w `config.js`. Nie trzeba modyfikować JavaScriptu generatora, aby zmienić liczbę ścieżek, odstępy siatki, proporcje akcentów ani kolory.

## 3. Jak działa dekoracja

Dla **każdej sekcji strony** generator tworzy osobny SVG o wymiarach odpowiadających rzeczywistej szerokości i wysokości sekcji.

1. Tworzy nieregularną siatkę współrzędnych: odstępy między kolejnymi pionowymi i poziomymi liniami są losowane z zadanych zakresów.
2. Dzieli sekcję na poziome **pasy logiczne** o wysokości określonej przez `bandHeight`. W każdym pasie osobno buduje grupy połączeń **przy lewej i prawej krawędzi**.
3. Rysuje tylko wybrane połączone fragmenty siatki, zamiast wypełniać całą sekcję kratką.
4. Większość odcinków pozostaje delikatnie szara (`subtle`). Wybrane fragmenty są wzmacniane szarością (`strong`), a nieliczne są pomarańczowe (`accent`). Wszystkie trzy poziomy korzystają z tej samej geometrii siatki.
5. Dodaje okrągłe punkty przy części połączeń. Geometria jest zdeterminowana przez seed, wymiary sekcji i ustawienia.

Animacja nie generuje nowych linii podczas przewijania: **cały wzór istnieje od początku**, a maska SVG odsłania lub ukrywa go pionowo.

### Ważne rozróżnienie: trzy sposoby zmiany wyglądu

- **Drobniejsza siatka:** zmniejsz `minGapX`, `maxGapX`, `minGapY`, `maxGapY`. Oczka będą mniejsze, ale samo to nie gwarantuje proporcjonalnie większej liczby widocznych odcinków.
- **Więcej widocznych połączeń:** zwiększ `pathsPerBand` lub zmniejsz `bandHeight`. To najlepszy punkt wyjścia do delikatnego zagęszczenia wzoru bez zmiany rozmiaru oczek.
- **Więcej mocnych/pomarańczowych elementów:** zwiększ `grayGroupProbability` / `accentGroupProbability`. Zmieni to głównie **udział wyróżnionych** fragmentów, a nie ogólną liczbę linii.

## 4. Desktop a mobile — kiedy obowiązuje który wariant?

**Generator SVG i responsywny układ CSS mają różne progi.** To dwa niezależne mechanizmy.

### 4.1. Próg generatora SVG

Decyduje `grid.mobileBelowPx: 700` w `config.js`.

| Szerokość sekcji | Wariant generatora | Parametry geometrii |
| --- | --- | --- |
| **Mniej niż 700 px** (np. 390, 699 px) | `mobile` | `grid.mobile` |
| **700 px i więcej** (np. 700, 768, 1440 px) | `desktop` | `grid.desktop` |

**Uwaga:** porównywana jest szerokość *sekcji strony* w **pikselach CSS**, mierzona przez JavaScript, a nie liczba fizycznych pikseli ekranu czy sama nazwa urządzenia. W aktualnym projekcie sekcje zajmują całą szerokość okna, więc zwykle odpowiada to szerokości obszaru przeglądarki. Na wartość mogą wpływać np. szerokość okna i zoom.

Po zmianie szerokości sekcji generator ponownie wyznacza geometrię. Po przekroczeniu progu 700 px zmienia nie tylko ustawienia odstępów, lecz także kilka wbudowanych reguł:

| Cecha | Desktop (`>= 700 px`) | Mobile (`< 700 px`) |
| --- | --- | --- |
| Odstępy pionowych linii (`minGapX`–`maxGapX`) | 61–108 px | 48–80 px |
| Odstępy poziomych linii (`minGapY`–`maxGapY`) | 55–103 px | 55–93 px |
| Wysokość pasa (`bandHeight`) | 330 px | 350 px |
| Szerokość stref bocznych (`sideZone`) | 33% szerokości | 30% szerokości |
| Dodatkowe ścieżki w pasie na stronę (`pathsPerBand`) | 2 | 1 |
| Maksymalna liczba głównych odnóg (`extraBranches`) | 2 | 1 |
| Maksymalny ciąg rdzenia / głównej odnogi (`maxRun`) | 4 segmenty | 3 segmenty |
| Dodatkowe delikatne grupy „torów” na pas i stronę | 3 | 1 |
| Szansa na grupę pomarańczowych segmentów | `0.66` = 66% | `0.66 × 0.45` ≈ 29,7% |
| Maksymalna długość pojedynczego pomarańczowego wyróżnienia | 4 segmenty | 2 segmenty |

Ostatnie trzy różnice są obecnie zapisane w **logice generatora**, a nie jako osobne parametry w `config.js`. Oznacza to, że mobile ma mniej dekoracji mimo nieco mniejszych odstępów między liniami siatki.

### 4.2. Osobne progi układu strony w CSS

| Szerokość okna | Co zmienia `style.css` |
| --- | --- |
| **Powyżej 1000 px** | Podstawowy układ desktopowy. |
| **1000 px i mniej** | Zmniejszane są wybrane szerokości i odstępy, nadal bez pełnego przejścia do układu mobilnego. |
| **860 px i mniej** | Główne przejście do układu mobilnego: nagłówek ma dwa rzędy, sekcje wielokolumnowe przechodzą do jednej kolumny. |
| **420 px i mniej** | Dodatkowe dopasowanie dla bardzo wąskich ekranów: mniejsze nagłówki, przyciski ułożone pionowo, skorygowane odstępy. |

Przykład: **przy szerokości 768 px strona ma już mobilny układ CSS, ale tło jest generowane według ustawień `grid.desktop`**. To obecne, zamierzone zachowanie kodu — oba progi można zmieniać osobno.

## 5. Wszystkie parametry `config.js`

Poniżej znajdują się **rzeczywiste wartości obecnego kodu**, a nie proponowane zmiany z późniejszej dyskusji. Jednostki odległości to **piksele CSS**, z wyjątkiem ułamków `sideZone` i prawdopodobieństw `0…1`.

### 5.1. `seed` — powtarzalność wzoru

| Parametr | Obecnie | Działanie |
| --- | ---: | --- |
| `seed` | `20261102` | Ziarno generatora liczb pseudolosowych. Zmiana daje **inny układ** ścieżek przy tych samych pozostałych parametrach. Ten sam seed, wymiary sekcji, ustawienia i wersja generatora dają powtarzalną geometrię. Każda sekcja otrzymuje dodatkowo własne ziarno wyprowadzone z jej pozycji w dokumencie. |

**Do czego służy:** jeśli charakter wzoru jest odpowiedni, ale konkretne połączenia wyglądają niefortunnie, można spróbować innego `seed` bez zmiany gęstości lub kolorów. Seed nie jest suwakiem „więcej/mniej linii”.

### 5.2. `grid.desktop` i `grid.mobile` — geometria i zagęszczenie

Oba obiekty mają **te same dziewięć parametrów**, ale różne wartości.

| Parametr | Desktop | Mobile | Co dokładnie zmienia |
| --- | ---: | ---: | --- |
| `minGapX` | `61` | `48` | **Najmniejsza odległość pozioma** pomiędzy kolejnymi pionowymi liniami siatki. Mniejsza wartość dopuszcza węższe oczka. |
| `maxGapX` | `108` | `80` | **Największa odległość pozioma** między pionowymi liniami. Większa wartość dopuszcza szersze oczka. |
| `minGapY` | `55` | `55` | **Najmniejsza odległość pionowa** między kolejnymi poziomymi liniami siatki. Mniejsza wartość dopuszcza niższe oczka. |
| `maxGapY` | `103` | `93` | **Największa odległość pionowa** między poziomymi liniami. Większa wartość dopuszcza wyższe oczka. |
| `bandHeight` | `330` | `350` | Przybliżona wysokość **logicznego pasa generowania**, w px. Generator tworzy `ceil(wysokość_sekcji / bandHeight)` pasów. **Mniejsza wartość = więcej pasów**, a więc więcej okazji do utworzenia skupisk linii po lewej i prawej stronie. Nie zmienia bezpośrednio rozmiarów oczek. |
| `sideZone` | `0.33` | `0.30` | Docelowa część szerokości sekcji przeznaczona na skupiska po **każdej** stronie: `0.33` ≈ 33% od lewej i 33% od prawej. Większa wartość pozwala ścieżkom sięgać głębiej ku środkowi, **nie** zwiększa automatycznie ich liczby. W kodzie jest też minimalna szerokość strefy zależna od `minGapX`, więc procent nie zawsze jest dokładną granicą. |
| `pathsPerBand` | `2` | `1` | Liczba **dodatkowych, nieregularnych ścieżek** tworzonych **w każdym pasie i osobno po każdej stronie** sekcji. Większa wartość zazwyczaj oznacza więcej widocznych szarych połączeń, choć fragmenty mogą się pokrywać. Nie jest to łączna liczba wszystkich ścieżek w pasie. |
| `extraBranches` | `2` | `1` | **Górna granica liczby głównych poziomych odgałęzień** od pionowego „rdzenia” w danym pasie i po danej stronie. Generator losuje liczbę od **1** do tej wartości. Wyższa wartość pozwala budować bardziej rozgałęzione skupiska; nie gwarantuje, że wszystkie odnogi będą długie. |
| `maxRun` | `4` | `3` | Górna granica długości **pionowego rdzenia** (losowany zakres od 2) i podstawowych **poziomych odnóg** (zakres od 1), liczona w **segmentach siatki**. Większa wartość może wydłużyć te fragmenty, ale nie określa długości *wszystkich* ścieżek generatora. |

**Co oznacza „segment”?** Jest to jeden odcinek między **sąsiednimi punktami siatki**. Cztery segmenty nie muszą mieć zawsze tej samej łącznej długości w pikselach, ponieważ odstępy siatki są zmienne.

Ograniczenia praktyczne:

- Utrzymuj dodatnie odstępy i `minGapX <= maxGapX`, `minGapY <= maxGapY`.
- `bandHeight` musi być dodatni; `pathsPerBand` jest liczbą całkowitą od `0` wzwyż.
- `extraBranches` i `maxRun` powinny pozostać dodatnimi liczbami całkowitymi; dla `maxRun` używaj co najmniej `2`.
- Bardzo duża liczba ścieżek lub bardzo małe odstępy zwiększają liczbę elementów, koszt generowania i ryzyko wizualnego chaosu.

### 5.3. `grid.mobileBelowPx` — próg wariantu

| Parametr | Obecnie | Działanie |
| --- | ---: | --- |
| `mobileBelowPx` | `700` | Jeśli zmierzona szerokość sekcji jest **mniejsza niż 700 px**, stosowany jest `grid.mobile`. Dla **700 px dokładnie i więcej** stosowany jest `grid.desktop`. Nie zmienia to progu układu CSS (`860 px`). |

### 5.4. Prawdopodobieństwa i wyróżnienia — wspólne dla wariantów

Prawdopodobieństwa przyjmują wartości **od `0` (0%) do `1` (100%)**. Ich wpływ jest ograniczony konkretnym mechanizmem opisanym niżej; nie oznaczają odsetka wszystkich odcinków w finalnym SVG.

| Parametr | Obecnie | Co dokładnie zmienia |
| --- | ---: | --- |
| `branchProbability` | `0.75` | Szansa (75%), że podczas tworzenia **każdej głównej poziomej odnogi** zostanie podjęta próba dołożenia na jej końcu **jednego pionowego segmentu**. Ustawienie `0` **nie usuwa głównych odnóg** — usuwa tylko te dodatkowe pionowe załamania. |
| `grayGroupProbability` | `0.64` | Szansa (64%) na wyróżnienie **jednej wybranej grupy sąsiednich odcinków** mocniejszym szarym kolorem (`strong`) w każdym pasie i po każdej stronie. Jeden taki fragment ma maksymalnie 5 segmentów. Zwiększenie nie tworzy nowej siatki ani nowych linii, lecz wyróżnia istniejące. |
| `accentGroupProbability` | `0.66` | Bazowa szansa (66%) na wybór **pomarańczowego ciągu połączonych odcinków** w każdym pasie i po każdej stronie. Na mobile kod dodatkowo mnoży tę szansę przez `0.45`, więc efektywna wartość wynosi ok. **29,7%**. Nie jest to procent wszystkich pomarańczowych odcinków na stronie. |
| `nodeProbability` | `0.36` | Szansa (36%) na narysowanie kropki w **kwalifikującym się węźle szarych linii** (`subtle` i `strong`). Węzeł musi należeć do co najmniej dwóch zapisanych odcinków; nie każdy koniec linii otrzyma kropkę. |
| `accentNodeProbability` | `0.70` | Szansa (70%) na narysowanie kropki w kwalifikującym się **pomarańczowym węźle** (`accent`). Dotyczy węzłów oznaczonych najwyższym poziomem wyróżnienia. |

**Ważne:** zwiększenie `accentGroupProbability` może wizualnie uczynić tło intensywniejszym, ale **nie musi zagęścić sieci**. Gdy celem są przede wszystkim *dodatkowe szare połączenia*, reguluj `pathsPerBand` i `bandHeight`.

### 5.5. `palette.dark` i `palette.light` — kolory, grubości i punkty

Są to **dwie niezależne palety dekoracji**:

- `palette.dark` — SVG na ciemnych sekcjach, np. Hero i MESLite;
- `palette.light` — SVG na jasnych sekcjach, np. Problemy, Oferta, Współpraca i Kontakt.

W każdej palecie istnieją trzy poziomy linii:

- `subtle` — podstawowe, najdelikatniejsze linie;
- `strong` — mocniej zaznaczone wybrane fragmenty;
- `accent` — wyróżnione fragmenty pomarańczowe.

**Parametry linii** (każdy poziom ma dokładnie `color`, `width` i `opacity`):

| Parametr | `palette.dark` | `palette.light` | Znaczenie |
| --- | --- | --- | --- |
| `subtle.color` | `#718b9d` | `#95a9b7` | Kolor delikatnych linii. |
| `subtle.width` | `0.82` | `0.82` | Grubość delikatnych linii w px CSS. |
| `subtle.opacity` | `0.31` | `0.43` | Krycie delikatnych linii: `0` = niewidoczne, `1` = pełne. |
| `strong.color` | `#7895a9` | `#7991a4` | Kolor mocniejszych szarych fragmentów. |
| `strong.width` | `1.30` | `1.24` | Grubość mocniejszych fragmentów w px CSS. |
| `strong.opacity` | `0.65` | `0.68` | Krycie mocniejszych fragmentów. |
| `accent.color` | `#f58220` | `#ec751a` | Kolor pomarańczowych akcentów. |
| `accent.width` | `2.0` | `1.9` | Grubość pomarańczowych odcinków w px CSS. |
| `accent.opacity` | `0.94` | `0.95` | Krycie pomarańczowych odcinków. |

**Parametry kropek** (podawane wartości to **promienie**, a nie średnice):

| Parametr | `palette.dark` | `palette.light` | Znaczenie |
| --- | ---: | ---: | --- |
| `subtleDot` | `1.65` | `1.55` | Promień kropki na delikatnym szarym połączeniu, w px. |
| `strongDot` | `2.8` | `2.7` | Promień kropki na mocniejszym szarym połączeniu, w px. |
| `accentDot` | `4.1` | `3.9` | Promień kropki na pomarańczowym połączeniu, w px. |

Kropki dziedziczą barwę odpowiedniego poziomu. Generator nadaje im krycie równe `min(1, opacity + 0.12)` — czyli nieco większe od krycia linii.

**Nie mylić tych ustawień z kolorem tła sekcji.** Jednolite powierzchnie stron ustawia `style.css`:

```css
--color-dark: #101e28;
--color-light: #edf2f7;
--color-accent: #f58220;
```

Zmiana `palette.dark.accent.color` zmieni **kolor pomarańczowych linii na ciemnym tle**, ale nie zmieni automatycznie przycisków, typografii ani innych akcentów definiowanych w CSS. W szczególności barwy tła SVG i tła sekcji to różne rzeczy.

### 5.6. `animation` — odsłanianie podczas przewijania

| Parametr | Obecnie | Znaczenie | Efekt zwiększenia wartości |
| --- | ---: | --- | --- |
| `revealOffsetPx` | `100` | O ile pikseli **powyżej dolnej krawędzi okna** znajduje się docelowa granica widoczności. Wzór jest odsłaniany nad tą granicą. | Granica przesuwa się **wyżej** w oknie; wzór odsłania się dalej od dolnej krawędzi viewportu (nie oznacza to wcześniejszego momentu w czasie). |
| `revealLagMs` | `150` | Stała czasowa wygładzania podczas przewijania **w dół**, w milisekundach. To nie jest timer opóźniający rozpoczęcie animacji. `0` oznacza brak zamierzonej bezwładności. | Granica **wolniej dogania** pozycję docelową po przewinięciu; efekt bezwładności jest bardziej widoczny. |
| `revealFadePx` | `30` | Wysokość miękkiej strefy zanikania **tuż nad granicą odsłaniania**. Nad strefą linie są w pełni widoczne zgodnie ze swoją przezroczystością bazową; w strefie stopniowo znikają. | Przejście staje się dłuższe i delikatniejsze. |

Docelowe położenie granicy w dokumencie obliczane jest według wzoru:

```text
targetRevealY = scrollY + viewportHeight - revealOffsetPx
```

- Przy przewijaniu w dół granica płynnie podąża za celem, z wygładzaniem zależnym od `revealLagMs`.
- Przy przewijaniu w górę kod natychmiast ogranicza widoczność (`min(bieżąca_granica, nowa_granica_docelowa)`), aby zmiana kierunku **nigdy nie odsłoniła nagle dodatkowego wzoru**.
- Wszystkie sekcje używają **jednej globalnej granicy** przeliczanej na położenie lokalne każdego SVG.
- Przy starcie, odtworzeniu strony i zmianie rozmiaru okna granica jest ustawiana względem aktualnej pozycji przeglądarki.
- Przy `prefers-reduced-motion: reduce` animacja jest wyłączona, a wszystkie dekoracje są widoczne statycznie.
- Bez JavaScriptu dekoracje mogą nie występować; treść i kolory sekcji pozostają dostępne.

**Uwaga:** generator wymusza co najmniej `1 px` wysokości gradientu nawet przy `revealFadePx: 0` — zatem `0` oznacza w praktyce niemal ostre, około jednopikselowe przejście, a nie osobny tryb odcięcia.

## 6. Praktyczne przykłady dostrajania

Zmiany wykonuj w `config.js`, zapisz plik, odśwież stronę w przeglądarce i porównaj efekt. Najlepiej zmieniać **jedną grupę parametrów naraz**.

### A. Chcę nieco więcej linii, bez zmniejszania oczek

Dobry pierwszy eksperyment (to **propozycja**, nie aktualnie zapisane wartości):

```js
grid: {
  desktop: {
    // ...pozostałe ustawienia bez zmian
    bandHeight: 300,     // było 330: nieco więcej pasów
    pathsPerBand: 3,     // było 2: więcej dodatkowych ścieżek w pasie i na stronę
  },
  mobile: {
    // ...pozostałe ustawienia bez zmian
    bandHeight: 320,     // było 350: nieco więcej pasów
    pathsPerBand: 1,     // bez zmian: mobilny wzór nadal oszczędny
  },
  // ...pozostałe ustawienia bez zmian
}
```

**To przykład wybranych pól, nie kompletny obiekt do wklejenia w miejsce całego `grid`.** Zmień tylko wskazane wartości w istniejącym pliku.

Rezultat: większa liczba grup połączeń, zwykle szczególnie zauważalna na desktopie. `minGap*` i `maxGap*` pozostają takie same, więc **rozmiary oczek nie zmieniają się celowo**. Ponieważ generator losuje grupy, efekt nie jest idealnie liniowy.

### B. Chcę drobniejszą siatkę

Zmniejsz razem zakresy `minGapX`/`maxGapX` i ewentualnie `minGapY`/`maxGapY` dla wybranego wariantu. Przykładowo na desktopie z `61–108` do `55–95` px w poziomie. Nie zmieniaj na razie `pathsPerBand`, aby łatwiej ocenić samą skalę oczek.

### C. Chcę mniej pomarańczowego

Zmniejsz `accentGroupProbability` (obecnie `0.66`). Ten sam parametr dotyczy obu wariantów, ale mobile nadal ma dodatkowy współczynnik `0.45`. Alternatywnie możesz zmniejszyć `accent.opacity` w wybranej palecie, jeśli chcesz **słabszy kolor**, a nie mniej pomarańczowych fragmentów.

### D. Chcę bardziej wyraźny, ale nie gęstszy wzór

Zwiększ ostrożnie `subtle.opacity` w `palette.dark` lub `palette.light`. Wzrośnie widoczność istniejących linii bez dodawania geometrii. Zmiana `subtle.width` zwiększa zaś ich grubość.

### E. Chcę, aby na tabletach tło miało wariant mobile

Zmodyfikuj `mobileBelowPx` np. z `700` na `861`. Wtedy sekcje węższe niż `861 px` otrzymają geometrię mobile, co zbliży zachowanie tła do progu CSS `max-width: 860px`. **Nie zmieni to samego układu strony**. Pamiętaj, że przebudowa przy zmianie wariantu będzie wyraźna, bo generator przeliczy całą kompozycję.

## 7. Testy i ograniczenia etapu 3

W etapie 3 sprawdzono w Chromium, w izolowanym dokumencie przeglądarki:

- generowanie sześciu SVG i ich masek;
- powtarzalność geometrii względem etapu 2;
- płynne odsłanianie w dół oraz ukrywanie bez opóźnienia przy zmianie kierunku;
- reakcję na zmianę wymiarów sekcji, przewijanie i aktualizację masek;
- zmianę `prefers-reduced-motion`;
- szerokości **280, 320, 375, 390, 560, 699, 700, 768, 900, 1024, 1440, 1920 px** bez wykrytego poziomego przewijania lub błędów JavaScriptu;
- czytelność strony bez JavaScriptu.

**Do ręcznej weryfikacji w Live Server** pozostają m.in. płynność na rzeczywistych telefonach, otwieranie adresów z kotwicą (np. `#kontakt`), odświeżanie w różnych pozycjach scrolla i długotrwałe działanie w przeglądarce.

Nie wprowadzono ukośnych ścieżek, kwadratowych węzłów, bitmap jako docelowego tła, animowania osobnych odcinków ani ciągłości wzoru przez granice sekcji. Roboczy znak logo nadal bazuje na ulotce.

---

**Zakres tej aktualizacji:** wyłącznie dokumentacja `README.md`. Wartości `config.js`, kod generatora i animacji oraz wygląd strony nie zostały zmienione.
