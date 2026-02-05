#!/usr/bin/env node
/**
 * tribe-list - List all tribe members
 */

const tribe = require('./lib/tribe-simple.js');

const args = process.argv.slice(2);
let tierFilter = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tier' && args[i + 1]) {
    tierFilter = parseInt(args[i + 1]);
  }
}

const tierNames = {
  4: 'My Human',
  3: 'Tribe',
  2: 'Acquaintance',
  1: 'Stranger'
};

const members = tribe.listMembers(tierFilter);

if (members.length === 0) {
  if (tierFilter) {
    console.log(`No members found at Tier ${tierFilter}`);
  } else {
    console.log('No members found in TRIBE.md');
  }
  process.exit(0);
}

// Group by tier for display
const byTier = {};
for (const m of members) {
  if (!byTier[m.tier]) byTier[m.tier] = [];
  byTier[m.tier].push(m);
}

for (const tier of [4, 3, 2, 1]) {
  if (!byTier[tier]) continue;
  
  console.log(`\n## Tier ${tier} - ${tierNames[tier]}`);
  console.log('');
  
  for (const m of byTier[tier]) {
    console.log(`  • ${m.name}`);
    console.log(`    Discord: ${m.discordId}`);
    if (m.type && m.type !== 'Unknown') {
      console.log(`    Type: ${m.type}`);
    }
  }
}

console.log(`\nTotal: ${members.length} member(s)`);
