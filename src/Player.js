

class Player {
  constructor(x, y, screenWidth = 390) {
    const ss = Math.max(1, screenWidth / 390);
    this.screenScale = ss;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = Math.round(12 * ss);
    this.mass = 1.0;
    this.rotation = 0;
    this.trail = [];
    this.maxTrailLength = 20;
    this.wingFlap = 0;
    this.wingFlapSpeed = 0.3;

    // State management
    this.isStuck = true;
    this.currentSide = 'left';

    // Aiming
    this.isAiming = false;
    this.aimAngle = 0;
    this.aimPower = 900;

    // Scoring
    this.launchY = y;

    // Track which wall the bird launched from
    this.launchSide = null;

    // Skin (set externally)
    this.skin = null;

    // Equipped trail effect (set externally)
    this.activeTrail = null;
    this.trailParticles = [];

    // Animation particles for premium skins
    this.animParticles = [];

    // Death state
    this.isDying = false;
    this.deathTime = 0;

    // Power-up states
    this.hasShield = false;
    this.shieldTimer = 0;
    this.hasMagnet = false;
    this.magnetTimer = 0;
    this.hasSlowmo = false;
    this.slowmoTimer = 0;
    this.hasSpeedBoost = false;
    this.speedBoostTimer = 0;

    // Mood system — continuous 0-100 meter
    // 0-20: Chill (slow, calm, blue tint)
    // 21-50: Neutral (normal play)
    // 51-75: Fired Up (faster, warm glow, bigger trail)
    // 76-100: On Fire (max speed, flame trail, intense glow, eyes blazing)
    this.mood = 30; // Start slightly above chill
    this.moodDisplay = 30; // Smoothly animated display value
    this.moodFlashTimer = 0; // Flash when mood changes tier
    this.moodFlashDir = 0; // +1 for up, -1 for down

    // Invincibility frames after shield break
    this.invincibleTimer = 0;

    // Danger pulse — spikes when near enemies, used for visual feedback
    this.dangerPulse = 0; // 0-1, decays quickly
  }

  // Mood tier: 'chill', 'neutral', 'firedup', 'onfire'
  getMoodTier() {
    if (this.mood >= 76) return 'onfire';
    if (this.mood >= 51) return 'firedup';
    if (this.mood <= 20) return 'chill';
    return 'neutral';
  }

  // Add mood (positive events)
  addMood(amount) {
    const oldTier = this.getMoodTier();
    this.mood = Math.min(100, this.mood + amount);
    const newTier = this.getMoodTier();
    if (newTier !== oldTier) {
      this.moodFlashTimer = 0.6;
      this.moodFlashDir = 1;
    }
  }

  // Drain mood (negative events / danger)
  drainMood(amount) {
    const oldTier = this.getMoodTier();
    this.mood = Math.max(0, this.mood - amount);
    const newTier = this.getMoodTier();
    if (newTier !== oldTier) {
      this.moodFlashTimer = 0.4;
      this.moodFlashDir = -1;
    }
  }

  // Set danger pulse (for visual feedback near enemies)
  setDanger(intensity) {
    this.dangerPulse = Math.max(this.dangerPulse, Math.min(1, intensity));
  }

  // Mood -> Gameplay: hitbox scale (on fire = slightly smaller, chill = bigger)
  getHitboxScale() {
    const tier = this.getMoodTier();
    if (tier === 'onfire') return 0.85;
    if (tier === 'chill') return 1.1;
    return 1.0;
  }

  // Mood -> Gameplay: launch power multiplier
  getLaunchPowerMultiplier() {
    if (this.mood >= 76) return 1.15;
    if (this.mood >= 51) return 1.08;
    if (this.mood <= 20) return 0.92;
    return 1.0;
  }

  // Mood -> Gameplay: coin value multiplier
  getCoinMultiplier() {
    if (this.mood >= 76) return 1.5;
    if (this.mood >= 51) return 1.25;
    return 1.0;
  }

  // Mood -> Gameplay: speed multiplier
  getSpeedMultiplier() {
    if (this.mood >= 76) return 1.1;
    if (this.mood >= 51) return 1.05;
    if (this.mood <= 20) return 0.95;
    return 1.0;
  }

  // Mood -> Visual: wing flap speed multiplier
  getWingFlapMult() {
    if (this.mood >= 76) return 2.5;
    if (this.mood >= 51) return 1.5;
    if (this.mood <= 20) return 0.6;
    return 1.0;
  }

  // Mood -> Visual: trail length multiplier
  getTrailMult() {
    if (this.mood >= 76) return 2.5;
    if (this.mood >= 51) return 1.5;
    return 1.0;
  }

  // Register a near-miss (enemy passed within close range without hitting)
  registerNearMiss() {
    this.addMood(8);
  }

  applyGravity(gravity, deltaTime) {
    this.vy += gravity * deltaTime;
  }

  applyForce(fx, fy) {
    this.vx += fx / this.mass;
    this.vy += fy / this.mass;
  }

  applyImpulse(dx, dy) {
    this.vx += dx;
    this.vy += dy;
  }

  update(deltaTime) {
    this._lastDeltaTime = deltaTime;

    // Tick down invincibility frames
    if (this.invincibleTimer > 0) this.invincibleTimer -= deltaTime;

    // Velocity cap — prevent clipping through walls at extreme speed
    const maxSpeed = 1800 * (this.screenScale || 1);
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      this.vx *= scale;
      this.vy *= scale;
    }

    if (!this.isStuck) {
      // Update position only when not stuck
      this.x += this.vx * deltaTime;
      this.y += this.vy * deltaTime;

      // Update rotation based on velocity
      const targetRotation = Math.atan2(this.vx, -this.vy);
      this.rotation = this.rotation * 0.8 + targetRotation * 0.2;

      // Add to trail (compact in-place to avoid GC pressure from slice)
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.maxTrailLength * 2) {
        const keep = this.maxTrailLength;
        const start = this.trail.length - keep;
        for (let i = 0; i < keep; i++) this.trail[i] = this.trail[start + i];
        this.trail.length = keep;
      }
    } else {
      // When stuck, face the opposite wall with slight upward tilt
      if (this.currentSide === 'left') {
        // On left wall, face right and slightly up
        this.rotation = Math.PI / 2 - 0.3; // 90 degrees minus ~17 degrees
      } else {
        // On right wall, face left and slightly up
        this.rotation = -Math.PI / 2 + 0.3; // -90 degrees plus ~17 degrees
      }
      // Reset wing flap to neutral position when stuck
      this.wingFlap = 0;
    }

    // Update wing flap animation — speed scales with mood
    if (!this.isStuck) {
      this.wingFlap += this.wingFlapSpeed * this.getWingFlapMult();
    }

    // Update trail effect particles
    this._updateTrailParticles(deltaTime);

    // Update animation particles for premium skins
    this._updateAnimParticles(deltaTime);

    // Mood naturally decays toward neutral (30) over time
    const moodTarget = 30;
    // Gentle proportional decay: enough to prevent permanent max without constant play
    const excess = Math.max(0, this.mood - moodTarget);
    const decayRate = this.mood > moodTarget
      ? 0.5 + (excess / 70) * 1.5   // scales from 0.5/sec at mood 31 to 2.0/sec at mood 100
      : 2; // faster recovery from low
    if (Math.abs(this.mood - moodTarget) > 0.5) {
      if (this.mood > moodTarget) {
        this.mood = Math.max(moodTarget, this.mood - decayRate * deltaTime);
      } else {
        this.mood = Math.min(moodTarget, this.mood + decayRate * deltaTime);
      }
    }

    // Smooth display value toward actual mood
    const displaySpeed = 40; // Units per second
    if (Math.abs(this.moodDisplay - this.mood) > 0.5) {
      this.moodDisplay += Math.sign(this.mood - this.moodDisplay) * Math.min(displaySpeed * deltaTime, Math.abs(this.mood - this.moodDisplay));
    } else {
      this.moodDisplay = this.mood;
    }

    // Decay mood flash
    if (this.moodFlashTimer > 0) {
      this.moodFlashTimer -= deltaTime;
      if (this.moodFlashTimer <= 0) {
        this.moodFlashTimer = 0;
        this.moodFlashDir = 0;
      }
    }

    // Decay danger pulse
    if (this.dangerPulse > 0) {
      this.dangerPulse = Math.max(0, this.dangerPulse - deltaTime * 3);
    }

    // Trail length scales with mood
    this.maxTrailLength = Math.floor(20 * this.getTrailMult());
  }

  _updateTrailParticles(deltaTime) {
    // Update existing trail particles (in-place compaction to avoid splice GC)
    let w = 0;
    for (let i = 0; i < this.trailParticles.length; i++) {
      const p = this.trailParticles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += (p.gravity || 0) * deltaTime;
      p.life -= deltaTime;
      p.age += deltaTime;
      if (p.rotation !== undefined) p.rotation += p.rotSpeed * deltaTime;
      if (p.life > 0) this.trailParticles[w++] = p;
    }
    this.trailParticles.length = w;

    // Spawn new trail particles only when flying
    const t = this.activeTrail;
    if (!t || t.type === 'default' || this.isStuck || this.isDying) return;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed < 50) return; // Don't emit when barely moving

    const rate = t.rate || 3;
    for (let i = 0; i < rate; i++) {
      const spread = t.spread || 10;
      const sizeRange = t.particleSize || [2, 5];
      const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      const lifetime = (t.lifetime || 0.8) * (0.7 + Math.random() * 0.6);
      const ox = (Math.random() - 0.5) * spread;
      const oy = (Math.random() - 0.5) * spread;
      // Emit opposite to velocity direction (gentle drift)
      const evx = -this.vx * 0.05 + (Math.random() - 0.5) * spread;
      const evy = -this.vy * 0.05 + (Math.random() - 0.5) * spread;

      let color;
      if (t.type === 'rainbow') {
        const hue = (Date.now() / 5 + i * 40) % 360;
        color = `hsl(${hue}, 90%, 60%)`;
      } else {
        color = (t.colors && t.colors.length > 0) ? t.colors[Math.floor(Math.random() * t.colors.length)] : '#ffffff';
      }

      const particle = {
        x: this.x + ox,
        y: this.y + oy,
        vx: evx,
        vy: evy,
        size,
        life: lifetime,
        maxLife: lifetime,
        age: 0,
        color,
        gravity: t.gravity || 0,
        trailType: t.type,
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 4,
      };

      // Premium type extras
      if (t.type === 'inferno' && Math.random() < 0.3) {
        particle.color = t.smokeColors[Math.floor(Math.random() * t.smokeColors.length)];
        particle.isSmoke = true;
        particle.size = size * 1.8;
        particle.life *= 1.5;
        particle.maxLife = particle.life;
        particle.gravity = -50;
      }

      if (t.type === 'nebula') {
        particle.size = size * (1 + Math.random());
        particle.vx *= 0.5;
        particle.vy *= 0.5;
      }

      this.trailParticles.push(particle);
    }

    // Cap particle count
    if (this.trailParticles.length > 60) {
      this.trailParticles.splice(0, this.trailParticles.length - 60);
    }
  }

  _drawTrailEffect(ctx, cameraY, gfxLevel) {
    if (this.trailParticles.length === 0) return;
    const t = this.activeTrail;
    if (!t) return;
    const allowShadow = gfxLevel !== 'low';

    ctx.save();

    for (let i = 0; i < this.trailParticles.length; i++) {
      const p = this.trailParticles[i];
      const screenY = p.y - cameraY;
      const alpha = Math.min(1, p.life / p.maxLife);

      switch (p.trailType) {
        case 'particles':
        case 'rainbow': {
          ctx.globalAlpha = alpha * 0.8;
          ctx.fillStyle = p.color;
          if (allowShadow) {
            ctx.shadowBlur = 4;
            ctx.shadowColor = p.color;
          }
          ctx.beginPath();
          ctx.arc(p.x, screenY, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          break;
        }
        case 'bubbles': {
          ctx.globalAlpha = alpha * 0.5;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          const bSize = p.size * (0.5 + alpha * 0.5);
          ctx.beginPath();
          ctx.arc(p.x, screenY, bSize, 0, Math.PI * 2);
          ctx.stroke();
          // Highlight
          ctx.globalAlpha = alpha * 0.3;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x - bSize * 0.3, screenY - bSize * 0.3, bSize * 0.25, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'stars': {
          ctx.globalAlpha = alpha * (0.5 + Math.sin(p.age * 8) * 0.3);
          ctx.fillStyle = p.color;
          if (allowShadow) {
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color;
          }
          this._drawStar(ctx, p.x, screenY, 4, p.size * alpha, p.size * alpha * 0.4, p.rotation);
          ctx.shadowBlur = 0;
          break;
        }
        case 'lightning': {
          ctx.globalAlpha = alpha * 0.9;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * alpha;
          if (allowShadow) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
          }
          ctx.beginPath();
          ctx.moveTo(p.x, screenY);
          const segs = 3;
          for (let s = 1; s <= segs; s++) {
            ctx.lineTo(
              p.x + (Math.random() - 0.5) * 16,
              screenY + (Math.random() - 0.5) * 16
            );
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
          break;
        }
        case 'afterimage': {
          ctx.globalAlpha = alpha * 0.6;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, screenY, p.size * (0.3 + alpha * 0.7), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'petals': {
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, screenY);
          ctx.rotate(p.rotation);
          // Petal shape
          const ps = p.size * alpha;
          ctx.beginPath();
          ctx.ellipse(0, 0, ps, ps * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, ps * 0.5, ps, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'nebula': {
          ctx.globalAlpha = alpha * 0.6;
          const grad = ctx.createRadialGradient(p.x, screenY, 0, p.x, screenY, p.size);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, screenY, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'inferno': {
          if (p.isSmoke) {
            ctx.globalAlpha = alpha * 0.25;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, screenY, p.size * (1.5 - alpha * 0.5), 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.globalAlpha = alpha * 0.85;
            ctx.fillStyle = p.color;
            if (allowShadow) {
              ctx.shadowBlur = 6;
              ctx.shadowColor = p.color;
            }
            ctx.beginPath();
            ctx.arc(p.x, screenY, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
          break;
        }
        case 'void': {
          ctx.globalAlpha = alpha * 0.7;
          const vGrad = ctx.createRadialGradient(p.x, screenY, 0, p.x, screenY, p.size);
          vGrad.addColorStop(0, '#000000');
          vGrad.addColorStop(0.6, p.color);
          vGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = vGrad;
          ctx.beginPath();
          ctx.arc(p.x, screenY, p.size * (1.2 - alpha * 0.2), 0, Math.PI * 2);
          ctx.fill();
          // Edge glow
          if (allowShadow) {
            ctx.strokeStyle = '#8800ff';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#8800ff';
            ctx.globalAlpha = alpha * 0.4;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
          break;
        }
        case 'glitch': {
          ctx.globalAlpha = alpha * 0.8;
          ctx.fillStyle = p.color;
          // Rectangular glitch fragments
          const gw = p.size * (1 + Math.random());
          const gh = p.size * (0.3 + Math.random() * 0.5);
          ctx.fillRect(p.x - gw / 2, screenY - gh / 2, gw, gh);
          // Random offset duplicate
          if (Math.random() < 0.3) {
            ctx.globalAlpha = alpha * 0.4;
            ctx.fillRect(p.x - gw / 2 + 3, screenY - gh / 2 - 2, gw, gh);
          }
          break;
        }
        case 'aurora': {
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, screenY);
          ctx.scale(2.5, 1);
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }
        default: break;
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawStar(ctx, cx, cy, points, outerR, innerR, rotation) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _updateAnimParticles(deltaTime) {
    const s = this.skin;
    if (!s || !s.animated) return;

    // Spawn new particles
    const now = Date.now();
    const anim = s.animated;

    if (anim === 'fire' || anim === 'cosmic') {
      if (Math.random() < 0.4) {
        this.animParticles.push({
          ox: (Math.random() - 0.5) * 16,
          oy: (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 30,
          vy: -20 - Math.random() * 40,
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.4 + Math.random() * 0.3,
          size: 2 + Math.random() * 3,
          type: 'fire',
        });
      }
    }
    if (anim === 'electric') {
      if (Math.random() < 0.25) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 8;
        this.animParticles.push({
          ox: Math.cos(angle) * dist,
          oy: Math.sin(angle) * dist,
          vx: 0, vy: 0,
          life: 0.15 + Math.random() * 0.1,
          maxLife: 0.15 + Math.random() * 0.1,
          size: 1 + Math.random() * 2,
          type: 'electric',
          angle: angle,
          orbitDist: dist,
          endAngle: angle + (Math.random() - 0.5) * 1.5,
          endDist: dist + (Math.random() - 0.5) * 10,
        });
      }
    }
    if (anim === 'galaxy' || anim === 'cosmic') {
      if (Math.random() < 0.3) {
        const angle = Math.random() * Math.PI * 2;
        this.animParticles.push({
          ox: 0, oy: 0,
          orbitAngle: angle,
          orbitDist: 8 + Math.random() * 10,
          orbitSpeed: 2 + Math.random() * 2,
          life: 0.6 + Math.random() * 0.4,
          maxLife: 0.6 + Math.random() * 0.4,
          size: 1 + Math.random() * 2,
          type: 'star',
          hue: Math.random() * 360,
        });
      }
    }
    if (anim === 'shimmer') {
      if (Math.random() < 0.35) {
        this.animParticles.push({
          ox: (Math.random() - 0.5) * 20,
          oy: (Math.random() - 0.5) * 24,
          vx: (Math.random() - 0.5) * 10,
          vy: -5 - Math.random() * 10,
          life: 0.3 + Math.random() * 0.3,
          maxLife: 0.3 + Math.random() * 0.3,
          size: 1.5 + Math.random() * 2,
          type: 'shimmer',
          hue: Math.random() * 360,
        });
      }
    }

    // Update existing (in-place compaction)
    let aw = 0;
    for (let i = 0; i < this.animParticles.length; i++) {
      const p = this.animParticles[i];
      p.life -= deltaTime;
      if (p.life <= 0) continue;
      if (p.type === 'fire' || p.type === 'shimmer') {
        p.ox += p.vx * deltaTime;
        p.oy += p.vy * deltaTime;
      }
      if (p.type === 'star') {
        p.orbitAngle += p.orbitSpeed * deltaTime;
      }
      this.animParticles[aw++] = p;
    }
    this.animParticles.length = aw;

    // Cap particles
    if (this.animParticles.length > 30) {
      this.animParticles.splice(0, this.animParticles.length - 30);
    }
  }

  startAiming(mouseX, mouseY) {
    if (this.isStuck) {
      this.isAiming = true;
      this.updateAim(mouseX, mouseY);
    }
  }

  updateAim(mouseX, mouseY) {
    if (this.isAiming) {
      // Calculate angle from bird to mouse
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      let angle = Math.atan2(dy, dx);

      // Restrict angles based on which wall bird is stuck to
      // Must aim upward — range: 10 deg to 55 deg above horizontal
      if (this.currentSide === 'left') {
        // On left wall - must aim rightward and upward
        const maxUpAngle = -Math.PI * 55 / 180; // 75 deg up from horizontal (steepest)
        const minUpAngle = -Math.PI * 10 / 180; // 10 deg up from horizontal (shallowest)

        // If aiming left (angle > pi/2 or angle < -pi/2), clamp to steepest
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
          angle = maxUpAngle;
        } else if (angle > minUpAngle) {
          // If aiming too horizontal or downward, clamp to shallowest
          angle = minUpAngle;
        } else {
          // Clamp within valid range
          angle = Math.max(maxUpAngle, Math.min(minUpAngle, angle));
        }
      } else {
        // On right wall - must aim leftward and upward
        const maxUpAngle = -Math.PI + Math.PI * 55 / 180; // 55 deg up from horizontal left
        const minUpAngle = -Math.PI + Math.PI * 10 / 180; // 10 deg up from horizontal left

        // If aiming right (between -pi/2 and pi/2), force to steepest
        if (angle > -Math.PI / 2 && angle < Math.PI / 2) {
          angle = maxUpAngle;
        }
        // If aiming downward-left (between pi/2 and pi), clamp to shallowest
        else if (angle > 0 && angle < Math.PI) {
          angle = minUpAngle;
        }
        // Otherwise clamp within valid range
        else {
          angle = Math.max(minUpAngle, Math.min(maxUpAngle, angle));
        }
      }

      this.aimAngle = angle;
    }
  }

  launch() {
    if (this.isStuck && this.isAiming) {
      // Launch in the aimed direction, modified by emotion and skin ability
      const power = this.aimPower * this.getLaunchPowerMultiplier() * (this.skinLaunchMult || 1);
      this.vx = Math.cos(this.aimAngle) * power;
      this.vy = Math.sin(this.aimAngle) * power;
      this.isStuck = false;
      this.isAiming = false;
      this.launchSide = this.currentSide; // Remember which wall we launched from
      this.launchY = this.y; // Store Y position at launch
    }
  }

  stickToWall(side, x, y) {
    this.isStuck = true;
    this.currentSide = side;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.isAiming = false;
    this.launchSide = null; // Clear launch side when sticking to a new wall
  }

  drawTrajectory(ctx, cameraY, gravity) {
    if (!this.isAiming) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Calculate trajectory points
    const launchMult = this.getLaunchPowerMultiplier();
    const vx = Math.cos(this.aimAngle) * this.aimPower * launchMult;
    const vy = Math.sin(this.aimAngle) * this.aimPower * launchMult;
    const steps = 30;
    const dt = 0.05;

    ctx.beginPath();
    ctx.moveTo(this.x, this.y - cameraY);

    let x = this.x;
    let y = this.y;
    let velX = vx;
    let velY = vy;

    for (let i = 0; i < steps; i++) {
      velY += gravity * 60 * dt; // Apply gravity (scaled to match deltaTime-based physics)
      x += velX * dt;
      y += velY * dt;

      const screenY = y - cameraY;
      ctx.lineTo(x, screenY);

      // Draw dots along trajectory
      if (i % 3 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(x - 2, screenY - 2, 4, 4);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  applyHillBoost(normal) {
    const boostMagnitude = 900 * (this.screenScale || 1);

    // Calculate perpendicular direction to normal (along the slope)
    const slopeDx = -normal.y;
    const slopeDy = normal.x;

    // Normalize
    const length = Math.sqrt(slopeDx * slopeDx + slopeDy * slopeDy);
    if (length < 0.001) return;
    const normalizedDx = (slopeDx / length) * boostMagnitude;
    const normalizedDy = Math.abs((slopeDy / length) * boostMagnitude);

    const dt = this._lastDeltaTime || 0.016;
    this.applyForce(normalizedDx * dt, normalizedDy * dt);
  }

  getSkinColors() {
    const s = this.skin;
    if (!s) {
      return {
        body: '#ba55d3', bodyStroke: '#9370db', head: '#da70d6',
        wing: '#9370db', wingStroke: '#7b68ee', antenna: '#7b68ee',
        antennaGlow: '#4dccff', tail: '#9370db', tailStroke: '#7b68ee',
        beak: '#ffd700', trail: 'rgba(147, 112, 219, 0.5)',
      };
    }
    // Rainbow skin cycles colors
    if (s.isRainbow) {
      const t = Date.now() / 500;
      const h = (t * 60) % 360;
      return {
        body: `hsl(${h}, 80%, 55%)`, bodyStroke: `hsl(${h}, 70%, 40%)`,
        head: `hsl(${(h + 30) % 360}, 85%, 65%)`,
        wing: `hsl(${(h + 60) % 360}, 80%, 50%)`,
        wingStroke: `hsl(${(h + 60) % 360}, 70%, 40%)`,
        antenna: `hsl(${(h + 90) % 360}, 80%, 60%)`,
        antennaGlow: `hsl(${(h + 120) % 360}, 90%, 70%)`,
        tail: `hsl(${(h + 150) % 360}, 80%, 50%)`,
        tailStroke: `hsl(${(h + 150) % 360}, 70%, 40%)`,
        beak: '#ffee00',
        trail: `hsla(${h}, 80%, 55%, 0.5)`,
        breast: s.breast,
        earTufts: s.earTufts,
        eyeRing: s.eyeRing,
        crest: s.crest ? `hsl(${(h + 180) % 360}, 80%, 60%)` : undefined,
      };
    }
    return s;
  }

  getBirdType() {
    return (this.skin && this.skin.birdType) || 'default';
  }

  draw(ctx, cameraY, gfxLevel, spriteManager) {
    const screenY = this.y - cameraY;
    // Cache skin colors — only recompute when skin changes or for rainbow
    if (!this._cachedColors || this._cachedSkinId !== this.skinId || (this.skin && this.skin.isRainbow)) {
      this._cachedColors = this.getSkinColors();
      this._cachedSkinId = this.skinId;
    }
    const c = this._cachedColors;
    const birdType = this.getBirdType();
    const allowShadow = gfxLevel !== 'low';

    // Hide trail when dead
    if (this.isDying) {
      this.trail = [];
      this.trailParticles = [];
    }

    // Draw trail — batched into single path
    ctx.save();
    ctx.fillStyle = c.trail;
    ctx.beginPath();
    for (let i = 0; i < this.trail.length - 1; i++) {
      const alpha = i / this.trail.length;
      if (alpha < 0.1) continue; // Skip nearly invisible trail dots
      const size = alpha * 4;
      const ty = this.trail[i].y - cameraY;
      ctx.moveTo(this.trail[i].x + size, ty);
      ctx.arc(this.trail[i].x, ty, size, 0, Math.PI * 2);
    }
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Draw equipped trail effect (behind bird, on top of basic trail)
    this._drawTrailEffect(ctx, cameraY, gfxLevel);

    // Draw animation particles BEHIND the bird
    this._drawAnimParticles(ctx, screenY, 'behind');

    // Shield bubble (drawn behind bird)
    if (this.hasShield) {
      ctx.save();
      ctx.translate(this.x, screenY);
      const shieldPulse = Math.sin(Date.now() / 150) * 0.1 + 1;
      ctx.strokeStyle = '#44aaff';
      ctx.lineWidth = 2;
      if (allowShadow) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#44aaff';
      }
      ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 200) * 0.15;
      ctx.beginPath();
      ctx.arc(0, 0, 22 * ss * shieldPulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#44aaff';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Mood-based body aura (behind bird)
    const tier = this.getMoodTier();
    if (tier === 'onfire' || tier === 'firedup') {
      ctx.save();
      ctx.translate(this.x, screenY);
      const auraPulse = Math.sin(Date.now() / 120) * 0.15 + 0.85;
      const auraSize = (tier === 'onfire' ? 24 : 18) * ss;
      const auraAlpha = tier === 'onfire' ? 0.25 : 0.12;
      ctx.globalAlpha = auraAlpha * auraPulse;
      if (allowShadow) {
        ctx.shadowBlur = tier === 'onfire' ? 20 : 10;
        ctx.shadowColor = tier === 'onfire' ? '#ff4400' : '#ffaa44';
      }
      ctx.fillStyle = tier === 'onfire' ? '#ff6600' : '#ffcc44';
      ctx.beginPath();
      ctx.arc(0, 0, auraSize * auraPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Danger red pulse aura
    if (this.dangerPulse > 0.2) {
      ctx.save();
      ctx.translate(this.x, screenY);
      ctx.globalAlpha = this.dangerPulse * 0.2;
      if (allowShadow) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0000';
      }
      ctx.fillStyle = '#ff2222';
      ctx.beginPath();
      ctx.arc(0, 0, 20 * ss, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw bird body based on type
    // Use 2x internal scale for crisper rendering on high-DPR screens
    const ss = this.screenScale || 1;
    const birdScale = 2;
    const birdSize = Math.round(30 * ss); // logical radius to cover bird artwork (scaled)
    const offW = birdSize * 2 * birdScale;
    const offH = birdSize * 2 * birdScale;
    if (!this._birdCanvas) {
      this._birdCanvas = document.createElement('canvas');
    }
    const offCanvas = this._birdCanvas;
    if (offCanvas.width !== offW || offCanvas.height !== offH) {
      offCanvas.width = offW;
      offCanvas.height = offH;
    }
    const offCtx = offCanvas.getContext('2d');
    offCtx.clearRect(0, 0, offW, offH);
    offCtx.save();
    offCtx.translate(offW / 2, offH / 2);
    offCtx.scale(birdScale, birdScale);

    // Draw bird using canvas procedural art per birdType
    switch (birdType) {
      case 'owl': this._drawOwl(offCtx, c); break;
      case 'robin': this._drawRobin(offCtx, c); break;
      case 'eagle': this._drawEagle(offCtx, c); break;
      case 'jay': this._drawJay(offCtx, c); break;
      case 'parrot': this._drawParrot(offCtx, c); break;
      default: this._drawDefault(offCtx, c); break;
    }
    offCtx.restore();

    // Blit the high-res offscreen bird onto the main canvas
    ctx.save();
    ctx.translate(this.x, screenY);
    ctx.rotate(this.rotation);
    ctx.drawImage(offCanvas, -birdSize, -birdSize, birdSize * 2, birdSize * 2);
    ctx.restore();

    // Draw animation particles IN FRONT of the bird
    this._drawAnimParticles(ctx, screenY, 'front');
  }

  // ── DEFAULT SPACE BIRD ─────────────────────────────────
  _drawDefault(ctx, c) {
    const wingAngle = Math.sin(this.wingFlap) * 0.4;

    // Left wing
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-8, 0, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right wing
    ctx.save();
    ctx.rotate(-wingAngle);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(8, 0, 10, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Body
    ctx.fillStyle = c.body;
    ctx.strokeStyle = c.bodyStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.fillStyle = c.head;
    ctx.strokeStyle = c.bodyStroke;
    ctx.beginPath();
    ctx.arc(0, -9, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Beak
    this._drawBeak(ctx, c);

    // Face
    this._drawFace(ctx, c);

    // Antennas
    if (c.antenna) {
      this._drawAntennas(ctx, c);
    }

    // Tail feathers
    this._drawTailFeathers(ctx, c);
  }

  // ── OWL ────────────────────────────────────────────────
  _drawOwl(ctx, c) {
    const wingAngle = Math.sin(this.wingFlap) * 0.3;

    // Wings (rounder for owl)
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-9, 0, 9, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-wingAngle);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(9, 0, 9, 7, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Body (rounder/chubbier)
    ctx.fillStyle = c.body;
    ctx.strokeStyle = c.bodyStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head (big and round)
    ctx.fillStyle = c.head;
    ctx.strokeStyle = c.bodyStroke;
    ctx.beginPath();
    ctx.arc(0, -10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ear tufts
    const tuftColor = c.earTufts || c.bodyStroke;
    ctx.fillStyle = tuftColor;
    ctx.beginPath();
    ctx.moveTo(-6, -16);
    ctx.lineTo(-9, -23);
    ctx.lineTo(-3, -18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, -16);
    ctx.lineTo(9, -23);
    ctx.lineTo(3, -18);
    ctx.closePath();
    ctx.fill();

    // Facial disc (owl characteristic)
    const ringColor = c.eyeRing || '#ddc088';
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-4, -10, 5, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(4, -10, 5, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Owl beak (small, triangular, pointing down)
    ctx.fillStyle = c.beak;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(2, -6);
    ctx.lineTo(-2, -6);
    ctx.closePath();
    ctx.fill();

    // Owl face (big round eyes)
    this._drawOwlFace(ctx, c);

    // Short tail
    ctx.fillStyle = c.tail;
    ctx.strokeStyle = c.tailStroke;
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 3, 12);
      ctx.lineTo(i * 4, 16);
      ctx.lineTo(i * 3.5, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // ── ROBIN ──────────────────────────────────────────────
  _drawRobin(ctx, c) {
    const wingAngle = Math.sin(this.wingFlap) * 0.45;

    // Wings (smaller, more pointed)
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-7, 0, 8, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-wingAngle);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(7, 0, 8, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Body
    ctx.fillStyle = c.body;
    ctx.strokeStyle = c.bodyStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 1, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Red breast (robin characteristic)
    const breastColor = c.breast || '#dd3322';
    ctx.fillStyle = breastColor;
    ctx.beginPath();
    ctx.ellipse(0, 3, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = c.head;
    ctx.strokeStyle = c.bodyStroke;
    ctx.beginPath();
    ctx.arc(0, -8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Small pointed beak
    ctx.fillStyle = c.beak;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, -8.5);
    ctx.lineTo(0, -9.5);
    ctx.closePath();
    ctx.fill();

    // Face
    this._drawFace(ctx, c, -8, 7);

    // Tail
    this._drawTailFeathers(ctx, c);
  }

  // ── EAGLE ──────────────────────────────────────────────
  _drawEagle(ctx, c) {
    const wingAngle = Math.sin(this.wingFlap) * 0.5;

    // Large wings
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-10, -1, 13, 6, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Wing tip feather detail
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-18, -3);
    ctx.lineTo(-22, -5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-17, -1);
    ctx.lineTo(-21, -2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-wingAngle);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(10, -1, 13, 6, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, -3);
    ctx.lineTo(22, -5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(17, -1);
    ctx.lineTo(21, -2);
    ctx.stroke();
    ctx.restore();

    // Body (sleeker)
    ctx.fillStyle = c.body;
    ctx.strokeStyle = c.bodyStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head (white for bald eagle look)
    ctx.fillStyle = c.head;
    ctx.strokeStyle = c.bodyStroke;
    ctx.beginPath();
    ctx.arc(0, -10, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hooked beak (eagle characteristic) — sharp downward hook, side profile
    ctx.fillStyle = '#ff9900';
    ctx.strokeStyle = '#cc7700';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(6, -10);
    ctx.quadraticCurveTo(9, -13, 13, -11.5);
    ctx.quadraticCurveTo(14, -10, 12, -7.5);
    ctx.lineTo(10, -7);
    ctx.quadraticCurveTo(8, -8, 6, -10);
    ctx.fill();
    ctx.stroke();
    // Lower mandible
    ctx.fillStyle = '#dd8800';
    ctx.beginPath();
    ctx.moveTo(6, -8.5);
    ctx.lineTo(10, -7);
    ctx.lineTo(7, -6.5);
    ctx.closePath();
    ctx.fill();

    // Eye patch (white, side view) — left of beak, clearly separate
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -10, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Face (single eye, side view)
    this._drawEagleFace(ctx, c);

    // Fan tail
    ctx.fillStyle = c.tail;
    ctx.strokeStyle = c.tailStroke;
    ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 2, 12);
      ctx.lineTo(i * 5, 20);
      ctx.lineTo(i * 3.5, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // ── BLUE JAY ───────────────────────────────────────────
  _drawJay(ctx, c) {
    const wingAngle = Math.sin(this.wingFlap) * 0.4;

    // Wings with white bar markings
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-8, 0, 10, 5.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // White wing bar
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, -1);
    ctx.lineTo(-14, 0);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-wingAngle);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(8, 0, 10, 5.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(5, -1);
    ctx.lineTo(14, 0);
    ctx.stroke();
    ctx.restore();

    // Body
    ctx.fillStyle = c.body;
    ctx.strokeStyle = c.bodyStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White belly
    ctx.fillStyle = '#eeeeff';
    ctx.beginPath();
    ctx.ellipse(0, 3, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = c.head;
    ctx.strokeStyle = c.bodyStroke;
    ctx.beginPath();
    ctx.arc(0, -9, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Crest (jay characteristic)
    const crestColor = c.crest || c.head;
    ctx.fillStyle = crestColor;
    ctx.beginPath();
    ctx.moveTo(-2, -14);
    ctx.lineTo(0, -22);
    ctx.lineTo(3, -14);
    ctx.closePath();
    ctx.fill();

    // Black necklace marking
    ctx.strokeStyle = '#111122';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -5, 8, 0.3, Math.PI - 0.3);
    ctx.stroke();

    // Beak — pointed bird beak, side profile
    ctx.fillStyle = '#ff9900';
    ctx.strokeStyle = '#cc7700';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(6, -8);
    ctx.quadraticCurveTo(10, -11, 13, -9);
    ctx.quadraticCurveTo(10, -7.5, 6, -8);
    ctx.fill();
    ctx.stroke();
    // Lower mandible
    ctx.fillStyle = '#dd8800';
    ctx.beginPath();
    ctx.moveTo(6, -7.5);
    ctx.lineTo(11, -8);
    ctx.lineTo(7, -6.5);
    ctx.closePath();
    ctx.fill();

    // Eye patch (white, side view) — left of beak, clearly separate
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -9, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Face (single eye, side view)
    this._drawJayFace(ctx, c);

    // Tail
    this._drawTailFeathers(ctx, c);
  }

  // ── PARROT ─────────────────────────────────────────────
  _drawParrot(ctx, c) {
    const wingAngle = Math.sin(this.wingFlap) * 0.4;

    // Colorful wings
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-8, 0, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Yellow wing edge
    ctx.strokeStyle = '#ffdd00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-12, 1, 5, -0.5, 0.8);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-wingAngle);
    ctx.fillStyle = c.wing;
    ctx.strokeStyle = c.wingStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(8, 0, 10, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffdd00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(12, 1, 5, Math.PI - 0.8, Math.PI + 0.5);
    ctx.stroke();
    ctx.restore();

    // Body
    ctx.fillStyle = c.body;
    ctx.strokeStyle = c.bodyStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.fillStyle = c.head;
    ctx.strokeStyle = c.bodyStroke;
    ctx.beginPath();
    ctx.arc(0, -9, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Crest feathers on top
    const crestColor = c.crest || '#ffdd00';
    ctx.fillStyle = crestColor;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 2, -15);
      ctx.quadraticCurveTo(i * 3, -21, i * 4 + 1, -20);
      ctx.quadraticCurveTo(i * 2.5, -18, i * 2, -15);
      ctx.fill();
    }

    // Curved parrot beak — classic hooked shape, side profile
    ctx.fillStyle = '#ff8800';
    ctx.strokeStyle = '#cc6600';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    // Upper mandible: round top curving down into a hook
    ctx.moveTo(6, -10);
    ctx.quadraticCurveTo(8, -13.5, 13, -12);
    ctx.quadraticCurveTo(14.5, -11, 13, -8.5);
    ctx.lineTo(11, -7);
    ctx.quadraticCurveTo(8, -8, 6, -10);
    ctx.fill();
    ctx.stroke();
    // Lower mandible: small wedge tucked under
    ctx.fillStyle = '#dd7700';
    ctx.beginPath();
    ctx.moveTo(6, -8.5);
    ctx.lineTo(10, -7);
    ctx.lineTo(7, -6);
    ctx.closePath();
    ctx.fill();

    // Eye patch (white circle) — left of beak, clearly separate
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -10, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Face (single large eye on visible side)
    this._drawParrotFace(ctx, c);

    // Long colorful tail
    const tailColors = [c.tail, '#ffdd00', c.wing];
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = tailColors[i + 1] || c.tail;
      ctx.strokeStyle = c.tailStroke;
      ctx.beginPath();
      ctx.moveTo(i * 2, 11);
      ctx.lineTo(i * 3, 22);
      ctx.lineTo(i * 1.5, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // ── SHARED DRAWING HELPERS ─────────────────────────────

  _drawBeak(ctx, c) {
    ctx.fillStyle = c.beak;
    ctx.beginPath();
    // Beak opens when danger is high or mood is very low
    const dp = this.dangerPulse;
    if (dp > 0.5 || this.mood < 10) {
      const openAmount = Math.max(dp, this.mood < 10 ? 0.8 : 0) * 2;
      ctx.moveTo(0, -8 + openAmount * 0.3);
      ctx.lineTo(5, -9);
      ctx.lineTo(0, -10 - openAmount * 0.3);
    } else {
      ctx.moveTo(0, -8);
      ctx.lineTo(5, -9);
      ctx.lineTo(0, -10);
    }
    ctx.closePath();
    ctx.fill();
  }

  _drawAntennas(ctx, c) {
    ctx.strokeStyle = c.antenna;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    // Left antenna
    ctx.beginPath();
    ctx.moveTo(-2, -14);
    ctx.lineTo(-5, -22);
    ctx.stroke();
    // Right antenna
    ctx.beginPath();
    ctx.moveTo(2, -14);
    ctx.lineTo(5, -22);
    ctx.stroke();
    // Glowing tips
    const pulse = Math.sin(Date.now() / 250) * 0.3 + 0.8;
    ctx.shadowBlur = 6;
    ctx.shadowColor = c.antennaGlow;
    ctx.fillStyle = c.antennaGlow;
    ctx.beginPath();
    ctx.arc(-5, -22, 2 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -22, 2 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  _drawTailFeathers(ctx, c) {
    ctx.fillStyle = c.tail;
    ctx.strokeStyle = c.tailStroke;
    ctx.lineWidth = 1;
    // Three pointy feathers
    [[-4, -0.3], [0, 0], [4, 0.3]].forEach(([dx, rot]) => {
      ctx.save();
      ctx.translate(dx, 11);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-3, 10);
      ctx.lineTo(0, 8);
      ctx.lineTo(3, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }

  _drawFace(ctx, c, headY, headR) {
    const hy = headY || -9;

    // Death: draw X eyes only, skip normal face
    if (this.isDying) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      const xSize = 2.5;
      // Left X
      ctx.beginPath();
      ctx.moveTo(-3 - xSize, hy - xSize); ctx.lineTo(-3 + xSize, hy + xSize);
      ctx.moveTo(-3 + xSize, hy - xSize); ctx.lineTo(-3 - xSize, hy + xSize);
      ctx.stroke();
      // Right X
      ctx.beginPath();
      ctx.moveTo(3 - xSize, hy - xSize); ctx.lineTo(3 + xSize, hy + xSize);
      ctx.moveTo(3 + xSize, hy - xSize); ctx.lineTo(3 - xSize, hy + xSize);
      ctx.stroke();
      return;
    }

    const m = this.mood;
    const dp = this.dangerPulse;
    const tier = this.getMoodTier();

    // Danger shake when dangerPulse is high
    const shake = dp > 0.5 ? Math.sin(Date.now() / 40) * dp * 0.4 : 0;

    if (tier === 'onfire') {
      // ON FIRE — blazing determined squint eyes, confident grin
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      // Intense squint
      ctx.beginPath();
      ctx.arc(-3 + shake, hy - 0.5, 2.8, Math.PI + 0.15, -0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(3 + shake, hy - 0.5, 2.8, Math.PI + 0.15, -0.15);
      ctx.stroke();
      // Determined brows (angled outward)
      ctx.strokeStyle = c.bodyStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-1.5, hy - 5.5);
      ctx.lineTo(-5.5, hy - 4.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1.5, hy - 5.5);
      ctx.lineTo(5.5, hy - 4.5);
      ctx.stroke();
      // Fiery grin
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, hy + 2, 3, 0.1, Math.PI - 0.1);
      ctx.stroke();
      // Fire glow around head
      ctx.save();
      const fireAlpha = 0.15 + Math.sin(Date.now() / 100) * 0.08;
      ctx.globalAlpha = fireAlpha;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff6600';
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, hy, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // Rosy fire cheeks
      ctx.fillStyle = 'rgba(255, 120, 50, 0.3)';
      ctx.beginPath();
      ctx.ellipse(-5, hy + 1.5, 2.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(5, hy + 1.5, 2.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (tier === 'firedup') {
      // FIRED UP — happy squint eyes with rosy cheeks
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-3, hy - 0.5, 2.5, Math.PI + 0.3, -0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(3, hy - 0.5, 2.5, Math.PI + 0.3, -0.3);
      ctx.stroke();
      // Warm cheeks
      const cheekAlpha = (m - 50) / 50 * 0.35;
      ctx.fillStyle = `rgba(255, 150, 100, ${cheekAlpha})`;
      ctx.beginPath();
      ctx.ellipse(-5, hy + 2, 2.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(5, hy + 2, 2.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Smile
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, hy + 2, 2.5, 0.2, Math.PI - 0.2);
      ctx.stroke();

    } else if (tier === 'chill') {
      // CHILL — wide worried eyes, small pupils
      const chillFactor = 1 - m / 20; // 0 at mood=20, 1 at mood=0
      const eyeScale = 1 + chillFactor * 0.25;
      const pupilShrink = 1 - chillFactor * 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(-3 + shake, hy - 1, 3.2 * eyeScale, 3.5 * eyeScale, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(3 + shake, hy - 1, 3.2 * eyeScale, 3.5 * eyeScale, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-3 + shake, hy - 0.8, 1.5 * pupilShrink, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3 + shake, hy - 0.8, 1.5 * pupilShrink, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3.5, hy - 2, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2.5, hy - 2, 0.9, 0, Math.PI * 2);
      ctx.fill();
      // Worried brows when very low
      if (chillFactor > 0.5) {
        ctx.strokeStyle = c.bodyStroke;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-5.5, hy - 4);
        ctx.lineTo(-1.5, hy - 5 - chillFactor);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5.5, hy - 4);
        ctx.lineTo(1.5, hy - 5 - chillFactor);
        ctx.stroke();
      }
      // Sweat drop when dangerPulse is active
      if (dp > 0.3) {
        ctx.fillStyle = `rgba(100, 200, 255, ${dp * 0.6})`;
        const sweatY = hy - 5 + Math.sin(Date.now() / 200) * 1;
        ctx.beginPath();
        ctx.moveTo(6, sweatY);
        ctx.quadraticCurveTo(7.5, sweatY + 2, 6, sweatY + 3.5);
        ctx.quadraticCurveTo(4.5, sweatY + 2, 6, sweatY);
        ctx.fill();
      }

    } else {
      // NEUTRAL — standard eyes with danger-reactive pupils
      const dangerScale = 1 + dp * 0.15;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(-3 + shake, hy - 1, 3.2 * dangerScale, 3.5 * dangerScale, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(3 + shake, hy - 1, 3.2 * dangerScale, 3.5 * dangerScale, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Pupils shrink when danger is high
      const ps = 1 - dp * 0.3;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-3 + shake, hy - 0.8, 1.5 * ps, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3 + shake, hy - 0.8, 1.5 * ps, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3.5, hy - 2, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2.5, hy - 2, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawOwlFace(ctx, c) {
    const hy = -10;

    // Death: draw X eyes only, skip normal face
    if (this.isDying) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      const xSize = 3;
      ctx.beginPath();
      ctx.moveTo(-4 - xSize, hy - xSize); ctx.lineTo(-4 + xSize, hy + xSize);
      ctx.moveTo(-4 + xSize, hy - xSize); ctx.lineTo(-4 - xSize, hy + xSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4 - xSize, hy - xSize); ctx.lineTo(4 + xSize, hy + xSize);
      ctx.moveTo(4 + xSize, hy - xSize); ctx.lineTo(4 - xSize, hy + xSize);
      ctx.stroke();
      return;
    }

    const tier = this.getMoodTier();
    const dp = this.dangerPulse;
    const baseSize = 4;
    const shake = dp > 0.5 ? Math.sin(Date.now() / 40) * dp * 0.3 : 0;

    if (tier === 'onfire' || tier === 'firedup') {
      // Happy squint
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-4, hy, 3, Math.PI + 0.3, -0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(4, hy, 3, Math.PI + 0.3, -0.3);
      ctx.stroke();
      if (tier === 'onfire') {
        // Fire glow
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff6600';
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, hy, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    } else if (tier === 'chill') {
      const scale = 1 + (1 - this.mood / 20) * 0.25;
      ctx.fillStyle = c.eyeRing || '#ffd700';
      ctx.beginPath();
      ctx.arc(-4 + shake, hy, baseSize * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4 + shake, hy, baseSize * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-4 + shake, hy, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4 + shake, hy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = c.eyeRing || '#ffd700';
      ctx.beginPath();
      ctx.arc(-4 + shake, hy, baseSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4 + shake, hy, baseSize, 0, Math.PI * 2);
      ctx.fill();
      const ps = 1 - dp * 0.3;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-4 + shake, hy, 2 * ps, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4 + shake, hy, 2 * ps, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.eyeRing || '#ffd700';
      ctx.beginPath();
      ctx.arc(-4.5, hy - 1.2, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3.5, hy - 1.2, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawParrotFace(ctx, c) {
    const ex = 0, hy = -10;

    if (this.isDying) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      const xSize = 2.5;
      ctx.beginPath();
      ctx.moveTo(ex - xSize, hy - xSize); ctx.lineTo(ex + xSize, hy + xSize);
      ctx.moveTo(ex + xSize, hy - xSize); ctx.lineTo(ex - xSize, hy + xSize);
      ctx.stroke();
      return;
    }

    const tier = this.getMoodTier();
    const isHappy = tier === 'firedup' || tier === 'onfire';

    if (isHappy) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ex, hy, 2.5, Math.PI + 0.3, -0.3);
      ctx.stroke();
    } else {
      const ps = tier === 'chill' ? 1.8 : 2.2;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ex, hy, ps, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 0.7, hy - 0.8, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

  }

  _drawEagleFace(ctx, c) {
    const ex = 0, hy = -10;

    if (this.isDying) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      const xSize = 2.5;
      ctx.beginPath();
      ctx.moveTo(ex - xSize, hy - xSize); ctx.lineTo(ex + xSize, hy + xSize);
      ctx.moveTo(ex + xSize, hy - xSize); ctx.lineTo(ex - xSize, hy + xSize);
      ctx.stroke();
      return;
    }

    const tier = this.getMoodTier();
    const isHappy = tier === 'firedup' || tier === 'onfire';

    if (isHappy) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ex, hy, 2.5, Math.PI + 0.2, -0.2);
      ctx.stroke();
      // Angry brow
      ctx.strokeStyle = c.bodyStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ex - 2.5, hy - 4);
      ctx.lineTo(ex + 2.5, hy - 3);
      ctx.stroke();
    } else {
      const ps = tier === 'chill' ? 1.8 : 2.2;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ex, hy, ps, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 0.7, hy - 0.8, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawJayFace(ctx, c) {
    const ex = 0, hy = -9;

    // Death: single X eye
    if (this.isDying) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      const xSize = 2.5;
      ctx.beginPath();
      ctx.moveTo(ex - xSize, hy - xSize); ctx.lineTo(ex + xSize, hy + xSize);
      ctx.moveTo(ex + xSize, hy - xSize); ctx.lineTo(ex - xSize, hy + xSize);
      ctx.stroke();
      return;
    }

    const tier = this.getMoodTier();
    const isHappy = tier === 'firedup' || tier === 'onfire';

    if (isHappy) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ex, hy, 2.5, Math.PI + 0.3, -0.3);
      ctx.stroke();
    } else {
      const ps = tier === 'chill' ? 1.8 : 2.2;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ex, hy, ps, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 0.7, hy - 0.8, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── ANIMATION PARTICLES ────────────────────────────────
  _drawAnimParticles(ctx, screenY, layer) {
    const s = this.skin;
    if (!s || !s.animated) return;

    const anim = s.animated;

    this.animParticles.forEach(p => {
      const alpha = p.life / p.maxLife;

      if (p.type === 'fire' && layer === 'behind') {
        ctx.save();
        ctx.translate(this.x, screenY);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha * 0.8;
        const fireH = anim === 'cosmic' ? ((Date.now() / 10 + p.ox * 10) % 360) : 20 + (1 - alpha) * 30;
        ctx.fillStyle = `hsl(${fireH}, 100%, ${50 + alpha * 30}%)`;
        ctx.beginPath();
        ctx.arc(p.ox, p.oy, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (p.type === 'electric' && layer === 'front') {
        ctx.save();
        ctx.translate(this.x, screenY);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `rgba(100, 180, 255, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#44aaff';
        // Draw lightning bolt segment
        const sx = Math.cos(p.angle) * p.orbitDist;
        const sy = Math.sin(p.angle) * p.orbitDist;
        const ex = Math.cos(p.endAngle) * p.endDist;
        const ey = Math.sin(p.endAngle) * p.endDist;
        const mx = (sx + ex) / 2 + (Math.random() - 0.5) * 6;
        const my = (sy + ey) / 2 + (Math.random() - 0.5) * 6;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(mx, my);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      if (p.type === 'star' && layer === 'front') {
        ctx.save();
        ctx.translate(this.x, screenY);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha * 0.9;
        const sx = Math.cos(p.orbitAngle) * p.orbitDist;
        const sy = Math.sin(p.orbitAngle) * p.orbitDist;
        ctx.fillStyle = `hsl(${p.hue}, 80%, 75%)`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = `hsl(${p.hue}, 80%, 75%)`;
        // Tiny star shape
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          const a = (j * Math.PI * 2) / 5 - Math.PI / 2;
          const r = j % 2 === 0 ? p.size : p.size * 0.4;
          ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      if (p.type === 'shimmer' && layer === 'front') {
        ctx.save();
        ctx.translate(this.x, screenY);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = `hsl(${p.hue}, 90%, 80%)`;
        ctx.shadowBlur = 3;
        ctx.shadowColor = `hsl(${p.hue}, 90%, 80%)`;
        // Diamond sparkle shape
        const s = p.size * alpha;
        ctx.beginPath();
        ctx.moveTo(p.ox, p.oy - s);
        ctx.lineTo(p.ox + s * 0.5, p.oy);
        ctx.lineTo(p.ox, p.oy + s);
        ctx.lineTo(p.ox - s * 0.5, p.oy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    });
  }

  // ── STATIC PREVIEW for shop cards ──────────────────────

  static drawPreview(ctx, x, y, skin, time, skinKey, spriteManager, displayScale) {
    // 2x offscreen canvas for sharp skin previews
    const pScale = 2;
    const pLogSize = 48;
    const pOffW = pLogSize * pScale;
    if (!Player._previewCanvas) Player._previewCanvas = document.createElement('canvas');
    const pc = Player._previewCanvas;
    if (pc.width !== pOffW || pc.height !== pOffW) { pc.width = pOffW; pc.height = pOffW; }
    const p = pc.getContext('2d');
    p.clearRect(0, 0, pOffW, pOffW);
    p.save();
    p.translate(pOffW / 2, pOffW / 2);
    p.scale(pScale, pScale);

    const birdType = skin.birdType || 'default';
    let bodyColor = skin.body;
    let headColor = skin.head;
    let wingColor = skin.wing;

    // Handle rainbow
    if (skin.isRainbow) {
      const h = ((time || Date.now()) / 500 * 60) % 360;
      bodyColor = `hsl(${h}, 80%, 55%)`;
      headColor = `hsl(${(h + 30) % 360}, 85%, 65%)`;
      wingColor = `hsl(${(h + 60) % 360}, 80%, 50%)`;
    }

    const scale = 0.85;
    p.scale(scale, scale);

    // Mini wing
    p.fillStyle = wingColor;
    p.beginPath();
    p.ellipse(-6, 0, 6, 4, -0.3, 0, Math.PI * 2);
    p.fill();

    // Body
    p.fillStyle = bodyColor;
    p.beginPath();
    if (birdType === 'owl') {
      p.ellipse(0, 0, 8, 9, 0, 0, Math.PI * 2);
    } else {
      p.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2);
    }
    p.fill();

    // Robin breast
    if (birdType === 'robin') {
      p.fillStyle = skin.breast || '#dd3322';
      p.beginPath();
      p.ellipse(0, 2, 4, 5, 0, 0, Math.PI * 2);
      p.fill();
    }

    // Head
    p.fillStyle = headColor;
    p.beginPath();
    if (birdType === 'owl') {
      p.arc(0, -8, 7, 0, Math.PI * 2);
    } else {
      p.arc(0, -7, 5.5, 0, Math.PI * 2);
    }
    p.fill();

    // Type-specific features
    if (birdType === 'owl') {
      p.fillStyle = skin.earTufts || skin.bodyStroke;
      p.beginPath();
      p.moveTo(-4, -13); p.lineTo(-7, -18); p.lineTo(-2, -14);
      p.closePath();
      p.fill();
      p.beginPath();
      p.moveTo(4, -13); p.lineTo(7, -18); p.lineTo(2, -14);
      p.closePath();
      p.fill();
      p.fillStyle = skin.eyeRing || '#ffd700';
      p.beginPath();
      p.arc(-3, -8, 3, 0, Math.PI * 2);
      p.arc(3, -8, 3, 0, Math.PI * 2);
      p.fill();
      p.fillStyle = '#000000';
      p.beginPath();
      p.arc(-3, -8, 1.5, 0, Math.PI * 2);
      p.arc(3, -8, 1.5, 0, Math.PI * 2);
      p.fill();
    } else if (birdType === 'eagle') {
      // White eye patch (side view)
      p.fillStyle = '#ffffff';
      p.beginPath();
      p.arc(0, -7.5, 3, 0, Math.PI * 2);
      p.fill();
      // Hooked eagle beak protruding right
      p.fillStyle = '#ff9900';
      p.strokeStyle = '#cc7700';
      p.lineWidth = 0.8;
      p.beginPath();
      p.moveTo(4, -8);
      p.quadraticCurveTo(7, -10.5, 10, -9);
      p.quadraticCurveTo(10.5, -7.5, 8, -6);
      p.quadraticCurveTo(6, -6.5, 4, -8);
      p.fill();
      p.stroke();
      p.fillStyle = '#dd8800';
      p.beginPath();
      p.moveTo(4, -6.5);
      p.lineTo(8, -6);
      p.lineTo(5, -5.5);
      p.closePath();
      p.fill();
      // Single pupil
      p.fillStyle = '#000000';
      p.beginPath();
      p.arc(0, -7.5, 1.4, 0, Math.PI * 2);
      p.fill();
      p.fillStyle = '#ffffff';
      p.beginPath();
      p.arc(-0.5, -8, 0.5, 0, Math.PI * 2);
      p.fill();
    } else if (birdType === 'jay') {
      p.fillStyle = skin.crest || skin.head;
      p.beginPath();
      p.moveTo(-1, -11); p.lineTo(0, -17); p.lineTo(2, -11);
      p.closePath();
      p.fill();
      // White eye patch (side view)
      p.fillStyle = '#ffffff';
      p.beginPath();
      p.arc(0, -7, 3, 0, Math.PI * 2);
      p.fill();
      // Pointed bird beak protruding right
      p.fillStyle = '#ff9900';
      p.strokeStyle = '#cc7700';
      p.lineWidth = 0.8;
      p.beginPath();
      p.moveTo(4, -6.5);
      p.quadraticCurveTo(7, -9, 10, -7);
      p.quadraticCurveTo(7, -5.5, 4, -6.5);
      p.fill();
      p.stroke();
      p.fillStyle = '#dd8800';
      p.beginPath();
      p.moveTo(4, -6);
      p.lineTo(8, -6.5);
      p.lineTo(5, -5);
      p.closePath();
      p.fill();
      // Single pupil
      p.fillStyle = '#000000';
      p.beginPath();
      p.arc(0, -7, 1.2, 0, Math.PI * 2);
      p.fill();
      p.fillStyle = '#ffffff';
      p.beginPath();
      p.arc(-0.5, -7.5, 0.4, 0, Math.PI * 2);
      p.fill();
    } else if (birdType === 'parrot') {
      p.fillStyle = skin.crest || '#ffdd00';
      p.beginPath();
      p.moveTo(-1, -11); p.quadraticCurveTo(0, -17, 2, -15);
      p.quadraticCurveTo(1, -12, -1, -11);
      p.fill();
      // Curved parrot beak — orange, hooked
      p.fillStyle = '#ff8800';
      p.strokeStyle = '#cc6600';
      p.lineWidth = 0.8;
      p.beginPath();
      p.moveTo(4, -8);
      p.quadraticCurveTo(6, -11, 10, -9.5);
      p.quadraticCurveTo(11, -8, 9.5, -6.5);
      p.lineTo(8, -5.5);
      p.quadraticCurveTo(6, -6.5, 4, -8);
      p.fill();
      p.stroke();
      p.fillStyle = '#dd7700';
      p.beginPath();
      p.moveTo(4, -6.5);
      p.lineTo(8, -5.5);
      p.lineTo(5, -5);
      p.closePath();
      p.fill();
      // White eye patch
      p.fillStyle = '#ffffff';
      p.beginPath();
      p.arc(0, -7.5, 2.5, 0, Math.PI * 2);
      p.fill();
      p.fillStyle = '#000000';
      p.beginPath();
      p.arc(0, -7.5, 1.4, 0, Math.PI * 2);
      p.fill();
    } else {
      p.fillStyle = '#ffffff';
      p.beginPath();
      p.arc(-2, -7.5, 2.3, 0, Math.PI * 2);
      p.fill();
      p.beginPath();
      p.arc(2, -7.5, 2.3, 0, Math.PI * 2);
      p.fill();
      p.fillStyle = '#000000';
      p.beginPath();
      p.arc(-2, -7.3, 1.1, 0, Math.PI * 2);
      p.fill();
      p.beginPath();
      p.arc(2, -7.3, 1.1, 0, Math.PI * 2);
      p.fill();
      if (skin.antenna) {
        p.strokeStyle = skin.antenna;
        p.lineWidth = 1.5;
        p.beginPath();
        p.moveTo(-2, -12); p.lineTo(-3, -15);
        p.stroke();
        p.beginPath();
        p.moveTo(2, -12); p.lineTo(3, -15);
        p.stroke();
        if (skin.antennaGlow) {
          p.fillStyle = skin.antennaGlow;
          p.beginPath();
          p.arc(-3, -15, 1.5, 0, Math.PI * 2);
          p.fill();
          p.beginPath();
          p.arc(3, -15, 1.5, 0, Math.PI * 2);
          p.fill();
        }
      }
    }

    p.restore();

    // Animated premium glow on main canvas (needs shadowBlur which doesn't work well offscreen)
    ctx.save();
    ctx.translate(x, y);
    if (skin.animated) {
      const pulse = Math.sin((time || Date.now()) / 200) * 0.3 + 0.7;
      let glowColor = '#ffffff';
      if (skin.animated === 'fire' || skin.animated === 'cosmic') glowColor = '#ff6600';
      if (skin.animated === 'electric') glowColor = '#44aaff';
      if (skin.animated === 'galaxy') glowColor = '#aa66ff';
      if (skin.animated === 'shimmer') glowColor = '#ffdd44';
      if (skin.animated === 'rainbow') glowColor = `hsl(${((time || Date.now()) / 8) % 360}, 90%, 70%)`;
      ctx.shadowBlur = 8 * pulse;
      ctx.shadowColor = glowColor;
    }
    const ds = displayScale || 1;
    const drawSize = pLogSize * ds;
    const dHalf = drawSize / 2;
    ctx.drawImage(pc, -dHalf, -dHalf, drawSize, drawSize);
    ctx.restore();
  }
}

export default Player;
