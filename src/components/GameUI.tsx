import React from 'react';
import { GameState } from '../game/ScoreSystem';
import { RulesEngine } from '../game/RulesEngine';

interface GameUIProps {
  gameState: GameState;
  onStartGame: () => void;
  onResetGame: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({ gameState, onStartGame, onResetGame }) => {
  const scores = gameState.scores;
  const currentPlayer = gameState.currentPlayer;
  const currentBreak = gameState.currentBreak;
  const isGameEnded = gameState.gamePhase === 'ended';
  const isOnReds = RulesEngine.isOnReds(gameState);

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
          <strong>Reds Remaining:</strong> {gameState.redsRemaining}
        </div>

        <div>
          <strong>Phase:</strong> {gameState.gamePhase === 'positioning' ? 'Positioning Cue Ball' : (isOnReds ? 'On Reds' : 'On Colors')}
        </div>
      </div>

      {/* Game Controls */}
      <div style={{ marginTop: '10px' }}>
        {gameState.gamePhase === 'waiting' && (
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
              fontWeight: 'bold',
            }}
          >
            START GAME
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
            fontWeight: 'bold',
          }}
        >
          RESET GAME
        </button>
      </div>

      {/* Game End Message */}
      {isGameEnded && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#4CAF50',
          borderRadius: '5px',
          textAlign: 'center',
        }}>
          <strong>Game Over!</strong><br />
          {scores.player1 > scores.player2 ? 'Player 1 wins!' : scores.player2 > scores.player1 ? 'Player 2 wins!' : 'Draw!'}
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