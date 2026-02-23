// React component example for Automated Reports
import React, { useState, useEffect } from 'react';
import api from '../config/api';
import './Chatbot.css';

const ReportViewer = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportType, setReportType] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/automated-reports', {
        params: { limit: 20 }
      });

      if (response.data.success) {
        setReports(response.data.reports);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const response = await api.post(
        '/automated-reports/generate',
        { reportType, date: new Date().toISOString() }
      );

      if (response.data.success) {
        setSelectedReport(response.data.report);
        loadReports(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const viewReport = async (reportId) => {
    try {
      const response = await api.get(`/automated-reports/${reportId}`);

      if (response.data.success) {
        setSelectedReport(response.data.report);
      }
    } catch (error) {
      console.error('Failed to view report:', error);
    }
  };

  const downloadReport = () => {
    if (!selectedReport) return;

    const blob = new Blob([selectedReport.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedReport.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="report-viewer">
      <div className="report-header">
        <h2>Automated Reports</h2>
        <div className="report-actions">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            disabled={generating}
          >
            <option value="daily">Daily Report</option>
            <option value="weekly">Weekly Report</option>
            <option value="monthly">Monthly Report</option>
            <option value="feedback">Feedback Analysis</option>
          </select>
          <button
            onClick={generateReport}
            disabled={generating}
            className="generate-report-btn"
          >
            {generating ? 'Generating...' : 'Generate New Report'}
          </button>
        </div>
      </div>

      <div className="reports-layout">
        <div className="reports-list">
          <h3>Recent Reports</h3>
          {loading ? (
            <p>Loading reports...</p>
          ) : reports.length === 0 ? (
            <p>No reports available. Generate one to get started!</p>
          ) : (
            <ul>
              {reports.map(report => (
                <li
                  key={report._id}
                  onClick={() => viewReport(report._id)}
                  className={selectedReport?._id === report._id ? 'active' : ''}
                >
                  <strong>{report.title}</strong>
                  <small>{new Date(report.generatedAt).toLocaleDateString()}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="report-display">
          {selectedReport ? (
            <>
              <div className="report-toolbar">
                <h3>{selectedReport.title}</h3>
                <div>
                  <button onClick={downloadReport}>Download</button>
                  <button onClick={printReport}>Print</button>
                </div>
              </div>
              <div
                className="report-content"
                dangerouslySetInnerHTML={{
                  __html: convertMarkdownToHTML(selectedReport.content)
                }}
              />
              <div className="report-metadata">
                <small>
                  Generated: {new Date(selectedReport.generatedAt).toLocaleString()} |
                  Tokens used: {selectedReport.metadata?.tokensUsed || 'N/A'} |
                  Generation time: {selectedReport.metadata?.generationTime || 'N/A'}ms
                </small>
              </div>
            </>
          ) : (
            <div className="report-placeholder">
              <p>Select a report from the list or generate a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple markdown to HTML converter (you might want to use a library like marked.js)
const convertMarkdownToHTML = (markdown) => {
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />');
};

export default ReportViewer;
