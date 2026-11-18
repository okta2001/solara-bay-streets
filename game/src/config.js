// Solara Bay Streets - configuration and name data
export const BLOCK = 320;
export const ROAD = 96;
export const CITY_COLS = 10;
export const CITY_ROWS = 8;
export const WORLD_W = CITY_COLS * BLOCK;
export const WORLD_H = CITY_ROWS * BLOCK;
export const SAVE_KEY = 'solara-bay-streets-save-v1';
export const DISTRICTS = [
  { name: 'Marina', color: '#2ec4b6' },
  { name: 'Old Market', color: '#e9c46a' },
  { name: 'Palms District', color: '#7bc950' },
  { name: 'Portside', color: '#5a7d9a' },
  { name: 'Downtown', color: '#c77dab' },
  { name: 'Coral Heights', color: '#f4a261' },
];
export const CAR_COLORS = ['#e63946','#f1fa8c','#457b9d','#2a9d8f','#e9c46a','#9b5de5','#f15bb5','#00bbf9','#fee440','#8ac926','#ff595e','#6a4c93','#ffffff','#222222','#ff8c42'];
export const CAR_TYPES = [
  { name: 'Sedan', w: 44, h: 22, maxSpeed: 260, accel: 220 },
  { name: 'Hatch', w: 40, h: 20, maxSpeed: 230, accel: 200 },
  { name: 'Sport', w: 46, h: 21, maxSpeed: 360, accel: 320 },
  { name: 'Taxi', w: 44, h: 22, maxSpeed: 250, accel: 210 },
  { name: 'Van', w: 50, h: 24, maxSpeed: 210, accel: 170 },
];
export const PED_NAMES = ['Ana','Leo','Mia','Jon','Sofia','Marco','Lena','Omar','Nina','Pablo','Ivy','Dario'];
export const STORY_INTRO = 'Ren Calloway, a courier who knows every shortcut in Solara Bay, owes fixer Mara Voss one last favour. Five jobs. No questions. Get paid, get out — if the city lets you.';
export const CONTROLS_TEXT = [
  'WASD / Arrows — move / drive',
  'Shift — sprint',
  'E — enter / exit car',
  'Space — handbrake drift',
  'Mouse — aim pistol, Click — shoot',
  'F — melee attack',
  'Esc / P — pause,  M — mute',
];
