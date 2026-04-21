import { PrismaClient } from '@prisma/client';
import { analyzeExcel } from '../services/analyzeExcel.js';
import defaultRules from '../../../shared/businessRules/defaultRules.json' assert { type: 'json' };

const prisma = new PrismaClient();

/**
 * Subir y procesar archivo Excel
 */
export async function uploadAndAnalyze(req, res) {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const file = req.files.file;
    const filename = file.name;

    // Validar extensión
    if (!filename.endsWith('.xlsx') && !filename.endsWith('.xls')) {
      return res.status(400).json({ error: 'Solo se aceptan archivos .xlsx o .xls' });
    }

    // Obtener reglas de la base de datos o usar default
    let businessRules = await prisma.businessRule.findMany({
      where: { enabled: true }
    });

    if (businessRules.length === 0) {
      businessRules = defaultRules;
    }

    // Analizar archivo
    const analysisResult = await analyzeExcel(file.data, businessRules);

    if (!analysisResult.success) {
      return res.status(400).json({ error: analysisResult.error });
    }

    // Guardar análisis en BD
    const analysis = await prisma.analysis.create({
      data: {
        userId: req.user.id,
        filename,
        totalRecords: analysisResult.records.length,
        summaryJson: JSON.stringify(analysisResult.summary),
        rulesUsedJson: JSON.stringify(businessRules.map(r => r.name))
      }
    });

    // Guardar registros procesados
    for (const record of analysisResult.records) {
      await prisma.processedRecord.create({
        data: {
          analysisId: analysis.id,
          rowData: JSON.stringify(record),
          employee: record.empleado,
          sector: record.sector,
          description: record.descripcion,
          category: record.categoria,
          severity: record.gravedad,
          suggestedAction: record.accionSugerida,
          notes: JSON.stringify(record.notas)
        }
      });
    }

    // Guardar conteo de incidencias
    for (const [empleado, data] of Object.entries(analysisResult.summary.employeeMeasures)) {
      await prisma.incidenceCount.create({
        data: {
          analysisId: analysis.id,
          employee: empleado,
          count: data.count,
          severity: data.severities.join(','),
          suggestedMeasure: data.medida
        }
      });
    }

    res.json({
      success: true,
      analysisId: analysis.id,
      analysis: {
        id: analysis.id,
        filename,
        totalRecords: analysisResult.records.length,
        summary: analysisResult.summary
      }
    });
  } catch (error) {
    console.error('Error en análisis:', error);
    res.status(500).json({ error: 'Error procesando archivo: ' + error.message });
  }
}

/**
 * Obtener resultado de análisis
 */
export async function getAnalysis(req, res) {
  try {
    const { id } = req.params;

    const analysis = await prisma.analysis.findUnique({
      where: { id: parseInt(id) },
      include: {
        processedRecords: true
      }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    // Verificar permisos
    if (analysis.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tiene permisos para ver este análisis' });
    }

    res.json({
      id: analysis.id,
      filename: analysis.filename,
      uploadDate: analysis.uploadDate,
      totalRecords: analysis.totalRecords,
      summary: JSON.parse(analysis.summaryJson),
      records: analysis.processedRecords.map(r => ({
        ...JSON.parse(r.rowData),
        id: r.id,
        notes: JSON.parse(r.notes)
      }))
    });
  } catch (error) {
    console.error('Error obteniendo análisis:', error);
    res.status(500).json({ error: 'Error obteniendo análisis' });
  }
}

/**
 * Obtener historial de análisis del usuario
 */
export async function getHistory(req, res) {
  try {
    const analyses = await prisma.analysis.findMany({
      where: { userId: req.user.id },
      orderBy: { uploadDate: 'desc' },
      take: 50
    });

    const historyData = analyses.map(a => ({
      id: a.id,
      filename: a.filename,
      uploadDate: a.uploadDate,
      totalRecords: a.totalRecords,
      summary: JSON.parse(a.summaryJson)
    }));

    res.json(historyData);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error obteniendo historial' });
  }
}
