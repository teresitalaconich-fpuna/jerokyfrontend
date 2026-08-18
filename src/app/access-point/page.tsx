"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Webcam from "react-webcam";
import { Camera, CheckCircle, AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { fetchApi } from "../../lib/api";

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user"
};

export default function AccessPointPage() {
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | null;
    message: string;
    studentName?: string;
    courseName?: string;
    time?: string;
    checkType?: string;
  }>({ type: null, message: "" });

  // Clear alert after 5 seconds
  useEffect(() => {
    if (alert.type) {
      const timer = setTimeout(() => {
        setAlert({ type: null, message: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const capture = async () => {
    if (!webcamRef.current) return;
    setLoading(true);
    setAlert({ type: null, message: "" });

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error("No se pudo capturar la imagen de la cámara");
      }

      const res = await fetchApi<{ studentName: string; courseName?: string; timestamp: string; type: string }>("/attendance/biometric", {
        method: "POST",
        body: JSON.stringify({ image: imageSrc }),
      });

      setAlert({
        type: "success",
        message: "Asistencia registrada correctamente",
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

  return (
    <div className="relative min-h-screen bg-slate-950 text-white flex flex-col justify-between font-sans">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 z-10">
        <Link href="/alumnos" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
          <span>Volver al Dashboard</span>
        </Link>
        <div className="text-center">
          <h1 className="font-bold tracking-wider text-sm text-slate-300">PUNTO DE ACCESO BIOMÉTRICO</h1>
          <p className="text-[10px] text-accent font-bold">CONTROL DE ASISTENCIA EN TIEMPO REAL</p>
        </div>
        <div className="w-20" /> {/* Spacer */}
      </header>

      {/* Main Camera View Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="relative w-full max-w-3xl aspect-video bg-slate-900 border-2 border-slate-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
          
          {/* Webcam View */}
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
            {/* Scan animation line */}
            <div className="w-full h-0.5 bg-accent/60 shadow-[0_0_15px_#f97316] animate-pulse" />
            <div className="flex justify-between">
              <div className="w-8 h-8 border-b-4 border-l-4 border-accent" />
              <div className="w-8 h-8 border-b-4 border-r-4 border-accent" />
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-10 w-10 text-accent animate-spin" />
              <p className="text-sm font-semibold tracking-wide">Analizando rasgos faciales...</p>
            </div>
          )}

          {/* Verification Alert Overlay */}
          {alert.type && (
            <div className={`absolute bottom-6 left-6 right-6 p-5 rounded-lg border flex items-start gap-4 animate-in slide-in-from-bottom duration-300 ${
              alert.type === "success" 
                ? "bg-emerald-950/90 border-emerald-500 text-emerald-100" 
                : "bg-destructive/90 border-destructive text-destructive-foreground"
            }`}>
              {alert.type === "success" ? (
                <CheckCircle className="h-10 w-10 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-10 w-10 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg leading-tight">
                  {alert.message}
                </h3>
                {alert.type === "success" && (
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-black/20 p-2.5 rounded font-medium">
                    <p><span className="text-slate-400 text-xs">Alumno:</span><br/><strong>{alert.studentName}</strong></p>
                    <p><span className="text-slate-400 text-xs">Hora:</span><br/><strong>{alert.time}</strong></p>
                    {alert.courseName && (
                      <p className="col-span-2 mt-1"><span className="text-slate-400 text-xs">Curso / Clase:</span><br/><strong className="text-amber-300">{alert.courseName}</strong></p>
                    )}
                    <p className="col-span-2 mt-1"><span className="text-slate-400 text-xs">Registro:</span><br/>
                      <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${
                        alert.checkType === 'Entrada' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
                      }`}>{alert.checkType}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Capture Buttons */}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Button 
            onClick={capture} 
            disabled={loading}
            className="px-8 py-6 rounded-full bg-accent hover:bg-accent/90 text-white font-bold flex items-center gap-2 shadow-lg hover:shadow-accent/35 transition-all text-base"
          >
            <Camera className="h-5 w-5" />
            {loading ? "Reconociendo..." : "Registrar Asistencia"}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 bg-slate-950/80 border-t border-slate-900">
        Jeroky Soft Biometrics terminal &copy; 2026. Todos los derechos reservados.
      </footer>
    </div>
  );
}
