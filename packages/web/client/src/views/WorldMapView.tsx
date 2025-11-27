/**
 * World Map View
 *
 * Visual representation of locations and connections.
 */

import React from 'react';
import { useGameStore, type Location } from '../store/gameStore';

export function WorldMapView(): React.ReactElement {
  const locations = useGameStore((state) => state.locations);
  const currentLocationId = useGameStore((state) => state.currentLocationId);
  const selectEntity = useGameStore((state) => state.selectEntity);

  if (locations.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">World Map</span>
        </div>
        <div className="empty-state">
          <p>No locations loaded</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Start a game session to populate the world map
          </p>
        </div>
      </div>
    );
  }

  const discoveredLocations = locations.filter((loc) => loc.discovered);
  const undiscoveredCount = locations.length - discoveredLocations.length;

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">World Map</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {discoveredLocations.length} discovered
            {undiscoveredCount > 0 && ` / ${undiscoveredCount} hidden`}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {discoveredLocations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              isCurrent={location.id === currentLocationId}
              onSelect={() => selectEntity(location.id)}
            />
          ))}
        </div>
      </div>

      {currentLocationId && (
        <CurrentLocationPanel
          location={locations.find((l) => l.id === currentLocationId) ?? null}
          allLocations={locations}
        />
      )}
    </div>
  );
}

function LocationCard({
  location,
  isCurrent,
  onSelect,
}: {
  location: Location;
  isCurrent: boolean;
  onSelect: () => void;
}): React.ReactElement {
  return (
    <div
      onClick={onSelect}
      style={{
        backgroundColor: isCurrent ? 'rgba(233, 69, 96, 0.2)' : 'var(--bg-tertiary)',
        borderRadius: '8px',
        padding: '1rem',
        cursor: 'pointer',
        border: isCurrent ? '2px solid var(--accent)' : '2px solid transparent',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        {isCurrent && (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              marginRight: '0.5rem',
            }}
          />
        )}
        <span style={{ fontWeight: 600 }}>{location.name}</span>
      </div>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {location.description}
      </p>
      {location.connections.length > 0 && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Connections: </span>
          {location.connections.length}
        </div>
      )}
    </div>
  );
}

function CurrentLocationPanel({
  location,
  allLocations,
}: {
  location: Location | null;
  allLocations: Location[];
}): React.ReactElement | null {
  if (!location) return null;

  const connectedLocations = location.connections
    .map((id) => allLocations.find((l) => l.id === id))
    .filter((l): l is Location => l !== undefined);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Current Location</span>
      </div>

      <h2 style={{ marginBottom: '0.5rem' }}>{location.name}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        {location.description}
      </p>

      {connectedLocations.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Connected Areas</h3>
          <ul className="entity-list">
            {connectedLocations.map((conn) => (
              <li key={conn.id} className="entity-item">
                <span>{conn.discovered ? conn.name : '???'}</span>
                {!conn.discovered && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '0.625rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    UNDISCOVERED
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
