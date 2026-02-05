#!/usr/bin/env node
/**
 * tribe-verify - Quick check if someone is a tribe member (tier 3+)
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
  console.log('Usage: tribe-verify --discord-id <id>');
  console.log('');
  console.log('Returns exit code 0 if tribe member (tier 3+), 1 if not.');
  process.exit(1);
}

const isTribe = tribe.isTribeMember(discordId);
const tier = tribe.getTier(discordId);
const member = tribe.lookup(discordId);

if (isTribe) {
  console.log(`✅ VERIFIED: ${member ? member.name : discordId} is a tribe member`);
  console.log(`   Tier: ${tier}`);
  process.exit(0);
} else {
  console.log(`❌ NOT TRIBE: ${discordId}`);
  console.log(`   Tier: ${tier} (${tier === 2 ? 'Acquaintance' : 'Stranger'})`);
  process.exit(1);
}
