const BACKEND_BASE = "http://localhost:8080";

function backendUnavailableMessage() {
  return "Cannot reach Tokis backend at localhost:8080. Is Spring Boot running?";
}

async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const message =
        data?.error ||
        data?.message ||
        `Request failed (${response.status} ${response.statusText})`;
      return { error: message, status: response.status };
    }

    return data;
  } catch (e) {
    const message =
      e.message === "Failed to fetch" ? backendUnavailableMessage() : e.message;
    return { error: message };
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "GET_REPOS") {
    apiFetch(`${BACKEND_BASE}/repos`).then(sendResponse);
    return true;
  }

  if (request.type === "GET_REPO") {
    const { repoId } = request.payload || {};
    apiFetch(`${BACKEND_BASE}/repos/${repoId}`).then(sendResponse);
    return true;
  }

  if (request.type === "ADD_REPO") {
    apiFetch(`${BACKEND_BASE}/repos/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.payload),
    }).then(sendResponse);
    return true;
  }

  if (request.type === "QUERY") {
    apiFetch(`${BACKEND_BASE}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.payload),
    }).then(sendResponse);
    return true;
  }

  if (request.type === "GET_REPO_FILES") {
    const { repoId } = request.payload || {};
    apiFetch(`${BACKEND_BASE}/repos/${repoId}/files`).then(sendResponse);
    return true;
  }

  if (request.type === "RESOLVE_FILE_REFS") {
    const { repoId, references } = request.payload || {};
    apiFetch(`${BACKEND_BASE}/repos/${repoId}/files/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ references }),
    }).then(sendResponse);
    return true;
  }

  if (request.type === "DELETE_REPO") {
    const { repoId } = request.payload || {};
    apiFetch(`${BACKEND_BASE}/repos/${repoId}`, {
      method: "DELETE",
    }).then(sendResponse);
    return true;
  }

  if (request.type === "SAVE_MASK_SET") {
    const { repoId, maskSetId, tokens } = request.payload || {};
    apiFetch(`${BACKEND_BASE}/repos/${repoId}/mask-sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maskSetId, tokens }),
    }).then(sendResponse);
    return true;
  }

  return false;
});
