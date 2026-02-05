# Cheenu Research Runner

Step-by-step execution guide for running web/GitHub/academic research.

## Pre-Flight Checklist

- [ ] Research request parsed into structured JSON
- [ ] Request ID generated (format: `YYYY-MM-DD-topic-slug`)
- [ ] Output directory created: `research/[request_id]/`
- [ ] Chhotu notified of parallel start

## Step-by-Step Execution

### 1. Initialize Research Session

```bash
# Create output directory
mkdir -p research/[request_id]

# Save request
echo '{
  "topic": "[topic]",
  "depth": "[depth]",
  "focus_areas": [...],
  "request_id": "[request_id]",
  "started_at": "[timestamp]"
}' > research/[request_id]/request.json
```

### 2. Post Start Status

```
🔬 CHEENU RESEARCH STARTED
Topic: [topic]
Focus: Web articles, GitHub repos, academic papers
Request ID: [request_id]
Expected completion: [estimate based on depth]
```

### 3. Web Article Research

**3a. Search**
```bash
# Primary search
web_search "[topic] 2026" --count 10

# News search
web_search "[topic] news" --count 5

# Analysis/opinion pieces
web_search "[topic] analysis trends" --count 5
```

**3b. Filter Results**
- Remove duplicates
- Prioritize: authoritative sources > blogs > forums
- Check dates: prefer last 6 months
- Skip paywalled content (or note as unavailable)

**3c. Fetch and Analyze**
For each URL (up to depth limit):
```bash
web_fetch "[url]" --extractMode markdown --maxChars 10000
```

Extract:
- Main thesis/argument
- Key facts and figures
- Notable quotes
- Author credentials

### 4. GitHub Research

**4a. Search Repos**
```bash
gh search repos "[topic]" --sort stars --limit 20
gh search repos "[topic]" --sort updated --limit 10
```

**4b. Analyze Top Repos**
For each promising repo:
```bash
gh repo view owner/repo --json name,description,stargazerCount,updatedAt,url
```

If needed, deeper analysis:
```bash
gh api repos/owner/repo/readme | jq -r '.content' | base64 -d
```

**4c. Identify Patterns**
- Common frameworks/libraries
- Architecture patterns
- Popular approaches

### 5. Academic Paper Research

**5a. Search**
```bash
web_search "[topic] site:arxiv.org" --count 10
web_search "[topic] research paper 2025 2026" --count 5
```

**5b. Fetch Abstracts**
```bash
web_fetch "https://arxiv.org/abs/[paper_id]" --maxChars 5000
```

**5c. Extract Key Info**
- Title, authors, date
- Abstract summary
- Key contribution
- Relevance to topic

### 6. Documentation Research

**6a. Find Official Docs**
```bash
web_search "[topic] documentation official guide" --count 5
web_search "[specific tool] docs getting started" --count 3
```

**6b. Summarize**
- Key features
- Setup requirements
- Use cases

### 7. Compile Output

```javascript
const output = {
  "source": "cheenu",
  "request_id": request_id,
  "topic": topic,
  "timestamp": new Date().toISOString(),
  "web": {
    "articles_analyzed": articles.length,
    "key_insights": extractInsights(articles),
    "facts_and_figures": extractFacts(articles),
    "sources": articles.map(formatSource)
  },
  "github": {
    "repos_analyzed": repos.length,
    "trending_repos": repos.map(formatRepo),
    "code_patterns": identifyPatterns(repos)
  },
  "academic": {
    "papers_found": papers.length,
    "key_papers": papers.map(formatPaper)
  },
  "documentation": {
    "official_docs_found": docs.length,
    "summaries": docs.map(formatDoc)
  }
};
```

### 8. Save Output

```bash
# Save JSON output
echo '[output JSON]' > research/[request_id]/cheenu-output.json

# Commit to git
cd research/[request_id]
git add cheenu-output.json
git commit -m "Cheenu research complete: [topic]"
```

### 9. Post Completion Status

```
🔍 CHEENU RESEARCH COMPLETE
Request ID: [request_id]
Found: X articles, Y repos, Z papers, W docs
Output: research/[request_id]/cheenu-output.json

Key findings preview:
1. [Top insight from web]
2. [Top insight from GitHub]
3. [Key paper finding]

Chhotu status: [WAITING | COMPLETE]
Next step: [Wait for Chhotu | Trigger synthesis]
```

### 10. Synthesis (If Chhotu Done)

If Chhotu's output exists:
```bash
# Read both outputs
chhotu_output=$(cat research/[request_id]/chhotu-output.json)
cheenu_output=$(cat research/[request_id]/cheenu-output.json)

# Merge and synthesize
# ... synthesis logic ...

# Generate final report
echo "[report]" > research/[request_id]/final-report.md
```

Post final status:
```
📊 SYNTHESIS COMPLETE
Request ID: [request_id]
Report: research/[request_id]/final-report.md

Executive Summary:
[2-3 sentence summary]

Full report attached.
```

## Depth Guidelines

| Depth | Articles | Repos | Papers | Docs | Est. Time |
|-------|----------|-------|--------|------|-----------|
| quick | 3-5 | 1-2 | 0-1 | 1 | 15 min |
| comprehensive | 8-10 | 3-5 | 2-3 | 2-3 | 45 min |
| deep | 15+ | 5+ | 5+ | 3+ | 90 min |

## Error Recovery

| Error | Action |
|-------|--------|
| web_fetch fails | Try archive.org, note as unavailable |
| GitHub rate limit | Reduce scope, use cached |
| arXiv down | Use Google Scholar |
| Timeout | Save partial, note incomplete |

## Quality Checklist

Before posting completion:
- [ ] All sources have URLs
- [ ] Dates verified (recent content prioritized)
- [ ] Confidence levels assigned
- [ ] No duplicate insights
- [ ] Conflicting info flagged
- [ ] Output JSON validates
