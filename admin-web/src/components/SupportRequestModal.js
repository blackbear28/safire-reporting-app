import React, { useState, useCallback } from 'react';
import { Box, Button, Typography, Modal, Stack } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import EmailIcon from '@mui/icons-material/Email';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';

export default function SupportRequestModal({ open, onClose }) {
  const handleChat = useCallback(() => {
    // Navigate to MessagesManagement or open chat system
    window.location.hash = '#/messages';
    onClose();
  }, [onClose]);

  const handleEmail = useCallback(() => {
    window.open('mailto:cjcguidance@g.cjc.edu.ph?subject=Support%20Request', '_blank');
    onClose();
  }, [onClose]);

  const handleCall = useCallback(() => {
    window.open('tel:+639123456789', '_blank');
    onClose();
  }, [onClose]);

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="support-modal-title" aria-describedby="support-modal-desc">
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        bgcolor: 'background.paper',
        boxShadow: 24,
        borderRadius: 2,
        p: 4,
        minWidth: 320,
        maxWidth: 400,
      }}>
        <Typography id="support-modal-title" variant="h6" mb={2}>
          Request Support
        </Typography>
        <Typography id="support-modal-desc" mb={3}>
          We’re here to help. How would you like to reach out?
        </Typography>
        <Stack spacing={2}>
          <Button variant="contained" startIcon={<ChatIcon />} onClick={handleChat} fullWidth>
            Chat with Guidance Counselor
          </Button>
          <Button variant="outlined" startIcon={<EmailIcon />} onClick={handleEmail} fullWidth>
            Send Email
          </Button>
          <Button variant="outlined" startIcon={<LocalPhoneIcon />} onClick={handleCall} fullWidth>
            Call Hotline
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}
