We did a performance comparison using [kelonio](https://www.npmjs.com/package/kelonio), to measure the time it takes to send the same transaction during 100 iterations.

TODO: Update this after adding fees
The final results are a difference of **74% (1,046 ms)**:
```
arpi: 889ms
arweave: 1935ms
```

If you want to run it yourself. Here's the code we used:
```typescript
import { measure } from "kelonio";
import Arweave from 'arweave';
import Arpi from 'arpi';

(async () => {
    const arpi = new Arpi({ url: 'https://arweave.net' });

    measure(async () => {
        const wallet = await arpi.wallets.generate();

        const tx = await arpi.createTransaction({
            data: 'Hello, World!'
        }, wallet);
        await tx.sign();
        await tx.post();
    }).then(m => console.log(`Arpi version: ${m.mean} ms`));


    const ar = Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https'
    });

    measure(async () => {
        const wallet = await ar.wallets.generate();

        const tx = await ar.createTransaction({
            data: 'Hello, World!'
        }, wallet);
        await ar.transactions.sign(tx, wallet);
        await ar.transactions.post(tx);
    }).then(m => console.log(`Arweave version: ${m.mean} ms`));
})();
```