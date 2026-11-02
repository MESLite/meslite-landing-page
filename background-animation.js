/* MESLite — etap 3: globalne odsłanianie gotowej dekoracji SVG.
 * Jeden poziom w osi całego dokumentu, miękka maska SVG, opóźnienie tylko w dół.
 * Ten moduł nie zmienia geometrii generowanej przez background-generator.js.
 */
(() => {
  'use strict';

  const options = window.MESLiteBackgroundConfig?.animation;
  if (!options) return; // Generator nadal pokazuje statyczne SVG, jeśli brak konfiguracji animacji.

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const sections = Array.from(document.querySelectorAll('.site-section'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const masks = new Map();

  let lastScrollY = window.scrollY;
  let targetRevealY = getTarget();
  let currentRevealY = targetRevealY; // Początkowo odsłonięta widoczna część strony.
  let lastFrameTime = null;
  let frameId = null;

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    return element;
  }

  function getTarget() {
    return window.scrollY + window.innerHeight - options.revealOffsetPx;
  }

  // Wyłącznie geometria maski: trzy poziomy dekoracji SVG pozostają bez zmian.
  function prepareMask(section, svg) {
    const previous = masks.get(section);
    if (previous?.svg === svg) return;

    const index = sections.indexOf(section);
    if (index < 0) return;
    const width = Number(svg.getAttribute('width'));
    const height = Number(svg.getAttribute('height'));
    const gradientId = `meslite-reveal-gradient-${index}`;
    const maskId = `meslite-reveal-mask-${index}`;
    const defs = svgElement('defs');
    const gradient = svgElement('linearGradient', {
      id: gradientId,
      gradientUnits: 'userSpaceOnUse',
      x1: 0, y1: 0, x2: 0, y2: 1,
    });
    gradient.append(
      svgElement('stop', { offset: '0', 'stop-color': 'white', 'stop-opacity': '1' }),
      svgElement('stop', { offset: '1', 'stop-color': 'white', 'stop-opacity': '0' }),
    );
    const mask = svgElement('mask', {
      id: maskId,
      maskUnits: 'userSpaceOnUse',
      maskContentUnits: 'userSpaceOnUse',
      x: 0, y: 0, width, height,
      style: 'mask-type: alpha;',
    });
    mask.append(svgElement('rect', {
      x: 0, y: 0, width, height, fill: `url(#${gradientId})`,
    }));
    defs.append(gradient, mask);

    const content = svgElement('g', { class: 'section-decoration__reveal' });
    for (const layer of Array.from(svg.children)) {
      if (layer.classList.contains('decoration-level')) content.append(layer);
    }
    svg.prepend(defs);
    svg.append(content);
    masks.set(section, { svg, gradient, content, maskId });
    content.setAttribute('mask', `url(#${maskId})`);

    if (reduceMotion.matches) content.removeAttribute('mask');
    else paintMasks();
  }

  function paintMasks() {
    if (reduceMotion.matches) return;
    // Najpierw odczyty położenia sekcji, potem zmiany atrybutów SVG.
    const bounds = [];
    for (const [section, data] of masks) {
      // Współrzędne sekcji w całym dokumencie (także po zmianie jej wysokości).
      bounds.push([data, section.getBoundingClientRect().top + window.scrollY]);
    }
    const fade = Math.max(1, options.revealFadePx);
    for (const [data, top] of bounds) {
      const end = currentRevealY - top;
      data.gradient.setAttribute('y1', String(end - fade));
      data.gradient.setAttribute('y2', String(end));
    }
  }

  function stopAnimation() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    lastFrameTime = null;
  }

  function animate(now) {
    frameId = null;
    if (reduceMotion.matches) return;

    if (lastFrameTime !== null) {
      const dt = Math.max(0, now - lastFrameTime);
      const lag = Math.max(0, options.revealLagMs);
      const alpha = lag === 0 ? 1 : 1 - Math.exp(-dt / lag);
      currentRevealY += (targetRevealY - currentRevealY) * alpha;
    }
    lastFrameTime = now;
    if (Math.abs(targetRevealY - currentRevealY) < 0.5) currentRevealY = targetRevealY;
    paintMasks();
    if (currentRevealY !== targetRevealY) frameId = requestAnimationFrame(animate);
    else lastFrameTime = null;
  }

  function requestAnimation() {
    if (!reduceMotion.matches && frameId === null) frameId = requestAnimationFrame(animate);
  }

  function onScroll() {
    const scrollY = window.scrollY;
    const scrollingUp = scrollY < lastScrollY;
    lastScrollY = scrollY;
    targetRevealY = getTarget();
    if (reduceMotion.matches) return;

    if (scrollingUp) {
      // Natychmiast chowaj, ale nigdy nie odsłaniaj przy zmianie kierunku.
      currentRevealY = Math.min(currentRevealY, targetRevealY);
      stopAnimation();
      paintMasks();
    } else {
      requestAnimation();
    }
  }

  function snapToPosition() {
    // Pierwsze ładowanie, odtworzenie scrolla przez przeglądarkę / bfcache.
    stopAnimation();
    lastScrollY = window.scrollY;
    targetRevealY = getTarget();
    currentRevealY = targetRevealY;
    paintMasks();
  }

  function onResize() {
    lastScrollY = window.scrollY;
    targetRevealY = getTarget();
    // Reflow i nowy viewport nie powinny same inicjować animacji.
    currentRevealY = targetRevealY;
    stopAnimation();
    paintMasks();
  }

  function onMotionPreferenceChange() {
    stopAnimation();
    for (const data of masks.values()) {
      if (reduceMotion.matches) data.content.removeAttribute('mask');
      else data.content.setAttribute('mask', `url(#${data.maskId})`);
    }
    snapToPosition();
  }

  // Generator zachowuje pełną odpowiedzialność za rozmiar i kształt SVG.
  window.addEventListener('meslite:background-rendered', (event) => {
    const { section, svg } = event.detail;
    prepareMask(section, svg);
  });
  for (const section of sections) {
    const svg = section.querySelector('.section-decoration__svg');
    if (svg) prepareMask(section, svg);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('pageshow', snapToPosition);
  window.addEventListener('load', snapToPosition, { once: true });
  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', onMotionPreferenceChange);
  } else {
    reduceMotion.addListener(onMotionPreferenceChange);
  }
})();
