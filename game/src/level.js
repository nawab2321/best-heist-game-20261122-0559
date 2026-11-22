export const VIEW = { width: 1280, height: 720 };
export const BANK = { x: 27, y: 113, w: 1226, h: 509 };
export const SPAWN = { x: 122, y: 539 };
export const STEP = 1 / 60;

const wall = (x, y, w, h, style = 'stone') => ({ x, y, w, h, style });
export const ARCHITECTURE = [
  wall(27, 113, 1226, 15, 'windows'), wall(27, 613, 1226, 9),
  wall(27, 128, 14, 485), wall(1240, 128, 13, 485),
  wall(215, 128, 15, 76), wall(215, 252, 15, 26), wall(215, 367, 15, 144),
  wall(215, 572, 15, 41), wall(41, 394, 110, 13),
  wall(917, 128, 18, 152), wall(917, 355, 18, 161),
  wall(917, 580, 18, 33), wall(935, 445, 305, 16),
];
export const VAULT_GATE = wall(917, 280, 18, 75, 'vault gate');
export const CARD_GATE = wall(215, 204, 15, 48, 'card gate');
export const COVERS = [
  { x: 82, y: 172, w: 86, h: 32, style: 'lockers' },
  { x: 54, y: 454, w: 88, h: 24, style: 'crates' },
  { x: 276, y: 216, w: 111, h: 30, style: 'desk' },
  { x: 401, y: 294, w: 43, h: 43, style: 'pillar' },
  { x: 401, y: 403, w: 43, h: 43, style: 'pillar' },
  { x: 752, y: 294, w: 43, h: 43, style: 'pillar' },
  { x: 752, y: 403, w: 43, h: 43, style: 'pillar' },
  { x: 544, y: 464, w: 90, h: 29, style: 'glass' },
  { x: 671, y: 464, w: 90, h: 29, style: 'glass' },
  { x: 584, y: 578, w: 94, h: 35, style: 'monitors' },
  { x: 815, y: 517, w: 51, h: 27, style: 'safe' },
  { x: 1041, y: 171, w: 33, h: 33, style: 'pillar' },
  { x: 1155, y: 171, w: 33, h: 33, style: 'pillar' },
  { x: 1041, y: 370, w: 33, h: 33, style: 'pillar' },
  { x: 1155, y: 370, w: 33, h: 33, style: 'pillar' },
  { x: 1097, y: 267, w: 34, h: 34, style: 'pedestal' },
  { x: 1157, y: 498, w: 48, h: 92, style: 'car' },
];
export const FLOOR_BLOCKS = [...ARCHITECTURE, ...COVERS];
export const VAULT_LOCKED_BLOCKS = [...FLOOR_BLOCKS, VAULT_GATE];
export const LOCKED_BLOCKS = [...VAULT_LOCKED_BLOCKS, CARD_GATE];

export const STATIONS = {
  credential: { x: 124, y: 226, label: 'ACCESS CARD', action: 'Take access card' },
  relay: { x: 630, y: 556, label: 'SECURITY RELAY', action: 'Cut surveillance relay' },
  lock: { x: 892, y: 317, label: 'VAULT LOCK', action: 'Open vault lock' },
  diamond: { x: 1114, y: 285, label: 'MIDNIGHT DIAMOND', action: 'Secure the diamond', reach: 46 },
  exit: { x: 1133, y: 547, label: 'GETAWAY CAR', action: 'Get in the car' },
};

export const GUARD_POSTS = [
  { id: '01', facing: 0.30, route: [[462, 269], [692, 269], [710, 385], [476, 385]], offset: 0 },
  { id: '02', facing: 2.93, route: [[832, 449], [488, 449], [472, 532], [821, 570]], offset: 0.65 },
  { id: '03', facing: 2.68, route: [[1189, 322], [1022, 325], [1021, 235], [1208, 235]], offset: 1.3 },
];

export const CAMERA_POSTS = [
  { id: '01', x: 259, y: 332, base: 0.72, sweep: 0.73, period: 5.6, phase: 0.1, range: 175, circuit: 'relay' },
  { id: '02', x: 877, y: 156, base: 2.10, sweep: 0.62, period: 7.5, phase: 0.8, range: 220, circuit: 'relay' },
  { id: '03', x: 1218, y: 153, base: 2.03, sweep: 0.64, period: 6.4, phase: 1.9, range: 197, circuit: 'vault' },
];

export const LASER_LINES = [
  { x1: 981, y1: 157, x2: 981, y2: 418, period: 4.8, active: 2.65, offset: 0.10 },
  { x1: 989, y1: 157, x2: 989, y2: 418, period: 4.8, active: 2.65, offset: 0.10 },
  { x1: 1018, y1: 431, x2: 1219, y2: 431, period: 5.4, active: 2.5, offset: 1.1 },
];

export const MOTION_SENSOR = { x: 679, y: 372, radius: 34 };
