import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Campaign as CampaignIcon } from '@mui/icons-material';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function AnnouncementsManagement({ userRole }) {
  const canPost = useMemo(() => {
    const r = (userRole || '').toString().toLowerCase();
    return r === 'admin' || r === 'superadmin' || r === 'super_admin';
  }, [userRole]);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Error loading announcements:', err);
        setErrorMsg(err?.message || 'Failed to load announcements');
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handlePublish = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!canPost) {
      setErrorMsg('Only admins can publish announcements.');
      return;
    }

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle) {
      setErrorMsg('Title is required.');
      return;
    }

    if (!cleanMessage) {
      setErrorMsg('Message is required.');
      return;
    }

    setPublishing(true);
    try {
      const currentUser = auth.currentUser;
      await addDoc(collection(db, 'announcements'), {
        title: cleanTitle,
        message: cleanMessage,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.uid || null,
        createdByName: currentUser?.email || 'Admin',
        createdByRole: userRole || 'admin',
      });

      setTitle('');
      setMessage('');
      setSuccessMsg('Announcement published.');
    } catch (err) {
      console.error('Error publishing announcement:', err);
      if (err?.code === 'permission-denied') {
        setErrorMsg('Permission denied. Your account is not allowed to publish announcements.');
      } else {
        setErrorMsg(err?.message || 'Failed to publish announcement');
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Announcements</Typography>
          <Typography variant="subtitle1">Publish campus updates to the mobile app</Typography>
        </Box>
        <Chip
          icon={<CampaignIcon />}
          label={`${announcements.length} Total`}
          variant="outlined"
        />
      </Box>

      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>Create Announcement</Typography>

        {!canPost && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You are signed in, but your role is not authorized to publish announcements.
          </Alert>
        )}

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>
        )}
        {successMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>
        )}

        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Class suspension update"
            inputProps={{ maxLength: 80 }}
            disabled={!canPost || publishing}
            fullWidth
          />
          <TextField
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write the announcement message..."
            disabled={!canPost || publishing}
            fullWidth
            multiline
            minRows={4}
            inputProps={{ maxLength: 1200 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={publishing ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
              onClick={handlePublish}
              disabled={!canPost || publishing}
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Recent Announcements</Typography>
          {loading && <CircularProgress size={18} />}
        </Box>
        <Divider sx={{ mb: 1.5 }} />

        {loading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : announcements.length === 0 ? (
          <Typography color="text.secondary">No announcements yet.</Typography>
        ) : (
          <List disablePadding>
            {announcements.map((a, idx) => (
              <React.Fragment key={a.id}>
                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Typography sx={{ fontWeight: 600 }}>{a.title || 'Untitled'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(a.createdAt)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {a.message || ''}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {a.createdByName && <Chip size="small" label={a.createdByName} variant="outlined" />}
                          {a.createdByRole && <Chip size="small" label={String(a.createdByRole)} />}
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {idx !== announcements.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
