class WallTrap {
  constructor(x, y, side, trapType = null, screenWidth = 390) {
    const ss = Math.max(1, screenWidth / 390);
    this.ss = ss;
    this.x = x;
    this.y = y;
    this.side = side;

    // Pick a random trap type if not specified
    const types = ['sawblade', 'lasergrid', 'voidmouth'];
    this.trapType = trapType || types[Math.floor(Math.random() * types.length)];

    this.phase = Math.random() * Math.PI * 2;
    this.active = true;

    // Type-specific setup (scaled for screen)
    if (this.trapType === 'sawblade') {
      this.radius = (18 + Math.random() * 8) * ss;
      this.rotationAngle = 0;
      this.rotationSpeed = 3 + Math.random() * 3;
      this.teeth = 8 + Math.floor(Math.random() * 4);
      this.armLength = (20 + Math.random() * 10) * ss;
      // Extends from wall
      this.width = this.radius + this.armLength;
      this.height = this.radius * 2;
    } else if (this.trapType === 'lasergrid') {
      this.width = (50 + Math.random() * 20) * ss;
      this.height = Math.round(8 * ss);
      this.beamCount = 2 + Math.floor(Math.random() * 2);
      this.beamSpacing = Math.round(14 * ss);
      this.flickerPhase = Math.random() * Math.PI * 2;
      // Lasers pulse on and off
      this.onDuration = 2.0 + Math.random();
      this.offDuration = 1.0 + Math.random() * 0.5;
      this.timer = 0;
      this.isOn = true;
    } else if (this.trapType === 'voidmouth') {
      this.radius = (16 + Math.random() * 6) * ss;
      this.width = this.radius * 2;
      this.height = this.radius * 2;
      this.jawAngle = 0;
      this.jawSpeed = 2 + Math.random();
      this.tonguePhase = Math.random() * Math.PI * 2;
      // Particles being sucked in
      this.suckParticles = [];
      for (let i = 0; i < 6; i++) {
        this.suckParticles.push({
          angle: Math.random() * Math.PI * 2,
          dist: 20 + Math.random() * 30,
          speed: 1 + Math.random() * 2,
          size: 1 + Math.random() * 2,
          alpha: 0.3 + Math.random() * 0.4,
        });
      }
    }
  }

  update(deltaTime) {
    this.phase += 0.05;

    if (this.trapType === 'sawblade') {
      this.rotationAngle += this.rotationSpeed * deltaTime;
    } else if (this.trapType === 'lasergrid') {
      this.timer += deltaTime;
      if (this.isOn && this.timer > this.onDuration) {
        this.isOn = false;
        this.timer = 0;
      } else if (!this.isOn && this.timer > this.offDuration) {
        this.isOn = true;
        this.timer = 0;
      }
      this.flickerPhase += 12 * deltaTime;
    } else if (this.trapType === 'voidmouth') {
      this.jawAngle = (Math.sin(this.phase * this.jawSpeed) * 0.5 + 0.5) * 0.6;
      this.tonguePhase += 3 * deltaTime;
      this.suckParticles.forEach(p => {
        p.dist -= p.speed * deltaTime * 20;
        p.angle += p.speed * deltaTime;
        if (p.dist < 5) {
          p.dist = 25 + Math.random() * 25;
          p.angle = Math.random() * Math.PI * 2;
          p.alpha = 0.3 + Math.random() * 0.4;
        }
      });
    }
  }

  draw(ctx, cameraY) {
    const screenY = this.y - cameraY;

    ctx.save();
    ctx.translate(this.x, screenY);
    if (this.side === 'right') {
      ctx.scale(-1, 1);
    }

    if (this.trapType === 'sawblade') {
      this._drawSawblade(ctx);
    } else if (this.trapType === 'lasergrid') {
      this._drawLasergrid(ctx);
    } else if (this.trapType === 'voidmouth') {
      this._drawVoidmouth(ctx);
    }

    ctx.restore();
  }

  _drawSawblade(ctx) {
    // Arm extending from wall
    ctx.fillStyle = '#3a3a4a';
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-5, -5, this.armLength + 5, 10);
    ctx.fill();
    ctx.stroke();

    // Pivot joint
    ctx.fillStyle = '#555566';
    ctx.beginPath();
    ctx.arc(this.armLength, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333344';
    ctx.stroke();

    // Sawblade
    ctx.save();
    ctx.translate(this.armLength, 0);
    ctx.rotate(this.rotationAngle);

    // Blade body (cached)
    if (!this._bladeGrad) {
      this._bladeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
      this._bladeGrad.addColorStop(0, '#888899');
      this._bladeGrad.addColorStop(0.6, '#666677');
      this._bladeGrad.addColorStop(1, '#444455');
    }
    ctx.fillStyle = this._bladeGrad;

    // Draw toothed circle
    ctx.beginPath();
    for (let i = 0; i < this.teeth; i++) {
      const angle = (i / this.teeth) * Math.PI * 2;
      const nextAngle = ((i + 0.5) / this.teeth) * Math.PI * 2;
      const outerR = this.radius;
      const innerR = this.radius * 0.75;

      if (i === 0) {
        ctx.moveTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      } else {
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      }
      ctx.lineTo(Math.cos(nextAngle) * innerR, Math.sin(nextAngle) * innerR);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#333344';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center hub
    ctx.fillStyle = '#222233';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff4444';
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#ff0000';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  _drawLasergrid(ctx) {
    // Emitter nodes on wall
    for (let i = 0; i < this.beamCount; i++) {
      const by = (i - (this.beamCount - 1) / 2) * this.beamSpacing;

      // Emitter housing
      ctx.fillStyle = '#333355';
      ctx.strokeStyle = '#222244';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-2, by, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Emitter lens
      const lensColor = this.isOn ? '#ff2244' : '#441122';
      ctx.fillStyle = lensColor;
      if (this.isOn) {
        ctx.shadowBlur = 0;
        ctx.shadowColor = '#ff2244';
      }
      ctx.beginPath();
      ctx.arc(2, by, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (this.isOn) {
        // Laser beam with flicker
        const flicker = 0.7 + Math.sin(this.flickerPhase + i * 2) * 0.3;

        // Outer glow
        ctx.strokeStyle = `rgba(255, 30, 60, ${0.2 * flicker})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(5, by);
        ctx.lineTo(this.width, by);
        ctx.stroke();

        // Core beam
        ctx.strokeStyle = `rgba(255, 80, 100, ${0.8 * flicker})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(5, by);
        ctx.lineTo(this.width, by);
        ctx.stroke();

        // Bright center
        ctx.strokeStyle = `rgba(255, 200, 200, ${0.9 * flicker})`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.shadowColor = '#ff3355';
        ctx.beginPath();
        ctx.moveTo(5, by);
        ctx.lineTo(this.width, by);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // End point sparkle
        ctx.fillStyle = `rgba(255, 150, 150, ${flicker})`;
        ctx.beginPath();
        ctx.arc(this.width, by, 2 * flicker, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawVoidmouth(ctx) {
    const r = this.radius;

    // Dark maw opening
    ctx.save();

    // Upper jaw
    ctx.fillStyle = '#2a0a2a';
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(r * 1.2, -r * 0.3 - this.jawAngle * r);
    ctx.quadraticCurveTo(r * 1.5, 0, r * 1.2, 0);
    ctx.closePath();
    ctx.fill();

    // Lower jaw
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(r * 1.2, r * 0.3 + this.jawAngle * r);
    ctx.quadraticCurveTo(r * 1.5, 0, r * 1.2, 0);
    ctx.closePath();
    ctx.fill();

    // Teeth on upper jaw
    ctx.fillStyle = '#cc88ff';
    const numTeeth = 5;
    for (let i = 0; i < numTeeth; i++) {
      const t = (i + 0.5) / numTeeth;
      const tx = 5 + t * r;
      const toothLen = 4 + Math.sin(i * 1.5) * 2;
      const jawOffset = this.jawAngle * r * t;

      // Upper teeth
      ctx.beginPath();
      ctx.moveTo(tx - 2, -3 - jawOffset * 0.3);
      ctx.lineTo(tx, -3 + toothLen - jawOffset * 0.3);
      ctx.lineTo(tx + 2, -3 - jawOffset * 0.3);
      ctx.closePath();
      ctx.fill();

      // Lower teeth
      ctx.beginPath();
      ctx.moveTo(tx - 2, 3 + jawOffset * 0.3);
      ctx.lineTo(tx, 3 - toothLen + jawOffset * 0.3);
      ctx.lineTo(tx + 2, 3 + jawOffset * 0.3);
      ctx.closePath();
      ctx.fill();
    }

    // Inner void darkness (cached)
    if (!this._voidGrad) {
      this._voidGrad = ctx.createRadialGradient(r * 0.5, 0, 0, r * 0.5, 0, r * 0.8);
      this._voidGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      this._voidGrad.addColorStop(0.5, 'rgba(40, 0, 60, 0.6)');
      this._voidGrad.addColorStop(1, 'rgba(40, 0, 60, 0)');
    }
    ctx.fillStyle = this._voidGrad;
    ctx.beginPath();
    ctx.ellipse(r * 0.5, 0, r * 0.6, r * 0.4 * (0.3 + this.jawAngle), 0, 0, Math.PI * 2);
    ctx.fill();

    // Tongue / tendril
    const tongueWave = Math.sin(this.tonguePhase) * 5;
    ctx.strokeStyle = '#9944cc';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.3, 0);
    ctx.quadraticCurveTo(r * 0.8, tongueWave, r * 1.2 + Math.abs(tongueWave), tongueWave * 0.5);
    ctx.stroke();

    // Glowing tip
    ctx.fillStyle = '#cc66ff';
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#cc66ff';
    ctx.beginPath();
    ctx.arc(r * 1.2 + Math.abs(tongueWave), tongueWave * 0.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Suction particles
    this.suckParticles.forEach(p => {
      const px = r * 0.5 + Math.cos(p.angle) * p.dist;
      const py = Math.sin(p.angle) * p.dist * 0.5;
      ctx.fillStyle = `rgba(180, 100, 255, ${p.alpha * (1 - p.dist / 50)})`;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Eye on the side of mouth
    const eyePulse = 0.7 + Math.sin(this.phase * 3) * 0.3;
    ctx.fillStyle = '#110022';
    ctx.beginPath();
    ctx.ellipse(3, -r * 0.4, 5, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff44cc';
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#ff44cc';
    ctx.beginPath();
    ctx.ellipse(3, -r * 0.4, 2 * eyePulse, 2.5 * eyePulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3, -r * 0.4, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  checkCollision(player) {
    if (this.trapType === 'lasergrid' && !this.isOn) {
      return false; // Lasers are off — safe to pass
    }

    const dy = Math.abs(player.y - this.y);

    // Vertical check
    let effectiveHeight;
    if (this.trapType === 'lasergrid') {
      effectiveHeight = (this.beamCount - 1) * this.beamSpacing + 10;
    } else {
      effectiveHeight = this.height;
    }

    if (dy > effectiveHeight / 2 + player.radius) {
      return false;
    }

    // Horizontal check
    let dx;
    const effectiveWidth = this.width * 0.85;
    if (this.side === 'left') {
      dx = player.x - this.x;
      if (dx < -player.radius || dx > effectiveWidth + player.radius) return false;
    } else {
      dx = this.x - player.x;
      if (dx < -player.radius || dx > effectiveWidth + player.radius) return false;
    }

    return true;
  }
}

export default WallTrap;
