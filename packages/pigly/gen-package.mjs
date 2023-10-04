import fs from 'fs/promises'

await fs.writeFile("./dist/esm/package.json",`{"type":"module"}`);
await fs.writeFile("./dist/cjs/package.json",`{"type":"commonjs"}`);