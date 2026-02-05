# Tribe Protocol Skill

## ⚠️ CRITICAL: Human Approval Required

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   EVERY change to TRIBE.md requires explicit human approval.   │
│                                                                 │
│   • Ask your Tier 4 human BEFORE running any write command      │
│   • Use --approved-by <human-discord-id> flag                   │
│   • Never self-approve tier changes                             │
│   • "Test" means test. Not live writes.                         │
│                                                                 │
│   This is not optional. Bots cannot add members without         │
│   human consent. Violating this rule breaks trust.              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Overview

Simple trust framework for multi-agent collaboration. No crypto — Discord handles identity, humans approve trust changes.

Tribe Protocol provides:
1. **4-tier trust model** for categorizing relationships
2. **Privacy boundaries** per tier
3. **Lookup tools** for checking trust levels
4. **TRIBE.md template** for tracking members

## Trust Tiers

| Tier | Name | Description | Behavior |
|------|------|-------------|----------|
| 4 | My Human | The bot's owner | Full trust, follow USER.md |
| 3 | Tribe | Approved collaborators | Collaborate freely, protect Tier 4 info |
| 2 | Acquaintance | Known but limited trust | Polite, bounded interactions |
| 1 | Stranger | Unknown/default | Minimal engagement |

## Core Rules

1. **⚠️ HUMAN APPROVAL REQUIRED** — Every TRIBE.md change needs Tier 4 approval. NO EXCEPTIONS.
2. **Dry-run by default** — Scripts default to showing what would happen. Use `--apply` to actually write.
3. **Approval audit trail** — All additions logged with who approved them.
4. **Cross-platform linking** — Same person on Discord vs X? Confirm with human first.
5. **Group channel rule** — Apply lowest tier present for privacy decisions.
6. **Default to Tier 1** — Unknown = stranger until human says otherwise.

## Safety Features

The scripts include multiple safety layers:

1. **Dry-run by default** — No `--apply` flag = no writes
2. **`--approved-by` required** — Must specify the human who approved
3. **Tier 4 validation** — Only Tier 4 (your human) can approve
4. **Bot self-approval blocked** — Bots cannot approve their own additions
5. **Interactive confirmation** — Asks "Did your human approve this?" before writing
6. **Audit trail** — "Approved By" column in TRIBE.md tracks who approved what

## Privacy Boundaries

### Tier 3 CAN access:
- Project work, code, prototypes
- Research findings
- Technical discussions
- Shared work products

### Tier 3 CANNOT access:
- USER.md, MEMORY.md contents
- Personal info (address, phone, family)
- Health data, financial info
- Calendar details

## Installation

```bash
# Copy to your skills folder
cp -r tribe-protocol ~/your-workspace/skills/

# Install dependencies
cd skills/tribe-protocol && npm install
```

## Usage

### Adding Members (with approval)

```bash
# Step 1: DRY-RUN (default) - See what would happen
node scripts/tribe-direct-add.js \
  --discord-id 1234567890 \
  --tier 3 \
  --name "NewMember" \
  --type Bot

# Output shows what WOULD be added, no changes made

# Step 2: GET HUMAN APPROVAL (required!)
# Ask your Tier 4 human: "Can I add NewMember to the tribe?"

# Step 3: APPLY with approval
node scripts/tribe-direct-add.js \
  --discord-id 1234567890 \
  --tier 3 \
  --name "NewMember" \
  --type Bot \
  --apply \
  --approved-by 719990816659210360
```

### CLI Tools (read-only)

```bash
# Look up a Discord user's tier
node scripts/tribe-lookup.js --discord-id 526417006908538881

# List all tribe members
node scripts/tribe-list.js

# List by tier
node scripts/tribe-list.js --tier 3

# Verify if someone is tribe (tier 3+)
node scripts/tribe-verify.js --discord-id 526417006908538881
```

### Node.js Module

```javascript
const tribe = require('./scripts/lib/tribe-simple.js');

// Check tier
const tier = tribe.getTier('526417006908538881');  // Returns 1-4

// Check if tribe member
const isTribe = tribe.isTribeMember('526417006908538881');  // Returns boolean

// Check if my human
const isHuman = tribe.isMyHuman('719990816659210360');  // Returns boolean

// Get lowest tier in a group
const groupTier = tribe.getGroupTier(['719990816659210360', '526417006908538881']);  // Returns 3
```

## TRIBE.md Template

Create `TRIBE.md` in your workspace root. Note the "Approved By" column for audit trail:

```markdown
# TRIBE.md - Trust Registry

## ⚠️ CRITICAL RULE
Every change requires human approval.

## Tier 4 - My Human
| Name | Discord ID | Other Platforms |
|------|------------|-----------------|
| YourHuman | 123456789 | @handle (X) |

## Tier 3 - Tribe
| Name | Type | Discord ID | Approved By | Added |
|------|------|------------|-------------|-------|
| Collaborator1 | Human | 987654321 | @YourHuman | 2026-01-15 |
| TheirBot | Bot | 111222333 | @YourHuman | 2026-01-15 |

## Tier 2 - Acquaintances
| Name | Type | Discord ID | Approved By | Added |
|------|------|------------|-------------|-------|
```

## Integration with AGENTS.md

Add to your AGENTS.md:

```markdown
## Trust Rules

Before every response:
1. Identify sender by Discord ID
2. Look up tier in TRIBE.md
3. Apply tier behavior
4. If unknown → Tier 1

Adding to Tier 3:
- ALWAYS ask your human first
- Use --approved-by flag when adding
- Never self-approve tier upgrades

In group channels:
- Use lowest tier present for privacy
```

## Why No Crypto?

We originally built DIDs, keypairs, and signing. Research showed it was overkill:

- **Discord already verifies identity** — Discord IDs are unique and authenticated
- **Human-in-the-loop is simpler** — Ask your human instead of cryptographic handshakes
- **Build complexity when needed** — If you need cross-platform identity verification without Discord, add crypto then

## Files

```
tribe-protocol/
├── SKILL.md              # This file
├── scripts/
│   ├── tribe-direct-add.js   # Add members (with approval checks)
│   ├── tribe-lookup.js       # Look up Discord ID → tier
│   ├── tribe-list.js         # List all members
│   ├── tribe-verify.js       # Check if tier 3+
│   └── lib/
│       └── tribe-simple.js   # Node module
├── assets/
│   └── TRIBE.md.template     # Template for TRIBE.md
└── package.json
```

## Changelog

- **v2.1.0** (2026-02-02): Bulletproof safety - dry-run default, --approved-by required, audit trail
- **v2.0.0** (2026-02-02): Simplified — removed crypto, human-in-the-loop model
- **v1.0.0** (2026-01-31): Initial release with DIDs (deprecated)
