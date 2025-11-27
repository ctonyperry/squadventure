/**
 * AI Dungeon Master Dashboard
 *
 * Main application component with layout and navigation.
 */

import React from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useGameStore } from './store/gameStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { WorldMapView } from './views/WorldMapView';
import { CombatTrackerView } from './views/CombatTrackerView';
import { CharacterPanelView } from './views/CharacterPanelView';
import { ConversationLogView } from './views/ConversationLogView';
import { EntityInspector } from './components/EntityInspector';

export function App(): React.ReactElement {
  const { isConnected } = useWebSocket();
  const activeView = useGameStore((state) => state.activeView);

  const renderMainContent = (): React.ReactElement => {
    switch (activeView) {
      case 'world':
        return <WorldMapView />;
      case 'combat':
        return <CombatTrackerView />;
      case 'character':
        return <CharacterPanelView />;
      case 'conversation':
        return <ConversationLogView />;
      default:
        return <WorldMapView />;
    }
  };

  return (
    <div className="dashboard">
      <Header isConnected={isConnected} />
      <Sidebar />
      <main className="main-content">{renderMainContent()}</main>
      <aside className="right-panel">
        <EntityInspector />
      </aside>
    </div>
  );
}
