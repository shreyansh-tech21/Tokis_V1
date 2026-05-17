# Tokis

> **Tagline:** A privacy-aware developer bridge between your local repository and ChatGPT—inject context, mask sensitive paths, review AI-suggested edits, and apply changes only after you approve.

<p align="center">
  <strong>Local code stays local. The model sees what you allow. Your disk updates only when you say so.</strong>
</p>

Tokis is a Chrome extension and local service stack that connects a real project on disk to ChatGPT or Gemini. You select files from your repo, optionally mask paths as reversible tokens (`MASK1`, `MASK2`), send structured context to the model, parse its `tokis-edit` suggestions, and write approved files through a local agent—nothing touches your repository until you confirm in **Review suggestions**.

Built for teams that need LLM productivity without giving up control, path privacy, or a clear audit trail of what was applied.

---

## Demo video

Watch a full walkthrough: connect repo → inject with path masking → ChatGPT fix → review and apply.

<!-- Step 1: Pick ONE option below and replace the placeholders before you push. -->

### Option A — YouTube (recommended for recruiters)

1. Upload your recording to YouTube (visibility: **Unlisted** is fine).
2. Copy the video ID from the URL (`youtube.com/watch?v=` **`THIS_PART`**).
3. Replace `YOUR_VIDEO_ID` in the line below.

[![Watch the Tokis demo](https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID)

**Direct link:** `https://www.youtube.com/watch?v=YOUR_VIDEO_ID`

### Option B — GitHub-hosted clip (no YouTube)

1. Open any **Issue** or **Pull Request** in this repo (you can open a draft PR and close it later).
2. Drag and drop your `.mp4` / `.mov` into the comment box; GitHub uploads it and shows a URL like  
   `https://github.com/user-attachments/assets/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
3. Paste that URL here:

```markdown
https://github.com/user-attachments/assets/PASTE_YOUR_ASSET_ID_HERE
```

Or embed in the README with HTML (works on GitHub):

```html
<video src="https://github.com/user-attachments/assets/PASTE_YOUR_ASSET_ID_HERE" controls width="100%"></video>
```

### Option C — Loom or cloud link

[![Watch on Loom](https://img.shields.io/badge/Demo-Loom-625DF5?style=for-the-badge)](https://www.loom.com/share/YOUR_LOOM_ID)

Replace the URL with your share link.

---

> **GitHub “About” box (paste into repo description):**  
> Privacy-aware ChatGPT workflow for local repos—inject context, mask paths, review AI edits, approve before write.

---
## Why Tokis exists

| Problem | How Tokis addresses it |
|--------|-------------------------|
| Pasting code into ChatGPT exposes paths, keys, and internal structure | Preview-time **path masking** with tokens; real values restored only on your machine at review |
| No structured apply flow from model replies | Parses `tokis-edit` blocks → **Review suggestions** → approve → writes via local agent |
| Upload limits / no repo awareness | **Inject prompt** resolves indexed files; **Inject file** for local files; no cloud upload required |
| Model claims “I updated your files” | `.tokis/protocol.md` + approve gate; disk changes only after you click **Approve selected** |

---

## Architecture

```mermaid
flowchart LR
  subgraph browser [Browser]
    Ext[Chrome extension]
    LLM[ChatGPT / Gemini]
  end

  subgraph local [Local services]
    API[Spring Boot API :8080]
    Agent[Tokis Agent :8003]
    Worker[Worker :8002]
    Analyzer[Analyzer :8001]
    DB[(PostgreSQL)]
  end

  subgraph disk [Your machine]
    Repo[Project folder]
  end

  Ext <-->|REST| API
  Ext <-->|files / apply| Agent
  API --> DB
  API --> Worker
  API --> Analyzer
  Agent --> Repo
  Analyzer --> Repo
  Ext <-->|inject / chat| LLM
```

| Component | Port | Role |
|-----------|------|------|
| **tokis-extension** | — | FAB UI: connect repo, inject, mask, review, apply |
| **tokis** (Spring Boot) | 8080 | Repos, file index, resolve snippets, mask vault API |
| **tokis-agent** | 8003 | Folder picker, read/write/apply files on disk |
| **worker** | 8002 | Query → relevant file snippets |
| **analyzer** | 8001 | Ingest repo file list for indexing |
| **PostgreSQL** | 5432 | Repo metadata, file nodes, mask references |

---

## Key features

- **Connect repository** — Pick a folder via native dialog; ingest file index into Tokis.
- **Inject prompt** — Select files, preview, mask paths (`MASK1`), inject into the chat composer.
- **Inject file** — Attach arbitrary local text files with the same preview/mask flow.
- **Review suggestions** — Parse model `tokis-edit` output; demask paths; preview real content; apply to disk.
- **Privacy-aware masking** — Mask paths in preview; LLM sees tokens; Tokis resolves real paths before write (blocks `MASK*.java` mistaken paths).
- **Repository management** — List, connect, delete indexed repos (disk files are never deleted).

---

## Tech stack

- **Frontend:** Chrome Extension (Manifest V3), vanilla JS
- **API:** Java 17+, Spring Boot, JPA, PostgreSQL
- **Agents / ML helpers:** Python, FastAPI, Uvicorn
- **Integration:** ChatGPT, Gemini (content scripts)

---

## Prerequisites

- **Chrome** (or Chromium) for the extension
- **Java 17+** and Maven (or use `tokis/tokis/mvnw`)
- **Python 3.10+**
- **PostgreSQL** running locally with database `tokis` (see `application.yml`)
- **Windows / macOS / Linux** — folder picker agent tested on Windows; paths supported cross-platform

---

## Quick start

### 1. Database

Create PostgreSQL database `tokis` (user/password as in `tokis/tokis/src/main/resources/application.yml` or override).

### 2. Start services (four terminals)

```bash
# Terminal 1 — Analyzer
cd analyzer/app
uvicorn main:app --reload --port 8001

# Terminal 2 — Worker (from worker/)
cd worker
uvicorn app.main:app --reload --port 8002

# Terminal 3 — Spring API
cd tokis/tokis
./mvnw spring-boot:run

# Terminal 4 — Tokis Agent
cd tokis-agent/app
uvicorn main:app --reload --port 8003
```

On Windows PowerShell, use `.\mvnw` and ensure each app module is on `PYTHONPATH` if imports fail (run from the paths shown above).

### 3. Load the extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `tokis-extension` folder
4. Open [ChatGPT](https://chatgpt.com) or [Gemini](https://gemini.google.com)

### 4. Connect the demo repo

1. Click the **Tokis** FAB → **Add Project**
2. Select the `tokis-test` folder from this repository
3. In chat, type a task (see demo script below)

---

## Demo repo (`tokis-test`)

Intentionally buggy sample project for recordings and interviews.

| File | Issue |
|------|--------|
| `src/Calculator.java` | Divide by zero; `greet(null)` NPE |
| `src/helper.py` | `=` instead of `==` in `find_user`; `average([])` crashes |
| `config.js` | Mixed ESM/CommonJS; typo in export name |
| `logs/build.log` | Sample CI log (useful for path-masking demos) |

**Verify bugs locally (before Tokis fix):**

```bash
cd tokis-test

# Python — expect SyntaxError until helper.py is fixed
python demo_check.py

# Java
mkdir -p out 2>nul || mkdir out
javac -d out demo_check.java src/Calculator.java
java -cp out demo_check
```

**Suggested ChatGPT prompt after inject:**

```text
Fix the bugs in src/Calculator.java and src/helper.py. Use tokis-edit blocks with real repo paths (e.g. src/Calculator.java). Do not claim files were written until I approve in Tokis.
```

Detailed steps: [tokis-test/TESTING.md](tokis-test/TESTING.md)

---

## Recording script (~2 minutes)

Use this outline while filming; link the result in [Demo video](#demo-video) above.

1. **Show broken tests** — Run `demo_check.py` / `demo_check.java`; show failures.
2. **Connect** — Add Project → `tokis-test`.
3. **Inject** — Inject prompt → select `Calculator.java`, `helper.py` → mask a path in preview → **Continue → inject into chat**.
4. **ChatGPT** — Send; model returns `tokis-edit` blocks.
5. **Review** — Review suggestions → show demasked real paths → **Approve selected**.
6. **Prove fix** — Re-run demo checks; show passing behavior.

---

## Security & privacy notes

- Mask placeholders are stored locally (extension + optional Spring `mask_reference` table) and **demasked only on review/apply** on your machine.
- Tokis does not send chat traffic to Microsoft or OpenAI servers—only you interact with the LLM in the browser.
- Sensitive files (e.g. `.env`) should stay **unchecked** on inject; mask only what you must share.
- Apply endpoint rejects file paths that still contain unresolved `MASK` tokens.

---

## Project structure

```
Tokis_V1/
├── tokis-extension/     # Chrome extension (FAB, inject, mask, review)
├── tokis/tokis/         # Spring Boot API
├── tokis-agent/         # Local file I/O + folder picker
├── worker/              # Snippet retrieval for queries
├── analyzer/            # Repo ingest
└── tokis-test/          # Demo project with intentional bugs
```

---

## Roadmap

- [ ] Terminal capture (`tokis-run`) with approval gate
- [ ] Team-wide mask policies and audit log
- [ ] IDE extension (VS Code) sharing the same protocol
- [ ] Optional cloud sync for repo index (enterprise deployment)

---

## Author

**Karam** — built for safe, practical AI-assisted development workflows.

If you're reviewing this for a role: the focus is **trust, privacy, and developer control** when using public LLMs on private codebases—the same constraints teams at scale care about.

---

## License

MIT (or adjust before publish if your organization requires a different license).
