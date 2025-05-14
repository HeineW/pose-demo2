const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fpsDisplay = document.getElementById('fps');

let detector;
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
    audio: false
  });
  video.srcObject = stream;
  return new Promise(resolve => {
    video.onloadedmetadata = () => resolve(video);
  });
}

async function loadModel() {
  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  };
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
}

function drawSkeleton(keypoints) {
  const adjacentPairs = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "red";
  ctx.fillStyle = "blue";

  for (const keypoint of keypoints) {
    if (keypoint.score > 0.4) {
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  for (const [i, j] of adjacentPairs) {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];
    if (kp1.score > 0.4 && kp2.score > 0.4) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  }
}

function updateFPS() {
  const now = performance.now();
  frameCount++;
  const delta = now - lastFrameTime;
  if (delta >= 1000) {
    fps = Math.round((frameCount / delta) * 1000);
    fpsDisplay.textContent = `FPS: ${fps}`;
    lastFrameTime = now;
    frameCount = 0;
  }
}

async function detectPose() {
  const poses = await detector.estimatePoses(video);
  if (poses.length > 0) {
    drawSkeleton(poses[0].keypoints);
  }
  updateFPS();
  requestAnimationFrame(detectPose);
}

async function main() {
  await setupCamera();
  video.play();
  await loadModel();
  detectPose();
}

main();
