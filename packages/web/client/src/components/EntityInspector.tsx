/**
 * Entity Inspector Component
 *
 * Shows details of selected entity.
 */

import React from 'react';
import { useGameStore, type Entity, type Character } from '../store/gameStore';

export function EntityInspector(): React.ReactElement | null {
  const selectedEntityId = useGameStore((state) => state.selectedEntityId);
  const npcs = useGameStore((state) => state.npcs);
  const creatures = useGameStore((state) => state.creatures);
  const items = useGameStore((state) => state.items);
  const characters = useGameStore((state) => state.characters);

  // Find selected entity
  const allEntities: Entity[] = [...npcs, ...creatures, ...items];
  const selectedEntity = allEntities.find((e) => e.id === selectedEntityId);
  const selectedCharacter = characters.find((c) => c.id === selectedEntityId);

  if (!selectedEntity && !selectedCharacter) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Inspector</span>
        </div>
        <div className="empty-state">Select an entity to inspect</div>
      </div>
    );
  }

  if (selectedCharacter) {
    return <CharacterDetails character={selectedCharacter} />;
  }

  if (selectedEntity) {
    return <EntityDetails entity={selectedEntity} />;
  }

  return null;
}

function CharacterDetails({ character }: { character: Character }): React.ReactElement {
  const hpPercent = (character.hp.current / character.hp.max) * 100;

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Character</span>
      </div>

      <div className="character-card">
        <div className="character-name">{character.name}</div>
        <div className="character-class">
          Level {character.level} {character.race} {character.class}
        </div>

        <div className="hp-bar-container">
          <div style={{ marginBottom: '0.25rem', fontSize: '0.75rem' }}>Hit Points</div>
          <div className="hp-bar">
            <div className="hp-bar-fill" style={{ width: `${hpPercent}%` }} />
            <span className="hp-bar-text">
              {character.hp.current} / {character.hp.max}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Armor Class</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{character.ac}</div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>Abilities</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
            }}
          >
            {Object.entries(character.abilities).map(([ability, score]) => (
              <div
                key={ability}
                style={{
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '0.5rem',
                  borderRadius: '4px',
                }}
              >
                <div style={{ fontSize: '0.625rem', textTransform: 'uppercase' }}>
                  {ability.slice(0, 3)}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{score}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {score >= 10 ? '+' : ''}
                  {Math.floor((score - 10) / 2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {character.spellSlots && character.spellSlots.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>Spell Slots</div>
            {character.spellSlots.map((slot) => (
              <div key={slot.level} style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.625rem', marginRight: '0.5rem' }}>
                  Lvl {slot.level}
                </span>
                <div className="spell-slots">
                  {Array.from({ length: slot.max }).map((_, i) => (
                    <span
                      key={i}
                      className={`spell-slot ${i < slot.max - slot.used ? 'available' : 'used'}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {character.conditions.length > 0 && (
          <div>
            <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>Conditions</div>
            <div>
              {character.conditions.map((condition) => (
                <span key={condition} className="condition-badge negative">
                  {condition}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EntityDetails({ entity }: { entity: Entity }): React.ReactElement {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">{entity.type.toUpperCase()}</span>
      </div>

      <div style={{ padding: '0.5rem 0' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          {entity.name}
        </div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}
        </div>

        {entity.attitude && (
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Attitude:{' '}
            </span>
            <span
              className={`condition-badge ${entity.attitude === 'hostile' ? 'negative' : 'positive'}`}
            >
              {entity.attitude}
            </span>
          </div>
        )}

        {entity.hp && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Hit Points</div>
            <div className="hp-bar">
              <div
                className="hp-bar-fill"
                style={{ width: `${(entity.hp.current / entity.hp.max) * 100}%` }}
              />
              <span className="hp-bar-text">
                {entity.hp.current} / {entity.hp.max}
              </span>
            </div>
          </div>
        )}

        {entity.locationId && (
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Location:{' '}
            </span>
            <span>{entity.locationId}</span>
          </div>
        )}
      </div>
    </div>
  );
}
