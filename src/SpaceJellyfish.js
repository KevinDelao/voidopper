class SpaceJellyfish {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 22;
    this.active = true;

    // Gentle horizontal drift only — jellyfish floats in place
    this.vx = (Math.random() - 0.5) * 20;
    this.vy = 0;

    // Pulse animation (jellyfish propulsion)
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.06;

    // Tentacle physics
    this.numTentacles = 5 + Math.floor(Math.random() * 3);
    this.tentacles = [];
    for (let i = 0; i < this.numTentacles; i++) {
      const spread = (i / (this.numTentacles - 1)) - 0.5; // -0.5 to 0.5
      this.tentacles.push({
        baseX: spread * 20,
        segments: 6 + Math.floor(Math.random() * 3),
        phase: Math.random() * Math.PI * 2,
        speed: 0.03 + Math.random() * 0.02,
        length: 30 + Math.random() * 25,
      });
    }

    // Bioluminescent color
    const hue = Math.random() * 60 + 160; // Cyan to blue-purple range
    this.bodyColor = `hsla(${hue}, 80%, 60%, 1)`;
    this.glowColor = `hsla(${hue}, 90%, 70%, 1)`;
    this.tentacleColor = `hsla(${hue}, 70%, 50%, 1)`;
    this.innerGlow = `hsla(${hue}, 100%, 85%, 1)`;
    this.hue = hue;

    // Internal organs (glowing spots)
    this.organs = [];
    for (let i = 0; i < 3; i++) {
      this.organs.push({
        x: (Math.random() - 0.5) * 14,
        y: (Math.random() - 0.5) * 8 - 2,
        radius: 2 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  update(deltaTime) {
    this.pulsePhase += this.pulseSpeed;

    // Float in place with gentle bob — no vertical movement
    this.x += this.vx * deltaTime;

    // Update tentacle sway
    this.tentacles.forEach(t => {
      t.phase += t.speed;
    });

    // Update organ glow
    this.organs.forEach(o => {
      o.phase += 0.04;
    });
  }

  draw(ctx, cameraY) {
    const screenY = this.y - cameraY;
    const pulse = Math.sin(this.pulsePhase);
    const pulseScale = 1 + pulse * 0.15;

    ctx.save();
    ctx.translate(this.x, screenY);

    // Outer glow aura
    ctx.shadowBlur = 0;
    ctx.shadowColor = this.glowColor;

    // Draw tentacles first (behind body)
    this.tentacles.forEach(t => {
      ctx.strokeStyle = this.tentacleColor;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 0;
      ctx.shadowColor = this.glowColor;

      ctx.beginPath();
      let tx = t.baseX;
      let ty = 10; // Start below bell
      ctx.moveTo(tx, ty);

      const segLen = t.length / t.segments;
      for (let s = 1; s <= t.segments; s++) {
        const progress = s / t.segments;
        const sway = Math.sin(t.phase + s * 0.8) * (8 + progress * 12);
        tx = t.baseX + sway;
        ty = 10 + s * segLen;

        // Tentacles get thinner and more transparent
        ctx.lineWidth = 2 * (1 - progress * 0.6);
        ctx.globalAlpha = 0.8 - progress * 0.5;
        ctx.lineTo(tx, ty);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Glowing tip
      ctx.fillStyle = this.innerGlow;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.shadowBlur = 0;
    ctx.shadowColor = this.glowColor;

    // Bell (dome) — squishes with pulse
    const bellWidth = 18 * pulseScale;
    const bellHeight = 14 * (1 + (1 - pulseScale) * 0.5); // Inverse squash

    if (!this._bodyGrad || this._bodyGradW !== bellWidth) {
      this._bodyGrad = ctx.createRadialGradient(0, -3, 0, 0, 0, bellWidth);
      this._bodyGrad.addColorStop(0, this.innerGlow);
      this._bodyGrad.addColorStop(0.4, this.bodyColor);
      this._bodyGrad.addColorStop(1, `hsla(${this.hue}, 70%, 50%, 0.5)`);
      this._bodyGradW = bellWidth;
    }
    const bodyGrad = this._bodyGrad;

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    // Dome shape
    ctx.moveTo(-bellWidth, 8);
    ctx.quadraticCurveTo(-bellWidth, -bellHeight, 0, -bellHeight - 2);
    ctx.quadraticCurveTo(bellWidth, -bellHeight, bellWidth, 8);
    // Scalloped bottom edge
    const scallops = 6;
    for (let i = 0; i < scallops; i++) {
      const sx1 = bellWidth - (i + 0.5) * (bellWidth * 2 / scallops);
      const sx2 = bellWidth - (i + 1) * (bellWidth * 2 / scallops);
      const dip = 4 + pulse * 2;
      ctx.quadraticCurveTo((sx1 + sx2) / 2, 8 + dip, sx2, 8);
    }
    ctx.closePath();
    ctx.fill();

    // Bell rim highlight
    ctx.strokeStyle = `hsla(${this.hue}, 100%, 85%, 0.37)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Internal glowing organs
    this.organs.forEach(o => {
      const brightness = 0.5 + Math.sin(o.phase) * 0.3;
      ctx.fillStyle = `hsla(${this.hue}, 100%, 85%, ${brightness})`;
      ctx.shadowBlur = 0;
      ctx.shadowColor = this.innerGlow;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius * (1 + Math.sin(o.phase) * 0.2), 0, Math.PI * 2);
      ctx.fill();
    });

    // Central nerve visible through translucent bell
    ctx.strokeStyle = `hsla(${this.hue}, 100%, 85%, 0.25)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -bellHeight + 2);
    ctx.lineTo(0, 8);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  checkCollision(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Slightly generous hitbox — tentacles add danger zone below
    const effectiveRadius = this.radius * 0.7;
    // Tapered tentacle hitbox - wider near body, narrower at tips
    const tentacleWidth = 15 * (1 - dy / 50); // tapers from 15 to 0
    if (dy > 0 && dy < 50 && Math.abs(dx) < tentacleWidth) {
      return true;
    }
    return distance < (effectiveRadius + player.radius * 0.7);
  }
}

export default SpaceJellyfish;
