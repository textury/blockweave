import { TagInterface } from '../faces/lib/tag';
import { TransactionInterface } from '../faces/lib/transaction';

export default class Transaction implements TransactionInterface {
  public readonly format: number = 2;
  public id: string = '';
  public readonly lastTx: string = '';
  public owner: string = '';
  public tags: TagInterface[] = [];
  public readonly target: string = '';
  public readonly quantity: string = '0';
  public readonly dataSize: string = '0';
  public data: Uint8Array = new Uint8Array();
  public dataRoot: string = '';
  public reward: string = '0';
  public signature: string = '';

  // private _raw: TransactionInterface = {};

  constructor(attributes: Partial<TransactionInterface>) {
    Object.assign(this, attributes);

    // If something passes in a Tx that has been toJSON'ed and back,
    // or where the data was filled in from /tx/data endpoint.
    // data will be b64url encoded, so decode it.
    // if(typeof this.data === 'string') {
    //   this.data =
    // }

    // if(attributes.tags) {
    //   this.tags = attributes.tags.map((t: TagInterface) => {
    //     return
    //   }
    // }
  }
}
