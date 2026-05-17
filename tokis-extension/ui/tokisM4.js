const TOKIS_AGENT_BASE = "http://localhost:8003";
const TOKIS_CHAT_INJECT_MAX = 24000;
const TOKIS_PREVIEW_MAX = 120000;
const TOKIS_LOCAL_FILE_MAX = 512_000;
const TOKIS_EDIT_PREVIEW_LINES = 80;

const TOKIS_TEXT_FILE_ACCEPT =
  ".txt,.md,.json,.js,.ts,.jsx,.tsx,.py,.java,.kt,.go,.rs,.c,.cpp,.h,.cs,.rb,.php,.sql,.xml,.yml,.yaml,.toml,.env,.properties,.css,.html,.htm,.sh,.ps1,.gradle,.vue,.svelte";

const TOKIS_EDIT_FENCE_PATTERN = /```tokis-edit:([^\n`]+)\r?\n([\s\S]*?)```/g;
const TOKIS_EDIT_HEADING_PATTERN =
  /(?:^|\n)\s*#*\s*\*?\*?tokis-edit:\s*([^\n`]+)\*?\*?\s*\n+([\s\S]*?)(?=\n\s*#*\s*\*?\*?tokis-edit:\s*|\s*$)/gi;

function tokisEscapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tokisBasename(filePath) {
  const parts = String(filePath).replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || filePath;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateForChat(text, max = TOKIS_CHAT_INJECT_MAX) {
  const s = String(text || "");
  if (s.length <= max) return { text: s, truncated: false };
  return {
    text: `${s.slice(0, max)}\n\n... (truncated for chat, ${formatBytes(s.length)} total)`,
    truncated: true,
  };
}

async function getRepoContext() {
  return chrome.storage.local.get(["repoId", "repoName", "repoPath"]);
}

async function agentPost(path, body) {
  try {
    const response = await fetch(`${TOKIS_AGENT_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch (e) {
    return {
      error:
        e.message === "Failed to fetch"
          ? "Cannot reach tokis-agent on localhost:8003"
          : e.message,
    };
  }
}

async function ensureTokisProtocol(repoPath) {
  if (!repoPath) return null;
  return agentPost("/files/ensure-protocol", { repoRoot: repoPath });
}

async function readTokisProtocol() {
  const { repoPath } = await getRepoContext();
  if (!repoPath) return { error: "No repository connected" };
  await ensureTokisProtocol(repoPath);
  return agentPost("/files/read", {
    repoRoot: repoPath,
    relativePath: ".tokis/protocol.md",
  });
}

async function saveTokisProtocol(content) {
  const { repoPath } = await getRepoContext();
  if (!repoPath) return { error: "No repository connected" };
  return agentPost("/files/write", {
    repoRoot: repoPath,
    relativePath: ".tokis/protocol.md",
    content,
  });
}

function pathBasename(filePath) {
  const parts = String(filePath).replace(/\\/g, "/").split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

function toRelativePath(filePath, repoRoot) {
  const norm = String(filePath || "").replace(/\\/g, "/").trim();
  const root = String(repoRoot || "")
    .replace(/\\/g, "/")
    .replace(/\/$/, "");
  if (!root) return norm.replace(/^\.+\//, "").replace(/^\/+/, "");
  if (norm.toLowerCase().startsWith(root.toLowerCase() + "/")) {
    return norm.slice(root.length + 1);
  }
  return norm.replace(/^\.+\//, "").replace(/^\/+/, "");
}

function buildRepoPathIndex(repoPaths, repoRoot) {
  const index = new Set();
  for (const p of repoPaths || []) {
    const rel = toRelativePath(p, repoRoot).replace(/^\.+\//, "").replace(/^\/+/, "");
    if (rel) index.add(rel.toLowerCase());
  }
  return index;
}

function repoPathExists(rel, repoRoot, repoPaths) {
  if (!rel) return false;
  const cleaned = String(rel).replace(/^\.+\//, "").replace(/^\/+/, "");
  if (!cleaned) return false;
  const index = buildRepoPathIndex(repoPaths, repoRoot);
  if (index.size) return index.has(cleaned.toLowerCase());
  return false;
}

/** Strip repo-root prefix, duplicate repo folder names, and mistaken leading segments. */
function normalizeRepoRelativePath(filePath, repoRoot, repoPaths = []) {
  let rel = toRelativePath(filePath, repoRoot);
  rel = rel.replace(/^\.+\//, "").replace(/^\/+/, "");
  if (!rel || !repoRoot) return rel;

  if (repoPathExists(rel, repoRoot, repoPaths)) return rel;

  const rootName = pathBasename(String(repoRoot).replace(/\/$/, ""));
  while (rootName && rel.toLowerCase().startsWith(`${rootName.toLowerCase()}/`)) {
    rel = rel.slice(rootName.length + 1);
    if (repoPathExists(rel, repoRoot, repoPaths)) return rel;
  }

  const parts = rel.split("/").filter(Boolean);
  while (parts.length > 1) {
    const shorter = parts.slice(1).join("/");
    if (repoPathExists(shorter, repoRoot, repoPaths)) return shorter;
    parts.shift();
  }

  return rel;
}

function snippetDisplayPath(snippet, repoRoot) {
  if (snippet?.relativePath) return snippet.relativePath;
  return toRelativePath(snippet?.file, repoRoot) || snippet?.file || "";
}

function buildPromptWithTokis(task, snippets, repoRoot) {
  let body = `Task:\n${(task || "").trim()}\n\nRelevant Context:\n`;
  snippets.forEach((s) => {
    const capped = truncateForChat((s.snippet || "").trim(), 8000);
    const pathLabel = snippetDisplayPath(s, repoRoot);
    body += `\n---${pathLabel}---\n${capped.text}\n`;
  });
  body += `\nTokis: Follow \`.tokis/protocol.md\`. For each changed file use \`\`\`tokis-edit:path\`\`\` — same label as each ---header--- above (e.g. \`\`\`tokis-edit:src/helper.py\`\`\`, or \`\`\`tokis-edit:MASK1\`\`\` if you mask paths in preview). Do not guess filenames.`;
  return truncateForChat(body, TOKIS_CHAT_INJECT_MAX).text;
}

function buildFileToChatBlock(filePath, content, repoRoot) {
  const capped = truncateForChat(content, TOKIS_CHAT_INJECT_MAX);
  const pathLabel =
    repoRoot && !String(filePath).includes("---")
      ? toRelativePath(filePath, repoRoot) || filePath
      : filePath;
  return `\n---${pathLabel}---\n${capped.text}\n`;
}

function appendTextToChatComposer(textBox, content) {
  if (!textBox) return;
  const block = String(content || "").trim();
  if (!block) return;
  const current = textBox.innerText.trim();
  textBox.innerText = current ? `${current}\n\n${block}` : block;
  textBox.focus();
  textBox.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

function showInjectFilePreview(textBox, combined, options = {}) {
  const capped = truncateForChat(combined.trim(), TOKIS_CHAT_INJECT_MAX);
  const previewOpts = {
    title: options.title || "Inject file",
    hint:
      options.hint ||
      "Select sensitive text → Mask selection, then inject. ChatGPT sees MASK1, MASK2 only.",
    content: capped.text,
    truncated: capped.truncated || options.truncated,
    confirmLabel: options.confirmLabel || "Inject into chat",
    onConfirm: (content) => {
      appendTextToChatComposer(textBox, content);
      setFabStatus(options.successMessage || "File(s) injected into chat", "ok");
    },
  };

  if (typeof showMaskPreviewModal === "function") {
    showMaskPreviewModal(previewOpts);
  } else {
    showPreviewEditorModal(previewOpts);
  }
}

function pickLocalFiles() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = TOKIS_TEXT_FILE_ACCEPT;
    input.style.cssText = "position:fixed;left:-9999px;opacity:0;";
    document.body.appendChild(input);

    const finish = (files) => {
      input.remove();
      resolve(files);
    };

    input.addEventListener(
      "change",
      () => finish(Array.from(input.files || [])),
      { once: true },
    );
    input.addEventListener("cancel", () => finish([]), { once: true });

    input.click();
  });
}

async function readLocalFilesAsBlocks(files) {
  let combined = "";
  let anyTruncated = false;

  for (const file of files) {
    if (file.size > TOKIS_LOCAL_FILE_MAX) {
      return {
        error: `${file.name} is too large (max ${formatBytes(TOKIS_LOCAL_FILE_MAX)}).`,
      };
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.includes(0)) {
      return { error: `${file.name} looks binary; choose a text file.` };
    }

    const content = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    combined += buildFileToChatBlock(file.name, content);
    if (content.length > TOKIS_CHAT_INJECT_MAX) anyTruncated = true;
  }

  return { combined: combined.trim(), truncated: anyTruncated };
}

async function injectLocalFilesIntoChat(textBox) {
  const files = await pickLocalFiles();
  if (!files.length) return;

  const result = await readLocalFilesAsBlocks(files);
  if (result.error) {
    alert(result.error);
    return;
  }

  showInjectFilePreview(textBox, result.combined, {
    truncated: result.truncated,
    successMessage: `Injected ${files.length} file(s) into chat`,
  });
}

function setFabStatus(message, tone = "info") {
  const el = document.getElementById("tokis-fab-statusline");
  if (!el) return;
  el.textContent = message || "";
  el.dataset.tone = tone;
}

function cleanEditContent(raw) {
  let content = String(raw || "").trim();
  content = content.replace(/^```[\w.-]*\s*\n?/, "");
  content = content.replace(/\n?```\s*$/, "");
  content = content
    .split("\n")
    .filter((line) => !/^(copy code|copied!)$/i.test(line.trim()))
    .join("\n");
  return content.trim();
}

function normalizeEditPath(path) {
  return String(path || "")
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, "")
    .replace(/\\/g, "/");
}

function parseTokisEdits(text) {
  const byPath = new Map();
  const source = String(text || "");

  let match;
  TOKIS_EDIT_FENCE_PATTERN.lastIndex = 0;
  while ((match = TOKIS_EDIT_FENCE_PATTERN.exec(source)) !== null) {
    const relativePath = normalizeEditPath(match[1]);
    const content = cleanEditContent(match[2]);
    if (relativePath && content) {
      byPath.set(relativePath, { relativePath, content });
    }
  }

  TOKIS_EDIT_HEADING_PATTERN.lastIndex = 0;
  while ((match = TOKIS_EDIT_HEADING_PATTERN.exec(source)) !== null) {
    const relativePath = normalizeEditPath(match[1]);
    const content = cleanEditContent(match[2]);
    if (relativePath && content) {
      byPath.set(relativePath, { relativePath, content });
    }
  }

  return [...byPath.values()];
}

function getLastAssistantText() {
  const assistants = document.querySelectorAll('[data-message-author-role="assistant"]');
  if (assistants.length > 0) {
    const last = assistants[assistants.length - 1];
    const markdown =
      last.querySelector(".markdown, .prose, [class*='markdown']") ||
      last.querySelector("[data-message-id] .whitespace-pre-wrap");
    if (markdown?.innerText) return markdown.innerText;
    return last.innerText || "";
  }

  const turnSelectors = [
    "article[data-turn='assistant']",
    "[data-testid='conversation-turn']:has([data-message-author-role='assistant'])",
    "[data-testid='conversation-turn-content']",
    ".model-response-text",
    "message-content",
  ];
  for (const selector of turnSelectors) {
    const nodes = document.querySelectorAll(selector);
    if (nodes.length > 0) {
      const last = nodes[nodes.length - 1];
      const md = last.querySelector?.(".markdown, .prose");
      return (md?.innerText || last.innerText || "").trim();
    }
  }
  return "";
}

function removeTokisPopup() {
  document.getElementById("tokis-popup")?.remove();
}

function showPreviewEditorModal(options) {
  if (typeof showMaskPreviewModal === "function") {
    showMaskPreviewModal({ ...options, enableMasking: false });
    return;
  }

  removeTokisPopup();
  const popup = document.createElement("div");
  popup.id = "tokis-popup";
  popup.innerHTML = `<div class="tokis-container">Preview unavailable</div>`;
  document.body.appendChild(popup);
}

function showProtocolEditor() {
  readTokisProtocol().then((result) => {
    if (result.error) {
      alert(result.error);
      return;
    }
    showPreviewEditorModal({
      title: "Edit Tokis rules",
      hint: "Saved to .tokis/protocol.md in your repo. Short inject references this file.",
      content: result.content || "",
      confirmLabel: "Save rules",
      onConfirm: async (content) => {
        const saved = await saveTokisProtocol(content);
        if (saved.error) {
          alert(saved.error);
          return;
        }
        setFabStatus("Rules saved", "ok");
      },
    });
  });
}

async function applyTokisEdits(edits) {
  const { repoPath } = await getRepoContext();
  if (!repoPath) return { error: "No repository connected" };

  let toApply = edits;
  if (typeof resolveEditsForApply === "function") {
    const resolved = await resolveEditsForApply(edits);
    if (resolved.errors?.length) {
      const detail = resolved.errors.map((e) => `${e.rawPath}: ${e.message}`).join("\n");
      return { error: detail, resolveErrors: resolved.errors };
    }
    toApply = resolved.edits;
  }

  const repoPaths =
    typeof getRepoFilePaths === "function" ? await getRepoFilePaths() : [];

  const normalized = toApply.map((e) => {
    const rel = normalizeRepoRelativePath(e.relativePath, repoPath, repoPaths);
    return { relativePath: rel || e.relativePath, content: e.content };
  });

  return agentPost("/files/apply", { repoRoot: repoPath, edits: normalized });
}

function previewEditContent(content) {
  const lines = String(content || "").split("\n");
  if (lines.length <= TOKIS_EDIT_PREVIEW_LINES) return content;
  return `${lines.slice(0, TOKIS_EDIT_PREVIEW_LINES).join("\n")}\n... (${lines.length - TOKIS_EDIT_PREVIEW_LINES} more lines)`;
}

async function openReviewEditsPopup(edits) {
  removeTokisPopup();

  let editsForApply = edits;
  let resolveErrors = [];

  if (typeof resolveEditsForApply === "function") {
    const resolved = await resolveEditsForApply(edits);
    editsForApply = resolved.edits;
    resolveErrors = resolved.errors || [];
  }

  if (resolveErrors.length) {
    alert(
      `Some paths could not be resolved:\n\n${resolveErrors.map((e) => `• ${e.rawPath}: ${e.message}`).join("\n")}\n\nAsk the model to use the same MASK token from inject (e.g. tokis-edit:MASK1) or the exact relative path from context.`,
    );
    if (!editsForApply.length) return;
  }

  const activeSet = typeof loadActiveMaskSet === "function" ? await loadActiveMaskSet() : null;
  const hasMasks = activeSet?.tokens && Object.keys(activeSet.tokens).length > 0;

  const popup = document.createElement("div");
  popup.id = "tokis-popup";

  const maskNote = hasMasks
    ? '<p class="tokis-context-hint">MASK tokens in replies are mapped to real repo paths before write (e.g. MASK1 → src/helper.py).</p>'
    : "";

  const listHtml = editsForApply
    .map(
      (edit, i) => `
<label class="tokis-file-item tokis-file-ref" title="${tokisEscapeHtml(edit.relativePath)}">
  <input type="checkbox" class="tokis-review-checkbox" checked value="${i}" />
  <span class="tokis-file-name">${tokisEscapeHtml(edit.relativePath)}</span>
</label>
<pre class="tokis-edit-preview">${tokisEscapeHtml(previewEditContent(edit.content))}</pre>
`,
    )
    .join("");

  popup.innerHTML = `
<div class="tokis-container tokis-context-popup">
  <h2>Review suggestions</h2>
  ${maskNote}
  <p class="tokis-context-hint">Approve file writes from the last model reply (${edits.length} file(s)).</p>
  <div class="tokis-file-list tokis-review-list">${listHtml}</div>
  <button type="button" id="tokis-apply-edits" class="tokis-fab-action tokis-fab-action--primary">Approve selected</button>
  <button type="button" id="tokis-insert-summary" class="tokis-fab-action">Insert apply summary</button>
  <button type="button" id="tokis-review-cancel" class="tokis-fab-action">Cancel</button>
</div>
`;

  document.body.appendChild(popup);

  popup.querySelector("#tokis-review-cancel")?.addEventListener("click", removeTokisPopup);

  popup.querySelector("#tokis-apply-edits")?.addEventListener("click", async () => {
    const selected = Array.from(popup.querySelectorAll(".tokis-review-checkbox:checked")).map(
      (cb) => editsForApply[Number(cb.value)],
    );
    if (!selected.length) return;

    const btn = popup.querySelector("#tokis-apply-edits");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Applying…";
    }

    const result = await applyTokisEdits(selected);
    if (result.error) {
      alert(result.error);
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Approve selected";
      }
      return;
    }

    const applied = result.applied || [];
    const failed = result.failed || [];
    let msg = `Applied ${applied.length} file(s)`;
    if (failed.length) msg += `, ${failed.length} failed`;
    setFabStatus(msg, failed.length ? "warn" : "ok");
    popup.dataset.lastApplied = JSON.stringify(
      applied.map((p) => tokisBasename(p)),
    );
    alert(msg + (failed.length ? `\n${failed.map((f) => f.path + ": " + f.error).join("\n")}` : ""));
  });

  popup.querySelector("#tokis-insert-summary")?.addEventListener("click", () => {
    const textbox = document.querySelector('[contenteditable="true"]');
    if (!textbox) return;
    const applied = popup.dataset.lastApplied
      ? JSON.parse(popup.dataset.lastApplied)
      : [];
    const summary =
      applied.length > 0
        ? `Tokis applied: ${applied.join(", ")}. Continue from the current repo state.`
        : "Tokis: approve files above, then use this to notify the model.";
    textbox.innerText = `${textbox.innerText.trim()}\n\n${summary}`.trim();
    textbox.dispatchEvent(new InputEvent("input", { bubbles: true }));
    removeTokisPopup();
  });
}

function showReviewSuggestionsModal() {
  const assistantText = getLastAssistantText();
  const edits = parseTokisEdits(assistantText);

  if (!edits.length) {
    showPreviewEditorModal({
      title: "Review suggestions",
      hint:
        "Auto-parse failed (common with ChatGPT headings). Paste the reply below — include lines like tokis-edit:MASK1 or tokis-edit:src/Calculator.java above each code block — then click Parse edits.",
      content: assistantText,
      confirmLabel: "Parse edits",
      onConfirm: (text) => {
        const parsed = parseTokisEdits(text);
        if (!parsed.length) {
          alert(
            "No edits found. Each file needs a line: tokis-edit:MASK1 or tokis-edit:src/yourfile.java then the full file content.",
          );
          return;
        }
        void openReviewEditsPopup(parsed);
      },
    });
    return;
  }

  void openReviewEditsPopup(edits);
}

window.ensureTokisProtocol = ensureTokisProtocol;
window.showProtocolEditor = showProtocolEditor;
window.showReviewSuggestionsModal = showReviewSuggestionsModal;
window.buildPromptWithTokis = buildPromptWithTokis;
window.buildFileToChatBlock = buildFileToChatBlock;
window.toRelativePath = toRelativePath;
window.normalizeRepoRelativePath = normalizeRepoRelativePath;
window.showPreviewEditorModal = showPreviewEditorModal;
window.setFabStatus = setFabStatus;
window.truncateForChat = truncateForChat;
window.getRepoContext = getRepoContext;
window.openFileToChatPicker = openFileToChatPicker;
window.injectLocalFilesIntoChat = injectLocalFilesIntoChat;

async function openInjectFilePicker() {
  const textBox = document.querySelector('[contenteditable="true"]');
  if (!textBox) {
    alert("No chat input found.");
    return;
  }

  const { repoId, repoPath } = await getRepoContext();
  if (repoId && typeof getRepoFilePaths === "function") {
    const paths = await getRepoFilePaths();
    if (paths.length) {
      const snippets = paths.map((path) => ({ file: path, snippet: "", line: 1 }));
      if (typeof showContextPopup === "function") {
        showContextPopup(snippets, "", textBox, null, {
          manualMode: true,
          repoPath: repoPath || "",
          injectFilesOnly: true,
        });
        return;
      }
    }
  }

  await injectLocalFilesIntoChat(textBox);
}
window.openInjectFilePicker = openInjectFilePicker;

async function openFileToChatPicker() {
  if (typeof openInjectPromptPicker !== "function") return;

  const textBox = document.querySelector('[contenteditable="true"]');
  if (!textBox) {
    alert("No chat input found.");
    return;
  }

  const repoData = await getRepoContext();
  if (!repoData.repoId) {
    alert("Connect a repository first.");
    return;
  }

  const paths = typeof getRepoFilePaths === "function" ? await getRepoFilePaths() : [];
  if (!paths.length) {
    alert("No indexed files.");
    return;
  }

  removeTokisPopup();
  const popup = document.createElement("div");
  popup.id = "tokis-popup";

  popup.innerHTML = `
<div class="tokis-container tokis-context-popup">
  <h2>File to chat</h2>
  <p class="tokis-context-hint">Add repo file content to the composer (no ChatGPT upload).</p>
  <div class="tokis-file-list" id="tokis-ftc-list"></div>
  <button type="button" id="tokis-ftc-load" class="tokis-fab-action tokis-fab-action--primary">Load & preview</button>
  <button type="button" id="tokis-ftc-cancel" class="tokis-fab-action">Cancel</button>
</div>
`;

  document.body.appendChild(popup);
  const list = popup.querySelector("#tokis-ftc-list");
  if (list) {
    const { repoPath } = await getRepoContext();
    list.innerHTML = paths
      .map((p, i) => {
        const label =
          repoPath && typeof toRelativePath === "function"
            ? toRelativePath(p, repoPath)
            : tokisBasename(p);
        return `
<label class="tokis-file-item" title="${tokisEscapeHtml(p)}">
  <input type="checkbox" class="tokis-ftc-checkbox" value="${i}" />
  <span class="tokis-file-name">${tokisEscapeHtml(label)}</span>
</label>`;
      })
      .join("");
  }

  popup.querySelector("#tokis-ftc-cancel")?.addEventListener("click", removeTokisPopup);

  popup.querySelector("#tokis-ftc-load")?.addEventListener("click", async () => {
    const selected = Array.from(popup.querySelectorAll(".tokis-ftc-checkbox:checked")).map(
      (cb) => paths[Number(cb.value)],
    );
    if (!selected.length) return;

    const { repoPath } = await getRepoContext();
    let combined = "";
    let anyTruncated = false;

    for (const filePath of selected) {
      const rel = toRelativePath(filePath, repoPath) || filePath;
      const read = await agentPost("/files/read", { repoRoot: repoPath, path: rel });
      if (read.error) {
        alert(`${rel}: ${read.error}`);
        return;
      }
      combined += buildFileToChatBlock(rel, read.content, repoPath);
      if (read.truncated) anyTruncated = true;
    }

    const capped = truncateForChat(combined.trim());
    removeTokisPopup();

    const ftcPreview = {
      title: "File to chat",
      hint: "Select sensitive text → Mask selection, then add to composer.",
      content: capped.text,
      truncated: capped.truncated || anyTruncated,
      confirmLabel: "Add to chat",
      onConfirm: (content) => {
        appendTextToChatComposer(textBox, content);
        setFabStatus("File content added to chat", "ok");
      },
    };
    if (typeof showMaskPreviewModal === "function") {
      showMaskPreviewModal(ftcPreview);
    } else {
      showPreviewEditorModal(ftcPreview);
    }
  });
}
