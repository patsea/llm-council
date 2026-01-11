# LLM Council Stage 1: Peer Rank Diagnostic Fix

Before executing, read best practices from: ~/Dropbox/ALOMA/claude-code/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

**Execute from**: `~/Dropbox/ALOMA/claude-code/llm-council`

## ⛔ RULES
- Execute EVERY step in order
- Do NOT create files not listed here
- Do NOT improvise

---

## STEP 1: Check actual aggregateRankings data in stored conversation

```bash
cd ~/Dropbox/ALOMA/claude-code/llm-council
LATEST=$(ls -t data/conversations/ | head -1)
echo "Latest: $LATEST"
python3 << 'EOF'
import json
import os

# Get latest conversation
convs = sorted(os.listdir('data/conversations/'), key=lambda x: os.path.getmtime(f'data/conversations/{x}'), reverse=True)
latest = convs[0]
print(f"File: {latest}")

with open(f'data/conversations/{latest}') as f:
    d = json.load(f)

if len(d['messages']) > 1:
    msg = d['messages'][1]
    metadata = msg.get('metadata', {})
    
    print("\n=== aggregate_rankings ===")
    agg = metadata.get('aggregate_rankings', [])
    for i, item in enumerate(agg):
        print(f"  [{i}]: {json.dumps(item)}")
    
    print("\n=== label_to_model ===")
    ltm = metadata.get('label_to_model', {})
    print(f"  {json.dumps(ltm, indent=2)}")
    
    print("\n=== Stage 1 model names ===")
    for r in msg.get('stage1', []):
        print(f"  {r.get('model')}")
else:
    print("No assistant message found")
EOF
```

This will show the exact structure we need to match.

---

## STEP 2: Update CouncilSummary.jsx based on actual data structure

Based on Step 1 output, the fix will be one of:

**If aggregate_rankings has 'label' field with full model paths:**
```jsx
const rankingLookup = {};
aggregateRankings.forEach((item, idx) => {
  // Use full model path directly
  rankingLookup[item.label] = {
    position: idx + 1,
    score: item.avg_rank?.toFixed(1) || '-'
  };
});

const formatRank = (model) => {
  const r = rankingLookup[model];
  if (!r) return '-';
  const suffix = r.position === 1 ? 'st' : r.position === 2 ? 'nd' : r.position === 3 ? 'rd' : 'th';
  return `${r.position}${suffix} (${r.score})`;
};
```

**If aggregate_rankings has short names only:**
```jsx
const rankingLookup = {};
aggregateRankings.forEach((item, idx) => {
  rankingLookup[item.label] = {
    position: idx + 1,
    score: item.avg_rank?.toFixed(1) || '-'
  };
});

const formatRank = (model) => {
  const shortName = model?.split('/')[1] || model;
  const r = rankingLookup[shortName];
  if (!r) return '-';
  const suffix = r.position === 1 ? 'st' : r.position === 2 ? 'nd' : r.position === 3 ? 'rd' : 'th';
  return `${r.position}${suffix} (${r.score})`;
};
```

Apply the appropriate fix after reviewing Step 1 output.

---

## STEP 3: Hard refresh and test

After applying fix:
1. Hard refresh: Cmd+Shift+R
2. Create NEW conversation
3. Verify Peer Rank shows: 1st (X.X), 2nd (X.X), etc.

---

## Success Criteria
- [ ] Step 1 output shows actual data structure
- [ ] Peer Rank column shows rankings for Stage 1 models
- [ ] Rankings match Aggregate Rankings in Stage 2 section
