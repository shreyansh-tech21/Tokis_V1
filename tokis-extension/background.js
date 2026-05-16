chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  try {
    if (request.type === "GET_REPOS") {
      const response = await fetch("http://localhost:8080/repos");

      const data = await response.json();

      sendResponse(data);
    }

    if (request.type === "ADD_REPO") {
      const response = await fetch("http://localhost:8080/repos/ingest", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(request.payload),
      });

      const data = await response.json();

      sendResponse(data);
    }
  } catch (e) {
    sendResponse({
      error: e.message,
    });
  }

  return true;
});
