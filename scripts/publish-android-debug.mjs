import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const buildGradlePath = path.join(rootDir, 'android/app/build.gradle');
const apkSourcePath = path.join(rootDir, 'android/app/build/outputs/apk/debug/app-debug.apk');
const outputDir = path.join(rootDir, 'public/android-app');

const buildGradle = await readFile(buildGradlePath, 'utf8');

const versionNameMatch = buildGradle.match(/versionName\s+"([^"]+)"/);
const versionCodeMatch = buildGradle.match(/versionCode\s+(\d+)/);

if (!versionNameMatch || !versionCodeMatch) {
  throw new Error('Could not read Android versionName/versionCode from android/app/build.gradle.');
}

await mkdir(outputDir, { recursive: true });

const versionName = versionNameMatch[1];
const versionCode = Number.parseInt(versionCodeMatch[1], 10);
const fileName = `the-final-check-android-debug-v${versionName}.apk`;
const outputApkPath = path.join(outputDir, fileName);

await copyFile(apkSourcePath, outputApkPath);

const apkStats = await stat(outputApkPath);
const manifest = {
  versionName,
  versionCode,
  channel: 'debug',
  fileName,
  apkPath: `/android-app/${fileName}`,
  apkSizeBytes: apkStats.size,
  publishedAt: new Date().toISOString(),
  notes: 'Install this build over the current tablet app to update it.'
};

await writeFile(path.join(outputDir, 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

process.stdout.write(`Published ${fileName}\n`);
