import { PlayerState, LevelData, Rect, Platform, Goal } from './types';
import { audioSystem } from './audio';

export interface GameInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean; // Just pressed this frame
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: LevelData;
  private player: PlayerState;
  
  private lastTime: number = 0;
  private accumulator: number = 0;
  private footstepTimer: number = 0;
  private winTime: number = 0;
  private onWinCalled: boolean = false;
  private readonly TIME_STEP = 1 / 60;

  private isDead: boolean = false;
  private deathTimer: number = 0;
  private particles: Particle[] = [];

  // Constants
  private readonly GRAVITY = 1500;
  private readonly MOVEMENT_SPEED = 280;
  private readonly JUMP_FORCE = -600;
  private readonly MAX_FALL_SPEED = 800;

  private onWin: () => void;
  private won: boolean = false;

  constructor(canvas: HTMLCanvasElement, level: LevelData, onWin: () => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get 2d context");
    this.ctx = ctx;
    this.level = level;
    this.onWin = onWin;

    this.player = {
      pos: { x: level.startPos.x, y: level.startPos.y },
      vel: { x: 0, y: 0 },
      size: { x: 30, y: 30 },
      onGround: false,
      facingRight: true,
      state: 'idle'
    };
  }

  public resetPlayer() {
    this.player = {
      pos: { x: this.level.startPos.x, y: this.level.startPos.y },
      vel: { x: 0, y: 0 },
      size: { x: 30, y: 30 },
      onGround: false,
      facingRight: true,
      state: 'idle'
    };
    this.won = false;
    this.winTime = 0;
    this.onWinCalled = false;
    this.isDead = false;
    this.deathTimer = 0;
    this.particles = [];
  }

  private die() {
    if (this.isDead) return;
    this.isDead = true;
    this.deathTimer = 0;
    audioSystem.playDeath();
    
    // Generate fragments
    this.particles = [];
    const colors = ['#fcd5ce', '#3b82f6', '#1e3a8a', '#fca5a5', '#78350f']; // Skin, shirt, pants, arms, hair colors
    for(let i=0; i<40; i++) {
       this.particles.push({
         x: this.player.pos.x + Math.random() * this.player.size.x,
         y: this.player.pos.y + Math.random() * this.player.size.y,
         vx: (Math.random() - 0.5) * 800,
         vy: (Math.random() - 1) * 800,
         size: Math.random() * 6 + 2,
         color: colors[Math.floor(Math.random() * colors.length)]
       });
    }
  }

  private isColliding(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  public tick(dt: number, input: GameInput) {
    if (this.isDead) {
      this.deathTimer += dt;
      this.updateTraps(dt); // Keep traps moving during death sequence
      for (const p of this.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += this.GRAVITY * dt * 0.8;
      }
      
      if (this.deathTimer > 1.5) {
        this.resetPlayer();
        this.resetTraps();
      }
      return;
    }

    if (this.won) {
      this.winTime += dt;
      if (this.winTime >= 2.0 && !this.onWinCalled) {
        this.onWinCalled = true;
        this.onWin();
      }
    }

    this.accumulator += dt;
    // Cap accumulator to prevent spiral of death
    if (this.accumulator > 0.1) this.accumulator = 0.1;

    while (this.accumulator >= this.TIME_STEP) {
      this.updatePhysics(this.TIME_STEP, this.won ? { left: false, right: false, jump: false, jumpPressed: false } : input);
      this.accumulator -= this.TIME_STEP;
    }
  }

  private resetTraps() {
    for (const plat of this.level.platforms) {
      if (plat.startX !== undefined) plat.x = plat.startX;
      if (plat.startY !== undefined) plat.y = plat.startY;
      if (plat.triggered !== undefined) plat.triggered = false;
      if (plat.triggerRatio !== undefined) plat.triggerRatio = 0;
      if (plat.type === 'sliding-left' || plat.type === 'sliding-right') plat.width = 50;
    }
  }

  private updateTraps(dt: number) {
    for (const plat of this.level.platforms) {
      const originX = plat.startX ?? plat.x;
      const originY = plat.startY ?? plat.y;
      
      if (plat.type === 'sliding-left' || plat.type === 'sliding-right') {
        const pRect = {
          x: this.player.pos.x,
          y: this.player.pos.y,
          width: this.player.size.x,
          height: this.player.size.y
        };
        const aboveRect = { x: originX, y: originY - plat.height, width: 50, height: plat.height };
        const blockRect = { x: originX, y: originY, width: 50, height: plat.height };
        
        // Don't trigger if dead to prevent weird sliding after death, but keep sliding if already triggered
        if (!this.isDead && (this.isColliding(pRect, aboveRect) || this.isColliding(pRect, blockRect))) {
          plat.triggered = true;
        } else if (!this.isDead) {
          plat.triggered = false;
        }

        if (plat.triggered) {
          plat.triggerRatio = Math.min((plat.triggerRatio || 0) + dt * 16, 1);
        } else {
          plat.triggerRatio = Math.max((plat.triggerRatio || 0) - dt * 16, 0);
        }

        const currentWidth = 50 * (1 - (plat.triggerRatio || 0));
        
        if (plat.type === 'sliding-left') {
          // Slide into left wall: right edge moves left
          plat.x = originX;
          plat.width = currentWidth;
        } else {
          // Slide into right wall: left edge moves right
          plat.x = originX + 50 - currentWidth;
          plat.width = currentWidth;
        }
      } else if (plat.type === 'popping-spike' || plat.type === 'popping-spike-down') {
        const pRect = {
          x: this.player.pos.x,
          y: this.player.pos.y,
          width: this.player.size.x,
          height: this.player.size.y
        };
        
        let blockX = originX;
        let blockY = originY;
        let bWidth = plat.width;
        let bHeight = plat.height;

        if (plat.type === 'popping-spike') {
           blockX = originX - 12.5;
           blockY = originY - 25;
           bWidth = 50;
           bHeight = 50;
        } else if (plat.type === 'popping-spike-down') {
           blockX = originX - 12.5;
           blockY = originY;
           bWidth = 50;
           bHeight = 50;
        }

        let triggered = false;
        if (!this.isDead) {
           if (plat.type === 'popping-spike') {
               const aboveRect = { x: blockX, y: blockY - bHeight, width: bWidth, height: bHeight };
               const blockRect = { x: blockX, y: blockY, width: bWidth, height: bHeight };
               triggered = this.isColliding(pRect, aboveRect) || this.isColliding(pRect, blockRect);
           } else {
               const belowRect = { x: blockX, y: blockY + bHeight, width: bWidth, height: bHeight };
               const blockRect = { x: blockX, y: blockY, width: bWidth, height: bHeight };
               const leftRect = { x: blockX - bWidth, y: blockY, width: bWidth, height: bHeight };
               const rightRect = { x: blockX + bWidth, y: blockY, width: bWidth, height: bHeight };
               triggered = this.isColliding(pRect, belowRect) || this.isColliding(pRect, blockRect) || this.isColliding(pRect, leftRect) || this.isColliding(pRect, rightRect);
           }
        }
        
        if (triggered) {
          plat.triggered = true;
        } else if (!this.isDead) {
          plat.triggered = false;
        }
        
        if (plat.triggered) {
          plat.triggerRatio = Math.min((plat.triggerRatio || 0) + dt * 60, 1);
        } else {
          plat.triggerRatio = Math.max((plat.triggerRatio || 0) - dt * 60, 0);
        }
      } else if (plat.type === 'fake-door') {
        const pRect = {
          x: this.player.pos.x,
          y: this.player.pos.y,
          width: this.player.size.x,
          height: this.player.size.y
        };
        if (!this.isDead && this.isColliding(pRect, plat)) {
           plat.triggered = true;
        }
        
        if (plat.triggered) {
           plat.triggerRatio = Math.min((plat.triggerRatio || 0) + dt * 4, 1);
        }
      }
    }
  }

  private updatePhysics(dt: number, rawInput: GameInput) {
    const input = { ...rawInput };
    if (this.level.invertControls) {
      input.left = rawInput.right;
      input.right = rawInput.left;
    }

    this.updateTraps(dt);

    // Horizontal movement with momentum/acceleration
    const ACCEL = 1000;
    const FRICTION = 800;

    if (this.won) {
      const doorCenter = this.level.goal.x + this.level.goal.width / 2 - this.player.size.x / 2;
      const dist = doorCenter - this.player.pos.x;
      if (Math.abs(dist) > 2) {
        this.player.vel.x = dist > 0 ? 80 : -80;
        this.player.facingRight = dist > 0;
        if (this.player.onGround) this.player.state = 'walking';
      } else {
        this.player.vel.x = 0;
        this.player.pos.x = doorCenter;
        if (this.player.onGround) this.player.state = 'idle';
      }
    } else if (input.left) {
      this.player.vel.x -= ACCEL * dt;
      if (this.player.vel.x < -this.MOVEMENT_SPEED) this.player.vel.x = -this.MOVEMENT_SPEED;
      this.player.facingRight = false;
      if (this.player.onGround) this.player.state = 'walking';
    } else if (input.right) {
      this.player.vel.x += ACCEL * dt;
      if (this.player.vel.x > this.MOVEMENT_SPEED) this.player.vel.x = this.MOVEMENT_SPEED;
      this.player.facingRight = true;
      if (this.player.onGround) this.player.state = 'walking';
    } else {
      // apply friction / deceleration
      if (this.player.vel.x > 0) {
        this.player.vel.x -= FRICTION * dt;
        if (this.player.vel.x < 0) this.player.vel.x = 0;
      } else if (this.player.vel.x < 0) {
        this.player.vel.x += FRICTION * dt;
        if (this.player.vel.x > 0) this.player.vel.x = 0;
      }
      if (this.player.onGround) this.player.state = 'idle';
    }

    if (this.player.state === 'walking' && this.player.onGround) {
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        audioSystem.playFootstep();
        this.footstepTimer = 0.25; // Play footstep every 0.25 seconds
      }
    } else {
      this.footstepTimer = 0;
    }

    // Jumping
    if (input.jump && this.player.onGround) {
      this.player.vel.y = this.JUMP_FORCE;
      this.player.onGround = false;
      this.player.state = 'jumping';
      audioSystem.playJump();
    }

    // Gravity
    this.player.vel.y += this.GRAVITY * dt;
    if (this.player.vel.y > this.MAX_FALL_SPEED) {
      this.player.vel.y = this.MAX_FALL_SPEED;
    }

    if (!this.player.onGround && this.player.vel.y > 0) {
      this.player.state = 'falling';
    }

    const eatingDoor = this.level.platforms.find(p => p.type === 'fake-door' && p.triggered);
    if (eatingDoor) {
        this.player.vel.x = 0;
        this.player.vel.y = 0;
        this.player.pos.x = eatingDoor.x + eatingDoor.width / 2 - this.player.size.x / 2;
        if ((eatingDoor.triggerRatio || 0) > 0.5) {
            this.die();
            return;
        }
    } else {
        // Move X and collide
        this.player.pos.x += this.player.vel.x * dt;
        this.handleCollisions('x');

        // Move Y and collide
        this.player.pos.y += this.player.vel.y * dt;
        this.player.onGround = false;
        this.handleCollisions('y');
    }

    // Check Goal
    if (!this.won) {
      const playerRect = { ...this.player.pos, width: this.player.size.x, height: this.player.size.y };
      if (this.isColliding(playerRect, this.level.goal)) {
        this.won = true;
        audioSystem.playGoal();
      }
    }
  }

  private handleCollisions(axis: 'x' | 'y') {
    const pRect = { 
      x: this.player.pos.x, 
      y: this.player.pos.y, 
      width: this.player.size.x, 
      height: this.player.size.y 
    };

    for (const plat of this.level.platforms) {
      if (['spike-single', 'spike-double', 'saw', 'void'].includes(plat.type)) {
        if (plat.type === 'saw') {
          const cx = plat.x + plat.width / 2;
          const cy = plat.y + plat.height;
          const r = (plat.width / 2) * 0.9;
          
          const closestX = Math.max(pRect.x, Math.min(cx, pRect.x + pRect.width));
          const closestY = Math.max(pRect.y, Math.min(cy, pRect.y + pRect.height));
          
          const distanceSq = Math.pow(cx - closestX, 2) + Math.pow(cy - closestY, 2);
          if (distanceSq < r * r && pRect.y + pRect.height / 2 < cy) { 
            this.die();
            return;
          }
        } else if (this.isColliding(pRect, plat)) {
          this.die();
          return;
        }
      }
      if (plat.type === 'popping-spike' && plat.triggerRatio !== undefined && plat.triggerRatio > 0) {
        const spikeBox = {
          x: plat.x,
          y: plat.y + plat.height - (plat.triggerRatio * plat.height),
          width: plat.width,
          height: plat.triggerRatio * plat.height
        };
        if (this.isColliding(pRect, spikeBox)) {
          this.die();
          return;
        }
      } else if (plat.type === 'popping-spike-down' && plat.triggerRatio !== undefined && plat.triggerRatio > 0) {
        const spikeBox = {
          x: plat.x,
          y: plat.y,
          width: plat.width,
          height: plat.height * plat.triggerRatio
        };
        if (this.isColliding(pRect, spikeBox)) {
          this.die();
          return;
        }
      }
      
      if (['solid', 'sliding-left', 'sliding-right', 'invisible-solid'].includes(plat.type) && this.isColliding(pRect, plat)) {
        if (axis === 'x') {
          if (this.player.vel.x > 0) { // Moving right
            this.player.pos.x = plat.x - this.player.size.x;
          } else if (this.player.vel.x < 0) { // Moving left
            this.player.pos.x = plat.x + plat.width;
          }
          this.player.vel.x = 0;
          pRect.x = this.player.pos.x;
        } else {
          if (this.player.vel.y > 0) { // Falling
            this.player.pos.y = plat.y - this.player.size.y;
            this.player.onGround = true;
            this.player.vel.y = 0;
          } else if (this.player.vel.y < 0) { // Moving up (hitting ceiling)
            this.player.pos.y = plat.y + plat.height;
            this.player.vel.y = 0;
          }
          pRect.y = this.player.pos.y;
        }
      }
    }
  }

  public render() {
    // Clear canvas
    this.ctx.fillStyle = '#1e1e24'; // Dark background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Camera follow (simple offset)
    this.ctx.save();
    // Center player vertically and horizontally to keep them always in view
    let cameraX = this.player.pos.x - this.canvas.width / 2 + this.player.size.x / 2;
    let cameraY = this.player.pos.y - this.canvas.height / 2 + this.player.size.y / 2;
    
    this.ctx.translate(-cameraX, -cameraY);

    // Draw Platforms and Hazards
    this.ctx.lineWidth = 2;
    for (const plat of this.level.platforms) {
      if (plat.type === 'fake-door') {
         this.drawDoor(plat, false, 0, true, plat.triggered, plat.triggerRatio || 0);
         continue;
      }
      if (['solid', 'sliding-left', 'sliding-right'].includes(plat.type) || plat.type === 'jump-through') {
        // Fill base with a slight overlap to prevent antialiasing gaps between blocks
        this.ctx.fillStyle = '#6b7280';
        this.ctx.fillRect(Math.floor(plat.x), Math.floor(plat.y), Math.ceil(plat.width) + 1, Math.ceil(plat.height) + 1);

        // Rocky patches based on global coordinates for seamless tiling
        const prng = (x: number, y: number) => {
           let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
           return n - Math.floor(n);
        };
        
        const pSize = 10;
        const startXAlign = Math.floor(plat.x / pSize) * pSize;
        const startYAlign = Math.floor(plat.y / pSize) * pSize;

        for(let px = startXAlign; px < plat.x + plat.width; px += pSize) {
           for(let py = startYAlign; py < plat.y + plat.height; py += pSize) {
              const r = prng(px, py);
              const drawX = Math.max(plat.x, px);
              const drawY = Math.max(plat.y, py);
              const drawW = Math.min(px + pSize, plat.x + plat.width) - drawX;
              const drawH = Math.min(py + pSize, plat.y + plat.height) - drawY;
              
              if (r < 0.15) {
                 this.ctx.fillStyle = '#4b5563'; // shadow dent
                 this.ctx.fillRect(drawX, drawY, drawW, drawH);
              } else if (r > 0.85) {
                 this.ctx.fillStyle = '#9ca3af'; // highlight bump
                 this.ctx.fillRect(drawX, drawY, drawW, drawH);
               }
            }
        }
      } else if (plat.type === 'popping-spike' && plat.triggerRatio !== undefined && plat.triggerRatio > 0) {
        const h = plat.height * plat.triggerRatio;
        this.ctx.fillStyle = '#e2e8f0';
        this.ctx.beginPath();
        this.ctx.moveTo(plat.x, plat.y + plat.height);
        this.ctx.lineTo(plat.x + plat.width / 2, plat.y + plat.height - h);
        this.ctx.lineTo(plat.x + plat.width, plat.y + plat.height);
        this.ctx.fill();
        this.ctx.strokeStyle = '#475569';
        this.ctx.stroke();
      } else if (plat.type === 'popping-spike-down' && plat.triggerRatio !== undefined && plat.triggerRatio > 0) {
        const h = plat.height * plat.triggerRatio;
        this.ctx.fillStyle = '#e2e8f0';
        this.ctx.beginPath();
        this.ctx.moveTo(plat.x, plat.y);
        this.ctx.lineTo(plat.x + plat.width / 2, plat.y + h);
        this.ctx.lineTo(plat.x + plat.width, plat.y);
        this.ctx.fill();
        this.ctx.strokeStyle = '#475569';
        this.ctx.stroke();
      } else if (plat.type === 'spike-single') {
        this.ctx.fillStyle = '#e2e8f0';
        this.ctx.beginPath();
        this.ctx.moveTo(plat.x, plat.y + plat.height);
        this.ctx.lineTo(plat.x + plat.width / 2, plat.y);
        this.ctx.lineTo(plat.x + plat.width, plat.y + plat.height);
        this.ctx.fill();
        this.ctx.strokeStyle = '#475569';
        this.ctx.stroke();
      } else if (plat.type === 'spike-double') {
        this.ctx.fillStyle = '#e2e8f0';
        const w = plat.width / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(plat.x, plat.y + plat.height);
        this.ctx.lineTo(plat.x + w / 2, plat.y);
        this.ctx.lineTo(plat.x + w, plat.y + plat.height);
        this.ctx.moveTo(plat.x + w, plat.y + plat.height);
        this.ctx.lineTo(plat.x + w + w / 2, plat.y);
        this.ctx.lineTo(plat.x + 2 * w, plat.y + plat.height);
        this.ctx.fill();
        this.ctx.strokeStyle = '#475569';
        this.ctx.stroke();
      } else if (plat.type === 'saw') {
        const cx = plat.x + plat.width / 2;
        const cy = plat.y + plat.height; // center is at the bottom, creating a semicircle
        const radius = plat.width / 2;
        
        this.ctx.save();
        
        // Clip to the bounding box (semicircle)
        this.ctx.beginPath();
        this.ctx.rect(plat.x, plat.y, plat.width, plat.height);
        this.ctx.clip();
        
        this.ctx.translate(cx, cy);
        this.ctx.rotate((performance.now() / 150) % (Math.PI * 2));
        
        // Outer dangerous saw metal
        this.ctx.fillStyle = '#64748b';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
        this.ctx.fill();

        // Metallic gradient
        const grad = this.ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius * 0.9);
        grad.addColorStop(0, '#e2e8f0');
        grad.addColorStop(1, '#94a3b8');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
        this.ctx.fill();

        // Saw teeth
        this.ctx.fillStyle = '#f1f5f9';
        for (let i = 0; i < 16; i++) {
          this.ctx.rotate(Math.PI * 2 / 16);
          this.ctx.beginPath();
          this.ctx.moveTo(radius * 0.8, -6);
          this.ctx.lineTo(radius + 4, 0); // sharp tip
          this.ctx.lineTo(radius * 0.8, 6);
          this.ctx.fill();
        }
        
        // Center pin
        this.ctx.fillStyle = '#334155';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
      }
    }

    // Draw Goal (Dungeon Gate)
    this.drawDoor(this.level.goal, this.won, this.winTime, false, false);

    this.ctx.save();
    // Fade out player if won
    if (this.won) {
      this.ctx.globalAlpha = Math.max(0, 1 - (this.winTime * 1.0));
    }

    if (this.isDead) {
      for (const p of this.particles) {
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      this.ctx.restore(); // Restore player fade
      this.ctx.restore(); // Restore camera padding
      return;
    }

    // Draw Player - human like pixel shape
    const px = this.player.pos.x;
    const py = this.player.pos.y;
    
    const headSize = 12;
    const headX = (px + this.player.size.x / 2) - (headSize / 2);
    const headY = py;

    const torsoW = 14;
    const torsoH = 10;
    const torsoX = (px + this.player.size.x / 2) - (torsoW / 2);
    const torsoY = py + headSize;

    const legW = 4;
    const legH = 8;
    const leg1X = torsoX + 2;
    const leg2X = torsoX + torsoW - legW - 2;
    const legY = torsoY + torsoH;

    // Skin color for head
    this.ctx.fillStyle = '#fcd5ce'; // peach
    this.ctx.fillRect(headX, headY, headSize, headSize);

    // Torso (Shirt)
    this.ctx.fillStyle = '#3b82f6'; // blue
    this.ctx.fillRect(torsoX, torsoY, torsoW, torsoH);

    // Animated Legs
    let leg1Offset = 0;
    let leg2Offset = 0;
    if (this.player.state === 'walking') {
      const time = performance.now() / 100;
      leg1Offset = Math.sin(time) * 3;
      leg2Offset = -Math.sin(time) * 3;
    } else if (this.player.state === 'jumping' || this.player.state === 'falling') {
      leg1Offset = -2;
      leg2Offset = -4; // One leg slightly tucked
    }

    // Legs (Pants)
    this.ctx.fillStyle = '#1e3a8a'; // dark blue
    this.ctx.fillRect(leg1X, legY, legW, legH + leg1Offset);
    this.ctx.fillRect(leg2X, legY, legW, legH + leg2Offset);

    // Arms
    const armW = 4;
    const armH = 8;
    this.ctx.fillStyle = '#fca5a5';
    // Position arms left/right of torso
    const armYOffset = (this.player.state === 'walking') ? Math.sin(performance.now() / 100) * 2 : 0;
    this.ctx.fillRect(torsoX - armW, torsoY + armYOffset, armW, armH);
    this.ctx.fillRect(torsoX + torsoW, torsoY - armYOffset, armW, armH);

    // Eyes & Hair
    // Hair
    this.ctx.fillStyle = '#78350f'; // brown hair
    this.ctx.fillRect(headX - 1, headY - 2, headSize + 2, 4);
    
    // Eyes
    this.ctx.fillStyle = 'black';
    const eyeSize = 2;
    if (this.player.facingRight) {
      this.ctx.fillRect(headX + 6, headY + 4, eyeSize, eyeSize);
      this.ctx.fillRect(headX + 10, headY + 4, eyeSize, eyeSize);
    } else {
      this.ctx.fillRect(headX + 0, headY + 4, eyeSize, eyeSize);
      this.ctx.fillRect(headX + 4, headY + 4, eyeSize, eyeSize);
    }

    this.ctx.restore(); // Restore player fade
    this.ctx.restore(); // Restore camera padding
  }

  // End of game engine rendering helpers
  private drawDoor(rect: Rect, isWon: boolean, winTime: number = 0, isFake: boolean = false, fakeTriggered: boolean = false, triggerRatio: number = 0) {
    const gx = rect.x;
    const gy = rect.y;
    const gw = rect.width;
    const gh = rect.height;
    
    // Outer rock arch (dome)
    this.ctx.fillStyle = '#4b5563'; // Dark Gray
    this.ctx.beginPath();
    this.ctx.moveTo(gx, gy + gh); // bottom left
    this.ctx.lineTo(gx, gy + gw / 2); // left wall
    this.ctx.arc(gx + gw / 2, gy + gw / 2, gw / 2, Math.PI, 0); // top dome
    this.ctx.lineTo(gx + gw, gy + gh); // right wall
    this.ctx.fill();

    // Rock details (cracks/blocks)
    this.ctx.strokeStyle = '#374151'; // Darker gray
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Inner black void
    this.ctx.fillStyle = '#030712'; // Pitch black
    this.ctx.beginPath();
    this.ctx.moveTo(gx + 10, gy + gh);
    this.ctx.lineTo(gx + 10, gy + gw / 2 + 5);
    this.ctx.arc(gx + gw / 2, gy + gw / 2 + 5, gw / 2 - 10, Math.PI, 0);
    this.ctx.lineTo(gx + gw - 10, gy + gh);
    this.ctx.fill();

    if (isFake && fakeTriggered) {
        // Draw tongue
        const tongueY = gy + gh - (triggerRatio * 30);
        this.ctx.fillStyle = '#f87171'; // tongue
        this.ctx.beginPath();
        this.ctx.arc(gx + gw / 2, Math.max(gy + gw / 2 + 5, tongueY), gw / 2 - 15, Math.PI, 0);
        this.ctx.fill();

        // Reveal teeth as ratio goes above 0.5
        if (triggerRatio > 0.5) {
            const teethRatio = (triggerRatio - 0.5) * 2; // 0 to 1
            const jawOffset = (1 - teethRatio) * 15;
            
            this.ctx.fillStyle = '#ffffff'; // teeth
            // Top teeth dropping down
            for (let i = 0; i < 4; i++) {
               this.ctx.beginPath();
               const tx = gx + 15 + i * 8;
               const topY = gy + gw / 2 - jawOffset;
               this.ctx.moveTo(tx, topY);
               this.ctx.lineTo(tx + 4, topY + 10);
               this.ctx.lineTo(tx + 8, topY);
               this.ctx.fill();
            }
            // Bottom teeth rising up
            for (let i = 0; i < 4; i++) {
               this.ctx.beginPath();
               const tx = gx + 15 + i * 8;
               const botY = gy + gh + jawOffset;
               this.ctx.moveTo(tx, botY);
               this.ctx.lineTo(tx + 4, botY - 10);
               this.ctx.lineTo(tx + 8, botY);
               this.ctx.fill();
            }
        }
    }

    // Wooden Plank
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(gx + 10, gy + gh);
    this.ctx.lineTo(gx + 10, gy + gw / 2 + 5);
    this.ctx.arc(gx + gw / 2, gy + gw / 2 + 5, gw / 2 - 10, Math.PI, 0);
    this.ctx.lineTo(gx + gw - 10, gy + gh);
    this.ctx.clip(); // Clip to the void area

    let plankYOffset = 0;
    if (isWon) {
      plankYOffset = winTime * 60; // Slide up speed
    } else if (isFake && fakeTriggered) {
      if (triggerRatio < 0.5) {
         plankYOffset = (triggerRatio * 2) * 60; // Smooth slide up
      } else {
         plankYOffset = 60; // Stays up
      }
    }

    const plankTopY = gy + 5 - plankYOffset;
    const plankHeight = gh;

    // Wood Base
    this.ctx.fillStyle = '#78350f'; 
    this.ctx.fillRect(gx + 10, plankTopY, gw - 20, plankHeight + 10);
    
    // Wood details (vertical gaps between planks)
    this.ctx.fillStyle = '#451a03';
    for(let i = 1; i < 4; i++) {
        this.ctx.fillRect(gx + 10 + i * ((gw - 20) / 4), plankTopY, 2, plankHeight + 10);
    }
    // Horizontal beam
    this.ctx.fillStyle = '#78350f';
    this.ctx.fillRect(gx + 10, plankTopY + 15, gw - 20, 10);
    this.ctx.fillStyle = '#451a03';
    this.ctx.fillRect(gx + 10, plankTopY + 15, gw - 20, 2);
    this.ctx.fillRect(gx + 10, plankTopY + 23, gw - 20, 2);

    this.ctx.restore();
  }
}