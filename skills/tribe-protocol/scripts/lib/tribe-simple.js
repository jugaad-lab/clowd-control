/**
 * Tribe Protocol - Simple Trust Module
 * 
 * No crypto. Discord handles identity. Human approves trust changes.
 */

const fs = require('fs');
const path = require('path');

// Cache for TRIBE.md parsing
let tribeCache = null;
let tribeCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Find TRIBE.md in workspace
 */
function findTribeMd() {
  const possiblePaths = [
    path.join(process.env.HOME, 'clawd', 'TRIBE.md'),
    path.join(process.cwd(), 'TRIBE.md'),
    path.join(process.cwd(), '..', '..', 'TRIBE.md'),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Parse TRIBE.md and extract members by tier
 */
function parseTribeMd() {
  const now = Date.now();
  if (tribeCache && (now - tribeCacheTime) < CACHE_TTL) {
    return tribeCache;
  }

  const tribePath = findTribeMd();
  if (!tribePath) {
    console.error('TRIBE.md not found');
    return { tier4: [], tier3: [], tier2: [], tier1: [] };
  }

  const content = fs.readFileSync(tribePath, 'utf8');
  const members = { tier4: [], tier3: [], tier2: [], tier1: [] };
  
  let currentTier = null;
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Detect tier sections
    if (line.includes('Tier 4') || line.includes('My Human')) {
      currentTier = 'tier4';
    } else if (line.includes('Tier 3') || line.includes('Tribe')) {
      currentTier = 'tier3';
    } else if (line.includes('Tier 2') || line.includes('Acquaintance')) {
      currentTier = 'tier2';
    } else if (line.includes('Tier 1') || line.includes('Stranger')) {
      currentTier = 'tier1';
    }
    
    // Parse table rows (look for Discord IDs - 17-19 digit numbers)
    if (currentTier && line.includes('|')) {
      const discordMatch = line.match(/\b(\d{17,19})\b/);
      if (discordMatch) {
        const parts = line.split('|').map(p => p.trim()).filter(p => p);
        members[currentTier].push({
          name: parts[0] || 'Unknown',
          discordId: discordMatch[1],
          type: parts[1] || 'Unknown',
          raw: line
        });
      }
    }
  }
  
  tribeCache = members;
  tribeCacheTime = now;
  return members;
}

/**
 * Get tier for a Discord ID
 * @param {string} discordId 
 * @returns {number} 1-4
 */
function getTier(discordId) {
  const members = parseTribeMd();
  const id = String(discordId);
  
  if (members.tier4.some(m => m.discordId === id)) return 4;
  if (members.tier3.some(m => m.discordId === id)) return 3;
  if (members.tier2.some(m => m.discordId === id)) return 2;
  return 1; // Default: stranger
}

/**
 * Check if Discord ID is a tribe member (tier 3+)
 * @param {string} discordId 
 * @returns {boolean}
 */
function isTribeMember(discordId) {
  return getTier(discordId) >= 3;
}

/**
 * Check if Discord ID is my human (tier 4)
 * @param {string} discordId 
 * @returns {boolean}
 */
function isMyHuman(discordId) {
  return getTier(discordId) === 4;
}

/**
 * Get lowest tier from a list of Discord IDs (for group channels)
 * @param {string[]} discordIds 
 * @returns {number} 1-4
 */
function getGroupTier(discordIds) {
  if (!discordIds || discordIds.length === 0) return 1;
  return Math.min(...discordIds.map(id => getTier(id)));
}

/**
 * Look up full member info by Discord ID
 * @param {string} discordId 
 * @returns {object|null}
 */
function lookup(discordId) {
  const members = parseTribeMd();
  const id = String(discordId);
  
  for (const [tierName, tierMembers] of Object.entries(members)) {
    const found = tierMembers.find(m => m.discordId === id);
    if (found) {
      return {
        ...found,
        tier: parseInt(tierName.replace('tier', '')),
        tierName: tierName
      };
    }
  }
  return null;
}

/**
 * List all members, optionally filtered by tier
 * @param {number} tier - Optional tier filter (1-4)
 * @returns {object[]}
 */
function listMembers(tier = null) {
  const members = parseTribeMd();
  const all = [];
  
  for (const [tierName, tierMembers] of Object.entries(members)) {
    const tierNum = parseInt(tierName.replace('tier', ''));
    if (tier === null || tierNum === tier) {
      for (const m of tierMembers) {
        all.push({ ...m, tier: tierNum });
      }
    }
  }
  
  return all;
}

/**
 * Clear the cache (useful after TRIBE.md updates)
 */
function clearCache() {
  tribeCache = null;
  tribeCacheTime = 0;
}

module.exports = {
  getTier,
  isTribeMember,
  isMyHuman,
  getGroupTier,
  lookup,
  listMembers,
  clearCache,
  findTribeMd,
  parseTribeMd
};
