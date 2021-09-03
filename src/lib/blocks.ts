import Api from "./api";
import { Tag } from "./tag";
import "arconnect";
import { Network } from "./network";
import { BlockInterface } from "../faces/lib/block";

export default class Blocks {
  private static readonly ENDPOINT = "block/hash/";

  constructor(private readonly api: Api, private readonly network: Network) { }

  /**
   * Gets a block by its "indep_hash"
   */
  public async get(indepHash: string): Promise<BlockInterface> {
    const response = await this.api.get(
      `${Blocks.ENDPOINT}${indepHash}`
    );

    if (response.status === 200) {
      return response.data;
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
    const { current } = await this.network.getInfo();
    return await this.get(current);
  }
}