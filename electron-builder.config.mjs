import process from 'node:process';

function createPublishConfig() {
  if (
    process.env.UPDATE_PROVIDER === 'github' &&
    process.env.UPDATE_OWNER &&
    process.env.UPDATE_REPO
  ) {
    return [
      {
        provider: 'github',
        owner: process.env.UPDATE_OWNER,
        repo: process.env.UPDATE_REPO,
        releaseType: 'release'
      }
    ];
  }

  if (process.env.UPDATE_PROVIDER === 'generic' && process.env.UPDATE_URL) {
    return [
      {
        provider: 'generic',
        url: process.env.UPDATE_URL
      }
    ];
  }

  return undefined;
}

const publish = createPublishConfig();

export default {
  appId: 'com.thefinalcheck.desktop',
  productName: 'The Final Check',
  artifactName: 'the-final-check-${os}.${ext}',
  directories: {
    output: 'release',
    buildResources: 'public'
  },
  files: ['dist/**/*', 'electron/**/*', 'package.json'],
  extraMetadata: {
    main: 'electron/main.mjs'
  },
  asar: true,
  mac: {
    identity: process.env.CSC_NAME || null,
    icon: 'the-final-check-logo.png',
    target: ['dmg', 'zip'],
    category: 'public.app-category.business',
    hardenedRuntime: true,
    notarize: true
  },
  win: {
    icon: 'the-final-check-logo.png',
    target: ['nsis', 'zip']
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false
  },
  publish
};
