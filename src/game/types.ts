export type Vector2 = { x: number; y: number };

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Platform extends Rect {
  type: 'solid' | 'jump-through' | 'spike-single' | 'spike-double' | 'saw' | 'void' | 'sliding-left' | 'sliding-right' | 'popping-spike';
  startX?: number;
  startY?: number;
  triggered?: boolean;
  triggerRatio?: number;
}

export interface Goal extends Rect {
  id: 'door';
}

export interface LevelData {
  id: number;
  name: string;
  startPos: Vector2;
  goal: Goal;
  platforms: Platform[];
}

export interface PlayerState {
  pos: Vector2;
  vel: Vector2;
  size: Vector2;
  onGround: boolean;
  facingRight: boolean;
  state: 'idle' | 'walking' | 'jumping' | 'falling';
}

export interface GameSettings {
  sfxVolume: number; // 0-10
  bgmVolume: number; // 0-10
}
