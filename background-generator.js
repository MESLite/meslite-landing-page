/* MESLite — proceduralna dekoracja SVG (etap 3, dopracowanie geometrii).
 * Jedna nieregularna siatka; wybierane z niej połączone segmenty trzech poziomów.
 * Każda sekcja ma własny seed i SVG. Animacja jest w osobnym module.
 */
(() => {
  'use strict';

  const config = window.MESLiteBackgroundConfig;
  if (!config) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const sections = Array.from(document.querySelectorAll('.site-section'));
  const dimensions = new WeakMap();

  function random(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6D2B79F5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mixSeed(...numbers) {
    let mixed = 0x811c9dc5;
    for (const number of numbers) {
      mixed ^= number >>> 0;
      mixed = Math.imul(mixed, 0x01000193) >>> 0;
      mixed ^= mixed >>> 13;
    }
    return mixed >>> 0;
  }

  function between(rand, min, max) {
    return min + Math.floor(rand() * (max - min + 1));
  }

  function axisPositions(length, minGap, maxGap, seed) {
    const rand = random(seed);
    const points = [0];
    // Oś rośnie w stały sposób: dołożenie wysokości nie przelicza wcześniejszych oczek.
    while (points[points.length - 1] < length + maxGap) {
      const gap = between(rand, minGap, maxGap);
      points.push(points[points.length - 1] + gap);
    }
    return points;
  }

  function nearestIndex(points, target) {
    let best = 0;
    for (let i = 1; i < points.length; i += 1) {
      if (Math.abs(points[i] - target) < Math.abs(points[best] - target)) best = i;
      if (points[i] > target) break;
    }
    return best;
  }

  function createNode(x, y) { return `${x},${y}`; }
  function createEdge(x1, y1, x2, y2) {
    const a = createNode(x1, y1);
    const b = createNode(x2, y2);
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  function buildGeometry(width, height, sectionSeed) {
    const isMobile = width < config.grid.mobileBelowPx;
    const settings = isMobile ? config.grid.mobile : config.grid.desktop;
    const xAxis = axisPositions(width, settings.minGapX, settings.maxGapX, mixSeed(sectionSeed, 11));
    const yAxis = axisPositions(height, settings.minGapY, settings.maxGapY, mixSeed(sectionSeed, 23));
    const lastX = xAxis.length - 1;
    const lastY = yAxis.length - 1;
    const edges = new Map();

    function putEdge(x1, y1, x2, y2, rank = 1) {
      if (x1 < 0 || x2 < 0 || y1 < 0 || y2 < 0 || x1 > lastX || x2 > lastX || y1 > lastY || y2 > lastY) return null;
      if (Math.abs(x1 - x2) + Math.abs(y1 - y2) !== 1) return null;
      const key = createEdge(x1, y1, x2, y2);
      const old = edges.get(key);
      if (!old || rank > old.rank) edges.set(key, { x1, y1, x2, y2, rank });
      return key;
    }

    function trace(points) {
      const path = [];
      for (let i = 1; i < points.length; i += 1) {
        const key = putEdge(...points[i - 1], ...points[i]);
        if (key) path.push(key);
      }
      return path;
    }

    function highlight(path, rank, rand, maxLength) {
      if (!path.length) return;
      const take = Math.min(path.length, between(rand, Math.min(2, path.length), Math.max(2, Math.min(maxLength, path.length))));
      const start = between(rand, 0, path.length - take);
      for (const key of path.slice(start, start + take)) {
        const edge = edges.get(key);
        if (edge) edge.rank = Math.max(edge.rank, rank);
      }
    }

    function pathFromWalk(x, y, rand, limit, steps) {
      const points = [[x, y]];
      let previous = '';
      for (let step = 0; step < steps; step += 1) {
        const options = [
          { dx: 0, dy: -1, name: 'up' },
          { dx: 0, dy: 1, name: 'down' },
          { dx: -1, dy: 0, name: 'left' },
          { dx: 1, dy: 0, name: 'right' },
        ].filter((option) => {
          const nx = x + option.dx;
          const ny = y + option.dy;
          const reverse = (previous === 'up' && option.name === 'down') ||
            (previous === 'down' && option.name === 'up') ||
            (previous === 'left' && option.name === 'right') ||
            (previous === 'right' && option.name === 'left');
          return !reverse && nx >= limit.min && nx <= limit.max && ny >= 0 && ny < lastY;
        });
        if (!options.length) break;
        // Kontrolowana nieregularność: nie zmieniaj kierunku w każdym odcinku.
        let picked;
        if (previous && rand() < 0.46) picked = options.find((option) => option.name === previous);
        if (!picked) {
          const vertical = options.filter((option) => option.dy !== 0);
          const horizontal = options.filter((option) => option.dx !== 0);
          const pool = rand() < 0.54 ? vertical : horizontal;
          picked = (pool.length ? pool : options)[between(rand, 0, (pool.length ? pool : options).length - 1)];
        }
        x += picked.dx;
        y += picked.dy;
        points.push([x, y]);
        previous = picked.name;
      }
      return trace(points);
    }

    // Spójny szkielet oczek przy obu krawędziach. Wewnętrzna granica sieci
    // wędruje powoli w poziomie, więc kompletne oczka stopniowo ustępują
    // rzadszym fragmentom. Każda komórka współdzieli krawędzie z sąsiadami.
    for (let side = 0; side < 2; side += 1) {
      const rand = random(mixSeed(sectionSeed, side, 419));
      const sideWidth = Math.max(width * settings.sideZone, settings.minGapX * 1.5);
      const zoneCount = Math.max(1, Math.min(nearestIndex(xAxis, sideWidth), Math.floor(lastX / 2)));
      let reach = Math.min(2, zoneCount);

      for (let y = 0; y < lastY; y += 1) {
        // Zachowaj długie piony; zmiany zasięgu dotyczą przede wszystkim
        // poziomych zakończeń i następują rzadziej niż na każdym przecięciu.
        if (rand() < 0.34) {
          reach = Math.max(1, Math.min(zoneCount, reach + (rand() < 0.56 ? -1 : 1)));
        }
        for (let depth = 0; depth < reach; depth += 1) {
          const x = side === 0 ? depth : lastX - depth - 1;
          putEdge(x, y, x, y + 1);
          putEdge(x + 1, y, x + 1, y + 1);
          putEdge(x, y, x + 1, y);
          putEdge(x, y + 1, x + 1, y + 1);
        }
      }
    }

    // Niezależne pasy logiczne. Seed każdego pasa pozostaje stały przy wydłużaniu sekcji.
    const bands = Math.ceil(height / settings.bandHeight);
    for (let band = 0; band < bands; band += 1) {
      for (let side = 0; side < 2; side += 1) {
        const rand = random(mixSeed(sectionSeed, band, side, 67));
        const sideWidth = Math.max(width * settings.sideZone, settings.minGapX * 1.5);
        const zoneCount = Math.max(2, nearestIndex(xAxis, sideWidth));
        const minX = side === 0 ? 0 : Math.max(0, lastX - zoneCount);
        const maxX = side === 0 ? Math.min(lastX, zoneCount) : lastX;
        const spineX = side === 0
          ? Math.min(maxX, between(rand, 0, Math.min(2, maxX)))
          : Math.max(minX, lastX - between(rand, 0, Math.min(2, lastX - minX)));
        const startY = nearestIndex(yAxis, band * settings.bandHeight + 60 + between(rand, 0, 80));
        const spineLength = between(rand, 2, settings.maxRun);

        // Kręgosłup pionowy, z którego wyrastają wybrane poziome odgałęzienia.
        const spineNodes = [];
        for (let k = 0; k <= spineLength; k += 1) {
          spineNodes.push([spineX, Math.min(lastY, startY + k)]);
        }
        const spinePath = trace(spineNodes);
        const paths = [spinePath];
        const towardCenter = side === 0 ? 1 : -1;
        const spineY = Math.min(lastY - 1, startY + between(rand, 0, Math.max(0, spineLength - 1)));
        const branchCount = between(rand, 1, settings.extraBranches);

        for (let b = 0; b < branchCount; b += 1) {
          const y = Math.min(lastY - 1, spineY + (b === 0 ? 0 : between(rand, -2, 2)));
          const inward = (rand() < 0.82 ? towardCenter : -towardCenter);
          let x = spineX;
          const nodes = [[x, y]];
          const count = between(rand, 1, settings.maxRun);
          for (let step = 0; step < count; step += 1) {
            const nx = x + inward;
            if (nx < minX || nx > maxX) break;
            x = nx;
            nodes.push([x, y]);
          }
          if (rand() < config.grid.branchProbability && nodes.length > 1) {
            const dy = rand() < 0.5 ? -1 : 1;
            const nextY = y + dy;
            if (nextY >= 0 && nextY < lastY) nodes.push([x, nextY]);
          }
          paths.push(trace(nodes));
        }

        // Delikatne, kilkusegmentowe "tory" wzmacniają techniczny charakter
        // siatki. Nadal używają dokładnie tych samych węzłów i krawędzi.
        // Rozdzielamy je w pasie, zamiast losować pojedyncze niezależne kreski.
        const railGroups = isMobile ? 1 : 3;
        for (let rail = 0; rail < railGroups; rail += 1) {
          const railX = between(rand, minX, maxX);
          const railY = Math.max(0, Math.min(lastY - 1, nearestIndex(
            yAxis,
            band * settings.bandHeight + 35 + (rail + 0.5) * (settings.bandHeight - 45) / railGroups,
          )));
          const start = Math.max(0, railY - between(rand, 0, 1));
          const vertical = between(rand, 2, isMobile ? 3 : 4);
          const railNodes = [];
          for (let step = 0; step <= vertical; step += 1) {
            railNodes.push([railX, Math.min(lastY, start + step)]);
          }
          trace(railNodes);
          const connectY = Math.min(lastY - 1, start + between(rand, 0, Math.min(2, vertical)));
          let connectX = railX;
          const connectNodes = [[connectX, connectY]];
          const direction = rand() < 0.78 ? towardCenter : -towardCenter;
          for (let step = 0; step < between(rand, 1, 3); step += 1) {
            const nx = connectX + direction;
            if (nx < minX || nx > maxX) break;
            connectX = nx;
            connectNodes.push([connectX, connectY]);
          }
          trace(connectNodes);
        }

        // Dodatkowe, połączone fragmenty tej samej siatki: nie ma osobnej "warstwy ścieżek".
        for (let j = 0; j < settings.pathsPerBand; j += 1) {
          const x = Math.min(maxX, Math.max(minX, spineX + between(rand, -1, 1)));
          const y = Math.max(0, Math.min(lastY - 1, startY + between(rand, -2, 2)));
          paths.push(pathFromWalk(x, y, rand, { min: minX, max: maxX }, between(rand, 3, 7)));
        }

        // Mocniejsze podzbiory są CIĄGŁYMI kawałkami istniejących ścieżek.
        const grayPath = paths[Math.min(paths.length - 1, between(rand, 0, paths.length - 1))];
        if (rand() < config.grid.grayGroupProbability) highlight(grayPath, 2, rand, 5);
        // Pomarańcz pozostaje rzadszy. Akcent jest serią sąsiednich segmentów.
        const accentChance = config.grid.accentGroupProbability * (isMobile ? 0.45 : 1);
        if (rand() < accentChance) {
          // Akcent tylko na pionowym rdzeniu albo podłączonej odnodze:
          // bez obwodzenia przypadkowych prostokątów pomarańczowym konturem.
          const goodPaths = paths.slice(0, 1 + branchCount).filter((path) => path.length >= 2);
          if (goodPaths.length) {
            const accentPath = goodPaths[between(rand, 0, goodPaths.length - 1)];
            highlight(accentPath, 3, rand, isMobile ? 2 : 4);
          }
        }
      }
    }

    // Swobodne końce pionowych torów domykamy krótką odnogą poziomą.
    // Końce dotykające górnej/dolnej granicy sekcji pozostają bez zmian.
    const endpointDegree = new Map();
    for (const edge of edges.values()) {
      for (const [x, y] of [[edge.x1, edge.y1], [edge.x2, edge.y2]]) {
        const key = createNode(x, y);
        endpointDegree.set(key, (endpointDegree.get(key) || 0) + 1);
      }
    }
    for (const edge of Array.from(edges.values())) {
      if (edge.x1 !== edge.x2) continue;
      for (const [x, y] of [[edge.x1, edge.y1], [edge.x2, edge.y2]]) {
        if (y > 0 && y < lastY && endpointDegree.get(createNode(x, y)) === 1) {
          putEdge(x, y, x + (x < lastX / 2 ? 1 : -1), y, edge.rank);
        }
      }
    }

    // Wybrane kropki na węzłach istniejących połączeń (bez kwadratów).
    const nodes = new Map();
    for (const edge of edges.values()) {
      for (const [x, y] of [[edge.x1, edge.y1], [edge.x2, edge.y2]]) {
        const key = createNode(x, y);
        const current = nodes.get(key) || { x, y, degree: 0, rank: 1 };
        current.degree += 1;
        current.rank = Math.max(current.rank, edge.rank);
        nodes.set(key, current);
      }
    }
    const dots = [[], [], []];
    for (const node of nodes.values()) {
      const rand = random(mixSeed(sectionSeed, node.x, node.y, 223));
      const probability = node.rank === 3 ? config.grid.accentNodeProbability : config.grid.nodeProbability;
      if (node.degree >= 2 && rand() < probability) dots[node.rank - 1].push(node);
    }

    const ranks = [[], [], []];
    for (const edge of edges.values()) ranks[edge.rank - 1].push(edge);
    return { xAxis, yAxis, ranks, dots, isMobile };
  }

  function svgNode(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    return element;
  }

  function render(section, index) {
    const host = section.querySelector('.section-decoration');
    if (!host) return;
    const box = section.getBoundingClientRect();
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    if (width < 1 || height < 1) return;
    const old = dimensions.get(section);
    if (old && old.width === width && old.height === height) return;
    dimensions.set(section, { width, height });

    const scheme = section.classList.contains('site-section--dark') ? 'dark' : 'light';
    const palette = config.palette[scheme];
    const seed = mixSeed(config.seed, index, 0x521a);
    const data = buildGeometry(width, height, seed);
    const svg = svgNode('svg', {
      xmlns: SVG_NS,
      viewBox: `0 0 ${width} ${height}`,
      width: width,
      height: height,
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
      focusable: 'false',
      class: 'section-decoration__svg',
    });

    for (let rank = 1; rank <= 3; rank += 1) {
      const style = [palette.subtle, palette.strong, palette.accent][rank - 1];
      const geometry = data.ranks[rank - 1];
      // Dla segmentów pionowych używamy wyłącznie "V". Całość pozostaje prostokątna.
      const paths = geometry.map((edge) => edge.x1 === edge.x2
        ? `M${data.xAxis[edge.x1]} ${data.yAxis[edge.y1]}V${data.yAxis[edge.y2]}`
        : `M${data.xAxis[edge.x1]} ${data.yAxis[edge.y1]}H${data.xAxis[edge.x2]}`);
      const layer = svgNode('g', { class: `decoration-level decoration-level--${rank}` });
      layer.appendChild(svgNode('path', {
        d: paths.join(' '), fill: 'none', stroke: style.color,
        'stroke-width': style.width, 'stroke-opacity': style.opacity,
        'stroke-linecap': 'square', 'stroke-linejoin': 'miter',
      }));
      const radius = [palette.subtleDot, palette.strongDot, palette.accentDot][rank - 1];
      for (const node of data.dots[rank - 1]) {
        layer.appendChild(svgNode('circle', {
          cx: data.xAxis[node.x], cy: data.yAxis[node.y], r: radius,
          fill: style.color, 'fill-opacity': Math.min(1, style.opacity + 0.12),
        }));
      }
      svg.appendChild(layer);
    }

    host.replaceChildren(svg);
    // Moduł animacji może dołączyć maskę do nowego SVG. Geometria nie jest modyfikowana.
    window.dispatchEvent(new CustomEvent('meslite:background-rendered', {
      detail: { section, svg },
    }));
  }

  let pending = false;
  const queue = new Set();
  function schedule(section) {
    queue.add(section);
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      for (const element of queue) render(element, sections.indexOf(element));
      queue.clear();
    });
  }

  // ResizeObserver reaguje również na zmianę wysokości sekcji spowodowaną treścią.
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) schedule(entry.target);
    });
    sections.forEach((section) => observer.observe(section));
  } else {
    sections.forEach(schedule);
    window.addEventListener('resize', () => sections.forEach(schedule), { passive: true });
  }

})();
