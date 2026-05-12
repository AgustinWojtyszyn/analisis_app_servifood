import React, { Fragment } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Typography,
  Button,
  Tabs,
  Tab,
  Tooltip,
  Collapse,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import CleaningServicesRoundedIcon from '@mui/icons-material/CleaningServicesRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

export function ResultsHeader({ filteredCount, totalCount, onReprocessExcel, onDeleteCurrent }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: 19, md: 21 } }}>Registros procesados ({filteredCount})</Typography>
      <Typography variant="body2" color="text.secondary">Mostrando {filteredCount} de {totalCount}</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25 }}>
        <Button variant="text" startIcon={<CleaningServicesRoundedIcon />} onClick={() => onReprocessExcel?.()} size="small">Reprocesar Excel</Button>
        <Button variant="text" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => onDeleteCurrent?.()} size="small">Eliminar análisis actual</Button>
      </Box>
    </Box>
  );
}

export function CategoryTabs({ activeCategory, onCategoryChange, categories, countsByCategory }) {
  return (
    <Tabs value={activeCategory} onChange={onCategoryChange} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ mb: 1.5, '.MuiTabs-indicator': { display: 'none' }, '.MuiTabs-flexContainer': { gap: 1 } }}>
      {categories.map((category) => (
        <Tab key={category.key} value={category.key} label={`${category.short} (${countsByCategory[category.key] || 0})`} sx={{ minHeight: 36, height: 36, borderRadius: 999, px: 1.5, py: 0.5, minWidth: 0, textTransform: 'none', fontWeight: 700 }} />
      ))}
    </Tabs>
  );
}

export function ResultsFilters({
  searchTerm,
  onSearchChange,
  filterArea,
  onFilterAreaChange,
  availableAreas,
  filterClassification,
  onFilterClassificationChange,
  categories,
  filterStatus,
  onFilterStatusChange
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 240px 240px 180px' }, gap: 1.25, mb: 1.5 }}>
      <TextField placeholder="Buscar..." value={searchTerm} onChange={onSearchChange} size="small" fullWidth />
      <TextField select label="Área/Sector" value={filterArea} onChange={onFilterAreaChange} size="small" fullWidth SelectProps={{ native: true }}>
        <option value="all">Todas</option>
        {availableAreas.map((area) => <option key={area} value={area}>{area}</option>)}
      </TextField>
      <TextField select label="Clasificación" value={filterClassification} onChange={onFilterClassificationChange} size="small" fullWidth SelectProps={{ native: true }}>
        <option value="all">Todas</option>
        {categories.filter((c) => c.key !== 'todos').map((c) => <option key={c.key} value={c.key}>{c.key}</option>)}
      </TextField>
      <TextField select label="Estado" value={filterStatus} onChange={onFilterStatusChange} size="small" fullWidth SelectProps={{ native: true }}>
        <option value="all">Todos</option>
        <option value="abierto">Abierto</option>
        <option value="cerrado">Cerrado</option>
      </TextField>
    </Box>
  );
}

export function AdvancedSection({ exportMode, onExportModeChange, handleExportExcel, recordsForExportLength, activeExportLabel, handleShareWhatsApp, excelIcon, whatsappIcon }) {
  return (
    <Accordion sx={{ mb: 1.5, backgroundColor: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.22)' }}>
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Sección avanzada</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px 1fr 1fr' }, gap: 1.25 }}>
          <TextField select label="Exportación" value={exportMode} onChange={onExportModeChange} size="small" fullWidth SelectProps={{ native: true }}>
            <option value="all">Exportar todos</option>
            <option value="filtered">Exportar vista filtrada</option>
          </TextField>
          <Button variant="contained" onClick={handleExportExcel} disabled={recordsForExportLength === 0} size="small" sx={{ backgroundColor: '#1d6f42', color: '#fff' }}>
            <img src={excelIcon} alt="" width={16} height={16} style={{ marginRight: 8 }} />
            {activeExportLabel}
          </Button>
          <Button variant="contained" onClick={handleShareWhatsApp} size="small" sx={{ backgroundColor: '#25d366', color: '#fff' }}>
            <img src={whatsappIcon} alt="" width={16} height={16} style={{ marginRight: 8 }} />
            Exportar por WhatsApp
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

export function ResultsTable({
  tableContainerRef,
  displayedRecords,
  page,
  expandedRows,
  onToggleRow,
  normalizeCellValue,
  normalizeClassification,
  normalizeTipo,
  normalizeEstado,
  normalizeIsoForExport,
  categoryColors,
  typeColors
}) {
  return (
    <TableContainer ref={tableContainerRef} sx={{ overflowX: 'auto', backgroundColor: 'transparent', width: '100%' }}>
      <Table sx={{ minWidth: 1500 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, width: 52 }} />
            <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
            <TableCell sx={{ fontWeight: 700, minWidth: 300 }}>Desvío detectado</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Área/Sector</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Clasificación</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
            <TableCell sx={{ fontWeight: 700, minWidth: 170 }}>Relación ISO 22000</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
            <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>Acción inmediata</TableCell>
            <TableCell sx={{ fontWeight: 700, minWidth: 300 }}>Acción correctiva</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayedRecords.map((record, index) => {
            const rowKey = `${page}-${index}-${normalizeCellValue(record.fecha)}-${normalizeCellValue(record.hallazgoDetectado).slice(0, 20)}`;
            const isExpanded = Boolean(expandedRows[rowKey]);
            const fullHallazgo = normalizeCellValue(record.desvioDetectado || record.hallazgoDetectado);
            const clasificacion = normalizeClassification(record);
            const tipo = normalizeTipo(record);
            const estado = normalizeEstado(record);

            return (
              <Fragment key={rowKey}>
                <TableRow hover>
                  <TableCell>
                    <IconButton size="small" onClick={() => onToggleRow(rowKey)} aria-label="ver detalle">
                      {isExpanded ? <KeyboardArrowUpRoundedIcon fontSize="small" /> : <KeyboardArrowDownRoundedIcon fontSize="small" />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{normalizeCellValue(record.fecha)}</TableCell>
                  <TableCell>
                    <Tooltip title={fullHallazgo || '-'} arrow placement="top-start">
                      <Typography variant="body2" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{fullHallazgo || '-'}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{normalizeCellValue(record.areaSector || record.areaClasificada) || '-'}</TableCell>
                  <TableCell><Chip size="small" label={clasificacion} sx={{ backgroundColor: (categoryColors[clasificacion] || categoryColors.Calidad).bg, color: (categoryColors[clasificacion] || categoryColors.Calidad).text }} /></TableCell>
                  <TableCell><Chip size="small" label={tipo} sx={{ backgroundColor: (typeColors[tipo] || typeColors.Interno).bg, color: (typeColors[tipo] || typeColors.Interno).text }} /></TableCell>
                  <TableCell>{normalizeIsoForExport(record.relacionIso22000 || record.iso22000) || '-'}</TableCell>
                  <TableCell><Chip size="small" label={estado} /></TableCell>
                  <TableCell>{normalizeCellValue(record.immediate_action || record.accionInmediata) || '-'}</TableCell>
                  <TableCell>{normalizeCellValue(record.corrective_action || record.accionCorrectiva) || '-'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ px: 2, py: 1.5, backgroundColor: 'rgba(148,163,184,0.08)', borderRadius: 1, mb: 1.25 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Detalle del registro</Typography>
                        <Typography variant="body2">Área / Proceso original: {normalizeCellValue(record.areaProceso) || '-'}</Typography>
                        <Typography variant="body2">Actividad realizada original: {normalizeCellValue(record.actividadRealizada) || '-'}</Typography>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
