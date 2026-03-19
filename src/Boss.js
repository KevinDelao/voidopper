class Boss {
  constructor(x, y, config, corridorLeft, corridorRight) {
    this.x = x;
    this.y = y;
    this.config = config;
    this.name = config.name;
    this.radius = config.size || 35;
    this.active = true;

    // Health
    this.maxHealth = config.health || 5;
    this.health = this.maxHealth;
    this.invulnTimer = 0; // Brief invulnerability after hit

    // Corridor bounds
    this.corridorLeft = corridorLeft;
    this.corridorRight = corridorRight;
    this.corridorCenter = (corridorLeft + corridorRight) / 2;

    // Colors
    this.color = config.color || {
      primary: '#ff4488',
      secondary: '#aa2255',
      glow: '#ff66aa',
      eye: '#ffffff',
    };

    // Phases
    this.phases = config.phases || [];
    this.currentPhaseIndex = 0;
    this.updatePhase();

    // Movement state
    this.moveTimer = 0;
    this.moveAngle = 0;
    this.homeX = x;
    this.homeY = y;
    this.vx = 0;
    this.vy = 0;
    this.patrolDir = 1;

    // Attack state
    this.attackTimer = 0;
    this.projectiles = [];
    this.minions = [];
    this.laserAngle = 0;
    this.laserActive = false;
    this.laserTimer = 0;
    this.shockwaveActive = false;
    this.shockwaveRadius = 0;
    this.shockwaveMaxRadius = 0;

    // Special ability
    this.special = config.specialAbility || { type: 'teleport', cooldown: 6 };
    this.specialTimer = this.special.cooldown;
    this.clones = [];
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.vortexActive = false;

    // Visual
    this.phase = Math.random() * Math.PI * 2;
    this.hitFlash = 0;
    this.deathTimer = 0;
    this.isDying = false;

    // Personality affects behavior timing
    this.personality = config.personality || 'aggressive';
  }

  updatePhase() {
    const hpRatio = this.health / this.maxHealth;
    for (let i = this.phases.length - 1; i >= 0; i--) {
      if (hpRatio <= this.phases[i].healthThreshold) {
        if (i !== this.currentPhaseIndex) {
          this.currentPhaseIndex = i;
          this.hitFlash = 0.5; // Flash on phase change
        }
        break;
      }
    }
    this.currentPhase = this.phases[this.currentPhaseIndex] || this.phases[0];
  }

  update(deltaTime, playerX, playerY) {
    if (this.isDying) {
      this.deathTimer += deltaTime;
      return;
    }

    this.phase += 0.04;
    this.moveTimer += deltaTime;
    this.attackTimer += deltaTime;
    this.specialTimer += deltaTime;

    if (this.invulnTimer > 0) this.invulnTimer -= deltaTime;
    if (this.hitFlash > 0) this.hitFlash -= deltaTime * 2;
    if (this.shieldTimer > 0) {
      this.shieldTimer -= deltaTime;
      if (this.shieldTimer <= 0) this.shieldActive = false;
    }

    // Update phase based on health
    this.updatePhase();
    const phase = this.currentPhase;
    if (!phase) return;

    // Movement
    this._updateMovement(deltaTime, phase, playerX, playerY);

    // Keep in corridor
    const margin = this.radius + 10;
    this.x = Math.max(this.corridorLeft + margin, Math.min(this.corridorRight - margin, this.x));

    // Attacks
    if (this.attackTimer > phase.attackInterval) {
      this._executeAttack(phase, playerX, playerY);
      this.attackTimer = 0;
    }

    // Special ability
    if (this.specialTimer > this.special.cooldown) {
      this._executeSpecial(playerX, playerY);
      this.specialTimer = 0;
    }

    // Update projectiles
    this.projectiles.forEach(p => {
      if (p.homing && p.life > 0) {
        const dx = playerX - p.x;
        const dy = playerY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const targetAngle = Math.atan2(dy, dx);
          let angleDiff = targetAngle - p.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          p.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), (p.turnRate || 2) * deltaTime);
        }
        p.vx = Math.cos(p.angle) * p.speed;
        p.vy = Math.sin(p.angle) * p.speed;
      }
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      p.phase = (p.phase || 0) + 0.1;
    });
    this.projectiles = this.projectiles.filter(p => p.life > 0);

    // Update minions
    this.minions.forEach(m => {
      const dx = playerX - m.x;
      const dy = playerY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        m.x += (dx / dist) * m.speed * deltaTime;
        m.y += (dy / dist) * m.speed * deltaTime;
      }
      m.life -= deltaTime;
      m.phase = (m.phase || 0) + 0.08;
    });
    this.minions = this.minions.filter(m => m.life > 0);

    // Update laser
    if (this.laserActive) {
      this.laserTimer -= deltaTime;
      const sweepSpeed = (phase.attackParams && phase.attackParams.sweepSpeed) || 2;
      this.laserAngle += sweepSpeed * deltaTime;
      if (this.laserTimer <= 0) this.laserActive = false;
    }

    // Update shockwave
    if (this.shockwaveActive) {
      const speed = (phase.attackParams && phase.attackParams.speed) || 150;
      this.shockwaveRadius += speed * deltaTime;
      if (this.shockwaveRadius > this.shockwaveMaxRadius) {
        this.shockwaveActive = false;
      }
    }

    // Update clones
    this.clones.forEach(c => {
      c.life -= deltaTime;
      c.phase += 0.06;
      c.x += Math.sin(c.phase * 3) * 30 * deltaTime;
    });
    this.clones = this.clones.filter(c => c.life > 0);

    // Vortex pull
    if (this.vortexActive) {
      this.vortexTimer -= deltaTime;
      if (this.vortexTimer <= 0) this.vortexActive = false;
    }
  }

  _updateMovement(deltaTime, phase, playerX, playerY) {
    const speed = phase.movementSpeed || 60;
    const cw = this.corridorRight - this.corridorLeft;

    switch (phase.movementPattern) {
      case 'orbit': {
        this.moveAngle += speed * 0.02 * deltaTime;
        const orbitR = cw * 0.25;
        this.x = this.corridorCenter + Math.cos(this.moveAngle) * orbitR;
        this.y = this.homeY + Math.sin(this.moveAngle * 0.7) * 40;
        break;
      }
      case 'zigzag': {
        this.x += this.patrolDir * speed * deltaTime;
        if (this.x > this.corridorRight - this.radius - 20) this.patrolDir = -1;
        if (this.x < this.corridorLeft + this.radius + 20) this.patrolDir = 1;
        this.y = this.homeY + Math.sin(this.moveTimer * 1.5) * 25;
        break;
      }
      case 'chase': {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.radius * 2) {
          this.x += (dx / dist) * speed * deltaTime;
          this.y += (dy / dist) * speed * deltaTime * 0.3;
        }
        // Don't stray too far from home Y
        if (Math.abs(this.y - this.homeY) > 120) {
          this.y += (this.homeY - this.y) * deltaTime;
        }
        break;
      }
      case 'patrol': {
        this.x += this.patrolDir * speed * deltaTime;
        if (this.x > this.corridorRight - this.radius - 20) this.patrolDir = -1;
        if (this.x < this.corridorLeft + this.radius + 20) this.patrolDir = 1;
        break;
      }
      case 'figure_eight': {
        this.moveAngle += speed * 0.015 * deltaTime;
        const rx = cw * 0.2;
        this.x = this.corridorCenter + Math.sin(this.moveAngle) * rx;
        this.y = this.homeY + Math.sin(this.moveAngle * 2) * 30;
        break;
      }
      case 'hover_drift':
      default: {
        this.x = this.corridorCenter + Math.sin(this.moveTimer * 0.5) * cw * 0.2;
        this.y = this.homeY + Math.cos(this.moveTimer * 0.3) * 20;
        break;
      }
    }
  }

  _executeAttack(phase, playerX, playerY) {
    const params = phase.attackParams || {};

    switch (phase.attackPattern) {
      case 'projectile_burst': {
        const count = params.count || 5;
        const speed = params.speed || 120;
        const spread = params.spread || 1.2;
        const baseAngle = Math.atan2(playerY - this.y, playerX - this.x);
        for (let i = 0; i < count; i++) {
          const angle = baseAngle + (i - (count - 1) / 2) * (spread / count);
          this.projectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 4, life: 3, speed,
            angle, homing: false, phase: 0,
          });
        }
        break;
      }
      case 'laser_sweep': {
        this.laserActive = true;
        this.laserTimer = 1.5;
        this.laserAngle = Math.atan2(playerY - this.y, playerX - this.x);
        break;
      }
      case 'minion_spawn': {
        const count = params.count || 3;
        const mSpeed = params.minionSpeed || 80;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          this.minions.push({
            x: this.x + Math.cos(angle) * 30,
            y: this.y + Math.sin(angle) * 30,
            speed: mSpeed, radius: 8, life: 5, phase: 0,
          });
        }
        break;
      }
      case 'shockwave': {
        this.shockwaveActive = true;
        this.shockwaveRadius = 0;
        this.shockwaveMaxRadius = params.radius || 120;
        break;
      }
      case 'gravity_pull': {
        this.vortexActive = true;
        this.vortexTimer = 2;
        this.vortexRadius = params.radius || 150;
        this.vortexStrength = params.strength || 100;
        break;
      }
      case 'homing_orbs': {
        const count = params.count || 3;
        const speed = params.speed || 80;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          this.projectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 5, life: 4, speed,
            angle, homing: true,
            turnRate: params.turnRate || 2,
            phase: 0,
          });
        }
        break;
      }
    }
  }

  _executeSpecial(playerX, playerY) {
    switch (this.special.type) {
      case 'teleport': {
        // Blink to random position in corridor
        this.x = this.corridorLeft + this.radius + Math.random() * (this.corridorRight - this.corridorLeft - this.radius * 2);
        this.hitFlash = 0.3;
        break;
      }
      case 'shield_burst': {
        this.shieldActive = true;
        this.shieldTimer = 3;
        // Push away projectiles / player
        break;
      }
      case 'split_clone': {
        for (let i = 0; i < 2; i++) {
          this.clones.push({
            x: this.x + (i === 0 ? -40 : 40),
            y: this.y,
            radius: this.radius * 0.6,
            life: 4,
            phase: 0,
          });
        }
        break;
      }
      case 'time_slow': {
        // Handled in Game.js — boss signals time slow
        this.timeSlowActive = true;
        this.timeSlowTimer = 3;
        break;
      }
      case 'pull_vortex': {
        this.vortexActive = true;
        this.vortexTimer = 3;
        this.vortexRadius = 200;
        this.vortexStrength = 120;
        break;
      }
    }
  }

  takeDamage() {
    if (this.invulnTimer > 0 || this.shieldActive) return false;

    this.health--;
    this.invulnTimer = 0.8;
    this.hitFlash = 0.4;
    this.updatePhase();

    if (this.health <= 0) {
      this.isDying = true;
      this.deathTimer = 0;
      return true; // Boss defeated
    }
    return false;
  }

  // Apply vortex gravity pull to the player
  applyVortex(player) {
    if (!this.vortexActive) return;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < this.vortexRadius && dist > 0) {
      const force = this.vortexStrength / (dist * 0.5);
      player.vx += (dx / dist) * force * 0.016;
      player.vy += (dy / dist) * force * 0.016;
    }
  }

  checkCollision(player) {
    // Main body (0.85x reduction for fairness)
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    if (Math.sqrt(dx * dx + dy * dy) < this.radius * 0.85 + player.radius * 0.7) return 'body';

    // Projectiles
    for (const p of this.projectiles) {
      const pdx = player.x - p.x;
      const pdy = player.y - p.y;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < p.radius + player.radius * 0.6) return 'projectile';
    }

    // Minions
    for (const m of this.minions) {
      const mdx = player.x - m.x;
      const mdy = player.y - m.y;
      if (Math.sqrt(mdx * mdx + mdy * mdy) < m.radius + player.radius * 0.6) return 'minion';
    }

    // Laser
    if (this.laserActive) {
      const lx = Math.cos(this.laserAngle);
      const ly = Math.sin(this.laserAngle);
      const laserWidth = (this.currentPhase.attackParams && this.currentPhase.attackParams.width) || 4;
      // Point-to-line distance
      const px = player.x - this.x;
      const py = player.y - this.y;
      const dot = px * lx + py * ly;
      if (dot > 0) {
        const crossDist = Math.abs(px * ly - py * lx);
        if (crossDist < laserWidth + player.radius * 0.6) return 'laser';
      }
    }

    // Shockwave ring
    if (this.shockwaveActive) {
      const sdx = player.x - this.x;
      const sdy = player.y - this.y;
      const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
      if (Math.abs(sdist - this.shockwaveRadius) < 10 + player.radius) return 'shockwave';
    }

    // Clones
    for (const c of this.clones) {
      const cdx = player.x - c.x;
      const cdy = player.y - c.y;
      if (Math.sqrt(cdx * cdx + cdy * cdy) < c.radius + player.radius * 0.6) return 'clone';
    }

    return null;
  }

  draw(ctx, cameraY) {
    if (this.isDying) {
      this._drawDeath(ctx, cameraY);
      return;
    }
    const _noShadow = window._voidHopperGfx === 'low';

    const screenY = this.y - cameraY;
    const pulse = Math.sin(this.phase * 2) * 0.1 + 1;
    const flash = this.hitFlash > 0 ? 1 : 0;

    ctx.save();
    ctx.translate(this.x, screenY);

    // Shield
    if (this.shieldActive) {
      ctx.strokeStyle = this.color.glow;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.4 + Math.sin(this.phase * 5) * 0.2;
      ctx.shadowBlur = _noShadow ? 0 : 15;
      ctx.shadowColor = this.color.glow;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // Vortex visual
    if (this.vortexActive) {
      ctx.strokeStyle = `rgba(150, 50, 200, 0.3)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, this.vortexRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Spiral lines
      for (let i = 0; i < 3; i++) {
        const angle = this.phase * 2 + (i * Math.PI * 2) / 3;
        ctx.strokeStyle = `rgba(150, 50, 200, 0.2)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let r = 20; r < this.vortexRadius; r += 5) {
          const a = angle + r * 0.03;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.stroke();
      }
    }

    // Outer glow aura
    const auraGrad = ctx.createRadialGradient(0, 0, this.radius * 0.5, 0, 0, this.radius * 2);
    auraGrad.addColorStop(0, this.color.glow + '40');
    auraGrad.addColorStop(1, this.color.glow + '00');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Main body
    const bodyGrad = ctx.createRadialGradient(-this.radius * 0.2, -this.radius * 0.2, 0, 0, 0, this.radius * pulse);
    bodyGrad.addColorStop(0, flash ? '#ffffff' : this.color.primary);
    bodyGrad.addColorStop(0.6, this.color.secondary);
    bodyGrad.addColorStop(1, this.color.secondary + '88');
    ctx.fillStyle = bodyGrad;
    ctx.shadowBlur = _noShadow ? 0 : 12;
    ctx.shadowColor = this.color.glow;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Inner pattern — angular plates
    ctx.strokeStyle = this.color.glow + '66';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = this.phase * 0.5 + (i * Math.PI) / 3;
      const r1 = this.radius * 0.3;
      const r2 = this.radius * 0.75;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Eye
    const eyeSize = this.radius * 0.35;
    ctx.fillStyle = '#000011';
    ctx.beginPath();
    ctx.ellipse(0, -this.radius * 0.15, eyeSize, eyeSize * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris
    const hpRatio = this.health / this.maxHealth;
    const irisColor = hpRatio > 0.5 ? this.color.eye : '#ff3333';
    ctx.fillStyle = irisColor;
    ctx.shadowBlur = _noShadow ? 0 : 6;
    ctx.shadowColor = irisColor;
    ctx.beginPath();
    ctx.ellipse(0, -this.radius * 0.15, eyeSize * 0.5, eyeSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, -this.radius * 0.15, eyeSize * 0.15, eyeSize * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();

    // Draw projectiles
    this.projectiles.forEach(p => {
      const py = p.y - cameraY;
      ctx.fillStyle = this.color.glow;
      ctx.shadowBlur = _noShadow ? 0 : 6;
      ctx.shadowColor = this.color.glow;
      ctx.beginPath();
      ctx.arc(p.x, py, p.radius + Math.sin(p.phase) * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw minions
    this.minions.forEach(m => {
      const my = m.y - cameraY;
      const mPulse = 1 + Math.sin(m.phase) * 0.15;
      ctx.fillStyle = this.color.secondary;
      ctx.shadowBlur = _noShadow ? 0 : 5;
      ctx.shadowColor = this.color.glow;
      ctx.beginPath();
      ctx.arc(m.x, my, m.radius * mPulse, 0, Math.PI * 2);
      ctx.fill();
      // Minion eye
      ctx.fillStyle = this.color.eye || '#ffffff';
      ctx.beginPath();
      ctx.arc(m.x, my - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw laser
    if (this.laserActive) {
      const laserWidth = (this.currentPhase.attackParams && this.currentPhase.attackParams.width) || 4;
      const lx = Math.cos(this.laserAngle);
      const ly = Math.sin(this.laserAngle);
      const len = 500;

      ctx.save();
      ctx.translate(this.x, this.y - cameraY);

      // Glow
      ctx.strokeStyle = `rgba(255, 50, 50, 0.3)`;
      ctx.lineWidth = laserWidth * 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(lx * len, ly * len);
      ctx.stroke();

      // Core
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = laserWidth;
      ctx.shadowBlur = _noShadow ? 0 : 10;
      ctx.shadowColor = '#ff0000';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(lx * len, ly * len);
      ctx.stroke();

      // Bright center
      ctx.strokeStyle = '#ffaaaa';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(lx * len, ly * len);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Draw shockwave
    if (this.shockwaveActive) {
      const alpha = 1 - (this.shockwaveRadius / this.shockwaveMaxRadius);
      ctx.strokeStyle = this.color.glow;
      ctx.lineWidth = 4 * alpha;
      ctx.globalAlpha = alpha * 0.6;
      ctx.shadowBlur = _noShadow ? 0 : 8;
      ctx.shadowColor = this.color.glow;
      ctx.beginPath();
      ctx.arc(this.x, this.y - cameraY, this.shockwaveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // Draw clones
    this.clones.forEach(c => {
      const cy = c.y - cameraY;
      ctx.globalAlpha = 0.4 + Math.sin(c.phase * 3) * 0.1;
      ctx.fillStyle = this.color.primary + '88';
      ctx.beginPath();
      ctx.arc(c.x, cy, c.radius, 0, Math.PI * 2);
      ctx.fill();
      // Clone eye
      ctx.fillStyle = this.color.eye || '#ffffff';
      ctx.beginPath();
      ctx.arc(c.x, cy - c.radius * 0.15, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Health bar
    this._drawHealthBar(ctx, cameraY);
  }

  _drawHealthBar(ctx, cameraY) {
    const screenY = this.y - cameraY;
    const barWidth = 60;
    const barHeight = 6;
    const barY = screenY - this.radius - 20;

    // Name
    ctx.save();
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.color.glow;
    ctx.shadowBlur = _noShadow ? 0 : 4;
    ctx.shadowColor = this.color.glow;
    ctx.fillText(this.name, this.x, barY - 6);
    ctx.shadowBlur = 0;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);

    // Health fill
    const hpRatio = this.health / this.maxHealth;
    const hpColor = hpRatio > 0.5 ? this.color.glow : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillStyle = hpColor;
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth * hpRatio, barHeight);

    // Border
    ctx.strokeStyle = '#ffffff44';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x - barWidth / 2, barY, barWidth, barHeight);
    ctx.restore();
  }

  _drawDeath(ctx, cameraY) {
    const screenY = this.y - cameraY;
    const t = this.deathTimer;
    const expand = 1 + t * 2;
    const alpha = Math.max(0, 1 - t * 0.5);

    ctx.save();
    ctx.translate(this.x, screenY);
    ctx.globalAlpha = alpha;

    // Expanding ring
    ctx.strokeStyle = this.color.glow;
    ctx.lineWidth = 3;
    ctx.shadowBlur = window._voidHopperGfx === 'low' ? 0 : 15;
    ctx.shadowColor = this.color.glow;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * expand, 0, Math.PI * 2);
    ctx.stroke();

    // Shrinking body
    const shrink = Math.max(0, 1 - t * 1.5);
    ctx.fillStyle = this.color.primary;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * shrink, 0, Math.PI * 2);
    ctx.fill();

    // Particle burst
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + t;
      const dist = t * 120;
      ctx.fillStyle = this.color.glow;
      ctx.globalAlpha = alpha * 0.6;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 4 * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

export default Boss;
