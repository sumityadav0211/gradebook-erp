import { useState } from 'react';
import generateExamPDF from '../utils/generateExamPDF';
import generateCombinedPDF from '../utils/generateCombinedPDF';
import { supabase } from '../lib/supabase';

interface GenerateExamData {
  student: any;
  exam: any;
  results: any[];
  college: any;
}

interface GenerateCombinedData {
  student: any;
  college: any;
  batch: any;
}

export const usePDFGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState<string | null>(null);

  const generateExam = async (data: GenerateExamData) => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateExamPDF(data);
      setLastGeneratedUrl(response);
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to generate exam PDF');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCombined = async (data: any) => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateCombinedPDF({
        ...data,
        supabase
      });
      setLastGeneratedUrl(response);
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to generate annual report');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateExam,
    generateCombined,
    isGenerating,
    error,
    lastGeneratedUrl
  };
};
