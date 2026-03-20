class BlackHole {
  constructor(x, y, screenWidth = 390) {
    this.x = x;
    this.y = y;
    // Scale for iPad — baseline is iPhone 390px wide
    const ss = Math.max(1, screenWidth / 390);
    this.radius = Math.round(18 * ss); // Kill zone
    this.active = true;
    this.isBlackHole = true;
    this.pullRadius = Math.round(280 * ss); // Gravitational pull range — wide enough to feel
    this.pullStrength = 500 * ss; // How hard it pulls
    this.screenScale = ss;

    // Doesn't move
    this.vy = 0;
    this.vx = 0;

    // Visual
    this.phase = Math.random() * Math.PI * 2;
    this.rotationAngle = 0;

    // Accretion disk particles
    this.diskParticles = [];
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const orbitRadius = (25 + Math.random() * 20) * ss;
      this.diskParticles.push({
        angle: angle,
        radius: orbitRadius,
        speed: (0.8 + Math.random() * 0.6) / (orbitRadius * 0.03),
        size: (1 + Math.random() * 2.5) * ss,
        brightness: 0.4 + Math.random() * 0.6,
        hue: Math.random() * 40 + 10,
      });
    }

    // Swirling debris being pulled in
    this.debris = [];
    for (let i = 0; i < 8; i++) {
      this.debris.push({
        angle: Math.random() * Math.PI * 2,
        radius: (30 + Math.random() * 50) * ss,
        speed: 0.3 + Math.random() * 0.4,
        spiralRate: 0.1 + Math.random() * 0.1,
        size: (1 + Math.random() * 1.5) * ss,
        alpha: 0.3 + Math.random() * 0.4,
      });
    }
  }

  update(deltaTime) {
    this.phase += 0.04;
    this.rotationAngle += 0.02;

    // Rotate accretion disk
    this.diskParticles.forEach(p => {
      p.angle += p.speed * deltaTime;
    });

    // Spiral debris inward then reset
    this.debris.forEach(d => {
      d.angle += d.speed * deltaTime;
      d.radius -= d.spiralRate * deltaTime * 30;
      if (d.radius < 15 * this.screenScale) {
        d.radius = (40 + Math.random() * 40) * this.screenScale;
        d.angle = Math.random() * Math.PI * 2;
        d.alpha = 0.3 + Math.random() * 0.4;
      }
    });

    // Very slow downward drift
    this.y += 8 * deltaTime;
  }

  // Apply gravitational pull to the player — called from Game.js
  applyGravity(player, dt = 0.016) {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.pullRadius && distance > 0) {
      // Smooth pull: strong close up, gentle at edge — inversely proportional to distance
      const t = 1 - distance / this.pullRadius; // 0 at edge, 1 at center
      const force = this.pullStrength * t * t; // Quadratic falloff from edge
      const nx = dx / distance;
      const ny = dy / distance;
      player.vx += nx * force * dt;
      player.vy += ny * force * dt;
    }
  }

  draw(ctx, cameraY) {
    const screenY = this.y - cameraY;
    const pulse = Math.sin(this.phase);

    ctx.save();
    ctx.translate(this.x, screenY);

    // Gravitational lensing effect — cache gradient (doesn't change)
    if (!this._lensGrad) {
      const lensRadius = this.pullRadius * 0.5;
      this._lensGrad = ctx.createRadialGradient(0, 0, this.radius * 2, 0, 0, lensRadius);
      this._lensGrad.addColorStop(0, 'rgba(50, 20, 80, 0.15)');
      this._lensGrad.addColorStop(0.5, 'rgba(30, 10, 60, 0.08)');
      this._lensGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this._lensRadius = lensRadius;
    }
    ctx.fillStyle = this._lensGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this._lensRadius, 0, Math.PI * 2);
    ctx.fill();

    // Accretion disk (behind hole) — batch particles
    ctx.save();
    ctx.scale(1, 0.4);
    ctx.rotate(this.rotationAngle * 0.3);

    ctx.beginPath();
    for (let i = 0; i < this.diskParticles.length; i++) {
      const p = this.diskParticles[i];
      const px = Math.cos(p.angle) * p.radius;
      const py = Math.sin(p.angle) * p.radius;
      if (py > 0) {
        ctx.moveTo(px + p.size, py);
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
      }
    }
    ctx.fillStyle = 'rgba(255, 180, 80, 0.4)';
    ctx.fill();
    ctx.restore();

    // Spiraling debris — batch into single path
    ctx.beginPath();
    for (let i = 0; i < this.debris.length; i++) {
      const d = this.debris[i];
      const dx = Math.cos(d.angle) * d.radius;
      const dy = Math.sin(d.angle) * d.radius * 0.4;
      ctx.moveTo(dx + d.size, dy);
      ctx.arc(dx, dy, d.size, 0, Math.PI * 2);
    }
    ctx.fillStyle = 'rgba(255, 200, 100, 0.5)';
    ctx.fill();

    // Event horizon — cache gradient
    if (!this._holeGrad) {
      this._holeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius + 5);
      this._holeGrad.addColorStop(0, '#000000');
      this._holeGrad.addColorStop(0.6, '#000000');
      this._holeGrad.addColorStop(0.8, '#110022');
      this._holeGrad.addColorStop(1, '#220044');
    }
    ctx.fillStyle = this._holeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Photon ring — use simple stroke instead of radial gradient
    ctx.strokeStyle = `rgba(255, 200, 100, ${0.5 + pulse * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 220, 150, ${0.3 + pulse * 0.15})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
    ctx.stroke();

    // Accretion disk (in front of hole) — batch particles
    ctx.save();
    ctx.scale(1, 0.4);
    ctx.rotate(this.rotationAngle * 0.3);

    ctx.beginPath();
    for (let i = 0; i < this.diskParticles.length; i++) {
      const p = this.diskParticles[i];
      const px = Math.cos(p.angle) * p.radius;
      const py = Math.sin(p.angle) * p.radius;
      if (py <= 0) {
        const s = p.size * 1.2;
        ctx.moveTo(px + s, py);
        ctx.arc(px, py, s, 0, Math.PI * 2);
      }
    }
    ctx.fillStyle = 'rgba(255, 180, 80, 0.6)';
    ctx.fill();
    ctx.restore();

    // Singularity core — tiny bright point
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.3 + pulse * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Danger indicator — subtle warning ring at pull radius
    ctx.strokeStyle = `rgba(100, 50, 150, ${0.08 + pulse * 0.04})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, this.pullRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  checkCollision(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Kill zone is the event horizon
    return distance < (this.radius * 0.9 + player.radius * 0.5);
  }
}

export default BlackHole;
