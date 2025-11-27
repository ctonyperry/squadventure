/**
 * Character Panel View
 *
 * Detailed character sheet display.
 */

import React from 'react';
import { useGameStore, type Character } from '../store/gameStore';

export function CharacterPanelView(): React.ReactElement {
  const characters = useGameStore((state) => state.characters);
  const selectedCharacterId = useGameStore((state) => state.selectedCharacterId);
  const selectCharacter = useGameStore((state) => state.selectCharacter);

  if (characters.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Characters</span>
        </div>
        <div className="empty-state">
          <p>No characters loaded</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Create characters to see them here
          </p>
        </div>
      </div>
    );
  }

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem' }}>
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Party Members</span>
        </div>
        <ul className="entity-list">
          {characters.map((char) => (
            <li
              key={char.id}
              className={`entity-item ${char.id === selectedCharacterId ? 'selected' : ''}`}
              onClick={() => selectCharacter(char.id)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{char.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Lvl {char.level} {char.class}
                </div>
              </div>
              <HPMini hp={char.hp} />
            </li>
          ))}
        </ul>
      </div>

      {selectedCharacter ? (
        <CharacterSheet character={selectedCharacter} />
      ) : (
        <div className="panel">
          <div className="empty-state">Select a character to view details</div>
        </div>
      )}
    </div>
  );
}

function HPMini({ hp }: { hp: { current: number; max: number } }): React.ReactElement {
  const percent = (hp.current / hp.max) * 100;
  const color =
    percent > 50 ? 'var(--success)' : percent > 25 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '0.75rem' }}>
        {hp.current}/{hp.max}
      </div>
      <div
        style={{
          width: '40px',
          height: '4px',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '2px',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function CharacterSheet({ character }: { character: Character }): React.ReactElement {
  const hpPercent = (character.hp.current / character.hp.max) * 100;

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Character Sheet</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Basic Info */}
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>{character.name}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Level {character.level} {character.race} {character.class}
          </p>

          {/* HP Bar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.25rem',
              }}
            >
              <span style={{ fontSize: '0.875rem' }}>Hit Points</span>
              <span>
                {character.hp.current} / {character.hp.max}
              </span>
            </div>
            <div className="hp-bar" style={{ height: '20px' }}>
              <div className="hp-bar-fill" style={{ width: `${hpPercent}%` }} />
            </div>
          </div>

          {/* AC */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '8px',
              marginBottom: '1rem',
            }}
          >
            <span>Armor Class</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{character.ac}</span>
          </div>

          {/* Hit Dice */}
          {character.hitDice && (
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem' }}>Hit Dice: </span>
              <span>
                {character.hitDice.max - character.hitDice.used}d10 remaining
              </span>
            </div>
          )}
        </div>

        {/* Abilities */}
        <div>
          <h3 style={{ marginBottom: '0.75rem' }}>Abilities</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.5rem',
            }}
          >
            {Object.entries(character.abilities).map(([ability, score]) => {
              const modifier = Math.floor((score - 10) / 2);
              return (
                <div
                  key={ability}
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {ability}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{score}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--accent)' }}>
                    {modifier >= 0 ? '+' : ''}
                    {modifier}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spell Slots */}
      {character.spellSlots && character.spellSlots.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>Spell Slots</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {character.spellSlots.map((slot) => (
              <div key={slot.level} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.25rem',
                  }}
                >
                  Level {slot.level}
                </div>
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
        </div>
      )}

      {/* Conditions */}
      {character.conditions.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>Conditions</h3>
          <div>
            {character.conditions.map((condition) => (
              <span key={condition} className="condition-badge negative">
                {condition}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Death Saves */}
      {character.deathSaves && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>Death Saves</h3>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <span style={{ color: 'var(--success)', marginRight: '0.5rem' }}>
                Successes:
              </span>
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor:
                      i < character.deathSaves!.successes
                        ? 'var(--success)'
                        : 'var(--bg-primary)',
                    border: '2px solid var(--success)',
                    marginRight: '0.25rem',
                  }}
                />
              ))}
            </div>
            <div>
              <span style={{ color: 'var(--danger)', marginRight: '0.5rem' }}>
                Failures:
              </span>
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor:
                      i < character.deathSaves!.failures
                        ? 'var(--danger)'
                        : 'var(--bg-primary)',
                    border: '2px solid var(--danger)',
                    marginRight: '0.25rem',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inventory */}
      {character.inventory.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>Inventory</h3>
          <ul className="entity-list">
            {character.inventory.map((item) => (
              <li key={item.id} className="entity-item">
                <span>{item.name}</span>
                {item.equipped && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '0.625rem',
                      padding: '0.125rem 0.375rem',
                      backgroundColor: 'var(--accent)',
                      borderRadius: '4px',
                    }}
                  >
                    EQUIPPED
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
