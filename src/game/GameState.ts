import { Ball } from '../types/Ball';
import { GameState as GameStateType, ScoreSystem } from './ScoreSystem';
import { RulesEngine } from './RulesEngine';
import { createInitialBalls } from '../utils/gameSetup';

export class GameStateManager {
  private state: GameStateType;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameStateType {
    const balls = createInitialBalls();
    const redsRemaining = balls.filter(ball => ball.type === 'red').length;

    return {
      currentPlayer: 1,
      scores: { player1: 0, player2: 0 },
      balls,
      currentBreak: 0,
      foulCommitted: false,
      gamePhase: 'waiting',
      lastPottedBall: null,
      redsRemaining,
      colorsOnTable: balls.filter(ball => ball.type === 'color'),
      nextRequiredType: 'red',
    };
  }

  public getState(): GameStateType {
    return { ...this.state };
  }

  public startGame(): void {
    this.state.gamePhase = 'playing';
  }

  public updateBallPosition(ballId: string, x: number, y: number): void {
    this.state.balls = this.state.balls.map(ball =>
      ball.id === ballId ? { ...ball, x, y } : ball
    );
  }

  public updateBallVelocity(ballId: string, vx: number, vy: number): void {
    this.state.balls = this.state.balls.map(ball =>
      ball.id === ballId ? { ...ball, vx, vy } : ball
    );
  }

  public handleShot(pottedBalls: Ball[], cueBallPocketed: boolean = false): void {
    // Process potted balls
    pottedBalls.forEach(ball => {
      this.state = ScoreSystem.handleBallPotted(this.state, ball);
    });

    // Apply rules and update game state
    this.state = RulesEngine.processShotResult(this.state, pottedBalls, cueBallPocketed);
  }

  public getCurrentPlayer(): 1 | 2 {
    return this.state.currentPlayer;
  }

  public getScores(): { player1: number; player2: number } {
    return { ...this.state.scores };
  }

  public getCurrentBreak(): number {
    return this.state.currentBreak;
  }

  public isGameActive(): boolean {
    return this.state.gamePhase === 'playing';
  }

  public isGameEnded(): boolean {
    return this.state.gamePhase === 'ended';
  }

  public getWinner(): 1 | 2 | null {
    return ScoreSystem.getWinner(this.state);
  }

  public resetGame(): void {
    this.state = this.createInitialState();
  }

  public getAvailableBalls(): Ball[] {
    return RulesEngine.getAvailableBalls(this.state);
  }

  public isOnReds(): boolean {
    return RulesEngine.isOnReds(this.state);
  }

  public isOnColors(): boolean {
    return RulesEngine.isOnColors(this.state);
  }

  public getRedsRemaining(): number {
    return this.state.redsRemaining;
  }
}