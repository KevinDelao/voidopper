class Spike {
  constructor(x, y, side, size = 'medium', screenWidth = 390) {
    const ss = Math.max(1, screenWidth / 390);
    this.ss = ss;
    this.x = x;
    this.y = y;
    this.side = side;
    this.size = size;

    // Size determines dimensions (scaled for screen)
    if (size === 'small') {
      this.width = Math.round(35 * ss);
      this.height = Math.round(12 * ss);
      this.shardCount = 2;
    } else if (size === 'medium') {
      this.width = Math.round(45 * ss);
      this.height = Math.round(15 * ss);
      this.shardCount = 3;
    } else {
      this.width = Math.round(55 * ss);
      this.height = Math.round(18 * ss);
      this.shardCount = 4;
    }

    // Animation phases
    this.phase = Math.random() * Math.PI * 2;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.flickerPhase = Math.random() * Math.PI * 2;

    // Generate crystal shard offsets for organic look
    this.shards = [];
    for (let i = 0; i < this.shardCount; i++) {
      const t = (i + 0.5) / this.shardCount;
      this.shards.push({
        yOff: (t - 0.5) * this.height * 1.4,
        length: this.width * (0.5 + Math.random() * 0.5),
        thickness: 2 + Math.random() * 3,
        angleOff: (Math.random() - 0.5) * 0.25,
        phaseOff: Math.random() * Math.PI * 2,
      });
    }

    // Energy particles along the spike
    this.particles = [];
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        t: Math.random(),
        speed: 0.3 + Math.random() * 0.5,
        offset: (Math.random() - 0.5) * 6,
        size: 1 + Math.random() * 1.5,
        alpha: 0.4 + Math.random() * 0.4,
      });
    }
  }

  update(deltaTime) {
    this.phase += 0.06;
    this.pulsePhase += 0.04;
    this.flickerPhase += 0.08;

    // Animate particles flowing toward tip
    this.particles.forEach(p => {
      p.t += p.speed * deltaTime;
      if (p.t > 1) {
        p.t = 0;
        p.offset = (Math.random() - 0.5) * 6;
      }
    });
  }

  draw(ctx, cameraY, biome) {
    const screenY = this.y - cameraY;

    // Biome-adaptive colors with fallback
    const accent = biome ? biome.accent : '#ff4444';
    const edge = biome ? biome.edge : '#aa2222';
    const mid = biome ? biome.mid : '#662222';
    const dark = biome ? biome.dark : '#331111';

    ctx.save();
    ctx.translate(this.x, screenY);

    if (this.side === 'right') {
      ctx.scale(-1, 1);
    }

    const pulse = 0.8 + Math.sin(this.pulsePhase) * 0.2;
    const flicker = 0.7 + Math.sin(this.flickerPhase) * 0.3;

    // === Wall socket / base mount ===
    const embedDepth = 12;
    const baseH = this.height * 1.4;

    // Dark cavity in wall
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-embedDepth / 2, 0, embedDepth / 2 + 2, baseH / 2 + 2, 0, Math.PI / 2, Math.PI * 1.5);
    ctx.fill();

    // Base mount with biome color (cached)
    if (!this._mountGrad || this._mountGradMid !== mid) {
      this._mountGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseH / 2);
      this._mountGrad.addColorStop(0, mid);
      this._mountGrad.addColorStop(0.7, dark);
      this._mountGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
      this._mountGradMid = mid;
    }
    ctx.fillStyle = this._mountGrad;
    ctx.beginPath();
    ctx.arc(0, 0, baseH / 2, Math.PI / 2, Math.PI * 1.5);
    ctx.lineTo(8, -baseH / 3);
    ctx.lineTo(8, baseH / 3);
    ctx.closePath();
    ctx.fill();

    // Mount rim highlight
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, baseH / 2 - 1, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // === Crystal shards ===
    this.shards.forEach((shard, i) => {
      const shardPulse = 0.9 + Math.sin(this.phase + shard.phaseOff) * 0.1;
      const len = shard.length * shardPulse;

      ctx.save();
      ctx.translate(6, shard.yOff);
      ctx.rotate(shard.angleOff);

      // Shard body — gradient from dark base to bright tip
      const shardGrad = ctx.createLinearGradient(0, 0, len, 0);
      shardGrad.addColorStop(0, dark);
      shardGrad.addColorStop(0.3, edge);
      shardGrad.addColorStop(0.7, accent);
      shardGrad.addColorStop(1, '#ffffff');

      ctx.fillStyle = shardGrad;
      ctx.beginPath();
      ctx.moveTo(0, -shard.thickness);
      ctx.lineTo(len, 0);
      ctx.lineTo(0, shard.thickness);
      ctx.closePath();
      ctx.fill();

      // Crystal edge highlights
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.7 * flicker;
      ctx.beginPath();
      ctx.moveTo(0, -shard.thickness);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.globalAlpha = 0.4 * flicker;
      ctx.beginPath();
      ctx.moveTo(0, shard.thickness);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Inner light refraction line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3 + Math.sin(this.phase * 2 + shard.phaseOff) * 0.2;
      ctx.beginPath();
      ctx.moveTo(len * 0.15, -shard.thickness * 0.3);
      ctx.lineTo(len * 0.85, -shard.thickness * 0.05);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.restore();
    });

    // === Main central spike (largest shard) ===
    const mainLen = this.width * pulse;
    const mainThick = this.height / 2.5;

    const mainGrad = ctx.createLinearGradient(4, 0, mainLen, 0);
    mainGrad.addColorStop(0, dark);
    mainGrad.addColorStop(0.2, edge);
    mainGrad.addColorStop(0.5, accent);
    mainGrad.addColorStop(0.85, accent);
    mainGrad.addColorStop(1, '#ffffff');

    ctx.fillStyle = mainGrad;
    ctx.beginPath();
    ctx.moveTo(4, -mainThick);
    ctx.quadraticCurveTo(mainLen * 0.7, -mainThick * 0.3, mainLen + 2, 0);
    ctx.quadraticCurveTo(mainLen * 0.7, mainThick * 0.3, 4, mainThick);
    ctx.closePath();
    ctx.fill();

    // Main spike edge highlights
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(6, -mainThick + 1);
    ctx.quadraticCurveTo(mainLen * 0.7, -mainThick * 0.25, mainLen, 0);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Central energy vein (pulsing bright line down center)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4 + Math.sin(this.phase * 3) * 0.3;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(mainLen - 4, 0);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // === Tip energy glow ===
    const tipX = mainLen + 2;
    const glowSize = 6 + Math.sin(this.phase * 2) * 2;

    // Outer glow (cached per accent color)
    if (!this._tipGlow || this._tipGlowAccent !== accent || this._tipGlowX !== tipX || this._tipGlowSize !== glowSize) {
      this._tipGlow = ctx.createRadialGradient(tipX, 0, 0, tipX, 0, glowSize * 2);
      this._tipGlow.addColorStop(0, accent);
      this._tipGlow.addColorStop(0.4, accent + '66');
      this._tipGlow.addColorStop(1, accent + '00');
      this._tipGlowAccent = accent;
      this._tipGlowX = tipX;
      this._tipGlowSize = glowSize;
    }
    ctx.fillStyle = this._tipGlow;
    ctx.globalAlpha = 0.6 * pulse;
    ctx.beginPath();
    ctx.arc(tipX, 0, glowSize * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Bright tip core
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8 + Math.sin(this.flickerPhase * 2) * 0.2;
    ctx.beginPath();
    ctx.arc(tipX, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // === Energy particles flowing along spike ===
    this.particles.forEach(p => {
      const px = 8 + p.t * (mainLen - 8);
      const py = p.offset * (1 - p.t); // Converge toward tip
      ctx.fillStyle = accent;
      ctx.globalAlpha = p.alpha * (1 - p.t * 0.6) * flicker;
      ctx.beginPath();
      ctx.arc(px, py, p.size * (1 - p.t * 0.5), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // === Base energy ring (pulsing at mount point) ===
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.3 + Math.sin(this.pulsePhase * 2) * 0.2;
    ctx.beginPath();
    ctx.arc(4, 0, baseH / 2 - 2, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  checkCollision(player) {
    const dy = Math.abs(player.y - this.y);
    const effectiveHeight = this.height * 0.9;
    if (dy > effectiveHeight / 2 + player.radius) return false;

    let dx;
    if (this.side === 'left') {
      dx = player.x - this.x;
      if (dx < -player.radius || dx > this.width * 0.9 + player.radius) return false;
    } else {
      dx = this.x - player.x;
      if (dx < -player.radius || dx > this.width * 0.9 + player.radius) return false;
    }

    return true;
  }
}

export default Spike;
