const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fpsDisplay = document.getElementById('fps');

let model;
let lastTime = performance.now();
let frames = 0;

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

function updateFPS() {
  const now = performance.now();
  frames++;
  if (now - lastTime >= 1000) {
    fpsDisplay.textContent = `FPS: ${frames}`;
    frames = 0;
    lastTime = now;
  }
}

function buildObjectRectangle(prediction) {
  const [x, y, width, height] = prediction.bbox;
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = '#00FFFF';
  ctx.font = '16px sans-serif';
  ctx.fillText(
    `${prediction.class} (${(prediction.score * 100).toFixed(1)}%)`,
    x,
    y > 10 ? y - 5 : y + 15
  );
}

async function detectObjects() {
  if (model && video.readyState === 4) {
    const predictions = await model.detect(video);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach(prediction => {
      if (prediction.score > 0.5) {
        buildObjectRectangle(prediction);
      }
    });
  }
  updateFPS();
  requestAnimationFrame(detectObjects);
}

async function main() {
  await setupCamera();
  video.play();
  model = await cocoSsd.load();
  detectObjects();
}

main();
