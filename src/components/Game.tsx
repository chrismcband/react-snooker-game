import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import { Table } from './Table';
import { Ball } from './Ball';
import { CueController } from './CueController';
import { GameUI } from './GameUI';
import { getBallById, updateBallPosition } from '../utils/gameSetup';
import { CollisionSystem } from '../physics/CollisionSystem';
import { PocketSystem } from '../game/PocketSystem';
import { GameStateManager } from '../game/GameState';
import { Ball as BallType } from '../types/Ball';
import { TABLE_DIMENSIONS, PHYSICS_CONSTANTS } from '../utils/constants';

import { AIEngine } from '../ai/AIEngine';

export const Game: React.FC = () => {
  const [gameStateManager] = useState(() => new GameStateManager());
  const [balls, setBalls] = useState<BallType[]>([]);
  const [isShotInProgress, setIsShotInProgress] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize balls from game state
    setBalls(gameStateManager.getState().balls);
  }, [gameStateManager]);

  const handleShoot = useCallback((power: number, angle: number) => {
    if (isShotInProgress || !gameStateManager.isGameActive()) return;

    setBalls(prevBalls => {
      const newBalls = [...prevBalls];
      const cueBall = getBallById(newBalls, 'cue');

      if (cueBall) {
        cueBall.vx = Math.cos(angle) * power;
        cueBall.vy = Math.sin(angle) * power;
      }

      return newBalls;
    });

    setIsShotInProgress(true);
  }, [isShotInProgress, gameStateManager]);

  const handleBallPositionUpdate = useCallback((id: string, x: number, y: number) => {
    if (isShotInProgress) return; // Don't allow manual positioning during shot
    setBalls(prevBalls => updateBallPosition(prevBalls, id, x, y));
  }, [isShotInProgress]);

  // AI Turn Handling
  useEffect(() => {
    if (gameStateManager.isGameActive() && !isShotInProgress && gameStateManager.getCurrentPlayer() === 2 && !isAIThinking) {
      setIsAIThinking(true);
      
      // Delay AI shot for realism
      setTimeout(() => {
        const shot = AIEngine.calculateShot(gameStateManager.getState());
        if (shot) {
          handleShoot(shot.power, shot.angle);
        }
        setIsAIThinking(false);
      }, 1500);
    }
  }, [isShotInProgress, gameStateManager, isAIThinking, handleShoot]);

  const handleStartGame = () => {
    gameStateManager.startGame();
    setBalls(gameStateManager.getState().balls);
  };

  const handleResetGame = () => {
    gameStateManager.resetGame();
    setBalls(gameStateManager.getState().balls);
    setIsShotInProgress(false);
  };

  const cueBall = getBallById(balls, 'cue');

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#1a1a1a' }}>
      <GameUI
        gameState={gameStateManager}
        onStartGame={handleStartGame}
        onResetGame={handleResetGame}
      />

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Stage
          width={TABLE_DIMENSIONS.width + TABLE_DIMENSIONS.frameWidth * 2}
          height={TABLE_DIMENSIONS.height + TABLE_DIMENSIONS.frameWidth * 2}
        >
          <Layer x={TABLE_DIMENSIONS.frameWidth} y={TABLE_DIMENSIONS.frameWidth}>
            <Table>
              {balls.map(ball => (
                <Ball
                  key={ball.id}
                  ball={ball}
                  onPositionUpdate={handleBallPositionUpdate}
                />
              ))}
              {cueBall && !cueBall.isPocketed && gameStateManager.isGameActive() && (
                <CueController
                  cueBallX={cueBall.x}
                  cueBallY={cueBall.y}
                  onShoot={handleShoot}
                  disabled={isShotInProgress}
                />
              )}
            </Table>
          </Layer>
        </Stage>
      </div>
    </div>
  );
};