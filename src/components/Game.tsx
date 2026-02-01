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
  const aiShotFiredRef = useRef<boolean>(false);
  const aiShotExecutedRef = useRef<boolean>(false);
  const ballsPottedThisShotRef = useRef<number>(0);
  const shotResultProcessedRef = useRef<boolean>(false);

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
     console.log('AI Shot Trigger Check:', {
       gamePhase: gameState.gamePhase,
       currentPlayer: gameState.currentPlayer,
       isShotInProgress,
       isAIThinking,
       aiShot: aiShot ? 'queued' : 'none',
       aiShotFired: aiShotFiredRef.current,
     });

     if (
       gameState.gamePhase === 'playing' &&
       gameState.currentPlayer === 2 &&
       !isShotInProgress &&
       !isAIThinking &&
       !aiShot &&
       !aiShotFiredRef.current  // Only trigger if we haven't already fired a shot this turn
     ) {
       setIsAIThinking(true);
       console.log('✓ AI TRIGGER CONDITIONS MET - thinking, will calculate shot in 1s');
     }
   }, [gameState.gamePhase, gameState.currentPlayer, isShotInProgress, isAIThinking, aiShot]);

   // Calculate AI shot after thinking delay
   useEffect(() => {
     if (isAIThinking && gameState.currentPlayer === 2 && !aiShot) {
       const timeoutId = setTimeout(() => {
         console.log('Calculating AI shot with current gameState balls:', gameState.balls.length);
         const shot = AIEngine.calculateShot(gameState);
         if (shot) {
           console.log('✓ AI shot calculated:', shot);
           aiShotFiredRef.current = true;
           setAiShot(shot);
         } else {
           console.log('✗ AI shot calculation returned null');
         }
         setIsAIThinking(false);
       }, 1000);
       
       return () => clearTimeout(timeoutId);
     }
   }, [isAIThinking, gameState, aiShot]);

  const handleShoot = useCallback((power: number, angle: number) => {
    console.log('handleShoot called:', { power, angle, isShotInProgress, gamePhase: gameState.gamePhase, currentPlayer: gameState.currentPlayer });
    
    if (isShotInProgress || (gameState.gamePhase !== 'playing')) {
      console.log('handleShoot IGNORED - isShotInProgress or not playing');
      return;
    }

    // Mark if this is an AI shot
    const isAiShooting = gameState.currentPlayer === 2;
    if (isAiShooting) {
      console.log('✓ AI executing shot via handleShoot - marking aiShotExecutedRef = true');
      aiShotExecutedRef.current = true;
    } else {
      console.log('✓ Player executing shot via handleShoot');
    }

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
      console.log('Clearing aiShot after physics starts');
      setAiShot(null);
    }, 100);
  }, [isShotInProgress, gameState.gamePhase, gameState.currentPlayer]);

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
           // Track how many balls were potted this shot for turn logic
           ballsPottedThisShotRef.current = pocketedBalls.length;
           shotResultProcessedRef.current = false;  // Mark that we need to process the result

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

    // Handle turn switching after shot completes
    useEffect(() => {
     // Process shot result only once when shot ends
     if (shotJustEnded && !shotResultProcessedRef.current) {
       shotResultProcessedRef.current = true;
       
       let newState = gameState;
       
       // Process the shot with RulesEngine to get correct game state
       if (ballsPottedThisShotRef.current === 0 && !gameState.foulCommitted) {
         // No balls potted and no foul - normal miss
         newState = RulesEngine.processShotResult(newState, [], false);
       }
       
       // Now handle turn switching based on what happened
       if (ballsPottedThisShotRef.current === 0 && !gameState.foulCommitted) {
         // No balls potted and no foul - switch turns
         console.log(`Shot completed - no balls potted. Switching from Player ${gameState.currentPlayer} to Player ${gameState.currentPlayer === 1 ? 2 : 1}`);
       } else if (ballsPottedThisShotRef.current > 0 || gameState.foulCommitted) {
         // Balls were potted or foul committed - same player keeps turn
         console.log(`Shot completed - ${ballsPottedThisShotRef.current > 0 ? 'balls potted' : 'foul committed'}. Player ${gameState.currentPlayer} keeps their turn`);
       }
       
       setGameState(newState);
       
       // Reset refs for next shot
       aiShotFiredRef.current = false;
       aiShotExecutedRef.current = false;
       ballsPottedThisShotRef.current = 0;
       setShotJustEnded(false);
     }
    }, [shotJustEnded, gameState, gameState.foulCommitted]);

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