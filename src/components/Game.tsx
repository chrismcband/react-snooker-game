import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import { Table } from './Table';
import { Ball } from './Ball';
import { CueController } from './CueController';
import { GameUI } from './GameUI';
import { FoulNotification } from './FoulNotification';
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
  const [foulNotification, setFoulNotification] = useState<string | null>(null);
   const animationFrameRef = useRef<number | null>(null);
   const stageRef = useRef<any>(null);
   const containerRef = useRef<HTMLDivElement>(null);
   const aiShotFiredRef = useRef<boolean>(false);
  const aiShotExecutedRef = useRef<boolean>(false);
  const ballsPottedThisShotRef = useRef<number>(0);
  const shotResultProcessedRef = useRef<boolean>(false);
  const ballsPottedCounterRef = useRef<number>(0);
  const pocketedBallsRef = useRef<BallType[]>([]);
  const cueBallPocketedRef = useRef<boolean>(false);
  const shotJustEndedRef = useRef<boolean>(false);
   const firstBallHitRef = useRef<BallType | null>(null);
   const lastFrameTimeRef = useRef<number>(0);

     const balls = gameState.balls;
    
     // Calculate stage dimensions with space for cue rendering
     const cueRenderingSpace = 100; // Space around table for cue stick rendering
     // Calculate unscaled Stage dimensions with space for cue rendering
     const unscaledWidth = TABLE_DIMENSIONS.width + TABLE_DIMENSIONS.frameWidth * 2 + cueRenderingSpace * 2;
     const unscaledHeight = TABLE_DIMENSIONS.height + TABLE_DIMENSIONS.frameWidth * 2 + cueRenderingSpace * 2;
    
    // Scale to fit viewport (leaving room for GameUI)
    // Viewport is roughly 1920x1080, GameUI takes ~50px, leaving ~1920x1030
    // We want to fit with some margin
    const maxViewportWidth = typeof window !== 'undefined' ? window.innerWidth * 0.95 : 1920;
    const maxViewportHeight = typeof window !== 'undefined' ? (window.innerHeight - 80) * 0.95 : 950;
    
     const scaleX = maxViewportWidth / unscaledWidth;
     const scaleY = maxViewportHeight / unscaledHeight;
     const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

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
        !aiShotFiredRef.current &&  // Only trigger if we haven't already fired a shot this turn
        !foulNotification  // Don't start AI turn while foul notification is displayed
      ) {
        setIsAIThinking(true);
        console.log('✓ AI TRIGGER CONDITIONS MET - thinking, will calculate shot in 1s');
      }
    }, [gameState.gamePhase, gameState.currentPlayer, isShotInProgress, isAIThinking, aiShot, foulNotification]);

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
    shotJustEndedRef.current = false;  // Reset for new shot
    firstBallHitRef.current = null;  // Reset first ball hit tracker
    
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
     // dragBoundFunc receives position in Stage coordinates
     // We need to convert to Layer coordinates by subtracting the Layer's position
     const layerX = cueRenderingSpace + TABLE_DIMENSIONS.frameWidth;
     const layerY = cueRenderingSpace + TABLE_DIMENSIONS.frameWidth;
     
     // Convert Stage coords to Layer local coords
     const localX = pos.x - layerX;
     const localY = pos.y - layerY;
     
     // The D center is relative to the table surface (0,0) in layer coordinates
     const centerX = TABLE_MARKINGS.baulkLineX;
     const centerY = TABLE_DIMENSIONS.height / 2;
     const radius = TABLE_MARKINGS.dRadius;
     
     console.log('Drag bound check:', {
       pos,
       layerPos: { x: layerX, y: layerY },
       localPos: { x: localX, y: localY },
       centerX,
       centerY,
       radius,
     });
     
     let x = localX;
     let y = localY;
     
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
     
     // Convert back to Stage coordinates to return
     return { x: x + layerX, y: y + layerY };
   }, []);

   // Physics update loop
   const updatePhysics = useCallback(() => {
     if (!isShotInProgress) return;

     setGameState(prev => {
       // Calculate delta time for frame-rate independent physics
       const currentTime = performance.now();
       let deltaTime = 0.016; // Default to ~60fps (16ms)
       
       if (lastFrameTimeRef.current > 0) {
         deltaTime = Math.min((currentTime - lastFrameTimeRef.current) / 1000, 0.05); // Cap at 50ms to prevent huge jumps
       }
       lastFrameTimeRef.current = currentTime;

       const newBalls = prev.balls.map(b => ({ ...b }));
       let anyBallsMoving = false;

       // Update each ball
       for (let i = 0; i < newBalls.length; i++) {
         const ball = newBalls[i];
         if (ball.isPocketed) continue;

         CollisionSystem.applyFriction(ball, PHYSICS_CONSTANTS.friction, deltaTime);
         CollisionSystem.updateBallPosition(ball, deltaTime);
         CollisionSystem.resolveCushionCollision(ball, PHYSICS_CONSTANTS.restitution);

        if (CollisionSystem.isBallMoving(ball)) {
          anyBallsMoving = true;
        }
      }

      // Check ball-to-ball collisions
      // Track the first ball the cue ball hits
      for (let i = 0; i < newBalls.length; i++) {
        for (let j = i + 1; j < newBalls.length; j++) {
          const ball1 = newBalls[i];
          const ball2 = newBalls[j];

          if (!ball1.isPocketed && !ball2.isPocketed) {
            if (CollisionSystem.checkBallCollision(ball1, ball2)) {
              // Track if cue ball hit something for the first time this shot
              if (firstBallHitRef.current === null) {
                if (ball1.id === 'cue' && ball2.id !== 'cue') {
                  firstBallHitRef.current = ball2;
                } else if (ball2.id === 'cue' && ball1.id !== 'cue') {
                  firstBallHitRef.current = ball1;
                }
              }
              
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
              // Accumulate the count of balls potted during this shot
              ballsPottedCounterRef.current += 1;
            }
          }
        });

         let nextState = { ...prev, balls: newBalls };

         // Store pocketed balls for later processing by RulesEngine
         // (do NOT score them here - RulesEngine.processShotResult will handle all scoring)
         if (pocketedBalls.length > 0 || cueBallPocketed) {
           console.log('[Physics] Balls pocketed (will be scored by RulesEngine):', {
             ballIds: pocketedBalls.map(b => b.id),
             cueBallPocketed,
           });
           pocketedBallsRef.current = pocketedBalls;
           cueBallPocketedRef.current = cueBallPocketed;
         }

           // Stop animation when all balls have stopped
           if (!anyBallsMoving && !shotJustEndedRef.current) {
             shotJustEndedRef.current = true;
             
             // Track how many balls were potted this shot for turn logic
             ballsPottedThisShotRef.current = ballsPottedCounterRef.current;
             console.log('Shot ended - balls potted this shot:', ballsPottedThisShotRef.current, 'current player:', prev.currentPlayer);
             ballsPottedCounterRef.current = 0;  // Reset counter for next shot
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
     console.log('Turn switch effect check:', { 
       shotJustEnded, 
       shotResultProcessedRef: shotResultProcessedRef.current,
       ballsPotted: ballsPottedThisShotRef.current,
       foulCommitted: gameState.foulCommitted,
       currentPlayer: gameState.currentPlayer 
     });

     // Process shot result only once when shot ends
     if (shotJustEnded && !shotResultProcessedRef.current) {
       shotResultProcessedRef.current = true;
       
       console.log('Processing shot result:', { ballsPotted: ballsPottedThisShotRef.current, foulCommitted: gameState.foulCommitted });
       
        let newState = gameState;
        let foulReason = '';
        
         // Validate the shot to check for fouls
         const pottedBalls = ballsPottedThisShotRef.current > 0 ? pocketedBallsRef.current : [];
         const validation = RulesEngine.validateShot(newState, pottedBalls, cueBallPocketedRef.current, firstBallHitRef.current);
         
         // Call RulesEngine.processShotResult with the correct balls
         if (ballsPottedThisShotRef.current > 0 || cueBallPocketedRef.current) {
           // Balls were potted - pass them to RulesEngine
           console.log('Calling RulesEngine.processShotResult with potted balls');
           newState = RulesEngine.processShotResult(newState, pocketedBallsRef.current, cueBallPocketedRef.current, firstBallHitRef.current);
         } else {
           // No balls potted - pass empty array
           console.log('Calling RulesEngine.processShotResult for no-balls-potted case');
           newState = RulesEngine.processShotResult(newState, [], false, firstBallHitRef.current);
         }
        
         // If a foul was committed, show the foul notification
         if (!validation.valid && validation.reason) {
           foulReason = validation.reason;
           console.log('FOUL DETECTED:', {
             reason: foulReason,
             nextRequiredType: gameState.nextRequiredType,
             firstBallHit: firstBallHitRef.current?.id,
             currentPlayer: gameState.currentPlayer,
             validationScore: validation.valid,
           });
           setFoulNotification(`Foul! ${foulReason}`);
         }
        
        // Log turn logic BEFORE any changes
        console.log('TURN LOGIC - Before newState update:', {
          ballsPottedThisShotRef: ballsPottedThisShotRef.current,
          gameStateFoulCommitted: gameState.foulCommitted,
          newStateFoulCommitted: newState.foulCommitted,
          newStateCurrentPlayer: newState.currentPlayer,
        });
        
        // Now handle turn switching based on what happened
        if (ballsPottedThisShotRef.current === 0 && !gameState.foulCommitted) {
          // No balls potted and no foul - switch turns
          console.log(`Shot completed - no balls potted. Switching from Player ${gameState.currentPlayer} to Player ${gameState.currentPlayer === 1 ? 2 : 1}`);
        } else if (ballsPottedThisShotRef.current > 0 || gameState.foulCommitted) {
          // Balls were potted or foul committed - same player keeps turn
          console.log(`Shot completed - ${ballsPottedThisShotRef.current > 0 ? ballsPottedThisShotRef.current + ' balls potted' : 'foul committed'}. Player ${gameState.currentPlayer} keeps their turn`);
        }
        
        console.log('State after shot:', {
          currentPlayerOld: gameState.currentPlayer,
          currentPlayerNew: newState.currentPlayer,
          nextRequiredType: newState.nextRequiredType,
          redsRemaining: newState.redsRemaining,
          foulCommitted: newState.foulCommitted,
          ballsPotted: ballsPottedThisShotRef.current,
          scores: newState.scores,
          currentBreak: newState.currentBreak,
        });
        
        setGameState(newState);
        
        // Reset refs for next shot
       aiShotFiredRef.current = false;
       aiShotExecutedRef.current = false;
       ballsPottedThisShotRef.current = 0;
       pocketedBallsRef.current = [];
       cueBallPocketedRef.current = false;
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
      <>
        <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>
          <GameUI
            gameState={gameState}
            onStartGame={handleStartGame}
            onResetGame={handleResetGame}
            isAiTurn={isAiTurn}
          />

           <div ref={containerRef} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
             <div style={{ transform: `scale(${scale})` }}>
               <Stage
                 ref={stageRef}
                 width={unscaledWidth}
                 height={unscaledHeight}
                >
                 <Layer x={cueRenderingSpace + TABLE_DIMENSIONS.frameWidth} y={cueRenderingSpace + TABLE_DIMENSIONS.frameWidth}>
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
                  </Table>
                </Layer>
                 <Layer x={cueRenderingSpace + TABLE_DIMENSIONS.frameWidth} y={cueRenderingSpace + TABLE_DIMENSIONS.frameWidth}>
                   {cueBall && !cueBall.isPocketed && gameState.gamePhase === 'playing' && (
                     <CueController
                       cueBallX={cueBall.x}
                       cueBallY={cueBall.y}
                       onShoot={handleShoot}
                       disabled={isShotInProgress}
                       isAiTurn={isAiTurn}
                       aiShot={aiShot}
                       stageRef={stageRef}
                       scale={scale}
                       cueRenderingSpace={cueRenderingSpace}
                     />
                   )}
                 </Layer>
               </Stage>
              </div>
            </div>
         </div>

      {foulNotification && (
        <FoulNotification
          foulMessage={foulNotification}
          onDismiss={() => setFoulNotification(null)}
          displayDuration={3000}
        />
      )}
      </>
    );
};