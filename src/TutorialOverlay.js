import { getItem, setItem } from './storage';

const STORAGE_KEY = 'voidHopper_tutorialDone';

class TutorialOverlay {
  constructor() {
    this.done = getItem(STORAGE_KEY) === '1';
    this.active = false;
    this.step = 0;
    this.timer = 0;
    this.handAngle = 0;
  }

  shouldShow() {
    return !this.done;
  }

  start() {
    if (this.done) return;
    this.active = true;
    this.step = 0;
    this.timer = 0;
    this.handAngle = 0;
  }

  dismiss() {
    this.active = false;
    this.done = true;
    setItem(STORAGE_KEY, '1');
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;
    this.handAngle += dt * 1.5;

    if (this.step === 0 && this.timer > 4) {
      this.step = 1;
      this.timer = 0;
    } else if (this.step === 1 && this.timer > 4) {
      this.step = 2;
      this.timer = 0;
    } else if (this.step === 2 && this.timer > 3) {
      this.dismiss();
    }
  }

  draw(ctx, width, height) {
    if (!this.active) return;

    const ts = Math.max(1, width / 390);
    const cx = width / 2;

    // Dim overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, height);

    const steps = [
      { title: 'DRAG TO AIM', sub: 'Touch and drag to aim your launch direction', handAction: 'drag' },
      { title: 'RELEASE TO LAUNCH', sub: 'Let go to fly! Bounce between walls to climb', handAction: 'release' },
      { title: 'AVOID THE VOID', sub: 'The void rises below — keep climbing to survive!', handAction: 'none' },
    ];

    const s = steps[this.step];
    const fadeIn = Math.min(1, this.timer / 0.5);
    ctx.globalAlpha = fadeIn;

    // Title
    ctx.font = `bold ${Math.round(24 * ts)}px Orbitron, Arial`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#44ccff';
    ctx.fillText(s.title, cx, height * 0.3);

    // Subtitle
    ctx.font = `${Math.round(14 * ts)}px Orbitron, Arial`;
    ctx.fillStyle = '#ccccee';
    ctx.fillText(s.sub, cx, height * 0.3 + Math.round(30 * ts));

    // Animated hand gesture
    if (s.handAction === 'drag') {
      const handX = cx + Math.sin(this.handAngle) * 40;
      const handY = height * 0.55 + Math.cos(this.handAngle) * 30;
      this._drawHand(ctx, handX, handY, ts);
      // Draw aim line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 30, height * 0.55);
      ctx.lineTo(handX, handY);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (s.handAction === 'release') {
      const pulse = Math.sin(this.timer * 4) * 0.3 + 0.7;
      const handX = cx;
      const handY = height * 0.55;
      this._drawHand(ctx, handX, handY - 20 * pulse, ts);
      // Draw arrow upward
      ctx.strokeStyle = `rgba(68, 204, 255, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, height * 0.55);
      ctx.lineTo(cx, height * 0.4);
      ctx.lineTo(cx - 10, height * 0.43);
      ctx.moveTo(cx, height * 0.4);
      ctx.lineTo(cx + 10, height * 0.43);
      ctx.stroke();
    }

    // Tap to continue
    const tapAlpha = 0.4 + Math.sin(this.timer * 3) * 0.3;
    ctx.globalAlpha = tapAlpha;
    ctx.font = `${Math.round(12 * ts)}px Orbitron, Arial`;
    ctx.fillStyle = '#888888';
    ctx.fillText('Tap to skip', cx, height * 0.85);

    ctx.restore();
  }

  _drawHand(ctx, x, y, ts) {
    const size = Math.round(20 * ts);
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.5);
    ctx.lineTo(x - size * 0.3, y + size);
    ctx.lineTo(x + size * 0.3, y + size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export default TutorialOverlay;
