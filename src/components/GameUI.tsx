import React from 'react';
import { GameState } from '../game/ScoreSystem';

interface GameUIProps {
  gameState: GameState;
  onStartGame: () => void;
  onResetGame: () => void;
  isAiTurn?: boolean;
}

export const GameUI: React.FC<GameUIProps> = ({ gameState, onStartGame, onResetGame, isAiTurn = false }) => {
  const scores = gameState.scores;
  const currentPlayer = gameState.currentPlayer;
  const currentBreak = gameState.currentBreak;
  const isGameEnded = gameState.gamePhase === 'ended';
  const isPositioning = gameState.gamePhase === 'positioning';

  return (
    <div style={{
      width: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '8px 16px',
      fontFamily: 'Arial, sans-serif',
      zIndex: 1000,
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      {/* Row 1: Game Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
        fontSize: '12px',
      }}>
        {/* Left side: Scores and Break */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div>
            <span style={{ color: currentPlayer === 1 && !isAiTurn ? '#4CAF50' : '#aaa' }}>
              P1: <strong>{scores.player1}</strong>
            </span>
          </div>
          <div>
            <span style={{ color: currentPlayer === 2 || isAiTurn ? '#FFC107' : '#aaa' }}>
              P2: <strong>{scores.player2}</strong>
            </span>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.2)', paddingLeft: '16px' }}>
            Break: <strong>{currentBreak}</strong>
          </div>
        </div>

        {/* Right side: Turn Status and Game Info */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            {isPositioning ? (
              <span style={{ color: '#FFC107' }}>Positioning...</span>
            ) : isAiTurn ? (
              <span style={{ color: '#FFC107', fontWeight: 'bold' }}>⏳ AI Turn</span>
            ) : (
              <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>▶ Player Turn</span>
            )}
          </div>
          <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.2)', paddingLeft: '16px' }}>
            Reds: <strong>{gameState.redsRemaining}</strong>
          </div>
        </div>
      </div>

      {/* Row 2: Controls and Instructions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
      }}>
        {/* Left side: Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {gameState.gamePhase === 'waiting' && (
            <button
              onClick={onStartGame}
              style={{
                padding: '6px 12px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '11px',
              }}
            >
              START
            </button>
          )}

          <button
            onClick={onResetGame}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '11px',
            }}
          >
            RESET
          </button>
        </div>

        {/* Right side: Compact Instructions */}
        <div style={{ color: '#999' }}>
          {isGameEnded ? (
            <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
              Game Over! {scores.player1 > scores.player2 ? 'P1 wins' : scores.player2 > scores.player1 ? 'P2 wins' : 'Draw'}
            </span>
          ) : (
            <span>
              {isPositioning
                ? 'Drag cue ball to position'
                : 'Click & drag to aim and power'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};