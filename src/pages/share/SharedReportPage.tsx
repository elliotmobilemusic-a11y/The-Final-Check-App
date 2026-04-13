import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getReportShareByToken } from '../../services/reportShares';

export function SharedReportPage() {
  const { token = '' } = useParams();
  const [report, setReport] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    getReportShareByToken(token)
      .then((data) => {
        if (!data) {
          setStatus('missing');
          return;
        }
        setReport(data);
        setStatus('ready');
      })
      .catch(() => setStatus('missing'));
  }, [token]);

  function handleExportPDF() {
    window.print();
  }

  if (status === 'loading') {
    return (
      <main style={{ 
        minHeight: '100vh', 
        display: 'grid', 
        placeItems: 'center',
        background: '#f6f1ea'
      }}>
        <p>Loading report...</p>
      </main>
    );
  }

  if (status === 'missing') {
    return (
      <main style={{ 
        minHeight: '100vh', 
        display: 'grid', 
        placeItems: 'center',
        background: '#f6f1ea'
      }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1>Report not available</h1>
          <p style={{ marginTop: 12 }}>This report link may have expired or is no longer available.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <style>
        {`
          @media print {
            .report-print-header,
            .report-print-footer,
            .report-controls {
              display: none !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              background: white !important;
              font-size: 14px;
            }
            .report-content {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              border-radius: 0 !important;
            }
          }
        `}
      </style>

      <main style={{ 
        minHeight: '100vh',
        padding: '24px 16px',
        background: '#f6f1ea'
      }}>
        <div className="report-controls" style={{ 
          maxWidth: 860, 
          margin: '0 auto 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12
        }}>
          <button 
            onClick={handleExportPDF}
            style={{
              minHeight: 48,
              padding: '0 24px',
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(135deg, #4f4a53 0%, #69646f 100%)',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Export PDF
          </button>
        </div>

        <div className="report-content" style={{
          maxWidth: 860,
          margin: '0 auto',
          background: 'white',
          borderRadius: 28,
          padding: 48,
          boxShadow: '0 30px 80px rgba(52, 41, 24, 0.12)'
        }}>
          <div className="report-print-header" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 32,
            paddingBottom: 24,
            borderBottom: '1px solid #ebe6e0'
          }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: '#2d2b31' }}>The Final Check</h1>
              <p style={{ margin: '8px 0 0', color: '#7b6b54', fontSize: 14 }}>Kitchen Performance Report</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#5c5752' }}>{report?.clientName}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7b6b54' }}>{new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 28 }}>
            {report?.sections?.map((section: any, i: number) => (
              <div key={i} style={{ display: 'grid', gap: 16 }}>
                <h2 style={{ 
                  fontSize: 20, 
                  fontWeight: 700, 
                  margin: 0, 
                  color: '#2d2b31',
                  paddingBottom: 12,
                  borderBottom: '1px solid #f1ece6'
                }}>
                  {section.title}
                </h2>

                {section.items?.map((item: any, j: number) => (
                  <div key={j} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr auto', 
                    gap: 24,
                    padding: '12px 0',
                    borderBottom: j < section.items.length - 1 ? '1px solid #f7f3ee' : 'none'
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: '#4a4641' }}>{item.label}</p>
                      {item.note && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#7b6b54' }}>{item.note}</p>}
                    </div>
                    <div style={{ 
                      minWidth: 80,
                      textAlign: 'right',
                      fontWeight: 700,
                      color: item.score >= 70 ? '#4f8e67' : item.score >= 40 ? '#c6a161' : '#a76060'
                    }}>
                      {item.score}%
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid #ebe6e0' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#7b6b54', textAlign: 'center' }}>
                This report was prepared by The Final Check. All information is confidential and intended for the recipient only.
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#948d83', textAlign: 'center' }}>
                © {new Date().getFullYear()} The Final Check. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        <div className="report-print-footer" style={{ 
          maxWidth: 860, 
          margin: '32px auto 0',
          textAlign: 'center',
          color: '#7b6b54',
          fontSize: 13
        }}>
          <p>You can bookmark this page to return to this report at any time.</p>
        </div>
      </main>
    </>
  );
}