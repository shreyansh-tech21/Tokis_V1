function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortenRepoName(name, max = 14) {
  const text = String(name || "Repo").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function setFabOpen(badge, open) {
  badge.classList.toggle("tokis-fab--open", open);
  const toggle = badge.querySelector("#tokis-fab-toggle");
  const menu = badge.querySelector("#tokis-fab-menu");
  if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (menu) menu.setAttribute("aria-hidden", open ? "false" : "true");
}

async function showWorkspacePopup() {
  const repos = await fetchRepos();

  console.log(repos);

  const existing = document.getElementById("tokis-workspace");

  if (existing) existing.remove();

  const popup = document.createElement("div");

  popup.id = "tokis-workspace";

  popup.innerHTML = `

<div class="tokis-container">

<h2>
Tokis Workspace
</h2>

<select id="repo-select">

<option value="">
Select Existing
</option>

${repos
  .map(
    (r) => `

<option value="${r.id}">
${r.name}
</option>

`,
  )
  .join("")}

</select>

<hr>

<input
id="repo-name"
placeholder="Repository name (optional)"
/>

<p id="selected-folder-info" class="folder-info">
  Add Project opens a folder picker on your computer.
</p>

<button id="addRepo">

Add Project

</button>

<button id="connect">

Connect

</button>

<button type="button" id="deleteRepo" class="tokis-btn-danger" disabled>
Delete selected
</button>

<button id="skip">
Skip
</button>

</div>
`;
  document.body.appendChild(popup);

  const info = document.getElementById("selected-folder-info");
  const nameInput = document.getElementById("repo-name");

  document.getElementById("connect").onclick = () => {
    connectRepo();
  };

  const repoSelect = document.getElementById("repo-select");
  const deleteRepoButton = document.getElementById("deleteRepo");
  if (repoSelect && deleteRepoButton) {
    const syncDeleteState = () => {
      deleteRepoButton.disabled = !repoSelect.value;
    };
    repoSelect.addEventListener("change", syncDeleteState);
    syncDeleteState();
    deleteRepoButton.onclick = () => {
      const option = repoSelect.selectedOptions[0];
      const repoName = option?.textContent?.trim() || "";
      void handleDeleteRepo(repoSelect.value, repoName);
    };
  }

  const addRepoButton = document.getElementById("addRepo");
  if (addRepoButton) {
    addRepoButton.onclick = () => addProject(info, nameInput, addRepoButton);
  }

  const skipButton = document.getElementById("skip");
  if (skipButton) {
    skipButton.onclick = () => popup.remove();
  }
}

async function fetchRepos() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "GET_REPOS",
      },

      (response) => {
        if (response?.error || !Array.isArray(response)) {
          resolve([]);
          return;
        }
        resolve(response);
      },
    );
  });
}

function deleteRepoById(repoId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "DELETE_REPO", payload: { repoId } }, (response) => {
      resolve(response);
    });
  });
}

async function handleDeleteRepo(repoId, repoName) {
  if (!repoId) {
    alert("Select a repository to delete.");
    return;
  }

  const label = repoName || `repository #${repoId}`;
  const confirmed = confirm(
    `Delete "${label}" from Tokis?\n\nThis removes the indexed copy only. Files on your computer are not deleted.\nUse Add Project again to re-ingest the same folder.`,
  );
  if (!confirmed) return;

  const result = await deleteRepoById(repoId);
  if (result?.error) {
    alert(result.error);
    return;
  }

  const stored = await chrome.storage.local.get(["repoId"]);
  if (String(stored.repoId) === String(repoId)) {
    await chrome.storage.local.remove([
      "repoId",
      "repoName",
      "repoPath",
      "repoFilePaths",
      "repoFilePathsRepoId",
      "activeMaskSet",
    ]);
    document.getElementById("tokis-badge")?.remove();
    document.removeEventListener("click", window._tokisFabOutsideClick, true);
    document.removeEventListener("keydown", window._tokisFabEscKey);
  }

  document.getElementById("tokis-workspace")?.remove();
  await showWorkspacePopup();
}

function fetchRepoById(repoId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_REPO", payload: { repoId } }, (response) => {
      resolve(response);
    });
  });
}

async function persistRepo(repo) {
  if (!repo?.id) return;

  await chrome.storage.local.set({
    repoId: repo.id,
    repoName: repo.name,
    repoPath: repo.path,
  });

  if (repo.path && typeof ensureTokisProtocol === "function") {
    await ensureTokisProtocol(repo.path);
  }

  if (typeof cacheRepoFiles === "function") {
    await cacheRepoFiles(repo.id);
  }
}

async function showConnectedBadge(repoName, repoPath) {
  const existing = document.getElementById("tokis-badge");

  if (existing) {
    existing.remove();
  }

  document.removeEventListener("click", window._tokisFabOutsideClick, true);
  document.removeEventListener("keydown", window._tokisFabEscKey);

  const safeName = escapeHtml(repoName);
  const shortName = escapeHtml(shortenRepoName(repoName));

  const badge = document.createElement("div");
  badge.id = "tokis-badge";
  badge.className = "tokis-fab";

  badge.innerHTML = `
    <div class="tokis-fab-menu" id="tokis-fab-menu" aria-hidden="true">
      <div class="tokis-fab-menu-header">
        <span class="tokis-fab-status">
          <span class="tokis-fab-dot" aria-hidden="true"></span>
          Connected
        </span>
        <button type="button" class="tokis-fab-close" id="tokis-fab-close" aria-label="Close menu">×</button>
      </div>
      <p class="tokis-fab-repo" title="${safeName}">${safeName}</p>
      <p id="tokis-fab-statusline" class="tokis-fab-statusline"></p>
      <button type="button" id="injectPrompt" class="tokis-fab-action tokis-fab-action--primary">
        Inject prompt
      </button>
      <button type="button" id="injectFile" class="tokis-fab-action">
        Inject file
      </button>
      <button type="button" id="fileToChat" class="tokis-fab-action">
        File to chat
      </button>
      <button type="button" id="reviewSuggestions" class="tokis-fab-action">
        Review suggestions
      </button>
      <button type="button" id="editTokisRules" class="tokis-fab-action">
        Edit Tokis rules
      </button>
      <button type="button" id="deleteConnectedRepo" class="tokis-fab-action tokis-fab-action--danger">
        Delete repository
      </button>
      <button type="button" id="changeRepo" class="tokis-fab-action">
        Change repo
      </button>
    </div>
    <button
      type="button"
      class="tokis-fab-pill"
      id="tokis-fab-toggle"
      aria-expanded="false"
      aria-controls="tokis-fab-menu"
      title="Tokis — ${safeName}"
    >
      <span class="tokis-fab-dot tokis-fab-dot--pill" aria-hidden="true"></span>
      <span class="tokis-fab-brand">Tokis</span>
      <span class="tokis-fab-repo-short">${shortName}</span>
      <span class="tokis-fab-chevron" aria-hidden="true"></span>
    </button>
  `;

  document.body.appendChild(badge);

  const toggle = badge.querySelector("#tokis-fab-toggle");
  const closeBtn = badge.querySelector("#tokis-fab-close");
  const injectBtn = badge.querySelector("#injectPrompt");
  const injectFileBtn = badge.querySelector("#injectFile");
  const fileToChatBtn = badge.querySelector("#fileToChat");
  const reviewBtn = badge.querySelector("#reviewSuggestions");
  const rulesBtn = badge.querySelector("#editTokisRules");
  const deleteRepoBtn = badge.querySelector("#deleteConnectedRepo");
  const changeBtn = badge.querySelector("#changeRepo");

  toggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    setFabOpen(badge, !badge.classList.contains("tokis-fab--open"));
  });

  closeBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    setFabOpen(badge, false);
  });

  injectBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    setFabOpen(badge, false);
    if (typeof openInjectPromptPicker === "function") {
      openInjectPromptPicker();
    }
  });

  injectFileBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    setFabOpen(badge, false);
    if (typeof openInjectFilePicker === "function") {
      openInjectFilePicker();
    }
  });

  fileToChatBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    setFabOpen(badge, false);
    if (typeof openFileToChatPicker === "function") {
      openFileToChatPicker();
    }
  });

  reviewBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    setFabOpen(badge, false);
    if (typeof showReviewSuggestionsModal === "function") {
      showReviewSuggestionsModal();
    }
  });

  rulesBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    setFabOpen(badge, false);
    if (typeof showProtocolEditor === "function") {
      showProtocolEditor();
    }
  });

  deleteRepoBtn?.addEventListener("click", async (event) => {
    event.stopPropagation();
    setFabOpen(badge, false);
    const stored = await chrome.storage.local.get(["repoId", "repoName"]);
    if (!stored.repoId) {
      alert("No repository connected.");
      return;
    }
    await handleDeleteRepo(stored.repoId, stored.repoName);
  });

  changeBtn?.addEventListener("click", async (event) => {
    event.stopPropagation();
    await chrome.storage.local.remove([
      "repoId",
      "repoName",
      "repoPath",
      "repoFilePaths",
      "repoFilePathsRepoId",
      "activeMaskSet",
    ]);
    badge.remove();
    document.removeEventListener("click", window._tokisFabOutsideClick, true);
    document.removeEventListener("keydown", window._tokisFabEscKey);
    showWorkspacePopup();
  });

  window._tokisFabOutsideClick = (event) => {
    if (!badge.contains(event.target)) {
      setFabOpen(badge, false);
    }
  };

  window._tokisFabEscKey = (event) => {
    if (event.key === "Escape") {
      setFabOpen(badge, false);
    }
  };

  document.addEventListener("click", window._tokisFabOutsideClick, true);
  document.addEventListener("keydown", window._tokisFabEscKey);
}

async function addProject(info, nameInput, addRepoButton) {
  const name = nameInput?.value.trim() || "";

  if (addRepoButton) addRepoButton.disabled = true;
  if (info) {
    info.textContent =
      "Choose a folder in the dialog on your computer (check the taskbar if hidden)…";
  }

  let response;
  try {
    response = await fetch("http://localhost:8003/register-project", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectName: name }),
    });
  } catch (e) {
    if (info) info.textContent = "Add Project opens a folder picker on your computer.";
    if (addRepoButton) addRepoButton.disabled = false;
    alert(
      "Cannot reach tokis-agent on localhost:8003. Start it with: uvicorn main:app --reload --port 8003",
    );
    return;
  }

  const result = await response.json();

  if (addRepoButton) addRepoButton.disabled = false;

  if (result.error) {
    if (info) info.textContent = "Add Project opens a folder picker on your computer.";
    alert(result.error);
    return;
  }

  const projectName = result.projectName || name || result.path.split(/[/\\]/).pop();

  if (info) {
    info.textContent = `Selected: ${result.path}`;
  }

  const repo = await new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "ADD_REPO",

        payload: {
          name: projectName,

          path: result.path,
        },
      },

      (response) => {
        resolve(response);
      },
    );
  });

  if (repo?.error) {
    alert(repo.error);
    return;
  }

  await persistRepo(repo);

  location.reload();
}

async function connectRepo() {
  const select = document.getElementById("repo-select");

  if (!select.value) {
    alert("Select repository first");

    return;
  }

  const repoId = select.value;

  const repo = await fetchRepoById(repoId);

  if (repo?.error) {
    alert(repo.error);
    return;
  }

  await persistRepo(repo);

  document.getElementById("tokis-workspace").remove();

  await showConnectedBadge(repo.name, repo.path);
}
