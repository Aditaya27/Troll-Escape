import { LevelData, Platform, Goal, Vector2 } from './types';

export interface ASCIILevelConfig {
  id: number;
  name: string;
  grid: string[];
  tileSize?: number;
}

/**
 * Parses an ASCII representation of a level into LevelData.
 * 
 * Legend:
 * . : air
 * X : solid platform
 * S : player starting position
 * G : goal / exit door
 * ^ : single spike (kills player)
 * M : double spike (kills player)
 * O : saw blade (hazard)
 * < : movable solid sliding left
 * > : movable solid sliding right
 * ! : popping spike block
 * v : popping spike down
 * F : fake door
 * L : invert controls
 * V : invisible solid block
 */
export function parseASCIILevel({ id, name, grid, tileSize = 50 }: ASCIILevelConfig): LevelData {
  const platforms: Platform[] = [];
  let startPos: Vector2 = { x: 50, y: 50 };
  let goal: Goal = { id: 'door', x: 0, y: 0, width: 60, height: 60 };
  let invertControls = false;

  const height = grid.length;
  let maxWidth = 0;

  for (let y = 0; y < height; y++) {
    const row = grid[y];
    if (row.length > maxWidth) maxWidth = row.length;
    let currentSolidStart = -1;
    let currentSawStart = -1;

    for (let x = 0; x <= row.length; x++) {
      const cell = x < row.length ? row[x] : ' ';

      // Handle Solid block grouping
      if (cell === 'X') {
        if (currentSolidStart === -1) currentSolidStart = x;
      } else {
        if (currentSolidStart !== -1) {
          platforms.push({
            x: currentSolidStart * tileSize,
            y: y * tileSize,
            width: (x - currentSolidStart) * tileSize,
            height: tileSize,
            type: 'solid'
          });
          currentSolidStart = -1;
        }
      }

      // Handle Saw block grouping
      if (cell === 'O') {
        if (currentSawStart === -1) currentSawStart = x;
      } else {
        if (currentSawStart !== -1) {
          platforms.push({
            x: currentSawStart * tileSize,
            y: y * tileSize,
            width: (x - currentSawStart) * tileSize,
            height: tileSize,
            type: 'saw'
          });
          currentSawStart = -1;
        }
      }

      if (cell !== 'X' && cell !== 'O') {
        // Handle individual cells
        if (cell === 'S') {
          startPos = { x: x * tileSize, y: y * tileSize };
        } else if (cell === 'G') {
          goal = {
            id: 'door',
            x: x * tileSize,
            y: (y * tileSize) + tileSize - 60,
            width: 60,
            height: 60
          };
        } else if (cell === '^') {
          platforms.push({ x: x * tileSize + tileSize * 0.25, y: y * tileSize + tileSize * 0.5, width: tileSize * 0.5, height: tileSize * 0.5, type: 'spike-single' });
        } else if (cell === 'M') {
          platforms.push({ x: x * tileSize, y: y * tileSize + tileSize * 0.5, width: tileSize, height: tileSize * 0.5, type: 'spike-double' });
        } else if (cell === 'V') {
          platforms.push({ x: x * tileSize, y: y * tileSize, width: tileSize, height: tileSize, type: 'invisible-solid' });
        } else if (cell === '<') {
          platforms.push({ x: x * tileSize, y: y * tileSize, width: tileSize, height: tileSize, type: 'sliding-left', triggered: false, startX: x * tileSize, startY: y * tileSize });
        } else if (cell === '>') {
          platforms.push({ x: x * tileSize, y: y * tileSize, width: tileSize, height: tileSize, type: 'sliding-right', triggered: false, startX: x * tileSize, startY: y * tileSize });
        } else if (cell === '!') {
          platforms.push({ x: x * tileSize + tileSize * 0.25, y: y * tileSize + tileSize * 0.5, width: tileSize * 0.5, height: tileSize * 0.5, type: 'popping-spike', triggered: false, triggerRatio: 0, startX: x * tileSize + tileSize * 0.25, startY: y * tileSize + tileSize * 0.5 });
        } else if (cell === 'v') {
          platforms.push({ x: x * tileSize + tileSize * 0.25, y: y * tileSize, width: tileSize * 0.5, height: tileSize * 0.5, type: 'popping-spike-down', triggered: false, triggerRatio: 0, startX: x * tileSize + tileSize * 0.25, startY: y * tileSize });
        } else if (cell === 'F') {
          platforms.push({ x: x * tileSize, y: (y * tileSize) + tileSize - 60, width: 60, height: 60, type: 'fake-door', triggered: false });
        } else if (cell === 'L') {
          invertControls = true;
        }
      }
    }
  }

  // Add huge void at the bottom to kill player if they fall off
  platforms.push({ x: -2000, y: height * tileSize + 200, width: (maxWidth * tileSize) + 4000, height: 1000, type: 'void' });

  return { id, name, startPos, goal, platforms, invertControls };
}
