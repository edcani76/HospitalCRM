interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_API_KEY: string;
  readonly VITE_GOOGLE_DRIVE_FOLDER_ID: string;
  readonly VITE_USE_FIRESTORE_EMULATOR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
