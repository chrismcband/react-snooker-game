import { Ball } from '../types/Ball';
import { GameState } from './ScoreSystem';

export class RulesEngine {
  private static colorSequence: ('yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black')[] = 
    ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];

  // Check if a shot is valid according to snooker rules
  public static validateShot(
    state: GameState,
    pottedBalls: Ball[],
    cueBallPocketed: boolean
  ): { valid: boolean; reason?: string; foulPoints?: number } {
    // Check for cue ball potted (always a foul)
    if (cueBallPocketed) {
      return { valid: false, reason: 'Cue ball potted', foulPoints: 4 };
    }

    // If no balls potted, it's a valid shot (as long as we hit the correct ball first)
    // For simplicity, we assume hitting the correct ball first if it's not potted.
    // In a real game, we'd need collision detection to know which ball was hit first.
    if (pottedBalls.length === 0) return { valid: true };

    // Check potting sequence
    const firstPotted = pottedBalls[0];
    
    if (state.nextRequiredType === 'red') {
      if (firstPotted.type !== 'red') {
        return { valid: false, reason: 'Must pot a red', foulPoints: 4 };
      }
      // If multiple balls potted, they must all be reds
      if (pottedBalls.some(b => b.type !== 'red')) {
        return { valid: false, reason: 'Cannot pot colors with reds', foulPoints: 7 };
      }
    } else if (state.nextRequiredType === 'any-color') {
      if (firstPotted.type !== 'color') {
        return { valid: false, reason: 'Must pot a color', foulPoints: 7 };
      }
      if (pottedBalls.length > 1) {
        return { valid: false, reason: 'Cannot pot multiple colors', foulPoints: 7 };
      }
    } else {
      // Must pot the specific color in sequence
      if (firstPotted.id !== state.nextRequiredType) {
        return { valid: false, reason: `Must pot ${state.nextRequiredType}`, foulPoints: 7 };
      }
      if (pottedBalls.length > 1) {
        return { valid: false, reason: 'Cannot pot multiple balls', foulPoints: 7 };
      }
    }

    return { valid: true };
  }

  private static getCurrentColorInSequence(state: GameState): any {
    // Find the first color that is not pocketed
    for (const color of this.colorSequence) {
      const ball = state.balls.find(b => b.id === color);
      if (ball && !ball.isPocketed) return color;
    }
    return 'ended';
  }

  private static getNextColorInSequence(state: GameState, currentPotted: Ball): any {
    const currentIndex = this.colorSequence.indexOf(currentPotted.id as any);
    if (currentIndex === -1 || currentIndex === this.colorSequence.length - 1) {
      return 'ended';
    }
    return this.colorSequence[currentIndex + 1];
  }

  // Check if game should end
  public static shouldEndGame(state: GameState): boolean {
    return state.redsRemaining === 0 && state.balls.every(b => b.type === 'red' || b.isPocketed);
  }

  // Handle end of shot
  public static processShotResult(
    state: GameState,
    pottedBalls: Ball[],
    cueBallPocketed: boolean
  ): GameState {
    const validation = this.validateShot(state, pottedBalls, cueBallPocketed);
    let newState = { ...state };

    if (!validation.valid) {
      newState.foulCommitted = true;
      const opponent = state.currentPlayer === 1 ? 2 : 1;
      newState.scores = {
        ...state.scores,
        [opponent === 1 ? 'player1' : 'player2']:
          state.scores[opponent === 1 ? 'player1' : 'player2'] + (validation.foulPoints || 4),
      };
      newState.currentPlayer = opponent;
      newState.currentBreak = 0;
      
      // After a foul, next required type resets
      newState.nextRequiredType = state.redsRemaining > 0 ? 'red' : this.getCurrentColorInSequence(newState);

      // Return colors to their spots if they were potted
      pottedBalls.forEach(ball => {
        if (ball.type === 'color') {
          newState.balls = newState.balls.map(b => 
            b.id === ball.id ? { ...b, isPocketed: false } : b
          );
        }
      });
      // Handle cue ball if pocketed
      if (cueBallPocketed) {
        newState.balls = newState.balls.map(b =>
          b.id === 'cue' ? { ...b, isPocketed: false, x: 200, y: 200, vx: 0, vy: 0 } : b
        );
        newState.gamePhase = 'positioning';
      } else {
        newState.gamePhase = 'playing';
      }
    } else {
      if (pottedBalls.length > 0) {
        newState.foulCommitted = false;
        newState.gamePhase = 'playing';
        
        // Update next required type
        if (pottedBalls.some(b => b.type === 'red')) {
          newState.nextRequiredType = 'any-color';
        } else {
          // A color was potted
          if (state.redsRemaining > 0) {
            newState.nextRequiredType = 'red';
            // Return color to spot
            pottedBalls.forEach(ball => {
              newState.balls = newState.balls.map(b => 
                b.id === ball.id ? { ...b, isPocketed: false } : b
              );
            });
          } else {
            newState.nextRequiredType = this.getNextColorInSequence(newState, pottedBalls[0]);
          }
        }
      } else {
        // No balls potted
        newState.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
        newState.currentBreak = 0;
        newState.nextRequiredType = state.redsRemaining > 0 ? 'red' : this.getCurrentColorInSequence(newState);
        newState.gamePhase = 'playing';
      }
    }

    if (newState.nextRequiredType === 'ended') {
      newState.gamePhase = 'ended';
    }

    return newState;
  }

  public static getAvailableBalls(state: GameState): Ball[] {
    if (state.nextRequiredType === 'red') {
      return state.balls.filter(ball => ball.type === 'red' && !ball.isPocketed);
    } else if (state.nextRequiredType === 'any-color') {
      return state.balls.filter(ball => ball.type === 'color');
    } else {
      return state.balls.filter(ball => ball.id === state.nextRequiredType);
    }
  }

  public static isOnReds(state: GameState): boolean {
    return state.nextRequiredType === 'red';
  }

  public static isOnColors(state: GameState): boolean {
    return !this.isOnReds(state) && state.redsRemaining === 0;
  }
}