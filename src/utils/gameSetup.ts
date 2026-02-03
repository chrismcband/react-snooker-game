import { Ball } from '../types/Ball';
import { BALL_PROPERTIES, TABLE_MARKINGS, TABLE_DIMENSIONS } from './constants';

export function createInitialBalls(): Ball[] {
   const balls: Ball[] = [];
   
   // Log the markings for debugging
   const cueBallX = TABLE_MARKINGS.baulkLineX - TABLE_MARKINGS.dRadius * 0.5;
   const cueBallY = TABLE_DIMENSIONS.height * 0.5 + TABLE_MARKINGS.dRadius * 0.4;
   console.log('Creating balls with:', {
     baulkLineX: TABLE_MARKINGS.baulkLineX,
     dRadius: TABLE_MARKINGS.dRadius,
     cueBallX,
     cueBallY,
     dCenterX: TABLE_MARKINGS.baulkLineX,
     dCenterY: TABLE_DIMENSIONS.height * 0.5,
   });
   
   // Create cue ball - positioned in the D area for break
   // Standard position is within the D. Let's place it nicely for a break-off shot.
   balls.push({
     id: 'cue',
     type: 'cue',
     color: BALL_PROPERTIES.colors.cue,
     pointValue: 0,
     x: cueBallX,
     y: cueBallY,
    vx: 0,
    vy: 0,
    radius: BALL_PROPERTIES.radius,
    isPocketed: false,
    spinX: 0,
    spinY: 0,
    spinZ: 0,
  });

    // Create red balls (triangle formation)
    // The triangle apex should be BEHIND the pink spot (higher X value, further from the baulk)
    // Pink is at 75% of table width. Red triangle should be further back (toward top cushion)
    const apexX = TABLE_MARKINGS.pinkSpotX + BALL_PROPERTIES.radius * 2 * 1.5; // Position apex 1.5 ball diameters behind pink
    const apexY = TABLE_MARKINGS.pinkSpotY;

    let ballIndex = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        // Calculate position in triangle
        // apex is on the left (behind pink spot), base extends further right
        const x = apexX + row * BALL_PROPERTIES.radius * 2;
        const y = apexY + (col - row / 2) * BALL_PROPERTIES.radius * 2.05;

       balls.push({
         id: `red-${ballIndex}`,
         type: 'red',
         color: BALL_PROPERTIES.colors.red,
         pointValue: BALL_PROPERTIES.pointValues.red,
         x,
         y,
        vx: 0,
        vy: 0,
        radius: BALL_PROPERTIES.radius,
        isPocketed: false,
        spinX: 0,
        spinY: 0,
        spinZ: 0,
      });
      ballIndex++;
    }
  }

  // Create colored balls
   const coloredBalls = [
     {
       id: 'yellow',
       type: 'color' as const,
       color: BALL_PROPERTIES.colors.yellow,
       pointValue: BALL_PROPERTIES.pointValues.yellow,
       x: TABLE_MARKINGS.baulkLineX,
       y: TABLE_DIMENSIONS.height * 0.5 + TABLE_MARKINGS.dRadius,
     },
     {
       id: 'green',
       type: 'color' as const,
       color: BALL_PROPERTIES.colors.green,
       pointValue: BALL_PROPERTIES.pointValues.green,
       x: TABLE_MARKINGS.baulkLineX,
       y: TABLE_DIMENSIONS.height * 0.5 - TABLE_MARKINGS.dRadius,
     },
     {
       id: 'brown',
       type: 'color' as const,
       color: BALL_PROPERTIES.colors.brown,
       pointValue: BALL_PROPERTIES.pointValues.brown,
       x: TABLE_MARKINGS.baulkLineX,
       y: TABLE_DIMENSIONS.height * 0.5,
     },
     {
       id: 'blue',
       type: 'color' as const,
       color: BALL_PROPERTIES.colors.blue,
       pointValue: BALL_PROPERTIES.pointValues.blue,
       x: TABLE_MARKINGS.blueSpotX,
       y: TABLE_MARKINGS.blueSpotY,
     },
     {
       id: 'pink',
       type: 'color' as const,
       color: BALL_PROPERTIES.colors.pink,
       pointValue: BALL_PROPERTIES.pointValues.pink,
       x: TABLE_MARKINGS.pinkSpotX,
       y: TABLE_MARKINGS.pinkSpotY,
     },
     {
       id: 'black',
       type: 'color' as const,
       color: BALL_PROPERTIES.colors.black,
       pointValue: BALL_PROPERTIES.pointValues.black,
       x: TABLE_MARKINGS.blackSpotX,
       y: TABLE_MARKINGS.blackSpotY,
     },
   ];

  coloredBalls.forEach(ball => {
    balls.push({
      ...ball,
      vx: 0,
      vy: 0,
      radius: BALL_PROPERTIES.radius,
      isPocketed: false,
      spinX: 0,
      spinY: 0,
      spinZ: 0,
    });
  });

  return balls;
}

export function getBallById(balls: Ball[], id: string): Ball | undefined {
  return balls.find(ball => ball.id === id);
}

export function updateBallPosition(balls: Ball[], id: string, x: number, y: number): Ball[] {
  return balls.map(ball => 
    ball.id === id ? { ...ball, x, y } : ball
  );
}

export function updateBallVelocity(balls: Ball[], id: string, vx: number, vy: number): Ball[] {
  return balls.map(ball => 
    ball.id === id ? { ...ball, vx, vy } : ball
  );
}
