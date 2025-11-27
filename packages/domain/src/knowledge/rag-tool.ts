import type { ToolDefinition } from '../tools/tool-registry.js';
import { SRDKnowledgeBase, type KnowledgeEntry } from './srd-knowledge-base.js';

/**
 * Context for RAG tool
 */
export interface RAGToolContext {
  knowledgeBase: SRDKnowledgeBase;
}

/**
 * Create the rules lookup tool
 */
export function createRulesLookupTool(
  getContext: () => RAGToolContext
): ToolDefinition<{ query: string }, string> {
  return {
    tool: {
      name: 'lookup_rules',
      description: `Search the D&D 5e rules for relevant information. Use this when you need to verify rules for ability checks, combat, spells, conditions, or other game mechanics. Always look up rules rather than relying on memory for specific mechanics.`,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What rules to search for (e.g., "grappling", "fireball spell", "death saves")',
          },
        },
        required: ['query'],
      },
    },
    handler: async ({ query }) => {
      const { knowledgeBase } = getContext();
      const results = knowledgeBase.search(query, 3);

      if (results.length === 0) {
        return `No specific rules found for "${query}". Use your general D&D 5e knowledge.`;
      }

      return knowledgeBase.formatForContext(results);
    },
  };
}

/**
 * Create spell lookup tool
 */
export function createSpellLookupTool(
  getContext: () => RAGToolContext
): ToolDefinition<{ spellName: string }, string> {
  return {
    tool: {
      name: 'lookup_spell',
      description: `Look up a specific spell's details including casting time, range, components, duration, and effects. Use this before adjudicating spell effects.`,
      parameters: {
        type: 'object',
        properties: {
          spellName: {
            type: 'string',
            description: 'Name of the spell to look up',
          },
        },
        required: ['spellName'],
      },
    },
    handler: async ({ spellName }) => {
      const { knowledgeBase } = getContext();
      const results = knowledgeBase.search(`${spellName} spell`, 1);

      if (results.length === 0 || !results[0]?.category.includes('Spell')) {
        return `Spell "${spellName}" not found in knowledge base. Use general D&D 5e knowledge.`;
      }

      return results[0].content;
    },
  };
}

/**
 * Create condition lookup tool
 */
export function createConditionLookupTool(
  getContext: () => RAGToolContext
): ToolDefinition<{ condition: string }, string> {
  return {
    tool: {
      name: 'lookup_condition',
      description: `Look up the effects of a condition (blinded, prone, grappled, etc.). Use when applying or adjudicating conditions.`,
      parameters: {
        type: 'object',
        properties: {
          condition: {
            type: 'string',
            description: 'Name of the condition',
          },
        },
        required: ['condition'],
      },
    },
    handler: async ({ condition }) => {
      const { knowledgeBase } = getContext();

      // Search for the condition in our rules
      const results = knowledgeBase.search(`${condition} condition`, 2);

      for (const result of results) {
        if (result.id === 'conditions' || result.keywords.includes(condition.toLowerCase())) {
          // Extract just the relevant condition from the full list
          const conditionLower = condition.toLowerCase();
          const lines = result.content.split('\n');

          for (const line of lines) {
            if (line.toLowerCase().startsWith(conditionLower + ':')) {
              return `${condition.toUpperCase()}: ${line.split(':').slice(1).join(':').trim()}`;
            }
          }

          return result.content;
        }
      }

      return `Condition "${condition}" not found. Use general D&D 5e knowledge.`;
    },
  };
}

/**
 * Create monster lookup tool
 */
export function createMonsterLookupTool(
  getContext: () => RAGToolContext
): ToolDefinition<{ monsterName: string }, string> {
  return {
    tool: {
      name: 'lookup_monster',
      description: `Look up a monster's stat block including AC, HP, abilities, and attacks. Use when running combat with creatures or when players ask about monsters they're fighting.`,
      parameters: {
        type: 'object',
        properties: {
          monsterName: {
            type: 'string',
            description: 'Name of the monster (e.g., "goblin", "zombie", "owlbear")',
          },
        },
        required: ['monsterName'],
      },
    },
    handler: async ({ monsterName }) => {
      const { knowledgeBase } = getContext();
      const results = knowledgeBase.search(monsterName, 2);

      // Look for monster entries
      for (const result of results) {
        if (result.category === 'Monsters') {
          return result.content;
        }
      }

      // Check if any result title matches
      const titleMatch = results.find((r) =>
        r.title.toLowerCase().includes(monsterName.toLowerCase())
      );

      if (titleMatch) {
        return titleMatch.content;
      }

      return `Monster "${monsterName}" not found in knowledge base. Use general D&D 5e knowledge for stat block.`;
    },
  };
}
