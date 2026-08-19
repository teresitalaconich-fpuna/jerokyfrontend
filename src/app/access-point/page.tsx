"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Webcam from "react-webcam";
import {
  Camera,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  CreditCard,
  UserCheck,
  Delete,
  X,
  Send,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { fetchApi, registerDocumentAttendance } from "../../lib/api";

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user",
};

export default function AccessPointPage() {
  const webcamRef = useRef<Webcam>(null);
  const ciInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"biometric" | "document">("biometric");
  const [loading, setLoading] = useState(false);
  const [ciInput, setCiInput] = useState("");

  const [alert, setAlert] = useState<{
    type: "success" | "error" | null;
    message: string;
    studentName?: string;
    courseName?: string;
    time?: string;
    checkType?: string;
  }>({ type: null, message: "" });

  // Auto-focus C.I. input when switching to document tab
  useEffect(() => {
    if (activeTab === "document") {
      setTimeout(() => {
        ciInputRef.current?.focus();
      }, 100);
    }
  }, [activeTab]);

  // Clear alert after 5 seconds
  useEffect(() => {
    if (alert.type) {
      const timer = setTimeout(() => {
        setAlert({ type: null, message: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const captureBiometric = async () => {
    if (!webcamRef.current) return;
    setLoading(true);
    setAlert({ type: null, message: "" });

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error("No se pudo capturar la imagen de la cámara");
      }

      const res = await fetchApi<{
        studentName: string;
        courseName?: string;
        timestamp: string;
        type: string;
      }>("/attendance/biometric", {
        method: "POST",
        body: JSON.stringify({ image: imageSrc }),
      });

      setAlert({
        type: "success",
        message: "Asistencia registrada por Reconocimiento Facial",
        studentName: res.studentName,
        courseName: res.courseName,
        time: new Date(res.timestamp).toLocaleTimeString("es-PY"),
        checkType: res.type,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Usuario no identificado";
      setAlert({
        type: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSubmit = async (overrideCi?: string) => {
    const rawCi = overrideCi !== undefined ? overrideCi : ciInput;
    const targetCi = rawCi.trim().replace(/\./g, '');
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
      const message = err instanceof Error ? err.message : "Error al registrar asistencia por C.I.";
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
    <div className="relative min-h-screen bg-slate-950 text-white flex flex-col justify-between font-sans">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 z-10">
        <Link
          href="/alumnos"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Volver al Dashboard</span>
        </Link>
        <div className="text-center">
          <h1 className="font-bold tracking-wider text-sm text-slate-300">PUNTO DE ACCESO BIOMÉTRICO</h1>
          <p className="text-[10px] text-accent font-bold">CONTROL DE ASISTENCIA EN TIEMPO REAL</p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("biometric")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "biometric"
                ? "bg-accent text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            Cámara Facial
          </button>
          <button
            onClick={() => setActiveTab("document")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "document"
                ? "bg-accent text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Contingencia (C.I.)
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="relative w-full max-w-3xl min-h-[420px] bg-slate-900 border-2 border-slate-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
          
          {activeTab === "biometric" ? (
            /* Webcam View */
            <div className="relative w-full aspect-video flex items-center justify-center">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              {/* Scanner Overlay UI */}
              <div className="absolute inset-0 border-[30px] border-black/20 pointer-events-none flex flex-col justify-between p-4">
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-t-4 border-l-4 border-accent" />
                  <div className="w-8 h-8 border-t-4 border-r-4 border-accent" />
                </div>
                <div className="w-full h-0.5 bg-accent/60 shadow-[0_0_15px_#f97316] animate-pulse" />
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-b-4 border-l-4 border-accent" />
                  <div className="w-8 h-8 border-b-4 border-r-4 border-accent" />
                </div>
              </div>
            </div>
          ) : (
            /* Contingency Document Input View */
            <div className="w-full py-8 px-6 bg-slate-900/90 flex flex-col items-center justify-center space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 bg-accent/10 text-accent rounded-full mb-1">
                  <CreditCard className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-100">Marcación por Cédula de Identidad</h2>
                <p className="text-xs text-slate-400">
                  Ingrese su número de C.I. mediante el teclado o con el teclado numérico en pantalla.
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
            <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center gap-3 z-20">
              <RefreshCw className="h-10 w-10 text-accent animate-spin" />
              <p className="text-sm font-semibold tracking-wide">
                {activeTab === "biometric" ? "Analizando rasgos faciales..." : "Verificando C.I. de estudiante..."}
              </p>
            </div>
          )}

          {/* Verification Alert Overlay */}
          {alert.type && (
            <div
              className={`absolute bottom-6 left-6 right-6 p-5 rounded-lg border flex items-start gap-4 z-30 animate-in slide-in-from-bottom duration-300 ${
                alert.type === "success"
                  ? "bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-2xl"
                  : "bg-destructive/95 border-destructive text-destructive-foreground shadow-2xl"
              }`}
            >
              {alert.type === "success" ? (
                <CheckCircle className="h-10 w-10 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-10 w-10 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg leading-tight">{alert.message}</h3>
                {alert.type === "success" && (
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-black/30 p-2.5 rounded font-medium">
                    <p>
                      <span className="text-slate-400 text-xs">Alumno:</span>
                      <br />
                      <strong>{alert.studentName}</strong>
                    </p>
                    <p>
                      <span className="text-slate-400 text-xs">Hora:</span>
                      <br />
                      <strong>{alert.time}</strong>
                    </p>
                    {alert.courseName && (
                      <p className="col-span-2 mt-1">
                        <span className="text-slate-400 text-xs">Curso / Clase:</span>
                        <br />
                        <strong className="text-amber-300">{alert.courseName}</strong>
                      </p>
                    )}
                    <p className="col-span-2 mt-1">
                      <span className="text-slate-400 text-xs">Registro:</span>
                      <br />
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${
                          alert.checkType === "Entrada"
                            ? "bg-blue-500 text-white"
                            : "bg-orange-500 text-white"
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

        {/* Action Controls Below Main Box */}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {activeTab === "biometric" ? (
            <>
              <Button
                onClick={captureBiometric}
                disabled={loading}
                className="px-8 py-6 rounded-full bg-accent hover:bg-accent/90 text-white font-bold flex items-center gap-2 shadow-lg hover:shadow-accent/35 transition-all text-base"
              >
                <Camera className="h-5 w-5" />
                {loading ? "Reconociendo..." : "Registrar Asistencia Facial"}
              </Button>
              <Button
                onClick={() => setActiveTab("document")}
                variant="outline"
                className="px-6 py-6 rounded-full bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold flex items-center gap-2 text-base"
              >
                <CreditCard className="h-5 w-5 text-amber-400" />
                Marcación por C.I.
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => handleDocumentSubmit()}
                disabled={loading || !ciInput.trim()}
                className="px-10 py-6 rounded-full bg-accent hover:bg-accent/90 text-white font-bold flex items-center gap-2.5 shadow-lg hover:shadow-accent/35 transition-all text-base"
              >
                <Send className="h-5 w-5" />
                {loading ? "Registrando..." : "Enviar Asistencia (C.I.)"}
              </Button>
              <Button
                onClick={() => setActiveTab("biometric")}
                variant="outline"
                className="px-6 py-6 rounded-full bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold flex items-center gap-2 text-base"
              >
                <Camera className="h-5 w-5 text-blue-400" />
                Volver a Reconocimiento Facial
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 bg-slate-950/80 border-t border-slate-900">
        Jeroky Soft Biometrics terminal &copy; 2026. Todos los derechos reservados.
      </footer>
    </div>
  );
}
