class UFO {
  constructor(x, y, screenWidth = 390) {
    const ss = Math.max(1, screenWidth / 390);
    this.ss = ss;
    this.x = x;
    this.y = y;
    this.radius = Math.round(30 * ss); // Collision radius
    this.rotation = 0;
    this.rotationSpeed = 0.02;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.08;
    this.active = true;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.bobSpeed = 0.05;

    // UFOs move horizontally while falling
    this.vx = (Math.random() - 0.5) * 100; // Horizontal movement -50 to 50
    this.vy = Math.random() * 50 + 80; // Slower fall than asteroids

    // Random UFO color scheme
    const colorSchemes = [
      { body: '#4a9eff', dome: '#7bb8ff', glow: '#00d4ff', accent: '#2d7acc' }, // Blue
      { body: '#ff5a4a', dome: '#ff8a7b', glow: '#ff3d2e', accent: '#cc3829' }, // Red
      { body: '#4aff7b', dome: '#7bffaa', glow: '#2eff5a', accent: '#29cc48' }, // Green
      { body: '#ff4aff', dome: '#ff7bff', glow: '#ff2eff', accent: '#cc29cc' }, // Purple
      { body: '#ffaa4a', dome: '#ffcc7b', glow: '#ff8800', accent: '#cc7729' }  // Orange
    ];
    this.colorScheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];

    // Window positions on dome
    this.windows = [];
    const numWindows = 3;
    for (let i = 0; i < numWindows; i++) {
      const angle = (i / numWindows) * Math.PI - Math.PI / 2;
      this.windows.push({
        x: Math.cos(angle) * 15,
        y: Math.sin(angle) * 8 - 5
      });
    }
  }

  update(deltaTime) {
    this.rotation += this.rotationSpeed;
    this.pulsePhase += this.pulseSpeed;
    this.bobPhase += this.bobSpeed;

    // Move horizontally and downward
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
  }

  draw(ctx, cameraY) {
    const screenY = this.y - cameraY;
    const bobOffset = Math.sin(this.bobPhase) * 2; // Gentle bobbing motion

    ctx.save();
    ctx.translate(this.x, screenY + bobOffset);
    const ss = this.ss || 1;
    ctx.scale(ss, ss);

    // Draw engine glow at the back
    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.2;

    // Engine exhausts (2 on each side)
    const exhaustPositions = [
      { x: -18, y: 12 },
      { x: -12, y: 14 },
      { x: 12, y: 14 },
      { x: 18, y: 12 }
    ];

    // Exhaust glows — use simple fill instead of radial gradient (tiny, barely visible)
    ctx.fillStyle = `${this.colorScheme.glow}88`;
    ctx.beginPath();
    for (let e = 0; e < 4; e++) {
      const pos = e === 0 ? { x: -18, y: 12 } : e === 1 ? { x: -12, y: 14 } : e === 2 ? { x: 12, y: 14 } : { x: 18, y: 12 };
      const r = 8 * pulseScale;
      ctx.moveTo(pos.x + r, pos.y);
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    }
    ctx.fill();

    // Draw main ship body (sleek fuselage) — cache gradient
    if (!this._bodyGrad) {
      this._bodyGrad = ctx.createLinearGradient(0, -15, 0, 15);
      this._bodyGrad.addColorStop(0, this.colorScheme.dome);
      this._bodyGrad.addColorStop(0.5, this.colorScheme.body);
      this._bodyGrad.addColorStop(1, this.colorScheme.accent);
    }
    const bodyGradient = this._bodyGrad;

    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = this.colorScheme.accent;
    ctx.lineWidth = 2.5;

    // Main fuselage (elongated shape)
    ctx.beginPath();
    ctx.moveTo(0, -15); // Nose
    ctx.bezierCurveTo(8, -12, 12, -5, 12, 5); // Right side
    ctx.lineTo(12, 10);
    ctx.lineTo(8, 12); // Right back
    ctx.lineTo(-8, 12); // Back bottom
    ctx.lineTo(-12, 10); // Left back
    ctx.lineTo(-12, 5);
    ctx.bezierCurveTo(-12, -5, -8, -12, 0, -15); // Left side to nose
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw wings (on the sides)
    // Left wing
    ctx.fillStyle = this.colorScheme.body;
    ctx.strokeStyle = this.colorScheme.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-22, 2);
    ctx.lineTo(-20, 8);
    ctx.lineTo(-12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right wing
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(22, 2);
    ctx.lineTo(20, 8);
    ctx.lineTo(12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing tip lights
    ctx.fillStyle = '#ff3333';
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#ff0000';
    ctx.beginPath();
    ctx.arc(-21, 5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#33ff33';
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#00ff00';
    ctx.beginPath();
    ctx.arc(21, 5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Cockpit window (glossy)
    const cockpitGradient = ctx.createRadialGradient(-2, -8, 0, 0, -6, 8);
    cockpitGradient.addColorStop(0, '#ccffff');
    cockpitGradient.addColorStop(0.3, '#6699ff');
    cockpitGradient.addColorStop(1, '#003366');
    ctx.fillStyle = cockpitGradient;
    ctx.strokeStyle = this.colorScheme.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -6, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cockpit highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-2, -7, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Detail lines on body
    ctx.strokeStyle = this.colorScheme.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.lineTo(-10, 4);
    ctx.moveTo(8, -2);
    ctx.lineTo(10, 4);
    ctx.stroke();

    // Small vents/details
    ctx.fillStyle = this.colorScheme.accent;
    for (let i = 0; i < 3; i++) {
      const ventY = -4 + i * 4;
      ctx.fillRect(-1, ventY, 2, 1.5);
    }

    ctx.restore();
  }

  checkCollision(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Tighter collision - reduce effective radius by 30% for more forgiving gameplay
    const effectiveUFORadius = this.radius * 0.7;
    const effectivePlayerRadius = player.radius * 0.7;

    return distance < (effectiveUFORadius + effectivePlayerRadius);
  }

  explode(ctx, cameraY) {
    this.active = false;
    const screenY = this.y - cameraY;

    // Create explosion particles
    const particles = [];
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 3;
      particles.push({
        x: this.x,
        y: screenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 4 + 2,
        life: 1.0
      });
    }

    return particles;
  }
}

export default UFO;
