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
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { rulesService } from '../services/api';

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
    suggestedAction: 'seguimiento'
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await rulesService.getRules();
      setRules(response.data);
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
        name: rule.name,
        keywords: typeof rule.keywords === 'string' ? rule.keywords : JSON.stringify(rule.keywords).slice(1, -1).replaceAll(',', ', '),
        category: rule.category,
        severity: rule.severity,
        suggestedAction: rule.suggestedAction
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        keywords: '',
        category: '',
        severity: 'media',
        suggestedAction: 'seguimiento'
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
        .map(k => k.trim())
        .filter(k => k);

      const ruleData = {
        ...formData,
        keywords: keywordArray
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
    return <CircularProgress />;
  }

  return (
    <Box>
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
            <TableRow sx={{ backgroundColor: '#2c2c2c' }}>
              <TableCell sx={{ fontWeight: 600 }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Categoría</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Gravedad</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Palabras Clave</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id} hover>
                <TableCell>{rule.name}</TableCell>
                <TableCell>{rule.category}</TableCell>
                <TableCell>
                  <Chip label={rule.severity} size="small" />
                </TableCell>
                <TableCell>
                  {typeof rule.keywords === 'string' ? (
                    <span>{rule.keywords.slice(0, 50)}...</span>
                  ) : (
                    <span>{JSON.stringify(rule.keywords).slice(0, 50)}...</span>
                  )}
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

      {/* Dialog para crear/editar */}
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
            select
            label="Acción Sugerida"
            value={formData.suggestedAction}
            onChange={(e) => setFormData({ ...formData, suggestedAction: e.target.value })}
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="aviso">Aviso</option>
            <option value="seguimiento">Seguimiento</option>
            <option value="medida_correctiva">Medida Correctiva</option>
          </TextField>
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
