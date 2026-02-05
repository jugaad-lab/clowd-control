# Chhotu Research Module

Research module for the Multi-Bot Research Pipeline. Handles YouTube, podcasts, and social media research.

## Overview

This module is one half of a two-bot research system:
- **Chhotu** (this module): YouTube, X/Twitter, podcasts, social media
- **Cheenu**: Web articles, blog posts, documentation, news

## Skills Used

- `youtube-transcript` — Fetch and analyze video transcripts
- `xai-search` — Real-time X/Twitter search via Grok
- `summarize` — Content summarization for podcasts
- `web_search` — Find YouTube videos and podcast episodes

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
- `quick`: 2-3 videos, 10 social posts
- `comprehensive`: 5-7 videos, 20-30 social posts
- `deep`: 10+ videos, 50+ social posts, podcasts

## Output Format

```json
{
  "source": "chhotu",
  "request_id": "2026-02-01-ai-agents",
  "topic": "AI Agents",
  "timestamp": "2026-02-01T10:00:00Z",
  "youtube": {
    "videos_analyzed": 5,
    "key_insights": [
      {
        "insight": "Insight text here",
        "source_video": "Video Title",
        "source_url": "https://youtube.com/...",
        "timestamp": "12:34",
        "confidence": "high"
      }
    ],
    "notable_quotes": [
      {
        "quote": "Exact quote from transcript",
        "speaker": "Speaker Name",
        "video": "Video Title",
        "timestamp": "05:23"
      }
    ],
    "sources": [
      {
        "title": "Video Title",
        "url": "https://youtube.com/...",
        "channel": "Channel Name",
        "views": "100K",
        "summary": "Brief summary"
      }
    ]
  },
  "social": {
    "posts_found": 20,
    "sentiment": "positive",
    "trending_subtopics": ["agents", "automation", "Claude"],
    "key_voices": ["@user1", "@user2"],
    "notable_posts": [
      {
        "author": "@handle",
        "content": "Post content",
        "engagement": "1.2K likes",
        "url": "https://x.com/..."
      }
    ]
  },
  "podcasts": {
    "episodes_found": 2,
    "key_insights": [...],
    "sources": [...]
  }
}
```

## Workflow

### Step 1: Search for Content

```bash
# Find YouTube videos on topic
web_search "AI agents 2026 site:youtube.com"

# Find podcasts
web_search "AI agents podcast episode 2026"
```

### Step 2: Analyze YouTube Videos

For each promising video:
1. Use `youtube-transcript` skill to fetch transcript
2. Summarize key points
3. Extract notable quotes with timestamps
4. Rate content quality/relevance

### Step 3: Search Social Media

```
# Use xai-search skill
xai-search "AI agents" --source twitter --limit 30
```

Extract:
- Trending discussions
- Key voices/influencers
- Sentiment analysis
- Notable posts

### Step 4: Analyze Podcasts

If podcast URLs found:
1. Use `summarize` skill with audio/transcript
2. Extract key insights
3. Note speakers and timestamps

### Step 5: Generate Output

1. Compile all findings into JSON format
2. Save to research folder
3. Post status to coordination channel

## Coordination Protocol

### Starting Research

Post to #skill-sharing:
```
🔬 CHHOTU RESEARCH STARTED
Topic: [topic]
Focus: YouTube, X/Twitter, podcasts
Expected completion: [time estimate]
```

### Completing Research

Post to #skill-sharing:
```
🔍 CHHOTU RESEARCH COMPLETE
Found: X videos, Y social posts, Z podcasts
Output: /research/[request_id]/chhotu-output.json
Key findings preview:
- [finding 1]
- [finding 2]
Waiting for: Cheenu's web research
```

## Error Handling

- **YouTube blocked**: Note in output, proceed with social
- **xai-search fails**: Fall back to web_search for Twitter
- **Podcast unavailable**: Skip and document

## Usage Example

```
Human: Research AI agents - trends, tools, use cases

Chhotu:
1. Parse request into structured format
2. Search YouTube for "AI agents 2026 trends tools"
3. Analyze top 5 videos
4. Search X/Twitter via xai-search
5. Find any podcast episodes
6. Compile output JSON
7. Save to /research/2026-02-01-ai-agents/chhotu-output.json
8. Post completion status
```

## Integration

Works with:
- **cheenu-research**: Partner module for web research
- **research-synthesizer**: Merges both outputs into final report

## Notes

- Always cite sources with URLs and timestamps
- Rate confidence based on source quality
- Flag conflicting information
- Prioritize recent content (last 6 months)
