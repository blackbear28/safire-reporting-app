import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import './UsageLogs.css';

const UsageLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsageLogs();
  }, []);

  const fetchUsageLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const q = query(
        collection(db, 'usageLogs'),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const logsData = [];
      querySnapshot.forEach((doc) => {
        logsData.push({ id: doc.id, ...doc.data() });
      });
      setLogs(logsData);
      console.log('Fetched usage logs:', logsData.length);
    } catch (error) {
      console.error('Error fetching usage logs:', error);
      setError(error.message || 'Failed to fetch usage logs. Please check Firebase rules.');
    } finally {
      setLoading(false);
    }
  };

  const generateTxtContent = (log) => {
    let txt = `TEST USER CODE NAME: ${log.testUserCode}\n`;
    txt += `User Email: ${log.userEmail}\n`;
    txt += `User Role: ${log.userRole}\n`;
    txt += `Session Start: ${new Date(log.sessionStartTime).toLocaleString()}\n`;
    txt += `Session End: ${new Date(log.sessionEndTime).toLocaleString()}\n`;
    txt += `Total Duration: ${log.totalDurationMinutes} minutes\n`;
    txt += `\n========================================\n`;
    txt += `Task Completion Data Collection Instrument\n`;
    txt += `========================================\n\n`;

    log.logs.forEach((task, index) => {
      txt += `${index + 1}. ${task.task}\n`;
      txt += `   Start time: ${task.startTime}\n`;
      txt += `   End time: ${task.endTime}\n`;
      txt += `   Time (minutes): ${task.durationMinutes}\n`;
      txt += `   Success: ${task.success}\n`;
      txt += `   Problem/Issues: ${task.problemIssues || 'None'}\n`;
      txt += `\n`;
    });

    txt += `========================================\n`;
    txt += `Total Time Logged: ${log.totalDurationMinutes} minutes\n`;
    txt += `Number of Features Used: ${log.logs.length}\n`;
    txt += `========================================\n`;

    return txt;
  };

  const downloadTxtFile = (log) => {
    const txtContent = generateTxtContent(log);
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage_log_${log.testUserCode}_${new Date(log.sessionStartTime).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const copyToClipboard = (log) => {
    const txtContent = generateTxtContent(log);
    navigator.clipboard.writeText(txtContent).then(() => {
      alert('Log copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  };

  const viewFullLog = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="usage-logs-container">
        <div className="loading-spinner">Loading usage logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="usage-logs-container">
        <div className="usage-logs-header">
          <h2>Usage Logs - Task Completion Data</h2>
          <button onClick={fetchUsageLogs} className="refresh-button">
            🔄 Retry
          </button>
        </div>
        <div className="error-message" style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          color: '#856404'
        }}>
          <h3>⚠️ Error Loading Usage Logs</h3>
          <p>{error}</p>
          <p style={{ marginTop: '20px', fontSize: '14px' }}>
            <strong>Possible fixes:</strong><br/>
            1. Make sure Firebase rules allow reading from 'usageLogs' collection<br/>
            2. Check that you're logged in as admin<br/>
            3. Verify the collection exists in Firebase
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="usage-logs-container">
      <div className="usage-logs-header">
        <h2>Usage Logs - Task Completion Data</h2>
        <button onClick={fetchUsageLogs} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="no-logs">
          <p>No usage logs available yet.</p>
        </div>
      ) : (
        <div className="logs-grid">
          {logs.map((log) => (
            <div key={log.id} className="log-card">
              <div className="log-card-header">
                <h3>{log.testUserCode}</h3>
                <span className={`role-badge ${log.userRole?.toLowerCase()}`}>
                  {log.userRole}
                </span>
              </div>
              
              <div className="log-card-body">
                <p><strong>Email:</strong> {log.userEmail}</p>
                <p><strong>Session Start:</strong> {new Date(log.sessionStartTime).toLocaleString()}</p>
                <p><strong>Session End:</strong> {new Date(log.sessionEndTime).toLocaleString()}</p>
                <p><strong>Total Duration:</strong> {log.totalDurationMinutes} min</p>
                <p><strong>Features Used:</strong> {log.logs?.length || 0}</p>
              </div>

              <div className="log-card-tasks">
                <strong>Tasks Completed:</strong>
                <ul>
                  {log.logs?.slice(0, 3).map((task, idx) => (
                    <li key={idx}>
                      {task.task} ({task.durationMinutes} min)
                    </li>
                  ))}
                  {log.logs?.length > 3 && (
                    <li>+ {log.logs.length - 3} more...</li>
                  )}
                </ul>
              </div>

              <div className="log-card-actions">
                <button onClick={() => viewFullLog(log)} className="view-button">
                  👁️ View Full Log
                </button>
                <button onClick={() => downloadTxtFile(log)} className="download-button">
                  ⬇️ Download TXT
                </button>
                <button onClick={() => copyToClipboard(log)} className="copy-button">
                  📋 Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for full log view */}
      {showModal && selectedLog && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Full Usage Log - {selectedLog.testUserCode}</h3>
              <button onClick={() => setShowModal(false)} className="close-button">✕</button>
            </div>
            <div className="modal-body">
              <pre>{generateTxtContent(selectedLog)}</pre>
            </div>
            <div className="modal-footer">
              <button onClick={() => downloadTxtFile(selectedLog)} className="download-button">
                ⬇️ Download TXT
              </button>
              <button onClick={() => copyToClipboard(selectedLog)} className="copy-button">
                📋 Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageLogs;
