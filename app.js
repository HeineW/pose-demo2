// Global variables
let video = null;
let output = null;
let detector = null;
let model = null;
let startTime = null;
let frameCount = 0;
let fps = 0;
let isDetecting = false;
let animationId = null;

// DOM elements
const startButton = document.getElementById('startButton');
const modelTypeSelect = document.getElementById('modelType');
const fpsDisplay = document.getElementById('fps');

// Keypoint connections for drawing skeleton
const connectedKeyPoints = [
    [0, 1], [0, 2], [1, 3], [2, 4], // Head and shoulders
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
    [5, 11], [6, 12], [11, 12], // Torso
    [11, 13], [13, 15], [12, 14], [14, 16] // Legs
];

// Initialize the application
async function init() {
    try {
        video = document.getElementById('video');
        output = document.getElementById('output');
        
        // Set up camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: 'user' } 
        });
        video.srcObject = stream;
        await video.play();
        
        // Set canvas dimensions to match video
        output.width = video.videoWidth;
        output.height = video.videoHeight;
        
        // Set up event listeners
        startButton.addEventListener('click', toggleDetection);
        modelTypeSelect.addEventListener('change', async () => {
            if (isDetecting) {
                await toggleDetection();
                await toggleDetection();
            }
        });
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        alert('Error initializing application. Please check console for details.');
    }
}

// Toggle pose detection on/off
async function toggleDetection() {
    if (isDetecting) {
        // Stop detection
        cancelAnimationFrame(animationId);
        isDetecting = false;
        startButton.textContent = 'Start Detection';
        clearCanvas();
    } else {
        // Start detection
        if (!detector) {
            await loadModel();
        }
        isDetecting = true;
        startButton.textContent = 'Stop Detection';
        startTime = Date.now();
        frameCount = 0;
        detectPose();
    }
}

// Load the MoveNet model
async function loadModel() {
    try {
        const modelType = modelTypeSelect.value;
        const modelConfig = modelType === 'heavy' ? 
            poseDetection.SupportedModels.MoveNet :
            poseDetection.SupportedModels.MoveNet;
        
        const detectorConfig = {
            modelType: modelType === 'heavy' ? 
                poseDetection.movenet.modelType.SINGLEPOSE_THUNDER : 
                poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        };
        
        detector = await poseDetection.createDetector(modelConfig, detectorConfig);
        console.log(`Model loaded: ${modelType === 'heavy' ? 'Thunder' : 'Lightning'}`);
    } catch (error) {
        console.error('Error loading model:', error);
        alert('Error loading model. Please check console for details.');
    }
}

// Detect poses in video frames
async function detectPose() {
    if (!isDetecting) return;
    
    try {
        const poses = await detector.estimatePoses(video);
        drawPoses(poses);
        
        // Calculate FPS
        frameCount++;
        const elapsed = (Date.now() - startTime) / 1000;
        fps = Math.round(frameCount / elapsed);
        fpsDisplay.textContent = `FPS: ${fps}`;
        
        // Continue detection loop
        animationId = requestAnimationFrame(detectPose);
    } catch (error) {
        console.error('Error detecting pose:', error);
        isDetecting = false;
        startButton.textContent = 'Start Detection';
    }
}

// Draw poses on canvas
function drawPoses(poses) {
    const ctx = output.getContext('2d');
    ctx.clearRect(0, 0, output.width, output.height);
    
    if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        
        // Draw keypoints
        for (const keypoint of keypoints) {
            if (keypoint.score > 0.3) {
                drawKeypoint(ctx, keypoint);
            }
        }
        
        // Draw skeleton
        for (const [i, j] of connectedKeyPoints) {
            if (i < keypoints.length && j < keypoints.length && 
                keypoints[i].score > 0.3 && keypoints[j].score > 0.3) {
                drawSegment(ctx, keypoints[i], keypoints[j]);
            }
        }
    }
}

// Draw a single keypoint
function drawKeypoint(ctx, keypoint) {
    const { x, y, score } = keypoint;
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = getColorForScore(score);
    ctx.fill();
    
    // Optional: draw score text
    // ctx.fillStyle = 'white';
    // ctx.font = '10px Arial';
    // ctx.fillText(score.toFixed(2), x + 8, y);
}

// Draw a line segment between two keypoints
function drawSegment(ctx, keypoint1, keypoint2) {
    const { x: x1, y: y1, score: score1 } = keypoint1;
    const { x: x2, y: y2, score: score2 } = keypoint2;
    
    const avgScore = (score1 + score2) / 2;
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = getColorForScore(avgScore);
    ctx.stroke();
}

// Get color based on keypoint score (green to red gradient)
function getColorForScore(score) {
    const hue = score * 120; // 0 (red) to 120 (green)
    return `hsl(${hue}, 100%, 50%)`;
}

// Clear the canvas
function clearCanvas() {
    const ctx = output.getContext('2d');
    ctx.clearRect(0, 0, output.width, output.height);
    fpsDisplay.textContent = '';
}

// Initialize the app when the page loads
window.addEventListener('DOMContentLoaded', init);