import { RulesEngine } from './RulesEngine';
import { GameState } from './ScoreSystem';
import { Ball } from '../types/Ball';
import { createInitialBalls } from '../utils/gameSetup';

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
        const yellowBall: Ball = {
          id: 'yellow',
          x: 300,
          y: 200,
          vx: 0,
          vy: 0,
          type: 'color',
          isPocketed: false,
          radius: 8.25,
        };
        
        const result = RulesEngine.validateShot(state, [], false, yellowBall);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('wrong ball');
        expect(result.foulPoints).toBe(2); // yellow = 2 points
      });

      it('should return foul when hitting red instead of specific color', () => {
        const state = createTestGameState({ nextRequiredType: 'yellow' });
        const redBall: Ball = {
          id: 'red-1',
          x: 300,
          y: 200,
          vx: 0,
          vy: 0,
          type: 'red',
          isPocketed: false,
          radius: 8.25,
        };
        
        const result = RulesEngine.validateShot(state, [], false, redBall);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Must hit yellow');
        expect(result.foulPoints).toBe(4); // red = 4 points (though it's minimum)
      });

      it('should return foul when must hit color but hits red', () => {
        const state = createTestGameState({ nextRequiredType: 'any-color' });
        const redBall: Ball = {
          id: 'red-1',
          x: 300,
          y: 200,
          vx: 0,
          vy: 0,
          type: 'red',
          isPocketed: false,
          radius: 8.25,
        };
        
        const result = RulesEngine.validateShot(state, [], false, redBall);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Must hit a color');
        expect(result.foulPoints).toBe(4);
      });
    });

    describe('Valid shots', () => {
      it('should allow hitting red when on red phase', () => {
        const state = createTestGameState({ nextRequiredType: 'red' });
        const redBall: Ball = {
          id: 'red-1',
          x: 300,
          y: 200,
          vx: 0,
          vy: 0,
          type: 'red',
          isPocketed: false,
          radius: 8.25,
        };
        
        const result = RulesEngine.validateShot(state, [], false, redBall);
        
        expect(result.valid).toBe(true);
      });

      it('should allow hitting any color when on color phase', () => {
        const state = createTestGameState({ nextRequiredType: 'any-color' });
        const yellowBall: Ball = {
          id: 'yellow',
          x: 300,
          y: 200,
          vx: 0,
          vy: 0,
          type: 'color',
          isPocketed: false,
          radius: 8.25,
        };
        
        const result = RulesEngine.validateShot(state, [], false, yellowBall);
        
        expect(result.valid).toBe(true);
      });

      it('should allow hitting specific color in sequence', () => {
        const state = createTestGameState({ nextRequiredType: 'green' });
        const greenBall: Ball = {
          id: 'green',
          x: 300,
          y: 200,
          vx: 0,
          vy: 0,
          type: 'color',
          isPocketed: false,
          radius: 8.25,
        };
        
        const result = RulesEngine.validateShot(state, [], false, greenBall);
        
        expect(result.valid).toBe(true);
      });
    });

    describe('Potting balls', () => {
      it('should allow potting red when on red phase', () => {
        const state = createTestGameState({ nextRequiredType: 'red' });
        const redBall: Ball = {
          id: 'red-1',
          x: 300,
          y: 200,
          vx: 0,
          vy: 0,
          type: 'red',
          isPocketed: true,
          radius: 8.25,
        };
        
        const result = RulesEngine.validateShot(state, [redBall], false, redBall);
        
        expect(result.valid).toBe(true);
      });

      it('should return foul when potting wrong ball', () => {
        const state = createTestGameState({ nextRequiredType: 'red' });
        const yellowBall: Ball = {
          id: 'yellow',
          x: 300,
          y: 200,
          vx: 0,
          vy: 0,
          type: 'color',
          isPocketed: true,
          radius: 8.25,
        };
        
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
      const yellowBall: Ball = {
        id: 'yellow',
        x: 300,
        y: 200,
        vx: 0,
        vy: 0,
        type: 'color',
        isPocketed: false,
        radius: 8.25,
      };
      
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
  });
});
