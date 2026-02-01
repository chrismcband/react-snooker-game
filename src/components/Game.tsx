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

  // Physics update loop
  const updatePhysics = useCallback(() => {
    if (!isShotInProgress) return;

    setBalls(prevBalls => {
      const newBalls = [...prevBalls];
      let anyBallsMoving = false;

      // Update each ball
      for (let i = 0; i < newBalls.length; i++) {
        const ball = newBalls[i];
        if (ball.isPocketed) continue;

        // Apply friction
        CollisionSystem.applyFriction(ball, PHYSICS_CONSTANTS.friction);

        // Update position
        CollisionSystem.updateBallPosition(ball);

        // Check cushion collisions
        CollisionSystem.resolveCushionCollision(ball, PHYSICS_CONSTANTS.restitution);

        // Check if ball is still moving
        if (CollisionSystem.isBallMoving(ball)) {
          anyBallsMoving = true;
        }
      }

      // Check ball-to-ball collisions
      for (let i = 0; i < newBalls.length; i++) {
        for (let j = i + 1; j < newBalls.length; j++) {
          const ball1 = newBalls[i];
          const ball2 = newBalls[j];

          if (!ball1.isPocketed && !ball2.isPocketed) {
            if (CollisionSystem.checkBallCollision(ball1, ball2)) {
              CollisionSystem.resolveBallCollision(ball1, ball2);
            }
          }
        }
      }

      // Check for pocketed balls
      const pocketedBalls: BallType[] = [];
      const updatedBalls = newBalls.map(ball => {
        if (!ball.isPocketed && PocketSystem.shouldRemoveBall(ball)) {
          pocketedBalls.push(ball);
          return { ...ball, isPocketed: true };
        }
        return ball;
      });

      // Update game state with potted balls
      if (pocketedBalls.length > 0) {
        gameStateManager.handleShot(pocketedBalls, false);
      }

      // Stop animation when all balls have stopped
      if (!anyBallsMoving) {
        setIsShotInProgress(false);

        // If no balls were potted and no foul, switch turns
        if (pocketedBalls.length === 0 && !gameStateManager.getState().foulCommitted) {
          gameStateManager.handleShot([], false);
        }

        // Update balls from game state
        setBalls(gameStateManager.getState().balls);
      }

      return updatedBalls;
    });

    if (isShotInProgress) {
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    }
  }, [isShotInProgress, gameStateManager]);

  useEffect(() => {
    if (isShotInProgress) {
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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