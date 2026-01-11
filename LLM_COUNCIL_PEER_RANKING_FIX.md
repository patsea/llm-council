# LLM Council Peer Ranking Fix

Before executing, read best practices from: ~/Dropbox/ALOMA/claude-code/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

**Execute from**: `~/Dropbox/ALOMA/claude-code/llm-council`

## ⛔ RULES
- Execute EVERY step in order
- Do NOT create files not listed here
- Do NOT improvise

---

## STEP 1: Replace the ranking lookup logic in CouncilSummary.jsx

The issue is that `aggregateRankings` uses short model names but `stage1` uses full paths.

In `frontend/src/components/CouncilSummary.jsx`, replace the ranking lookup section (around lines 7-25) with:

```jsx
  const aggregateRankings = metadata?.aggregate_rankings || [];
  
  // Build ranking lookup: short model name -> {position, score}
  // aggregateRankings items have 'label' which is the short model name
  const rankingLookup = {};
  aggregateRankings.forEach((item, idx) => {
    // item.label is already the full model path like "openai/gpt-5.2-pro"
    // or it might be short name - handle both
    const shortName = item.label?.includes('/') 
      ? item.label.split('/')[1] 
      : item.label;
    if (shortName) {
      rankingLookup[shortName] = {
        position: idx + 1,
        score: item.avg_rank?.toFixed(1) || '-'
      };
    }
  });

  // Helper to get ranking by matching short name
  const formatRank = (model) => {
    const shortName = model?.split('/')[1] || model;
    const r = rankingLookup[shortName];
    if (!r) return '-';
    const suffix = r.position === 1 ? 'st' : r.position === 2 ? 'nd' : r.position === 3 ? 'rd' : 'th';
    return `${r.position}${suffix} (${r.score})`;
  };
```

Also remove any `console.log` debug statements added earlier.

---

## STEP 2: Verify and test

```bash
# Check for any remaining console.log debug statements
grep -n "console.log" frontend/src/components/CouncilSummary.jsx

# If any found, remove them
```

---

## STEP 3: Hard refresh browser

Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows) to clear cache.

Create a NEW conversation and check that Peer Rank column shows:
- 1st (1.3)
- 2nd (1.8)
- 3rd (3.3)
- 4th (3.8)

---

## Success Criteria
- [ ] No console.log debug statements in CouncilSummary.jsx
- [ ] Peer Rank column shows positions for Stage 1 models
- [ ] Rankings match the Aggregate Rankings shown in Stage 2
