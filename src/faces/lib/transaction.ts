import { TagInterface } from './tag';

export interface TransactionInterface {
  format: number;
  id: string;
  lastTx: string;
  owner: string;
  tags: TagInterface[];
  target: string;
  quantity: string;
  data: Uint8Array;
  reward: string;
  signature: string;
  dataSize: string;
  dataRoot: string;
}
