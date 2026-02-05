# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Clowd-Control, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email security concerns to: **security@clawdhub.com** (or open a private security advisory on GitHub)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Resolution Timeline**: Depends on severity
  - Critical: 24-72 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: Next release

### Scope

Security issues in scope:
- Authentication/authorization bypasses
- SQL injection or data exposure via Supabase
- Cross-site scripting (XSS) in the dashboard
- Secrets exposure in logs or responses
- Agent impersonation or unauthorized task execution

Out of scope:
- Issues in dependencies (report to upstream)
- Social engineering attacks
- Physical security

### Safe Harbor

We consider security research conducted in good faith to be authorized. We will not pursue legal action against researchers who:
- Make a good faith effort to avoid privacy violations and data destruction
- Give us reasonable time to respond before disclosure
- Do not exploit the vulnerability beyond demonstration

## Security Best Practices for Operators

1. **Rotate API keys** regularly
2. **Use RLS policies** - All Supabase tables have Row Level Security enabled
3. **Validate agent IDs** - Agents should only access their own data
4. **Monitor logs** - Watch for unusual task patterns
5. **Keep dependencies updated** - Run `npm audit` regularly

## Known Security Considerations

- Agent communication happens via Supabase Realtime - ensure your Supabase project has appropriate security settings
- The dashboard runs locally by default - if exposing publicly, add authentication
- Task results may contain sensitive data - handle appropriately
