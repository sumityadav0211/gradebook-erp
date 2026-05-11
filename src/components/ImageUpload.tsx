import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ImageUploadProps {
  bucket: string;
  path: string;
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  label?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ bucket, path, onUploadComplete, currentUrl, label }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
    }

    setIsUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${path}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        if ((uploadError as any).message?.includes('Bucket not found')) {
          toast.error(`Feature restricted: The storage bucket "${bucket}" was not found. Images are optional, but if you want to use them, please create a public bucket named "${bucket}" in your Supabase Dashboard.`);
          setIsUploading(false);
          return;
        }
        throw uploadError;
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onUploadComplete(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    onUploadComplete('');
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-bold text-slate-700">{label}</label>}
      
      <div className="relative group">
        {previewUrl ? (
          <div className="relative w-full h-32 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner bg-slate-50">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              type="button"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-primary-300 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Click to upload image</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">PNG, JPG up to 2MB</p>
                </>
              )}
            </div>
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileChange} 
              accept="image/*"
              disabled={isUploading}
            />
          </label>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
