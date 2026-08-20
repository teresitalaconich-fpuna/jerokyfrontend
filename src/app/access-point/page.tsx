"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Webcam from "react-webcam";
import {
  Camera,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  CreditCard,
  Delete,
  X,
  Send,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Zap,
  Clock,
  ScanFace,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { fetchApi, registerDocumentAttendance, ensureAuth } from "../../lib/api";
import { useFaceDetector } from "../../hooks/useFaceDetector";

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user",
};

// Web Audio API Sound Synthesizer
function playChime(type: "success" | "error") {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    if (type === "success") {
      // Pleasant harmonic ascending chime (C5 -> E5 -> G5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + idx * 0.08 + 0.35
        );

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
      });
    } else {
      // Soft low error buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }

    // Safely close audio context after chime completes to prevent resource leaks
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Ignore audio context errors
  }
}

export default function AccessPointPage() {
  const webcamRef = useRef<Webcam>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ciInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"biometric" | "document">("biometric");
  const [loading, setLoading] = useState(false);
  const [ciInput, setCiInput] = useState("");

  // Kiosk Preferences
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Check authentication on mount
  useEffect(() => {
    ensureAuth();
  }, []);

  // Result Alert Overlay
  const [alert, setAlert] = useState<{
    type: "success" | "error" | null;
    message: string;
    studentName?: string;
    courseName?: string;
    time?: string;
    checkType?: string;
  }>({ type: null, message: "" });

  // Synchronize internal video ref with react-webcam
  const updateVideoRef = useCallback(() => {
    if (webcamRef.current?.video) {
      videoRef.current = webcamRef.current.video;
    }
  }, []);

  // Clock interval
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("es-PY", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-focus C.I. input when switching to document tab
  useEffect(() => {
    if (activeTab === "document") {
      setTimeout(() => {
        ciInputRef.current?.focus();
      }, 100);
    }
  }, [activeTab]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Single-shot Biometric Attendance Request
  const captureBiometric = useCallback(async () => {
    if (!webcamRef.current || loading || cooldownRemaining > 0) return;

    setLoading(true);
    setAlert({ type: null, message: "" });

    try {
      const imageSrc = webcamRef.current.getScreenshot({ width: 640, height: 480 });
      if (!imageSrc) {
        throw new Error("No se pudo capturar la imagen de la cámara");
      }

      const res = await fetchApi<{
        studentName: string;
        courseName?: string;
        timestamp: string;
        type: string;
        message?: string;
      }>("/attendance/biometric", {
        method: "POST",
        body: JSON.stringify({ image: imageSrc }),
      });

      if (soundEnabled) {
        playChime("success");
      }

      setAlert({
        type: "success",
        message: res.message || "Asistencia registrada por Reconocimiento Facial",
        studentName: res.studentName,
        courseName: res.courseName,
        time: new Date(res.timestamp).toLocaleTimeString("es-PY"),
        checkType: res.type,
      });

      // Enter Cooldown (5s) to avoid duplicate immediate scans for the same student
      setCooldownRemaining(5);
    } catch (err) {
      if (soundEnabled) {
        playChime("error");
      }

      const message = err instanceof Error ? err.message : "Usuario no identificado";
      setAlert({
        type: "error",
        message,
      });

      // Recovery cooldown on error (3s)
      setCooldownRemaining(3);
    } finally {
      setLoading(false);
    }
  }, [loading, cooldownRemaining, soundEnabled]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (alert.type) {
      const alertTimer = setTimeout(() => {
        setAlert({ type: null, message: "" });
      }, 1200);
      return () => clearTimeout(alertTimer);
    }
  }, [cooldownRemaining, alert.type]);

  // Real-time Local Client-Side Face Detector Hook (0 network requests while idle)
  const {
    isLoaded: isDetectorLoaded,
    isInitializing: isDetectorInitializing,
    faceDetected,
    detectionState,
    stabilityScore,
    guidanceMessage,
    boundingBox,
  } = useFaceDetector({
    active: isAutoMode && activeTab === "biometric" && !loading,
    videoRef,
    onTriggerCapture: captureBiometric,
    cooldownRemaining,
  });

  // Handle Contingency Document Attendance
  const handleDocumentSubmit = async (overrideCi?: string) => {
    const rawCi = overrideCi !== undefined ? overrideCi : ciInput;
    const targetCi = rawCi.trim().replace(/\./g, "");
    if (!targetCi) {
      setAlert({
        type: "error",
        message: "Por favor, ingrese su Cédula de Identidad",
      });
      return;
    }

    setLoading(true);
    setAlert({ type: null, message: "" });

    try {
      const res = await registerDocumentAttendance(targetCi);
      if (soundEnabled) {
        playChime("success");
      }
      setAlert({
        type: "success",
        message: "Asistencia de contingencia registrada correctamente",
        studentName: res.studentName,
        courseName: res.courseName,
        time: new Date(res.timestamp).toLocaleTimeString("es-PY"),
        checkType: res.type,
      });
      setCiInput("");
      if (ciInputRef.current) {
        ciInputRef.current.focus();
      }
    } catch (err) {
      if (soundEnabled) {
        playChime("error");
      }
      const message =
        err instanceof Error ? err.message : "Error al registrar asistencia por C.I.";
      setAlert({
        type: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNumpadPress = (val: string) => {
    if (val === "clear") {
      setCiInput("");
    } else if (val === "backspace") {
      setCiInput((prev) => prev.slice(0, -1));
    } else {
      setCiInput((prev) => (prev.length < 15 ? prev + val : prev));
    }
    ciInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleDocumentSubmit();
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white flex flex-col justify-between font-sans select-none">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-10">
        <Link
          href="/alumnos"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Dashboard</span>
        </Link>

        {/* Center Institutional Branding & Live Clock */}
        <div className="text-center flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700 text-xs font-mono font-bold text-accent shadow-inner">
            <Clock className="h-3.5 w-3.5" />
            <span>{currentTime || "00:00:00"}</span>
          </div>
          <div>
            <h1 className="font-extrabold tracking-wider text-sm text-slate-200">
              PUNTO DE ACCESO BIOMÉTRICO
            </h1>
            <p className="text-[10px] text-accent font-bold tracking-widest">
              CONTROL DE ASISTENCIA FACIAL
            </p>
          </div>
        </div>

        {/* Right Tools: Mode, Audio, Tabs */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? "bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title={soundEnabled ? "Sonido activado" : "Sonido silenciado"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors hidden sm:block"
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setActiveTab("biometric");
                setAlert({ type: null, message: "" });
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "biometric"
                  ? "bg-accent text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              Cámara
            </button>
            <button
              onClick={() => {
                setActiveTab("document");
                setAlert({ type: null, message: "" });
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "document"
                  ? "bg-accent text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              C.I.
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="relative w-full max-w-3xl min-h-[460px] bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
          {activeTab === "biometric" ? (
            /* Webcam & Futuristic Autonomous HUD */
            <div className="relative w-full aspect-video flex items-center justify-center bg-black">
              <Webcam
                audio={false}
                ref={webcamRef}
                onUserMedia={updateVideoRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="w-full h-full object-cover transform scale-x-[-1]"
              />

              {/* Status Header Badge in Camera View */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow border transition-all ${
                      detectionState === "cooldown"
                        ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                        : detectionState === "processing"
                        ? "bg-blue-950/80 border-blue-500 text-blue-300 animate-pulse"
                        : detectionState === "locking"
                        ? "bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse"
                        : "bg-slate-950/80 border-slate-700 text-slate-300"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        detectionState === "cooldown"
                          ? "bg-emerald-400"
                          : detectionState === "processing"
                          ? "bg-blue-400 animate-ping"
                          : detectionState === "locking"
                          ? "bg-amber-400"
                          : "bg-accent animate-pulse"
                      }`}
                    />
                    {detectionState === "cooldown"
                      ? `Siguiente alumno en ${cooldownRemaining}s`
                      : detectionState === "processing"
                      ? "Identificando alumno..."
                      : detectionState === "locking"
                      ? `Rostro Enfocado (${stabilityScore}%) • No se mueva`
                      : isAutoMode
                      ? isDetectorLoaded
                        ? "Escaneo Inteligente Activo"
                        : isDetectorInitializing
                        ? "Cargando cámara..."
                        : "Escaneo Automático Activo"
                      : "Modo Manual"}
                  </div>
                </div>

                {/* Auto Mode Pill Indicator */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] font-semibold text-slate-300 border border-slate-800">
                  <Zap className="h-3 w-3 text-amber-400" />
                  {isAutoMode ? "Manos Libres" : "Manual"}
                </div>
              </div>

              {/* Real-Time Bounding Box Tracking HUD */}
              {boundingBox && isAutoMode && detectionState !== "cooldown" && (
                <div
                  className={`absolute pointer-events-none rounded-2xl border-2 transition-all duration-150 ${
                    detectionState === "locking"
                      ? "border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)]"
                      : detectionState === "processing"
                      ? "border-blue-400 shadow-[0_0_35px_rgba(96,165,250,0.8)]"
                      : "border-accent/70 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                  }`}
                  style={{
                    // Mirrored calculation because webcam has scale-x-[-1]
                    left: `${(1 - (boundingBox.x + boundingBox.width)) * 100}%`,
                    top: `${boundingBox.y * 100}%`,
                    width: `${boundingBox.width * 100}%`,
                    height: `${boundingBox.height * 100}%`,
                  }}
                >
                  {/* Four HUD corners */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
                </div>
              )}

              {/* Target Viewfinder & Guidance Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-0">
                {/* Target Oval Frame Brackets */}
                <div
                  className={`relative w-64 h-80 rounded-3xl transition-all duration-300 flex flex-col justify-between p-3 ${
                    detectionState === "locking"
                      ? "border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.4)] scale-102"
                      : detectionState === "processing"
                      ? "border-2 border-blue-400 shadow-[0_0_40px_rgba(96,165,250,0.6)] scale-100"
                      : detectionState === "cooldown"
                      ? "border-2 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.4)]"
                      : "border border-white/20"
                  }`}
                >
                  {/* Four Corner Brackets */}
                  <div className="flex justify-between">
                    <div
                      className={`w-6 h-6 border-t-4 border-l-4 rounded-tl-lg transition-colors ${
                        detectionState === "locking"
                          ? "border-amber-400"
                          : detectionState === "cooldown"
                          ? "border-emerald-400"
                          : "border-accent"
                      }`}
                    />
                    <div
                      className={`w-6 h-6 border-t-4 border-r-4 rounded-tr-lg transition-colors ${
                        detectionState === "locking"
                          ? "border-amber-400"
                          : detectionState === "cooldown"
                          ? "border-emerald-400"
                          : "border-accent"
                      }`}
                    />
                  </div>

                  {/* Stillness Progress Bar (when locking on face) */}
                  {detectionState === "locking" && (
                    <div className="w-full space-y-1.5 px-2">
                      <div className="w-full bg-slate-900/90 h-2.5 rounded-full overflow-hidden border border-amber-400/50 p-0.5 shadow-inner">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-150"
                          style={{ width: `${stabilityScore}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-center font-bold text-amber-300 tracking-wider uppercase">
                        ENFOCANDO ROSTRO... {stabilityScore}%
                      </p>
                    </div>
                  )}

                  {/* Scanning Laser Beam (idle state) */}
                  {detectionState === "idle" && (
                    <div className="w-full h-0.5 bg-accent shadow-[0_0_15px_#f97316] animate-pulse" />
                  )}

                  <div className="flex justify-between">
                    <div
                      className={`w-6 h-6 border-b-4 border-l-4 rounded-bl-lg transition-colors ${
                        detectionState === "locking"
                          ? "border-amber-400"
                          : detectionState === "cooldown"
                          ? "border-emerald-400"
                          : "border-accent"
                      }`}
                    />
                    <div
                      className={`w-6 h-6 border-b-4 border-r-4 rounded-br-lg transition-colors ${
                        detectionState === "locking"
                          ? "border-amber-400"
                          : detectionState === "cooldown"
                          ? "border-emerald-400"
                          : "border-accent"
                      }`}
                    />
                  </div>
                </div>

                {/* Dynamic Helper Text */}
                <p className="mt-4 text-xs font-medium text-slate-200 bg-black/70 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                  {guidanceMessage}
                </p>
              </div>
            </div>
          ) : (
            /* Contingency Document View */
            <div className="w-full py-8 px-6 bg-slate-900/90 flex flex-col items-center justify-center space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 bg-accent/10 text-accent rounded-full mb-1">
                  <CreditCard className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-100">
                  Marcación por Cédula de Identidad
                </h2>
                <p className="text-xs text-slate-400">
                  Ingrese su número de C.I. mediante el teclado o con el teclado numérico en
                  pantalla.
                </p>
              </div>

              {/* Real Input Element */}
              <div className="w-full max-w-sm relative">
                <input
                  ref={ciInputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="Ingrese C.I. (ej: 1234567)"
                  value={ciInput}
                  onChange={(e) => setCiInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-3 bg-slate-950 border-2 border-accent/60 rounded-lg text-center font-mono text-2xl font-bold tracking-widest text-amber-400 placeholder:text-slate-600 focus:outline-none focus:border-accent shadow-inner"
                  autoFocus
                />
                {ciInput && (
                  <button
                    onClick={() => {
                      setCiInput("");
                      ciInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Touch Numpad */}
              <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumpadPress(num)}
                    className="py-3 bg-slate-800 hover:bg-slate-700 active:bg-accent text-xl font-bold rounded-lg transition-colors text-slate-100 shadow"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => handleNumpadPress("clear")}
                  className="py-3 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-bold rounded-lg transition-colors border border-red-800/40"
                >
                  Limpiar
                </button>
                <button
                  onClick={() => handleNumpadPress("0")}
                  className="py-3 bg-slate-800 hover:bg-slate-700 active:bg-accent text-xl font-bold rounded-lg transition-colors text-slate-100 shadow"
                >
                  0
                </button>
                <button
                  onClick={() => handleNumpadPress("backspace")}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center rounded-lg transition-colors"
                >
                  <Delete className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Loading Indicator Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 animate-in fade-in">
              <RefreshCw className="h-12 w-12 text-accent animate-spin" />
              <p className="text-base font-bold tracking-wide text-slate-100">
                {activeTab === "biometric"
                  ? "Verificando identidad de alumno..."
                  : "Verificando C.I. de estudiante..."}
              </p>
            </div>
          )}

          {/* Result Alert / Confirmation Card Overlay */}
          {alert.type && (
            <div
              className={`absolute bottom-6 left-6 right-6 p-5 rounded-2xl border flex items-start gap-4 z-40 shadow-2xl animate-in slide-in-from-bottom duration-300 ${
                alert.type === "success"
                  ? "bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                  : "bg-red-950/95 border-red-500 text-red-100 shadow-[0_0_40px_rgba(239,68,68,0.3)]"
              }`}
            >
              {alert.type === "success" ? (
                <div className="p-3 bg-emerald-900/60 text-emerald-400 rounded-xl shrink-0 mt-0.5 border border-emerald-500/40">
                  <CheckCircle className="h-8 w-8" />
                </div>
              ) : (
                <div className="p-3 bg-red-900/60 text-red-400 rounded-xl shrink-0 mt-0.5 border border-red-500/40">
                  <AlertTriangle className="h-8 w-8" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-extrabold text-lg leading-tight">{alert.message}</h3>
                {alert.type === "success" && (
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-black/40 p-3 rounded-xl font-medium border border-white/10">
                    <p>
                      <span className="text-slate-400 text-xs">Alumno:</span>
                      <br />
                      <strong className="text-base text-white">{alert.studentName}</strong>
                    </p>
                    <p>
                      <span className="text-slate-400 text-xs">Hora de Marcación:</span>
                      <br />
                      <strong className="text-base text-emerald-300">{alert.time}</strong>
                    </p>
                    {alert.courseName && (
                      <p className="col-span-2 mt-1">
                        <span className="text-slate-400 text-xs">Curso / Clase:</span>
                        <br />
                        <strong className="text-amber-300">{alert.courseName}</strong>
                      </p>
                    )}
                    <p className="col-span-2 mt-1 flex items-center gap-2">
                      <span className="text-slate-400 text-xs">Registro:</span>
                      <span
                        className={`inline-block px-3 py-1 text-xs font-black rounded-md uppercase tracking-wider ${
                          alert.checkType === "Entrada"
                            ? "bg-blue-600 text-white"
                            : "bg-orange-600 text-white"
                        }`}
                      >
                        {alert.checkType}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {activeTab === "biometric" ? (
            <>
              {/* Auto Mode Switch */}
              <button
                onClick={() => setIsAutoMode(!isAutoMode)}
                className={`px-5 py-3 rounded-full font-bold text-xs flex items-center gap-2 transition-all border ${
                  isAutoMode
                    ? "bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                <Zap className="h-4 w-4 text-emerald-400" />
                {isAutoMode ? "Modo Automático: ACTIVO" : "Modo Automático: DESACTIVADO"}
              </button>

              {/* Manual Click Button (Fallback or when auto mode is off) */}
              <Button
                onClick={() => captureBiometric()}
                disabled={loading || cooldownRemaining > 0}
                className="px-6 py-5 rounded-full bg-accent hover:bg-accent/90 text-white font-bold flex items-center gap-2 shadow-lg hover:shadow-accent/35 text-sm"
              >
                <Camera className="h-4 w-4" />
                {loading ? "Reconociendo..." : "Marcar con Clic"}
              </Button>

              <Button
                onClick={() => setActiveTab("document")}
                variant="outline"
                className="px-5 py-5 rounded-full bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold flex items-center gap-2 text-sm"
              >
                <CreditCard className="h-4 w-4 text-amber-400" />
                Contingencia (C.I.)
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => handleDocumentSubmit()}
                disabled={loading || !ciInput.trim()}
                className="px-8 py-5 rounded-full bg-accent hover:bg-accent/90 text-white font-bold flex items-center gap-2 shadow-lg hover:shadow-accent/35 text-sm"
              >
                <Send className="h-4 w-4" />
                {loading ? "Registrando..." : "Enviar Asistencia (C.I.)"}
              </Button>
              <Button
                onClick={() => setActiveTab("biometric")}
                variant="outline"
                className="px-5 py-5 rounded-full bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold flex items-center gap-2 text-sm"
              >
                <Camera className="h-4 w-4 text-blue-400" />
                Volver a Reconocimiento Facial
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-3 px-6 text-center text-[11px] text-slate-500 bg-slate-950/80 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Terminal de Control de Asistencia &copy; 2026. Todos los derechos reservados.</span>
        <span className="text-slate-400 font-mono text-[10px]">
          Control de Acceso Institucional
        </span>
      </footer>
    </div>
  );
}
