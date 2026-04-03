class PowerUp {
  constructor(x, y, type, screenWidth = 390) {
    const ss = Math.max(1, screenWidth / 390);
    this.ss = ss;
    this.x = x;
    this.y = y;
    this.type = type; // 'shield', 'magnet', 'slowmo', 'speedboost'
    this.radius = Math.round(16 * ss);
    this.collected = false;
    this.phase = Math.random() * Math.PI * 2;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.vy = 30; // Slow fall

    // Duration in seconds when active
    this.durations = {
      shield: 8,
      magnet: 10,
      slowmo: 5,
      speedboost: 6,
    };

    // Visual config per type
    this.config = {
      shield: { icon: '\u{1F6E1}', color: '#44aaff', glow: '#0088ff', label: 'SHIELD' },
      magnet: { icon: '\u{1F9F2}', color: '#ff44aa', glow: '#ff0088', label: 'MAGNET' },
      slowmo: { icon: '\u{23F3}', color: '#aa44ff', glow: '#8800ff', label: 'SLOW-MO' },
      speedboost: { icon: '\u{26A1}', color: '#ffaa00', glow: '#ff8800', label: 'BOOST' },
    };
  }

  update(deltaTime) {
    this.phase += 0.08;
    this.bobPhase += 0.06;
    this.y += this.vy * deltaTime;
  }

  draw(ctx, cameraY) {
    if (this.collected) return;

    const screenY = this.y - cameraY;
    const bob = Math.sin(this.bobPhase) * 4;
    const pulse = 1 + Math.sin(this.phase) * 0.1;
    const cfg = this.config[this.type];

    // Render to 2x oversampled offscreen canvas for sharp icons
    const scale = 2;
    const logSize = Math.ceil(this.radius * 1.5 * pulse) * 2 + 8;
    if (!this._offCanvas) this._offCanvas = document.createElement('canvas');
    const oc = this._offCanvas;
    const offW = logSize * scale;
    if (oc.width !== offW || oc.height !== offW) { oc.width = offW; oc.height = offW; }
    const c = oc.getContext('2d');
    c.clearRect(0, 0, offW, offW);
    c.save();
    c.translate(offW / 2, offW / 2);
    c.scale(scale, scale);

    // Outer glow ring
    c.shadowBlur = 0;
    c.shadowColor = cfg.glow;
    c.strokeStyle = cfg.color;
    c.lineWidth = 2;
    c.globalAlpha = 0.4 + Math.sin(this.phase) * 0.2;
    c.beginPath();
    c.arc(0, 0, this.radius * 1.5 * pulse, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 1;

    // Background circle
    const grad = c.createRadialGradient(0, 0, 0, 0, 0, this.radius * pulse);
    grad.addColorStop(0, cfg.color + 'cc');
    grad.addColorStop(0.7, cfg.color + '88');
    grad.addColorStop(1, cfg.color + '33');
    c.fillStyle = grad;
    c.shadowBlur = 0;
    c.beginPath();
    c.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
    c.fill();

    // Border
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.shadowBlur = 0;
    c.stroke();

    // Icon (drawn with canvas paths for consistent cross-platform rendering)
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.5;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (this.type === 'shield') {
      c.beginPath();
      c.moveTo(0, -9);
      c.lineTo(8, -5);
      c.lineTo(8, 2);
      c.quadraticCurveTo(8, 9, 0, 12);
      c.quadraticCurveTo(-8, 9, -8, 2);
      c.lineTo(-8, -5);
      c.closePath();
      c.fillStyle = '#ffffff44';
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1.5;
      c.stroke();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(0, -3);
      c.lineTo(0, 5);
      c.moveTo(-4, 1);
      c.lineTo(4, 1);
      c.stroke();
    } else if (this.type === 'magnet') {
      c.beginPath();
      c.arc(0, -1, 7, Math.PI, 0, false);
      c.lineTo(7, 7);
      c.lineTo(4, 7);
      c.lineTo(4, 0);
      c.arc(0, -1, 4, 0, Math.PI, true);
      c.lineTo(-7, 7);
      c.lineTo(-4, 7);
      c.closePath();
      c.fillStyle = '#ff4488';
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = '#ffffff';
      c.fillRect(-7, 5, 3, 3);
      c.fillRect(4, 5, 3, 3);
    } else if (this.type === 'slowmo') {
      c.beginPath();
      c.moveTo(-6, -9);
      c.lineTo(6, -9);
      c.lineTo(2, -1);
      c.lineTo(6, 9);
      c.lineTo(-6, 9);
      c.lineTo(-2, -1);
      c.closePath();
      c.fillStyle = '#aa44ff55';
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = '#ffdd88';
      c.beginPath();
      c.moveTo(-3, 5);
      c.lineTo(3, 5);
      c.lineTo(4, 8);
      c.lineTo(-4, 8);
      c.closePath();
      c.fill();
    } else if (this.type === 'speedboost') {
      c.beginPath();
      c.moveTo(2, -10);
      c.lineTo(-4, 1);
      c.lineTo(0, 1);
      c.lineTo(-2, 10);
      c.lineTo(5, -1);
      c.lineTo(1, -1);
      c.closePath();
      c.fillStyle = '#ffdd00';
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1;
      c.stroke();
    }

    // Sparkle particles orbiting
    for (let i = 0; i < 3; i++) {
      const angle = this.phase * 2 + (i * Math.PI * 2) / 3;
      const dist = this.radius * 1.3;
      const sx = Math.cos(angle) * dist;
      const sy = Math.sin(angle) * dist;
      c.fillStyle = '#ffffff';
      c.globalAlpha = 0.6 + Math.sin(this.phase + i) * 0.3;
      c.beginPath();
      c.arc(sx, sy, 2, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();

    // Blit to main canvas
    const half = logSize / 2;
    ctx.drawImage(oc, this.x - half, screenY + bob - half, logSize, logSize);
  }

  checkCollision(player) {
    if (this.collected) return false;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (this.radius + player.radius);
  }
}

export default PowerUp;
