interface Window {
  gis?: {
    tokenClient: (config: {
      client_id: string;
      scope: string;
      callback: (response: any) => void;
    }) => {
      requestAccessToken: (options?: { prompt?: string }) => void;
    };
  };
  gapi?: {
    client: {
      init: (config: { apiKey: string; discoveryDocs: string[] }) => Promise<void>;
    };
  };
}
