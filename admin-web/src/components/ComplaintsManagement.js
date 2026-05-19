import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Snackbar
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import PrintComplaint from './PrintComplaint';
import { FormatListBulleted, SaveAlt } from '@mui/icons-material';
import { Grid } from '@mui/material';

function exportCSV(rows, cols, filename = 'complaints_export.csv') {
  if (!rows || rows.length === 0) return;
  const csvRows = [cols.join(',')].concat(rows.map(r => cols.map(c => `"${(r[c]||'').toString().replace(/"/g,'""')}"`).join(',')));
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export default function ComplaintsManagement({ userRole }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectionModel, setSelectionModel] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setComplaints(items);
      setLoading(false);
    }, (err) => {
      console.error('Complaints listener error', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const openDetails = (c) => {
    setSelected(c);
    setDialogOpen(true);
  };

  const closeDetails = () => {
    setDialogOpen(false);
    setSelected(null);
  };

  const handlePrint = (c) => {
    setSelected(c);
    setPrintOpen(true);
  };

  const closePrint = () => {
    setPrintOpen(false);
    setSelected(null);
  };

  const markResolved = async (c) => {
    try {
      await updateDoc(doc(db, 'complaints', c.id), { status: 'resolved', updatedAt: new Date() });
      setSnackbar({ open: true, message: 'Complaint marked resolved', severity: 'success' });
    } catch (e) {
      console.error('Mark resolved error', e);
      setSnackbar({ open: true, message: 'Failed to mark resolved', severity: 'error' });
    }
  };

  const removeComplaint = async (c) => {
    if (!window.confirm('Delete complaint permanently?')) return;
    try {
      await deleteDoc(doc(db, 'complaints', c.id));
      setSnackbar({ open: true, message: 'Complaint deleted', severity: 'success' });
    } catch (e) {
      console.error('Delete complaint error', e);
      setSnackbar({ open: true, message: 'Failed to delete', severity: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <FormatListBulleted />
          <Typography variant="h6">Complaints</Typography>
        </Box>
        <Chip label={loading ? 'Loading…' : `${complaints.length} items`} />
      </Box>

      <Paper sx={{ height: 600, width: '100%', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, p: 1 }}>
          <Button size="small" variant="outlined" startIcon={<SaveAlt />} onClick={() => exportCSV(complaints, ['id','title','status','department','authorName','createdAt'], 'complaints.csv')}>Export CSV</Button>
          <Button size="small" color="primary" variant="contained" disabled={selectionModel.length===0} onClick={async () => {
            for (const id of selectionModel) await updateDoc(doc(db,'complaints',id), { status: 'resolved', updatedAt: new Date() });
            setSelectionModel([]);
            setSnackbar({ open: true, message: 'Marked selected resolved', severity: 'success' });
          }}>Mark Resolved ({selectionModel.length})</Button>
        </Box>
        <DataGrid
          rows={complaints.map(c => ({ ...c, id: c.id, createdAt: c.createdAt }))}
          columns={[
            { field: 'title', headerName: 'Title', flex: 1, minWidth: 200 },
            { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <Chip label={p.value} size="small" /> },
            { field: 'department', headerName: 'Department', width: 140 },
            { field: 'authorName', headerName: 'Reporter', width: 160 },
            { field: 'createdAt', headerName: 'Date', width: 150, valueGetter: (p) => p.value?.toDate ? p.value.toDate().toLocaleString() : '' },
            { field: 'actions', headerName: 'Actions', width: 220, sortable: false, filterable: false, renderCell: (p) => (
              <Box>
                <Button size="small" onClick={() => openDetails(p.row)}>View</Button>
                <Button size="small" onClick={() => handlePrint(p.row)}>Print</Button>
                <Button size="small" color="success" onClick={() => markResolved(p.row)}>Resolve</Button>
                <Button size="small" color="error" onClick={() => removeComplaint(p.row)}>Delete</Button>
              </Box>
            ) }
          ]}
          loading={loading}
          checkboxSelection
          selectionModel={selectionModel}
          onSelectionModelChange={(newSel) => setSelectionModel(newSel)}
          pageSize={10}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDetails} maxWidth="md" fullWidth>
        <DialogTitle>Complaint Details</DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{selected.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{selected.anonymous ? 'Anonymous' : selected.authorName} • {selected.authorEmail || ''}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{selected.description}</Typography>
              {selected.witnesses && selected.witnesses.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Witnesses</Typography>
                  <ul>{selected.witnesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </Box>
              )}
              {selected.media && selected.media.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Attached Evidence</Typography>
                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    {selected.media.map((m, idx) => (
                      <Grid item key={idx} xs={6} md={3}>
                        <img src={m} alt={`evidence-${idx}`} style={{ width: '100%', borderRadius: 6 }} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetails}>Close</Button>
          <Button variant="contained" onClick={() => { if (selected) { handlePrint(selected); } }}>Print Evidence</Button>
        </DialogActions>
      </Dialog>

      <PrintComplaint complaint={selected} open={printOpen} onClose={closePrint} userRole={userRole} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
