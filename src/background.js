chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    return {
      responseHeaders: details.responseHeaders.filter((header) => {
        const headerName = header.name.toLowerCase();
        if (headerName === "x-frame-options") {
          return false;
        }
        if (headerName === "content-security-policy") {
          const cspValue = header.value;
          if (cspValue.includes("frame-ancestors")) {
            header.value = cspValue.replace(/frame-ancestors[^;]*;?/g, "");
          }
        }
        return true;
      }),
    };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "responseHeaders"]
);