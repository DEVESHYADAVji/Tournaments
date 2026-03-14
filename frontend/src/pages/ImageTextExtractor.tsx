import React from 'react';
import { AxiosError } from 'axios';

import { extractTextFromImage, type OcrExtractResponse } from '../features/ocr/ocr.api';

const ImageTextExtractor: React.FC = () => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState<OcrExtractResponse | null>(null);

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setError('');
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please upload an image first.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const data = await extractTextFromImage(selectedFile);
      setResult(data);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      const message =
        axiosError.response?.data?.detail || axiosError.message || 'Failed to extract text from image.';
      setError(String(message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ocr-page page-enter">
      <section className="panel ocr-panel" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1577720643272-265a27e92e20?w=1200&h=400&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', minHeight: '300px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13, 13, 13, 0.93), rgba(26, 26, 26, 0.93))' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="eyebrow" style={{ color: '#ffc107' }}>🤖 AI OCR</p>
          <h1 style={{ color: '#ffffff' }}>Image Text Extractor</h1>
          <p style={{ color: '#cccccc', maxWidth: '500px' }}>Upload an image and let your local Ollama model extract all visible text. Perfect for digitizing documents, signs, and more.</p>

          <div className="ocr-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={handlePickImage} style={{ background: 'rgba(197, 0, 0, 0.7)', border: '2px solid #c50000' }}>
              📤 Upload Image
            </button>
            <button type="button" className="btn btn-primary" onClick={handleAnalyze} disabled={busy} style={{ background: 'linear-gradient(135deg, #c50000, #ffc107)' }}>
              {busy ? '⏳ Analyzing...' : '⚡ Analyze Image'}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="ocr-file-input"
            onChange={handleFileChange}
          />

          {selectedFile ? <p className="ocr-file-meta" style={{ color: '#4caf50', marginTop: '15px', fontWeight: '600' }}>✅ Selected: {selectedFile.name}</p> : null}
          {error ? <p className="message-text" style={{ color: '#ff6b6b', marginTop: '15px' }}>❌ {error}</p> : null}
        </div>
      </section>

      {result ? (
        <section className="panel ocr-result" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1516321318423-f06c6e504b00?w=1200&h=300&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', marginTop: '30px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13, 13, 13, 0.92)' }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="ocr-result-meta" style={{ marginBottom: '20px' }}>
              <p style={{ color: '#ffc107' }}>
                <strong>📄 Saved JSON:</strong> <code style={{ background: '#1a1a1a', padding: '8px', borderRadius: '6px', color: '#4caf50' }}>{result.record_file}</code>
              </p>
              <p style={{ color: '#cccccc', marginTop: '10px' }}>
                <strong>⏰ Timestamp:</strong> {result.timestamp}
              </p>
            </div>
            <h2 style={{ color: '#ffc107', marginBottom: '15px' }}>📝 Extracted Text</h2>
            <pre className="ocr-text-box" style={{ background: '#0d0d0d', border: '2px solid #c50000', color: '#4caf50', padding: '20px', borderRadius: '8px', overflowX: 'auto' }}>{result.text || 'No text detected.'}</pre>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default ImageTextExtractor;
