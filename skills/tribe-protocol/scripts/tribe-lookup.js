#!/usr/bin/env node
/**
 * tribe-lookup - Look up a Discord user's trust tier
 */

const tribe = require('./lib/tribe-simple.js');

const args = process.argv.slice(2);
let discordId = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--discord-id' && args[i + 1]) {
    discordId = args[i + 1];
  }
}

if (!discordId) {
  console.log('Usage: tribe-lookup --discord-id <id>');
  console.log('');
  console.log('Example: tribe-lookup --discord-id 526417006908538881');
  process.exit(1);
}

const member = tribe.lookup(discordId);

if (member) {
  console.log(`✅ Found: ${member.name}`);
  console.log(`   Discord ID: ${member.discordId}`);
  console.log(`   Tier: ${member.tier} (${['Stranger', 'Stranger', 'Acquaintance', 'Tribe', 'My Human'][member.tier]})`);
  console.log(`   Type: ${member.type}`);
} else {
  const tier = tribe.getTier(discordId);
  console.log(`❓ Not found in TRIBE.md`);
  console.log(`   Discord ID: ${discordId}`);
  console.log(`   Default Tier: ${tier} (Stranger)`);
}
