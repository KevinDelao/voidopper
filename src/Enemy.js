class Enemy {
  constructor(x, y, screenWidth = 390) {
    const ss = Math.max(1, screenWidth / 390);
    this.ss = ss;
    this.x = x;
    this.y = y;

    // Varied asteroid sizes - small, medium, large (scaled for screen)
    const sizeType = Math.random();
    if (sizeType < 0.4) {
      // Small asteroids (40% chance)
      this.radius = (Math.random() * 8 + 12) * ss; // 12-20 base
      this.sizeCategory = 'small';
    } else if (sizeType < 0.75) {
      // Medium asteroids (35% chance)
      this.radius = (Math.random() * 12 + 22) * ss; // 22-34 base
      this.sizeCategory = 'medium';
    } else {
      // Large asteroids (25% chance)
      this.radius = (Math.random() * 15 + 35) * ss; // 35-50 base
      this.sizeCategory = 'large';
    }

    this.rotation = 0;
    // Rotation speed varies inversely with size
    this.rotationSpeed = (Math.random() - 0.5) * (0.03 / (this.radius / 20));
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.05;
    this.active = true;

    // Falling speed - smaller asteroids fall faster (more realistic)
    // Small: 150-250, Medium: 100-180, Large: 60-120
    if (this.sizeCategory === 'small') {
      this.vy = Math.random() * 100 + 150;
    } else if (this.sizeCategory === 'medium') {
      this.vy = Math.random() * 80 + 100;
    } else {
      this.vy = Math.random() * 60 + 60;
    }

    // Generate realistic irregular asteroid shape
    this.points = [];
    const numPoints = Math.floor(Math.random() * 4) + 8; // 8-11 points for realistic irregular shape
    const baseRadius = this.radius;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      // More variation for realistic rocky appearance
      const radiusVariation = (Math.random() * 2 - 1) * (baseRadius * 0.3);
      const r = baseRadius + radiusVariation;
      this.points.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }

    // Generate realistic asteroid colors (more muted, space-like)
    const colorSchemes = [
      { body: '#4a4a4a', dark: '#2a2a2a', light: '#6a6a6a', accent: '#3a3a3a' }, // Charcoal gray
      { body: '#5a4a3a', dark: '#3a2a1a', light: '#7a6a5a', accent: '#4a3a2a' }, // Brown rock
      { body: '#3a3a4a', dark: '#1a1a2a', light: '#5a5a6a', accent: '#2a2a3a' }, // Blue-gray
      { body: '#4a3a3a', dark: '#2a1a1a', light: '#6a5a5a', accent: '#3a2a2a' }, // Red-brown
      { body: '#3a4a3a', dark: '#1a2a1a', light: '#5a6a5a', accent: '#2a3a2a' }  // Green-gray
    ];
    this.colorScheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];

    // Add rocky surface features
    this.rockDetails = [];
    const numRocks = Math.floor(this.radius / 6);
    for (let i = 0; i < numRocks; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.radius * 0.6;
      this.rockDetails.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: Math.random() * (this.radius * 0.15) + 2,
        rotation: Math.random() * Math.PI * 2
      });
    }

    // Craters - more craters on larger asteroids
    this.craters = [];
    const numCraters = Math.floor((this.radius / 15) * (Math.random() * 2 + 2)); // Scale with size
    for (let i = 0; i < numCraters; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (baseRadius * 0.6);
      this.craters.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        radius: Math.random() * (baseRadius * 0.15) + (baseRadius * 0.1) // Scale crater size with asteroid
      });
    }

    // Pre-render static asteroid body to offscreen canvas for performance
    this._cachedCanvas = null;
    this._cachedSize = 0;
    this._prerenderBody();
  }

  _prerenderBody() {
    const padding = 4;
    const size = Math.ceil((this.radius + padding) * 2);
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const cx = size / 2;
    const cy = size / 2;

    ctx.translate(cx, cy);

    // Draw irregular asteroid shape
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.closePath();

    // Realistic lighting gradient
    const gradient = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.3, 0,
      0, 0, this.radius * 1.4
    );
    gradient.addColorStop(0, this.colorScheme.light);
    gradient.addColorStop(0.4, this.colorScheme.body);
    gradient.addColorStop(0.8, this.colorScheme.dark);
    gradient.addColorStop(1, this.colorScheme.dark);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Outline
    ctx.strokeStyle = this.colorScheme.accent;
    ctx.lineWidth = Math.max(1, this.radius / 15);
    ctx.stroke();

    // Rock details
    this.rockDetails.forEach(rock => {
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.rotate(rock.rotation);
      ctx.fillStyle = this.colorScheme.dark;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(rock.size * 0.8, rock.size * 0.3);
      ctx.lineTo(rock.size * 0.5, rock.size * 0.8);
      ctx.lineTo(-rock.size * 0.3, rock.size * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = this.colorScheme.accent;
      ctx.beginPath();
      ctx.moveTo(-rock.size * 0.2, -rock.size * 0.2);
      ctx.lineTo(rock.size * 0.6, 0);
      ctx.lineTo(rock.size * 0.3, rock.size * 0.6);
      ctx.lineTo(0, rock.size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Craters
    this.craters.forEach(crater => {
      ctx.fillStyle = this.colorScheme.light;
      ctx.beginPath();
      ctx.arc(crater.x - crater.radius * 0.2, crater.y - crater.radius * 0.2, crater.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      const craterGradient = ctx.createRadialGradient(
        crater.x - crater.radius * 0.2, crater.y - crater.radius * 0.2, 0,
        crater.x, crater.y, crater.radius
      );
      craterGradient.addColorStop(0, this.colorScheme.body);
      craterGradient.addColorStop(0.6, this.colorScheme.dark);
      craterGradient.addColorStop(1, this.colorScheme.dark);
      ctx.fillStyle = craterGradient;
      ctx.beginPath();
      ctx.arc(crater.x, crater.y, crater.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(crater.x + crater.radius * 0.3, crater.y + crater.radius * 0.3, crater.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    this._cachedCanvas = canvas;
    this._cachedSize = size;
  }

  update(deltaTime) {
    this.rotation += this.rotationSpeed;
    this.pulsePhase += this.pulseSpeed;

    // Move downward (positive Y direction)
    this.y += this.vy * deltaTime;
  }

  draw(ctx, cameraY) {
    const screenY = this.y - cameraY;

    ctx.save();
    ctx.translate(this.x, screenY);
    ctx.rotate(this.rotation);

    // Draw pre-rendered asteroid body from cached canvas (DPR-scaled)
    if (this._cachedCanvas) {
      const half = this._cachedSize / 2;
      ctx.drawImage(this._cachedCanvas, -half, -half, this._cachedSize, this._cachedSize);
    }

    // Subtle danger indicator - glowing center with pulse (lightweight)
    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.2;
    const coreSize = Math.max(4, this.radius * 0.15);

    ctx.fillStyle = '#ff8855';
    ctx.globalAlpha = 0.6 + Math.sin(this.pulsePhase) * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, coreSize * pulseScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  lightenColor(color, percent) {
    // Convert hex to RGB
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + percent);
    const g = Math.min(255, ((num >> 8) & 0xff) + percent);
    const b = Math.min(255, (num & 0xff) + percent);
    return `rgb(${r}, ${g}, ${b})`;
  }

  checkCollision(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Tighter collision - reduce effective radius by 30% for more forgiving gameplay
    const effectiveEnemyRadius = this.radius * 0.7;
    const effectivePlayerRadius = player.radius * 0.7;

    return distance < (effectiveEnemyRadius + effectivePlayerRadius);
  }

  explode(ctx, cameraY) {
    const screenY = this.y - cameraY;

    // Create explosion particles
    const particles = [];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particles.push({
        x: this.x,
        y: screenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 2,
        life: 1.0
      });
    }

    return particles;
  }
}

export default Enemy;
