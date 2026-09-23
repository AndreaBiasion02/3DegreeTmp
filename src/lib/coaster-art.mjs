import { validLine } from './coaster-design.mjs';
import { getCapSymbol, detectSymbolFromText } from './cap-symbols.mjs';

const finite = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const pathPattern = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+\-]+$/;

export function getPathBounds(d) {
  const coords = [];
  const regex = /([a-df-z])([^a-df-z]*)/gi;
  let match;
  let currX = 50, currY = 49;
  while ((match = regex.exec(d)) !== null) {
    const cmd = match[1];
    const nums = match[2].trim().match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/gi)?.map(Number) || [];
    const isRel = cmd === cmd.toLowerCase() && cmd !== 'z';
    const c = cmd.toUpperCase();
    if (c === 'H') {
      for (const n of nums) { currX = isRel ? currX + n : n; coords.push([currX, currY]); }
    } else if (c === 'V') {
      for (const n of nums) { currY = isRel ? currY + n : n; coords.push([currX, currY]); }
    } else if (['M', 'L', 'T'].includes(c)) {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        currX = isRel ? currX + nums[i] : nums[i];
        currY = isRel ? currY + nums[i + 1] : nums[i + 1];
        coords.push([currX, currY]);
      }
    } else if (['C', 'S', 'Q'].includes(c)) {
      const step = c === 'C' ? 6 : 4;
      for (let i = 0; i + step - 1 < nums.length; i += step) {
        for (let j = 0; j < step; j += 2) {
          coords.push([isRel ? currX + nums[i + j] : nums[i + j], isRel ? currY + nums[i + j + 1] : nums[i + j + 1]]);
        }
        currX = isRel ? currX + nums[i + step - 2] : nums[i + step - 2];
        currY = isRel ? currY + nums[i + step - 1] : nums[i + step - 1];
      }
    } else if (c === 'A') {
      for (let i = 0; i + 6 < nums.length; i += 7) {
        currX = isRel ? currX + nums[i + 5] : nums[i + 5];
        currY = isRel ? currY + nums[i + 6] : nums[i + 6];
        coords.push([currX, currY]);
      }
    }
  }
  if (!coords.length) return null;
  const xs = coords.map(p => p[0]);
  const ys = coords.map(p => p[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    centerX: (Math.min(...xs) + Math.max(...xs)) / 2,
    centerY: (Math.min(...ys) + Math.max(...ys)) / 2,
    maxRadius: Math.max(...coords.map(([x, y]) => Math.hypot(x - 50, y - 49))),
  };
}

export function transformPath(d, dx = 0, dy = 0, scale = 1, originX = 50, originY = 49) {
  return d.replace(/([a-df-z])([^a-df-z]*)/gi, (match, cmd, numStr) => {
    const isRel = cmd === cmd.toLowerCase() && cmd !== 'z';
    const c = cmd.toUpperCase();
    const nums = numStr.trim().match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/gi)?.map(Number) || [];
    if (!nums.length) return match;
    const transformed = [];
    if (c === 'H') {
      for (const x of nums) transformed.push(isRel ? x * scale : (x - originX) * scale + originX + dx);
    } else if (c === 'V') {
      for (const y of nums) transformed.push(isRel ? y * scale : (y - originY) * scale + originY + dy);
    } else if (['M', 'L', 'T'].includes(c)) {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        transformed.push(
          isRel ? nums[i] * scale : (nums[i] - originX) * scale + originX + dx,
          isRel ? nums[i + 1] * scale : (nums[i + 1] - originY) * scale + originY + dy
        );
      }
    } else if (['C', 'S', 'Q'].includes(c)) {
      const step = c === 'C' ? 6 : 4;
      for (let i = 0; i + step - 1 < nums.length; i += step) {
        for (let j = 0; j < step; j += 2) {
          transformed.push(
            isRel ? nums[i + j] * scale : (nums[i + j] - originX) * scale + originX + dx,
            isRel ? nums[i + j + 1] * scale : (nums[i + j + 1] - originY) * scale + originY + dy
          );
        }
      }
    } else if (c === 'A') {
      for (let i = 0; i + 6 < nums.length; i += 7) {
        transformed.push(
          nums[i] * scale, nums[i + 1] * scale, nums[i + 2], nums[i + 3], nums[i + 4],
          isRel ? nums[i + 5] * scale : (nums[i + 5] - originX) * scale + originX + dx,
          isRel ? nums[i + 6] * scale : (nums[i + 6] - originY) * scale + originY + dy
        );
      }
    } else {
      return match;
    }
    return `${cmd} ${transformed.map(v => Math.round(v * 100) / 100).join(' ')} `;
  });
}

export function measuredTextWidth(text, size, font) {
  const units = [...text].reduce((sum, c) => sum + (font === 'mono' ? .62 : /[MW@%]/.test(c) ? .95 : /[ilI.,! '’]/.test(c) ? .3 : .62), 0);
  return Math.max(1, units * size);
}

export function sanitizeArtworks(proposals, palette, options = {}) {
  if (!Array.isArray(proposals)) return proposals;
  const isSquare = options?.shape === 'square' || options?.target === 'cap';
  const colors = new Set((palette || []).map(c => c.hex));
  const fallbackBg = palette?.[0]?.hex || '#222222';
  const fallbackFg = palette?.[1]?.hex || '#facc15';

  const cleaned = proposals.slice(0, 3).map((art, index) => {
    if (!art || typeof art !== 'object') return art;

    let background = isSquare ? '#222222' : (colors.has(art.background) ? art.background : fallbackBg);
    let foreground = colors.has(art.foreground) ? art.foreground : fallbackFg;
    if (background === foreground) {
      foreground = [...colors].find(c => c !== background) || fallbackFg;
    }

    const title = (typeof art.title === 'string' && art.title.trim().length > 0 ? art.title.trim() : `Idea ${index + 1}`).slice(0, 40);
    const concept = (typeof art.concept === 'string' && art.concept.trim().length > 0 ? art.concept.trim() : (isSquare ? 'Design originale per tocco' : 'Design originale per sottobicchiere')).slice(0, 160);

    const texts = Array.isArray(art.texts) ? art.texts.slice(0, 5).map(t => {
      const copy = { ...t };
      if (typeof copy.text !== 'string') copy.text = '3DEGREE';
      copy.text = copy.text.replace(/[^\p{Script=Latin}\p{N} .,!?…:;’'"+&()\/%=\-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 24);
      if (!copy.text) copy.text = '3DEGREE';
      if (!copy.font || !['sans', 'serif', 'mono'].includes(copy.font)) copy.font = 'sans';
      if (!copy.anchor || !['start', 'middle', 'end'].includes(copy.anchor)) copy.anchor = 'middle';
      if (typeof copy.inverse !== 'boolean') copy.inverse = false;
      if (typeof copy.x !== 'number' || !Number.isFinite(copy.x)) copy.x = 50;
      if (typeof copy.y !== 'number' || !Number.isFinite(copy.y)) copy.y = 50;
      if (typeof copy.size !== 'number' || !Number.isFinite(copy.size)) copy.size = 12;
      if (typeof copy.maxWidth !== 'number' || !Number.isFinite(copy.maxWidth)) copy.maxWidth = 70;

      copy.x = Math.max(10, Math.min(90, copy.x));
      copy.size = Math.max(5, Math.min(22, copy.size));
      copy.y = Math.max((isSquare ? 11 : 14) + copy.size, Math.min(isSquare ? 87 : 84, copy.y));
      copy.maxWidth = Math.max(15, Math.min(80, copy.maxWidth));

      if (!isSquare) {
        const topDist = Math.abs(copy.y - copy.size - 49);
        const bottomDist = Math.abs(copy.y + 2 - 49);
        const dy = Math.max(topDist, bottomDist);
        if (dy < 41.5) {
          const safeHalfW = Math.sqrt(41.5 * 41.5 - dy * dy);
          const maxSafeW = Math.floor(2 * safeHalfW * 10) / 10;
          if (copy.maxWidth > maxSafeW) {
            copy.maxWidth = Math.max(15, maxSafeW);
          }
        }
      }
      return copy;
    }) : [];

    if (texts.length >= 2 && Math.max(...texts.map(t => t.size)) < 14) {
      let heroIndex = -1;
      let minLen = Infinity;
      texts.forEach((t, i) => {
        const isUpper = t.text === t.text.toUpperCase() && /[A-Z]/.test(t.text);
        const score = t.text.length - (isUpper ? 3 : 0);
        if (score < minLen) {
          minLen = score;
          heroIndex = i;
        }
      });
      texts.forEach((t, i) => {
        const u = measuredTextWidth(t.text, 1, t.font);
        if (i === heroIndex) {
          const fit = Math.min(21, Math.floor((72 / u) * 10) / 10);
          t.size = Math.max(t.size, Math.min(fit, 17.5));
        } else {
          const fit = Math.min(13.5, Math.floor((72 / u) * 10) / 10);
          t.size = Math.max(t.size, Math.min(fit, 11.5));
        }
      });
    }

    const rawPaths = Array.isArray(art.paths) ? art.paths.slice(0, 12).map(p => ({
      d: typeof p.d === 'string' && pathPattern.test(p.d) && p.d.length >= 4 ? p.d.slice(0, 600) : 'M 35 25 H 65',
      fill: typeof p.fill === 'boolean' ? p.fill : false,
      strokeWidth: typeof p.strokeWidth === 'number' && Number.isFinite(p.strokeWidth) ? Math.max(0.8, Math.min(2.5, p.strokeWidth)) : 1.4,
    })) : [];

    const isBannerForTexts = (p, b) => p.fill && texts.some(t => t.inverse && Math.abs(t.y - b.centerY) < 12);

    const paths = rawPaths.filter(p => {
      const b = getPathBounds(p.d);
      if (!b) return false;
      if (isBannerForTexts(p, b)) return true;
      const w = b.maxX - b.minX;
      const h = b.maxY - b.minY;
      // Drop giant hollow cages / boxes that swallow the coaster
      if (w > 52 && h > 25 && !p.fill) return false;
      return true;
    }).map(p => {
      const b = getPathBounds(p.d);
      if (!b || isBannerForTexts(p, b)) return p;
      const w = b.maxX - b.minX;
      const h = b.maxY - b.minY;
      // Scale down any bulky illustration to keep it an elegant compact accent (lines h <= 2 are separators)
      const isSeparatorLine = h <= 2;
      if (!isSeparatorLine && (w > 34 || h > 13)) {
        const scale = Math.min(30 / Math.max(w, 1), 11 / Math.max(h, 1));
        return { ...p, d: transformPath(p.d, 0, 0, scale, b.centerX, b.centerY) };
      }
      return p;
    });

    let symbol = art.symbol || null;
    let finalPaths = paths;
    if (isSquare) {
      if (!symbol || symbol === 'auto') {
        const fullContext = `${title} ${concept} ${texts.map(t => t.text).join(' ')}`;
        symbol = detectSymbolFromText(fullContext) || (index === 0 ? 'laurea-alloro' : (index === 1 ? 'none' : 'laurea-alloro'));
      }
      const sym = getCapSymbol(symbol);
      if (symbol !== 'none' && sym) {
        finalPaths = [{ d: sym.topPath, fill: sym.fill ?? false, strokeWidth: sym.strokeWidth ?? 1.5 }];
      } else {
        symbol = 'none';
        finalPaths = [];
      }
      if (symbol !== 'none' && texts.length >= 1) {
        if (texts.length === 1) {
          texts[0].y = Math.max(54, texts[0].y);
        } else if (texts.length === 2) {
          if (texts[0].y < 48) texts[0].y = 48;
          if (texts[1].y < texts[0].y + 16) texts[1].y = Math.min(84, texts[0].y + 18);
        } else if (texts.length >= 3) {
          if (texts[0].y < 44) texts[0].y = 44;
          if (texts[1].y < texts[0].y + 14) texts[1].y = texts[0].y + 14;
          if (texts[2].y < texts[1].y + 14) texts[2].y = Math.min(84, texts[1].y + 14);
        }
      }
    }

    return {
      title,
      concept,
      background,
      foreground,
      texts,
      paths: finalPaths,
      ...(isSquare ? { symbol } : {}),
    };
  });

  const seen = new Set();
  for (let i = 0; i < cleaned.length; i++) {
    const art = cleaned[i];
    let key = art.texts.map(t => t.text).join(' ').toLocaleLowerCase('it');
    if (seen.has(key)) {
      if (art.texts.length > 0) {
        const last = art.texts[art.texts.length - 1];
        const mark = i === 1 ? '!' : '…';
        if (!last.text.endsWith(mark) && last.text.length + 1 <= 24) {
          last.text += mark;
        } else if (last.text.length + 4 <= 24) {
          last.text = `${last.text} · ${i + 1}`;
        }
      }
      key = art.texts.map(t => t.text).join(' ').toLocaleLowerCase('it');
    }
    seen.add(key);
  }

  return cleaned;
}

export function refineArtwork(art, options = {}) {
  if (!art || !Array.isArray(art.texts) || !Array.isArray(art.paths)) return art;
  const isSquare = options?.shape === 'square' || options?.target === 'cap' || art.symbol !== undefined;
  const texts = art.texts.map(t => ({ ...t }));
  texts.sort((a, b) => a.y - b.y);

  const getTextBounds = (ts) => ts.map(t => {
    const w = Math.min(t.maxWidth, measuredTextWidth(t.text, t.size, t.font));
    const left = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2;
    return {
      left: left - 2,
      right: left + w + 2,
      top: t.y - t.size - 1.5,
      bottom: t.y + 2.5,
    };
  });

  let textBounds = getTextBounds(texts);
  const pathData = art.paths.map(p => ({ p, b: getPathBounds(p.d) })).filter(x => x.b !== null);
  const isBanner = (p, b) => p.fill && texts.some(t => t.inverse && Math.abs(t.y - b.centerY) < 12);

  const anyPathCollision = pathData.some(({ p, b }) => {
    if (isBanner(p, b)) return false;
    return textBounds.some(tb => !(b.maxX < tb.left || b.minX > tb.right || b.maxY < tb.top || b.minY > tb.bottom));
  });

  let anyTextOverlap = false;
  for (let i = 1; i < texts.length; i++) {
    if (texts[i].y - texts[i].size < texts[i - 1].y + 2 + 2) {
      anyTextOverlap = true;
      break;
    }
  }

  if (!anyPathCollision && !anyTextOverlap && (isSquare || pathData.every(x => x.b.maxRadius <= 40.5))) {
    return art;
  }

  const illustrations = pathData.filter(x => !isBanner(x.p, x.b) && (x.b.maxY - x.b.minY > 6 || x.b.maxX - x.b.minX > 15));
  let hasTopGraphic = false;
  let hasBottomGraphic = false;
  for (const { b } of illustrations) {
    if (b.centerY < 44) hasTopGraphic = true;
    else if (b.centerY > 54) hasBottomGraphic = true;
  }

  let candidatePaths = art.paths;
  if (hasTopGraphic && hasBottomGraphic) {
    candidatePaths = candidatePaths.filter(p => {
      const b = getPathBounds(p.d);
      if (!b || isBanner(p, b)) return true;
      return b.centerY <= 49;
    });
    hasBottomGraphic = false;
  }

  const textCenter = hasTopGraphic && !hasBottomGraphic ? 56 : (hasBottomGraphic && !hasTopGraphic ? 42 : 49);
  const gap = texts.length === 2 ? 5 : 4;
  const totalTextHeight = texts.reduce((sum, t) => sum + t.size, 0) + gap * (texts.length - 1);

  let currentY = textCenter - totalTextHeight / 2;
  for (const t of texts) {
    t.y = Math.round((currentY + t.size * 0.85) * 10) / 10;
    currentY += t.size + gap;
    if (t.anchor === 'middle') t.x = 50;
    const dy = Math.max(Math.abs(t.y - t.size - 49), Math.abs(t.y + 2 - 49));
    if (dy < 41.5) {
      const maxSafeW = Math.floor(2 * Math.sqrt(41.5 * 41.5 - dy * dy) * 10) / 10;
      if (t.maxWidth > maxSafeW) t.maxWidth = Math.max(15, maxSafeW);
    }
  }

  textBounds = getTextBounds(texts);
  const allTextTop = Math.min(...textBounds.map(b => b.top));
  const allTextBottom = Math.max(...textBounds.map(b => b.bottom));

  const refinedPaths = candidatePaths.map(p => {
    const b = getPathBounds(p.d);
    if (!b) return p;
    if (isBanner(p, b)) return p;

    const collides = textBounds.some(tb =>
      !(b.maxX < tb.left || b.minX > tb.right || b.maxY < tb.top || b.minY > tb.bottom)
    );

    let newD = p.d;
    if (collides) {
      const height = b.maxY - b.minY;
      if (b.centerY < 49) {
        const targetMaxY = Math.max(22, allTextTop - 4);
        let scale = 1;
        if (targetMaxY - height < 14) scale = Math.max(0.35, (targetMaxY - 14) / Math.max(height, 1));
        newD = p.d.replace(/([a-df-z])([^a-df-z]*)/gi, (match, cmd, numStr) => {
          const isRel = cmd === cmd.toLowerCase() && cmd !== 'z';
          const c = cmd.toUpperCase();
          const nums = numStr.trim().match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) || [];
          if (!nums.length) return match;
          const transformed = [];
          const mapY = (y) => targetMaxY - (b.maxY - y) * scale;
          const mapX = (x) => b.centerX + (x - b.centerX) * scale;
          if (c === 'H') {
            for (const x of nums) transformed.push(isRel ? x * scale : mapX(x));
          } else if (c === 'V') {
            for (const y of nums) transformed.push(isRel ? y * scale : mapY(y));
          } else if (['M', 'L', 'T'].includes(c)) {
            for (let i = 0; i + 1 < nums.length; i += 2) {
              transformed.push(
                isRel ? nums[i] * scale : mapX(nums[i]),
                isRel ? nums[i + 1] * scale : mapY(nums[i + 1])
              );
            }
          } else {
            return match;
          }
          return `${c} ${transformed.map(v => Math.round(v * 100) / 100).join(' ')} `;
        });
      } else {
        const targetMinY = Math.min(68, allTextBottom + 4);
        let scale = 1;
        if (targetMinY + height > 82) scale = Math.max(0.35, (82 - targetMinY) / Math.max(height, 1));
        newD = p.d.replace(/([a-df-z])([^a-df-z]*)/gi, (match, cmd, numStr) => {
          const isRel = cmd === cmd.toLowerCase() && cmd !== 'z';
          const c = cmd.toUpperCase();
          const nums = numStr.trim().match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) || [];
          if (!nums.length) return match;
          const transformed = [];
          const mapY = (y) => targetMinY + (y - b.minY) * scale;
          const mapX = (x) => b.centerX + (x - b.centerX) * scale;
          if (c === 'H') {
            for (const x of nums) transformed.push(isRel ? x * scale : mapX(x));
          } else if (c === 'V') {
            for (const y of nums) transformed.push(isRel ? y * scale : mapY(y));
          } else if (['M', 'L', 'T'].includes(c)) {
            for (let i = 0; i + 1 < nums.length; i += 2) {
              transformed.push(
                isRel ? nums[i] * scale : mapX(nums[i]),
                isRel ? nums[i + 1] * scale : mapY(nums[i + 1])
              );
            }
          } else {
            return match;
          }
          return `${c} ${transformed.map(v => Math.round(v * 100) / 100).join(' ')} `;
        });
      }
    }

    const newB = getPathBounds(newD);
    if (!isSquare && newB && newB.maxRadius > 40.5) {
      const scaleDown = 40 / newB.maxRadius;
      newD = transformPath(newD, 0, 0, scaleDown, 50, 49);
    }

    return { ...p, d: newD };
  }).filter(p => {
    const finalB = getPathBounds(p.d);
    if (!finalB) return false;
    if (isBanner(p, finalB)) return true;
    const stillCollides = textBounds.some(tb =>
      !(finalB.maxX < tb.left || finalB.minX > tb.right || finalB.maxY < tb.top || finalB.minY > tb.bottom)
    );
    return !stillCollides;
  });

  return { ...art, texts, paths: refinedPaths };
}

export function validateArtworks(value, palette, options = {}) {
  if (!Array.isArray(value) || value.length !== 3) throw new Error('Expected three artworks');
  const isSquare = options?.shape === 'square' || options?.target === 'cap';
  const colors = new Set(palette.map(color => color.hex));
  const result = value.map(art => {
    if (!art || typeof art.title !== 'string' || art.title.trim().length < 1 || art.title.length > 40 ||
      typeof art.concept !== 'string' || art.concept.trim().length < 1 || art.concept.length > 160 ||
      !colors.has(art.background) || !colors.has(art.foreground) || art.background === art.foreground ||
      !Array.isArray(art.texts) || art.texts.length < 1 || art.texts.length > 5 ||
      !Array.isArray(art.paths) || art.paths.length > 12) throw new Error('Invalid artwork');
    for (const t of art.texts) {
      if (!validLine(t.text) || !finite(t.x, 10, 90) || !finite(t.y, 11, 89) || !finite(t.size, 5, 23) ||
        !finite(t.maxWidth, 15, 82) || !['sans', 'serif', 'mono'].includes(t.font) ||
        !['start', 'middle', 'end'].includes(t.anchor) || typeof t.inverse !== 'boolean') throw new Error('Invalid text');
      const left = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - t.maxWidth : t.x - t.maxWidth / 2;
      const right = left + t.maxWidth;
      if (left < (isSquare ? 7 : 8) || right > (isSquare ? 93 : 92) || t.y - t.size < (isSquare ? 6 : 8) || t.y + 2 > (isSquare ? 93 : 91)) throw new Error('Text outside safe area');
      if (!isSquare) {
        for (const x of [left, right]) for (const y of [t.y - t.size, t.y + 2]) {
          if (Math.hypot(x - 50, y - 49) > 43) throw new Error('Text outside circular safe area');
        }
      }
    }
    for (const p of art.paths) {
      const maxPathLen = isSquare ? 15000 : 600;
      if (typeof p.d !== 'string' || p.d.length < 4 || p.d.length > maxPathLen || !pathPattern.test(p.d) ||
        typeof p.fill !== 'boolean' || !finite(p.strokeWidth, 0, 3)) throw new Error('Invalid path');
    }
    const clean = {
      title: art.title.trim(),
      concept: art.concept.trim(),
      background: art.background,
      foreground: art.foreground,
      texts: art.texts.map(t => ({ ...t, text: t.text.trim() })),
      paths: art.paths,
      ...(art.symbol ? { symbol: art.symbol } : {}),
    };
    return refineArtwork(clean, options);
  });
  if (new Set(result.map(art => art.texts.map(t => t.text).join(' ').toLocaleLowerCase('it'))).size !== 3) throw new Error('Duplicate artwork');
  return result;
}

