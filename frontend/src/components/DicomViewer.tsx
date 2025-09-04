import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const DicomViewer: React.FC = () => {
  const { studyInstanceUID } = useParams<{ studyInstanceUID: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [orthancStudyId, setOrthancStudyId] = useState<string | null>(null);

  useEffect(() => {
    const findStudyByUID = async () => {
      if (!studyInstanceUID) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Looking for study with UID:', studyInstanceUID);
        
        // First, get all studies from Orthanc
        const studiesResponse = await fetch('http://localhost:8080/pacs/studies');
        if (!studiesResponse.ok) {
          throw new Error('Failed to fetch studies from PACS');
        }
        
        const studyIds: string[] = await studiesResponse.json();
        console.log('Found study IDs:', studyIds);
        
        // Find the study with matching StudyInstanceUID
        let foundStudyId: string | null = null;
        
        for (const studyId of studyIds) {
          try {
            const studyResponse = await fetch(`http://localhost:8080/pacs/studies/${studyId}`);
            if (studyResponse.ok) {
              const studyData = await studyResponse.json();
              const studyUID = studyData.MainDicomTags?.StudyInstanceUID;
              
              console.log(`Study ${studyId} has UID: ${studyUID}`);
              
              if (studyUID === studyInstanceUID) {
                foundStudyId = studyId;
                console.log('Found matching study:', studyId);
                break;
              }
            }
          } catch (e) {
            console.warn(`Error checking study ${studyId}:`, e);
          }
        }
        
        if (foundStudyId) {
          setOrthancStudyId(foundStudyId);
          
          // Set up viewer URLs - prefer Stone Web Viewer if available
          const stoneViewerUrl = `http://localhost:8080/pacs/stone-webviewer/index.html?study=${foundStudyId}`;
          setViewerUrl(stoneViewerUrl);
        } else {
          throw new Error(`Study with UID ${studyInstanceUID} not found in PACS`);
        }
        
      } catch (err) {
        console.error('Error finding study:', err);
        setError(err instanceof Error ? err.message : 'Failed to find study');
      } finally {
        setLoading(false);
      }
    };
    
    findStudyByUID();
  }, [studyInstanceUID]);

  if (loading) {
    return (
      <div className="card dicom-viewer-container">
        <div className="card-header">
          <h2 className="card-title">DICOM Viewer</h2>
          <p className="card-subtitle">Study UID: {studyInstanceUID}</p>
        </div>
        <div className="viewer-wrapper" style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-center">
            <div className="spinner"></div>
            <p>Loading DICOM study...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card dicom-viewer-container">
        <div className="card-header">
          <h2 className="card-title">DICOM Viewer</h2>
          <p className="card-subtitle">Study UID: {studyInstanceUID}</p>
        </div>
        <div className="viewer-wrapper" style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-center" style={{ 
            background: '#f8d7da', 
            color: '#721c24', 
            padding: '20px', 
            borderRadius: '5px', 
            border: '1px solid #f5c6cb',
            maxWidth: '500px'
          }}>
            <h3>Error Loading Study</h3>
            <p>{error}</p>
            <div className="mt-2">
              <h4>Alternative Options:</h4>
              <div className="flex justify-center gap-2 mt-2">
                <a 
                  href={`http://localhost:8080/pacs/app/explorer.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-small"
                >
                  Browse PACS
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card dicom-viewer-container">
      <div className="card-header">
        <div className="flex justify-between align-center">
          <div>
            <h2 className="card-title">DICOM Viewer</h2>
            <p className="card-subtitle">Study UID: {studyInstanceUID}</p>
            {orthancStudyId && <p className="card-subtitle">Orthanc ID: {orthancStudyId}</p>}
          </div>
          <div className="flex gap-2">
            {orthancStudyId && (
              <>
                <a
                  href={`http://localhost:8080/pacs/app/explorer.html#study?uuid=${orthancStudyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-small"
                >
                  Orthanc Explorer
                </a>
                <a
                  href={`http://localhost:8080/pacs/osimis-viewer/app/index.html?study=${orthancStudyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-small"
                >
                  Osimis Viewer
                </a>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="viewer-wrapper" style={{ height: '600px', position: 'relative' }}>
        {viewerUrl ? (
          <iframe
            src={viewerUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '4px'
            }}
            title="DICOM Viewer"
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            backgroundColor: '#f8f9fa'
          }}>
            <p>Viewer not available</p>
          </div>
        )}
      </div>
      
      <div className="viewer-instructions" style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        <p>
          <strong>Embedded Stone Web Viewer:</strong> Use mouse to interact with the DICOM images. 
          If the embedded viewer doesn't work, try the external viewer links above.
        </p>
        {orthancStudyId && (
          <div className="mt-2">
            <strong>Direct Links:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>
                <a 
                  href={`http://localhost:8080/pacs/stone-webviewer/index.html?study=${orthancStudyId}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Stone Web Viewer (Full Screen)
                </a>
              </li>
              <li>
                <a 
                  href={`http://localhost:8080/pacs/app/explorer.html#study?uuid=${orthancStudyId}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Orthanc Explorer
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DicomViewer;