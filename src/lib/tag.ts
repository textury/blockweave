import { BaseObject } from '../utils/baseObject';

export class Tag extends BaseObject {
  readonly name: string;
  readonly value: string;

  constructor(name: string, value: string, decode: boolean = false) {
    super();

    this.name = name;
    this.value = value;
  }
}
