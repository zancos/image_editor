export interface EditRequest {
  imageBase64: string;
  mimeType: string;
  prompt: string;
}

export interface EditResponse {
  success: boolean;
  image?: string; // Base64 data URI
  error?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
