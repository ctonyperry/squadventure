/**
 * Sidebar Component
 *
 * Navigation and entity lists.
 */

import React from 'react';
import { useGameStore } from '../store/gameStore';

export function Sidebar(): React.ReactElement {
  const activeView = useGameStore((state) => state.activeView);
  const setActiveView = useGameStore((state) => state.setActiveView);
  const characters = useGameStore((state) => state.characters);
  const combat = useGameStore((state) => state.combat);

  const navItems = [
    { id: 'world' as const, label: 'World Map', icon: '\u{1F5FA}' },
    { id: 'combat' as const, label: 'Combat Tracker', icon: '\u{2694}' },
    { id: 'character' as const, label: 'Characters', icon: '\u{1F9D9}' },
    { id: 'conversation' as const, label: 'Conversation', icon: '\u{1F4AC}' },
  ];

  return (
    <nav className="sidebar">
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Navigation</span>
        </div>
        <ul className="entity-list">
          {navItems.map((item) => (
            <li
              key={item.id}
              className={`entity-item ${activeView === item.id ? 'selected' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              <span style={{ marginRight: '0.5rem' }}>{item.icon}</span>
              {item.label}
              {item.id === 'combat' && combat?.active && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.625rem',
                    padding: '0.125rem 0.5rem',
                    backgroundColor: 'var(--danger)',
                    borderRadius: '9999px',
                  }}
                >
                  ACTIVE
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Party</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {characters.length} members
          </span>
        </div>
        {characters.length === 0 ? (
          <div className="empty-state">No characters loaded</div>
        ) : (
          <ul className="entity-list">
            {characters.map((char) => (
              <li key={char.id} className="entity-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{char.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Level {char.level} {char.race} {char.class}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem' }}>
                    {char.hp.current}/{char.hp.max}
                  </div>
                  <div
                    style={{
                      width: '60px',
                      height: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(char.hp.current / char.hp.max) * 100}%`,
                        height: '100%',
                        backgroundColor:
                          char.hp.current / char.hp.max > 0.5
                            ? 'var(--success)'
                            : char.hp.current / char.hp.max > 0.25
                              ? 'var(--warning)'
                              : 'var(--danger)',
                      }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}
