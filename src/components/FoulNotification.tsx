import React, { useEffect, useState } from 'react';

interface FoulNotificationProps {
  foulMessage: string;
  onDismiss: () => void;
  displayDuration?: number; // in milliseconds, default 5000
}

export const FoulNotification: React.FC<FoulNotificationProps> = ({
  foulMessage,
  onDismiss,
  displayDuration = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // Start fade-out animation after 4.5 seconds (so fading happens during the last 0.5s)
    const fadeStartTime = displayDuration - 500;
    
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, fadeStartTime);

    // Dismiss notification after full duration
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, displayDuration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [displayDuration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(255, 0, 0, 0.9)',
        color: 'white',
        padding: '24px 48px',
        borderRadius: '12px',
        fontSize: '32px',
        fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif',
        zIndex: 2000,
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
        border: '3px solid #ff6666',
        opacity: opacity,
        transition: 'opacity 0.5s ease-out',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        animation: 'pulse 0.3s ease-out',
      }}
    >
      {foulMessage}
      <style>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.9);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
