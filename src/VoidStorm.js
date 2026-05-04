class VoidStorm {
  constructor(startY, screenWidth = 390) {
    const ss = Math.max(1, screenWidth / 390);
    this.ss = ss;
    this.y = startY + Math.round(600 * ss); // Start below the player's starting position
    this.baseSpeed = 35 * ss; // Base rising speed (pixels/sec, scaled)
    this.currentSpeed = this.baseSpeed;
    this.warningDistance = Math.round(400 * ss); // Distance at which warning effects start
    this.killDistance = 0; // Player dies when void reaches them

    // Visual
    this.phase = 0;
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        xOffset: Math.random(),
        size: 2 + Math.random() * 4,
        speed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.3 + Math.random() * 0.5,
      });
    }

    // Tendrils that reach upward from the storm
    this.tendrils = [];
    for (let i = 0; i < 8; i++) {
      this.tendrils.push({
        xOffset: Math.random(),
        height: 40 + Math.random() * 80,
        speed: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        width: 3 + Math.random() * 5,
      });
    }

    // Surge system — periodic speed bursts that create panic moments
    this.surgeTimer = 0;
    this.surgeInterval = 35;       // Seconds between surges
    this.surgeDuration = 3.0;      // How long a surge lasts
    this.surgeActive = false;
    this.surgeProgress = 0;        // 0-1 progress through current surge
    this.surgeSpeedMult = 2.5;     // Speed multiplier during surge
    this.surgeWarningTime = 2.0;   // Warning before surge hits
    this.surgeWarning = false;
    this.totalSurges = 0;
  }

  update(deltaTime, playerY, heightClimbed, difficulty) {
    this.phase += deltaTime * 2;

    // Speed increases with height — rate varies by difficulty
    const maxBonus = difficulty === 'easy' ? 30 : difficulty === 'hard' ? 60 : 40;
    const rampDist = difficulty === 'easy' ? 15000 : difficulty === 'hard' ? 8000 : 12000;
    const heightBonus = maxBonus * Math.min(heightClimbed / rampDist, 1.0);
    this.currentSpeed = this.baseSpeed + heightBonus;

    // If player is far ahead, the void accelerates to maintain tension
    const gap = this.y - playerY;
    if (gap > 800) {
      this.currentSpeed += (gap - 800) * 0.05;
    }

    // === SURGE SYSTEM ===
    this.surgeTimer += deltaTime;
    // Surge interval decreases with height (more frequent as game progresses)
    const effectiveInterval = Math.max(20, this.surgeInterval - heightClimbed / 2000);

    if (!this.surgeActive && !this.surgeWarning) {
      if (this.surgeTimer >= effectiveInterval - this.surgeWarningTime) {
        this.surgeWarning = true;
      }
    }

    if (this.surgeWarning && !this.surgeActive) {
      if (this.surgeTimer >= effectiveInterval) {
        this.surgeActive = true;
        this.surgeWarning = false;
        this.surgeProgress = 0;
        this.totalSurges++;
      }
    }

    if (this.surgeActive) {
      this.surgeProgress += deltaTime / this.surgeDuration;
      // Surge speed ramps up then down (bell curve)
      const surgeIntensity = Math.sin(this.surgeProgress * Math.PI);
      this.currentSpeed *= (1 + (this.surgeSpeedMult - 1) * surgeIntensity);

      if (this.surgeProgress >= 1.0) {
        this.surgeActive = false;
        this.surgeTimer = 0;
      }
    }

    // Void never slows below base speed — always rising
    this.y -= this.currentSpeed * deltaTime;

    // Update particles
    this.particles.forEach(p => {
      p.phase += p.speed * deltaTime;
    });

    // Update tendrils
    this.tendrils.forEach(t => {
      t.phase += t.speed * deltaTime;
    });
  }

  // How close the void is to the player (0 = far away, 1 = touching)
  getProximity(playerY) {
    const gap = this.y - playerY;
    if (gap <= 0) return 1;
    return Math.max(0, 1 - gap / this.warningDistance);
  }

  checkCollision(playerY) {
    return playerY >= this.y;
  }

  draw(ctx, cameraY, canvasWidth, canvasHeight) {
    const screenY = this.y - cameraY;

    // Don't draw if entirely below screen
    if (screenY > canvasHeight + 200) return;

    ctx.save();

    // Main void gradient — deep purple/crimson energy wall
    const gradHeight = 250;
    const gradTop = screenY - gradHeight;
    const gradient = ctx.createLinearGradient(0, gradTop, 0, screenY + 100);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.2, 'rgba(40, 0, 30, 0.3)');
    gradient.addColorStop(0.5, 'rgba(80, 0, 50, 0.6)');
    gradient.addColorStop(0.75, 'rgba(120, 10, 60, 0.85)');
    gradient.addColorStop(1, 'rgba(150, 20, 40, 1)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, gradTop, canvasWidth, gradHeight + 100);

    // Solid void below the gradient line (everything below is consumed)
    ctx.fillStyle = '#1a0008';
    ctx.fillRect(0, screenY + 100, canvasWidth, canvasHeight - screenY + 200);

    // Tendrils reaching upward (single gradient shared, simpler rendering)
    ctx.strokeStyle = 'rgba(200, 30, 80, 0.4)';
    ctx.lineCap = 'round';
    this.tendrils.forEach(t => {
      const tx = t.xOffset * canvasWidth;
      const sway = Math.sin(t.phase) * 30;
      const tendrilHeight = t.height + Math.sin(t.phase * 0.7) * 20;

      ctx.lineWidth = t.width;
      ctx.beginPath();
      ctx.moveTo(tx, screenY);
      ctx.quadraticCurveTo(tx + sway, screenY - tendrilHeight * 0.6, tx + sway * 0.5, screenY - tendrilHeight);
      ctx.stroke();
    });

    // Floating particles above the storm edge — batched, no shadowBlur
    ctx.fillStyle = 'rgba(255, 80, 120, 0.5)';
    ctx.beginPath();
    this.particles.forEach(p => {
      const px = p.xOffset * canvasWidth;
      const floatY = Math.sin(p.phase) * 30;
      const py = screenY - 20 + floatY - Math.abs(Math.sin(p.phase * 0.3)) * 80;
      ctx.moveTo(px + p.size, py);
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
    });
    ctx.fill();

    // Bright edge line with pulse (no shadowBlur)
    const edgePulse = 0.6 + Math.sin(this.phase * 3) * 0.4;
    ctx.strokeStyle = `rgba(255, 60, 100, ${edgePulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    for (let x = 0; x <= canvasWidth; x += 20) {
      const wave = Math.sin(x * 0.02 + this.phase) * 8 + Math.sin(x * 0.05 + this.phase * 1.5) * 4;
      ctx.lineTo(x, screenY + wave);
    }
    ctx.stroke();

    ctx.restore();
  }

  // Draw screen warning overlay (called outside of camera transform)
  drawWarning(ctx, canvasWidth, canvasHeight, proximity) {
    if (proximity <= 0) return;

    ctx.save();

    // Bottom screen tint — intensifies as void gets closer
    const tintAlpha = proximity * 0.35;
    const tintGrad = ctx.createLinearGradient(0, canvasHeight, 0, canvasHeight * 0.5);
    tintGrad.addColorStop(0, `rgba(200, 0, 40, ${tintAlpha})`);
    tintGrad.addColorStop(1, 'rgba(200, 0, 40, 0)');
    ctx.fillStyle = tintGrad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Pulsing border when very close
    if (proximity > 0.5) {
      const borderAlpha = (proximity - 0.5) * 2 * (0.3 + Math.sin(Date.now() / 100) * 0.15);
      ctx.strokeStyle = `rgba(255, 50, 80, ${borderAlpha})`;
      ctx.lineWidth = 4 + proximity * 4;
      ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
    }

    ctx.restore();
  }
}

export default VoidStorm;
