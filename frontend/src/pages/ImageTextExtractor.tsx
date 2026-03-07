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
      <section className="panel ocr-panel">
        <p className="eyebrow">AI OCR</p>
        <h1>Image Text Extractor</h1>
        <p>Upload an image and let your local Ollama model extract all visible text.</p>

        <div className="ocr-actions">
          <button type="button" className="btn btn-secondary" onClick={handlePickImage}>
            Upload Image
          </button>
          <button type="button" className="btn btn-primary" onClick={handleAnalyze} disabled={busy}>
            {busy ? 'Analyzing...' : 'Analyze Image'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="ocr-file-input"
          onChange={handleFileChange}
        />

        {selectedFile ? <p className="ocr-file-meta">Selected: {selectedFile.name}</p> : null}
        {error ? <p className="message-text">{error}</p> : null}
      </section>

      {result ? (
        <section className="panel ocr-result">
          <div className="ocr-result-meta">
            <p>
              <strong>Saved JSON:</strong> {result.record_file}
            </p>
            <p>
              <strong>Timestamp:</strong> {result.timestamp}
            </p>
          </div>
          <h2>Extracted Text</h2>
          <pre className="ocr-text-box">{result.text || 'No text detected.'}</pre>
        </section>
      ) : null}
    </div>
  );
};

export default ImageTextExtractor;
