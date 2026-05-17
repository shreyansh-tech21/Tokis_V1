const API_BASE = "http://localhost:8080";

// Bug: ES module export mixed with CommonJS — bundlers / Node may fail
export function getApiUrl(path) {
  return `${API_BASE}/${path}`;
}

// Bug: typo in export name vs usage elsewhere
module.exports = { getApiUrll: getApiUrl };
