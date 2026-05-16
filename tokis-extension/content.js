let workspaceModule = null;

import { showWorkspacePopup, showConnectedBadge } from "./ui/workspacePopup.js";

import(chrome.runtime.getURL("ui/workspacePopup.js")).then((module) => {
  workspaceModule = module;

  console.log("workspace loaded");
});



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
  promptCheckTimer = setTimeout(checkPromptAfterIdle, PROMPT_DEBOUNCE_MS);
}

async function checkPromptAfterIdle() {
  const textBox = getTextBox();
  if (!textBox) {
    console.log("No textbox found");
    return;
  }

  const prompt = textBox.innerText.trim();
  if (!prompt) {
    console.log("Prompt empty");
    return;
  }

  if (prompt === lastPrompt) {
    return;
  }

  if (!isCodingPrompt(prompt)) {
    return;
  }

  lastPrompt = prompt;
  console.log("Prompt:", prompt);
  console.log("Coding prompt detected");

  await handleCodingPrompt(prompt, textBox);
}

document.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    const textBox = getTextBox();
    if (!textBox) {
      console.log("No textbox found");
      return;
    }

    const prompt = textBox.innerText.trim();
    if (!prompt) {
      console.log("Prompt empty");
      return;
    }

    if (prompt === lastPrompt) {
      console.log("Duplicate prompt");
      return;
    }

    if (!isCodingPrompt(prompt)) {
      return;
    }

    e.preventDefault();
    lastPrompt = prompt;

    console.log("Prompt:", prompt);
    console.log("Coding prompt detected");

    await handleCodingPrompt(prompt, textBox);
  }
});

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
  const response = await fetch("http://localhost:8080/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repoId: 1,
      query: prompt,
    }),
  });
  return await response.json();
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

            <h2>Tokis Context Selection</h2>

            ${snippets
              .map(
                (s, i) => `
                <label>
                    <input type="checkbox"
                        checked
                        value="${i}" />
                    ${s.file}
                </label>
            `,
              )
              .join("")}

            <button id="tokis-inject">
                Inject Context
            </button>
            
        </div>
    `;
  document.body.appendChild(popup);
  document.getElementById("tokis-inject").onclick(() => {
    injectPrompt(snippets, prompt, textbox);
  });
}

function buildPrompt(prompt, snippets) {
  let finalPrompt = `Task: ${prompt}\n\n Relevant Context\n`;
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
  textbox.value = finalPrompt;
  textbox.dispatchEvent(new Event("input", { bubbles: true }));
  document.getElementById("tokis-popup").remove();
  console.log("prompt injected.");
}

console.log("Tokis extension loaded");

document.addEventListener("keydown", (e) => {

  const textbox = document.querySelector('[contenteditable="true"]');

  
});

setTimeout(async () => {
  const repo = await chrome.storage.local.get(["repoId"]);

  if (!repo.repoId && workspaceModule) {
    workspaceModule.showWorkspacePopup();
  }
}, 1500);

window.addEventListener("load", async () => {
  const data = await chrome.storage.local.get(["repoId"]);

  if (!data.repoId || data.repoId === "null" || data.repoId === "undefined") {
    showWorkspacePopup();
  } else {
    const repoData = await chrome.storage.local.get(["repoName"]);

    showConnectedBadge(repoData.repoName);
  }
});