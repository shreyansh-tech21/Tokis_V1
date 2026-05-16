let selectedFiles = [];

async function showWorkspacePopup() {
  selectedFiles = [];

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
placeholder="Repository Name"
/>

<input
  type="file"
  id="folderPicker"
  webkitdirectory
  multiple
/>

<div id="selected-folder-info" class="folder-info">
  No folder selected.
</div>

<button id="addRepo">

Add Project

</button>

<button id="connect">

Connect

</button>

<button id="skip">
Skip
</button>

</div>
`;
  document.body.appendChild(popup);

  const picker = document.getElementById("folderPicker");
  const info = document.getElementById("selected-folder-info");
  const nameInput = document.getElementById("repo-name");

  if (picker) {
    picker.addEventListener("change", (e) => {
      selectedFiles = [...e.target.files];
      const rootFolder =
        selectedFiles[0]?.webkitRelativePath?.split("/")[0] || "";
      const fileCount = selectedFiles.length;

      if (rootFolder) {
        nameInput.value = rootFolder;
        info.textContent = `Selected: ${rootFolder}/ • ${fileCount} files found`;
      } else {
        info.textContent = "No folder selected.";
      }
    });
  }

  document.getElementById("connect").onclick = () => {
    connectRepo();
  };

  const addRepoButton = document.getElementById("addRepo");
  if (addRepoButton) {
    addRepoButton.onclick = () => addProject();
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
        resolve(response);
      },
    );
  });
}

async function showConnectedBadge(repoName) {
  const existing = document.getElementById("tokis-badge");

  if (existing) {
    existing.remove();
  }

  const badge = document.createElement("div");

  badge.id = "tokis-badge";

  badge.innerHTML = `

    <div>

      Tokis Active
      <br>

      Repo:
      ${repoName}

      <button id="changeRepo">
        Change
      </button>

    </div>

  `;

  document.body.appendChild(badge);

  const changeBtn = document.getElementById("changeRepo");

  changeBtn.onclick = async () => {
    console.log("change clicked");

    await chrome.storage.local.remove(["repoId", "repoName"]);

    badge.remove();

    showWorkspacePopup();
  };
}

async function addProject() {
  const name = document.getElementById("repo-name").value.trim();

  if (!selectedFiles.length) {
    return;
  }

  const rootFolder = selectedFiles[0].webkitRelativePath.split("/")[0];

  const projectName = name || rootFolder;

  const response = await fetch("http://localhost:8003/register-project", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      projectName,

      files: selectedFiles.map((file) => ({
        relativePath: file.webkitRelativePath,
      })),
    }),
  });

  const result = await response.json();

  if (result.error) {
    alert(result.error);

    return;
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

  await chrome.storage.local.set({
    repoId: repo.id,

    repoName: repo.name,
  });

  location.reload();
}

 async function connectRepo() {
  const select = document.getElementById("repo-select");

  if (!select.value) {
    alert("Select repository first");

    return;
  }

  const repoId = select.value;

  const repoName = select.options[select.selectedIndex].text;

  await chrome.storage.local.set({
    repoId,
    repoName,
  });

  document.getElementById("tokis-workspace").remove();

  await showConnectedBadge(repoName);
}