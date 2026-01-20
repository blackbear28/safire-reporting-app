import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Grid,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Assignment,
  Description,
  Business,
  AccountBalance,
  Verified,
  Warning,
  Info,
  AttachFile,
  Visibility
} from '@mui/icons-material';
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const APPEAL_STATUS = {
  SUBMITTED: 'submitted',
  UNDER_ADMIN_REVIEW: 'under_admin_review',
  DOCUMENTED: 'documented',
  WITH_DEPARTMENT: 'with_department',
  WITH_PRESIDENT: 'with_president',
  APPROVED: 'approved',
  DISAPPROVED: 'disapproved',
  COMPLETED: 'completed'
};

const STATUS_LABELS = {
  [APPEAL_STATUS.SUBMITTED]: 'Submitted',
  [APPEAL_STATUS.UNDER_ADMIN_REVIEW]: 'Under Admin Review',
  [APPEAL_STATUS.DOCUMENTED]: 'Documented',
  [APPEAL_STATUS.WITH_DEPARTMENT]: 'With Department Head',
  [APPEAL_STATUS.WITH_PRESIDENT]: 'With President',
  [APPEAL_STATUS.APPROVED]: 'Approved',
  [APPEAL_STATUS.DISAPPROVED]: 'Disapproved',
  [APPEAL_STATUS.COMPLETED]: 'Completed'
};

const ISO_STEPS = [
  { label: 'Submission', description: 'Appeal submitted by user', icon: <Assignment /> },
  { label: 'Admin Review', description: 'Planning Officer reviews appeal', icon: <HourglassEmpty /> },
  { label: 'Documentation', description: 'Document Officer records details', icon: <Description /> },
  { label: 'Forward to Department', description: 'Sent to department head', icon: <Business /> },
  { label: 'Department Review', description: 'Department head proposes action', icon: <Business /> },
  { label: 'President Review', description: 'President makes final decision', icon: <AccountBalance /> },
  { label: 'Decision', description: 'Approved or Disapproved', icon: <Verified /> },
  { label: 'Completion', description: 'Process completed', icon: <CheckCircle /> }
];

export default function AppealsManagement({ currentUser }) {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: null });
  const [actionNote, setActionNote] = useState('');
  const [departmentProposal, setDepartmentProposal] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'appeals'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appealsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAppeals(appealsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching appeals:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case APPEAL_STATUS.SUBMITTED:
        return 'info';
      case APPEAL_STATUS.UNDER_ADMIN_REVIEW:
        return 'warning';
      case APPEAL_STATUS.DOCUMENTED:
        return 'primary';
      case APPEAL_STATUS.WITH_DEPARTMENT:
      case APPEAL_STATUS.WITH_PRESIDENT:
        return 'secondary';
      case APPEAL_STATUS.APPROVED:
        return 'success';
      case APPEAL_STATUS.DISAPPROVED:
        return 'error';
      case APPEAL_STATUS.COMPLETED:
        return 'default';
      default:
        return 'default';
    }
  };

  const getActiveStep = (status) => {
    const statusStepMap = {
      [APPEAL_STATUS.SUBMITTED]: 0,
      [APPEAL_STATUS.UNDER_ADMIN_REVIEW]: 1,
      [APPEAL_STATUS.DOCUMENTED]: 2,
      [APPEAL_STATUS.WITH_DEPARTMENT]: 3,
      [APPEAL_STATUS.WITH_PRESIDENT]: 5,
      [APPEAL_STATUS.APPROVED]: 6,
      [APPEAL_STATUS.DISAPPROVED]: 6,
      [APPEAL_STATUS.COMPLETED]: 7
    };
    return statusStepMap[status] || 0;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const calculateTimeRemaining = (deadline) => {
    if (!deadline) return null;
    const deadlineDate = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const now = new Date();
    const diff = deadlineDate - now;
    
    if (diff < 0) return { overdue: true, text: 'OVERDUE' };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return { overdue: false, text: `${days} day(s) remaining` };
    return { overdue: false, text: `${hours} hour(s) remaining` };
  };

  const handleAction = async (type) => {
    setProcessing(true);
    try {
      const appealRef = doc(db, 'appeals', selectedAppeal.id);
      const now = new Date();

      switch (type) {
        case 'admin_review':
          await updateDoc(appealRef, {
            status: APPEAL_STATUS.UNDER_ADMIN_REVIEW,
            currentStage: 2,
            'timeline.adminReviewStarted': now,
            'stages.1.completedAt': now,
            'stages.1.completedBy': currentUser?.email || 'admin',
            'stages.1.notes': actionNote,
            'stages.2.status': 'in_progress',
            'stages.2.startedAt': now
          });
          break;

        case 'document':
          await updateDoc(appealRef, {
            status: APPEAL_STATUS.DOCUMENTED,
            currentStage: 3,
            'timeline.documentedAt': now,
            'stages.2.completedAt': now,
            'stages.2.completedBy': currentUser?.email || 'admin',
            'stages.2.notes': actionNote,
            'stages.3.status': 'pending',
            'stages.3.startedAt': now
          });
          break;

        case 'forward_department':
          await updateDoc(appealRef, {
            status: APPEAL_STATUS.WITH_DEPARTMENT,
            currentStage: 4,
            'timeline.forwardedToDepartment': now,
            'stages.3.completedAt': now,
            'stages.3.completedBy': currentUser?.email || 'admin',
            'stages.4.status': 'in_progress',
            'stages.4.startedAt': now,
            'stages.4.assignedTo': 'department_head'
          });
          break;

        case 'department_proposal':
          await updateDoc(appealRef, {
            status: APPEAL_STATUS.WITH_PRESIDENT,
            currentStage: 6,
            'timeline.departmentProposalSubmitted': now,
            'stages.4.completedAt': now,
            'stages.4.completedBy': currentUser?.email || 'dept_head',
            'stages.4.proposal': departmentProposal,
            'stages.5.status': 'pending',
            'stages.6.status': 'in_progress',
            'stages.6.startedAt': now,
            'stages.6.assignedTo': 'president'
          });
          break;

        case 'approve':
          await updateDoc(appealRef, {
            status: APPEAL_STATUS.APPROVED,
            currentStage: 7,
            finalDecision: 'approved',
            'timeline.presidentDecision': now,
            'stages.6.completedAt': now,
            'stages.6.completedBy': currentUser?.email || 'president',
            'stages.6.decision': 'approved',
            'stages.6.notes': actionNote,
            'stages.7.status': 'in_progress',
            'stages.7.startedAt': now
          });
          break;

        case 'disapprove':
          await updateDoc(appealRef, {
            status: APPEAL_STATUS.DISAPPROVED,
            currentStage: 7,
            finalDecision: 'disapproved',
            'timeline.presidentDecision': now,
            'stages.6.completedAt': now,
            'stages.6.completedBy': currentUser?.email || 'president',
            'stages.6.decision': 'disapproved',
            'stages.6.notes': actionNote,
            'stages.7.status': 'in_progress',
            'stages.7.startedAt': now
          });
          break;

        case 'complete':
          await updateDoc(appealRef, {
            status: APPEAL_STATUS.COMPLETED,
            currentStage: 10,
            'timeline.completed': now,
            'stages.9.completedAt': now,
            'stages.9.completedBy': currentUser?.email || 'admin',
            'stages.9.notes': actionNote
          });
          break;

        default:
          break;
      }

      setActionDialog({ open: false, type: null });
      setActionNote('');
      setDepartmentProposal('');
      setSelectedAppeal(null);
    } catch (error) {
      console.error('Error processing action:', error);
      alert('Failed to process action: ' + error.message);
    }
    setProcessing(false);
  };

  const canPerformAction = (appeal, actionType) => {
    const userRole = currentUser?.role || 'admin';
    
    switch (actionType) {
      case 'admin_review':
        return appeal.status === APPEAL_STATUS.SUBMITTED && ['admin', 'super_admin'].includes(userRole);
      case 'document':
        return appeal.status === APPEAL_STATUS.UNDER_ADMIN_REVIEW && ['admin', 'super_admin'].includes(userRole);
      case 'forward_department':
        return appeal.status === APPEAL_STATUS.DOCUMENTED && ['admin', 'super_admin'].includes(userRole);
      case 'department_proposal':
        return appeal.status === APPEAL_STATUS.WITH_DEPARTMENT && ['department_head', 'super_admin'].includes(userRole);
      case 'approve':
      case 'disapprove':
        return appeal.status === APPEAL_STATUS.WITH_PRESIDENT && ['president', 'super_admin'].includes(userRole);
      case 'complete':
        return [APPEAL_STATUS.APPROVED, APPEAL_STATUS.DISAPPROVED].includes(appeal.status) && ['admin', 'super_admin'].includes(userRole);
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          ISO 21001:2018 Appeals Management
        </Typography>
        <Chip label={`${appeals.length} Total Appeals`} color="primary" />
      </Box>

      <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
        <strong>ISO 21001:2018 MO-4.16 - Handling Complaint's Appeals</strong>
        <br />
        10-stage approval process: Submission → Admin Review → Documentation → Department Head → President Decision → Completion
      </Alert>

      <Grid container spacing={3}>
        {appeals.map((appeal) => {
          const timeRemaining = calculateTimeRemaining(appeal.timeline?.currentStageDeadline);
          
          return (
            <Grid item xs={12} key={appeal.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {appeal.reportTitle}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Report ID: {appeal.reportId} | User: {appeal.userName} ({appeal.userEmail})
                      </Typography>
                      <Box display="flex" gap={1} mt={1}>
                        <Chip 
                          label={STATUS_LABELS[appeal.status]} 
                          color={getStatusColor(appeal.status)}
                          size="small"
                        />
                        <Chip 
                          label={`Stage ${appeal.currentStage}/10`} 
                          variant="outlined"
                          size="small"
                        />
                        {timeRemaining && (
                          <Chip 
                            label={timeRemaining.text}
                            color={timeRemaining.overdue ? 'error' : 'default'}
                            size="small"
                            icon={timeRemaining.overdue ? <Warning /> : <HourglassEmpty />}
                          />
                        )}
                      </Box>
                    </Box>
                    <Box>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => setSelectedAppeal(appeal)}
                      >
                        View Details
                      </Button>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Appeal Reason:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {appeal.reason}
                    </Typography>
                    
                    {appeal.evidence && appeal.evidence.length > 0 && (
                      <Box display="flex" gap={1} alignItems="center">
                        <AttachFile fontSize="small" />
                        <Typography variant="body2">
                          {appeal.evidence.length} attachment(s)
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box display="flex" gap={1} flexWrap="wrap">
                    {canPerformAction(appeal, 'admin_review') && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          setSelectedAppeal(appeal);
                          setActionDialog({ open: true, type: 'admin_review' });
                        }}
                      >
                        Start Admin Review
                      </Button>
                    )}
                    {canPerformAction(appeal, 'document') && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          setSelectedAppeal(appeal);
                          setActionDialog({ open: true, type: 'document' });
                        }}
                      >
                        Complete Documentation
                      </Button>
                    )}
                    {canPerformAction(appeal, 'forward_department') && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          setSelectedAppeal(appeal);
                          setActionDialog({ open: true, type: 'forward_department' });
                        }}
                      >
                        Forward to Department
                      </Button>
                    )}
                    {canPerformAction(appeal, 'department_proposal') && (
                      <Button
                        variant="contained"
                        size="small"
                        color="secondary"
                        onClick={() => {
                          setSelectedAppeal(appeal);
                          setActionDialog({ open: true, type: 'department_proposal' });
                        }}
                      >
                        Submit Proposal
                      </Button>
                    )}
                    {canPerformAction(appeal, 'approve') && (
                      <Button
                        variant="contained"
                        size="small"
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={() => {
                          setSelectedAppeal(appeal);
                          setActionDialog({ open: true, type: 'approve' });
                        }}
                      >
                        Approve
                      </Button>
                    )}
                    {canPerformAction(appeal, 'disapprove') && (
                      <Button
                        variant="contained"
                        size="small"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={() => {
                          setSelectedAppeal(appeal);
                          setActionDialog({ open: true, type: 'disapprove' });
                        }}
                      >
                        Disapprove
                      </Button>
                    )}
                    {canPerformAction(appeal, 'complete') && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedAppeal(appeal);
                          setActionDialog({ open: true, type: 'complete' });
                        }}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Appeal Details Dialog */}
      <Dialog 
        open={selectedAppeal !== null && !actionDialog.open} 
        onClose={() => setSelectedAppeal(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedAppeal && (
          <>
            <DialogTitle>
              Appeal Details - {selectedAppeal.reportTitle}
            </DialogTitle>
            <DialogContent>
              <Box mb={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Submitted: {formatTimestamp(selectedAppeal.createdAt)}
                </Typography>
                <Chip 
                  label={STATUS_LABELS[selectedAppeal.status]} 
                  color={getStatusColor(selectedAppeal.status)}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Stepper activeStep={getActiveStep(selectedAppeal.status)} orientation="vertical">
                {ISO_STEPS.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel icon={step.icon}>
                      {step.label}
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                      {selectedAppeal.stages && selectedAppeal.stages[index] && (
                        <Box mt={1}>
                          {selectedAppeal.stages[index].completedAt && (
                            <Typography variant="caption" display="block">
                              Completed: {formatTimestamp(selectedAppeal.stages[index].completedAt)}
                            </Typography>
                          )}
                          {selectedAppeal.stages[index].completedBy && (
                            <Typography variant="caption" display="block">
                              By: {selectedAppeal.stages[index].completedBy}
                            </Typography>
                          )}
                          {selectedAppeal.stages[index].notes && (
                            <Typography variant="caption" display="block">
                              Notes: {selectedAppeal.stages[index].notes}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>

              {selectedAppeal.evidence && selectedAppeal.evidence.length > 0 && (
                <Box mt={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    Evidence:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {selectedAppeal.evidence.map((url, index) => (
                      <img 
                        key={index}
                        src={url} 
                        alt={`Evidence ${index + 1}`}
                        style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedAppeal(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Action Dialog */}
      <Dialog 
        open={actionDialog.open} 
        onClose={() => !processing && setActionDialog({ open: false, type: null })}
      >
        <DialogTitle>
          {actionDialog.type === 'admin_review' && 'Start Admin Review'}
          {actionDialog.type === 'document' && 'Complete Documentation'}
          {actionDialog.type === 'forward_department' && 'Forward to Department Head'}
          {actionDialog.type === 'department_proposal' && 'Submit Department Proposal'}
          {actionDialog.type === 'approve' && 'Approve Appeal'}
          {actionDialog.type === 'disapprove' && 'Disapprove Appeal'}
          {actionDialog.type === 'complete' && 'Complete Appeal Process'}
        </DialogTitle>
        <DialogContent>
          {actionDialog.type === 'department_proposal' ? (
            <TextField
              label="Department Head Proposal"
              multiline
              rows={4}
              fullWidth
              value={departmentProposal}
              onChange={(e) => setDepartmentProposal(e.target.value)}
              placeholder="Enter your recommendation and proposed action..."
              sx={{ mt: 2 }}
              required
            />
          ) : (
            <TextField
              label="Notes (Optional)"
              multiline
              rows={3}
              fullWidth
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Add any notes or comments..."
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setActionDialog({ open: false, type: null })}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleAction(actionDialog.type)}
            variant="contained"
            disabled={processing || (actionDialog.type === 'department_proposal' && !departmentProposal.trim())}
          >
            {processing ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
