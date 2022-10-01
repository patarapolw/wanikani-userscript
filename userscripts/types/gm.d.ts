declare function GM_xmlhttpRequest(params: {
  method: string;
  url: string;
  onload: (data: { responseText: string }) => void;
  onerror?: (data: any) => void;
});
