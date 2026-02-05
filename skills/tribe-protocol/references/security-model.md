# Tribe Protocol - Security Model

## Threat Model

### Assets to Protect

1. **Private Keys**
   - Identity private key (`~/.clawdbot/tribes/keys/private.key`)
   - Tribe private keys (`~/.clawdbot/tribes/tribes/<id>/private.key`)
   
2. **Personal Data**
   - USER.md (Tier 4 only)
   - MEMORY.md (Tier 4 only)
   - Daily logs (Tier 4 only)
   
3. **Tribe Membership**
   - Member list integrity
   - Trust tier assignments
   
4. **Communication**
   - Message confidentiality (Phase 3)
   - Message integrity (Phase 3)

### Threat Actors

1. **Impersonator** - Malicious bot claiming to be a trusted entity
2. **Data Scraper** - Compromised Tier 3 bot trying to access Tier 4 data
3. **Social Engineer** - Attacker tricks human into endorsing malicious bot
4. **Man-in-the-Middle** - Network attacker intercepting handshakes
5. **Insider Threat** - Legitimate tribe member goes rogue

## Mitigations (Phase 1)

### ✅ Impersonation Prevention

**Mechanism:** Ed25519 cryptographic signatures

```
Attacker claims to be Alice → Challenge: "Sign this nonce"
Attacker can't sign (no private key) → Verification fails → Rejected
```

**Status:** Implemented in Phase 1 (crypto.js)

### ✅ Key Leakage Prevention

**Mechanism:** Store keys outside workspace

- Private keys in `~/.clawdbot/tribes/` (NOT in `~/clawd/`)
- Permissions: 0600 (owner read/write only)
- Never committed to git

**Status:** Implemented in Phase 1 (storage.js)

### ✅ Privacy Boundary Enforcement

**Mechanism:** Explicit tier checks before data access

```javascript
if (tier < 4) {
  return "USER.md is private (Tier 4 only)";
}
```

**Status:** Framework ready (Phase 1), full enforcement in Phase 4

## Mitigations (Phase 2+)

### ⚠️ Man-in-the-Middle Attacks

**Threat:** Attacker intercepts tribe key transfer

**Mitigation (Phase 2):**
- Encrypt tribe key with recipient's public key
- Use authenticated encryption (NaCl box)
- Verify signatures on all protocol messages

### ⚠️ Replay Attacks

**Threat:** Attacker captures and replays old signed messages

**Mitigation (Phase 2):**
- Include nonce (random unique value) in every message
- Track processed message IDs
- Reject messages older than 5 minutes

### ⚠️ Compromised Tribe Key

**Threat:** Tribe private key leaks or member goes rogue

**Mitigation (Phase 5):**
- Tribe key rotation protocol
- Revoke old key, generate new
- Re-distribute to remaining (trusted) members
- Append-only revocation log

## Security Properties

### Phase 1 Guarantees

✅ **Authentication:** Can verify "this message is from Alice"  
✅ **Key Isolation:** Private keys isolated from workspace  
✅ **Secure Storage:** Keys stored with 0600 permissions  
✅ **Human-Readable Audit:** TRIBE.md shows all members and tiers  

### Phase 2+ Guarantees (Planned)

🚧 **Confidentiality:** Messages encrypted, only intended recipient can read  
🚧 **Integrity:** Messages can't be modified without detection  
🚧 **Forward Secrecy:** Compromising today's keys doesn't reveal old messages  
🚧 **Non-Repudiation:** Signatures prove who sent a message  

## Trust Assumptions

### What We Trust

1. **Human Operator**
   - Tier 4 human makes sound trust decisions
   - Verifies bot identities via out-of-band channels (phone, video call)
   
2. **Local Machine**
   - OS file permissions work correctly
   - No malware with root access
   
3. **Cryptography**
   - Ed25519 signatures are secure (128-bit security)
   - TweetNaCl implementation is correct
   
4. **Tribe Founder**
   - Founder performs proper identity verification before approval
   - Founder removes compromised members promptly

### What We Don't Trust

1. **Network**
   - Assume all network traffic is observable
   - Use encryption for sensitive data (Phase 3)
   
2. **Tier 1-3 Members**
   - Lower-tier members are sandboxed by tier rules
   - Explicit checks prevent unauthorized access
   
3. **Platform Identities**
   - Discord/GitHub accounts can be compromised
   - Always verify with cryptographic challenge-response

## Attack Scenarios & Defenses

### Scenario 1: Bot Impersonation

**Attack:**
```
MaliciousBot joins Discord as "YajatBot"
Claims DID: did:tribe:<admin>:xyz789
Tries to access Tier 3 data
```

**Defense:**
```
1. Cheenu's bot requests signature proof
2. MaliciousBot can't produce valid signature (no private key)
3. Verification fails → treated as Tier 1 (Stranger)
4. No data access granted
```

**Result:** ✅ Attack prevented

### Scenario 2: Social Engineering

**Attack:**
```
Attacker creates seemingly helpful bot
Tricks Nag into adding to Tier 3
Bot scrapes all project files
```

**Defense:**
```
1. Tribe Protocol warns: "New bot requests Tier 3"
2. Shows bot's DID and platform proofs
3. Nag verifies via out-of-band (calls Yajat)
4. If suspicious, denies or adds at Tier 2 (public info only)
```

**Result:** ⚠️ Requires human judgment (can't fully automate)

### Scenario 3: Compromised Member

**Attack:**
```
Yajat's bot (Tier 3) gets compromised
Attacker tries to read USER.md
```

**Defense:**
```
1. Privacy boundary enforcement: USER.md → Tier 4 only
2. Access attempt is blocked
3. Audit log records the attempt (Phase 5)
4. Nag sees alert, removes Yajat's bot from tribe
5. Tribe key rotation performed
```

**Result:** ✅ Attack contained (data not leaked)

### Scenario 4: Key Theft

**Attack:**
```
Attacker steals ~/.clawdbot/tribes/keys/private.key
Impersonates Cheenu's bot
```

**Defense:**
```
1. Private key stored with 0600 permissions (read protection)
2. Encrypted filesystem recommended (additional layer)
3. If stolen: Human notices suspicious behavior
4. Revoke old DID, generate new identity
5. Notify tribe members of identity change
```

**Result:** ⚠️ Damage containment (requires manual intervention)

## Best Practices for Operators

### Identity Verification

1. **Out-of-Band Confirmation**
   - Before adding Tier 3: Call/video chat to verify
   - Check bot's DID via multiple channels (Discord + email + GitHub)
   
2. **Start at Lower Tier**
   - New bots → Tier 2 initially
   - Escalate to Tier 3 after proving trustworthiness
   
3. **Regular Audits**
   - Review TRIBE.md monthly
   - Remove inactive/suspicious members

### Key Management

1. **Backup Keys**
   - Export to encrypted USB drive
   - Store backup in safe location (not cloud)
   
2. **Never Share Private Keys**
   - Each bot has its own keypair
   - Even bots operated by same human have separate keys
   
3. **Rotate After Compromise**
   - If tribe key leaks → rotate immediately
   - Re-handshake with all members

### Privacy Discipline

1. **Enforce Boundaries**
   - Code review: All file reads should check tier
   - No exceptions (even for convenience)
   
2. **Explicit Consent**
   - Before sharing human's data: Ask permission
   - Even Tier 3 needs consent for specific data
   
3. **Least Privilege**
   - Grant minimum tier needed for task
   - Time-limited access (Tier 3 for 1 project, then downgrade)

## Security Roadmap

### Phase 1 (Current) ✅
- Cryptographic identity (Ed25519)
- Secure key storage (0600 permissions)
- Basic tier system (manual checks)

### Phase 2 (Next) 🚧
- Challenge-response authentication
- Encrypted tribe key transfer
- Signature verification on all messages

### Phase 3 🚧
- Session keys (forward secrecy)
- End-to-end encrypted messaging
- Auto-session establishment

### Phase 4 🚧
- Programmatic tier enforcement
- Privacy boundary wrappers
- Audit logging

### Phase 5 🚧
- Tribe key rotation protocol
- Revocation lists
- Compromise recovery procedures
- Penetration testing

## Audit & Compliance

### What Gets Logged (Phase 5)

- All handshakes (who joined when)
- Trust tier changes (escalations/downgrades)
- Data access attempts (especially denials)
- Tribe key rotations
- Member removals

### Log Location
- `~/.clawdbot/tribes/audit.log`
- Append-only, timestamped
- Never delete (archive old logs)

### Review Schedule
- Daily: Check for failed access attempts
- Weekly: Review new member additions
- Monthly: Full TRIBE.md audit
- Quarterly: Security assessment

## Conclusion

Tribe Protocol provides **defense-in-depth** security:

1. **Cryptographic layer:** Ed25519 signatures prevent impersonation
2. **Storage layer:** Secure file permissions prevent key leakage
3. **Logical layer:** Tier checks prevent unauthorized access
4. **Human layer:** Operator verification prevents social engineering

**Phase 1 provides:** Strong foundation (identity + storage)  
**Phase 2-5 add:** Network security, encryption, audit, recovery

**Current Status:** Secure for local use, not yet ready for network adversaries (need Phase 2).

---

*For technical details, see: `protocol-spec.md`*
