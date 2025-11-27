import type { LLMTool } from '@ai-dm/shared';

/**
 * Tool definition with handler
 */
export interface ToolDefinition<TArgs = Record<string, unknown>, TResult = unknown> {
  tool: LLMTool;
  handler: (args: TArgs) => Promise<TResult>;
}

/**
 * Registry for DM tools
 * Tools allow the LLM to interact with the game world
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  /**
   * Register a tool
   */
  register<TArgs, TResult>(definition: ToolDefinition<TArgs, TResult>): this {
    this.tools.set(definition.tool.name, definition as ToolDefinition);
    return this;
  }

  /**
   * Get all tools for LLM
   */
  getTools(): LLMTool[] {
    return Array.from(this.tools.values()).map((d) => d.tool);
  }

  /**
   * Execute a tool by name
   */
  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const definition = this.tools.get(name);
    if (!definition) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return definition.handler(args);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get tool count
   */
  get size(): number {
    return this.tools.size;
  }
}
