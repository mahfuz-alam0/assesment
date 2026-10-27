# Taste

## Code Style
- Prefers readable, "humanized" code over dense/terse "AI-style" one-liners: use descriptive variable and function names instead of cryptic single letters (e.g. `search` not `q`, `replaceVehicle` not `replace`, `current` not `vs`/`x`), prefer block bodies over crammed inline expressions, and split multiple concerns into separate, scannable statements. Confidence: 0.9
- Treats "humanize this code" as a codebase-wide standard, not a one-off fix — expects the same readability pass applied across every file/module in the project (he'll ask for the whole `web/` tree "one by one"), and expects it applied consistently so the whole codebase reads in one style. Confidence: 0.85
- Expects the readability/humanization pass to cover ALL layers, explicitly including backend/API source and test files (unit and e2e), not just frontend components — he'll follow up with "check the APIs" and "test files also need to be humanized". Confidence: 0.85
- Wants comments to explain intent and sit next to the code they describe. Confidence: 0.55
