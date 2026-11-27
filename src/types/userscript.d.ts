export {};

declare global {
  function GM_registerMenuCommand(
    name: string,
    onClick: () => void,
    accessKey?: string,
  ): string | number | void;

  interface GMXmlHttpRequestDetails {
    method: 'GET' | 'POST' | 'HEAD';
    url: string;
    headers?: Record<string, string>;
    data?: string;
    anonymous?: boolean;
    timeout?: number;
    responseType?: 'text' | 'json' | 'arraybuffer' | 'blob';
    onload?: (response: {
      status: number;
      statusText: string;
      responseText: string;
      response: unknown;
    }) => void;
    onerror?: (error: unknown) => void;
    ontimeout?: () => void;
  }

  function GM_xmlhttpRequest(details: GMXmlHttpRequestDetails): void;

  const unsafeWindow: Window & typeof globalThis;
}
