import { LevelData } from './types';
import { parseASCIILevel } from './levelParser';

const rawLevels = [
  {
    id: 1,
    name: "Level 1: Troll Free",
    grid: [
      "vvvvvvvvvvvvvv",
      "..............",
      ".S..........G.",
      "XXXXXXXXXXXXXX",
    ]
  },
  {
    id: 2,
    name: "Level 2: Easy Jump",
    grid: [
      ".S....^^.....^......G.",
      "XXX...XXX...XXX....XXX",
    ]
  },
  {
    id: 3,
    name: "Level 3: Obvious Traps",
    grid: [
      "...G.............",
      "..XXX<>X.........",
      ".................",
      ".........X.......",
      ".........v.XXX...",
      ".....MOO.........",
      ".....XXXXX.......",
      "..........XX.....",
      ".S.....!.......F.",
      "XXXX>XXXX<XXXXXXX",
    ]
  },
  
];

export const levels: LevelData[] = rawLevels.map(parseASCIILevel);

export const getLevel = (id: number): LevelData | undefined => levels.find(l => l.id === id);
