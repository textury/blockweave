export interface TransactionConfirmedDataInterface {
  block_indep_hash: string;
  block_height: number;
  number_of_confirmations: number;
}
export interface TransactionStatusResponseInterface {
  status: number;
  confirmed: TransactionConfirmedDataInterface;
}
