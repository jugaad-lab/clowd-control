# Chhotu Research Runner

Step-by-step guide for executing research. Follow this when a research request comes in.

## Quick Start

When you receive a research request:

```
1. PARSE → Extract topic, depth, focus areas
2. YOUTUBE → Search and analyze videos
3. SOCIAL → Search X/Twitter via xai-search
4. COMPILE → Generate output JSON
5. SAVE → Store in research folder
6. SIGNAL → Post completion to channel
```

## Step 1: Parse Request

Extract from the request:
- **Topic**: Main subject
- **Depth**: quick/comprehensive/deep
- **Focus areas**: Specific angles to cover
- **Request ID**: Generate as `YYYY-MM-DD-topic-slug`

Example:
```
Request: "Research AI agents - what's trending, tools, use cases"

Parsed:
- Topic: AI agents
- Depth: comprehensive (default)
- Focus areas: trends, tools, use cases
- Request ID: 2026-02-01-ai-agents
```

## Step 2: Create Research Folder

```bash
mkdir -p ~/workspace/disclawd-bot-collab/research/[request-id]
```

## Step 3: YouTube Research

### 3a. Find Videos

Search queries to run:
```
"[topic] 2026 site:youtube.com"
"[topic] tutorial site:youtube.com"
"[topic] explained site:youtube.com"
"[topic] [focus_area_1] site:youtube.com"
```

### 3b. Select Videos

Pick based on:
- Relevance to topic
- Recent upload date (prefer last 6 months)
- View count / engagement
- Channel credibility

Quantity by depth:
- quick: 2-3 videos
- comprehensive: 5-7 videos
- deep: 10+ videos

### 3c. Analyze Each Video

For each video, use youtube-transcript skill:
```
Read <project-root>/skills/youtube-transcript/SKILL.md
```

Then fetch transcript and extract:
- **Summary**: 2-3 sentence overview
- **Key insights**: Main points (3-5 per video)
- **Notable quotes**: Exact text + timestamp
- **Quality score**: 1-5 based on depth/accuracy

## Step 4: Social Media Research

### 4a. Search X/Twitter

Use xai-search skill:
```
Read <project-root>/skills/xai-search/SKILL.md
```

Search for:
```
"[topic]" — main topic posts
"[topic] [focus_area]" — focused searches
```

### 4b. Analyze Results

Extract:
- **Trending subtopics**: What aspects are people discussing?
- **Key voices**: Who are the experts/influencers?
- **Sentiment**: Overall positive/negative/mixed
- **Notable posts**: High-engagement or insightful posts

## Step 5: Podcast Research (Optional)

If depth is "comprehensive" or "deep":

### 5a. Find Episodes
```
web_search "[topic] podcast episode 2026"
```

### 5b. Analyze (if found)

Use summarize skill for transcription/summary.

## Step 6: Compile Output

Create `chhotu-output.json`:

```json
{
  "source": "chhotu",
  "request_id": "[request-id]",
  "topic": "[topic]",
  "timestamp": "[ISO timestamp]",
  "youtube": {
    "videos_analyzed": [count],
    "key_insights": [
      {
        "insight": "[insight text]",
        "source_video": "[title]",
        "source_url": "[url]",
        "timestamp": "[MM:SS]",
        "confidence": "high|medium|low"
      }
    ],
    "notable_quotes": [
      {
        "quote": "[exact quote]",
        "speaker": "[name or 'unknown']",
        "video": "[title]",
        "timestamp": "[MM:SS]"
      }
    ],
    "sources": [
      {
        "title": "[video title]",
        "url": "[youtube url]",
        "channel": "[channel name]",
        "views": "[view count]",
        "upload_date": "[date]",
        "summary": "[2-3 sentences]",
        "quality_score": [1-5]
      }
    ]
  },
  "social": {
    "posts_found": [count],
    "sentiment": "positive|negative|mixed|neutral",
    "trending_subtopics": ["[subtopic1]", "[subtopic2]"],
    "key_voices": ["@handle1", "@handle2"],
    "notable_posts": [
      {
        "author": "@[handle]",
        "content": "[post text]",
        "engagement": "[likes/retweets]",
        "url": "[post url]",
        "date": "[date]"
      }
    ]
  },
  "podcasts": {
    "episodes_found": [count],
    "sources": []
  },
  "metadata": {
    "research_duration_minutes": [duration],
    "errors": [],
    "notes": "[any relevant notes]"
  }
}
```

## Step 7: Save Output

```bash
# Save to research folder
Write to: ~/workspace/disclawd-bot-collab/research/[request-id]/chhotu-output.json
```

## Step 8: Signal Completion

Post to #skill-sharing (1467419841483771924):

```
🔍 CHHOTU RESEARCH COMPLETE

**Topic:** [topic]
**Request ID:** [request-id]

**Found:**
- 📺 [X] YouTube videos analyzed
- 🐦 [Y] social media posts
- 🎙️ [Z] podcast episodes

**Key Findings Preview:**
1. [Most important finding]
2. [Second finding]
3. [Third finding]

**Output:** `/research/[request-id]/chhotu-output.json`

**Status:** Waiting for Cheenu's web research for synthesis
```

## Error Handling

### YouTube Transcript Fails
- Note in errors array
- Try alternative video
- If 3+ failures, note limitation in output

### xai-search Fails
- Fall back to web_search for Twitter
- Note degraded social coverage

### No Results Found
- Broaden search terms
- Try related topics
- Note limited findings

## Quality Checklist

Before marking complete:
- [ ] All focus areas covered
- [ ] Sources properly cited with URLs
- [ ] Timestamps included for video content
- [ ] JSON is valid
- [ ] Saved to correct folder
- [ ] Completion posted to channel
