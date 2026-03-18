// Biome themes per difficulty — each has 5 zones that transition as the player climbs.
// Inspired by: Downwell (layered descent), Celeste (emotional arc), Hollow Knight (biome identity),
// Dead Cells (atmosphere shift). Adapted for ascending through an alien mega-structure in space.
const BIOME_THEMES = {
  // EASY — "Stellar Garden": inviting, luminous, nature-meets-space
  easy: [
    { name: 'Crystal Caverns',   dark: '#0a0e1a', mid: '#121e30', edge: '#1a2e44', accent: '#55bbee', bg: '#080c18' },
    { name: 'Nebula Gardens',    dark: '#12081a', mid: '#201030', edge: '#2e1844', accent: '#bb66dd', bg: '#0e0614' },
    { name: 'Biolume Reef',      dark: '#081410', mid: '#102820', edge: '#183a2e', accent: '#44ddaa', bg: '#060f0c' },
    { name: 'Aurora Spire',      dark: '#0a1014', mid: '#142028', edge: '#1e3038', accent: '#66ccff', bg: '#080e12' },
    { name: 'Starlight Summit',  dark: '#10100e', mid: '#202018', edge: '#303020', accent: '#eedd66', bg: '#0c0c0a' },
  ],
  // MEDIUM — "Industrial Ascent": mechanical, neon-lit, escalating tension
  medium: [
    { name: 'Steel Foundry',     dark: '#0a0e14', mid: '#141c28', edge: '#1e2a3a', accent: '#4488cc', bg: '#080b12' },
    { name: 'Neon Underworks',   dark: '#12081a', mid: '#22102e', edge: '#341840', accent: '#ee55aa', bg: '#0e0614' },
    { name: 'Reactor Depths',    dark: '#140a08', mid: '#281410', edge: '#3a1e18', accent: '#ee7733', bg: '#100806' },
    { name: 'Data Nexus',        dark: '#080e14', mid: '#101e28', edge: '#182e3a', accent: '#33ddcc', bg: '#060b10' },
    { name: 'Command Bridge',    dark: '#14120a', mid: '#282214', edge: '#3a321e', accent: '#ccaa44', bg: '#100e08' },
  ],
  // HARD — "Descent into Chaos": hostile, alien, oppressive, infernal
  hard: [
    { name: 'Obsidian Maw',     dark: '#0e0606', mid: '#1e0c0c', edge: '#301414', accent: '#cc3333', bg: '#0a0404' },
    { name: 'Acid Veins',        dark: '#060e06', mid: '#0c1e0c', edge: '#143014', accent: '#55dd22', bg: '#040a04' },
    { name: 'Flesh Corridors',   dark: '#140808', mid: '#2a1010', edge: '#3e1818', accent: '#dd5566', bg: '#100606' },
    { name: 'Void Rift',         dark: '#0a0614', mid: '#140c22', edge: '#1e1232', accent: '#9944ff', bg: '#080510' },
    { name: 'Hellfire Core',     dark: '#141004', mid: '#2a2008', edge: '#3e300c', accent: '#ff8822', bg: '#100c04' },
  ],
};

class Terrain {
  constructor(side, width, height, startY = 0, safeStart = false, difficulty = 'medium') {
    this.side = side; // 'left' or 'right'
    this.width = width;
    this.height = height;
    this.startY = startY;
    this.safeStart = safeStart;
    this.difficulty = difficulty;
    this.hillPoints = [];

    // Visual details
    this.panelDetails = [];
    this.bouncePads = [];
    this.runningLights = [];
    this.bounceImpacts = []; // active glow animations

    this.generateTerrain();
    this.generateDetails();
  }

  // Get the biome palette for a given world-Y position
  getBiomeAt(worldY) {
    const themes = BIOME_THEMES[this.difficulty] || BIOME_THEMES.medium;
    const heightFromStart = Math.max(0, -worldY);
    // Each biome zone spans 3000 units, cycling through the 5 themes
    const zoneSize = 3000;
    const rawIndex = heightFromStart / zoneSize;
    const index = Math.floor(rawIndex) % themes.length;
    const nextIndex = (index + 1) % themes.length;
    // Smooth blend in transition region (last 20% of each zone)
    const inZone = rawIndex - Math.floor(rawIndex);
    const blendStart = 0.8;
    let blend = 0;
    if (inZone > blendStart) {
      blend = (inZone - blendStart) / (1 - blendStart);
    }
    if (blend < 0.01) return themes[index];
    // Lerp colors
    return this._lerpBiome(themes[index], themes[nextIndex], blend);
  }

  _lerpBiome(a, b, t) {
    return {
      name: t < 0.5 ? a.name : b.name,
      dark: this._lerpHex(a.dark, b.dark, t),
      mid: this._lerpHex(a.mid, b.mid, t),
      edge: this._lerpHex(a.edge, b.edge, t),
      accent: this._lerpHex(a.accent, b.accent, t),
      bg: this._lerpHex(a.bg, b.bg, t),
    };
  }

  _lerpHex(hex1, hex2, t) {
    const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
    const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Deterministic hash — same input always gives same output
  static hash(n) {
    let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  // Second hash for variety
  static hash2(n) {
    let x = Math.sin(n * 269.5 + 183.3) * 43758.5453;
    return x - Math.floor(x);
  }

  generateTerrain() {
    this.hillPoints = [];

    const segmentHeight = 80;
    const numSegments = Math.floor(this.height / segmentHeight) + 2;
    const centerX = this.width / 2;
    const isLeft = this.side === 'left';
    // Snap startY to the segment grid so points always land on exact multiples.
    // This prevents sub-pixel jitter when terrain is regenerated from a different startY.
    const snappedStartY = Math.round(this.startY / segmentHeight) * segmentHeight;

    // Absolute safety limits
    const absoluteMinCorridor = 140;
    const wallMinX = this.width * 0.05;
    const wallMaxX = this.width * 0.95;

    // Zone system — each zone is a stretch of terrain with a distinct personality
    const zoneTypes = [
      'wide',       // Breather — open corridor, easy, lets player relax
      'rolling',    // Smooth sine waves, rhythmic
      'zigzag',     // Walls alternate jutting in — requires quick wall switches
      'funnel',     // Gradually narrows then opens — closing blast doors
      'cavern',     // Both walls pull back — big open space, enemies matter more
      'pinch',      // Rapid tight/wide alternation — compactor sections
      'drift',      // Corridor slowly drifts left/right — tilted corridor
      'teeth',      // Interlocking bumps from alternating sides — machinery
    ];

    const zoneSegmentLength = 15; // segments per zone

    const safeStartMinY = this.safeStart ? this.startY - 1200 : -Infinity;

    let prevX = isLeft ? this.width * 0.15 : this.width * 0.85;

    for (let i = 0; i < numSegments; i++) {
      const y = snappedStartY - i * segmentHeight;

      if (this.safeStart && y > safeStartMinY) {
        const x = isLeft ? this.width * 0.15 : this.width * 0.85;
        prevX = x;
        this.hillPoints.push({ x, y });
        continue;
      }

      const absSegIndex = Math.round(-y / segmentHeight);

      const heightFromStart = Math.max(0, -y);
      // Scale terrain narrowing by game difficulty — easy narrows slower, hard narrows faster
      const diffDivisor = this.difficulty === 'easy' ? 25000 : this.difficulty === 'hard' ? 12000 : 15000;
      const difficulty = Math.min(1.0, heightFromStart / diffDivisor);

      const zoneIndex = Math.floor(absSegIndex / zoneSegmentLength);
      const zone = zoneTypes[Math.floor(Terrain.hash(zoneIndex * 53.1) * zoneTypes.length)];
      const segInZone = ((absSegIndex % zoneSegmentLength) + zoneSegmentLength) % zoneSegmentLength;
      const zoneProgress = segInZone / zoneSegmentLength;

      const transitionLen = 3;
      let blend = 1.0;
      if (segInZone < transitionLen) {
        blend = segInZone / transitionLen;
      } else if (segInZone > zoneSegmentLength - transitionLen) {
        blend = (zoneSegmentLength - segInZone) / transitionLen;
      }

      const baseCorridorHalf = 150 - difficulty * 50;

      let targetX;

      switch (zone) {
        case 'wide': {
          const gentle = Math.sin(absSegIndex * 0.08) * 30;
          targetX = isLeft
            ? this.width * 0.12 + gentle
            : this.width * 0.88 - gentle;
          break;
        }

        case 'rolling': {
          const amp = 60 + difficulty * 80;
          const wave = Math.sin(absSegIndex * 0.15) * amp
                     + Math.sin(absSegIndex * 0.07) * (amp * 0.4)
                     + Math.sin(absSegIndex * 0.3) * (amp * 0.2);
          targetX = isLeft
            ? this.width * 0.15 + wave * 0.5
            : this.width * 0.85 - wave * 0.5;
          break;
        }

        case 'zigzag': {
          const zigPeriod = 6 - difficulty * 2;
          const zig = Math.sin(absSegIndex * (Math.PI / zigPeriod));
          const push = (80 + difficulty * 60) * zig;
          targetX = isLeft
            ? this.width * 0.15 + Math.max(0, push)
            : this.width * 0.85 - Math.max(0, -push);
          break;
        }

        case 'funnel': {
          const narrowing = Math.sin(zoneProgress * Math.PI);
          const squeeze = narrowing * (100 + difficulty * 60);
          targetX = isLeft
            ? this.width * 0.15 + squeeze
            : this.width * 0.85 - squeeze;
          break;
        }

        case 'cavern': {
          const openAmount = 40 + Math.sin(absSegIndex * 0.12) * 20;
          const bump = Math.sin(absSegIndex * 0.25) * (30 + difficulty * 20);
          targetX = isLeft
            ? this.width * 0.08 + bump - openAmount
            : this.width * 0.92 - bump + openAmount;
          break;
        }

        case 'pinch': {
          const smooth = Math.sin(absSegIndex * 0.6) * (100 + difficulty * 50) * 0.5;
          targetX = isLeft
            ? this.width * 0.15 + smooth
            : this.width * 0.85 - smooth;
          break;
        }

        case 'drift': {
          const driftAmount = 80 + difficulty * 40;
          const drift = Math.sin(absSegIndex * 0.05) * driftAmount;
          const wave = Math.sin(absSegIndex * 0.2) * 30;
          targetX = isLeft
            ? this.width * 0.15 + drift + wave
            : this.width * 0.85 + drift - wave;
          break;
        }

        case 'teeth': {
          const toothSize = 70 + difficulty * 50;
          const toothPhase = absSegIndex * 0.25;
          const leftBump = Math.max(0, Math.sin(toothPhase)) * toothSize;
          const rightBump = Math.max(0, Math.sin(toothPhase + Math.PI)) * toothSize;
          targetX = isLeft
            ? this.width * 0.15 + leftBump
            : this.width * 0.85 - rightBump;
          break;
        }

        default: {
          targetX = isLeft ? this.width * 0.15 : this.width * 0.85;
        }
      }

      const neutralX = isLeft ? this.width * 0.15 : this.width * 0.85;
      targetX = neutralX + (targetX - neutralX) * blend;

      const sideOffset = isLeft ? 0 : 5555.5;
      const noise = (Terrain.hash(absSegIndex * 3.7 + sideOffset) - 0.5) * (15 + difficulty * 15);
      targetX += noise;

      targetX = prevX * 0.3 + targetX * 0.7;

      if (isLeft) {
        targetX = Math.max(wallMinX, targetX);
        targetX = Math.min(centerX - absoluteMinCorridor / 2, targetX);
      } else {
        targetX = Math.min(wallMaxX, targetX);
        targetX = Math.max(centerX + absoluteMinCorridor / 2, targetX);
      }

      prevX = targetX;
      this.hillPoints.push({ x: targetX, y });
    }
  }

  generateDetails() {
    this.panelDetails = [];
    this.bouncePads = [];
    this.runningLights = [];

    const isLeft = this.side === 'left';
    const sideHash = isLeft ? 0 : 7777;

    // Generate panel seam lines and details at intervals along the wall
    // Use absolute segment index (absIdx) for ALL placement decisions so that
    // details remain stable when terrain is regenerated from a different startY.
    for (let i = 0; i < this.hillPoints.length - 1; i++) {
      const p = this.hillPoints[i];
      const absIdx = Math.round(-p.y / 80);
      const h = Terrain.hash(absIdx * 13.3 + sideHash);

      // Panel seams every ~3 segments (absolute)
      if (absIdx % 3 === 0) {
        this.panelDetails.push({
          y: p.y,
          x: p.x,
          type: 'seam',
        });
      }

      // Vents on ~20% of segments
      if (h > 0.8) {
        this.panelDetails.push({
          y: p.y,
          x: p.x,
          type: 'vent',
          width: 20 + Terrain.hash2(absIdx * 7.1 + sideHash) * 15,
          height: 8 + Terrain.hash(absIdx * 11.1 + sideHash) * 6,
        });
      }

      // Rivets on ~30% of segments
      if (h > 0.5 && h <= 0.8) {
        this.panelDetails.push({
          y: p.y,
          x: p.x,
          type: 'rivet',
        });
      }

      // Bounce pads every ~5 segments (absolute)
      if (absIdx % 5 === 2) {
        this.bouncePads.push({
          y: p.y,
          x: p.x,
          width: 24,
          height: 40,
          glowIntensity: 0,
        });
      }
    }

    // Running lights along the wall edge (every other segment, absolute)
    for (let i = 0; i < this.hillPoints.length; i++) {
      const p = this.hillPoints[i];
      const absIdx = Math.round(-p.y / 80);
      // Only place lights on even absolute indices for consistent spacing
      if (absIdx % 2 !== 0) continue;
      this.runningLights.push({
        y: p.y,
        x: p.x,
        phase: Terrain.hash(absIdx * 5.3 + sideHash) * Math.PI * 2,
        speed: 0.03 + Terrain.hash2(absIdx * 9.1 + sideHash) * 0.02,
      });
    }
  }

  // Called when the bird bounces off this wall at a given Y
  addBounceImpact(y) {
    // Find nearest bounce pad
    let nearestPad = null;
    let nearestDist = Infinity;
    for (const pad of this.bouncePads) {
      const dist = Math.abs(pad.y - y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPad = pad;
      }
    }
    if (nearestPad && nearestDist < 200) {
      nearestPad.glowIntensity = 1.0;
    }

    // Add ripple impact
    this.bounceImpacts.push({
      y,
      life: 1.0,
      maxRadius: 30,
    });
  }

  update(time) {
    // Decay bounce pad glows
    for (const pad of this.bouncePads) {
      if (pad.glowIntensity > 0) {
        pad.glowIntensity *= 0.92;
        if (pad.glowIntensity < 0.01) pad.glowIntensity = 0;
      }
    }

    // Decay bounce impacts (in-place removal to avoid array allocation)
    for (let i = this.bounceImpacts.length - 1; i >= 0; i--) {
      this.bounceImpacts[i].life -= 0.03;
      if (this.bounceImpacts[i].life <= 0) {
        this.bounceImpacts[i] = this.bounceImpacts[this.bounceImpacts.length - 1];
        this.bounceImpacts.pop();
      }
    }
  }

  draw(ctx, cameraY) {
    const canvasH = ctx.canvas.logicalHeight || ctx.canvas.height;
    const isLeft = this.side === 'left';

    ctx.save();

    // --- Build wall shape path once, reuse for fill + edge stroke ---
    const wallPath = new Path2D();
    if (isLeft) {
      wallPath.moveTo(0, this.hillPoints[0].y - cameraY);
    } else {
      wallPath.moveTo(this.width, this.hillPoints[0].y - cameraY);
    }

    for (let i = 0; i < this.hillPoints.length - 1; i++) {
      const current = this.hillPoints[i];
      const next = this.hillPoints[i + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      wallPath.quadraticCurveTo(
        current.x, current.y - cameraY,
        midX, midY - cameraY
      );
    }

    const lastPoint = this.hillPoints[this.hillPoints.length - 1];
    wallPath.lineTo(lastPoint.x, lastPoint.y - cameraY);

    if (isLeft) {
      wallPath.lineTo(0, lastPoint.y - cameraY);
    } else {
      wallPath.lineTo(this.width, lastPoint.y - cameraY);
    }
    wallPath.closePath();

    // --- Build edge-only path (no closePath, for strokes) ---
    const edgePath = new Path2D();
    edgePath.moveTo(this.hillPoints[0].x, this.hillPoints[0].y - cameraY);
    for (let i = 0; i < this.hillPoints.length - 1; i++) {
      const current = this.hillPoints[i];
      const next = this.hillPoints[i + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      edgePath.quadraticCurveTo(
        current.x, current.y - cameraY,
        midX, midY - cameraY
      );
    }

    // --- Base fill: themed gradient based on difficulty + height ---
    const sampleY = cameraY + canvasH * 0.5;
    // Cache biome to avoid recalculating if camera hasn't moved far
    const biomeKey = Math.round(sampleY / 500);
    if (this._cachedBiomeKey !== biomeKey) {
      this._cachedBiome = this.getBiomeAt(sampleY);
      this._cachedBiomeKey = biomeKey;
      this._cachedAccentRgb = this._hexToRgb(this._cachedBiome.accent);
    }
    const biome = this._cachedBiome;
    const accentRgb = this._cachedAccentRgb;

    const gradX = isLeft ? 0 : this.width;
    const gradEnd = isLeft ? 180 : this.width - 180;
    const gradient = ctx.createLinearGradient(gradX, 0, gradEnd, 0);
    gradient.addColorStop(0, biome.dark);
    gradient.addColorStop(0.6, biome.mid);
    gradient.addColorStop(1, biome.edge);
    ctx.fillStyle = gradient;
    ctx.fill(wallPath);

    // --- Clip to wall shape for interior details ---
    ctx.save();
    ctx.clip(wallPath);

    // Batch all panel details by type to minimize state changes
    // 1) All seam highlight lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const detail of this.panelDetails) {
      if (detail.type !== 'seam') continue;
      const screenY = detail.y - cameraY;
      if (screenY < -50 || screenY > canvasH + 50) continue;
      const seamX = isLeft ? 0 : detail.x;
      const seamEndX = isLeft ? detail.x : this.width;
      ctx.moveTo(seamX, screenY);
      ctx.lineTo(seamEndX, screenY);
    }
    ctx.stroke();

    // 2) All seam shadow lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    for (const detail of this.panelDetails) {
      if (detail.type !== 'seam') continue;
      const screenY = detail.y - cameraY;
      if (screenY < -50 || screenY > canvasH + 50) continue;
      const seamX = isLeft ? 0 : detail.x;
      const seamEndX = isLeft ? detail.x : this.width;
      ctx.moveTo(seamX, screenY + 1);
      ctx.lineTo(seamEndX, screenY + 1);
    }
    ctx.stroke();

    // 3) All vents - backgrounds batched
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    for (const detail of this.panelDetails) {
      if (detail.type !== 'vent') continue;
      const screenY = detail.y - cameraY;
      if (screenY < -50 || screenY > canvasH + 50) continue;
      const ventX = isLeft ? detail.x - detail.width - 10 : detail.x + 10;
      ctx.fillRect(ventX, screenY - detail.height / 2, detail.width, detail.height);
    }
    // Vent slats batched
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const detail of this.panelDetails) {
      if (detail.type !== 'vent') continue;
      const screenY = detail.y - cameraY;
      if (screenY < -50 || screenY > canvasH + 50) continue;
      const ventX = isLeft ? detail.x - detail.width - 10 : detail.x + 10;
      for (let s = 1; s < 3; s++) {
        const slatY = screenY - detail.height / 2 + (detail.height / 3) * s;
        ctx.moveTo(ventX, slatY);
        ctx.lineTo(ventX + detail.width, slatY);
      }
    }
    ctx.stroke();

    // 4) All rivets batched
    ctx.fillStyle = 'rgba(180, 180, 200, 0.2)';
    ctx.beginPath();
    for (const detail of this.panelDetails) {
      if (detail.type !== 'rivet') continue;
      const screenY = detail.y - cameraY;
      if (screenY < -50 || screenY > canvasH + 50) continue;
      const rivetX = isLeft ? detail.x - 8 : detail.x + 8;
      ctx.moveTo(rivetX + 2, screenY);
      ctx.arc(rivetX, screenY, 2, 0, Math.PI * 2);
    }
    ctx.fill();
    // Rivet highlights batched
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    for (const detail of this.panelDetails) {
      if (detail.type !== 'rivet') continue;
      const screenY = detail.y - cameraY;
      if (screenY < -50 || screenY > canvasH + 50) continue;
      const rivetX = isLeft ? detail.x - 8 : detail.x + 8;
      ctx.moveTo(rivetX - 0.5 + 1, screenY - 0.5);
      ctx.arc(rivetX - 0.5, screenY - 0.5, 1, 0, Math.PI * 2);
    }
    ctx.fill();

    // Bounce pads (fewer, drawn individually but still inside clip)
    for (const pad of this.bouncePads) {
      const screenY = pad.y - cameraY;
      if (screenY < -60 || screenY > canvasH + 60) continue;

      const padX = isLeft ? pad.x - pad.width - 2 : pad.x + 2;
      const baseAlpha = 0.3 + pad.glowIntensity * 0.7;

      ctx.fillStyle = `rgba(${accentRgb}, ${baseAlpha * 0.3})`;
      ctx.beginPath();
      ctx.roundRect(padX, screenY - pad.height / 2, pad.width, pad.height, 3);
      ctx.fill();

      ctx.strokeStyle = `rgba(${accentRgb}, ${baseAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const chevronDir = isLeft ? 1 : -1;
      const cx = padX + pad.width / 2;
      ctx.strokeStyle = `rgba(${accentRgb}, ${0.4 + pad.glowIntensity * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let c = -1; c <= 1; c++) {
        const cy = screenY + c * 12;
        ctx.moveTo(cx - chevronDir * 4, cy - 4);
        ctx.lineTo(cx + chevronDir * 4, cy);
        ctx.lineTo(cx - chevronDir * 4, cy + 4);
      }
      ctx.stroke();

      if (pad.glowIntensity > 0.05) {
        ctx.fillStyle = `rgba(${accentRgb}, ${pad.glowIntensity * 0.4})`;
        ctx.beginPath();
        ctx.roundRect(padX - 3, screenY - pad.height / 2 - 3, pad.width + 6, pad.height + 6, 5);
        ctx.fill();
      }
    }

    ctx.restore(); // End clip

    // --- Wall edge: reuse edgePath (no second loop) ---
    ctx.strokeStyle = `rgba(${accentRgb}, 0.5)`;
    ctx.lineWidth = 2;
    ctx.stroke(edgePath);

    ctx.strokeStyle = `rgba(${accentRgb}, 0.15)`;
    ctx.lineWidth = 6;
    ctx.stroke(edgePath);

    // --- Running lights along the edge --- batched with fixed radius
    ctx.fillStyle = `rgba(${accentRgb}, 0.5)`;
    ctx.beginPath();
    for (const light of this.runningLights) {
      const screenY = light.y - cameraY;
      if (screenY < -20 || screenY > canvasH + 20) continue;
      ctx.moveTo(light.x + 2, screenY);
      ctx.arc(light.x, screenY, 2, 0, Math.PI * 2);
    }
    ctx.fill();

    // --- Bounce impact ripples ---
    if (this.bounceImpacts.length > 0) {
      for (const impact of this.bounceImpacts) {
        const screenY = impact.y - cameraY;
        if (screenY < -50 || screenY > canvasH + 50) continue;

        const progress = 1 - impact.life;
        const radius = impact.maxRadius * progress;
        const alpha = impact.life * 0.6;
        // Cache wallX on the impact to avoid binary search each frame
        if (impact._wallX === undefined) {
          impact._wallX = isLeft ? this.getMaxXAtY(impact.y) : this.getMinXAtY(impact.y);
        }

        ctx.strokeStyle = `rgba(${accentRgb}, ${alpha})`;
        ctx.lineWidth = 2 * impact.life;
        ctx.beginPath();
        ctx.arc(impact._wallX, screenY, radius, 0, Math.PI * 2);
        ctx.stroke();

        if (impact.life > 0.7) {
          const flashAlpha = (impact.life - 0.7) * 3;
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(impact._wallX, screenY, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // Helper to convert hex color to rgb string — cached
  _hexToRgb(hex) {
    if (!Terrain._rgbCache) Terrain._rgbCache = {};
    if (Terrain._rgbCache[hex]) return Terrain._rgbCache[hex];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const result = `${r}, ${g}, ${b}`;
    Terrain._rgbCache[hex] = result;
    return result;
  }

  checkCollision(player) {
    for (let i = 0; i < this.hillPoints.length - 1; i++) {
      const p1 = this.hillPoints[i];
      const p2 = this.hillPoints[i + 1];

      const minY = Math.min(p1.y, p2.y) - 50;
      const maxY = Math.max(p1.y, p2.y) + 50;
      if (player.y >= minY && player.y <= maxY) {
        const collision = this.segmentCircleCollision(p1, p2, player);
        if (collision) {
          return collision;
        }
      }
    }
    return null;
  }

  segmentCircleCollision(p1, p2, player) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return null;

    const ndx = dx / len;
    const ndy = dy / len;

    const px = player.x - p1.x;
    const py = player.y - p1.y;

    const dot = px * ndx + py * ndy;
    const t = Math.max(0, Math.min(len, dot));

    const closestX = p1.x + ndx * t;
    const closestY = p1.y + ndy * t;

    const distX = player.x - closestX;
    const distY = player.y - closestY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    if (distance < player.radius + 15) {
      let normalX = -ndy;
      let normalY = ndx;

      if (this.side === 'left') {
        if (normalX < 0) {
          normalX = -normalX;
          normalY = -normalY;
        }
      } else {
        if (normalX > 0) {
          normalX = -normalX;
          normalY = -normalY;
        }
      }

      return {
        normal: { x: normalX, y: normalY },
        contactPoint: { x: closestX, y: closestY }
      };
    }

    return null;
  }

  getSlopeAt(y) {
    for (let i = 0; i < this.hillPoints.length - 1; i++) {
      if (y >= this.hillPoints[i].y && y <= this.hillPoints[i + 1].y) {
        const p1 = this.hillPoints[i];
        const p2 = this.hillPoints[i + 1];
        return (p2.y - p1.y) / (p2.x - p1.x);
      }
    }
    return 0;
  }

  // Binary search to find the segment containing Y (hillPoints are sorted by decreasing Y)
  _findSegmentIndex(y) {
    const pts = this.hillPoints;
    let lo = 0, hi = pts.length - 2;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const p1y = pts[mid].y;
      const p2y = pts[mid + 1].y;
      const minY = Math.min(p1y, p2y);
      const maxY = Math.max(p1y, p2y);
      if (y >= minY && y <= maxY) return mid;
      if (y > maxY) {
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    return -1;
  }

  getMaxXAtY(y) {
    const i = this._findSegmentIndex(y);
    if (i !== -1) {
      const p1 = this.hillPoints[i];
      const p2 = this.hillPoints[i + 1];
      const t = (y - p1.y) / (p2.y - p1.y);
      return p1.x + t * (p2.x - p1.x);
    }
    return this.side === 'left' ? 60 : this.width - 60;
  }

  getMinXAtY(y) {
    const i = this._findSegmentIndex(y);
    if (i !== -1) {
      const p1 = this.hillPoints[i];
      const p2 = this.hillPoints[i + 1];
      const t = (y - p1.y) / (p2.y - p1.y);
      return p1.x + t * (p2.x - p1.x);
    }
    return this.side === 'right' ? this.width - 60 : 60;
  }
}

export default Terrain;
