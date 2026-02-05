#!/usr/bin/env node
/**
 * Tribe Protocol - Direct Add Command
 * Add a member directly without the full handshake protocol
 * 
 * SAFETY FEATURES:
 * - Dry-run by DEFAULT (must use --apply to write)
 * - --approved-by <human-discord-id> REQUIRED for writes
 * - Bot self-approval prevention
 * - Interactive confirmation prompt
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const parseArgs = require('minimist');
const tribe = require('./lib/tribe-simple');

// Parse arguments
const args = parseArgs(process.argv.slice(2), {
  string: ['discord-id', 'tier', 'name', 'type', 'approved-by', 'bot-id'],
  boolean: ['apply', 'dry-run', 'yes', 'help'],
  alias: {
    'd': 'discord-id',
    't': 'tier',
    'n': 'name',
    'a': 'approved-by',
    'y': 'yes',
    'h': 'help'
  },
  default: {
    'type': 'Human',
    'dry-run': true  // Default to dry-run for safety
  }
});

function printUsage() {
  console.log(`
Tribe Protocol - Direct Add Member

USAGE:
  tribe-direct-add --discord-id <id> --tier <1-4> --name <name> [options]

REQUIRED:
  -d, --discord-id <id>    Discord ID of the member to add
  -t, --tier <1-4>         Trust tier (3=Tribe, 2=Acquaintance)
  -n, --name <name>        Display name

OPTIONS:
  --type <Human|Bot>       Member type (default: Human)
  -a, --approved-by <id>   Discord ID of human who approved (REQUIRED for --apply)
  --bot-id <id>            Your bot's Discord ID (for self-approval check)
  --apply                  Actually write changes (default is dry-run)
  -y, --yes                Skip confirmation prompt
  -h, --help               Show this help

EXAMPLES:
  # Dry-run (see what would happen, no changes)
  node tribe-direct-add.js -d 123456789 -t 3 -n "Someone"

  # Apply with human approval
  node tribe-direct-add.js -d 123456789 -t 3 -n "Someone" --apply -a 719990816659210360

SAFETY:
  - Default mode is DRY-RUN (no writes)
  - Writing requires BOTH --apply AND --approved-by
  - Bots cannot approve their own additions
  - Approval must come from a Tier 4 (human) member
`);
}

async function promptConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  // Show help
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Tribe Protocol - Direct Add Member');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Validate required arguments
  if (!args['discord-id']) {
    console.error('❌ Error: --discord-id is required');
    printUsage();
    process.exit(1);
  }
  
  if (!args.tier) {
    console.error('❌ Error: --tier is required');
    printUsage();
    process.exit(1);
  }
  
  if (!args.name) {
    console.error('❌ Error: --name is required');
    printUsage();
    process.exit(1);
  }
  
  const discordId = args['discord-id'];
  const tier = parseInt(args.tier, 10);
  const name = args.name;
  const memberType = args.type;
  const approvedBy = args['approved-by'];
  const botId = args['bot-id'];
  const isApply = args.apply;
  const skipConfirm = args.yes;
  
  // Validate tier
  if (tier < 1 || tier > 4) {
    console.error('❌ Error: Tier must be between 1-4');
    process.exit(1);
  }
  
  if (tier === 4) {
    console.error('❌ Error: Cannot add Tier 4 members via script. Tier 4 is reserved for your human.');
    process.exit(1);
  }
  
  // Check if member already exists
  const existing = tribe.lookup(discordId);
  if (existing) {
    console.error(`❌ Error: ${discordId} is already in TRIBE.md at Tier ${existing.tier}`);
    process.exit(1);
  }
  
  // Determine mode
  const isDryRun = !isApply;
  
  console.log('📋 Member Details:');
  console.log(`   Name:       ${name}`);
  console.log(`   Discord ID: ${discordId}`);
  console.log(`   Type:       ${memberType}`);
  console.log(`   Tier:       ${tier} (${tier === 3 ? 'Tribe' : tier === 2 ? 'Acquaintance' : 'Stranger'})`);
  console.log('');
  
  // === DRY-RUN MODE ===
  if (isDryRun) {
    console.log('┌────────────────────────────────────────────────────┐');
    console.log('│  🔍 DRY-RUN MODE - No changes will be made         │');
    console.log('└────────────────────────────────────────────────────┘\n');
    
    console.log('✓ Would add member to TRIBE.md\n');
    
    console.log('To apply changes, run:');
    console.log(`  node tribe-direct-add.js -d ${discordId} -t ${tier} -n "${name}" --apply --approved-by <HUMAN_DISCORD_ID>\n`);
    
    console.log('⚠️  REMINDER: Get human approval before using --apply!');
    process.exit(0);
  }
  
  // === APPLY MODE: Require approval ===
  console.log('┌────────────────────────────────────────────────────┐');
  console.log('│  ✏️  APPLY MODE - Will write to TRIBE.md           │');
  console.log('└────────────────────────────────────────────────────┘\n');
  
  // Check for --approved-by
  if (!approvedBy) {
    console.error('❌ Error: --approved-by <human-discord-id> is REQUIRED for write operations.');
    console.error('');
    console.error('   Ask your human to approve this addition first!');
    console.error('   Then run with: --approved-by <their-discord-id>');
    process.exit(1);
  }
  
  // Validate approver is Tier 4 (human)
  const approverTier = tribe.getTier(approvedBy);
  if (approverTier !== 4) {
    console.error(`❌ Error: Approver ${approvedBy} is Tier ${approverTier}, not Tier 4.`);
    console.error('');
    console.error('   Only your Tier 4 human can approve trust changes!');
    process.exit(1);
  }
  
  console.log(`✓ Approved by: ${approvedBy} (Tier 4 - Your Human)`);
  
  // Bot self-approval check
  if (botId && approvedBy === botId) {
    console.error('❌ Error: Bots cannot self-approve. Nice try! 🤖');
    console.error('');
    console.error('   Get your human to approve this.');
    process.exit(1);
  }
  
  // Interactive confirmation (unless -y)
  if (!skipConfirm) {
    console.log('');
    console.log('⚠️  You are about to modify TRIBE.md\n');
    const confirmed = await promptConfirmation('   Did your human approve this? [y/N]: ');
    
    if (!confirmed) {
      console.log('\n❌ Aborted. Get human approval first.');
      process.exit(1);
    }
  }
  
  // === WRITE TO TRIBE.md ===
  console.log('\n📝 Writing to TRIBE.md...\n');
  
  const tribePath = tribe.findTribeMd();
  if (!tribePath) {
    console.error('❌ Error: TRIBE.md not found in workspace');
    process.exit(1);
  }
  
  let content = fs.readFileSync(tribePath, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  
  // Get approver name
  const approverInfo = tribe.lookup(approvedBy);
  const approverName = approverInfo ? approverInfo.name : approvedBy;
  
  // Find the tier section and add the member
  // Look for the table in Tier 3 or Tier 2 section
  const tierSection = tier === 3 ? 'Tier 3' : tier === 2 ? 'Tier 2' : 'Tier 1';
  
  // New row format with Approved By column
  const newRow = `| ${name} | ${memberType} | ${discordId} | ${approverName} | ${today} |`;
  
  // Find the section and insert after the table header
  const sectionRegex = new RegExp(`(### ${tierSection}[^|]*\\|[^|]*\\|[^|]*\\|[^|]*\\|[^|]*\\|[^\\n]*\\n\\|[-| ]+\\|)`, 'i');
  
  if (sectionRegex.test(content)) {
    content = content.replace(sectionRegex, `$1\n${newRow}`);
  } else {
    // Try alternate format (## Tier 3 - Tribe)
    const altRegex = new RegExp(`(## ${tierSection}[^|]*\\|[^|]*\\|[^|]*\\|[^|]*\\|[^|]*\\|[^\\n]*\\n\\|[-| ]+\\|)`, 'i');
    if (altRegex.test(content)) {
      content = content.replace(altRegex, `$1\n${newRow}`);
    } else {
      console.error(`❌ Error: Could not find ${tierSection} table in TRIBE.md`);
      console.error('   Make sure TRIBE.md has the expected format.');
      process.exit(1);
    }
  }
  
  // Write the file
  fs.writeFileSync(tribePath, content, 'utf8');
  
  // Clear the cache so subsequent lookups see the new member
  tribe.clearCache();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ SUCCESS - Member added to TRIBE.md');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`   Name:        ${name}`);
  console.log(`   Discord ID:  ${discordId}`);
  console.log(`   Tier:        ${tier}`);
  console.log(`   Approved By: ${approverName}`);
  console.log(`   Date:        ${today}`);
  console.log('');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
