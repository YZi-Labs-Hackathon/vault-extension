
function injectScript(settings, target) {
  const scriptTag = document.createElement('script');
  scriptTag.textContent = `
    window.metamaskOverrideSettings = {
      enabled: ${settings.enabled},
      customAddress: "${settings.customAddress}",
      chainId: "${settings.chainId}",
      balance: "${settings.balance}"
    };
  `;
  target.appendChild(scriptTag);
  scriptTag.remove();
  
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject-script.js');
  script.onload = function() { this.remove(); };

  (target.head || target).prepend(script);
}

chrome.runtime.sendMessage({ type: "getSettings" }, function(settings) {
  if (settings && settings.enabled) {
    injectScript(settings, document.documentElement);
    
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(function(node) {
            if (node.tagName === 'IFRAME') {
              try {
                node.addEventListener('load', function() {
                  try {
                    if (node.contentDocument) {
                      injectScript(settings, node.contentDocument.documentElement);
                    }
                  } catch (e) {
                    console.log(e);
                  }
                });
                
                if (node.contentDocument) {
                  injectScript(settings, node.contentDocument.documentElement);
                }
              } catch (e) {
                console.log(e);
              }
            }
          });
        }
      });
    });
        
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    
  } else {
    console.log('');
  }
}); 