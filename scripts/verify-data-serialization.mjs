import { mkdir, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import * as esbuild from 'esbuild';

const tempDir = path.join(os.tmpdir(), 'cv-val-data-test');
const bundlePath = path.join(tempDir, 'data-serialization-test.mjs');
const modulePath = (relativePath) => JSON.stringify(path.resolve(relativePath));

const entry = `
import { strict as assert } from 'node:assert';
import { PoseData } from ${modulePath('@apps/features/pose/core/pose-data.ts')};
import { TrackBallData } from ${modulePath('@apps/features/track-ball/data/track-ball-data.ts')};
import { TrackBatData } from ${modulePath('@apps/features/track-bat/data/track-bat-data.ts')};
import { CVValData } from ${modulePath('@packages/cv-val/data/cvval-data.ts')};

const metadata = [{ fps: 30, width: 640, height: 480, duration: 1 }];
const image = { width: 640, height: 480 };

async function roundTrip(DataClass, fileName, seed, verify) {
  const original = new DataClass();
  original.initialize(metadata);
  seed(original);
  const blob = await original.toBlob(true);
  const restored = new DataClass();
  await restored.loadFromFile(new File([blob], fileName));
  verify(restored);
}

await roundTrip(PoseData, 'pose.cvp', (data) => {
  data.addDataAt(0, image, {
    landmarks3d: { hip: [0, 0, 0], shoulder: [1, 1, 1] },
    landmarks2dList: [{ hip: [0, 0, 0], shoulder: [1, 1, 1] }],
    visibilityScoreList: [{ hip: 0.9, shoulder: 0.8 }],
  });
}, (data) => {
  assert.equal(data.getFrameCnt(), 1);
  assert.equal(data.getFPS(), 30);
  assert.deepEqual(data.getPose(0).keypoints.hip, { x: 0, y: 0, z: 0, score: 0.9 });
});

await roundTrip(TrackBallData, 'ball.cvbl', (data) => {
  data.addDataAt(0, image, [{ bbox: [10, 20, 30, 40], confidence: 0.8, classId: 32, x: 10, y: 20, width: 30, height: 40 }]);
}, (data) => {
  assert.equal(data.getFrameCnt(), 1);
  assert.deepEqual(data.getSelectedBallAt(0)?.bbox, [10, 20, 30, 40]);
});

await roundTrip(TrackBatData, 'bat.cvbt', (data) => {
  data.addDataAt(0, image, [{ bbox: [11, 21, 31, 41], confidence: 0.7, classId: 34, maskConfidenceMap: [[0.1, 0.9]] }]);
}, (data) => {
  assert.equal(data.getFrameCnt(), 1);
  assert.deepEqual(data.getSelectedBatAt(0)?.bbox, [11, 21, 31, 41]);
});

const cvval = new CVValData();
const ball = new TrackBallData();
ball.initialize(metadata);
ball.addDataAt(0, image, [{ bbox: [1, 2, 3, 4], confidence: 0.95, classId: 32, x: 1, y: 2, width: 3, height: 4 }]);
cvval.set('ball', ball);
assert.equal(cvval.exist('ball'), true);
assert.equal(cvval.get('ball')?.getFrameCnt(), 1);

console.log('data serialization smoke test passed');
`;

await mkdir(tempDir, { recursive: true });
await writeFile(path.join(tempDir, 'entry.ts'), entry);

await esbuild.build({
  entryPoints: [path.join(tempDir, 'entry.ts')],
  bundle: true,
  outfile: bundlePath,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  external: [
    '@mediapipe/*',
    '@tensorflow/*',
  ],
  alias: {
    '@packages': path.resolve('@packages'),
    '@cv-val': path.resolve('@packages/cv-val'),
    '@apps': path.resolve('@apps'),
    '@shared': path.resolve('@shared'),
    '@': path.resolve('src'),
  },
  logLevel: 'silent',
});

await import(pathToFileURL(bundlePath).href);
await rm(tempDir, { recursive: true, force: true });
