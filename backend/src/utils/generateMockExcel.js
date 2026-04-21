import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

/**
 * Script para generar un archivo Excel de ejemplo para pruebas
 */

const mockData = [
  {
    fecha: '2024-04-01',
    empleado: 'Juan García',
    sector: 'Logística',
    descripcion: 'Faltó mercadería en envío a cliente',
    tipo: 'Falta',
    observacion: 'Se debe verificar inventario',
    responsable: 'Pedro López'
  },
  {
    fecha: '2024-04-02',
    empleado: 'Ana Martínez',
    sector: 'Calidad',
    descripcion: 'Producto en mal estado detectado en QA',
    tipo: 'Reclamo',
    observacion: 'Producto devuelto a proveedor',
    responsable: 'Laura Sánchez'
  },
  {
    fecha: '2024-04-03',
    empleado: 'Luis Rodríguez',
    sector: 'Ventas',
    descripcion: 'Cliente reclamó demora en entrega',
    tipo: 'Reclamo',
    observacion: 'Se ofreció compensación',
    responsable: 'Pedro López'
  },
  {
    fecha: '2024-04-04',
    empleado: 'Juan García',
    sector: 'Logística',
    descripcion: 'Retraso en entrega de pedido',
    tipo: 'Demora',
    observacion: 'Se comunicó al cliente',
    responsable: 'Pedro López'
  },
  {
    fecha: '2024-04-05',
    empleado: 'María González',
    sector: 'Operaciones',
    descripcion: 'Incumplimiento interno de horarios',
    tipo: 'Observación',
    observacion: 'Se requiere capacitación',
    responsable: 'Carlos Mendez'
  },
  {
    fecha: '2024-04-06',
    empleado: 'Ana Martínez',
    sector: 'Calidad',
    descripcion: 'Problema de calidad en proceso',
    tipo: 'Incidencia',
    observacion: 'Se ajustaron parámetros',
    responsable: 'Laura Sánchez'
  },
  {
    fecha: '2024-04-07',
    empleado: 'Roberto Silva',
    sector: 'Inocuidad',
    descripcion: 'Producto defectuoso identificado',
    tipo: 'Reclamo',
    observacion: 'Se destruyó lote',
    responsable: 'Dr. Pérez'
  },
  {
    fecha: '2024-04-08',
    empleado: 'Juan García',
    sector: 'Logística',
    descripcion: 'Falta de mercadería nuevamente',
    tipo: 'Falta',
    observacion: 'Se investiga el patrón',
    responsable: 'Pedro López'
  },
  {
    fecha: '2024-04-09',
    empleado: 'Luis Rodríguez',
    sector: 'Ventas',
    descripcion: 'Segundo cliente reclamó por calidad',
    tipo: 'Reclamo',
    observacion: 'Patrón preocupante',
    responsable: 'Pedro López'
  },
  {
    fecha: '2024-04-10',
    empleado: 'Juan García',
    sector: 'Logística',
    descripcion: 'Tercera falta de mercadería',
    tipo: 'Falta',
    observacion: 'Medida correctiva necesaria',
    responsable: 'Pedro López'
  }
];

async function generateMockExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Análisis');

  // Agregar encabezados
  worksheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Empleado', key: 'empleado', width: 20 },
    { header: 'Sector', key: 'sector', width: 15 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Tipo', key: 'tipo', width: 15 },
    { header: 'Observación', key: 'observacion', width: 30 },
    { header: 'Responsable', key: 'responsable', width: 20 }
  ];

  // Estilizar encabezados
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '366092' }
  };

  // Agregar datos
  mockData.forEach(row => {
    worksheet.addRow(row);
  });

  // Autoajustar columnas
  worksheet.columns.forEach(column => {
    if (column.width) column.width = Math.max(column.width, 12);
  });

  // Guardar archivo
  const outputPath = path.join(process.cwd(), 'ejemplo_analisis.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log(`✅ Archivo de ejemplo generado: ${outputPath}`);
  return outputPath;
}

// Ejecutar
generateMockExcel().catch(err => {
  console.error('❌ Error generando archivo:', err);
  process.exit(1);
});
