const { build } = require('esbuild');

const runBuild = async () => {
  // Build to browser js
  build({
    external: ['fs', 'path', 'os', 'crypto'],
    entryPoints: ['./src/ardk.ts'],
    minify: false,
    bundle: true,
    platform: 'browser',
    target: ['es2019'],
    outfile: './lib/ardk-web.js',
    sourcemap: 'external',
    define: {
      'process.env.NODE_DEBUG': false,
      'process.env.NODE_ENV': 'production',
      'process.env.DEBUG': false,
    }
  }).catch((e) => {
    console.log(e);
    process.exit(1);
  });

  // Minified version
  build({
    external: ['fs', 'path', 'os', 'crypto'],
    entryPoints: ['./src/ardk.ts'],
    minify: true,
    bundle: true,
    platform: 'browser',
    target: ['es2019'],
    outfile: './lib/ardk-web.min.js',
    sourcemap: 'external',
    define: {
      'process.env.NODE_DEBUG': false,
      'process.env.NODE_ENV': 'production',
      'process.env.DEBUG': false,
    }
  }).catch((e) => {
    console.log(e);
    process.exit(1)
  });
};

runBuild();