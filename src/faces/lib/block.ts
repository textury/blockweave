import { TagInterface } from "./tag";

export interface BlockInterface {
  nonce: string;
  previous_block: string;
  timestamp: number;
  last_retarget: number;
  diff: string;
  height: number;
  hash: string;
  indep_hash: string;
  txs: string[];
  tx_root: string;
  wallet_list: string;
  reward_addr: string;
  tags: TagInterface[];
  reward_pool: number;
  weave_size: number;
  block_size: number;
  cumulative_diff: string;
  hash_list_merkle: string;
}