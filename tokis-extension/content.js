console.log("Tokis Active");

let lastPrompt = "";
let promptCheckTimer = null;

const FILE_REF_PATTERN = /(?:^|\s)[@\/]([^\s@]+)/g;

const TEXTBOX_SELECTOR = '[contenteditable="true"]';

function getTextBox() {
  return document.querySelector(TEXTBOX_SELECTOR);
}

function resetPromptTimer() {
  if (promptCheckTimer) {
    clearTimeout(promptCheckTimer);
    promptCheckTimer = null;
  }
}

function parseFileReferences(text) {
  const refs = [];
  let match;

  FILE_REF_PATTERN.lastIndex = 0;
  while ((match = FILE_REF_PATTERN.exec(text)) !== null) {
    const ref = match[1].trim();
    if (!ref || ref.startsWith("http") || ref.startsWith("www.")) {
      continue;
    }
    refs.push(ref);
  }

  return [...new Set(refs)];
}

function mergeSnippets(primary, secondary) {
  const seen = new Set();
  const merged = [];

  for (const list of [primary, secondary]) {
    for (const item of list || []) {
      if (!item?.file || seen.has(item.file)) continue;
      seen.add(item.file);
      merged.push(item);
    }
  }

  return merged;
}

function basename(filePath) {
  const parts = String(filePath).replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || filePath;
}

async function cacheRepoFiles(repoId) {
  if (!repoId) return;

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "GET_REPO_FILES", payload: { repoId } },
      (data) => {
        if (Array.isArray(data) && !data?.error) {
          chrome.storage.local.set({
            repoFilePaths: data,
            repoFilePathsRepoId: String(repoId),
          });
        }
        resolve();
      },
    );
  });
}

async function getRepoFilePaths() {
  const repoData = await chrome.storage.local.get([
    "repoId",
    "repoFilePaths",
    "repoFilePathsRepoId",
  ]);

  if (!repoData.repoId) {
    return [];
  }

  if (
    Array.isArray(repoData.repoFilePaths) &&
    repoData.repoFilePaths.length > 0 &&
    repoData.repoFilePathsRepoId === String(repoData.repoId)
  ) {
    return repoData.repoFilePaths;
  }

  await cacheRepoFiles(repoData.repoId);
  const updated = await chrome.storage.local.get(["repoFilePaths"]);
  return updated.repoFilePaths || [];
}

async function resolveFileReferences(references) {
  const repoData = await chrome.storage.local.get(["repoId"]);
  if (!repoData.repoId || !references.length) {
    return { snippets: [], error: null };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "RESOLVE_FILE_REFS",
        payload: {
          repoId: repoData.repoId,
          references,
        },
      },
      (data) => {
        if (chrome.runtime.lastError) {
          resolve({ snippets: [], error: chrome.runtime.lastError.message });
          return;
        }
        if (data?.error) {
          resolve({ snippets: [], error: data.error });
          return;
        }
        if (!Array.isArray(data)) {
          resolve({ snippets: [], error: "Unexpected response from backend." });
          return;
        }
        resolve({ snippets: data, error: null });
      },
    );
  });
}

async function fetchRelevantFiles(prompt) {
  const repoData = await chrome.storage.local.get(["repoId"]);

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "QUERY",
        payload: {
          repoId: repoData.repoId,
          query: prompt,
        },
      },
      (data) => {
        if (chrome.runtime.lastError) {
          resolve({
            snippets: [],
            error: chrome.runtime.lastError.message,
          });
          return;
        }

        if (data?.error) {
          resolve({ snippets: [], error: data.error });
          return;
        }

        if (!Array.isArray(data)) {
          resolve({
            snippets: [],
            error: "Unexpected response from backend.",
          });
          return;
        }

        resolve({ snippets: data, error: null });
      },
    );
  });
}

async function fetchSuggestedSnippets(prompt) {
  const fileRefs = parseFileReferences(prompt);
  const shouldQuery = Boolean(prompt) && isCodingPrompt(prompt);

  const [refResult, queryResult] = await Promise.all([
    fileRefs.length
      ? resolveFileReferences(fileRefs)
      : Promise.resolve({ snippets: [], error: null }),
    shouldQuery
      ? fetchRelevantFiles(prompt)
      : Promise.resolve({ snippets: [], error: null }),
  ]);

  return {
    snippets: mergeSnippets(refResult.snippets, queryResult.snippets),
    error: refResult.error || queryResult.error,
    fileRefs,
  };
}

async function openInjectPromptPicker() {
  const textBox = getTextBox();
  if (!textBox) {
    alert("No chat input found on this page.");
    return;
  }

  const repoData = await chrome.storage.local.get(["repoId"]);
  if (!repoData.repoId) {
    alert("Connect a repository first.");
    return;
  }

  const prompt = textBox.innerText.trim();
  const paths = await getRepoFilePaths();

  if (!paths.length) {
    alert("No indexed files for this repository. Re-add the project to ingest files.");
    return;
  }

  const { snippets: suggested, error, fileRefs } = await fetchSuggestedSnippets(prompt);
  const suggestedByPath = new Map(suggested.map((s) => [s.file, s]));

  const allSnippets = paths.map((path) => {
    return suggestedByPath.get(path) || { file: path, snippet: "", line: 1 };
  });

  const precheckedPaths = suggested.map((s) => s.file);

  showContextPopup(allSnippets, prompt, textBox, error, {
    precheckedPaths,
    fileRefs,
    manualMode: true,
  });
}

window.openInjectPromptPicker = openInjectPromptPicker;

function isCodingPrompt(prompt) {
  const keywords = [
    "bug",
    "fix",
    "refactor",
    "optimize",
    "error",
    "function",
    "api",
    "backend",
    "frontend",
    "jwt",
    "auth",
    "token",
    "middleware",
    "npm",
    "create",
    "build",
  ];

  const lower = prompt.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showContextPopup(snippets, prompt, textbox, error, options = {}) {
  const existing = document.getElementById("tokis-popup");
  if (existing) existing.remove();

  const precheckedPaths = new Set(options.precheckedPaths || []);
  const fileRefs = options.fileRefs || [];
  const refHint =
    fileRefs.length > 0
      ? `<p class="tokis-context-hint">Suggested from @ / refs: ${fileRefs.map(escapeHtml).join(", ")}</p>`
      : options.manualMode
        ? `<p class="tokis-context-hint">Pick files to include. Suggested matches are pre-selected.</p>`
        : "";

  const popup = document.createElement("div");
  popup.id = "tokis-popup";

  const errorBlock = error ? `<p class="tokis-error">${escapeHtml(error)}</p>` : "";

  const snippetList =
    snippets.length > 0
      ? `<div class="tokis-file-list">${snippets
          .map((s, i) => {
            const isRef = precheckedPaths.has(s.file);
            const checked = precheckedPaths.has(s.file) ? "checked" : "";
            const label = basename(s.file);
            return `
<label class="tokis-file-item${isRef ? " tokis-file-ref" : ""}" title="${escapeHtml(s.file)}">
  <input type="checkbox" class="tokis-file-checkbox" ${checked} value="${i}" />
  <span class="tokis-file-name">${escapeHtml(label)}</span>
</label>`;
          })
          .join("")}</div>`
      : '<p class="folder-info tokis-file-empty">No files in repository.</p>';

  popup.innerHTML = `
<div class="tokis-container tokis-context-popup">
  <h2>Tokis Context</h2>
  <p class="tokis-context-hint">Select files, then preview before injecting into chat.</p>
  ${refHint}
  ${errorBlock}
  ${snippetList}
  <button type="button" id="tokis-inject">Continue to preview</button>
</div>
`;

  document.body.appendChild(popup);

  const injectBtn = document.getElementById("tokis-inject");
  if (injectBtn) {
    injectBtn.disabled = Boolean(error) || snippets.length === 0;
    const syncInjectState = () => {
      const checked = popup.querySelectorAll(".tokis-file-checkbox:checked").length;
      injectBtn.disabled = Boolean(error) || checked === 0;
    };

    popup.addEventListener("change", (event) => {
      if (event.target?.classList?.contains("tokis-file-checkbox")) {
        syncInjectState();
      }
    });

    injectBtn.onclick = async () => {
      const selected = Array.from(
        popup.querySelectorAll(".tokis-file-checkbox:checked"),
      ).map((cb) => snippets[Number(cb.value)]);

      if (!selected.length) return;

      injectBtn.disabled = true;
      injectBtn.textContent = "Loading…";

      const resolved = await resolveFileReferences(selected.map((s) => s.file));
      if (resolved.error) {
        alert(resolved.error);
        injectBtn.disabled = false;
        injectBtn.textContent = "Inject selected";
        return;
      }

      const resolvedByPath = new Map(resolved.snippets.map((s) => [s.file, s]));
      const filled = selected.map((s) => resolvedByPath.get(s.file) || s);

      popup.remove();

      const draft =
        typeof buildPromptWithTokis === "function"
          ? buildPromptWithTokis(prompt, filled)
          : buildPrompt(prompt, filled);

      if (typeof showMaskPreviewModal === "function") {
        showMaskPreviewModal({
          title: "Preview inject",
          hint: "Select sensitive text → Mask selection. ChatGPT gets MASK1, MASK2; Review restores real values.",
          content: draft,
          confirmLabel: "Inject into chat",
          onConfirm: (text) => injectTextIntoChat(text, textbox),
        });
      } else if (typeof showPreviewEditorModal === "function") {
        showPreviewEditorModal({
          title: "Preview inject",
          hint: "Edit the message, then inject into the chat composer.",
          content: draft,
          confirmLabel: "Inject into chat",
          onConfirm: (text) => injectTextIntoChat(text, textbox),
        });
      } else {
        injectTextIntoChat(draft, textbox);
      }
    };

    syncInjectState();
  }
}

function buildPrompt(prompt, snippets) {
  if (typeof buildPromptWithTokis === "function") {
    return buildPromptWithTokis(prompt, snippets);
  }

  let finalPrompt = `Task:\n${prompt.trim()}\n\nRelevant Context:\n`;

  snippets.forEach((s) => {
    finalPrompt += `\n---${s.file}---\n${(s.snippet || "").trim()}\n`;
  });

  return finalPrompt.trimEnd();
}

function injectTextIntoChat(finalPrompt, textbox) {
  textbox.innerText = finalPrompt;
  textbox.focus();

  textbox.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
    }),
  );

  resetPromptTimer();
  lastPrompt = finalPrompt;

  document.getElementById("tokis-popup")?.remove();

  if (typeof setFabStatus === "function") {
    setFabStatus("Injected into chat", "ok");
  }

  console.log("Prompt injected");
}

window.addEventListener("load", async () => {
  let data = await chrome.storage.local.get(["repoId", "repoName", "repoPath"]);

  if (!data.repoId || data.repoId === "") {
    showWorkspacePopup();
    return;
  }

  if (!data.repoPath) {
    const repo = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_REPO", payload: { repoId: data.repoId } }, resolve);
    });
    if (repo?.path) {
      await chrome.storage.local.set({ repoPath: repo.path, repoName: repo.name || data.repoName });
      data.repoPath = repo.path;
      data.repoName = repo.name || data.repoName;
    }
  }

  if (data.repoPath && typeof ensureTokisProtocol === "function") {
    await ensureTokisProtocol(data.repoPath);
  }
  await cacheRepoFiles(data.repoId);
  showConnectedBadge(data.repoName, data.repoPath);
});
