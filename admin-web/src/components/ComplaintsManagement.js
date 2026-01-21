import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Snackbar
} from '@mui/material';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import PrintComplaint from './PrintComplaint';
import { FormatListBulleted, Delete, CheckCircle } from '@mui/icons-material';

export default function ComplaintsManagement({ userRole }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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

      <Grid container spacing={2}>
        {complaints.map((c) => (
          <Grid item xs={12} md={6} key={c.id}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{c.title || 'No title'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.anonymous ? 'Anonymous' : (c.authorName || 'Unknown')} • {c.department || ''}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>{c.description?.slice(0, 160)}{c.description && c.description.length > 160 ? '…' : ''}</Typography>
                  {c.preferredOutcome && (
                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>Preferred: {c.preferredOutcome}</Typography>
                  )}
                </Box>

                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                  <Chip label={c.status || 'submitted'} size="small" />
                  <Box>
                    <Button size="small" onClick={() => openDetails(c)}>View</Button>
                    <Button size="small" onClick={() => handlePrint(c)}>Print</Button>
                    <Button size="small" color="success" onClick={() => markResolved(c)} startIcon={<CheckCircle />}>Resolve</Button>
                    <Button size="small" color="error" onClick={() => removeComplaint(c)} startIcon={<Delete />}>Delete</Button>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

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
