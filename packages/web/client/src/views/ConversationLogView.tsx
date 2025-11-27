/**
 * Conversation Log View
 *
 * Full turn history with tool calls and dice rolls.
 */

import React from 'react';
import { useGameStore, type ConversationMessage } from '../store/gameStore';

export function ConversationLogView(): React.ReactElement {
  const messages = useGameStore((state) => state.messages);

  if (messages.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Conversation Log</span>
        </div>
        <div className="empty-state">
          <p>No messages yet</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Start a game session to see the conversation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Conversation Log</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {messages.length} messages
        </span>
      </div>

      <div className="conversation-log">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
}

function MessageItem({ message }: { message: ConversationMessage }): React.ReactElement {
  const timestamp = new Date(message.timestamp).toLocaleTimeString();

  return (
    <div className={`message ${message.role}`}>
      <div className="message-header">
        <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
          {message.role === 'assistant' ? 'DM' : message.role}
        </span>
        <span>{timestamp}</span>
      </div>

      <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>

      {/* Dice Rolls */}
      {message.diceRolls && message.diceRolls.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          {message.diceRolls.map((roll, index) => (
            <div key={index} className="dice-roll">
              <span style={{ color: 'var(--text-secondary)' }}>{roll.notation}</span>
              <span className="dice-result">{roll.result}</span>
              {roll.breakdown && (
                <span
                  style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  ({roll.breakdown})
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tool Calls */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          {message.toolCalls.map((tool, index) => (
            <div key={index} className="tool-call">
              <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{tool.name}</div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Args: {JSON.stringify(tool.args, null, 2)}
              </div>
              {tool.result !== undefined && (
                <div style={{ color: 'var(--success)' }}>
                  Result: {JSON.stringify(tool.result)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
