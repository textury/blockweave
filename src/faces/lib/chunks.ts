export interface TransactionOffsetResponseInterface {
  size: string;
  offset: string;
}

export interface TransactionChunkResponseInterface {
  chunk: string;
  data_path: string;
  tx_path: string;
}