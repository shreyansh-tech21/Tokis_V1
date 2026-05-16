console.log("Tokis Active");

let lastPrompt = "";
let promptCheckTimer = null;

const PROMPT_DEBOUNCE_MS = 700;

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

function schedulePromptCheck() {
  resetPromptTimer();

  promptCheckTimer = setTimeout(
    checkPromptAfterIdle,

    PROMPT_DEBOUNCE_MS,
  );
}

async function checkPromptAfterIdle() {
  const textBox = getTextBox();

  if (!textBox) return;

  const prompt = textBox.innerText.trim();

  if (!prompt) return;

  if (prompt === lastPrompt) return;

  if (!isCodingPrompt(prompt)) return;

  lastPrompt = prompt;

  console.log("Coding prompt:", prompt);

  await handleCodingPrompt(prompt, textBox);
}

document.addEventListener(
  "input",

  (event) => {
    if (event.target && event.target.isContentEditable) {
      schedulePromptCheck();
    }
  },

  true,
);

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
  ];

  const lower = prompt.toLowerCase();

  return keywords.some((k) => lower.includes(k));
}

async function fetchRelevantFiles(prompt) {
  const repoData = await chrome.storage.local.get(["repoId"]);

  const response = await fetch(
    "http://localhost:8080/query",

    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        repoId: repoData.repoId,

        query: prompt,
      }),
    },
  );

  return response.json();
}

async function handleCodingPrompt(prompt, textbox) {
  const snippets = await fetchRelevantFiles(prompt);

  showContextPopup(snippets, prompt, textbox);
}

function showContextPopup(snippets, prompt, textbox) {
  const existing = document.getElementById("tokis-popup");

  if (existing) existing.remove();

  const popup = document.createElement("div");

  popup.id = "tokis-popup";

  popup.innerHTML = `

<div class="tokis-container">

<h2>

Tokis Context Selection

</h2>

${snippets
  .map(
    (s, i) => `

<label>

<input

type="checkbox"

checked

value="${i}"

/>

${s.file}

</label>

`,
  )
  .join("")}

<button
id="tokis-inject">

Inject Context

</button>

</div>

`;

  document.body.appendChild(popup);

  document.getElementById("tokis-inject").onclick = () => {
    injectPrompt(snippets, prompt, textbox);
  };
}

function buildPrompt(prompt, snippets) {
  let finalPrompt = `

Task:

${prompt}

Relevant Context:

`;

  snippets.forEach((s) => {
    finalPrompt += `

---${s.file}---

${s.snippet}

`;
  });

  return finalPrompt;
}

function injectPrompt(snippets, prompt, textbox) {
  const finalPrompt = buildPrompt(prompt, snippets);

  textbox.innerText = finalPrompt;

  textbox.dispatchEvent(
    new InputEvent(
      "input",

      {
        bubbles: true,
      },
    ),
  );

  document.getElementById("tokis-popup")?.remove();

  console.log("Prompt injected");
}

window.addEventListener(
  "load",

  async () => {
    const data = await chrome.storage.local.get(["repoId"]);

    if (!data.repoId || data.repoId === "") {
      showWorkspacePopup();
    } else {
      const repoData = await chrome.storage.local.get(["repoName"]);

      showConnectedBadge(repoData.repoName);
    }
  },
);
