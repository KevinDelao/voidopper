class PlasmaOrb {
  constructor(x, y, corridorLeft, corridorRight, screenWidth = 390) {
    const ss = Math.max(1, screenWidth / 390);
    this.ss = ss;
    this.x = x;
    this.y = y;
    this.radius = Math.round(14 * ss);
    this.active = true;
    this.isPlasmaOrb = true;

    // Bounces between walls — fast horizontal, slow vertical
    this.vx = (Math.random() < 0.5 ? 1 : -1) * (Math.random() * 120 + 180);
    this.vy = Math.random() * 20 + 30; // Slow fall

    // Visual
    this.phase = Math.random() * Math.PI * 2;
    this.trailPositions = [];
    this.maxTrail = 12;

    // Plasma tendrils
    this.tendrils = [];
    for (let i = 0; i < 6; i++) {
      this.tendrils.push({
        angle: (i / 6) * Math.PI * 2,
        length: (8 + Math.random() * 10) * ss,
        speed: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Color — electric palette
    const palettes = [
      { core: '#ffffff', mid: '#44ddff', outer: '#0066ff', trail: '#0044aa' },  // Electric blue
      { core: '#ffffff', mid: '#ff44dd', outer: '#aa00ff', trail: '#6600aa' },  // Plasma pink
      { core: '#ffffaa', mid: '#ffdd44', outer: '#ff8800', trail: '#aa4400' },  // Solar
      { core: '#ffffff', mid: '#44ff88', outer: '#00cc44', trail: '#006622' },  // Toxic green
    ];
    this.colors = palettes[Math.floor(Math.random() * palettes.length)];

    // Bounce flash timer
    this.bounceFlash = 0;
  }

  update(deltaTime) {
    this.phase += 0.1;

    // Store trail
    this.trailPositions.push({ x: this.x, y: this.y });
    if (this.trailPositions.length > this.maxTrail) {
      this.trailPositions.shift();
    }

    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    // Update tendrils
    this.tendrils.forEach(t => {
      t.phase += t.speed * deltaTime;
      t.angle += 0.5 * deltaTime;
    });

    // Decay bounce flash
    if (this.bounceFlash > 0) {
      this.bounceFlash -= deltaTime * 4;
    }
  }

  // Called from Game.js when hitting walls
  bounceOffWall(newX, direction) {
    this.x = newX;
    this.vx = direction * Math.abs(this.vx);
    this.bounceFlash = 1.0;
    // Slight speed increase on each bounce for escalating tension
    this.vx *= 1.03;
    // Cap speed to prevent infinite escalation
    const maxSpeed = 400;
    if (Math.abs(this.vx) > maxSpeed) this.vx = Math.sign(this.vx) * maxSpeed;
  }

  draw(ctx, cameraY) {
    const screenY = this.y - cameraY;

    ctx.save();

    // Draw trail — batched into single path
    ctx.fillStyle = this.colors.trail;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    for (let i = 0; i < this.trailPositions.length; i++) {
      const t = this.trailPositions[i];
      const progress = i / this.trailPositions.length;
      const tScreenY = t.y - cameraY;
      const r = this.radius * progress * 0.6;
      if (r > 0.5) {
        ctx.moveTo(t.x + r, tScreenY);
        ctx.arc(t.x, tScreenY, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.translate(this.x, screenY);

    // Plasma tendrils — electric arcs reaching outward
    this.tendrils.forEach(t => {
      const endX = Math.cos(t.angle) * (t.length + Math.sin(t.phase) * 5);
      const endY = Math.sin(t.angle) * (t.length + Math.sin(t.phase) * 5);
      const midX = endX * 0.5 + Math.sin(t.phase * 2) * 4;
      const midY = endY * 0.5 + Math.cos(t.phase * 2) * 4;

      ctx.strokeStyle = this.colors.mid;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6 + Math.sin(t.phase) * 0.3;
      ctx.shadowBlur = 0;
      ctx.shadowColor = this.colors.mid;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();

      // Spark at tip
      ctx.fillStyle = this.colors.core;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(endX, endY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Outer glow — simple circle instead of radial gradient
    const glowSize = this.radius * 2 + (this.bounceFlash * 15);
    ctx.fillStyle = this.colors.outer + '20';
    ctx.beginPath();
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Main orb body — cache gradient (body size barely changes)
    const bodyPulse = 1 + Math.sin(this.phase * 2) * 0.08;
    if (!this._bodyGrad) {
      this._bodyGrad = ctx.createRadialGradient(-2, -2, 0, 0, 0, this.radius);
      this._bodyGrad.addColorStop(0, this.colors.core);
      this._bodyGrad.addColorStop(0.3, this.colors.mid);
      this._bodyGrad.addColorStop(0.7, this.colors.outer);
      this._bodyGrad.addColorStop(1, this.colors.outer + '60');
    }
    ctx.fillStyle = this._bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * bodyPulse, 0, Math.PI * 2);
    ctx.fill();

    // Inner energy swirl
    ctx.strokeStyle = this.colors.core + '80';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const swirlAngle = this.phase * 3 + (i * Math.PI * 2 / 3);
      const sr = this.radius * 0.5;
      ctx.beginPath();
      ctx.arc(
        Math.cos(swirlAngle) * sr * 0.3,
        Math.sin(swirlAngle) * sr * 0.3,
        sr,
        swirlAngle,
        swirlAngle + Math.PI * 0.8
      );
      ctx.stroke();
    }

    // Bounce flash ring
    if (this.bounceFlash > 0) {
      ctx.strokeStyle = this.colors.core;
      ctx.lineWidth = 2;
      ctx.globalAlpha = this.bounceFlash;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * (1 + (1 - this.bounceFlash) * 2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  checkCollision(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (this.radius * 0.8 + player.radius * 0.7);
  }
}

export default PlasmaOrb;
