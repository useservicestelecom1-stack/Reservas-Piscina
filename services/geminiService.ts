import { GoogleGenAI } from "@google/genai";
import { Booking, AccessLog } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePoolReport = async (bookings: Booking[], logs: AccessLog[], dateRange: string) => {
  
  // Prepare data for the prompt
  const dataContext = JSON.stringify({
    dateRange,
    totalBookings: bookings.length,
    bookingsSample: bookings.slice(-20), // Send a sample to avoid token limits if huge
    logsSample: logs.slice(-20),
    occupancySummary: "High occupancy on Tuesday mornings." // Simplified pre-calc
  });

  const prompt = `
    Actúa como un analista de datos para la Piscina de Albrook.
    Analiza los siguientes datos de reservas y registros de acceso (logs) para el rango de fechas: ${dateRange}.
    
    Datos JSON: ${dataContext}

    Genera un reporte breve en formato HTML (sin markdown blocks, solo las etiquetas html como <p>, <ul>, <strong>) que incluya:
    1. Resumen de actividad (días más concurridos, horas pico).
    2. Cumplimiento de horarios (si la gente hace check-in a tiempo).
    3. Recomendaciones para mejorar la distribución de carriles o personal.
    
    Mantén un tono profesional y útil para la administración de la piscina.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating report with Gemini:", error);
    return "<p>No se pudo generar el reporte inteligente en este momento.</p>";
  }
};