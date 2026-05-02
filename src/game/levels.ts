import { LevelData } from './types';
import { parseASCIILevel } from './levelParser';

const rawLevels = [
  {
    id: 1,
    name: "Level 1: Troll Free",
    grid: [
      ".S..........G.",
      "XXXXXXXXXXXXXX",
    ]
  },
  {
    id: 2,
    name: "Level 2: The Jump",
    grid: [
      ".S.......^.....OO.....G..",
      "XXXX...XXXX...XXXX...XXXX",
    ]
  },
  {
    id: 3,
    name: "Level 3: Stepping Stones",
    grid: [
      ".S.....!.....G.",
      "XXXX>XXXXX<XXXX",
    ]
  },
  
];

export const levels: LevelData[] = rawLevels.map(parseASCIILevel);

export const getLevel = (id: number): LevelData | undefined => levels.find(l => l.id === id);
