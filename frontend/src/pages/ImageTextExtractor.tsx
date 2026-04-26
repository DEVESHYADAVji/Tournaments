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
    <div className="section-stack page-enter">
      <section className="hero-surface">
        <div className="hero-inner">
          <p className="section-label">AI OCR</p>
          <h1 className="page-title">Image text extractor</h1>
          <p>Upload an image and let your local Ollama vision model extract the visible text with minimal friction.</p>

          <div className="cta-row">
            <button type="button" className="btn btn-secondary" onClick={handlePickImage}>
              Upload image
            </button>
            <button type="button" className="btn btn-primary" onClick={handleAnalyze} disabled={busy}>
              {busy ? 'Analyzing...' : 'Analyze image'}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="ocr-file-input"
            onChange={handleFileChange}
          />

          {selectedFile ? <p className="message-text message-success">Selected: {selectedFile.name}</p> : null}
          {error ? <p className="message-text message-error">{error}</p> : null}
        </div>
      </section>

      {result ? (
        <section className="section-card">
          <div className="section-card-inner">
            <div className="section-header">
              <div>
                <p className="section-label">Result</p>
                <h2>Extracted text</h2>
              </div>
            </div>
            <div className="form-stack">
              <p><strong>Saved JSON:</strong> {result.record_file}</p>
              <p><strong>Timestamp:</strong> {result.timestamp}</p>
              <pre className="ocr-result-box">{result.text || 'No text detected.'}</pre>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default ImageTextExtractor;
