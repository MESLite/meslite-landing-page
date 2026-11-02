/*
 * MESLite — konfiguracja proceduralnego tła SVG i odsłaniania (etap 3).
 * Parametry generatora są niezależne od typografii i układu strony.
 * Bez bibliotek ani dodatkowych zasobów sieciowych.
 */
window.MESLiteBackgroundConfig = Object.freeze({
  seed: 20261102,

  /* Animacja odsłaniania podczas przewijania (piksele CSS i milisekundy). */
  animation: {
    revealOffsetPx: 100,  // granica odsłaniania 100 px nad dolną krawędzią okna
    revealLagMs: 150,     // bezwładność wyłącznie przy przewijaniu w dół
    revealFadePx: 30,     // wysokość miękkiego zanikania przed granicą
  },

  grid: {
    desktop: {
      minGapX: 41, maxGapX: 88,
      minGapY: 35, maxGapY: 83,
      bandHeight: 200,
      sideZone: 0.33,
      pathsPerBand: 3,
      extraBranches: 2,
      maxRun: 4,
    },
    mobile: {
      minGapX: 18, maxGapX: 40,
      minGapY: 24, maxGapY: 48,
      bandHeight: 200,
      sideZone: 0.30,
      pathsPerBand: 4,
      extraBranches: 3,
      maxRun: 3,
    },
    mobileBelowPx: 700,
    /* Szanse są stosowane do całych grup/odgałęzień, nie do każdej kreski osobno. */
    branchProbability: 0.75,
    accentGroupProbability: 0.66,
    grayGroupProbability: 1,
    nodeProbability: 0.36,
    accentNodeProbability: 0.70,
  },

  /* Kolory, grubości i przezroczystości osobne dla dwóch wariantów tła. */
  palette: {
    dark: {
      subtle: { color: '#718b9d', width: 0.82, opacity: 0.31 },
      strong: { color: '#7895a9', width: 1.30, opacity: 0.65 },
      accent: { color: '#f58220', width: 2.0, opacity: 0.94 },
      subtleDot: 1.65,
      strongDot: 2.8,
      accentDot: 4.1,
    },
    light: {
      subtle: { color: '#95a9b7', width: 0.82, opacity: 0.43 },
      strong: { color: '#7991a4', width: 1.24, opacity: 0.68 },
      accent: { color: '#ec751a', width: 1.9, opacity: 0.95 },
      subtleDot: 1.55,
      strongDot: 2.7,
      accentDot: 3.9,
    },
  },
});
