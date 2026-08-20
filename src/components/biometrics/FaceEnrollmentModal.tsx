"use client";

import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Trash2,
  X,
  Sparkles,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "../ui/button";
import { registerStudentFace, deleteStudentFace } from "../../lib/api";

export interface StudentEnrollmentTarget {
  id: string;
  firstName: string;
  lastName: string;
  ci: string;
  biometricTemplateId?: string | null;
}

interface FaceEnrollmentModalProps {
  student: StudentEnrollmentTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onFaceUpdated: () => void;
}

const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: "user",
};

export default function FaceEnrollmentModal({
  student,
  isOpen,
  onClose,
  onFaceUpdated,
}: FaceEnrollmentModalProps) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      if (screenshot) {
        setCapturedImage(screenshot);
        setError(null);
      }
    }
  }, [webcamRef]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor seleccione un archivo de imagen válido (JPEG o PNG)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no debe superar los 5 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFace = async () => {
    if (!student || !capturedImage) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await registerStudentFace(student.id, capturedImage);
      setSuccess("¡Rostro indexado y registrado exitosamente en AWS Rekognition!");
      setTimeout(() => {
        onFaceUpdated();
        handleClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al registrar el rostro biométrico";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFace = async () => {
    if (!student) return;
    if (!window.confirm("¿Está seguro de que desea eliminar la plantilla biométrica registrada para este alumno?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteStudentFace(student.id);
      setSuccess("Rostro biométrico eliminado correctamente");
      setTimeout(() => {
        onFaceUpdated();
        handleClose();
      }, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar rostro biométrico";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCapturedImage(null);
    setError(null);
    setSuccess(null);
    setMode("camera");
    onClose();
  };

  if (!isOpen || !student) return null;

  const hasRegisteredFace = Boolean(student.biometricTemplateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-accent/20 text-accent rounded-lg">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-snug">Enrolamiento Biométrico Facial</h3>
              <p className="text-xs text-slate-400">
                {student.firstName} {student.lastName} (CI: {student.ci})
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-slate-700">Estado Biométrico:</span>
            </div>
            {hasRegisteredFace ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle className="h-3.5 w-3.5" /> Rostro Registrado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" /> Sin Rostro Registrado
              </span>
            )}
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{success}</div>
            </div>
          )}

          {/* Mode Switcher */}
          {!capturedImage && (
            <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setMode("camera");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  mode === "camera"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Camera className="h-3.5 w-3.5" /> Cámara en Vivo
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("upload");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  mode === "upload"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Upload className="h-3.5 w-3.5" /> Subir Imagen
              </button>
            </div>
          )}

          {/* Capture / Preview Viewport */}
          <div className="relative aspect-4/3 w-full bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner">
            {capturedImage ? (
              /* Captured Image Preview */
              <div className="relative w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImage}
                  alt="Muestra de rostro capturado"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-4 border-emerald-500/80 pointer-events-none flex items-center justify-center">
                  <span className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                    Foto Lista para Indexar
                  </span>
                </div>
              </div>
            ) : mode === "camera" ? (
              /* Live Webcam */
              <div className="relative w-full h-full flex items-center justify-center">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
                {/* Oval Face Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-48 h-60 border-2 border-dashed border-accent rounded-[50%] shadow-[0_0_20px_rgba(249,115,22,0.4)] animate-pulse flex items-center justify-center" />
                  <p className="mt-3 text-[11px] text-white/90 font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    Centre el rostro dentro del óvalo
                  </p>
                </div>
              </div>
            ) : (
              /* File Upload Area */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-900/60 transition-colors"
              >
                <div className="p-4 bg-slate-800 text-accent rounded-full mb-3">
                  <Upload className="h-8 w-8" />
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  Haga clic para seleccionar una foto de su equipo
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Formatos soportados: JPG, PNG (máx. 5 MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-0.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Recomendaciones para mejor precisión:
            </div>
            Rostro despejado, buena iluminación frontal, sin gafas de sol ni accesorios que cubran ojos o boca.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div>
            {hasRegisteredFace && !capturedImage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeleteFace}
                disabled={loading}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar Rostro
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={loading}
              className="text-xs"
            >
              Cancelar
            </Button>

            {capturedImage ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCapturedImage(null)}
                  disabled={loading}
                  className="text-xs flex items-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Tomar Otra Foto
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveFace}
                  disabled={loading}
                  className="text-xs font-bold bg-accent hover:bg-accent/90 text-white flex items-center gap-1.5 shadow"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Guardando en AWS...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> Guardar y Registrar Rostro
                    </>
                  )}
                </Button>
              </>
            ) : mode === "camera" ? (
              <Button
                type="button"
                size="sm"
                onClick={handleCapture}
                className="text-xs font-bold bg-accent hover:bg-accent/90 text-white flex items-center gap-1.5 shadow"
              >
                <Camera className="h-3.5 w-3.5" />
                Capturar Foto
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold bg-accent hover:bg-accent/90 text-white flex items-center gap-1.5 shadow"
              >
                <Upload className="h-3.5 w-3.5" />
                Seleccionar Archivo
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
