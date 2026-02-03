// Snooker table dimensions (in pixels, scaled for display)
export const TABLE_DIMENSIONS = {
  // Standard snooker playing area is 140" x 70" (approx)
  // We'll scale it to fit the screen
  width: 800,
  height: 400,
  cushionWidth: 25,
  pocketRadius: 18,
  frameWidth: 35,
};

// Ball properties
export const BALL_PROPERTIES = {
  radius: 7, // Scaled to be roughly proportional
  mass: 1,
  colors: {
    cue: '#FFFFFF',
    red: '#CC0000',
    yellow: '#FFCC00',
    green: '#00CC00',
    brown: '#8B4513',
    blue: '#0066CC',
    pink: '#FF66CC',
    black: '#000000',
  },
  pointValues: {
    red: 1,
    yellow: 2,
    green: 3,
    brown: 4,
    blue: 5,
    pink: 6,
    black: 7,
  },
};

// Table marking positions (relative to table dimensions)
export const TABLE_MARKINGS = {
  // Baulk line is 29 inches from face of bottom cushion
  // (29 / 142 approx 0.204 of playing length)
  // We'll use 142 inches as playing length (between cushion faces)
  baulkLineX: TABLE_DIMENSIONS.width * (29 / 142),
  
  // D radius is 11.5 inches
  dRadius: TABLE_DIMENSIONS.width * (11.5 / 142),
  
  // Center spot (Blue)
  blueSpotX: TABLE_DIMENSIONS.width * 0.5,
  blueSpotY: TABLE_DIMENSIONS.height * 0.5,
  
  // Pink spot: midway between center and top cushion
  pinkSpotX: TABLE_DIMENSIONS.width * 0.75,
  pinkSpotY: TABLE_DIMENSIONS.height * 0.5,
  
   // Black spot: 12.75 inches from top cushion
   blackSpotX: TABLE_DIMENSIONS.width * (1 - 12.75 / 142),
   blackSpotY: TABLE_DIMENSIONS.height * 0.5,
   
   // Color spots (for restoration after fouls)
   colorSpots: {
     yellow: {
       x: TABLE_DIMENSIONS.width * (29 / 142),
       y: TABLE_DIMENSIONS.height * 0.5 + (TABLE_DIMENSIONS.width * (11.5 / 142)),
     },
     green: {
       x: TABLE_DIMENSIONS.width * (29 / 142),
       y: TABLE_DIMENSIONS.height * 0.5 - (TABLE_DIMENSIONS.width * (11.5 / 142)),
     },
     brown: {
       x: TABLE_DIMENSIONS.width * (29 / 142),
       y: TABLE_DIMENSIONS.height * 0.5,
     },
     blue: {
       x: TABLE_DIMENSIONS.width * 0.5,
       y: TABLE_DIMENSIONS.height * 0.5,
     },
     pink: {
       x: TABLE_DIMENSIONS.width * 0.75,
       y: TABLE_DIMENSIONS.height * 0.5,
     },
     black: {
       x: TABLE_DIMENSIONS.width * (1 - 12.75 / 142),
       y: TABLE_DIMENSIONS.height * 0.5,
     },
   },
};

// Pocket positions
export const POCKET_POSITIONS = [
  // Top pockets
  { id: 'top-left', x: 0, y: 0 },
  { id: 'top-middle', x: TABLE_DIMENSIONS.width / 2, y: 0 },
  { id: 'top-right', x: TABLE_DIMENSIONS.width, y: 0 },
  // Bottom pockets
  { id: 'bottom-left', x: 0, y: TABLE_DIMENSIONS.height },
  { id: 'bottom-middle', x: TABLE_DIMENSIONS.width / 2, y: TABLE_DIMENSIONS.height },
  { id: 'bottom-right', x: TABLE_DIMENSIONS.width, y: TABLE_DIMENSIONS.height },
];

// Physics constants
export const PHYSICS_CONSTANTS = {
  gravity: 0,
  friction: 0.98, // Rolling friction (decreased from 0.985 for longer roll)
  restitution: 0.95, // Bounciness
  maxVelocity: 20,
  minVelocity: 0.01,
};