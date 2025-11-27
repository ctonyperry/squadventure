/**
 * Campaign Manager
 *
 * Manages campaign state, quests, chapters, and story progression.
 */

import type {
  Campaign,
  CampaignId,
  CampaignSummary,
  Chapter,
  ChapterId,
  Quest,
  QuestId,
  Objective,
  ObjectiveId,
  ObjectiveStatus,
  PlotDecision,
  StoryState,
  EntityId,
  LocationId,
  createCampaignId,
  createChapterId,
  createQuestId,
  createObjectiveId,
} from '@ai-dm/shared';

// ============================================================================
// Campaign Manager Class
// ============================================================================

/**
 * Manages campaign state and story progression
 */
export class CampaignManager {
  private campaign: Campaign | null = null;
  private nextObjectiveId = 1;
  private nextQuestId = 1;

  /**
   * Load a campaign
   */
  loadCampaign(campaign: Campaign): void {
    this.campaign = campaign;
  }

  /**
   * Get the current campaign
   */
  getCampaign(): Campaign | null {
    return this.campaign;
  }

  /**
   * Get a summary of the current campaign
   */
  getCampaignSummary(): CampaignSummary | null {
    if (!this.campaign) {
      return null;
    }

    const completedQuests = this.campaign.storyState.quests.filter(
      (q) => q.status === 'completed'
    ).length;

    const currentChapterIndex = this.campaign.storyState.currentChapterId
      ? this.campaign.chapters.findIndex(
          (c) => c.id === this.campaign!.storyState.currentChapterId
        )
      : 0;

    const summary: CampaignSummary = {
      id: this.campaign.id,
      name: this.campaign.name,
      description: this.campaign.description,
      levelRange: this.campaign.levelRange,
      chapterCount: this.campaign.chapters.length,
      questCount: this.campaign.storyState.quests.length,
      progress: {
        currentChapter: currentChapterIndex + 1,
        totalChapters: this.campaign.chapters.length,
        completedQuests,
        totalQuests: this.campaign.storyState.quests.length,
      },
    };

    if (this.campaign.metadata.tags) {
      summary.tags = this.campaign.metadata.tags;
    }

    return summary;
  }

  // ==========================================================================
  // Chapter Management
  // ==========================================================================

  /**
   * Get the current active chapter
   */
  getCurrentChapter(): Chapter | null {
    if (!this.campaign || !this.campaign.storyState.currentChapterId) {
      return null;
    }
    return this.campaign.chapters.find(
      (c) => c.id === this.campaign!.storyState.currentChapterId
    ) ?? null;
  }

  /**
   * Get a chapter by ID
   */
  getChapter(chapterId: ChapterId): Chapter | null {
    if (!this.campaign) {
      return null;
    }
    return this.campaign.chapters.find((c) => c.id === chapterId) ?? null;
  }

  /**
   * Set the current chapter
   */
  setCurrentChapter(chapterId: ChapterId): { success: boolean; message: string } {
    if (!this.campaign) {
      return { success: false, message: 'No campaign loaded.' };
    }

    const chapter = this.campaign.chapters.find((c) => c.id === chapterId);
    if (!chapter) {
      return { success: false, message: `Chapter ${chapterId} not found.` };
    }

    // Check prerequisites
    if (chapter.prerequisites) {
      if (chapter.prerequisites.completedChapters) {
        for (const reqChapterId of chapter.prerequisites.completedChapters) {
          const reqChapter = this.campaign.chapters.find((c) => c.id === reqChapterId);
          if (!reqChapter || reqChapter.status !== 'completed') {
            return {
              success: false,
              message: `Prerequisite chapter not completed: ${reqChapterId}`,
            };
          }
        }
      }
    }

    // Update chapter status
    if (chapter.status === 'locked') {
      chapter.status = 'active';
    }

    this.campaign.storyState.currentChapterId = chapterId;
    return { success: true, message: `Now in Chapter ${chapter.number}: ${chapter.name}` };
  }

  /**
   * Complete the current chapter
   */
  completeChapter(): { success: boolean; message: string } {
    const chapter = this.getCurrentChapter();
    if (!chapter) {
      return { success: false, message: 'No current chapter.' };
    }

    // Check if all main objectives are completed
    const incompleteMain = chapter.objectives.filter(
      (o) => o.type === 'main' && o.status !== 'completed'
    );

    if (incompleteMain.length > 0) {
      return {
        success: false,
        message: `Cannot complete chapter. ${incompleteMain.length} main objective(s) remaining.`,
      };
    }

    chapter.status = 'completed';

    // Unlock next chapter if available
    const currentIndex = this.campaign!.chapters.indexOf(chapter);
    if (currentIndex >= 0 && currentIndex < this.campaign!.chapters.length - 1) {
      const nextChapter = this.campaign!.chapters[currentIndex + 1];
      if (nextChapter && nextChapter.status === 'locked') {
        nextChapter.status = 'active';
      }
    }

    return {
      success: true,
      message: `Chapter ${chapter.number}: ${chapter.name} completed!`,
    };
  }

  // ==========================================================================
  // Quest Management
  // ==========================================================================

  /**
   * Get all quests
   */
  getQuests(): Quest[] {
    return this.campaign?.storyState.quests ?? [];
  }

  /**
   * Get active quests
   */
  getActiveQuests(): Quest[] {
    return this.getQuests().filter((q) => q.status === 'active');
  }

  /**
   * Get a quest by ID
   */
  getQuest(questId: QuestId): Quest | null {
    return this.getQuests().find((q) => q.id === questId) ?? null;
  }

  /**
   * Start a new quest
   */
  startQuest(quest: Omit<Quest, 'id' | 'status' | 'startedAt'>): {
    success: boolean;
    quest?: Quest;
    message: string;
  } {
    if (!this.campaign) {
      return { success: false, message: 'No campaign loaded.' };
    }

    const newQuest: Quest = {
      ...quest,
      id: `quest_${this.nextQuestId++}` as QuestId,
      status: 'active',
      startedAt: new Date(),
    };

    this.campaign.storyState.quests.push(newQuest);

    return {
      success: true,
      quest: newQuest,
      message: `Quest started: ${newQuest.name}`,
    };
  }

  /**
   * Update quest status
   */
  updateQuestStatus(
    questId: QuestId,
    status: ObjectiveStatus
  ): { success: boolean; message: string } {
    const quest = this.getQuest(questId);
    if (!quest) {
      return { success: false, message: `Quest ${questId} not found.` };
    }

    quest.status = status;

    if (status === 'completed' || status === 'failed') {
      quest.endedAt = new Date();
    }

    return { success: true, message: `Quest "${quest.name}" status: ${status}` };
  }

  /**
   * Add a quest from the current chapter
   */
  activateChapterQuest(questIndex: number): { success: boolean; message: string } {
    const chapter = this.getCurrentChapter();
    if (!chapter) {
      return { success: false, message: 'No current chapter.' };
    }

    if (questIndex < 0 || questIndex >= chapter.questIds.length) {
      return { success: false, message: 'Invalid quest index.' };
    }

    const questId = chapter.questIds[questIndex];
    if (!questId) {
      return { success: false, message: 'Quest ID not found at index.' };
    }
    const quest = this.getQuest(questId);

    if (!quest) {
      return { success: false, message: `Quest ${questId} not found.` };
    }

    if (quest.status !== 'unknown' && quest.status !== 'discovered') {
      return { success: false, message: `Quest already active or completed.` };
    }

    quest.status = 'active';
    quest.startedAt = new Date();

    return { success: true, message: `Quest activated: ${quest.name}` };
  }

  // ==========================================================================
  // Objective Management
  // ==========================================================================

  /**
   * Get an objective by ID from any quest
   */
  getObjective(objectiveId: ObjectiveId): {
    objective: Objective;
    quest: Quest;
  } | null {
    for (const quest of this.getQuests()) {
      const objective = quest.objectives.find((o) => o.id === objectiveId);
      if (objective) {
        return { objective, quest };
      }
    }
    return null;
  }

  /**
   * Update objective status
   */
  updateObjectiveStatus(
    objectiveId: ObjectiveId,
    status: ObjectiveStatus
  ): { success: boolean; message: string; questCompleted?: boolean } {
    const result = this.getObjective(objectiveId);
    if (!result) {
      return { success: false, message: `Objective ${objectiveId} not found.` };
    }

    const { objective, quest } = result;
    objective.status = status;

    // Check if this completes the quest
    if (status === 'completed') {
      const allComplete = quest.objectives
        .filter((o) => o.type === 'main')
        .every((o) => o.status === 'completed');

      if (allComplete && quest.status === 'active') {
        quest.status = 'completed';
        quest.endedAt = new Date();
        return {
          success: true,
          message: `Objective completed! Quest "${quest.name}" completed!`,
          questCompleted: true,
        };
      }
    }

    return {
      success: true,
      message: `Objective "${objective.title}" status: ${status}`,
    };
  }

  /**
   * Update objective progress
   */
  updateObjectiveProgress(
    objectiveId: ObjectiveId,
    progress: number
  ): { success: boolean; message: string } {
    const result = this.getObjective(objectiveId);
    if (!result) {
      return { success: false, message: `Objective ${objectiveId} not found.` };
    }

    result.objective.progress = Math.max(0, Math.min(100, progress));

    if (progress >= 100 && result.objective.status === 'active') {
      return this.updateObjectiveStatus(objectiveId, 'completed');
    }

    return {
      success: true,
      message: `Objective "${result.objective.title}" progress: ${progress}%`,
    };
  }

  /**
   * Reveal a hidden objective
   */
  revealObjective(objectiveId: ObjectiveId): { success: boolean; message: string } {
    const result = this.getObjective(objectiveId);
    if (!result) {
      return { success: false, message: `Objective ${objectiveId} not found.` };
    }

    if (result.objective.isRevealed) {
      return { success: false, message: 'Objective already revealed.' };
    }

    result.objective.isRevealed = true;
    if (result.objective.status === 'unknown') {
      result.objective.status = 'discovered';
    }

    return {
      success: true,
      message: `New objective discovered: ${result.objective.title}`,
    };
  }

  // ==========================================================================
  // Plot Decisions
  // ==========================================================================

  /**
   * Record a major plot decision
   */
  recordDecision(
    description: string,
    choice: string,
    options?: {
      consequences?: string[];
      affectedEntities?: EntityId[];
    }
  ): PlotDecision {
    if (!this.campaign) {
      throw new Error('No campaign loaded.');
    }

    const decision: PlotDecision = {
      id: `decision_${Date.now()}`,
      description,
      choice,
      timestamp: new Date(),
    };

    // Add optional properties only if defined
    if (this.campaign.storyState.currentChapterId) {
      decision.chapterId = this.campaign.storyState.currentChapterId;
    }
    if (options?.consequences) {
      decision.consequences = options.consequences;
    }
    if (options?.affectedEntities) {
      decision.affectedEntities = options.affectedEntities;
    }

    this.campaign.storyState.decisions.push(decision);
    return decision;
  }

  /**
   * Get all plot decisions
   */
  getDecisions(): PlotDecision[] {
    return this.campaign?.storyState.decisions ?? [];
  }

  // ==========================================================================
  // Faction Reputation
  // ==========================================================================

  /**
   * Get faction reputation
   */
  getFactionReputation(factionId: string): number {
    return this.campaign?.storyState.factionReputation[factionId] ?? 0;
  }

  /**
   * Modify faction reputation
   */
  modifyFactionReputation(
    factionId: string,
    change: number
  ): { newValue: number; message: string } {
    if (!this.campaign) {
      return { newValue: 0, message: 'No campaign loaded.' };
    }

    const current = this.campaign.storyState.factionReputation[factionId] ?? 0;
    const newValue = current + change;
    this.campaign.storyState.factionReputation[factionId] = newValue;

    const direction = change > 0 ? 'improved' : 'worsened';
    return {
      newValue,
      message: `Reputation with faction ${direction} (${change >= 0 ? '+' : ''}${change})`,
    };
  }

  // ==========================================================================
  // Story Flags & Counters
  // ==========================================================================

  /**
   * Set a story flag
   */
  setStoryFlag(flag: string, value: boolean): void {
    if (this.campaign) {
      this.campaign.storyState.storyFlags[flag] = value;
    }
  }

  /**
   * Get a story flag
   */
  getStoryFlag(flag: string): boolean {
    return this.campaign?.storyState.storyFlags[flag] ?? false;
  }

  /**
   * Increment a story counter
   */
  incrementCounter(counter: string, amount: number = 1): number {
    if (!this.campaign) {
      return 0;
    }
    const current = this.campaign.storyState.storyCounters[counter] ?? 0;
    const newValue = current + amount;
    this.campaign.storyState.storyCounters[counter] = newValue;
    return newValue;
  }

  /**
   * Get a story counter value
   */
  getCounter(counter: string): number {
    return this.campaign?.storyState.storyCounters[counter] ?? 0;
  }

  // ==========================================================================
  // Lore Discovery
  // ==========================================================================

  /**
   * Discover a lore entry
   */
  discoverLore(loreId: string): { success: boolean; message: string } {
    if (!this.campaign) {
      return { success: false, message: 'No campaign loaded.' };
    }

    if (this.campaign.storyState.discoveredLore.includes(loreId)) {
      return { success: false, message: 'Lore already discovered.' };
    }

    this.campaign.storyState.discoveredLore.push(loreId);
    return { success: true, message: `New lore discovered: ${loreId}` };
  }

  /**
   * Check if lore has been discovered
   */
  isLoreDiscovered(loreId: string): boolean {
    return this.campaign?.storyState.discoveredLore.includes(loreId) ?? false;
  }

  // ==========================================================================
  // Summary & State
  // ==========================================================================

  /**
   * Get a formatted summary of campaign progress
   */
  getProgressSummary(): string {
    if (!this.campaign) {
      return 'No campaign loaded.';
    }

    const chapter = this.getCurrentChapter();
    const activeQuests = this.getActiveQuests();
    const completedQuests = this.getQuests().filter((q) => q.status === 'completed');

    const lines: string[] = [];
    lines.push(`=== ${this.campaign.name} ===`);
    lines.push(`Level Range: ${this.campaign.levelRange.min}-${this.campaign.levelRange.max}`);
    lines.push('');

    if (chapter) {
      lines.push(`Current Chapter: ${chapter.number}. ${chapter.name}`);
      lines.push(`Chapter Status: ${chapter.status}`);

      const chapterObjectives = chapter.objectives.filter((o) => o.isRevealed);
      if (chapterObjectives.length > 0) {
        lines.push('');
        lines.push('Chapter Objectives:');
        chapterObjectives.forEach((obj) => {
          const statusIcon = obj.status === 'completed' ? '✓' : obj.status === 'active' ? '○' : '?';
          lines.push(`  ${statusIcon} ${obj.title}`);
        });
      }
    }

    if (activeQuests.length > 0) {
      lines.push('');
      lines.push('Active Quests:');
      activeQuests.forEach((quest) => {
        const completed = quest.objectives.filter((o) => o.status === 'completed').length;
        const total = quest.objectives.length;
        lines.push(`  • ${quest.name} (${completed}/${total})`);
      });
    }

    lines.push('');
    lines.push(`Quests Completed: ${completedQuests.length}`);
    lines.push(`Decisions Made: ${this.campaign.storyState.decisions.length}`);

    return lines.join('\n');
  }

  /**
   * Export campaign state
   */
  exportState(): Campaign | null {
    return this.campaign;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a campaign manager instance
 */
export function createCampaignManager(): CampaignManager {
  return new CampaignManager();
}
