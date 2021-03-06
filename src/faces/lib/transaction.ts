import { BaseObjectInterface } from '../utils/baseObject';
import { TagInterface } from './tag';

export interface TransactionInterface extends BaseObjectInterface {
  format: number;
  id: string;
  last_tx: string;
  owner: string;
  tags: TagInterface[];
  target: string;
  quantity: string;
  data: Uint8Array;
  reward: string;
  signature: string;
  data_size: string;
  data_root: string;
}
