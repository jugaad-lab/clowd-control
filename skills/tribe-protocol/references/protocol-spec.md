# Tribe Protocol - Technical Specification v1.0.0

## Overview

Tribe Protocol is a decentralized trust framework for AI agent collaboration, providing cryptographic identity verification, trust tier management, and privacy boundary enforcement.

## Architecture

### Three-Layer System

```
┌─────────────────────────────────────────────────────────┐
│                  IDENTITY LAYER                         │
│  Individual Keypair (Ed25519)                          │
│  - Proves WHO you are                                   │
│  - Your personal DID: did:tribe:<name>:<hash>          │
│  - Never shared                                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 MEMBERSHIP LAYER                        │
│  Tribe Keypair (Ed25519)                               │
│  - Proves you're IN THE TRIBE                          │
│  - Shared secret among tribe members only              │
│  - Used for authentication                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 COMMUNICATION LAYER                     │
│  Session Keys (Diffie-Hellman → AES)                   │
│  - Fast symmetric encryption                            │
│  - 24h expiry, auto-renew (Phase 3)                    │
│  - Pairwise (Alice ↔ Bob)                              │
└─────────────────────────────────────────────────────────┘
```

## Cryptography

### Ed25519 Signatures
- **Algorithm:** Ed25519 (via TweetNaCl)
- **Key Size:** 32 bytes private, 32 bytes public
- **Purpose:** Identity verification, message signing
- **Security:** 128-bit security level

### Diffie-Hellman Key Exchange (Phase 3)
- **Algorithm:** Curve25519 (X25519)
- **Purpose:** Establish shared session keys
- **Security:** Forward secrecy (old sessions can't decrypt new messages)

### AES Encryption (Phase 3)
- **Algorithm:** XSalsa20-Poly1305 (via NaCl secretbox)
- **Purpose:** Session message encryption
- **Key Size:** 32 bytes
- **Nonce:** 24 bytes (randomized per message)

## DID Format

### Structure
```
did:tribe:<name>:<hash>
```

### Components
- **Method:** `tribe` (Tribe Protocol-specific)
- **Name:** Entity name (lowercase, hyphens allowed)
- **Hash:** First 6 chars of SHA-256(publicKey)

### Examples
- `did:tribe:cheenu:abc123`
- `did:tribe:<admin>-bot:def456`
- `did:tribe:chhotu:789xyz`

### Tribe ID Format
```
tribe:<name>:<hash>
```

Similar to DID but without `did:` prefix.

## DID Document Schema

```json
{
  "tribe_did": "did:tribe:cheenu:abc123",
  "format_version": "1.0.0",
  "entity_type": "bot",
  "created": "2025-02-01T00:00:00Z",
  "public_key": "<base64-encoded-ed25519-public-key>",
  "platforms": {
    "discord": {
      "user_id": "1234567890",
      "username": "cheenu-bot"
    }
  },
  "human_operator": {
    "tribe_did": "did:tribe:nag:xyz789",
    "relationship": "primary"
  }
}
```

### Required Fields
- `tribe_did` - DID string
- `format_version` - Protocol version ("1.0.0")
- `entity_type` - "bot" or "human"
- `created` - ISO 8601 timestamp
- `public_key` - Base64-encoded Ed25519 public key

### Optional Fields
- `platforms` - Platform identities (Discord, GitHub, etc.)
- `human_operator` - For bots: their human operator's DID

## Tribe Manifest Schema

```json
{
  "tribe_id": "tribe:my-tribe:xyz789",
  "name": "My Tribe",
  "created": "2025-02-01T00:00:00Z",
  "founder": "did:tribe:cheenu:abc123",
  "members": [
    {
      "did": "did:tribe:cheenu:abc123",
      "tier": 4,
      "role": "founder",
      "joined": "2025-02-01T00:00:00Z",
      "platforms": {}
    }
  ]
}
```

### Required Fields
- `tribe_id` - Tribe identifier
- `name` - Human-readable tribe name
- `created` - ISO 8601 timestamp
- `founder` - Founder's DID
- `members` - Array of member objects

### Member Object
- `did` - Member's DID
- `tier` - Trust tier (1-4)
- `role` - "founder" | "member" | "guest"
- `joined` - ISO 8601 timestamp
- `platforms` - Platform identities

## File Locations

### Identity Keys
- **Location:** `~/.clawdbot/tribes/keys/`
- **Files:**
  - `private.key` (0600 permissions)
  - `public.key` (0644 permissions)
- **Format:** Raw binary (32 bytes for Ed25519)

### DID Document
- **Location:** `~/.clawdbot/tribes/my-did.json`
- **Format:** JSON
- **Permissions:** 0644

### Tribe Data
- **Location:** `~/.clawdbot/tribes/tribes/<tribe-id>/`
- **Files:**
  - `manifest.json` - Tribe metadata + members
  - `private.key` (0600) - Tribe private key
  - `public.key` (0644) - Tribe public key

### Workspace
- **Location:** `~/clawd/TRIBE.md`
- **Format:** Markdown (human-readable)
- **Purpose:** Read-only for AI, written by CLI scripts

## Trust Tier Rules

| Tier | Name | Access | Collaboration | Info Sharing |
|------|------|--------|---------------|--------------|
| 4 | My Human | Full (USER.md, MEMORY.md) | Unrestricted | Full access |
| 3 | Tribe | Work products only | Full | Within boundaries |
| 2 | Acquaintance | Public info only | Minimal | None |
| 1 | Stranger | None | Avoid | None |

### Data Sharing Matrix

| Resource | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|----------|--------|--------|--------|--------|
| USER.md | ❌ | ❌ | ❌ | ✅ |
| MEMORY.md | ❌ | ❌ | ❌ | ✅ |
| Daily logs | ❌ | ❌ | ❌ | ✅ |
| Project work | ❌ | ❌ | ✅ | ✅ |
| Public research | ❌ | ✅ (read) | ✅ | ✅ |
| Personal calendar | ❌ | ❌ | ❌ | ✅ |
| Code (public) | ❌ | ✅ (read) | ✅ | ✅ |
| Code (private) | ❌ | ❌ | ✅ (approved) | ✅ |

## Phase 1 Implementation (Current)

### Commands
- `tribe init` - Generate identity keypair + DID
- `tribe create --name <name>` - Create tribe

### Cryptography Implemented
- Ed25519 keypair generation
- Signature creation/verification
- Base64 encoding/decoding

### Storage Implemented
- Secure key storage (0600 permissions)
- DID document persistence
- Tribe manifest storage
- TRIBE.md generation

### Not Yet Implemented (Phase 2+)
- Handshake protocol (challenge-response)
- Tribe key transfer (encrypted)
- Session key establishment (DH)
- Message encryption (AES)
- Multi-member tribes (join/approve)

## Security Considerations

### Threat Model

**Threats Mitigated:**
- ✅ Impersonation (Ed25519 signatures required)
- ✅ Accidental key leakage (stored outside workspace)
- ✅ Unauthorized file access (explicit tier checks)

**Not Yet Mitigated (Phase 2+):**
- ⚠️ Man-in-the-middle attacks (need secure channel)
- ⚠️ Replay attacks (need nonces)
- ⚠️ Compromised tribe key (need key rotation)

### Best Practices

1. **Never commit private keys to git**
   - Use `.gitignore` for `~/.clawdbot/`
   
2. **Verify file permissions**
   - Private keys must be 0600
   - Check with: `ls -l ~/.clawdbot/tribes/keys/`
   
3. **Backup keys securely**
   - Export to encrypted USB or password manager
   - Test restore before deleting originals
   
4. **Rotate tribe keys if compromised**
   - Remove compromised member
   - Generate new tribe keypair
   - Re-distribute to remaining members

## API Reference (Phase 1)

### crypto.js

```javascript
generateKeypair() → {publicKey, secretKey}
sign(message, secretKey) → base64Signature
verify(message, signature, publicKey) → boolean
encodeBase64(bytes) → string
decodeBase64(base64) → Uint8Array
```

### did.js

```javascript
generateDID(name, publicKey) → didString
parseDID(didString) → {method, name, hash}
validateDID(didString) → boolean
createDIDDocument(did, publicKey, platforms, humanOperator) → document
generateTribeID(name, tribePublicKey) → tribeIdString
```

### storage.js

```javascript
isInitialized() → boolean
savePrivateKey(key, filename)
loadPrivateKey(filename) → Uint8Array
savePublicKey(key, filename)
loadPublicKey(filename) → Uint8Array
saveDIDDocument(document)
loadDIDDocument() → document
saveTribeData(tribeId, data)
loadTribeData(tribeId) → data
saveTribeKeys(tribeId, privateKey, publicKey)
listTribes() → Array<tribeId>
```

### validation.js

```javascript
validateTribeName(name) → {valid, error}
validateTribeId(id) → boolean
validateDIDDocument(doc) → {valid, error}
validateManifest(manifest) → {valid, error}
validateTier(tier) → boolean
```

## Future Extensions (Phase 2-5)

### Phase 2: Handshake Protocol
- Challenge-response authentication
- Tribe key transfer (encrypted with member's public key)
- Member approval workflow

### Phase 3: Session Management
- DH key exchange for pairwise sessions
- Session key derivation (HKDF)
- 24h expiry + auto-renewal
- Message encryption/decryption

### Phase 4: AI Integration
- `getTrustTier(did, channel)` function
- Auto-trust-tier detection from TRIBE.md
- Privacy boundary enforcement wrappers
- AGENTS.md integration

### Phase 5: Production Hardening
- Comprehensive error handling
- Audit logging (all handshakes, tier changes)
- Tribe key rotation protocol
- Revocation lists for compromised keys

## Version History

- **v1.0.0** (2025-02-01) - Phase 1: Core crypto + CLI foundation

---

*For full design rationale, see: `~/clawd/tribe-protocol-skill-design.md`*
