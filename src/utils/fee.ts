import { SmartWeaveWebFactory } from 'redstone-smartweave';
import Blockweave from '../blockweave';

export default async function selectWeightedHolder(blockweave: Blockweave): Promise<string> {
  let res: {
    balances: { [key: string]: number };
    vault: { [key: string]: [{ balance: number; start: number; end: number }] };
  };

  try {
    res = await getState(blockweave);
  } catch {}

  if (!res) {
    return;
  }

  const { balances, vault } = res;

  let totalTokens = 0;
  for (const addy of Object.keys(balances)) {
    totalTokens += balances[addy];
  }
  for (const addy of Object.keys(vault)) {
    if (!vault[addy].length) continue;
    const vaultBalance = vault[addy].map((a) => a.balance).reduce((a, b) => a + b, 0);
    totalTokens += vaultBalance;
    if (addy in balances) {
      balances[addy] += vaultBalance;
    } else {
      balances[addy] = vaultBalance;
    }
  }

  const weighted = {};
  for (const addy of Object.keys(balances)) {
    weighted[addy] = balances[addy] / totalTokens;
  }

  let sum = 0;
  const r = Math.random();
  for (const addy of Object.keys(weighted)) {
    sum += weighted[addy];
    if (r <= sum && weighted[addy] > 0) {
      return addy;
    }
  }

  return;
}

async function getState(blockweave: Blockweave): Promise<{
  balances: { [key: string]: number };
  vault: { [key: string]: [{ balance: number; start: number; end: number }] };
}> {
  try {
    const cxyzContractTxId = 'mzvUgNc8YFk0w5K5H7c8pyT-FC5Y_ba0r7_8766Kx74';

    // @ts-ignore
    const smartweave = SmartWeaveWebFactory.memCached(blockweave);

    // connecting to a given contract
    const cxyzContract = smartweave.contract(cxyzContractTxId);

    const { state } = await cxyzContract.readState();
    return state as any;
  } catch {
    return;
  }
}
