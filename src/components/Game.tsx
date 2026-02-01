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
  const [shotJustEnded, setShotJustEnded] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiShot, setAiShot] = useState<{ angle: number; power: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stageRef = useRef<any>(null);

  const balls = gameState.balls;

  // Debug logging
  useEffect(() => {
    console.log('Game State Updated:', {
      currentPlayer: gameState.currentPlayer,
      gamePhase: gameState.gamePhase,
      isShotInProgress,
      isAIThinking,
      aiShot: aiShot ? 'queued' : 'none',
    });
  }, [gameState.currentPlayer, gameState.gamePhase, isShotInProgress, isAIThinking, aiShot]);

   // AI Positioning (when AI player needs to position cue ball)
   useEffect(() => {
     if (gameState.gamePhase === 'positioning' && gameState.currentPlayer === 2) {
       // AI positions ball instantly
       const x = TABLE_MARKINGS.baulkLineX - 10;
       const y = TABLE_DIMENSIONS.height / 2;
       
       setGameState(prev => {
         const newBalls = prev.balls.map(b => b.id === 'cue' ? { ...b, x, y, isPocketed: false } : b);
         return { ...prev, balls: newBalls, gamePhase: 'playing' };
       });
     }
   }, [gameState.gamePhase, gameState.currentPlayer]);

   // AI Shot Triggering (when AI player needs to take a shot)
   useEffect(() => {
     if (
       gameState.gamePhase === 'playing' &&
       gameState.currentPlayer === 2 &&
       !isShotInProgress &&
       !isAIThinking &&
       !aiShot
     ) {
       setIsAIThinking(true);
       console.log('AI thinking, will calculate shot in 1s');
       
       // Delay AI shot for realism
       const timeoutId = setTimeout(() => {
         console.log('Calculating AI shot');
         const shot = AIEngine.calculateShot(gameState);
         if (shot) {
           console.log('AI shot calculated:', shot);
           setAiShot(shot);
         }
         setIsAIThinking(false);
       }, 1000);
       
       return () => clearTimeout(timeoutId);
     }
   }, [gameState.gamePhase, gameState.currentPlayer, isShotInProgress, isAIThinking, aiShot]);

  const handleShoot = useCallback((power: number, angle: number) => {
    if (isShotInProgress || (gameState.gamePhase !== 'playing')) return;

    setGameState(prev => {
      const newBalls = prev.balls.map(b => ({ ...b }));
      const cueBall = newBalls.find(b => b.id === 'cue');

      if (cueBall) {
        cueBall.vx = Math.cos(angle) * power;
        cueBall.vy = Math.sin(angle) * power;
      }

      return { ...prev, balls: newBalls };
    });

    setIsShotInProgress(true);
    // Clear AI shot only after the physics simulation starts
    // This prevents the animation from being re-triggered
    setTimeout(() => {
      setAiShot(null);
    }, 100);
  }, [isShotInProgress, gameState.gamePhase]);

  const handleBallPositionUpdate = useCallback((id: string, x: number, y: number) => {
    if (isShotInProgress) return; 
    
    setGameState(prev => {
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

  const cueBallDragBoundFunc = useCallback((pos: { x: number; y: number }) => {
    const frame = TABLE_DIMENSIONS.frameWidth;
    const centerX = frame + TABLE_MARKINGS.baulkLineX;
    const centerY = frame + TABLE_DIMENSIONS.height / 2;
    const radius = TABLE_MARKINGS.dRadius;
    
    let x = pos.x;
    let y = pos.y;
    
    // 1. Clamp x to be on the left side of the baulk line
    x = Math.min(x, centerX);
    
    // 2. Clamp to D semi-circle
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > radius) {
      const ratio = radius / dist;
      x = centerX + dx * ratio;
      y = centerY + dy * ratio;
    }
    
    return { x, y };
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

       // Handle pocketed balls during the shot
       if (pocketedBalls.length > 0 || cueBallPocketed) {
         pocketedBalls.forEach(ball => {
           nextState = ScoreSystem.handleBallPotted(nextState, ball);
         });
         nextState = RulesEngine.processShotResult(nextState, pocketedBalls, cueBallPocketed);
       }

       // Stop animation when all balls have stopped
       if (!anyBallsMoving) {
         // If no balls were potted and no foul, switch turns
         if (pocketedBalls.length === 0 && !cueBallPocketed && !nextState.foulCommitted) {
           nextState = RulesEngine.processShotResult(nextState, [], false);
         }

         // Mark that we should end the shot on the next frame
         setShotJustEnded(true);
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

   // Handle shot ending and state finalization
   useEffect(() => {
     if (shotJustEnded) {
       console.log('Physics complete, ending shot. Current player:', gameState.currentPlayer);
       setIsShotInProgress(false);
       setShotJustEnded(false);
     }
   }, [shotJustEnded, gameState.currentPlayer]);

    // Handle AI turn completion and switch back to player
    useEffect(() => {
     // Only trigger this when shot has completed (isShotInProgress becomes false) and it was an AI turn
     if (!isShotInProgress && gameState.currentPlayer === 2 && gameState.gamePhase === 'playing' && !aiShot && !isAIThinking) {
       // AI shot has completed and physics simulation is done
       // Switch turn back to player 1
       console.log('Switching turn from AI (player 2) back to Player 1');
       setGameState(prev => ({
         ...prev,
         currentPlayer: 1,
         gamePhase: 'playing',
       }));
     }
   }, [isShotInProgress, gameState.currentPlayer, gameState.gamePhase, aiShot, isAIThinking]);

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

  const isAiTurn = gameState.currentPlayer === 2 && gameState.gamePhase === 'playing';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>
      <GameUI
        gameState={gameState}
        onStartGame={handleStartGame}
        onResetGame={handleResetGame}
        isAiTurn={isAiTurn}
      />

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        <Stage
          ref={stageRef}
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
                  dragBoundFunc={ball.id === 'cue' && gameState.gamePhase === 'positioning' ? cueBallDragBoundFunc : undefined}
                />
              ))}
              {cueBall && !cueBall.isPocketed && gameState.gamePhase === 'playing' && (
                <CueController
                  cueBallX={cueBall.x}
                  cueBallY={cueBall.y}
                  onShoot={handleShoot}
                  disabled={isShotInProgress}
                  isAiTurn={isAiTurn}
                  aiShot={aiShot}
                  stageRef={stageRef}
                />
              )}
            </Table>
          </Layer>
        </Stage>
      </div>
    </div>
  );
};