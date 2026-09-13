const fs = require('node:fs');
const path = require('node:path');

module.exports = async function afterPack(context) {
  const source = path.join(__dirname, '..', '.server-runtime', 'node_modules');

  let destination;

  if (context.electronPlatformName === 'darwin') {
    destination = path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
      'Contents',
      'Resources',
      'server',
      'node_modules'
    );
  } else {
    destination = path.join(
      context.appOutDir,
      'resources',
      'server',
      'node_modules'
    );
  }

  if (!fs.existsSync(source)) {
    throw new Error(`Server node_modules not found: ${source}`);
  }

  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });

  console.log(`Copied server dependencies to ${destination}`);
};
