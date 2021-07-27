export interface BaseObjectInterface {
  get: (field: string, options?: {decode: boolean, string: boolean}) => string | Uint8Array;
}