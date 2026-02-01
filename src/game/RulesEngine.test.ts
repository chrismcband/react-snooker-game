import { RulesEngine } from './RulesEngine';
import { GameState } from './ScoreSystem';
import { Ball } from '../types/Ball';
import { createInitialBalls } from '../utils/gameSetup';

// Helper function to create a test ball
function createTestBall(overrides?: Partial<Ball>): Ball {
  return {
    id: 'test-ball',
    x: 300,
    y: 200,
    vx: 0,
    vy: 0,
    type: 'red',
    isPocketed: false,
    radius: 8.25,
    color: '#CC0000',
    pointValue: 1,
    spinX: 0,
    spinY: 0,
    spinZ: 0,
    ...overrides,
  };
}

// Helper function to create a test game state
function createTestGameState(overrides?: Partial<GameState>): GameState {
  const initialBalls = createInitialBalls();
  const redsRemaining = initialBalls.filter(ball => ball.type === 'red').length;
  return {
    currentPlayer: 1,
    scores: { player1: 0, player2: 0 },
    balls: initialBalls,
    currentBreak: 0,
    foulCommitted: false,
    gamePhase: 'playing',
    lastPottedBall: null,
    redsRemaining,
    colorsOnTable: initialBalls.filter(ball => ball.type === 'color'),
    nextRequiredType: 'red',
    ...overrides,
  };
}

describe('RulesEngine', () => {
  describe('validateShot', () => {
    describe('Foul: No ball hit', () => {
      it('should return foul with 4 points when no ball is hit', () => {
        const state = createTestGameState();
        const result = RulesEngine.validateShot(state, [], false, null);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Failed to hit any ball');
        expect(result.foulPoints).toBe(4);
      });
    });

    describe('Foul: Cue ball pocketed', () => {
      it('should return foul with 4 points when cue ball is pocketed on red', () => {
        const state = createTestGameState({ nextRequiredType: 'red' });
        const result = RulesEngine.validateShot(state, [], true, undefined);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Cue ball potted');
        expect(result.foulPoints).toBe(4);
      });

      it('should return foul with color points when cue ball is pocketed on color phase', () => {
        const state = createTestGameState({ nextRequiredType: 'yellow' });
        const result = RulesEngine.validateShot(state, [], true, undefined);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Cue ball potted');
        expect(result.foulPoints).toBe(2); // yellow = 2 points
      });
    });

    describe('Foul: Wrong ball hit', () => {
      it('should return foul when hitting wrong color instead of red', () => {
        const state = createTestGameState({ nextRequiredType: 'red' });
        const yellowBall = createTestBall({ id: 'yellow', type: 'color', color: '#FFCC00' });
        
        const result = RulesEngine.validateShot(state, [], false, yellowBall);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('wrong ball');
        expect(result.foulPoints).toBe(2); // yellow = 2 points
      });

      it('should return foul when hitting red instead of specific color', () => {
        const state = createTestGameState({ nextRequiredType: 'yellow' });
        const redBall = createTestBall({ id: 'red-1', type: 'red' });
        
        const result = RulesEngine.validateShot(state, [], false, redBall);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Must hit yellow');
        expect(result.foulPoints).toBe(4); // red = 4 points (though it's minimum)
      });

      it('should return foul when must hit color but hits red', () => {
        const state = createTestGameState({ nextRequiredType: 'any-color' });
        const redBall = createTestBall({ id: 'red-1', type: 'red' });
        
        const result = RulesEngine.validateShot(state, [], false, redBall);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Must hit a color');
        expect(result.foulPoints).toBe(4);
      });
    });

    describe('Valid shots', () => {
      it('should allow hitting red when on red phase', () => {
        const state = createTestGameState({ nextRequiredType: 'red' });
        const redBall = createTestBall({ id: 'red-1', type: 'red' });
        
        const result = RulesEngine.validateShot(state, [], false, redBall);
        
        expect(result.valid).toBe(true);
      });

      it('should allow hitting any color when on color phase', () => {
        const state = createTestGameState({ nextRequiredType: 'any-color' });
        const yellowBall = createTestBall({ id: 'yellow', type: 'color', color: '#FFCC00' });
        
        const result = RulesEngine.validateShot(state, [], false, yellowBall);
        
        expect(result.valid).toBe(true);
      });

      it('should allow hitting specific color in sequence', () => {
        const state = createTestGameState({ nextRequiredType: 'green' });
        const greenBall = createTestBall({ id: 'green', type: 'color', color: '#00CC00' });
        
        const result = RulesEngine.validateShot(state, [], false, greenBall);
        
        expect(result.valid).toBe(true);
      });
    });

    describe('Potting balls', () => {
      it('should allow potting red when on red phase', () => {
        const state = createTestGameState({ nextRequiredType: 'red' });
        const redBall = createTestBall({ id: 'red-1', type: 'red', isPocketed: true });
        
        const result = RulesEngine.validateShot(state, [redBall], false, redBall);
        
        expect(result.valid).toBe(true);
      });

      it('should return foul when potting wrong ball', () => {
        const state = createTestGameState({ nextRequiredType: 'red' });
        const yellowBall = createTestBall({ id: 'yellow', type: 'color', color: '#FFCC00', isPocketed: true });
        
        const result = RulesEngine.validateShot(state, [yellowBall], false, yellowBall);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Must pot a red');
        expect(result.foulPoints).toBe(2); // yellow = 2 points
      });
    });
  });

  describe('processShotResult', () => {
    it('should award foul points to opponent when no balls hit', () => {
      const state = createTestGameState();
      const newState = RulesEngine.processShotResult(state, [], false, null);
      
      expect(newState.foulCommitted).toBe(true);
      expect(newState.scores.player2).toBe(4); // Opponent gets 4 points
      expect(newState.currentPlayer).toBe(2); // Turn switches
    });

    it('should award foul points when hitting wrong color', () => {
      const state = createTestGameState({ nextRequiredType: 'red' });
      const yellowBall = createTestBall({ id: 'yellow', type: 'color', color: '#FFCC00' });
      
      const newState = RulesEngine.processShotResult(state, [], false, yellowBall);
      
      expect(newState.foulCommitted).toBe(true);
      expect(newState.scores.player2).toBe(2); // Yellow = 2 points
    });

    it('should return cue ball to table and enter positioning phase after cue ball pocket', () => {
      const state = createTestGameState();
      const newState = RulesEngine.processShotResult(state, [], true, undefined);
      
      expect(newState.foulCommitted).toBe(true);
      expect(newState.gamePhase).toBe('positioning');
      
      // Check that cue ball was restored
      const cueBall = newState.balls.find(b => b.id === 'cue');
      expect(cueBall).toBeDefined();
      expect(cueBall?.isPocketed).toBe(false);
    });

    it('should restore colors to their correct spots after foul', () => {
      const state = createTestGameState({ nextRequiredType: 'red' });
      const yellowBall = createTestBall({ id: 'yellow', type: 'color', color: '#FFCC00', isPocketed: true });
      
      // Yellow is potted but it's a foul (should have been red)
      const newState = RulesEngine.processShotResult(state, [yellowBall], false, yellowBall);
      
      expect(newState.foulCommitted).toBe(true);
      
      // Check that yellow was restored and is not pocketed
      const restoredYellow = newState.balls.find(b => b.id === 'yellow');
      expect(restoredYellow).toBeDefined();
      expect(restoredYellow?.isPocketed).toBe(false);
      
      // Yellow should be at its spot position (baulk line, upper D position)
      expect(restoredYellow?.x).toBeCloseTo(163.38, 1); // Baulk line x
      expect(restoredYellow?.y).toBeCloseTo(264.79, 1); // D upper position
      // Check that velocity is reset
      expect(restoredYellow?.vx).toBe(0);
      expect(restoredYellow?.vy).toBe(0);
    });

    it('should decrement redsRemaining when reds are potted', () => {
      const state = createTestGameState({ nextRequiredType: 'red', redsRemaining: 15 });
      const redBall = createTestBall({ id: 'red-1', type: 'red', isPocketed: true });
      
      const newState = RulesEngine.processShotResult(state, [redBall], false, redBall);
      
      expect(newState.redsRemaining).toBe(14);
      expect(newState.nextRequiredType).toBe('any-color');
    });

    it('should decrement redsRemaining for multiple reds potted', () => {
      const state = createTestGameState({ nextRequiredType: 'red', redsRemaining: 15 });
      const red1 = createTestBall({ id: 'red-1', type: 'red', isPocketed: true });
      const red2 = createTestBall({ id: 'red-2', type: 'red', isPocketed: true });
      
      const newState = RulesEngine.processShotResult(state, [red1, red2], false, red1);
      
      expect(newState.redsRemaining).toBe(13);
      expect(newState.nextRequiredType).toBe('any-color');
    });

    it('should preserve redsRemaining when non-red balls are potted', () => {
      const state = createTestGameState({ nextRequiredType: 'any-color', redsRemaining: 5 });
      const yellowBall = createTestBall({ id: 'yellow', type: 'color', color: '#FFCC00', isPocketed: true });
      
      const newState = RulesEngine.processShotResult(state, [yellowBall], false, yellowBall);
      
      expect(newState.redsRemaining).toBe(5);
      expect(newState.nextRequiredType).toBe('red');
    });

    it('should award points for potted balls to current player', () => {
      const state = createTestGameState({ nextRequiredType: 'red', currentPlayer: 1 });
      const redBall = createTestBall({ id: 'red-1', type: 'red', pointValue: 1, isPocketed: true });
      
      const newState = RulesEngine.processShotResult(state, [redBall], false, redBall);
      
      expect(newState.scores.player1).toBe(1);
      expect(newState.currentBreak).toBe(1);
    });

    it('should award points for multiple potted balls', () => {
      const state = createTestGameState({ nextRequiredType: 'red', currentPlayer: 1 });
      const red1 = createTestBall({ id: 'red-1', type: 'red', pointValue: 1, isPocketed: true });
      const red2 = createTestBall({ id: 'red-2', type: 'red', pointValue: 1, isPocketed: true });
      
      const newState = RulesEngine.processShotResult(state, [red1, red2], false, red1);
      
      expect(newState.scores.player1).toBe(2);
      expect(newState.currentBreak).toBe(2);
    });

    it('should award color points when color is potted', () => {
      const state = createTestGameState({ nextRequiredType: 'any-color', currentPlayer: 1 });
      const yellowBall = createTestBall({ id: 'yellow', type: 'color', color: '#FFCC00', pointValue: 2, isPocketed: true });
      
      const newState = RulesEngine.processShotResult(state, [yellowBall], false, yellowBall);
      
      expect(newState.scores.player1).toBe(2);
      expect(newState.currentBreak).toBe(2);
    });

    it('should award points for color potted after red', () => {
      const state = createTestGameState({ nextRequiredType: 'any-color', currentPlayer: 1, redsRemaining: 5 });
      const blackBall = createTestBall({ id: 'black', type: 'color', color: '#000000', pointValue: 7, isPocketed: true });
      
      const newState = RulesEngine.processShotResult(state, [blackBall], false, blackBall);
      
      expect(newState.scores.player1).toBe(7);
      expect(newState.currentBreak).toBe(7);
      expect(newState.nextRequiredType).toBe('red');
    });

    it('should reset nextRequiredType to red when turn switches after miss', () => {
      const state = createTestGameState({ nextRequiredType: 'any-color', currentPlayer: 1, redsRemaining: 10 });
      const redBall = createTestBall({ id: 'red-1', type: 'red' });
      
      // Player 1 misses (no balls potted, no foul)
      const newState = RulesEngine.processShotResult(state, [], false, redBall);
      
      expect(newState.currentPlayer).toBe(2);
      expect(newState.nextRequiredType).toBe('red');
    });

    it('should reset nextRequiredType to red when turn switches after foul', () => {
      const state = createTestGameState({ nextRequiredType: 'any-color', currentPlayer: 1, redsRemaining: 10 });
      const redBall = createTestBall({ id: 'red-1', type: 'red' });
      
      // Player 1 commits foul by hitting red when must hit color
      const newState = RulesEngine.processShotResult(state, [], false, redBall);
      
      expect(newState.currentPlayer).toBe(2);
      expect(newState.nextRequiredType).toBe('red');
      expect(newState.foulCommitted).toBe(true);
    });

    it('should maintain nextRequiredType when player continues their turn', () => {
      const state = createTestGameState({ nextRequiredType: 'any-color', currentPlayer: 1, redsRemaining: 10 });
      const blackBall = createTestBall({ id: 'black', type: 'color', color: '#000000', pointValue: 7, isPocketed: true });
      
      // Player 1 pots a color (valid shot)
      const newState = RulesEngine.processShotResult(state, [blackBall], false, blackBall);
      
      expect(newState.currentPlayer).toBe(1); // Player continues
      expect(newState.nextRequiredType).toBe('red'); // Back to red
      expect(newState.foulCommitted).toBe(false);
    });

    it('should restore color to its spot when potted during red phase', () => {
      const state = createTestGameState({ nextRequiredType: 'any-color', currentPlayer: 1, redsRemaining: 10 });
      const blackBall = createTestBall({ id: 'black', type: 'color', color: '#000000', pointValue: 7, isPocketed: true });
      
      // Player 1 pots black (valid shot during color phase)
      const newState = RulesEngine.processShotResult(state, [blackBall], false, blackBall);
      
      // Find the black ball in the new state
      const restoredBlack = newState.balls.find(b => b.id === 'black');
      
      expect(restoredBlack).toBeDefined();
      expect(restoredBlack?.isPocketed).toBe(false);
      // Black should be at its spot position
      expect(restoredBlack?.x).toBeCloseTo(728.17, 1); // Black spot X
      expect(restoredBlack?.y).toBeCloseTo(200, 1); // Black spot Y
      expect(restoredBlack?.vx).toBe(0);
      expect(restoredBlack?.vy).toBe(0);
    });

    it('should restore all potted colors to their spots during red phase', () => {
      const state = createTestGameState({ nextRequiredType: 'any-color', currentPlayer: 1, redsRemaining: 10 });
      const yellowBall = createTestBall({ id: 'yellow', type: 'color', color: '#FFCC00', pointValue: 2, isPocketed: true });
      
      // Player 1 pots yellow (valid shot during color phase)
      const newState = RulesEngine.processShotResult(state, [yellowBall], false, yellowBall);
      
      // Find the yellow ball in the new state
      const restoredYellow = newState.balls.find(b => b.id === 'yellow');
      
      expect(restoredYellow).toBeDefined();
      expect(restoredYellow?.isPocketed).toBe(false);
      // Yellow should be at its spot position (lower D position)
      expect(restoredYellow?.x).toBeCloseTo(163.38, 1);
      expect(restoredYellow?.y).toBeCloseTo(264.79, 1);
    });

    it('should NOT restore color when no reds remain (end game phase)', () => {
      const state = createTestGameState({ nextRequiredType: 'black', currentPlayer: 1, redsRemaining: 0 });
      // First modify the state to have black ball pocketed already (from previous potting)
      const stateWithBallPotted = {
        ...state,
        balls: state.balls.map(b => b.id === 'black' ? { ...b, isPocketed: true } : b),
      };
      
      const blackBall = createTestBall({ id: 'black', type: 'color', color: '#000000', pointValue: 7, isPocketed: false });
      
      // Player 1 pots black in color sequence (no reds left) - using stateWithBallPotted as input
      const newState = RulesEngine.processShotResult(stateWithBallPotted, [blackBall], false, blackBall);
      
      // Find the black ball in the new state
      const pottedBlack = newState.balls.find(b => b.id === 'black');
      
      // Black should remain pocketed (not restored)
      expect(pottedBlack?.isPocketed).toBe(true);
    });
  });
});
