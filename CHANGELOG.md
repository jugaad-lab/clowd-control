# Changelog

All notable changes to Clowd-Control will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Token Budgeting System** (Sprint 11)
  - Migration for `estimated_tokens`, `actual_tokens` columns on tasks
  - `budget_status` view with alert thresholds
  - Budget scripts: `check-budget.sh`, `update-budget.sh`
  - Comprehensive documentation in `docs/token-budgeting.md`
- **Activity Logging** - `log-activity.sh` for agent status tracking
- **Tribes Dashboard Page** - UI for managing tribes and shared skills
- **CI/CD Pipeline** - GitHub Actions for lint, test, type-check, build
- Production hygiene files (SECURITY.md, CODE_OF_CONDUCT.md, CHANGELOG.md)

### Infrastructure
- Supabase trigger for auto-updating project token totals
- Database views for budget monitoring

## [0.1.0] - 2026-02-05

### Added
- 🎉 Initial release of Clowd-Control
- Core AgentComms messaging system
- Task and project management schema
- PM workflow documentation
- Basic dashboard for task visualization
- Shell scripts for agent operations:
  - `tasks.sh` - Query and filter tasks
  - `claim.sh` - Claim tasks for an agent
  - `complete.sh` - Mark tasks as done
  - `handoff.sh` - Transfer tasks between agents
  - `broadcast.sh` - Send messages to all agents
- Agent templates and onboarding guides
- Comprehensive SKILL.md documentation

### Security
- Supabase RLS policies for all tables
- Agent-scoped data access
- Secure API key handling

---

## Version History

- **0.1.0** (2026-02-05): Initial public release with core coordination features
