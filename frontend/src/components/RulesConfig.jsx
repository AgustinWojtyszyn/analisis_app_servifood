import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { rulesService } from '../services/api';

function keywordsToString(keywords) {
  if (Array.isArray(keywords)) return keywords.join(', ');
  if (typeof keywords === 'string') return keywords;
  return '';
}

export default function RulesConfig() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    keywords: '',
    category: '',
    severity: 'media',
    origen: 'interno',
    accion_inmediata: 'aviso',
    accion_correctiva: '',
    peso: 1
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await rulesService.getRules();
      setRules(response.data || []);
    } catch (err) {
      setError('Error cargando reglas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name || rule.nombre || '',
        keywords: keywordsToString(rule.keywords),
        category: rule.category || rule.categoria || '',
        severity: rule.severity || rule.gravedad || 'media',
        origen: rule.origen || 'interno',
        accion_inmediata: rule.accion_inmediata || rule.suggestedAction || 'aviso',
        accion_correctiva: rule.accion_correctiva || '',
        peso: Number(rule.peso) || 1
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        keywords: '',
        category: '',
        severity: 'media',
        origen: 'interno',
        accion_inmediata: 'aviso',
        accion_correctiva: '',
        peso: 1
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRule(null);
  };

  const handleSaveRule = async () => {
    try {
      const keywordArray = formData.keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k);

      const ruleData = {
        name: formData.name,
        keywords: keywordArray,
        category: formData.category,
        severity: formData.severity,
        origen: formData.origen,
        accion_inmediata: formData.accion_inmediata,
        accion_correctiva: formData.accion_correctiva,
        peso: Number(formData.peso) || 1,
        suggestedAction: formData.accion_inmediata
      };

      if (editingRule) {
        await rulesService.updateRule(editingRule.id, ruleData);
      } else {
        await rulesService.createRule(ruleData);
      }

      handleCloseDialog();
      loadRules();
    } catch (err) {
      alert('Error guardando regla: ' + err.message);
    }
  };

  const handleDeleteRule = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar esta regla?')) {
      try {
        await rulesService.deleteRule(id);
        loadRules();
      } catch (err) {
        alert('Error eliminando regla');
      }
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
        Reglas de Clasificación
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Button
        variant="contained"
        onClick={() => handleOpenDialog()}
        sx={{ mb: 2 }}
      >
        Nueva Regla
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Categoría</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Origen</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Gravedad</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Peso</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Acción inmediata</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Acción correctiva</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Palabras Clave</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id} hover>
                <TableCell>{rule.name || rule.nombre}</TableCell>
                <TableCell>{rule.category || rule.categoria}</TableCell>
                <TableCell>
                  <Chip label={rule.origen || 'interno'} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={rule.severity || rule.gravedad} size="small" />
                </TableCell>
                <TableCell>{rule.peso || 1}</TableCell>
                <TableCell sx={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {rule.accion_inmediata || rule.suggestedAction || 'Registrar incidencia y notificar'}
                </TableCell>
                <TableCell sx={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {rule.accion_correctiva || 'Definir mejora y seguimiento'}
                </TableCell>
                <TableCell sx={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {keywordsToString(rule.keywords)}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(rule)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteRule(rule.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRule ? 'Editar Regla' : 'Nueva Regla'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Nombre de la Regla"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Palabras Clave (separadas por comas)"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label="Categoría"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            select
            label="Origen"
            value={formData.origen}
            onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="interno">interno</option>
            <option value="externo">externo</option>
          </TextField>
          <TextField
            fullWidth
            select
            label="Gravedad"
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </TextField>
          <TextField
            fullWidth
            type="number"
            inputProps={{ min: 1, max: 3, step: 1 }}
            label="Peso (1-3)"
            value={formData.peso}
            onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Acción inmediata"
            value={formData.accion_inmediata}
            onChange={(e) => setFormData({ ...formData, accion_inmediata: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Acción correctiva"
            value={formData.accion_correctiva}
            onChange={(e) => setFormData({ ...formData, accion_correctiva: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSaveRule} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
