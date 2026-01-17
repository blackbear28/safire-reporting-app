import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import './TestFeedbackLogs.css';

export default function TestFeedbackLogs() {
  const [feedbackLogs, setFeedbackLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchFeedbackLogs();
  }, []);

  const fetchFeedbackLogs = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'testFeedback'),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFeedbackLogs(logs);
    } catch (error) {
      console.error('Error fetching feedback logs:', error);
      alert('Error loading feedback logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (logId) => {
    if (window.confirm('Are you sure you want to delete this feedback log?')) {
      try {
        await deleteDoc(doc(db, 'testFeedback', logId));
        setFeedbackLogs(feedbackLogs.filter(log => log.id !== logId));
        alert('Feedback log deleted successfully');
      } catch (error) {
        console.error('Error deleting log:', error);
        alert('Error deleting log: ' + error.message);
      }
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const generateDocumentationText = (log) => {
    return `
=== TEST SESSION LOG ===
Test Session ID: ${log.id}
Name: ${log.firstName} ${log.lastName}
Department: ${log.department}
User: ${log.userName}
Email: ${log.userEmail}
Role: ${log.userRole}
Session Start: ${log.sessionStartTime}
Session End: ${log.sessionEndTime}
Date Submitted: ${formatTimestamp(log.timestamp)}

FEEDBACK:
${log.feedback}

DEVICE INFO:
Platform: ${log.deviceInfo?.platform || 'N/A'}
========================
    `.trim();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => alert('Log copied to clipboard! You can now paste it in your documentation.'),
      () => alert('Failed to copy log')
    );
  };

  const exportAllLogs = () => {
    const allLogsText = feedbackLogs
      .map(log => generateDocumentationText(log))
      .join('\n\n' + '='.repeat(50) + '\n\n');
    
    const blob = new Blob([allLogsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-feedback-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading feedback logs...</p>
      </div>
    );
  }

  return (
    <div className="test-feedback-container">
      <div className="feedback-header">
        <h2>📝 Test Feedback Logs</h2>
        <p className="subtitle">
          View and export user feedback from test sessions
        </p>
        {feedbackLogs.length > 0 && (
          <button className="export-all-btn" onClick={exportAllLogs}>
            📥 Export All Logs
          </button>
        )}
      </div>

      {feedbackLogs.length === 0 ? (
        <div className="empty-state">
          <p>No feedback logs available yet.</p>
          <p className="empty-hint">
            Users can submit feedback through the mobile app's Test Feedback feature.
          </p>
        </div>
      ) : (
        <div className="feedback-grid">
          {feedbackLogs.map((log) => (
            <div key={log.id} className="feedback-card">
              <div className="card-header">
                <div className="user-info">
                  <h3>{log.firstName} {log.lastName}</h3>
                  <span className="user-email">{log.userEmail}</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <span className="department-badge">
                      🏛️ {log.department}
                    </span>
                    <span className={`role-badge ${log.userRole}`}>
                      {log.userRole === 'faculty' ? '👨‍🏫 Faculty' : '🎓 Student'}
                    </span>
                  </div>
                </div>
                <span className="timestamp">{formatTimestamp(log.timestamp)}</span>
              </div>

              <div className="session-info">
                <div className="info-row">
                  <span className="label">Session:</span>
                  <span className="value">
                    {log.sessionStartTime} - {log.sessionEndTime}
                  </span>
                </div>
              </div>

              <div className="feedback-content">
                <h4>Feedback:</h4>
                <p>{log.feedback}</p>
              </div>

              <div className="card-actions">
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(generateDocumentationText(log))}
                >
                  📋 Copy Log
                </button>
                <button
                  className="view-btn"
                  onClick={() => setSelectedLog(log)}
                >
                  👁️ View Full Log
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(log.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for viewing full log */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Full Test Log</h3>
              <button className="close-btn" onClick={() => setSelectedLog(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <pre>{generateDocumentationText(selectedLog)}</pre>
            </div>
            <div className="modal-footer">
              <button
                className="copy-btn"
                onClick={() => {
                  copyToClipboard(generateDocumentationText(selectedLog));
                  setSelectedLog(null);
                }}
              >
                📋 Copy & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
