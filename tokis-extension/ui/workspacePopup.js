let selectedFiles = [];

export async function showWorkspacePopup() {
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
      const rootFolder = selectedFiles[0]?.webkitRelativePath?.split("/")[0] || "";
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

async function connectRepo() {
  const select = document.getElementById("repo-select");
  const repoId = select.value;

  const repoName = select.options[select.selectedIndex].text;

  await chrome.storage.local.set({
    repoId,
    repoName,
  });
  document.getElementById("tokis-workspace").remove();

  showConnectedBadge(repoName);
}

function showConnectedBadge(repoName) {
  const badge = document.createElement("div");

  badge.id = "tokis-badge";

  badge.innerHTML = `...`;

  document.body.appendChild(badge);

  document.getElementById("changeRepo").onclick = () => {
    badge.remove();

    showWorkspacePopup();
  };
}

async function addProject() {
  const name = document.getElementById("repo-name").value.trim();

  const info = document.getElementById("selected-folder-info");

  if (!selectedFiles.length) {
    info.textContent = "Select a project folder";

    return;
  }

  const rootFolder = selectedFiles[0].webkitRelativePath.split("/")[0];

  const projectName = name || rootFolder;

  // try {
  //   const response = await fetch("http://localhost:8003/register-project", {
  //     method: "POST",

  //     headers: {
  //       "Content-Type": "application/json",
  //     },

  //     body: JSON.stringify({
  //       projectName,

  //       files: selectedFiles.map((file) => ({
  //         relativePath: file.webkitRelativePath,
  //       })),
  //     }),
  //   });

    // const result = await response.json();

    const repoResponse = await fetch("http://localhost:8080/repos/ingest", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        name: projectName,

        path: rootFolder,
      }),
    });

    const repo = await repoResponse.json();

    

    await chrome.storage.local.set({
      repoId: repo.id,
      repoName: repo.name,
    });

    location.reload();
}
