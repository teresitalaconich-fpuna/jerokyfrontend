"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { FaceDetector, Detection } from "@mediapipe/tasks-vision";

export interface NormalizedRect {
  x: number; // 0 to 1 (left)
  y: number; // 0 to 1 (top)
  width: number; // 0 to 1
  height: number; // 0 to 1
}

export type DetectorState = "idle" | "locking" | "processing" | "cooldown";

interface UseFaceDetectorOptions {
  active: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTriggerCapture: () => Promise<void>;
  cooldownRemaining: number;
}

export function useFaceDetector({
  active,
  videoRef,
  onTriggerCapture,
  cooldownRemaining,
}: UseFaceDetectorOptions) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionState, setDetectionState] = useState<DetectorState>("idle");
  const [stabilityScore, setStabilityScore] = useState(0);
  const [guidanceMessage, setGuidanceMessage] = useState("Inicializando cámara biométrica...");
  const [boundingBox, setBoundingBox] = useState<NormalizedRect | null>(null);

  // Detector instance ref
  const detectorRef = useRef<FaceDetector | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  // Tracking state refs for debounce/stability calculation
  const prevCenterRef = useRef<{ x: number; y: number } | null>(null);
  const stableFramesRef = useRef(0);
  const REQUIRED_STABLE_FRAMES = 8; // ~600-800ms of continuous stillness at 15 FPS

  // Flag to track if face left frame after a scan (to avoid repeated immediate re-scans of the same person)
  const faceMustLeaveRef = useRef(false);

  // 1. Initialize MediaPipe FaceDetector from standard installed package
  useEffect(() => {
    let isMounted = true;

    async function initDetector() {
      if (detectorRef.current || isProcessingRef.current) return;
      setIsInitializing(true);
      setInitError(null);

      try {
        const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");

        const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        const faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/mediapipe/models/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.55,
        });

        if (isMounted) {
          detectorRef.current = faceDetector;
          setIsLoaded(true);
          setIsInitializing(false);
          setGuidanceMessage("Posiciónese frente a la cámara");
        }
      } catch (err) {
        console.error("Error al inicializar detector facial MediaPipe:", err);
        if (isMounted) {
          setInitError("No se pudo cargar el motor de detección facial.");
          setIsInitializing(false);
        }
      }
    }

    initDetector();

    return () => {
      isMounted = false;
      if (detectorRef.current) {
        try {
          detectorRef.current.close();
        } catch {
          // ignore cleanup errors
        }
        detectorRef.current = null;
      }
    };
  }, []);

  // Update detection state when cooldown is active
  useEffect(() => {
    let active = true;
    if (cooldownRemaining > 0) {
      Promise.resolve().then(() => {
        if (active) {
          setDetectionState("cooldown");
          faceMustLeaveRef.current = true; // require subject to clear or reset before new trigger
          setStabilityScore(0);
          setBoundingBox(null);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [cooldownRemaining]);

  // 2. Continuous Analysis Loop (Local, 0 network requests)
  const processFrame = useCallback(() => {
    if (!active || !detectorRef.current || isProcessingRef.current) {
      return;
    }

    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.paused || video.ended) {
      return;
    }

    const now = performance.now();
    let detections: Detection[] = [];

    try {
      const result = detectorRef.current.detectForVideo(video, now);
      detections = result.detections || [];
    } catch {
      // Detection hiccup or frame skip
      return;
    }

    // Filter valid high-confidence detections
    const validDetections = detections.filter(
      (d) => d.categories && d.categories[0] && d.categories[0].score >= 0.55
    );

    if (validDetections.length === 0) {
      // No face in frame
      setFaceDetected(false);
      setBoundingBox(null);
      stableFramesRef.current = 0;
      prevCenterRef.current = null;
      faceMustLeaveRef.current = false; // face has cleared frame, ready for next person

      if (cooldownRemaining <= 0) {
        setDetectionState("idle");
        setStabilityScore(0);
        setGuidanceMessage("Posiciónese frente a la cámara");
      }
      return;
    }

    // Pick the most prominent/largest face if multiple people are in view
    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;

    let primaryDetection = validDetections[0];
    let maxArea = 0;

    for (const d of validDetections) {
      const area = (d.boundingBox?.width || 0) * (d.boundingBox?.height || 0);
      if (area > maxArea) {
        maxArea = area;
        primaryDetection = d;
      }
    }

    const box = primaryDetection.boundingBox;
    if (!box) return;

    // Calculate normalized coordinates (0.0 to 1.0)
    const normX = box.originX / videoWidth;
    const normY = box.originY / videoHeight;
    const normW = box.width / videoWidth;
    const normH = box.height / videoHeight;
    const centerX = normX + normW / 2;
    const centerY = normY + normH / 2;

    setFaceDetected(true);
    setBoundingBox({ x: normX, y: normY, width: normW, height: normH });

    // Gate 1: Check Distance / Size Filter (Must be close enough)
    if (normW < 0.12 || normH < 0.12) {
      stableFramesRef.current = 0;
      prevCenterRef.current = null;
      setStabilityScore(0);
      setDetectionState("idle");
      setGuidanceMessage("Rostro muy lejano • Acérquese a la cámara");
      return;
    }

    // Gate 2: Centering Filter (Must be roughly centered in the view)
    if (centerX < 0.15 || centerX > 0.85 || centerY < 0.10 || centerY > 0.90) {
      stableFramesRef.current = 0;
      prevCenterRef.current = null;
      setStabilityScore(0);
      setDetectionState("idle");
      setGuidanceMessage("Alinee su rostro dentro del recuadro");
      return;
    }

    // Gate 3: Check post-cooldown requirement (Wait until person steps away or resets)
    if (cooldownRemaining > 0) {
      setGuidanceMessage(`Espere el turno (${cooldownRemaining}s)...`);
      return;
    }

    if (faceMustLeaveRef.current) {
      setGuidanceMessage("Retírese un momento para permitir el siguiente escaneo");
      return;
    }

    // Gate 4: Debounce & Stillness Verification (Calculate movement delta between frames)
    if (prevCenterRef.current) {
      const deltaX = Math.abs(centerX - prevCenterRef.current.x);
      const deltaY = Math.abs(centerY - prevCenterRef.current.y);
      const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Threshold for "stillness" (user is standing quiet in front of lens)
      if (movement < 0.035) {
        stableFramesRef.current = Math.min(REQUIRED_STABLE_FRAMES, stableFramesRef.current + 1);
      } else {
        // Person is moving too much, decay stability
        stableFramesRef.current = Math.max(0, stableFramesRef.current - 2);
      }
    } else {
      stableFramesRef.current = 1;
    }

    prevCenterRef.current = { x: centerX, y: centerY };

    const score = Math.round((stableFramesRef.current / REQUIRED_STABLE_FRAMES) * 100);
    setStabilityScore(score);

    if (score > 15) {
      setDetectionState("locking");
      setGuidanceMessage("Rostro detectado • Permanezca quieto...");
    } else {
      setDetectionState("idle");
      setGuidanceMessage("Mantenga la mirada hacia la cámara...");
    }

    // TRIGGER SINGLE-SHOT: When stillness score reaches 100%
    if (stableFramesRef.current >= REQUIRED_STABLE_FRAMES) {
      isProcessingRef.current = true;
      setDetectionState("processing");
      setGuidanceMessage("Identificando alumno...");

      // Execute exactly ONE request
      onTriggerCapture().finally(() => {
        isProcessingRef.current = false;
        stableFramesRef.current = 0;
        prevCenterRef.current = null;
        faceMustLeaveRef.current = true; // enforce face reset after scan
      });
    }
  }, [
    active,
    videoRef,
    cooldownRemaining,
    onTriggerCapture,
  ]);

  // 3. Animation loop scheduler
  useEffect(() => {
    if (!active || !isLoaded) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    let lastTime = 0;
    const FPS = 15; // 15 FPS is optimal for face tracking without overloading CPU
    const frameInterval = 1000 / FPS;

    const loop = (timestamp: number) => {
      if (timestamp - lastTime >= frameInterval) {
        lastTime = timestamp;
        processFrame();
      }
      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [active, isLoaded, processFrame]);

  return {
    isLoaded,
    isInitializing,
    initError,
    faceDetected,
    detectionState,
    stabilityScore,
    guidanceMessage,
    boundingBox,
  };
}
