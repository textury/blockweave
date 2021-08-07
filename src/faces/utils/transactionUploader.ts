export interface SerializedUploader {
  chunkIndex: number;
  txPosted: boolean;
  transaction: any;
  lastRequestTimeEnd: number;
  lastResponseStatus: number;
  lastResponseError: string;
}