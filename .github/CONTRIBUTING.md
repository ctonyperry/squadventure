# Contributing to Squadventure

This guide is for both human developers and AI agents working on the project.

## For AI Agents

### Finding Work

1. **Browse Issues**: Look for issues with `status:ready` label
2. **Check Labels**:
   - `good-first-issue` - Simpler tasks, good for getting familiar
   - `priority:high` - Important tasks to tackle first
   - `domain:*` - Filter by area of codebase

### Picking Up a Task

1. Read the issue thoroughly - requirements, technical notes, acceptance criteria
2. Comment on the issue that you're starting work
3. Create a branch: `feature/issue-number-brief-description`

### Development Workflow

```bash
# Clone and setup
git clone https://github.com/ctonyperry/squadventure.git
cd squadventure
pnpm install
pnpm build

# Create feature branch
git checkout -b feature/123-spell-slots

# Make changes, then build to verify
pnpm build

# Commit with descriptive message
git commit -m "feat: implement spell slot tracking

- Add SpellSlots type to shared package
- Create magic module in domain
- Add cast_spell and check_spell_slots tools

Closes #123"

# Push and create PR
git push -u origin feature/123-spell-slots
gh pr create
```

### Code Standards

- **TypeScript**: Strict mode with `exactOptionalPropertyTypes`
- **Architecture**: Follow domain-driven design patterns
- **Types**: Add new types to `packages/shared/src/types.ts`
- **Tools**: Follow existing tool patterns in domain package
- **No console.log**: Domain package has no Node types

### PR Requirements

- [ ] All acceptance criteria met
- [ ] `pnpm build` passes with no errors
- [ ] New types added to shared package
- [ ] Tools follow existing patterns
- [ ] Descriptive commit message

## Project Structure

```
packages/
├── shared/         # Types and schemas (no logic)
├── domain/         # Core game logic (no I/O)
├── infrastructure/ # LLM adapters, file persistence
├── application/    # Orchestration, state management
└── cli/            # User interface
```

### Key Files

| Purpose | Location |
|---------|----------|
| Type definitions | `packages/shared/src/types.ts` |
| Tool definitions | `packages/domain/src/tools/` |
| Combat logic | `packages/domain/src/combat/` |
| Inventory | `packages/domain/src/inventory/` |
| Characters | `packages/domain/src/character/` |
| Knowledge/RAG | `packages/domain/src/knowledge/` |

## Issue Labels

| Label | Meaning |
|-------|---------|
| `status:ready` | Ready to be picked up |
| `status:in-progress` | Someone is working on it |
| `status:blocked` | Waiting on something |
| `type:feature` | New functionality |
| `type:bug` | Something broken |
| `priority:high/medium/low` | Importance |
| `domain:*` | Area of codebase |
| `good-first-issue` | Simpler task |
