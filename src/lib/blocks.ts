import Api from "./api";
import { Tag } from "./tag";
import "arconnect";
import { Network } from "./network";
import { BlockInterface } from "../faces/lib/block";
import { ArCacheInterface } from "../faces/utils/arCache";

export default class Blocks {
  private api: Api;
  private network: Network;
  private cache: ArCacheInterface;

  constructor(api: Api, network: Network, cache: ArCacheInterface) {
    this.api = api;
    this.network = network;
    this.cache = cache;
  }

  /**
   * Gets a block by its "indep_hash"
   */
  public async get(indepHash: string): Promise<BlockInterface> {
    let block: BlockInterface = this.cache && (await this.cache.get(`indep_${indepHash}`));
    if (block) {
      return block;
    }

    const response = await this.api.get(
      `block/hash/${indepHash}`
    );

    if (response.status === 200) {
      block = response.data;
      if (this.cache) {
        this.cache.set(`indep_${indepHash}`, block, 60 * 60 * 1000); // 1 hour
      }
      return block;
    } else {
      if (response.status === 404) {
        throw new Error('Block not found.');
      } else {
        throw new Error(`Error while loading block data: ${response.data}`);
      }
    }
  }

  /**
   * Gets current block data (ie. block with indep_hash = Network.getInfo().current)
   */
  public async getCurrent(): Promise<BlockInterface> {
    let block: BlockInterface = this.cache && (await this.cache.get('current_block'));
    if (block) {
      return block;
    }

    const { current } = await this.network.getInfo();
    block = await this.get(current);

    if (this.cache) {
      this.cache.set('current_block', block, 2 * 60 * 1000); // 2 minutes
    }

    return block;
  }
}