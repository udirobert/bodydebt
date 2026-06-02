import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

// Key landmark indices for MediaPipe Face Mesh (468 total)
const LANDMARKS = {
  LEFT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 133,
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_OUTER: 263,
  RIGHT_EYE_INNER: 362,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
  LEFT_EYEBROW_INNER: 107,
  LEFT_EYEBROW_OUTER: 70,
  RIGHT_EYEBROW_INNER: 336,
  RIGHT_EYEBROW_OUTER: 300,
  MOUTH_TOP: 13,
  MOUTH_BOTTOM: 14,
  MOUTH_LEFT: 61,
  MOUTH_RIGHT: 291,
};

export interface StressFeatures {
  leftEyeAspect: number;
  rightEyeAspect: number;
  browTension: number;
  mouthTension: number;
  timestamp: number;
}

// Calculate Euclidean distance between two 3D points
function distance(p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2));
}

// Calculate Eye Aspect Ratio (EAR) - lower values indicate closed/tired eyes
function calculateEAR(
  outer: { x: number; y: number; z: number },
  inner: { x: number; y: number; z: number },
  top: { x: number; y: number; z: number },
  bottom: { x: number; y: number; z: number }
): number {
  const verticalDist1 = distance(top, bottom);
  const horizontalDist = distance(outer, inner);
  return horizontalDist > 0 ? verticalDist1 / horizontalDist : 0;
}

interface MediaPipeLandmark {
  x: number;
  y: number;
  z: number;
}

// Extract lightweight geometric features from MediaPipe landmarks
export function extractStressFeatures(landmarks: MediaPipeLandmark[]): StressFeatures | null {
  if (!landmarks || landmarks.length < 468) return null;

  const getPoint = (index: number) => landmarks[index];

  const leftEAR = calculateEAR(
    getPoint(LANDMARKS.LEFT_EYE_OUTER),
    getPoint(LANDMARKS.LEFT_EYE_INNER),
    getPoint(LANDMARKS.LEFT_EYE_TOP),
    getPoint(LANDMARKS.LEFT_EYE_BOTTOM)
  );

  const rightEAR = calculateEAR(
    getPoint(LANDMARKS.RIGHT_EYE_OUTER),
    getPoint(LANDMARKS.RIGHT_EYE_INNER),
    getPoint(LANDMARKS.RIGHT_EYE_TOP),
    getPoint(LANDMARKS.RIGHT_EYE_BOTTOM)
  );

  // Brow tension: average vertical distance between eyebrows and eyes
  const leftBrowDist = distance(getPoint(LANDMARKS.LEFT_EYEBROW_INNER), getPoint(LANDMARKS.LEFT_EYE_TOP));
  const rightBrowDist = distance(getPoint(LANDMARKS.RIGHT_EYEBROW_INNER), getPoint(LANDMARKS.RIGHT_EYE_TOP));
  const browTension = (leftBrowDist + rightBrowDist) / 2;

  // Mouth tension: ratio of width to height
  const mouthWidth = distance(getPoint(LANDMARKS.MOUTH_LEFT), getPoint(LANDMARKS.MOUTH_RIGHT));
  const mouthHeight = distance(getPoint(LANDMARKS.MOUTH_TOP), getPoint(LANDMARKS.MOUTH_BOTTOM));
  const mouthTension = mouthHeight > 0 ? mouthWidth / mouthHeight : 1;

  return {
    leftEyeAspect: leftEAR,
    rightEyeAspect: rightEAR,
    browTension,
    mouthTension,
    timestamp: Date.now(),
  };
}

// Initialize MediaPipe FaceMesh instance
export function initializeFaceMesh(onResults: (results: { multiFaceLandmarks: MediaPipeLandmark[][] }) => void): FaceMesh {
  const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  faceMesh.onResults(onResults);
  return faceMesh;
}

// Helper to start camera stream
export function startCamera(videoElement: HTMLVideoElement, faceMesh: FaceMesh): Camera {
  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await faceMesh.send({ image: videoElement });
    },
    width: 640,
    height: 480,
  });
  
  camera.start();
  return camera;
}
