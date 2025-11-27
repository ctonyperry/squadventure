/**
 * Header Component
 *
 * Top navigation bar with title and connection status.
 */

import React from 'react';

interface HeaderProps {
  isConnected: boolean;
}

export function Header({ isConnected }: HeaderProps): React.ReactElement {
  return (
    <header className="header">
      <h1>AI Dungeon Master</h1>
      <div className="status-indicator">
        <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </header>
  );
}
