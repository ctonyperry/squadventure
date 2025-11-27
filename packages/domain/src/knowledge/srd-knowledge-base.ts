/**
 * D&D 5e SRD Knowledge Base for RAG
 * Contains structured rules, spells, and reference data
 */

/**
 * Knowledge entry for RAG retrieval
 */
export interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  relatedEntries?: string[];
}

/**
 * Core rules knowledge
 */
export const CORE_RULES: KnowledgeEntry[] = [
  {
    id: 'ability-checks',
    category: 'Core Rules',
    title: 'Ability Checks',
    content: `An ability check tests a character's or monster's innate talent and training. The DM calls for an ability check when a character or monster attempts an action that has a chance of failure.

For every ability check, the DM decides which of the six abilities is relevant and the difficulty of the task (DC).

Roll: d20 + ability modifier + proficiency bonus (if proficient)

Typical Difficulty Classes:
- Very Easy: DC 5
- Easy: DC 10
- Medium: DC 15
- Hard: DC 20
- Very Hard: DC 25
- Nearly Impossible: DC 30

Contest: When two creatures compete, both roll ability checks. The higher total wins. Ties go to the defender or maintain status quo.`,
    keywords: ['ability check', 'skill check', 'DC', 'difficulty class', 'contest', 'proficiency'],
  },
  {
    id: 'advantage-disadvantage',
    category: 'Core Rules',
    title: 'Advantage and Disadvantage',
    content: `Advantage: Roll 2d20 and use the higher result.
Disadvantage: Roll 2d20 and use the lower result.

Key Rules:
- Multiple instances don't stack - you either have it or you don't
- If you have both advantage and disadvantage, they cancel out (roll normally)
- If multiple sources give both, they still cancel

Common sources of Advantage:
- Attacking an unseen target who can't see you
- Attacking a prone creature from within 5 feet
- Help action from an ally
- Flanking (optional rule)

Common sources of Disadvantage:
- Attacking while prone
- Attacking a target you can't see
- Attacking at long range
- Wearing armor you're not proficient with`,
    keywords: ['advantage', 'disadvantage', 'roll twice', 'cancel'],
  },
  {
    id: 'saving-throws',
    category: 'Core Rules',
    title: 'Saving Throws',
    content: `A saving throw represents an attempt to resist a spell, trap, poison, disease, or similar threat.

Roll: d20 + ability modifier + proficiency bonus (if proficient)

Common Saving Throw Triggers:
- Strength: Physical force pushing you
- Dexterity: Dodging area effects (fireball, traps)
- Constitution: Poison, disease, death effects
- Intelligence: Mental illusions, psionic attacks
- Wisdom: Charm, fear, mental domination
- Charisma: Banishment, possession, personality effects

Success/Failure: Meet or beat the DC to succeed. Spells specify effects on save.`,
    keywords: ['saving throw', 'save', 'resist', 'DC', 'reflex', 'fortitude', 'will'],
  },
  {
    id: 'combat-actions',
    category: 'Combat',
    title: 'Actions in Combat',
    content: `On your turn, you can move and take one action.

Standard Actions:
- Attack: Make one melee or ranged attack (more with Extra Attack)
- Cast a Spell: Cast a spell with casting time of 1 action
- Dash: Double your movement for the turn
- Disengage: Your movement doesn't provoke opportunity attacks
- Dodge: Attacks against you have disadvantage, DEX saves have advantage
- Help: Give an ally advantage on their next check or attack
- Hide: Make a Stealth check to become hidden
- Ready: Prepare an action to trigger on a specific condition
- Search: Make a Perception or Investigation check
- Use an Object: Interact with a second object or use special objects

Bonus Actions: Some features grant bonus actions (off-hand attack, Cunning Action, etc.)

Reactions: One per round, typically for opportunity attacks or specific features`,
    keywords: ['action', 'attack', 'dash', 'disengage', 'dodge', 'help', 'hide', 'ready', 'bonus action', 'reaction'],
  },
  {
    id: 'attack-rolls',
    category: 'Combat',
    title: 'Making an Attack',
    content: `Attack Roll: d20 + ability modifier + proficiency bonus (if proficient)

Melee Attacks: Usually use Strength modifier
Ranged Attacks: Usually use Dexterity modifier
Finesse Weapons: Choose Strength or Dexterity

Hit: If total equals or exceeds target's AC
Critical Hit: Natural 20 always hits, roll double damage dice
Critical Miss: Natural 1 always misses

Damage Roll: Weapon die + ability modifier (same as attack roll)

Two-Weapon Fighting: If wielding two light weapons, use bonus action to attack with off-hand (no ability modifier to damage unless negative)`,
    keywords: ['attack roll', 'hit', 'miss', 'critical', 'AC', 'armor class', 'damage', 'two-weapon'],
  },
  {
    id: 'cover',
    category: 'Combat',
    title: 'Cover',
    content: `Cover provides bonuses to AC and Dexterity saving throws.

Half Cover (+2 AC, +2 DEX saves):
- Low wall, furniture, creatures, tree trunk
- Target is at least half obscured

Three-Quarters Cover (+5 AC, +5 DEX saves):
- Portcullis, arrow slit, thick tree trunk
- Only about a quarter of target exposed

Total Cover (Can't be targeted directly):
- Completely concealed
- Spells can't target through total cover`,
    keywords: ['cover', 'half cover', 'three-quarters cover', 'total cover', 'AC bonus', 'concealment'],
  },
  {
    id: 'conditions',
    category: 'Combat',
    title: 'Conditions',
    content: `Conditions alter a creature's capabilities in various ways.

Blinded: Can't see, auto-fail sight checks, attacks have disadvantage, attacks against have advantage
Charmed: Can't attack charmer, charmer has advantage on social checks
Deafened: Can't hear, auto-fail hearing checks
Frightened: Disadvantage on checks/attacks while source visible, can't move closer to source
Grappled: Speed 0, ends if grappler incapacitated or knocked away
Incapacitated: Can't take actions or reactions
Invisible: Heavily obscured for hiding, attacks have advantage, attacks against have disadvantage
Paralyzed: Incapacitated, can't move or speak, auto-fail STR/DEX saves, attacks have advantage, melee crits
Petrified: Stone, incapacitated, unaware, auto-fail STR/DEX saves, resistance to all damage
Poisoned: Disadvantage on attacks and ability checks
Prone: Can only crawl, disadvantage on attacks, melee attacks have advantage, ranged have disadvantage
Restrained: Speed 0, attacks have disadvantage, DEX saves have disadvantage, attacks against have advantage
Stunned: Incapacitated, can't move, speak falteringly, auto-fail STR/DEX saves, attacks have advantage
Unconscious: Incapacitated, can't move or speak, unaware, drops items, falls prone, auto-fail STR/DEX saves, attacks have advantage, melee crits`,
    keywords: ['condition', 'blinded', 'charmed', 'frightened', 'grappled', 'incapacitated', 'paralyzed', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'],
  },
  {
    id: 'death-saving-throws',
    category: 'Combat',
    title: 'Death Saving Throws',
    content: `When you start your turn at 0 HP, you make a death saving throw.

Roll: d20 (no modifiers)
- 10 or higher: Success
- 9 or lower: Failure
- Natural 1: Two failures
- Natural 20: Regain 1 HP and wake up

Track successes and failures:
- 3 Successes: Stabilize (unconscious but no more saves)
- 3 Failures: Die

Taking Damage at 0 HP:
- Any damage = 1 death save failure
- Critical hit = 2 death save failures
- Massive damage (remaining damage >= max HP) = instant death

Healing at 0 HP: Regain consciousness with healed HP amount`,
    keywords: ['death save', 'death saving throw', 'dying', 'unconscious', '0 HP', 'stabilize', 'instant death'],
  },
  {
    id: 'resting',
    category: 'Core Rules',
    title: 'Resting',
    content: `Short Rest (1+ hours):
- Can spend Hit Dice to heal (roll + CON modifier per die)
- Some abilities recharge on short rest

Long Rest (8+ hours):
- Regain all lost HP
- Regain spent Hit Dice (up to half your total)
- Must sleep at least 6 hours, light activity for 2 hours
- Can't benefit from more than one long rest per 24 hours
- Interrupted by 1+ hour of strenuous activity (walking, fighting, casting)`,
    keywords: ['short rest', 'long rest', 'hit dice', 'heal', 'recover', 'sleep'],
  },
  {
    id: 'opportunity-attacks',
    category: 'Combat',
    title: 'Opportunity Attacks',
    content: `You can make an opportunity attack when a hostile creature you can see moves out of your reach.

Trigger: Creature leaves your reach using its movement, action, or reaction
Reaction: Make one melee attack against the creature

Does NOT trigger:
- Teleportation
- Being moved by external force (shove, spell)
- Falling
- Disengage action was used

Special Features:
- Polearm Master: Trigger when entering reach
- Sentinel: Speed becomes 0 on hit
- War Caster: Cast spell instead of attack`,
    keywords: ['opportunity attack', 'AoO', 'attack of opportunity', 'reaction', 'reach', 'disengage'],
  },
];

/**
 * Spell knowledge entries
 */
export const SPELL_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'spell-fireball',
    category: 'Spells',
    title: 'Fireball',
    content: `Fireball (3rd level Evocation)
Casting Time: 1 action
Range: 150 feet
Components: V, S, M (bat guano and sulfur)
Duration: Instantaneous

A bright streak flashes to a point within range and blossoms into a 20-foot-radius sphere of fire. Each creature must make a DEX save.
- Failed save: 8d6 fire damage
- Successful save: Half damage

The fire spreads around corners and ignites flammable objects not worn or carried.

At Higher Levels: +1d6 damage per slot level above 3rd.`,
    keywords: ['fireball', 'fire', 'evocation', 'damage', 'area', 'dex save'],
  },
  {
    id: 'spell-cure-wounds',
    category: 'Spells',
    title: 'Cure Wounds',
    content: `Cure Wounds (1st level Evocation)
Casting Time: 1 action
Range: Touch
Components: V, S
Duration: Instantaneous

A creature you touch regains 1d8 + your spellcasting modifier hit points. This spell has no effect on undead or constructs.

At Higher Levels: +1d8 healing per slot level above 1st.`,
    keywords: ['cure wounds', 'heal', 'healing', 'touch', 'evocation', 'cleric', 'druid', 'bard', 'paladin', 'ranger'],
  },
  {
    id: 'spell-shield',
    category: 'Spells',
    title: 'Shield',
    content: `Shield (1st level Abjuration)
Casting Time: 1 reaction (when hit by attack or targeted by magic missile)
Range: Self
Components: V, S
Duration: 1 round

An invisible barrier of force appears, granting +5 AC until the start of your next turn, including against the triggering attack. Also blocks magic missile.`,
    keywords: ['shield', 'reaction', 'AC', 'defense', 'abjuration', 'wizard', 'sorcerer'],
  },
  {
    id: 'spell-magic-missile',
    category: 'Spells',
    title: 'Magic Missile',
    content: `Magic Missile (1st level Evocation)
Casting Time: 1 action
Range: 120 feet
Components: V, S
Duration: Instantaneous

You create three glowing darts of force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage. You can direct all darts at one target or split them.

At Higher Levels: +1 dart per slot level above 1st.

Note: Magic Missile always hits unless blocked by Shield spell or similar.`,
    keywords: ['magic missile', 'force damage', 'auto hit', 'evocation', 'wizard', 'sorcerer'],
  },
  {
    id: 'spell-healing-word',
    category: 'Spells',
    title: 'Healing Word',
    content: `Healing Word (1st level Evocation)
Casting Time: 1 bonus action
Range: 60 feet
Components: V
Duration: Instantaneous

A creature of your choice that you can see within range regains 1d4 + your spellcasting modifier hit points. No effect on undead or constructs.

At Higher Levels: +1d4 healing per slot level above 1st.

Note: Bonus action casting allows attacking or casting a cantrip in the same turn.`,
    keywords: ['healing word', 'heal', 'bonus action', 'ranged healing', 'cleric', 'bard', 'druid'],
  },
  {
    id: 'spell-sleep',
    category: 'Spells',
    title: 'Sleep',
    content: `Sleep (1st level Enchantment)
Casting Time: 1 action
Range: 90 feet
Components: V, S, M (sand, rose petals, or cricket)
Duration: 1 minute

Roll 5d8 to determine HP affected. Creatures within 20 feet of a point fall unconscious starting from lowest current HP until the total is exceeded.

At Higher Levels: +2d8 HP per slot level above 1st.

Note: Undead and creatures immune to charm are unaffected. Waking: taking damage, or someone uses action to shake/slap.`,
    keywords: ['sleep', 'enchantment', 'crowd control', 'unconscious', 'charm', 'bard', 'sorcerer', 'wizard'],
  },
  {
    id: 'spell-thunderwave',
    category: 'Spells',
    title: 'Thunderwave',
    content: `Thunderwave (1st level Evocation)
Casting Time: 1 action
Range: Self (15-foot cube)
Components: V, S
Duration: Instantaneous

Each creature in a 15-foot cube originating from you makes a CON save.
- Failed: 2d8 thunder damage, pushed 10 feet away
- Success: Half damage, not pushed

Unsecured objects are automatically pushed 10 feet. Audible 300 feet away.

At Higher Levels: +1d8 damage per slot level above 1st.`,
    keywords: ['thunderwave', 'thunder', 'push', 'knockback', 'area', 'bard', 'druid', 'sorcerer', 'wizard'],
  },
  {
    id: 'spell-hold-person',
    category: 'Spells',
    title: 'Hold Person',
    content: `Hold Person (2nd level Enchantment)
Casting Time: 1 action
Range: 60 feet
Components: V, S, M (iron piece)
Duration: Concentration, up to 1 minute

Target humanoid makes WIS save or is paralyzed. Repeat save at end of each turn to end.

At Higher Levels: Target one additional humanoid per slot level above 2nd (within 30 feet of each other).

Note: Paralyzed means attacks have advantage, melee hits are automatic crits, auto-fail STR/DEX saves.`,
    keywords: ['hold person', 'paralyzed', 'humanoid', 'concentration', 'bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'],
  },
  {
    id: 'spell-counterspell',
    category: 'Spells',
    title: 'Counterspell',
    content: `Counterspell (3rd level Abjuration)
Casting Time: 1 reaction (when creature within 60 feet casts a spell)
Range: 60 feet
Components: S
Duration: Instantaneous

Attempt to interrupt a creature casting a spell.
- 3rd level or lower: Automatically countered
- 4th level or higher: Ability check DC 10 + spell level using your spellcasting ability

At Higher Levels: Automatically counter spells of that level or lower.

Note: Can counter Counterspell. Requires seeing the caster. Identify the spell with reaction (Arcana DC 15 + spell level).`,
    keywords: ['counterspell', 'reaction', 'interrupt', 'abjuration', 'sorcerer', 'warlock', 'wizard'],
  },
  {
    id: 'spell-misty-step',
    category: 'Spells',
    title: 'Misty Step',
    content: `Misty Step (2nd level Conjuration)
Casting Time: 1 bonus action
Range: Self
Components: V
Duration: Instantaneous

Teleport up to 30 feet to an unoccupied space you can see. Surrounded by silvery mist briefly.

Note: Bonus action allows full action use. Great for escaping grapples (no check needed) or repositioning.`,
    keywords: ['misty step', 'teleport', 'bonus action', 'escape', 'conjuration', 'sorcerer', 'warlock', 'wizard'],
  },
];

/**
 * Monster stat blocks
 */
export const MONSTER_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'monster-goblin',
    category: 'Monsters',
    title: 'Goblin',
    content: `GOBLIN (Small humanoid, neutral evil)
AC: 15 (leather armor, shield)
HP: 7 (2d6)
Speed: 30 ft
STR 8 (-1) DEX 14 (+2) CON 10 (+0) INT 10 (+0) WIS 8 (-1) CHA 8 (-1)
Skills: Stealth +6
Senses: Darkvision 60 ft, passive Perception 9
Languages: Common, Goblin
CR: 1/4 (50 XP)

NIMBLE ESCAPE: Disengage or Hide as bonus action each turn.

ACTIONS:
Scimitar: +4 to hit, 5 ft, 1d6+2 slashing
Shortbow: +4 to hit, range 80/320 ft, 1d6+2 piercing`,
    keywords: ['goblin', 'humanoid', 'low cr', 'nimble escape', 'stealth'],
  },
  {
    id: 'monster-skeleton',
    category: 'Monsters',
    title: 'Skeleton',
    content: `SKELETON (Medium undead, lawful evil)
AC: 13 (armor scraps)
HP: 13 (2d8+4)
Speed: 30 ft
STR 10 (+0) DEX 14 (+2) CON 15 (+2) INT 6 (-2) WIS 8 (-1) CHA 5 (-3)
Damage Vulnerabilities: Bludgeoning
Damage Immunities: Poison
Condition Immunities: Exhaustion, Poisoned
Senses: Darkvision 60 ft, passive Perception 9
Languages: Understands languages it knew in life but can't speak
CR: 1/4 (50 XP)

ACTIONS:
Shortsword: +4 to hit, 5 ft, 1d6+2 piercing
Shortbow: +4 to hit, range 80/320 ft, 1d6+2 piercing`,
    keywords: ['skeleton', 'undead', 'bludgeoning vulnerability', 'poison immune'],
  },
  {
    id: 'monster-wolf',
    category: 'Monsters',
    title: 'Wolf',
    content: `WOLF (Medium beast, unaligned)
AC: 13 (natural armor)
HP: 11 (2d8+2)
Speed: 40 ft
STR 12 (+1) DEX 15 (+2) CON 12 (+1) INT 3 (-4) WIS 12 (+1) CHA 6 (-2)
Skills: Perception +3, Stealth +4
Senses: passive Perception 13
CR: 1/4 (50 XP)

KEEN HEARING AND SMELL: Advantage on Perception checks using hearing or smell.
PACK TACTICS: Advantage on attack if ally is within 5 ft of target and ally isn't incapacitated.

ACTIONS:
Bite: +4 to hit, 5 ft, 2d4+2 piercing. Target must succeed DC 11 STR save or be knocked prone.`,
    keywords: ['wolf', 'beast', 'pack tactics', 'knockdown', 'animal'],
  },
  {
    id: 'monster-zombie',
    category: 'Monsters',
    title: 'Zombie',
    content: `ZOMBIE (Medium undead, neutral evil)
AC: 8
HP: 22 (3d8+9)
Speed: 20 ft
STR 13 (+1) DEX 6 (-2) CON 16 (+3) INT 3 (-4) WIS 6 (-2) CHA 5 (-3)
Saving Throws: WIS +0
Damage Immunities: Poison
Condition Immunities: Poisoned
Senses: Darkvision 60 ft, passive Perception 8
Languages: Understands languages it knew in life but can't speak
CR: 1/4 (50 XP)

UNDEAD FORTITUDE: If damage reduces zombie to 0 HP, make CON save (DC 5 + damage taken). Success = drop to 1 HP instead. Doesn't work against radiant damage or critical hits.

ACTIONS:
Slam: +3 to hit, 5 ft, 1d6+1 bludgeoning`,
    keywords: ['zombie', 'undead', 'fortitude', 'slow', 'resilient'],
  },
  {
    id: 'monster-orc',
    category: 'Monsters',
    title: 'Orc',
    content: `ORC (Medium humanoid, chaotic evil)
AC: 13 (hide armor)
HP: 15 (2d8+6)
Speed: 30 ft
STR 16 (+3) DEX 12 (+1) CON 16 (+3) INT 7 (-2) WIS 11 (+0) CHA 10 (+0)
Skills: Intimidation +2
Senses: Darkvision 60 ft, passive Perception 10
Languages: Common, Orc
CR: 1/2 (100 XP)

AGGRESSIVE: As bonus action, move up to your speed toward hostile creature you can see.

ACTIONS:
Greataxe: +5 to hit, 5 ft, 1d12+3 slashing
Javelin: +5 to hit, range 30/120 ft, 1d6+3 piercing`,
    keywords: ['orc', 'humanoid', 'aggressive', 'charge', 'greataxe'],
  },
  {
    id: 'monster-giant-spider',
    category: 'Monsters',
    title: 'Giant Spider',
    content: `GIANT SPIDER (Large beast, unaligned)
AC: 14 (natural armor)
HP: 26 (4d10+4)
Speed: 30 ft, climb 30 ft
STR 14 (+2) DEX 16 (+3) CON 12 (+1) INT 2 (-4) WIS 11 (+0) CHA 4 (-3)
Skills: Stealth +7
Senses: Blindsight 10 ft, Darkvision 60 ft, passive Perception 10
CR: 1 (200 XP)

SPIDER CLIMB: Can climb difficult surfaces, including upside down on ceilings.
WEB SENSE: Knows exact location of any creature touching its web.
WEB WALKER: Ignores movement restrictions from webs.

ACTIONS:
Bite: +5 to hit, 5 ft, 1d8+3 piercing plus 2d8 poison (DC 11 CON save for half).
Web (Recharge 5-6): +5 to hit, range 30/60 ft. Target restrained by webbing. DC 12 STR to break free. Web has AC 10, 5 HP, vulnerability to fire.`,
    keywords: ['spider', 'giant spider', 'beast', 'web', 'poison', 'climb'],
  },
  {
    id: 'monster-ogre',
    category: 'Monsters',
    title: 'Ogre',
    content: `OGRE (Large giant, chaotic evil)
AC: 11 (hide armor)
HP: 59 (7d10+21)
Speed: 40 ft
STR 19 (+4) DEX 8 (-1) CON 16 (+3) INT 5 (-3) WIS 7 (-2) CHA 7 (-2)
Senses: Darkvision 60 ft, passive Perception 8
Languages: Common, Giant
CR: 2 (450 XP)

ACTIONS:
Greatclub: +6 to hit, 5 ft, 2d8+4 bludgeoning
Javelin: +6 to hit, range 30/120 ft, 2d6+4 piercing`,
    keywords: ['ogre', 'giant', 'large', 'brute', 'strong'],
  },
  {
    id: 'monster-owlbear',
    category: 'Monsters',
    title: 'Owlbear',
    content: `OWLBEAR (Large monstrosity, unaligned)
AC: 13 (natural armor)
HP: 59 (7d10+21)
Speed: 40 ft
STR 20 (+5) DEX 12 (+1) CON 17 (+3) INT 3 (-4) WIS 12 (+1) CHA 7 (-2)
Skills: Perception +3
Senses: Darkvision 60 ft, passive Perception 13
CR: 3 (700 XP)

KEEN SIGHT AND SMELL: Advantage on Perception checks using sight or smell.

ACTIONS:
Multiattack: One beak and one claws attack.
Beak: +7 to hit, 5 ft, 1d10+5 piercing
Claws: +7 to hit, 5 ft, 2d8+5 slashing`,
    keywords: ['owlbear', 'monstrosity', 'multiattack', 'beast', 'dangerous'],
  },
  {
    id: 'monster-kobold',
    category: 'Monsters',
    title: 'Kobold',
    content: `KOBOLD (Small humanoid, lawful evil)
AC: 12
HP: 5 (2d6-2)
Speed: 30 ft
STR 7 (-2) DEX 15 (+2) CON 9 (-1) INT 8 (-1) WIS 7 (-2) CHA 8 (-1)
Senses: Darkvision 60 ft, passive Perception 8
Languages: Common, Draconic
CR: 1/8 (25 XP)

SUNLIGHT SENSITIVITY: Disadvantage on attacks and Perception in sunlight.
PACK TACTICS: Advantage on attack if ally is within 5 ft of target and ally isn't incapacitated.

ACTIONS:
Dagger: +4 to hit, 5 ft, 1d4+2 piercing
Sling: +4 to hit, range 30/120 ft, 1d4+2 bludgeoning`,
    keywords: ['kobold', 'humanoid', 'pack tactics', 'sunlight sensitivity', 'draconic'],
  },
  {
    id: 'monster-giant-rat',
    category: 'Monsters',
    title: 'Giant Rat',
    content: `GIANT RAT (Small beast, unaligned)
AC: 12
HP: 7 (2d6)
Speed: 30 ft
STR 7 (-2) DEX 15 (+2) CON 11 (+0) INT 2 (-4) WIS 10 (+0) CHA 4 (-3)
Senses: Darkvision 60 ft, passive Perception 10
CR: 1/8 (25 XP)

KEEN SMELL: Advantage on Perception checks using smell.
PACK TACTICS: Advantage on attack if ally is within 5 ft of target and ally isn't incapacitated.

ACTIONS:
Bite: +4 to hit, 5 ft, 1d4+2 piercing`,
    keywords: ['rat', 'giant rat', 'beast', 'pack tactics', 'vermin', 'sewer'],
  },
  {
    id: 'monster-stirge',
    category: 'Monsters',
    title: 'Stirge',
    content: `STIRGE (Tiny beast, unaligned)
AC: 14 (natural armor)
HP: 2 (1d4)
Speed: 10 ft, fly 40 ft
STR 4 (-3) DEX 16 (+3) CON 11 (+0) INT 2 (-4) WIS 8 (-1) CHA 6 (-2)
Senses: Darkvision 60 ft, passive Perception 9
CR: 1/8 (25 XP)

ACTIONS:
Blood Drain: +5 to hit, 5 ft, 1d4+3 piercing. Stirge attaches to target. While attached, deals 1d4+3 necrotic damage at start of each of its turns.

Attached stirge can be removed by target or another creature using action (DC 10 STR). The stirge detaches after draining 10 HP or if target dies.`,
    keywords: ['stirge', 'beast', 'blood drain', 'flying', 'attach', 'vampire'],
  },
  {
    id: 'monster-bandit',
    category: 'Monsters',
    title: 'Bandit',
    content: `BANDIT (Medium humanoid, any non-lawful)
AC: 12 (leather armor)
HP: 11 (2d8+2)
Speed: 30 ft
STR 11 (+0) DEX 12 (+1) CON 12 (+1) INT 10 (+0) WIS 10 (+0) CHA 10 (+0)
Senses: passive Perception 10
Languages: Any one language (usually Common)
CR: 1/8 (25 XP)

ACTIONS:
Scimitar: +3 to hit, 5 ft, 1d6+1 slashing
Light Crossbow: +3 to hit, range 80/320 ft, 1d8+1 piercing`,
    keywords: ['bandit', 'humanoid', 'criminal', 'thief', 'robber', 'outlaw'],
  },
  {
    id: 'monster-ghoul',
    category: 'Monsters',
    title: 'Ghoul',
    content: `GHOUL (Medium undead, chaotic evil)
AC: 12
HP: 22 (5d8)
Speed: 30 ft
STR 13 (+1) DEX 15 (+2) CON 10 (+0) INT 7 (-2) WIS 10 (+0) CHA 6 (-2)
Damage Immunities: Poison
Condition Immunities: Charmed, Exhaustion, Poisoned
Senses: Darkvision 60 ft, passive Perception 10
Languages: Common
CR: 1 (200 XP)

ACTIONS:
Bite: +2 to hit, 5 ft, 2d6+2 piercing
Claws: +4 to hit, 5 ft, 2d4+2 slashing. Target must succeed DC 10 CON save or be paralyzed for 1 minute. Target can repeat save at end of each turn. Elves are immune to this paralysis.`,
    keywords: ['ghoul', 'undead', 'paralysis', 'claw', 'bite', 'charnel'],
  },
  {
    id: 'monster-bugbear',
    category: 'Monsters',
    title: 'Bugbear',
    content: `BUGBEAR (Medium humanoid, chaotic evil)
AC: 16 (hide armor, shield)
HP: 27 (5d8+5)
Speed: 30 ft
STR 15 (+2) DEX 14 (+2) CON 13 (+1) INT 8 (-1) WIS 11 (+0) CHA 9 (-1)
Skills: Stealth +6, Survival +2
Senses: Darkvision 60 ft, passive Perception 10
Languages: Common, Goblin
CR: 1 (200 XP)

BRUTE: Melee weapon deals one extra die of damage (included in attack).
SURPRISE ATTACK: If bugbear surprises a creature and hits on first turn, extra 2d6 damage.

ACTIONS:
Morningstar: +4 to hit, 5 ft, 2d8+2 piercing
Javelin: +4 to hit, range 30/120 ft, 2d6+2 piercing`,
    keywords: ['bugbear', 'humanoid', 'goblinoid', 'brute', 'surprise attack', 'ambush'],
  },
  {
    id: 'monster-dire-wolf',
    category: 'Monsters',
    title: 'Dire Wolf',
    content: `DIRE WOLF (Large beast, unaligned)
AC: 14 (natural armor)
HP: 37 (5d10+10)
Speed: 50 ft
STR 17 (+3) DEX 15 (+2) CON 15 (+2) INT 3 (-4) WIS 12 (+1) CHA 7 (-2)
Skills: Perception +3, Stealth +4
Senses: passive Perception 13
CR: 1 (200 XP)

KEEN HEARING AND SMELL: Advantage on Perception checks using hearing or smell.
PACK TACTICS: Advantage on attack if ally is within 5 ft of target and ally isn't incapacitated.

ACTIONS:
Bite: +5 to hit, 5 ft, 2d6+3 piercing. Target must succeed DC 13 STR save or be knocked prone.`,
    keywords: ['dire wolf', 'wolf', 'beast', 'pack tactics', 'knockdown', 'large'],
  },
  {
    id: 'monster-wight',
    category: 'Monsters',
    title: 'Wight',
    content: `WIGHT (Medium undead, neutral evil)
AC: 14 (studded leather)
HP: 45 (6d8+18)
Speed: 30 ft
STR 15 (+2) DEX 14 (+2) CON 16 (+3) INT 10 (+0) WIS 13 (+1) CHA 15 (+2)
Skills: Perception +3, Stealth +4
Damage Resistances: Necrotic; Bludgeoning, Piercing, Slashing from nonmagical weapons not silvered
Damage Immunities: Poison
Condition Immunities: Exhaustion, Poisoned
Senses: Darkvision 60 ft, passive Perception 13
Languages: Languages it knew in life
CR: 3 (700 XP)

SUNLIGHT SENSITIVITY: Disadvantage on attacks and Perception in sunlight.

ACTIONS:
Multiattack: Two longsword attacks or two longbow attacks.
Life Drain: +4 to hit, 5 ft, 1d6+2 necrotic. Target must succeed DC 13 CON save or HP max reduced by damage taken. Target dies if reduced to 0 HP max. Reduction lasts until long rest.
Longsword: +4 to hit, 5 ft, 1d8+2 slashing
Longbow: +4 to hit, range 150/600 ft, 1d8+2 piercing`,
    keywords: ['wight', 'undead', 'life drain', 'necrotic', 'sunlight sensitivity', 'intelligent undead'],
  },
  {
    id: 'monster-minotaur',
    category: 'Monsters',
    title: 'Minotaur',
    content: `MINOTAUR (Large monstrosity, chaotic evil)
AC: 14 (natural armor)
HP: 76 (9d10+27)
Speed: 40 ft
STR 18 (+4) DEX 11 (+0) CON 16 (+3) INT 6 (-2) WIS 16 (+3) CHA 9 (-1)
Skills: Perception +7
Senses: Darkvision 60 ft, passive Perception 17
Languages: Abyssal
CR: 3 (700 XP)

CHARGE: If moves at least 10 ft straight toward target and hits with gore, extra 2d8 piercing. Target must succeed DC 14 STR save or be pushed 10 ft and knocked prone.
LABYRINTHINE RECALL: Can perfectly recall any path it has traveled.
RECKLESS: At start of turn, can gain advantage on all melee attacks, but attacks against it have advantage until next turn.

ACTIONS:
Greataxe: +6 to hit, 5 ft, 2d12+4 slashing
Gore: +6 to hit, 5 ft, 2d8+4 piercing`,
    keywords: ['minotaur', 'monstrosity', 'charge', 'labyrinth', 'maze', 'horns', 'reckless'],
  },
  {
    id: 'monster-troll',
    category: 'Monsters',
    title: 'Troll',
    content: `TROLL (Large giant, chaotic evil)
AC: 15 (natural armor)
HP: 84 (8d10+40)
Speed: 30 ft
STR 18 (+4) DEX 13 (+1) CON 20 (+5) INT 7 (-2) WIS 9 (-1) CHA 7 (-2)
Skills: Perception +2
Senses: Darkvision 60 ft, passive Perception 12
Languages: Giant
CR: 5 (1,800 XP)

KEEN SMELL: Advantage on Perception checks using smell.
REGENERATION: Regains 10 HP at start of its turn. If takes acid or fire damage, this trait doesn't function at start of its next turn. Dies only if starts turn at 0 HP and doesn't regenerate.

ACTIONS:
Multiattack: Three attacks: one bite and two claws.
Bite: +7 to hit, 5 ft, 1d6+4 piercing
Claw: +7 to hit, 5 ft, 2d6+4 slashing`,
    keywords: ['troll', 'giant', 'regeneration', 'fire', 'acid', 'multiattack', 'dangerous'],
  },
];

/**
 * Simple text similarity for keyword matching
 */
function calculateRelevance(query: string, entry: KnowledgeEntry): number {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/);

  let score = 0;

  // Check title match
  if (entry.title.toLowerCase().includes(queryLower)) {
    score += 10;
  }

  // Check keyword matches
  for (const keyword of entry.keywords) {
    if (queryLower.includes(keyword.toLowerCase())) {
      score += 5;
    }
    for (const word of words) {
      if (keyword.toLowerCase().includes(word) && word.length > 2) {
        score += 2;
      }
    }
  }

  // Check content matches
  const contentLower = entry.content.toLowerCase();
  for (const word of words) {
    if (word.length > 2 && contentLower.includes(word)) {
      score += 1;
    }
  }

  return score;
}

/**
 * Knowledge base for RAG retrieval
 */
export class SRDKnowledgeBase {
  private entries: KnowledgeEntry[] = [];

  constructor() {
    this.entries = [...CORE_RULES, ...SPELL_KNOWLEDGE, ...MONSTER_KNOWLEDGE];
  }

  /**
   * Add custom entries
   */
  addEntry(entry: KnowledgeEntry): void {
    this.entries.push(entry);
  }

  /**
   * Search for relevant entries
   */
  search(query: string, maxResults: number = 3): KnowledgeEntry[] {
    const scored = this.entries.map((entry) => ({
      entry,
      score: calculateRelevance(query, entry),
    }));

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((s) => s.entry);
  }

  /**
   * Get entry by ID
   */
  getById(id: string): KnowledgeEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  /**
   * Get entries by category
   */
  getByCategory(category: string): KnowledgeEntry[] {
    return this.entries.filter((e) => e.category === category);
  }

  /**
   * Format entries for LLM context
   */
  formatForContext(entries: KnowledgeEntry[]): string {
    if (entries.length === 0) return '';

    const sections = entries.map((e) => `### ${e.title}\n${e.content}`);
    return `RELEVANT RULES:\n\n${sections.join('\n\n---\n\n')}`;
  }
}
