import { Ball } from '../types/Ball';

export interface GameScore {
  player1: number;
  player2: number;
}

export interface GameState {
  currentPlayer: 1 | 2;
  scores: GameScore;
  balls: Ball[];
  currentBreak: number;
  foulCommitted: boolean;
  gamePhase: 'waiting' | 'playing' | 'ended';
  lastPottedBall: Ball | null;
  redsRemaining: number;
  colorsOnTable: Ball[];
  nextRequiredType: 'red' | 'color' | 'any-color' | 'yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black' | 'ended';
}

export class ScoreSystem {
  private static calculateBallPoints(ball: Ball): number {
    return ball.pointValue;
  }

  public static addPoints(state: GameState, points: number, player: 1 | 2): GameState {
    return {
      ...state,
      scores: {
        ...state.scores,
        [player === 1 ? 'player1' : 'player2']: state.scores[player === 1 ? 'player1' : 'player2'] + points,
      },
      currentBreak: state.currentBreak + points,
    };
  }

  public static handleBallPotted(state: GameState, ball: Ball): GameState {
    const points = this.calculateBallPoints(ball);

    // Update ball status
    const updatedBalls = state.balls.map(b =>
      b.id === ball.id ? { ...b, isPocketed: true } : b
    );

    let newState: GameState = {
      ...state,
      balls: updatedBalls,
      lastPottedBall: ball,
    };

    // Add points to current player
    newState = this.addPoints(newState, points, state.currentPlayer);

    // Handle reds remaining
    if (ball.type === 'red') {
      newState.redsRemaining = Math.max(0, state.redsRemaining - 1);
    }

    // Handle colored balls
    if (ball.type === 'color') {
      newState.colorsOnTable = state.colorsOnTable.filter(b => b.id !== ball.id);
    }

    return newState;
  }

  public static getWinner(state: GameState): 1 | 2 | null {
    if (state.gamePhase !== 'ended') return null;

    if (state.scores.player1 > state.scores.player2) return 1;
    if (state.scores.player2 > state.scores.player1) return 2;
    return null; // Draw (though rare in snooker)
  }

  public static resetBreak(state: GameState): GameState {
    return {
      ...state,
      currentBreak: 0,
    };
  }

  public static switchPlayer(state: GameState): GameState {
    return {
      ...state,
      currentPlayer: state.currentPlayer === 1 ? 2 : 1,
      currentBreak: 0,
    };
  }
}