import axios from 'axios';

import { VITE_API_BASE_URL } from '../../config/env';

export type OcrExtractResponse = {
  success: boolean;
  text: string;
  timestamp: string;
  record_file: string;
};

export const extractTextFromImage = async (file: File): Promise<OcrExtractResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<OcrExtractResponse>(
    `${VITE_API_BASE_URL}/ai/ocr/extract`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 180000,
    }
  );

  return response.data;
};
