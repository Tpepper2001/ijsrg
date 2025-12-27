import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as mammoth from 'mammoth';

function App() {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dates, setDates] = useState({
    received: '25 April 2025',
    accepted: '25 May 2025',
    published: '16 June 2025'
  });
  const [options, setOptions] = useState({
    twoColumn: true,
    fontSize: 10
  });
  const fileInputRef = useRef(null);

  // Styles
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    },
    header: {
      background: 'linear-gradient(135deg, #003366 0%, #336699 100%)',
      color: 'white',
      padding: '40px',
      borderRadius: '12px',
      marginBottom: '30px',
      textAlign: 'center',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '10px',
      margin: 0
    },
    subtitle: {
      fontSize: '16px',
      opacity: 0.9,
      margin: '10px 0 0 0'
    },
    uploadZone: {
      border: '3px dashed #336699',
      borderRadius: '12px',
      padding: '60px 40px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s',
      backgroundColor: 'white',
      marginBottom: '30px'
    },
    uploadZoneActive: {
      borderColor: '#003366',
      backgroundColor: '#e3f2fd',
      transform: 'scale(1.02)'
    },
    uploadIcon: {
      fontSize: '48px',
      marginBottom: '20px'
    },
    button: {
      padding: '14px 32px',
      fontSize: '16px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s',
      fontWeight: '600',
      margin: '10px'
    },
    buttonPrimary: {
      backgroundColor: '#003366',
      color: 'white'
    },
    buttonSecondary: {
      backgroundColor: '#336699',
      color: 'white'
    },
    buttonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    previewBox: {
      border: '1px solid #ddd',
      borderRadius: '12px',
      padding: '25px',
      marginBottom: '25px',
      backgroundColor: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    previewTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#003366',
      marginBottom: '15px',
      marginTop: 0
    },
    previewItem: {
      marginBottom: '12px',
      fontSize: '14px',
      lineHeight: '1.6'
    },
    label: {
      fontWeight: 'bold',
      color: '#333',
      marginRight: '8px'
    },
    input: {
      padding: '10px',
      fontSize: '14px',
      borderRadius: '6px',
      border: '1px solid #ddd',
      marginRight: '15px',
      marginBottom: '10px'
    },
    optionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '20px'
    },
    statusBox: {
      padding: '20px',
      borderRadius: '8px',
      marginTop: '20px',
      textAlign: 'center',
      fontWeight: '500'
    },
    statusSuccess: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb'
    },
    statusError: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb'
    },
    statusInfo: {
      backgroundColor: '#d1ecf1',
      color: '#0c5460',
      border: '1px solid #bee5eb'
    },
    progressBar: {
      width: '100%',
      height: '10px',
      backgroundColor: '#e0e0e0',
      borderRadius: '5px',
      overflow: 'hidden',
      marginTop: '15px'
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#003366',
      transition: 'width 0.3s ease'
    },
    fileInfo: {
      backgroundColor: '#f8f9fa',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  };

  // Parse Word Document
  const parseWordDocument = async (arrayBuffer) => {
    try {
      setProgress(20);
      setStatus('Parsing Word document...');

      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      
      setProgress(40);

      // Split into lines
      const lines = text.split('\n').filter(line => line.trim());
      
      // Extract title (first non-empty line, usually)
      const title = lines[0] || 'Untitled Manuscript';
      
      // Find authors (look for line with numbers or after title)
      let authorLine = '';
      let affiliationStart = -1;
      for (let i = 1; i < Math.min(10, lines.length); i++) {
        if (lines[i].match(/[¹²³⁴⁵⁶¹²³456]/)) {
          authorLine = lines[i];
          affiliationStart = i + 1;
          break;
        }
      }
      
      // Extract affiliations (next few lines after authors)
      const affiliations = [];
      if (affiliationStart > 0) {
        for (let i = affiliationStart; i < Math.min(affiliationStart + 6, lines.length); i++) {
          if (lines[i] && !lines[i].toLowerCase().includes('abstract')) {
            affiliations.push(lines[i]);
          } else {
            break;
          }
        }
      }
      
      // Find abstract
      let abstractText = '';
      let abstractStart = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('abstract')) {
          abstractStart = i + 1;
          break;
        }
      }
      
      if (abstractStart > 0) {
        for (let i = abstractStart; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes('keyword') || 
              lines[i].toLowerCase().includes('introduction')) {
            break;
          }
          abstractText += lines[i] + ' ';
        }
      }
      
      // Extract keywords
      let keywords = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('keyword')) {
          const keywordLine = lines[i].replace(/keywords?:?/i, '').trim();
          keywords = keywordLine.split(/[,;]/).map(k => k.trim()).filter(k => k);
          break;
        }
      }
      
      // Extract sections
      const sections = [];
      const sectionKeywords = ['introduction', 'methodology', 'method', 'results', 
                               'discussion', 'conclusion', 'references', 'acknowledgment'];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        for (const keyword of sectionKeywords) {
          if (line.includes(keyword) && lines[i].length < 50) {
            // Found a section header
            const sectionTitle = lines[i];
            let sectionContent = '';
            
            // Collect content until next section
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].toLowerCase();
              let isNextSection = false;
              for (const kw of sectionKeywords) {
                if (nextLine.includes(kw) && lines[j].length < 50) {
                  isNextSection = true;
                  break;
                }
              }
              if (isNextSection) break;
              sectionContent += lines[j] + '\n';
            }
            
            sections.push({
              title: sectionTitle,
              content: sectionContent.trim()
            });
            break;
          }
        }
      }
      
      // Extract references (last section usually)
      let references = [];
      let inReferences = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('reference')) {
          inReferences = true;
          continue;
        }
        if (inReferences && lines[i].trim()) {
          references.push(lines[i]);
        }
      }
      
      setProgress(60);
      
      const parsed = {
        title,
        authors: authorLine || 'Authors Not Found',
        affiliations,
        abstract: abstractText.trim() || 'Abstract not found',
        keywords: keywords.length > 0 ? keywords : ['No keywords found'],
        sections,
        references
      };
      
      setParsedData(parsed);
      setProgress(100);
      setStatus('Document parsed successfully!');
      
      return parsed;
    } catch (error) {
      console.error('Parsing error:', error);
      setStatus('Error parsing document: ' + error.message);
      throw error;
    }
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!parsedData) {
      setStatus('No data to generate PDF');
      return;
    }

    try {
      setStatus('Generating PDF...');
      setProgress(0);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = 30;

      // Colors
      const headerBlue = [0, 51, 102];
      const accentBlue = [102, 153, 204];

      // Helper to add header
      const addHeader = (isFirstPage = false) => {
        doc.setFillColor(240, 245, 255);
        doc.rect(0, 0, pageWidth, 25, 'F');
        
        doc.setTextColor(...headerBlue);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('International Journal of Scholarly Resources', margin, 10);
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.text('Business & Management Studies — A Peer-Reviewed Academic Publication', margin, 15);
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text('Email: editor@ijsr.org.ng', pageWidth - margin - 50, 10, { align: 'right' });
        doc.text('Website: www.ijsr.org.ng', pageWidth - margin - 50, 15, { align: 'right' });
        
        doc.setDrawColor(...headerBlue);
        doc.line(margin, 20, pageWidth - margin, 20);
      };

      // Helper to add footer
      const addFooter = () => {
        const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setDrawColor(...headerBlue);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        
        doc.setTextColor(128, 128, 128);
        doc.setFontSize(8);
        doc.text(
          `International Journal of Scholarly Resources | ISSN: 1234-5678 | Page ${pageNum}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      };

      // Helper to check if new page needed
      const checkNewPage = (spaceNeeded) => {
        if (yPos + spaceNeeded > pageHeight - 25) {
          doc.addPage();
          addHeader();
          addFooter();
          yPos = 30;
          return true;
        }
        return false;
      };

      setProgress(20);

      // Add first page header
      addHeader(true);
      addFooter();
      yPos = 30;

      // Title
      doc.setTextColor(...headerBlue);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      const titleLines = doc.splitTextToSize(parsedData.title, contentWidth);
      doc.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
      yPos += titleLines.length * 8 + 10;

      setProgress(30);

      // Authors box
      doc.setFillColor(...accentBlue, 0.1 * 255);
      doc.setDrawColor(...headerBlue);
      doc.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'FD');
      
      doc.setTextColor(...headerBlue);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      const authorLines = doc.splitTextToSize(parsedData.authors, contentWidth - 10);
      doc.text(authorLines, margin + 5, yPos + 6);
      yPos += 20;

      // Affiliations
      if (parsedData.affiliations && parsedData.affiliations.length > 0) {
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        parsedData.affiliations.forEach((aff, idx) => {
          if (checkNewPage(6)) return;
          const affLines = doc.splitTextToSize(aff, contentWidth - 10);
          doc.text(affLines, margin + 5, yPos);
          yPos += affLines.length * 5;
        });
        yPos += 5;
      }

      setProgress(40);

      // Dates box
      doc.setFillColor(...accentBlue, 0.1 * 255);
      doc.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'FD');
      
      doc.setFontSize(9);
      const dateText = `Received: ${dates.received} | Accepted: ${dates.accepted} | Published: ${dates.published}`;
      doc.text(dateText, pageWidth - margin - 5, yPos + 6, { align: 'right' });
      yPos += 20;

      // Citation
      doc.setFontSize(8);
      const citation = `How to cite: ${parsedData.authors.substring(0, 50)}... (2025). ${parsedData.title.substring(0, 80)}... International Journal of Scholarly Resources, ISSN: 1234-5678.`;
      const citationLines = doc.splitTextToSize(citation, contentWidth - 10);
      citationLines.forEach(line => {
        if (checkNewPage(5)) return;
        doc.text(line, margin + 5, yPos);
        yPos += 5;
      });
      yPos += 10;

      setProgress(50);

      // Abstract box
      checkNewPage(40);
      doc.setFillColor(...accentBlue, 0.1 * 255);
      
      // Calculate abstract box height
      doc.setFontSize(10);
      const abstractLines = doc.splitTextToSize(parsedData.abstract, contentWidth - 10);
      const abstractHeight = Math.max(30, abstractLines.length * 5 + 20);
      
      doc.roundedRect(margin, yPos, contentWidth, abstractHeight, 2, 2, 'FD');
      
      doc.setTextColor(...headerBlue);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Abstract', pageWidth / 2, yPos + 8, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(abstractLines, margin + 5, yPos + 15);
      yPos += abstractHeight + 5;

      // Keywords
      if (parsedData.keywords && parsedData.keywords.length > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('Keywords: ', margin + 5, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(parsedData.keywords.join(', '), margin + 25, yPos);
        yPos += 10;
      }

      setProgress(60);

      // Sections
      if (parsedData.sections && parsedData.sections.length > 0) {
        parsedData.sections.forEach((section, idx) => {
          checkNewPage(20);
          
          // Section title
          doc.setTextColor(...headerBlue);
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.text(section.title, margin, yPos);
          yPos += 10;
          
          // Section content
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          
          const contentLines = doc.splitTextToSize(section.content, contentWidth);
          contentLines.forEach((line, lineIdx) => {
            if (checkNewPage(6)) return;
            doc.text(line, margin, yPos);
            yPos += 5;
          });
          
          yPos += 8;
          setProgress(60 + (idx / parsedData.sections.length) * 30);
        });
      }

      setProgress(90);

      // References
      if (parsedData.references && parsedData.references.length > 0) {
        checkNewPage(20);
        
        doc.setTextColor(...headerBlue);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('References', margin, yPos);
        yPos += 10;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        
        parsedData.references.forEach((ref, idx) => {
          if (checkNewPage(8)) return;
          const refLines = doc.splitTextToSize(ref, contentWidth - 5);
          refLines.forEach(line => {
            doc.text(line, margin + 5, yPos);
            yPos += 4.5;
          });
          yPos += 2;
        });
      }

      setProgress(100);

      // Save PDF
      const filename = `IJSR_${parsedData.title.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}.pdf`;
      doc.save(filename);
      
      setStatus(`PDF generated successfully! Saved as ${filename}`);
    } catch (error) {
      console.error('PDF generation error:', error);
      setStatus('Error generating PDF: ' + error.message);
    }
  };

  // File upload handler
  const handleFileUpload = async (uploadedFile) => {
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.docx')) {
      setStatus('Please upload a .docx file');
      return;
    }

    if (uploadedFile.size > 10 * 1024 * 1024) {
      setStatus('File too large. Maximum size is 10MB');
      return;
    }

    setFile(uploadedFile);
    setStatus('File uploaded. Parsing...');

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      await parseWordDocument(arrayBuffer);
    } catch (error) {
      setStatus('Error reading file: ' + error.message);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileUpload(droppedFile);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  const handleClear = () => {
    setFile(null);
    setParsedData(null);
    setStatus('');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>IJSR Manuscript to PDF Converter</h1>
        <p style={styles.subtitle}>
          Convert Word manuscripts to professionally formatted IJSR PDFs
        </p>
      </header>

      <main>
        {!file ? (
          <div
            style={{
              ...styles.uploadZone,
              ...(isDragging ? styles.uploadZoneActive : {})
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={styles.uploadIcon}>📄</div>
            <h3>Drag & Drop your .docx file here</h3>
            <p>or click to browse</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              Maximum file size: 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <>
            <div style={styles.fileInfo}>
              <div>
                <strong>📄 {file.name}</strong>
                <span style={{ marginLeft: '15px', color: '#666' }}>
                  ({(file.size / 1024).toFixed(2)} KB)
                </span>
              </div>
              <button
                style={{ ...styles.button, backgroundColor: '#dc3545', color: 'white' }}
                onClick={handleClear}
              >
                Clear
              </button>
            </div>

            {parsedData && (
              <>
                <div style={styles.previewBox}>
                  <h2 style={styles.previewTitle}>📋 Document Preview</h2>
                  
                  <div style={styles.previewItem}>
                    <span style={styles.label}>Title:</span>
                    {parsedData.title}
                  </div>
                  
                  <div style={styles.previewItem}>
                    <span style={styles.label}>Authors:</span>
                    {parsedData.authors}
                  </div>
                  
                  <div style={styles.previewItem}>
                    <span style={styles.label}>Affiliations:</span>
                    {parsedData.affiliations.length} found
                  </div>
                  
                  <div style={styles.previewItem}>
                    <span style={styles.label}>Abstract:</span>
                    {parsedData.abstract.substring(0, 150)}...
                  </div>
                  
                  <div style={styles.previewItem}>
                    <span style={styles.label}>Keywords:</span>
                    {parsedData.keywords.join(', ')}
                  </div>
                  
                  <div style={styles.previewItem}>
                    <span style={styles.label}>Sections:</span>
                    {parsedData.sections.length} sections found
                  </div>
                  
                  <div style={styles.previewItem}>
                    <span style={styles.label}>References:</span>
                    {parsedData.references.length} references found
                  </div>
                </div>

                <div style={styles.previewBox}>
                  <h2 style={styles.previewTitle}>⚙️ Options</h2>
                  
                  <div style={styles.optionsGrid}>
                    <div>
                      <label style={styles.label}>Received Date:</label>
                      <input
                        type="text"
                        value={dates.received}
                        onChange={(e) => setDates({...dates, received: e.target.value})}
                        style={styles.input}
                        placeholder="DD Month YYYY"
                      />
                    </div>
                    
                    <div>
                      <label style={styles.label}>Accepted Date:</label>
                      <input
                        type="text"
                        value={dates.accepted}
                        onChange={(e) => setDates({...dates, accepted: e.target.value})}
                        style={styles.input}
                        placeholder="DD Month YYYY"
                      />
                    </div>
                    
                    <div>
                      <label style={styles.label}>Published Date:</label>
                      <input
                        type="text"
                        value={dates.published}
                        onChange={(e) => setDates({...dates, published: e.target.value})}
                        style={styles.input}
                        placeholder="DD Month YYYY"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                  <button
                    style={{
                      ...styles.button,
                      ...styles.buttonPrimary
                    }}
                    onClick={generatePDF}
                  >
                    🎯 Generate PDF
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {status && (
          <div
            style={{
              ...styles.statusBox,
              ...(status.includes('Error') || status.includes('error')
                ? styles.statusError
                : status.includes('success')
                ? styles.statusSuccess
                : styles.statusInfo)
            }}
          >
            {status}
            {progress > 0 && progress < 100 && (
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progress}%`
                  }}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', marginTop: '50px', color: '#666', fontSize: '14px' }}>
        <p>International Journal of Scholarly Resources © 2025</p>
        <p>For support: editor@ijsr.org.ng</p>
      </footer>
    </div>
  );
}

export default App;
