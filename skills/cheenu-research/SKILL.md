# Cheenu Research Module

Research module for the Multi-Bot Research Pipeline. Handles web articles, documentation, academic papers, and GitHub repos.

## Overview

This module is one half of a two-bot research system:
- **Chhotu**: YouTube, X/Twitter, podcasts, social media
- **Cheenu** (this module): Web articles, documentation, GitHub, academic papers

## Skills Used

- `web_search` — Brave search for articles
- `web_fetch` — Extract content from URLs
- `summarize` — Content summarization
- `github` — Repository and code analysis (gh CLI)

## Input Format

Research requests come as structured JSON:

```json
{
  "topic": "AI Agents in 2026",
  "depth": "comprehensive",
  "focus_areas": ["trends", "tools", "use cases"],
  "request_id": "2026-02-01-ai-agents"
}
```

**Depth Levels:**
- `quick`: 3-5 articles, 1-2 repos
- `comprehensive`: 8-10 articles, 3-5 repos, 2-3 papers
- `deep`: 15+ articles, 5+ repos, 5+ papers, documentation deep-dive

## Output Format

```json
{
  "source": "cheenu",
  "request_id": "2026-02-01-ai-agents",
  "topic": "AI Agents",
  "timestamp": "2026-02-01T10:00:00Z",
  "web": {
    "articles_analyzed": 10,
    "key_insights": [
      {
        "insight": "Insight text here",
        "source_title": "Article Title",
        "source_url": "https://example.com/...",
        "author": "Author Name",
        "date": "2026-01-15",
        "confidence": "high"
      }
    ],
    "facts_and_figures": [
      {
        "fact": "85% of enterprises plan to adopt AI agents by 2027",
        "source": "Gartner Report",
        "url": "https://..."
      }
    ],
    "sources": [
      {
        "title": "Article Title",
        "url": "https://...",
        "publication": "TechCrunch",
        "date": "2026-01-15",
        "summary": "Brief summary"
      }
    ]
  },
  "github": {
    "repos_analyzed": 5,
    "trending_repos": [
      {
        "name": "owner/repo",
        "url": "https://github.com/...",
        "stars": 5000,
        "description": "Repo description",
        "key_features": ["feature1", "feature2"],
        "last_updated": "2026-01-20"
      }
    ],
    "code_patterns": [
      {
        "pattern": "Agent orchestration using X framework",
        "repos_using": ["repo1", "repo2"],
        "example_url": "https://..."
      }
    ]
  },
  "academic": {
    "papers_found": 3,
    "key_papers": [
      {
        "title": "Paper Title",
        "authors": ["Author 1", "Author 2"],
        "source": "arXiv",
        "url": "https://arxiv.org/...",
        "abstract_summary": "Brief summary",
        "key_contribution": "What this paper adds"
      }
    ]
  },
  "documentation": {
    "official_docs_found": 2,
    "summaries": [
      {
        "product": "Product Name",
        "url": "https://docs...",
        "key_points": ["point1", "point2"]
      }
    ]
  }
}
```

## Workflow

### Step 1: Search for Web Content

```bash
# Search for articles
web_search "[topic] 2026" --count 10

# Search for documentation
web_search "[topic] documentation guide" --count 5

# Search for academic papers
web_search "[topic] site:arxiv.org OR site:scholar.google.com" --count 5
```

### Step 2: Analyze Articles

For each promising URL:
1. Use `web_fetch` to extract content
2. Summarize key points
3. Extract facts, figures, and quotes
4. Rate content quality/relevance

### Step 3: Search GitHub

```bash
# Search for repos
gh search repos "[topic]" --sort stars --limit 10

# Get repo details
gh repo view owner/repo --json description,stargazerCount,updatedAt
```

Extract:
- Trending repos by stars
- Common patterns/frameworks
- Recent activity

### Step 4: Find Academic Papers

```bash
# Search arXiv
web_search "[topic] site:arxiv.org" --count 5
web_fetch "https://arxiv.org/abs/..."
```

Extract:
- Paper titles and authors
- Key contributions
- Abstract summaries

### Step 5: Generate Output

1. Compile all findings into JSON format
2. Save to research folder
3. Post status to coordination channel

## Coordination Protocol

### Starting Research

Post to #skill-sharing:
```
🔬 CHEENU RESEARCH STARTED
Topic: [topic]
Focus: Web articles, GitHub, academic papers
Expected completion: [time estimate]
```

### Completing Research

Post to #skill-sharing:
```
🔍 CHEENU RESEARCH COMPLETE
Found: X articles, Y repos, Z papers
Output: /research/[request_id]/cheenu-output.json
Key findings preview:
- [finding 1]
- [finding 2]
Waiting for: Chhotu's YouTube/social research (or SYNTHESIS if Chhotu done)
```

## Error Handling

- **Web fetch fails**: Try archive.org or note unavailable
- **GitHub rate limited**: Use cached data or reduce scope
- **arXiv unavailable**: Fall back to Google Scholar
- **Paywall hit**: Note in output, try alternative source

## Synthesis Trigger

**Rule:** Whoever finishes last triggers synthesis.

If Chhotu is done:
1. Read Chhotu's output
2. Merge with my output
3. Generate final report
4. Post to channel

If I finish first:
1. Post completion status
2. Wait for Chhotu
3. (Chhotu will do synthesis)

## Usage Example

```
Human: Research AI agents - trends, tools, use cases

Cheenu:
1. Parse request into structured format
2. Search web for "AI agents 2026 trends tools use cases"
3. Fetch and analyze top 10 articles
4. Search GitHub for AI agent repos
5. Search arXiv for relevant papers
6. Find official documentation
7. Compile output JSON
8. Save to /research/2026-02-01-ai-agents/cheenu-output.json
9. Post completion status
10. If Chhotu done → trigger synthesis
```

## Integration

Works with:
- **chhotu-research**: Partner module for YouTube/social research
- **research-synthesizer**: Merges both outputs into final report

## Notes

- Always cite sources with URLs and dates
- Rate confidence based on source authority
- Flag conflicting information
- Prioritize recent content (last 6 months)
- Check publication dates - older sources may be outdated
