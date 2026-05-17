const TOKIS_MASK_TOKEN_PATTERN = /\bMASK(\d+)\b/g;

function createMaskVault() {
  return { nextIndex: 1, tokens: {} };
}

function cloneMaskVault(vault) {
  return {
    nextIndex: vault?.nextIndex || 1,
    tokens: { ...(vault?.tokens || {}) },
  };
}

function listMaskEntries(vault) {
  return Object.entries(vault?.tokens || {}).sort(
    (a, b) => Number(a[0].replace("MASK", "")) - Number(b[0].replace("MASK", "")),
  );
}

function allocateMaskToken(vault) {
  const token = `MASK${vault.nextIndex}`;
  vault.nextIndex += 1;
  return token;
}

function maskSelectionInTextarea(textarea, vault) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) {
    return { error: "Select text in the preview first." };
  }

  const full = textarea.value;
  const selected = full.slice(start, end);
  if (!selected.trim()) {
    return { error: "Selection is empty." };
  }

  if (/\bMASK\d+\b/.test(selected)) {
    return { error: "Selection already contains a placeholder." };
  }

  const headerMask = maskFileHeaderPath(full, start, end, vault);
  if (headerMask) {
    textarea.value = headerMask.newText;
    textarea.setSelectionRange(headerMask.cursor, headerMask.cursor);
    textarea.focus();
    return { token: headerMask.token, value: vault.tokens[headerMask.token], vault, kind: "path" };
  }

  if (!isPathLikeText(selected)) {
    const ok = confirm(
      "Tokis works best when you mask paths (folders, file paths).\n\nMask this selection anyway?",
    );
    if (!ok) return { error: "Cancelled." };
  }

  const token = allocateMaskToken(vault);
  vault.tokens[token] = selected;
  vault.tokenKinds = vault.tokenKinds || {};
  vault.tokenKinds[token] = isPathLikeText(selected) ? "path" : "text";

  const masked = full.slice(0, start) + token + full.slice(end);
  textarea.value = masked;
  const cursor = start + token.length;
  textarea.setSelectionRange(cursor, cursor);
  textarea.focus();

  return { token, value: selected, vault, kind: vault.tokenKinds[token] };
}

function getTokenMap(vaultOrTokens) {
  return vaultOrTokens?.tokens != null ? vaultOrTokens.tokens : vaultOrTokens || {};
}

function demaskText(text, vaultOrTokens) {
  const tokens = getTokenMap(vaultOrTokens);
  if (!text || !Object.keys(tokens).length) return text;

  let result = String(text);
  const entries = Object.entries(tokens).sort(
    (a, b) => Number(b[0].replace("MASK", "")) - Number(a[0].replace("MASK", "")),
  );
  for (const [token, value] of entries) {
    result = result.split(token).join(value);
  }
  return result;
}

function hasMaskPlaceholder(text) {
  return /\bMASK\d+\b/i.test(String(text || ""));
}

function isPathLikeText(text) {
  const s = String(text || "").trim();
  if (!s) return false;
  return (
    /[\\/]/.test(s) ||
    /^[A-Za-z]:/.test(s) ||
    /^\.{0,2}\//.test(s) ||
    /^[a-zA-Z0-9_.-]+$/.test(s)
  );
}

function basenameFromPath(filePath) {
  const parts = String(filePath).replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || filePath;
}

/**
 * Resolve a possibly corrupted path (MASK1 embedded in filename) using vault + repo index.
 */
function resolveEditRelativePath(rawPath, tokenMap, repoPaths, repoRoot, pathAliases = {}) {
  let path = demaskText(normalizeMaskPath(rawPath), tokenMap);
  path = normalizeMaskPath(path);

  if (path && !hasMaskPlaceholder(path)) {
    const direct = matchPathInRepo(path, repoPaths, repoRoot);
    if (direct) return direct;
    if (!path.includes("/")) {
      return null;
    }
    return path;
  }

  const aliasBase = basenameFromPath(rawPath).replace(/MASK\d+/gi, "").toLowerCase();
  if (aliasBase && pathAliases[aliasBase] && typeof pathAliases[aliasBase] === "string") {
    return pathAliases[aliasBase];
  }

  let attempt = demaskText(normalizeMaskPath(rawPath), tokenMap);
  attempt = normalizeMaskPath(attempt);
  if (attempt && !hasMaskPlaceholder(attempt)) {
    const matched = matchPathInRepo(attempt, repoPaths, repoRoot);
    if (matched) return matched;
  }

  const corruptBase = basenameFromPath(rawPath);
  let stripped = corruptBase;
  for (const token of Object.keys(tokenMap)) {
    stripped = stripped.split(token).join("");
  }
  stripped = stripped.replace(/MASK\d+/gi, "").trim();
  if (!stripped) return null;

  return matchPathInRepo(stripped, repoPaths, repoRoot, { basenameOnly: true });
}

function matchPathInRepo(refPath, repoPaths, repoRoot, options = {}) {
  const normalized = normalizeMaskPath(refPath);
  if (!normalized) return null;

  const normLower = normalized.toLowerCase();
  const entries = (repoPaths || []).map((p) => ({
    full: p,
    rel: toMaskRelativePath(p, repoRoot),
  }));

  const candidates = entries.filter((e) => {
    const relLower = e.rel.toLowerCase();
    const fullLower = String(e.full).replace(/\\/g, "/").toLowerCase();
    return (
      relLower === normLower ||
      fullLower.endsWith("/" + normLower) ||
      relLower.endsWith("/" + normLower)
    );
  });

  if (candidates.length === 1) return candidates[0].rel;
  if (candidates.length > 1) {
    if (!normalized.includes("/")) {
      return null;
    }
    const exact = candidates.filter((e) => e.rel.toLowerCase() === normLower);
    if (exact.length === 1) return exact[0].rel;
    const suffix = candidates.filter((e) => e.rel.toLowerCase().endsWith("/" + normLower));
    if (suffix.length === 1) return suffix[0].rel;
    return null;
  }

  if (options.basenameOnly || !normalized.includes("/")) {
    const base = basenameFromPath(normalized).toLowerCase();
    const baseMatches = entries.filter((e) => basenameFromPath(e.rel).toLowerCase() === base);
    if (baseMatches.length === 1) return baseMatches[0].rel;
    return null;
  }

  return null;
}

function normalizeMaskPath(path) {
  return String(path || "")
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, "")
    .replace(/\\/g, "/")
    .replace(/^@+/, "")
    .replace(/^\.\//, "");
}

function toMaskRelativePath(filePath, repoRoot) {
  if (typeof toRelativePath === "function" && repoRoot) {
    return toRelativePath(filePath, repoRoot) || normalizeMaskPath(filePath);
  }
  const norm = normalizeMaskPath(filePath);
  const root = normalizeMaskPath(repoRoot).replace(/\/$/, "");
  if (root && norm.toLowerCase().startsWith(root.toLowerCase() + "/")) {
    return norm.slice(root.length + 1);
  }
  return norm;
}

/**
 * Demask paths + content; fix MASK1Foo.java → src/Foo.java via repo index.
 */
async function resolveEditsForApply(edits, options = {}) {
  const activeSet =
    options.tokenMap != null
      ? { tokens: options.tokenMap }
      : typeof loadActiveMaskSet === "function"
        ? await loadActiveMaskSet()
        : null;
  const tokenMap = getTokenMap(activeSet);
  const pathAliases = activeSet?.pathAliases || {};
  const { repoPath } =
    typeof getRepoContext === "function" ? await getRepoContext() : { repoPath: "" };

  let repoPaths = options.repoPaths;
  if (!repoPaths?.length && typeof getRepoFilePaths === "function") {
    repoPaths = await getRepoFilePaths();
  }

  const resolved = [];
  const errors = [];

  for (const edit of edits) {
    const rel = resolveEditRelativePath(
      edit.relativePath,
      tokenMap,
      repoPaths,
      repoPath,
      pathAliases,
    );
    const content = demaskText(edit.content, tokenMap);

    if (!rel || hasMaskPlaceholder(rel)) {
      errors.push({
        rawPath: edit.relativePath,
        message: `Could not resolve file path "${edit.relativePath}". Use the full relative path from context (e.g. src/helper.py), not a bare filename when duplicates exist.`,
      });
      continue;
    }

    if (hasMaskPlaceholder(content)) {
      errors.push({
        rawPath: rel,
        message: `File ${rel} still contains unresolved MASK placeholders in content.`,
      });
      continue;
    }

    resolved.push({ relativePath: rel, content });
  }

  return { edits: resolved, errors, tokenMap };
}

function maskFileHeaderPath(text, start, end, vault) {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = text.indexOf("\n", end);
  const lineEndPos = lineEnd === -1 ? text.length : lineEnd;
  const line = text.slice(lineStart, lineEndPos);
  const headerMatch = line.match(/^---(.+?)---\s*$/);
  if (!headerMatch) return null;

  const innerPath = headerMatch[1];
  const token = allocateMaskToken(vault);
  vault.tokens[token] = innerPath;
  vault.pathAliases = vault.pathAliases || {};
  const base = basenameFromPath(innerPath);
  const relPath = normalizeMaskPath(innerPath);
  if (base && relPath) {
    const key = base.toLowerCase();
    const prev = vault.pathAliases[key];
    if (!prev) {
      vault.pathAliases[key] = relPath;
    } else if (prev !== relPath) {
      vault.pathAliases[key] = null;
    }
  }
  const newLine = `---${token}---`;
  const newText = text.slice(0, lineStart) + newLine + text.slice(lineEndPos);
  return { newText, token, lineStart, cursor: lineStart + newLine.length };
}

function appendMaskFooter(body, vault) {
  const entries = listMaskEntries(vault);
  if (!entries.length) return body;

  let footer =
    "\n\nTokis path placeholders (MASK1, MASK2, …): use only inside file content if needed. In tokis-edit blocks always use real repo paths (e.g. src/Calculator.java), never MASK in the path line.";
  entries.forEach(([token, value]) => {
    const label = isPathLikeText(value) ? "path" : "value";
    footer += `\n- ${token}: (${label} hidden)`;
  });
  return body + footer;
}

function generateMaskSetId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function saveActiveMaskSet(repoId, vault) {
  const maskSetId = generateMaskSetId();
  const payload = {
    maskSetId,
    repoId: String(repoId || ""),
    tokens: vault.tokens,
    pathAliases: vault.pathAliases || {},
    savedAt: Date.now(),
  };

  await chrome.storage.local.set({ activeMaskSet: payload });

  if (repoId && Object.keys(vault.tokens).length > 0) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "SAVE_MASK_SET",
          payload: { repoId, maskSetId, tokens: vault.tokens },
        },
        (data) => {
          if (data?.error) {
            console.warn("Tokis mask set save:", data.error);
          }
          resolve(payload);
        },
      );
    });
  }

  return payload;
}

async function loadActiveMaskSet() {
  const data = await chrome.storage.local.get(["activeMaskSet"]);
  const set = data.activeMaskSet;
  if (!set?.tokens) return null;
  return {
    maskSetId: set.maskSetId,
    repoId: set.repoId,
    tokens: set.tokens,
    pathAliases: set.pathAliases || {},
  };
}

function vaultFromActiveSet(activeSet) {
  if (!activeSet?.tokens) return createMaskVault();
  const vault = createMaskVault();
  vault.tokens = { ...activeSet.tokens };
  let max = 0;
  for (const key of Object.keys(vault.tokens)) {
    const m = /^MASK(\d+)$/.exec(key);
    if (m) max = Math.max(max, Number(m[1]));
  }
  vault.nextIndex = max + 1;
  return vault;
}

function renderMaskListHtml(vault) {
  const entries = listMaskEntries(vault);
  if (!entries.length) {
    return '<p class="tokis-mask-empty">No placeholders yet. Select sensitive text, then click “Mask selection”.</p>';
  }
  return `<ul class="tokis-mask-list">${entries
    .map(
      ([token, value]) =>
        `<li><code>${token}</code> <span class="tokis-mask-value" title="${escapeMaskHtml(value)}">${escapeMaskHtml(
          truncateMaskLabel(value),
        )}</span></li>`,
    )
    .join("")}</ul>`;
}

function escapeMaskHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateMaskLabel(value, max = 48) {
  const s = String(value).replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function refreshMaskListUi(popup, vault) {
  const el = popup.querySelector("#tokis-mask-list");
  if (el) el.innerHTML = renderMaskListHtml(vault);
}

/**
 * Preview with optional MASK1/MASK2 selection masking before inject or file-to-chat.
 */
function showMaskPreviewModal(options) {
  if (typeof removeTokisPopup === "function") removeTokisPopup();

  const popup = document.createElement("div");
  popup.id = "tokis-popup";

  const enableMasking = options.enableMasking !== false;
  const vault = options.initialVault ? cloneMaskVault(options.initialVault) : createMaskVault();

  const sizeHint =
    typeof formatBytes === "function"
      ? formatBytes((options.content || "").length)
      : `${(options.content || "").length} chars`;

  const truncatedNote = options.truncated
    ? '<p class="tokis-context-hint tokis-warn">Content was truncated for chat limits.</p>'
    : "";

  const maskToolbar = enableMasking
    ? `
  <div class="tokis-mask-toolbar">
    <button type="button" id="tokis-mask-selection" class="tokis-fab-action">Mask path / selection</button>
    <p class="tokis-context-hint tokis-mask-hint">Mask a folder path or a ---file path--- line. Tokis restores real paths on Review; never writes MASK1.java to disk.</p>
    <div id="tokis-mask-list" class="tokis-mask-list-wrap">${renderMaskListHtml(vault)}</div>
  </div>`
    : "";

  const title = options.title || "Preview";
  const hint =
    options.hint ||
    (enableMasking
      ? "Select text → Mask selection. When finished, click Continue at the bottom."
      : "Edit the message, then continue below.");

  const confirmLabel =
    options.confirmLabel ||
    (enableMasking ? "Continue → inject into chat" : "Continue");

  popup.innerHTML = `
<div class="tokis-container tokis-context-popup tokis-preview-modal">
  <div class="tokis-preview-header">
    <h2>${escapeMaskHtml(title)}</h2>
    <p class="tokis-context-hint">${escapeMaskHtml(hint)}</p>
    <p class="tokis-size-hint">Size: ${sizeHint}</p>
    ${truncatedNote}
  </div>
  <div class="tokis-preview-scroll">
    ${maskToolbar}
    <textarea id="tokis-preview-editor" class="tokis-preview-editor" spellcheck="false"></textarea>
  </div>
  <div class="tokis-preview-footer">
    <p id="tokis-preview-footer-hint" class="tokis-preview-footer-hint"></p>
    <div class="tokis-preview-actions">
      <button type="button" id="tokis-preview-cancel" class="tokis-fab-action">Cancel</button>
      <button type="button" id="tokis-preview-confirm" class="tokis-fab-action tokis-fab-action--primary">${escapeMaskHtml(
        confirmLabel,
      )}</button>
    </div>
  </div>
</div>
`;

  document.body.appendChild(popup);
  const editor = popup.querySelector("#tokis-preview-editor");
  if (editor) editor.value = options.content || "";

  const footerHint = popup.querySelector("#tokis-preview-footer-hint");
  const confirmBtn = popup.querySelector("#tokis-preview-confirm");

  function updatePreviewFooterHint() {
    const count = listMaskEntries(vault).length;
    if (!footerHint) return;
    if (enableMasking && count > 0) {
      footerHint.textContent = `${count} placeholder(s) ready — click Continue below to inject.`;
      footerHint.classList.add("tokis-preview-footer-hint--active");
    } else if (enableMasking) {
      footerHint.textContent = "Optional: mask secrets, or continue without masking.";
      footerHint.classList.remove("tokis-preview-footer-hint--active");
    } else {
      footerHint.textContent = "";
    }
  }

  updatePreviewFooterHint();
  popup.querySelector(".tokis-preview-footer")?.scrollIntoView({ block: "end" });

  popup.querySelector("#tokis-mask-selection")?.addEventListener("click", () => {
    const result = maskSelectionInTextarea(editor, vault);
    if (result.error) {
      alert(result.error);
      return;
    }
    refreshMaskListUi(popup, vault);
    updatePreviewFooterHint();
    confirmBtn?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (typeof setFabStatus === "function") {
      setFabStatus(`Masked as ${result.token}`, "ok");
    }
  });

  popup.querySelector("#tokis-preview-cancel")?.addEventListener("click", () => {
    if (typeof removeTokisPopup === "function") removeTokisPopup();
    options.onCancel?.();
  });

  popup.querySelector("#tokis-preview-confirm")?.addEventListener("click", async () => {
    let value = editor?.value || "";
    if (enableMasking && listMaskEntries(vault).length > 0) {
      value = appendMaskFooter(value, vault);
    }

    if (typeof removeTokisPopup === "function") removeTokisPopup();

    if (enableMasking && listMaskEntries(vault).length > 0) {
      const repoData = typeof getRepoContext === "function" ? await getRepoContext() : {};
      await saveActiveMaskSet(repoData.repoId, vault);
    }

    options.onConfirm?.(value, vault);
  });

  return { popup, vault };
}

window.createMaskVault = createMaskVault;
window.demaskText = demaskText;
window.loadActiveMaskSet = loadActiveMaskSet;
window.vaultFromActiveSet = vaultFromActiveSet;
window.showMaskPreviewModal = showMaskPreviewModal;
window.saveActiveMaskSet = saveActiveMaskSet;
window.appendMaskFooter = appendMaskFooter;
window.resolveEditsForApply = resolveEditsForApply;
window.hasMaskPlaceholder = hasMaskPlaceholder;
