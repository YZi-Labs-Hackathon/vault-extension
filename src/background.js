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

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    customAddress: "",
    chainId: "0x1", // Ethereum Mainnet
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {

    chrome.storage.local.get(["enabled"], (result) => {
      if (result.enabled) {
        chrome.scripting
          ?.executeScript({
            target: { tabId: tabId, allFrames: true },
            files: ["content-script.js"],
          })
          .catch((error) => {
            console.error(error);
          });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getSettings") {
    chrome.storage.local.get(
      ["enabled", "customAddress", "chainId", "balance"],
      (result) => {
        sendResponse(result);
      }
    );
    return true;
  }

  if (message.type === "setSettings") {
    chrome.storage.local.set(
      {
        enabled: message.enabled,
        customAddress: message.customAddress,
        chainId: message.chainId,
        balance: message.balance,
      },
      () => {
        sendResponse({ success: true });
      }
    );
    return true;
  }

  if (message.type === "injectIntoFrame") {
    if (sender.tab) {
      chrome.scripting
        ?.executeScript({
          target: {
            tabId: sender.tab.id,
            frameIds: [message.frameId],
          },
          files: ["content-script.js"],
        })
        .catch((error) => {
          console.error(error);
        });
    }
    return true;
  }
});

