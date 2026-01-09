import React from 'react';
import { GameStateManager } from '../game/GameState';

interface GameUIProps {
  gameState: GameStateManager;
  onStartGame: () => void;
  onResetGame: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({ gameState, onStartGame, onResetGame }) => {
  const state = gameState.getState();
  const scores = gameState.getScores();
  const currentPlayer = gameState.getCurrentPlayer();
  const currentBreak = gameState.getCurrentBreak();
  const isGameActive = gameState.isGameActive();
  const isGameEnded = gameState.isGameEnded();
  const winner = gameState.getWinner();

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '20px',
      borderRadius: '10px',
      fontFamily: 'Arial, sans-serif',
      zIndex: 1000,
    }}>
      <h2>Snooker Game</h2>

      {/* Scores */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <strong>Player 1:</strong> {scores.player1} points
          </div>
          <div>
            <strong>Player 2:</strong> {scores.player2} points
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Current Break:</strong> {currentBreak} points
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Current Player:</strong> Player {currentPlayer}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Reds Remaining:</strong> {state.redsRemaining}
        </div>

        <div>
          <strong>Phase:</strong> {gameState.isOnReds() ? 'On Reds' : 'On Colors'}
        </div>
      </div>

      {/* Game Controls */}
      <div>
        {!isGameActive && !isGameEnded && (
          <button
            onClick={onStartGame}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            Start Game
          </button>
        )}

        <button
          onClick={onResetGame}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Reset Game
        </button>
      </div>

      {/* Game End Message */}
      {isGameEnded && winner && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#4CAF50',
          borderRadius: '5px',
          textAlign: 'center',
        }}>
          <strong>Game Over!</strong><br />
          Player {winner} wins!
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '20px',
        fontSize: '12px',
        color: '#ccc',
        maxWidth: '300px',
      }}>
        <p><strong>How to play:</strong></p>
        <p>• Click and drag from the cue ball to aim and set power</p>
        <p>• Pot reds first, then colors in sequence</p>
        <p>• Build the highest break to win!</p>
      </div>
    </div>
  );
};