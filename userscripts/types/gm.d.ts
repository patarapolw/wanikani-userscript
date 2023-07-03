interface GM_xmlhttpRequestResponse {
  responseText: string;
}

declare function GM_xmlhttpRequest(params: {
  method: string;
  url: string;
  onload: (data: GM_xmlhttpRequestResponse) => void;
  onerror?: (data: any) => void;
}): void;
