class CosmicSerpent {
  constructor(x, y, corridorLeft, corridorRight, screenWidth = 390) {
    const ss = Math.max(1, screenWidth / 390);
    this.ss = ss;
    this.x = x;
    this.y = y;
    this.radius = Math.round(12 * ss);
    this.active = true;

    this.vy = Math.random() * 15 + 25;
    this.corridorCenter = (corridorLeft + corridorRight) / 2;
    this.corridorWidth = corridorRight - corridorLeft;

    this.waveAmplitude = this.corridorWidth * 0.2;
    this.waveFrequency = 0.008 + Math.random() * 0.004;

    // Snake body segments
    this.numSegments = 18;
    this.segmentSpacing = Math.round(12 * ss);

    // Path history — the head leaves a trail that the body follows exactly.
    // This is how real snakes move: each body part traces the path the head took.
    this.pathHistory = [];
    const historyLen = this.numSegments * this.segmentSpacing;
    for (let i = 0; i < historyLen + 20; i++) {
      this.pathHistory.push({ x: x, y: y + i });
    }

    this.segments = [];
    for (let i = 0; i < this.numSegments; i++) {
      this.segments.push({ x: x, y: y + i * this.segmentSpacing });
    }

    this.totalDistance = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.glowPhase = Math.random() * Math.PI * 2;

    // Nebula color schemes
    const schemes = [
      { core: '#aaeeff', body: '#4488cc', outer: '#223366', glow: '#66bbff', eye: '#ffffff', particle: '#88ccff' },
      { core: '#ffaaee', body: '#cc4488', outer: '#662244', glow: '#ff66bb', eye: '#ffffff', particle: '#ffaadd' },
      { core: '#aaffcc', body: '#44cc88', outer: '#226644', glow: '#66ffaa', eye: '#ffffff', particle: '#88ffbb' },
      { core: '#ffddaa', body: '#cc8844', outer: '#664422', glow: '#ffaa66', eye: '#ffffff', particle: '#ffcc88' },
    ];
    this.colors = schemes[Math.floor(Math.random() * schemes.length)];

    // Constellation stars embedded along the body
    this.stars = [];
    for (let i = 0; i < 8; i++) {
      this.stars.push({
        segIndex: 1 + Math.floor(Math.random() * (this.numSegments - 2)),
        offsetX: (Math.random() - 0.5) * 10,
        offsetY: (Math.random() - 0.5) * 6,
        size: 1 + Math.random() * 1.5,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.03 + Math.random() * 0.04,
      });
    }

    // Trailing energy particles
    this.energyParticles = [];
    for (let i = 0; i < 12; i++) {
      this.energyParticles.push({
        segIndex: Math.floor(Math.random() * this.numSegments),
        angle: Math.random() * Math.PI * 2,
        dist: 8 + Math.random() * 12,
        speed: 0.5 + Math.random() * 1.5,
        size: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.4,
      });
    }
  }

  update(deltaTime) {
    this.phase += 0.03;
    this.glowPhase += 0.035;

    // Move head downward
    const moveAmount = this.vy * deltaTime;
    this.y += moveAmount;
    this.totalDistance += moveAmount;

    // Head follows a smooth compound sine wave for organic S-curves
    this.x = this.corridorCenter
      + Math.sin(this.totalDistance * this.waveFrequency) * this.waveAmplitude
      + Math.sin(this.totalDistance * this.waveFrequency * 2.3 + 1.7) * this.waveAmplitude * 0.3;

    // Record head position into path history (append + trim from end to avoid O(n) unshift)
    this.pathHistory.push({ x: this.x, y: this.y });
    // Keep history long enough for the full body
    const maxHistory = this.numSegments * this.segmentSpacing + 40;
    if (this.pathHistory.length > maxHistory * 2) {
      // Compact by copying tail instead of splice (avoids O(n) shift)
      const keep = this.pathHistory.slice(-maxHistory);
      this.pathHistory = keep;
    }

    // Place each segment along the recorded path at equal arc-length intervals.
    // pathHistory is newest-last, so walk backwards from the end (head).
    this.segments[0] = { x: this.x, y: this.y };
    let pathIdx = this.pathHistory.length - 1;
    let accumDist = 0;

    for (let i = 1; i < this.numSegments; i++) {
      const targetDist = i * this.segmentSpacing;

      // Walk backwards along path history until we've covered enough distance
      while (pathIdx > 0 && accumDist < targetDist) {
        const dx = this.pathHistory[pathIdx - 1].x - this.pathHistory[pathIdx].x;
        const dy = this.pathHistory[pathIdx - 1].y - this.pathHistory[pathIdx].y;
        const segLenSq = dx * dx + dy * dy;
        if (segLenSq < 0.001) { pathIdx--; continue; }

        const remaining = targetDist - accumDist;
        const remainingSq = remaining * remaining;
        if (remainingSq <= segLenSq) {
          // Interpolate within this path segment — only sqrt here
          const segLen = Math.sqrt(segLenSq);
          const t = remaining / segLen;
          this.segments[i] = {
            x: this.pathHistory[pathIdx].x + dx * t,
            y: this.pathHistory[pathIdx].y + dy * t,
          };
          accumDist = targetDist;
          break;
        } else {
          accumDist += Math.sqrt(segLenSq);
          pathIdx--;
        }
      }

      // Fallback if path isn't long enough yet
      if (accumDist < targetDist) {
        const first = this.pathHistory[0];
        this.segments[i] = { x: first.x, y: first.y };
      }
    }

    // Update energy particles orbit
    this.energyParticles.forEach(p => {
      p.angle += p.speed * deltaTime;
    });

    // Update star twinkle
    this.stars.forEach(s => {
      s.twinklePhase += s.twinkleSpeed;
    });
  }

  draw(ctx, cameraY) {
    ctx.save();

    const glowPulse = 0.7 + Math.sin(this.glowPhase) * 0.3;

    // === Energy particles orbiting body segments ===
    ctx.fillStyle = this.colors.particle;
    this.energyParticles.forEach(p => {
      const seg = this.segments[Math.min(p.segIndex, this.numSegments - 1)];
      const px = seg.x + Math.cos(p.angle) * p.dist;
      const py = (seg.y - cameraY) + Math.sin(p.angle) * p.dist * 0.5;
      ctx.globalAlpha = p.alpha * glowPulse;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // === Outer glow trail ===
    ctx.strokeStyle = this.colors.outer;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.15 * glowPulse;
    ctx.beginPath();
    ctx.moveTo(this.segments[0].x, this.segments[0].y - cameraY);
    for (let i = 1; i < this.numSegments; i++) {
      const seg = this.segments[i];
      const prev = this.segments[i - 1];
      const mx = (prev.x + seg.x) / 2;
      const my = ((prev.y + seg.y) / 2) - cameraY;
      ctx.quadraticCurveTo(prev.x, prev.y - cameraY, mx, my);
    }
    ctx.stroke();

    // === Main body with tapering width ===
    // Draw body as a series of tapered segments for a smooth snake feel
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.85;

    // Body fill — tapered stroke using individual segments
    for (let i = 0; i < this.numSegments - 1; i++) {
      const seg = this.segments[i];
      const next = this.segments[i + 1];
      const t = i / (this.numSegments - 1);
      // Width tapers: thick at head, thin at tail
      const width = 11 * (this.ss || 1) * (1 - t * 0.7);

      ctx.strokeStyle = this.colors.body;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(seg.x, seg.y - cameraY);
      ctx.lineTo(next.x, next.y - cameraY);
      ctx.stroke();
    }

    // Core highlight — thinner inner line
    ctx.globalAlpha = 0.5 + Math.sin(this.phase * 2) * 0.15;
    for (let i = 0; i < this.numSegments - 1; i++) {
      const seg = this.segments[i];
      const next = this.segments[i + 1];
      const t = i / (this.numSegments - 1);
      const width = 4 * (this.ss || 1) * (1 - t * 0.7);

      ctx.strokeStyle = this.colors.core;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(seg.x, seg.y - cameraY);
      ctx.lineTo(next.x, next.y - cameraY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // === Constellation stars along body ===
    ctx.fillStyle = '#ffffff';
    this.stars.forEach(s => {
      const seg = this.segments[s.segIndex];
      const screenY = seg.y - cameraY;
      const twinkle = 0.5 + Math.sin(s.twinklePhase) * 0.5;
      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc(seg.x + s.offsetX, screenY + s.offsetY, s.size * twinkle, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // === Head ===
    const headScreenY = this.y - cameraY;
    const nextSeg = this.segments[1];
    const headAngle = Math.atan2(this.y - nextSeg.y, this.x - nextSeg.x);

    ctx.save();
    ctx.translate(this.x, headScreenY);
    ctx.rotate(headAngle - Math.PI / 2);
    ctx.scale(this.ss || 1, this.ss || 1);

    // Head glow — simple circle instead of radial gradient for performance
    ctx.fillStyle = this.colors.body;
    ctx.globalAlpha = 0.4 * glowPulse;
    ctx.beginPath();
    ctx.arc(0, -2, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Head mask shape
    ctx.fillStyle = this.colors.body;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(9, -5);
    ctx.lineTo(8, 4);
    ctx.quadraticCurveTo(0, 8, -8, 4);
    ctx.lineTo(-9, -5);
    ctx.closePath();
    ctx.fill();

    // Inner mask highlight
    ctx.fillStyle = this.colors.core;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(6, -5);
    ctx.lineTo(5, 2);
    ctx.quadraticCurveTo(0, 5, -5, 2);
    ctx.lineTo(-6, -5);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Eye
    const eyePulse = 0.8 + Math.sin(this.phase * 3) * 0.2;
    ctx.fillStyle = '#000011';
    ctx.beginPath();
    ctx.ellipse(0, -4, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.colors.eye;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -4, 4 * eyePulse, 3 * eyePulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = this.colors.core;
    ctx.beginPath();
    ctx.ellipse(0, -4, 1, 3 * eyePulse, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -4, 1, 0, Math.PI * 2);
    ctx.fill();

    // Crown energy spikes
    ctx.strokeStyle = this.colors.core;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6 + Math.sin(this.phase * 2) * 0.2;

    const spikePositions = [
      { x: 0, y: -14, len: 6, angle: 0 },
      { x: -6, y: -9, len: 5, angle: -0.4 },
      { x: 6, y: -9, len: 5, angle: 0.4 },
    ];
    spikePositions.forEach(sp => {
      const spikeWobble = Math.sin(this.phase * 4 + sp.angle * 3) * 1.5;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(
        sp.x + Math.sin(sp.angle) * sp.len + spikeWobble,
        sp.y - sp.len - Math.abs(spikeWobble)
      );
      ctx.stroke();

      ctx.fillStyle = this.colors.core;
      ctx.beginPath();
      ctx.arc(
        sp.x + Math.sin(sp.angle) * sp.len + spikeWobble,
        sp.y - sp.len - Math.abs(spikeWobble),
        1.5, 0, Math.PI * 2
      );
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.restore();

    // === Tail fade wisps ===
    const tail = this.segments[this.numSegments - 1];
    const preTail = this.segments[this.numSegments - 2];
    const tailScreenY = tail.y - cameraY;
    const tailAngle = Math.atan2(tail.y - preTail.y, tail.x - preTail.x);

    ctx.save();
    ctx.translate(tail.x, tailScreenY);
    ctx.rotate(tailAngle - Math.PI / 2);

    for (let w = 0; w < 3; w++) {
      const wAngle = this.phase * 2 + (w * Math.PI * 2) / 3;
      const wx = Math.sin(wAngle) * 4;
      const wy = 4 + w * 4;
      ctx.fillStyle = this.colors.glow;
      ctx.globalAlpha = 0.3 - w * 0.08;
      ctx.beginPath();
      ctx.arc(wx, wy, 2 - w * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
    ctx.restore();
  }

  checkCollision(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const headDist = Math.sqrt(dx * dx + dy * dy);
    if (headDist < this.radius + player.radius * 0.7) return true;

    for (let i = 1; i < this.numSegments; i++) {
      const seg = this.segments[i];
      const sdx = player.x - seg.x;
      const sdy = player.y - seg.y;
      const segDist = Math.sqrt(sdx * sdx + sdy * sdy);
      const segRadius = 4 + (1 - i / this.numSegments) * 8;
      if (segDist < segRadius + player.radius * 0.6) return true;
    }

    return false;
  }
}

export default CosmicSerpent;
