(function () {
  let customAddress = settings.customAddress;
  let customChainId = settings.chainId;

  function createProxyProvider() {
    const proxyProvider = {
      ...originalEthereum,
      get selectedAddress() {
        return customAddress;
      },
      get chainId() {
        return customChainId;
      },

      request: async function (args) {
        if (!args || !args.method) {
          return originalEthereum.request(args);
        }

        if (
          args.method === "eth_accounts" ||
          args.method === "eth_requestAccounts"
        ) {
          return new Promise((resolve, reject) => {
            const transactionId =
              Date.now() + Math.random().toString(36).substring(2);

            function responseListener(event) {
              if (
                event.data &&
                event.data.type === "eth_requestAccounts_response" &&
                event.data.transactionId === transactionId
              ) {
                window.removeEventListener("message", responseListener);

                if (event.data.error) {
                  reject(new Error(event.data.error));
                } else {
                  resolve(event.data.result);
                }
              }
            }

            window.addEventListener("message", responseListener);

            const timeoutId = setTimeout(() => {
              window.removeEventListener("message", responseListener);

              resolve([customAddress]);
            }, 30000);

            try {
              window.parent.postMessage(
                {
                  type: "eth_requestAccounts",
                  transactionId: transactionId,
                },
                "*"
              );
            } catch (error) {
              clearTimeout(timeoutId);
              window.removeEventListener("message", responseListener);
              reject(error);
            }
          });
          return [customAddress];
        }

        if (args.method === "eth_sendTransaction") {
          return new Promise((resolve, reject) => {
            const transactionId =
              Date.now() + Math.random().toString(36).substring(2);

            function responseListener(event) {
              if (
                event.data &&
                event.data.type === "eth_sendTransaction_response" &&
                event.data.transactionId === transactionId
              ) {
                window.removeEventListener("message", responseListener);

                if (event.data.error) {
                  reject(new Error(event.data.error));
                } else {
                  resolve(event.data.result);
                }
              }
            }

            window.addEventListener("message", responseListener);

            const timeoutId = setTimeout(() => {
              window.removeEventListener("message", responseListener);

              const fakeHash =
                "0x" +
                Array.from({ length: 64 }, () =>
                  Math.floor(Math.random() * 16).toString(16)
                ).join("");

              resolve(fakeHash);
            }, 30000);

            try {
              window.parent.postMessage(
                {
                  type: "eth_sendTransaction",
                  params: args.params,
                  transactionId: transactionId,
                },
                "*"
              );
            } catch (error) {
              clearTimeout(timeoutId);
              window.removeEventListener("message", responseListener);
              reject(error);
            }
          });
        }

        return originalEthereum.request(args);
      },

      send: function (payload, callback) {
        if (typeof payload === "string") {
          if (payload === "eth_accounts" || payload === "eth_requestAccounts") {
            const response = {
              jsonrpc: "2.0",
              id: 1,
              result: [customAddress],
            };
            if (callback) {
              callback(null, response);
              return undefined;
            }
            return response;
          }
        } else if (payload && typeof payload === "object") {
          if (
            payload.method === "eth_accounts" ||
            payload.method === "eth_requestAccounts"
          ) {
            const response = {
              jsonrpc: "2.0",
              id: payload.id || 1,
              result: [customAddress],
            };
            if (callback) {
              callback(null, response);
              return undefined;
            }
            return response;
          }

          if (
            payload.method === "eth_sendTransaction" &&
            payload.params &&
            payload.params[0]
          ) {
            const modifiedPayload = { ...payload };
            if (modifiedPayload.params[0]) {
              modifiedPayload.params[0] = {
                ...modifiedPayload.params[0],
                from: customAddress,
              };
            }

            if (originalEthereum.send) {
              return originalEthereum.send(modifiedPayload, callback);
            }
          }
        }

        if (originalEthereum.send) {
          return originalEthereum.send(payload, callback);
        }

        const errorResponse = {
          jsonrpc: "2.0",
          id: payload && typeof payload === "object" ? payload.id : 1,
          error: { code: -32603, message: "Phương thức không được hỗ trợ" },
        };

        if (callback) {
          callback(errorResponse);
          return undefined;
        }
        return errorResponse;
      },

      sendAsync: function (payload, callback) {
        return this.send(payload, callback);
      },

      _events: {
        accountsChanged: [],
        chainChanged: [],
        connect: [],
        disconnect: [],
      },

      on: function (eventName, listener) {
        if (!this._events[eventName]) {
          this._events[eventName] = [];
        }

        this._events[eventName].push(listener);

        setTimeout(() => {
          if (eventName === "connect") {
            listener({ chainId: customChainId });
          } else if (eventName === "chainChanged") {
            listener(customChainId);
          } else if (eventName === "accountsChanged") {
            listener([customAddress]);
          }
        }, 10);

        return () => {
          this.removeListener(eventName, listener);
        };
      },

      once: function (eventName, listener) {
        const wrappedListener = (data) => {
          this.removeListener(eventName, wrappedListener);
          listener(data);
        };

        return this.on(eventName, wrappedListener);
      },

      removeListener: function (eventName, listener) {
        if (this._events[eventName]) {
          this._events[eventName] = this._events[eventName].filter(
            (l) => l !== listener
          );
        }
      },

      removeAllListeners: function (eventName) {
        if (eventName) {
          this._events[eventName] = [];
        } else {
          Object.keys(this._events).forEach((event) => {
            this._events[event] = [];
          });
        }
      },
    };

    emitAccountsChanged = function (newAddress) {
      if (proxyProvider._events && proxyProvider._events.accountsChanged) {
        proxyProvider._events.accountsChanged.forEach((listener) => {
          try {
            listener([newAddress]);
          } catch (e) {
            console.error(e);
          }
        });
      }
    };

    return proxyProvider;
  }

  const proxyProvider = createProxyProvider();

  Object.defineProperty(window, "ethereum", {
    get: function () {
      return proxyProvider;
    },
    set: function (newProvider) {
      originalEthereum = newProvider;
    },
    configurable: true,
  });

  if (window.web3 && window.web3.currentProvider) {
    window.web3.currentProvider = proxyProvider;
  }

  window.addEventListener("message", function (event) {

    if (event.data && event.data.type === "metamask_override_check") {
      window.parent.postMessage(
        {
          type: "metamask_override_status",
          status: "active",
          address: customAddress,
          chainId: customChainId,
        },
        "*"
      );
    }
  });

  try {
    window.parent.postMessage(
      {
        type: "metamask_override_ready",
        frameUrl: window.location.href,
        address: customAddress,
        chainId: customChainId,
      },
      "*"
    );
  } catch (e) {
    console.log(e);
  }
})();
