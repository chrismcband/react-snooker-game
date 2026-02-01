import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import { Table } from './Table';
import { Ball } from './Ball';
import { CueController } from './CueController';
import { GameUI } from './GameUI';
import { createInitialBalls } from '../utils/gameSetup';
import { CollisionSystem } from '../physics/CollisionSystem';
import { PocketSystem } from '../game/PocketSystem';
import { GameState as GameStateType, ScoreSystem } from '../game/ScoreSystem';
import { RulesEngine } from '../game/RulesEngine';
import { Ball as BallType } from '../types/Ball';
import { TABLE_DIMENSIONS, PHYSICS_CONSTANTS, TABLE_MARKINGS } from '../utils/constants';

import { AIEngine } from '../ai/AIEngine';

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameStateType>(() => {
    const initialBalls = createInitialBalls();
    const redsRemaining = initialBalls.filter(ball => ball.type === 'red').length;
    return {
      currentPlayer: 1,
      scores: { player1: 0, player2: 0 },
      balls: initialBalls,
      currentBreak: 0,
      foulCommitted: false,
      gamePhase: 'waiting',
      lastPottedBall: null,
      redsRemaining,
      colorsOnTable: initialBalls.filter(ball => ball.type === 'color'),
      nextRequiredType: 'red',
    };
  });
  
  const [isShotInProgress, setIsShotInProgress] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiShot, setAiShot] = useState<{ angle: number; power: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const balls = gameState.balls;

  // AI Turn Handling
  useEffect(() => {
    const phase = gameState.gamePhase;
    const currentPlayer = gameState.currentPlayer;

    if (phase === 'positioning' && currentPlayer === 2) {
      // AI positions ball instantly
      const x = TABLE_MARKINGS.baulkLineX - 10;
      const y = TABLE_DIMENSIONS.height / 2;
      
      setGameState(prev => {
        const newBalls = prev.balls.map(b => b.id === 'cue' ? { ...b, x, y } : b);
        return { ...prev, balls: newBalls, gamePhase: 'playing' };
      });
      return;
    }

    if (phase === 'playing' && !isShotInProgress && currentPlayer === 2 && !isAIThinking && !aiShot) {
      setIsAIThinking(true);
      
      // Delay AI shot for realism
      setTimeout(() => {
        const shot = AIEngine.calculateShot(gameState);
        if (shot) {
          setAiShot(shot);
        }
        setIsAIThinking(false);
      }, 1000);
    }
  }, [isShotInProgress, gameState, isAIThinking, aiShot]);

  const handleShoot = useCallback((power: number, angle: number) => {
    if (isShotInProgress || (gameState.gamePhase !== 'playing')) return;

    setGameState(prev => {
      const newBalls = [...prev.balls];
      const cueBall = newBalls.find(b => b.id === 'cue');

      if (cueBall) {
        cueBall.vx = Math.cos(angle) * power;
        cueBall.vy = Math.sin(angle) * power;
      }

      return { ...prev, balls: newBalls };
    });

    setIsShotInProgress(true);
    setAiShot(null); 
  }, [isShotInProgress, gameState.gamePhase]);

  const handleBallPositionUpdate = useCallback((id: string, x: number, y: number) => {
    if (isShotInProgress) return; 
    
    setGameState(prev => {
      // Constraint for cue ball positioning in D
      if (id === 'cue' && prev.gamePhase === 'positioning') {
        const centerX = TABLE_MARKINGS.baulkLineX;
        const centerY = TABLE_DIMENSIONS.height / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        let clampedX = x;
        let clampedY = y;
        
        if (dist > TABLE_MARKINGS.dRadius) {
          const angle = Math.atan2(dy, dx);
          clampedX = centerX + Math.cos(angle) * TABLE_MARKINGS.dRadius;
          clampedY = centerY + Math.sin(angle) * TABLE_MARKINGS.dRadius;
        }
        
        if (clampedX > TABLE_MARKINGS.baulkLineX) {
          clampedX = TABLE_MARKINGS.baulkLineX;
        }
        
        const newBalls = prev.balls.map(ball => ball.id === id ? { ...ball, x: clampedX, y: clampedY } : ball);
        return { ...prev, balls: newBalls };
      }

      const newBalls = prev.balls.map(ball => ball.id === id ? { ...ball, x, y } : ball);
      return { ...prev, balls: newBalls };
    });
  }, [isShotInProgress]);

  const onCueBallDragEnd = useCallback(() => {
    setGameState(prev => {
      if (prev.gamePhase === 'positioning') {
        return { ...prev, gamePhase: 'playing' };
      }
      return prev;
    });
  }, []);

  // Physics update loop
  const updatePhysics = useCallback(() => {
    if (!isShotInProgress) return;

    setGameState(prev => {
      const newBalls = prev.balls.map(b => ({ ...b }));
      let anyBallsMoving = false;

      // Update each ball
      for (let i = 0; i < newBalls.length; i++) {
        const ball = newBalls[i];
        if (ball.isPocketed) continue;

        CollisionSystem.applyFriction(ball, PHYSICS_CONSTANTS.friction);
        CollisionSystem.updateBallPosition(ball);
        CollisionSystem.resolveCushionCollision(ball, PHYSICS_CONSTANTS.restitution);

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
      let cueBallPocketed = false;
      newBalls.forEach(ball => {
        if (!ball.isPocketed && PocketSystem.shouldRemoveBall(ball)) {
          ball.isPocketed = true;
          if (ball.id === 'cue') {
            cueBallPocketed = true;
          } else {
            pocketedBalls.push(ball);
          }
        }
      });

      let nextState = { ...prev, balls: newBalls };

      if (pocketedBalls.length > 0 || cueBallPocketed) {
        pocketedBalls.forEach(ball => {
          nextState = ScoreSystem.handleBallPotted(nextState, ball);
        });
        nextState = RulesEngine.processShotResult(nextState, pocketedBalls, cueBallPocketed);
      }

      // Stop animation when all balls have stopped
      if (!anyBallsMoving) {
        setIsShotInProgress(false);

        // If no balls were potted and no foul, switch turns
        if (pocketedBalls.length === 0 && !cueBallPocketed && !nextState.foulCommitted) {
          nextState = RulesEngine.processShotResult(nextState, [], false);
        }
      }

      return nextState;
    });

    if (isShotInProgress) {
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    }
  }, [isShotInProgress]);

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
  }, [isShotInProgress, updatePhysics]);

  const handleStartGame = () => {
    setGameState(prev => ({ ...prev, gamePhase: 'positioning' }));
  };

  const handleResetGame = () => {
    const initialBalls = createInitialBalls();
    const redsRemaining = initialBalls.filter(ball => ball.type === 'red').length;
    
    setIsShotInProgress(false);
    setIsAIThinking(false);
    setAiShot(null);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setGameState({
      currentPlayer: 1,
      scores: { player1: 0, player2: 0 },
      balls: initialBalls,
      currentBreak: 0,
      foulCommitted: false,
      gamePhase: 'waiting',
      lastPottedBall: null,
      redsRemaining,
      colorsOnTable: initialBalls.filter(ball => ball.type === 'color'),
      nextRequiredType: 'red',
    });
  };

  const cueBall = balls.find(b => b.id === 'cue');

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#1a1a1a' }}>
      <GameUI
        gameState={gameState}
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
                  draggable={ball.id === 'cue' && gameState.gamePhase === 'positioning'}
                  onDragEnd={ball.id === 'cue' ? onCueBallDragEnd : undefined}
                />
              ))}
              {cueBall && !cueBall.isPocketed && gameState.gamePhase === 'playing' && (
                <CueController
                  cueBallX={cueBall.x}
                  cueBallY={cueBall.y}
                  onShoot={handleShoot}
                  disabled={isShotInProgress}
                  isAiTurn={gameState.currentPlayer === 2}
                  aiShot={aiShot}
                />
              )}
            </Table>
          </Layer>
        </Stage>
      </div>
    </div>
  );
};