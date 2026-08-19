const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function fetchApi<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("jeroky_token") : null;
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Error al realizar la petición");
  }

  // Handle empty or text responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return null as unknown as Promise<T>;
}

export async function ensureAuth() {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("jeroky_token");
  if (!token) {
    window.location.href = "/login";
  }
}

export enum EvaluationStage {
  ETAPA_1 = '1ª Etapa',
  ETAPA_2 = '2ª Etapa',
  EXAMEN_FINAL = 'Examen Final',
  RECUPERATORIO = 'Recuperatorio',
}

export interface IAcademicPeriod {
  id: string;
  year: number;
  name: EvaluationStage | string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  createdAt: string | Date;
  updatedAt: string | Date;
}

export async function getAcademicYears(): Promise<number[]> {
  return fetchApi<number[]>('/academic-periods/years');
}

export async function getAcademicPeriods(
  year?: number,
  name?: EvaluationStage | string,
): Promise<IAcademicPeriod[]> {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (name) params.append('name', name);
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchApi<IAcademicPeriod[]>(`/academic-periods${query}`);
}

export async function getAcademicPeriod(id: string): Promise<IAcademicPeriod> {
  return fetchApi<IAcademicPeriod>(`/academic-periods/${id}`);
}

export async function createAcademicPeriod(data: {
  year: number;
  name: EvaluationStage | string;
  startDate: string;
  endDate: string;
}): Promise<IAcademicPeriod> {
  return fetchApi<IAcademicPeriod>('/academic-periods', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAcademicPeriod(
  id: string,
  data: { name?: string; startDate?: string; endDate?: string },
): Promise<IAcademicPeriod> {
  return fetchApi<IAcademicPeriod>(`/academic-periods/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAcademicPeriod(
  id: string,
): Promise<{ message: string }> {
  return fetchApi<{ message: string }>(`/academic-periods/${id}`, {
    method: 'DELETE',
  });
}

export async function seedAcademicPeriods(
  year: number,
): Promise<IAcademicPeriod[]> {
  return fetchApi<IAcademicPeriod[]>(`/academic-periods/seed/${year}`, {
    method: 'POST',
  });
}

export interface IGrade {
  id: string;
  studentId: string;
  courseId: string;
  techniqueScore: number;
  expressionScore: number;
  disciplineScore: number;
  average: number;
  stage: EvaluationStage | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    dni?: string;
  };
  course?: {
    id: string;
    name: string;
    level: string;
    year?: number;
  };
}

export interface IGradeUploadItem {
  studentId: string;
  courseId?: string;
  techniqueScore: number;
  expressionScore: number;
  disciplineScore: number;
  stage?: EvaluationStage | string;
}

export async function getGradesByCourse(
  courseId: string,
  stage?: string,
): Promise<IGrade[]> {
  const query = stage ? `?stage=${encodeURIComponent(stage)}` : '';
  return fetchApi<IGrade[]>(`/grades/course/${courseId}${query}`);
}

export async function saveGradesBatch(
  grades: IGradeUploadItem[],
  courseId?: string,
  stage?: EvaluationStage | string,
): Promise<IGrade[]> {
  return fetchApi<IGrade[]>('/grades/batch', {
    method: 'POST',
    body: JSON.stringify({ grades, courseId, stage }),
  });
}

export async function getStudentGrades(studentId: string): Promise<IGrade[]> {
  return fetchApi<IGrade[]>(`/grades/student/${studentId}`);
}

export interface ICourse {
  id: string;
  name: string;
  level: string;
  year?: number;
}

export interface IStudentReport {
  studentId: string;
  studentName: string;
  totalCheckins: number;
  entradas: number;
  salidas: number;
  percentage: number;
  classesHeld?: number;
  classesScheduled?: number;
  regularity?: 'REGULAR' | 'EN ALERTA' | 'IRREGULAR';
  presentCount?: number;
  absentCount?: number;
  status?: string;
}

export interface IDailyAttendanceItem {
  studentId: string;
  studentName: string;
  ci: string;
  isPresent: boolean;
  attendanceId: string | null;
  timestamp: string | null;
  type: 'Entrada' | 'Salida' | null;
  method: string | null;
}

export async function getCourses(): Promise<ICourse[]> {
  return fetchApi<ICourse[]>('/courses');
}

export async function getAttendanceReports(
  courseId: string,
  period?: string,
  year?: number,
): Promise<IStudentReport[]> {
  const params = new URLSearchParams({ courseId });
  if (period) params.append('period', period);
  if (year) params.append('year', year.toString());
  return fetchApi<IStudentReport[]>(`/attendance/reports?${params.toString()}`);
}

export async function registerManualAttendance(
  studentId: string,
  courseId: string,
  type: 'Entrada' | 'Salida',
  timestamp?: string,
): Promise<void> {
  return fetchApi('/attendance/manual', {
    method: 'POST',
    body: JSON.stringify({ studentId, courseId, type, timestamp }),
  });
}

export async function registerDocumentAttendance(
  ci: string,
  type?: 'Entrada' | 'Salida',
  courseId?: string,
): Promise<{
  success: boolean;
  message: string;
  studentName: string;
  courseName?: string;
  courseId: string | null;
  timestamp: string;
  type: 'Entrada' | 'Salida';
}> {
  return fetchApi('/attendance/document', {
    method: 'POST',
    body: JSON.stringify({ ci, type, courseId }),
  });
}

export async function getAttendancesByDate(
  courseId: string,
  date: string,
): Promise<IDailyAttendanceItem[]> {
  const params = new URLSearchParams({ courseId, date });
  return fetchApi<IDailyAttendanceItem[]>(`/attendance/by-date?${params.toString()}`);
}

export async function deleteAttendance(id: string): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>(`/attendance/${id}`, {
    method: 'DELETE',
  });
}



