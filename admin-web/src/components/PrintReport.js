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
import { Print as PrintIcon } from '@mui/icons-material';

const PrintReport = ({ report, open, onClose }) => {
  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Report Evidence - ${report.id}</title>
          <style>
            @media print {
              @page {
                margin: 1in;
                size: letter;
              }
            }
            
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            
            .header {
              text-align: center;
              border-bottom: 3px solid #1976d2;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            
            .header h1 {
              margin: 0;
              color: #1976d2;
              font-size: 28px;
            }
            
            .header .subtitle {
              color: #666;
              font-size: 14px;
              margin-top: 5px;
            }
            
            .section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #1976d2;
              margin-bottom: 10px;
              border-left: 4px solid #1976d2;
              padding-left: 10px;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            
            .info-item {
              background: #f5f5f5;
              padding: 12px;
              border-radius: 4px;
            }
            
            .info-label {
              font-weight: bold;
              color: #555;
              font-size: 12px;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            
            .info-value {
              color: #333;
              font-size: 14px;
            }
            
            .description-box {
              background: #f9f9f9;
              padding: 15px;
              border-left: 4px solid #ff9800;
              border-radius: 4px;
              white-space: pre-wrap;
            }
            
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            
            .status-pending { background: #fff3cd; color: #856404; }
            .status-under_review { background: #cce5ff; color: #004085; }
            .status-in_progress { background: #d1ecf1; color: #0c5460; }
            .status-resolved { background: #d4edda; color: #155724; }
            .status-rejected { background: #f8d7da; color: #721c24; }
            .status-approved { background: #d4edda; color: #155724; }
            
            .priority-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            
            .priority-critical { background: #dc3545; color: white; }
            .priority-high { background: #ff9800; color: white; }
            .priority-medium { background: #ffc107; color: #333; }
            .priority-low { background: #28a745; color: white; }
            
            .media-section img {
              max-width: 100%;
              height: auto;
              margin: 10px 0;
              border: 1px solid #ddd;
              border-radius: 4px;
              page-break-inside: avoid;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            
            .signature-section {
              margin-top: 50px;
              page-break-inside: avoid;
            }
            
            .signature-line {
              border-top: 1px solid #333;
              width: 300px;
              margin: 40px auto 10px;
            }
            
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 120px;
              color: rgba(0, 0, 0, 0.05);
              z-index: -1;
              font-weight: bold;
            }
            
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="watermark">EVIDENCE</div>
          
          <div class="header">
            <h1>Official Report Evidence</h1>
            <div class="subtitle">Due Process Documentation</div>
            <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Report Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Report ID</div>
                <div class="info-value">${report.id}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date Filed</div>
                <div class="info-value">${report.createdAt ? new Date(report.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Category</div>
                <div class="info-value" style="text-transform: capitalize;">${report.category || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Department</div>
                <div class="info-value">${report.department || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Priority</div>
                <div class="info-value">
                  <span class="priority-badge priority-${report.priority}">${report.priority || 'N/A'}</span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">
                  <span class="status-badge status-${report.status}">${report.status ? report.status.replace(/_/g, ' ') : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Reporter Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Name</div>
                <div class="info-value">${report.anonymous ? 'Anonymous' : (report.authorName || 'N/A')}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${report.anonymous ? 'Anonymous' : (report.authorEmail || 'N/A')}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Role</div>
                <div class="info-value" style="text-transform: capitalize;">${report.anonymous ? 'Anonymous' : (report.authorRole || 'N/A')}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Report Type</div>
                <div class="info-value">${report.anonymous ? 'Anonymous Report' : 'Public Report'}</div>
              </div>
            </div>
          </div>
          
          ${report.location ? `
          <div class="section">
            <div class="section-title">Location Details</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Building</div>
                <div class="info-value">${report.location.building || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Room</div>
                <div class="info-value">${report.location.room || 'N/A'}</div>
              </div>
            </div>
          </div>
          ` : ''}
          
          <div class="section">
            <div class="section-title">Report Title</div>
            <div style="font-size: 18px; font-weight: bold; color: #333; margin-top: 10px;">
              ${report.title || 'No title provided'}
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Detailed Description</div>
            <div class="description-box">
              ${report.description || 'No description provided'}
            </div>
          </div>
          
          ${report.media && report.media.length > 0 ? `
          <div class="section media-section">
            <div class="section-title">Attached Evidence (${report.media.length} ${report.media.length === 1 ? 'file' : 'files'})</div>
            ${report.media.map((url, index) => `
              <div style="margin: 20px 0; page-break-inside: avoid;">
                <div style="font-weight: bold; margin-bottom: 10px;">Evidence ${index + 1}:</div>
                <img src="${url}" alt="Evidence ${index + 1}" />
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${report.assignedTo ? `
          <div class="section">
            <div class="section-title">Assignment Information</div>
            <div class="info-item">
              <div class="info-label">Assigned To</div>
              <div class="info-value">${report.assignedTo}</div>
            </div>
          </div>
          ` : ''}
          
          <div class="signature-section">
            <p style="text-align: center; color: #666; margin-bottom: 50px;">
              This document serves as official evidence for due process proceedings.
            </p>
            <div class="signature-line"></div>
            <p style="text-align: center; color: #666;">Authorized Signature</p>
            <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
              Date: _____________________
            </p>
          </div>
          
          <div class="footer">
            <p><strong>CONFIDENTIAL DOCUMENT</strong></p>
            <p>This report contains confidential information and should be handled according to institutional policies.</p>
            <p>Document ID: ${report.id} | Generated: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for images to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
    
    onClose();
  };

  if (!report) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PrintIcon />
          <Typography variant="h6">Print Report as Evidence</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          This will generate a formatted document suitable for due process proceedings and evidence documentation.
        </Typography>
        
        <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Document will include:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Report ID and timestamps</li>
            <li>Reporter information {report.anonymous && '(Anonymous)'}</li>
            <li>Full description and details</li>
            <li>All attached media/evidence</li>
            <li>Current status and priority</li>
            <li>Signature section for authorization</li>
          </ul>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Report ID</Typography>
            <Typography variant="body2" fontWeight="bold">{report.id}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Status</Typography>
            <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
              {report.status?.replace(/_/g, ' ')}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Title</Typography>
            <Typography variant="body2">{report.title}</Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handlePrint} 
          variant="contained" 
          startIcon={<PrintIcon />}
          color="primary"
        >
          Print Evidence
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintReport;
