import React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Grid
} from '@mui/material';
import { Print as PrintIcon, VerifiedUser as VerifiedUserIcon } from '@mui/icons-material';

// Utility: Generate a simple hash for authenticity (could be replaced with QR)
function generateHash(complaint) {
  const str = JSON.stringify(complaint) + (complaint.id || '');
  let hash = 0, i, chr;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase();
}

const PrintComplaint = ({ complaint, open, onClose, userRole }) => {
  const handlePrint = () => {
    const hash = generateHash(complaint);
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Complaint Evidence - ${complaint.id}</title>
          <style>
            @media print {
              @page { margin: 1in; size: letter; }
            }
            body { font-family: 'Arial', sans-serif; color: #222; max-width: 850px; margin: 0 auto; padding: 20px; }
            .watermark {
              position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 110px; color: rgba(200,0,0,0.07); z-index: -1; font-weight: bold; pointer-events: none;
              user-select: none;
            }
            .header { text-align: center; border-bottom: 4px solid #b71c1c; padding-bottom: 18px; margin-bottom: 30px; }
            .header h1 { color: #b71c1c; font-size: 30px; margin: 0; }
            .header .subtitle { color: #888; font-size: 15px; margin-top: 6px; }
            .section { margin-bottom: 28px; page-break-inside: avoid; }
            .section-title { font-size: 19px; font-weight: bold; color: #b71c1c; margin-bottom: 10px; border-left: 4px solid #b71c1c; padding-left: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .info-item { background: #fbe9e7; padding: 12px; border-radius: 4px; }
            .info-label { font-weight: bold; color: #b71c1c; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
            .info-value { color: #222; font-size: 14px; }
            .description-box { background: #fff3e0; padding: 15px; border-left: 4px solid #ff7043; border-radius: 4px; white-space: pre-wrap; }
            .media-section img { max-width: 100%; height: auto; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; page-break-inside: avoid; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #b71c1c; text-align: center; color: #b71c1c; font-size: 13px; }
            .signatory-section { margin-top: 40px; }
            .signatory-title { font-weight: bold; color: #b71c1c; margin-bottom: 8px; }
            .signatory-line { border-top: 1.5px solid #333; width: 320px; margin: 35px auto 10px; }
            .signatory-label { text-align: center; color: #555; font-size: 13px; }
            .audit-table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            .audit-table th, .audit-table td { border: 1px solid #b71c1c; padding: 6px 10px; font-size: 13px; }
            .audit-table th { background: #fbe9e7; color: #b71c1c; }
            .audit-table td { background: #fff; }
            .confidential-warning { color: #b71c1c; font-weight: bold; font-size: 15px; margin-bottom: 18px; text-align: center; }
            .hash { color: #888; font-size: 12px; text-align: right; margin-top: 10px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="watermark">CONFIDENTIAL</div>
          <div class="header">
            <h1>Official Complaint Evidence</h1>
            <div class="subtitle">For Administrative & Departmental Use Only</div>
            <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
          </div>
          <div class="confidential-warning">
            Unauthorized distribution is strictly prohibited. This document contains sensitive information.
          </div>
          <div class="section">
            <div class="section-title">Complaint Information</div>
            <div class="info-grid">
              <div class="info-item"><div class="info-label">Complaint ID</div><div class="info-value">${complaint.id}</div></div>
              <div class="info-item"><div class="info-label">Date Filed</div><div class="info-value">${complaint.createdAt ? new Date(complaint.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</div></div>
              <div class="info-item"><div class="info-label">Category</div><div class="info-value">${complaint.category || 'N/A'}</div></div>
              <div class="info-item"><div class="info-label">Department</div><div class="info-value">${complaint.department || 'N/A'}</div></div>
              <div class="info-item"><div class="info-label">Status</div><div class="info-value">${complaint.status ? complaint.status.replace(/_/g, ' ') : 'N/A'}</div></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Complainant Information</div>
            <div class="info-grid">
              <div class="info-item"><div class="info-label">Name</div><div class="info-value">${complaint.anonymous ? 'Anonymous' : (complaint.authorName || 'N/A')}</div></div>
              <div class="info-item"><div class="info-label">Email</div><div class="info-value">${complaint.anonymous ? 'Anonymous' : (complaint.authorEmail || 'N/A')}</div></div>
              <div class="info-item"><div class="info-label">Role</div><div class="info-value">${complaint.anonymous ? 'Anonymous' : (complaint.authorRole || 'N/A')}</div></div>
              <div class="info-item"><div class="info-label">Confidential</div><div class="info-value">${complaint.confidential ? 'Yes' : 'No'}</div></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Complaint Title</div>
            <div style="font-size: 18px; font-weight: bold; color: #333; margin-top: 10px;">${complaint.title || 'No title provided'}</div>
          </div>
          <div class="section">
            <div class="section-title">Detailed Description</div>
            <div class="description-box">${complaint.description || 'No description provided'}</div>
          </div>
          ${complaint.preferredOutcome ? `<div class="section"><div class="section-title">Preferred Outcome</div><div class="description-box">${complaint.preferredOutcome}</div></div>` : ''}
          ${complaint.witnesses && complaint.witnesses.length > 0 ? `<div class="section"><div class="section-title">Witnesses</div><ul>${complaint.witnesses.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
          ${complaint.media && complaint.media.length > 0 ? `<div class="section media-section"><div class="section-title">Attached Evidence (${complaint.media.length} ${complaint.media.length === 1 ? 'file' : 'files'})</div>${complaint.media.map((url, index) => `<div style="margin: 20px 0; page-break-inside: avoid;"><div style="font-weight: bold; margin-bottom: 10px;">Evidence ${index + 1}:</div><img src="${url}" alt="Evidence ${index + 1}" /></div>`).join('')}</div>` : ''}
          ${complaint.auditTrail && complaint.auditTrail.length > 0 ? `<div class="section"><div class="section-title">Audit Trail</div><table class="audit-table"><thead><tr><th>Date</th><th>Status</th><th>User</th><th>Remarks</th></tr></thead><tbody>${complaint.auditTrail.map(a => `<tr><td>${a.date ? new Date(a.date.seconds * 1000).toLocaleString() : ''}</td><td>${a.status}</td><td>${a.user || ''}</td><td>${a.remarks || ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
          <div class="signatory-section">
            <div class="signatory-title">Department Head Signatory</div>
            <div class="signatory-line"></div>
            <div class="signatory-label">Name & Signature</div>
            <div class="signatory-line" style="margin-top:30px;"></div>
            <div class="signatory-label">Date</div>
            <div class="signatory-line" style="margin-top:30px;"></div>
            <div class="signatory-label">Remarks</div>
          </div>
          <div class="footer">
            <p><strong>CONFIDENTIAL COMPLAINT DOCUMENT</strong></p>
            <p>This complaint is protected by institutional policy. Only authorized personnel may view or print this document.</p>
            <p>Document ID: ${complaint.id} | Hash: ${hash} | Generated: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
    onClose();
  };

  if (!complaint) return null;
  // Only allow print for admin, department head, president
  const allowedRoles = ['admin', 'department_head', 'president', 'superadmin', 'super_admin'];
  if (!allowedRoles.includes(userRole)) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <VerifiedUserIcon color="error" />
          <Typography variant="h6">Print Complaint Evidence</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="error" paragraph>
          This will generate a secure, confidential document for official complaint evidence. Only authorized personnel may print.
        </Typography>
        <Box sx={{ bgcolor: '#fbe9e7', p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Document will include:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Complaint ID and timestamps</li>
            <li>Complainant information (redacted if anonymous)</li>
            <li>Full description and details</li>
            <li>Preferred outcome, witnesses (if any)</li>
            <li>All attached media/evidence</li>
            <li>Audit trail (if available)</li>
            <li>Department head signatory fields</li>
            <li>Security hash for authenticity</li>
          </ul>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Complaint ID</Typography>
            <Typography variant="body2" fontWeight="bold">{complaint.id}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Status</Typography>
            <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
              {complaint.status?.replace(/_/g, ' ')}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Title</Typography>
            <Typography variant="body2">{complaint.title}</Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          startIcon={<PrintIcon />}
          color="error"
        >
          Print Complaint Evidence
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintComplaint;
