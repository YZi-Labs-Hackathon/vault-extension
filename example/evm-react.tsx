"use client";
import { Button } from "antd";
import { useState, useEffect, useRef } from "react";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, useActiveWallet } from "thirdweb/react";

export default function Home() {
  const [showIframe, setShowIframe] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const client = createThirdwebClient({
    clientId: "bec5ca43d7af4d6fa9556604aaf3ebd1",
  });

  const wallet = useActiveWallet();

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log("event từ iframe", event);
      if (event.data.type === "eth_requestAccounts") {
        handleRequestAccounts(event.data);
      }
      if (event.data.type === "eth_sendTransaction") {
        handleSendTransaction(event.data);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleRequestAccounts = async (params: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
        {
          type: "eth_requestAccounts_response",
          transactionId: params.transactionId,
          result: ["0x1234567890123456789012345678901234567890"],
        },
        "*"
        );
      }
  };

  const handleSendTransaction = async (params: any) => {
    try {
      const param = params.params[0];
      console.log("wallet", wallet?.getAccount());
      const newParams = {
        ...param,
        from: "0xe890Ce0845c2f607a842F0762366287dEC25d37e",
      };
      console.log("newParams", newParams);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      window.ethereum?.request({
        method: "eth_sendTransaction",
        params: [newParams],
      });
    } catch (error) {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "eth_sendTransaction_response",
            transactionId: params.transactionId,
            error: error || "Transaction failed",
          },
          "*"
        );
      }
    }
  };

  const postMessageToIframe = (message?: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "metamask_update_address",
          address: "0x1234567890123456789012345678901234567890",
        },
        "*"
      );
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setChainId(null);
  };

  const formatAddress = (address: string) => {
    return (
      address.substring(0, 6) + "..." + address.substring(address.length - 4)
    );
  };

  return (
    <main className="flex flex-col items-center p-4">
      <div className="small w-100 mb-4">
        <ConnectButton client={client} />
      </div>

      <div className="flex gap-2 mb-4">
        {walletAddress ? (
          <div className="flex gap-2">
            <Button disabled>
              {formatAddress(walletAddress)} ({chainId})
            </Button>
            <Button onClick={disconnectWallet}>Disconnect</Button>
          </div>
        ) : (
          <Button onClick={() => postMessageToIframe()}>Post Message</Button>
        )}
        <Button type="primary" onClick={() => setShowIframe(!showIframe)}>
          {showIframe ? "Hide" : "Show"}
        </Button>
      </div>

      {showIframe && (
        <div
          className="w-full border rounded-lg overflow-hidden"
          style={{ height: "80vh" }}
        >
          <iframe
            ref={iframeRef}
            src="https://pancakeswap.finance/swap"
            width="100%"
            height="100%"
            style={{ border: "none" }}
            title="Safe"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation allow-presentation"
          />
        </div>
      )}
    </main>
  );
}
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, handler: (...args: any[]) => void) => void;
      removeListener: (
        eventName: string,
        handler: (...args: any[]) => void
      ) => void;
    };
    web3?: any;
  }
}
