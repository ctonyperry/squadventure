/**
 * Combat Tracker View
 *
 * Initiative order, HP bars, conditions, and turn history.
 */

import React from 'react';
import { useGameStore, type CombatParticipant } from '../store/gameStore';

export function CombatTrackerView(): React.ReactElement {
  const combat = useGameStore((state) => state.combat);

  if (!combat || !combat.active) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Combat Tracker</span>
        </div>
        <div className="empty-state">
          <p>No active combat</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Combat will appear here when initiated
          </p>
        </div>
      </div>
    );
  }

  const currentParticipant = combat.participants[combat.currentTurnIndex];

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Combat</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--accent)' }}>
            Round {combat.round}
          </span>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Current Turn
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {currentParticipant?.name ?? 'Unknown'}
          </div>
        </div>

        <ul className="initiative-list">
          {combat.participants.map((participant, index) => (
            <InitiativeItem
              key={participant.id}
              participant={participant}
              isCurrentTurn={index === combat.currentTurnIndex}
            />
          ))}
        </ul>
      </div>

      {combat.turnHistory.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Turn History</span>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {combat.turnHistory
              .slice()
              .reverse()
              .map((turn, index) => (
                <div
                  key={index}
                  style={{
                    padding: '0.5rem',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.875rem',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
                    R{turn.round}
                  </span>
                  <span style={{ fontWeight: 500 }}>{turn.participantId}</span>
                  <span style={{ color: 'var(--text-secondary)' }}> - {turn.action}</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
                    {turn.result}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InitiativeItem({
  participant,
  isCurrentTurn,
}: {
  participant: CombatParticipant;
  isCurrentTurn: boolean;
}): React.ReactElement {
  const hpPercent = (participant.hp.current / participant.hp.max) * 100;
  const hpColor =
    hpPercent > 50 ? 'var(--success)' : hpPercent > 25 ? 'var(--warning)' : 'var(--danger)';

  return (
    <li className={`initiative-item ${isCurrentTurn ? 'current-turn' : ''}`}>
      <span className="initiative-number">{participant.initiative}</span>
      <div className="initiative-name">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>{participant.name}</span>
          {participant.isPlayer && (
            <span
              style={{
                marginLeft: '0.5rem',
                fontSize: '0.625rem',
                padding: '0.125rem 0.375rem',
                backgroundColor: 'var(--accent)',
                borderRadius: '4px',
              }}
            >
              PC
            </span>
          )}
        </div>
        {participant.conditions.length > 0 && (
          <div style={{ marginTop: '0.25rem' }}>
            {participant.conditions.map((condition) => (
              <span key={condition} className="condition-badge negative">
                {condition}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ width: '100px', textAlign: 'right' }}>
        <div className="initiative-hp">
          {participant.hp.current}/{participant.hp.max}
        </div>
        <div
          style={{
            height: '4px',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginTop: '0.25rem',
          }}
        >
          <div
            style={{
              width: `${hpPercent}%`,
              height: '100%',
              backgroundColor: hpColor,
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    </li>
  );
}
