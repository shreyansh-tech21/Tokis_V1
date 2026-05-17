# Tokis quick test — tokis-test

## Start services

1. Analyzer: `cd analyzer/app` → `uvicorn main:app --reload --port 8001`
2. Worker: `cd worker/app` → `uvicorn main:app --reload --port 8002`
3. Spring: `cd tokis/tokis` → `./mvnw spring-boot:run` (port 8080)
4. Agent: `cd tokis-agent/app` → `uvicorn main:app --reload --port 8003`
5. Reload Tokis extension in Chrome

## Connect repo

1. Open https://chatgpt.com or https://gemini.google.com
2. FAB → **Add Project** → pick this folder: `tokis-test`
3. Or **Connect** if you already ingested it

---

## Test prompt (paste in chat after inject)

Use this as your **Task** text before clicking Inject prompt:

```
Fix the bugs in Calculator.java and helper.py. Use tokis-edit blocks for each file you change. Do not claim files were written until I approve in Tokis.
```

---

## Full flow

### 1. File to chat (no upload)

1. FAB → **File to chat**
2. Check `Calculator.java` and `helper.py`
3. **Load & preview** → **Add to chat**
4. Type the test prompt above in the composer (or add after file blocks)

### 2. MASK1 / MASK2 privacy (preview masking)

1. Copy `.env.example` to `.env` in this folder (or use any file with a fake secret).
2. FAB → **Inject prompt** → select a log or `.env` **only if you want to test masking** (for real secrets, leave `.env` unchecked).
3. **Continue to preview** → select a path or `API_KEY=...` line → **Mask selection** → becomes `MASK1`.
4. Confirm list shows `MASK1` → **Inject into chat** → ChatGPT must see `MASK1`, not the real value.
5. Ask the model to reference that value in a `tokis-edit` block using `MASK1` verbatim.
6. FAB → **Review suggestions** → preview shows **restored** real values → **Approve selected** → disk gets real values.

### 3. Inject with preview

1. FAB → **Inject prompt**
2. Select `Calculator.java`, `helper.py`, `config.js` (do **not** select `.env` unless testing masks)
3. **Continue to preview** → mask any sensitive spans → **Inject into chat**
4. Click **Send** in ChatGPT/Gemini

### 3b. Inject file from computer

1. FAB → **Inject file** → pick a local text file
2. Preview → mask if needed → **Inject into chat**

### 4. Review and apply

When the model replies, either format works:

**Preferred (fenced):**
```tokis-edit:src/Calculator.java
... full file ...
```

**Also works (ChatGPT style):** a line `tokis-edit:src/Calculator.java` then the code below it.

If Review says nothing found, use the paste box → **Parse edits**.

1. FAB → **Review suggestions**
2. Check files to apply → **Approve selected**
3. Optional: **Insert apply summary** → Send to model

### 5. Edit rules (optional)

FAB → **Edit Tokis rules** → edits `.tokis/protocol.md` on disk

---

## Expected bugs (for ChatGPT to fix)

- `src/Calculator.java`: divide by zero; `greet(null)` NPE
- `src/helper.py`: `=` instead of `==` in `find_user`; empty `average()` crashes
- `config.js`: mixed ESM + CommonJS; typo `getApiUrll`
- `logs/build.log`: sample failure log (good for mask-path tests)

## Delete repository

- **Workspace**: select repo in dropdown → **Delete selected** (removes index only, not disk)
- **FAB** (while connected): **Delete repository** — same for the active repo

After delete, **Add Project** again on `tokis-test` to re-ingest updated files.

---

## Re-ingest after big changes

If you change files on disk outside Tokis: FAB → **Change repo** → **Add Project** again (same folder) to refresh the index.

---

## Recording a demo video (optional)

### Free screen recorders (Windows)

| Tool | Notes |
|------|--------|
| **[OBS Studio](https://obsproject.com/)** | Free, industry standard. Display Capture → Start Recording → export `.mp4`. |
| **Xbox Game Bar** | `Win + G` → capture button. Built into Windows 10/11; fine for quick demos. |
| **[ShareX](https://getsharex.com/)** | Free; screen recording + easy trim. |
| **[Clipchamp](https://clipchamp.com/)** | Free tier; browser or app; simple edit and export. |

### Suggested flow (~2 min)

1. Run `demo_check.py` / `demo_check.java` — show failures.
2. Connect **tokis-test** → **Inject prompt** → mask a path → inject.
3. ChatGPT fix → **Review suggestions** → **Approve selected**.
4. Re-run demos — show fixes.

### Publishing (for README / resume)

1. Export **1080p** `.mp4`, keep under ~3 minutes.
2. Upload **YouTube (Unlisted)** or **Loom**.
3. Add one line to the root `README.md` under the evaluation line, e.g.  
   `**Demo video:** [Watch walkthrough](https://youtu.be/YOUR_ID)`
