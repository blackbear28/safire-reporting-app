import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress } from '@mui/material';
import { collection, getDocs, getFirestore, query, orderBy } from 'firebase/firestore';

export default function AppointmentsManagement() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const db = getFirestore();
        const q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        setAppointments([]);
      }
      setLoading(false);
    };
    fetchAppointments();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Appointment Requests
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Requested At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {appointments.map((appt) => (
                <TableRow key={appt.id}>
                  <TableCell>{appt.name}</TableCell>
                  <TableCell>{appt.email}</TableCell>
                  <TableCell>{appt.reason}</TableCell>
                  <TableCell>
                    <Chip label={appt.status || 'pending'} color={appt.status === 'approved' ? 'success' : appt.status === 'rejected' ? 'error' : 'warning'} size="small" />
                  </TableCell>
                  <TableCell>{appt.createdAt?.toDate ? appt.createdAt.toDate().toLocaleString() : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
