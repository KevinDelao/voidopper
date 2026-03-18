class Coin {
  constructor(x, y, type = 'gold') {
    this.x = x;
    this.y = y;
    this.type = type; // 'gold', 'silver', 'purple'
    this.radius = type === 'purple' ? 14 : type === 'silver' ? 11 : 8;
    this.rotation = 0;
    this.rotationSpeed = 0.08;
    this.collected = false;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = type === 'purple' ? 0.08 : 0.05; // Purple pulses faster
    this.bobPhase = Math.random() * Math.PI * 2;
    this.bobSpeed = 0.03;

    // Coins float down slowly
    this.vy = 30 + Math.random() * 20; // Slower than enemies (30-50)

    // Points value - Gold: 1pt, Silver: 2pts, Purple: 10pts
    this.value = type === 'purple' ? 10 : type === 'silver' ? 2 : 1;

    // Colors based on type
    if (type === 'gold') {
      this.colorLight = '#ffd700';
      this.colorMid = '#ffaa00';
      this.colorDark = '#cc8800';
      this.colorShine = '#ffffcc';
    } else if (type === 'silver') {
      this.colorLight = '#e0e0e0';
      this.colorMid = '#b0b0b0';
      this.colorDark = '#808080';
      this.colorShine = '#ffffff';
    } else {
      // Purple
      this.colorLight = '#ba55d3';
      this.colorMid = '#9932cc';
      this.colorDark = '#7b2d99';
      this.colorShine = '#e6b3ff';
    }
  }

  update(deltaTime) {
    this.rotation += this.rotationSpeed;
    this.pulsePhase += this.pulseSpeed;
    this.bobPhase += this.bobSpeed;

    // Float down slowly
    this.y += this.vy * deltaTime;
  }

  draw(ctx, cameraY) {
    if (this.collected) return;

    const screenY = this.y - cameraY;
    const bobOffset = Math.sin(this.bobPhase) * 2;
    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.15;

    // Render to 2x oversampled offscreen canvas for sharpness
    const scale = 2;
    const logSize = Math.ceil(this.radius * 1.8 * 2 * pulseScale) + 4;
    const offW = logSize * scale;
    if (!this._offCanvas) {
      this._offCanvas = document.createElement('canvas');
    }
    const oc = this._offCanvas;
    if (oc.width !== offW || oc.height !== offW) {
      oc.width = offW;
      oc.height = offW;
    }
    const c = oc.getContext('2d');
    c.clearRect(0, 0, offW, offW);
    c.save();
    c.translate(offW / 2, offW / 2);
    c.scale(scale, scale);

    // Simple outer glow (no gradient for performance)
    c.fillStyle = `${this.colorLight}30`;
    c.beginPath();
    c.arc(0, 0, this.radius * 1.8 * pulseScale, 0, Math.PI * 2);
    c.fill();

    // Coin perspective (3D effect with rotation)
    const perspective = Math.cos(this.rotation);
    const width = this.radius * Math.abs(perspective);

    // Draw coin edge when rotated
    if (Math.abs(perspective) < 0.3) {
      c.fillStyle = this.colorDark;
      c.fillRect(-2, -this.radius, 4, this.radius * 2);
    }

    // Coin body (simple fill, no gradient)
    c.fillStyle = this.colorMid;
    c.beginPath();
    c.ellipse(0, 0, width, this.radius, 0, 0, Math.PI * 2);
    c.fill();

    // Coin outline
    c.strokeStyle = this.colorDark;
    c.lineWidth = 2;
    c.stroke();

    // Shine/highlight
    if (perspective > 0) {
      c.fillStyle = 'rgba(255, 255, 255, 0.6)';
      c.beginPath();
      c.ellipse(-width * 0.3, -this.radius * 0.3, width * 0.3, this.radius * 0.3, 0, 0, Math.PI * 2);
      c.fill();
    }

    // Symbol in the center - draw shapes
    if (Math.abs(perspective) > 0.2) {
      c.fillStyle = this.colorDark;

      if (this.type === 'purple') {
        c.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? this.radius * 0.45 : this.radius * 0.22;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.closePath();
        c.fill();
      } else if (this.type === 'silver') {
        c.beginPath();
        c.moveTo(0, -this.radius * 0.45);
        c.lineTo(this.radius * 0.35, 0);
        c.lineTo(0, this.radius * 0.45);
        c.lineTo(-this.radius * 0.35, 0);
        c.closePath();
        c.fill();
      } else {
        c.beginPath();
        c.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();

    // Blit to main canvas
    const half = logSize / 2;
    ctx.drawImage(oc, this.x - half, screenY + bobOffset - half, logSize, logSize);
  }

  checkCollision(player) {
    if (this.collected) return false;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (this.radius + player.radius);
  }
}

export default Coin;
