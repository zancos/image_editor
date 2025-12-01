
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Upload, X, Wand2, Download, AlertCircle, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { editImageWithGemini } from '../services/geminiService';
import { AppState } from '../types';

interface UploadedImage {
  id: string; // Unique ID for keying and removal
  file: File;
  previewUrl: string;
  mimeType: string;
}

const Editor: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('Remove from this image those green markers');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((selectedFiles: FileList) => {
    setErrorMessage(''); // Clear previous error messages

    const newImages: UploadedImage[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const selectedFile = selectedFiles[i];
      if (!selectedFile.type.startsWith('image/')) {
        setErrorMessage((prev) => (prev ? prev + ' ' : '') + `File "${selectedFile.name}" is not a valid image. Skipping.`);
        continue;
      }
      
      const id = `${selectedFile.name}-${Date.now()}-${Math.random()}`; // Unique ID
      newImages.push({
        id,
        file: selectedFile,
        previewUrl: URL.createObjectURL(selectedFile),
        mimeType: selectedFile.type,
      });
    }

    setUploadedImages((prev) => {
      const updatedImages = [...prev, ...newImages];
      // Revoke old object URLs when replacing images if necessary, though simpler to let browser handle on unmount
      return updatedImages;
    });
    setResultUrl(null); // Clear previous result
    setAppState(AppState.IDLE);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear input to allow re-uploading same files
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeImage = useCallback((idToRemove: string) => {
    setUploadedImages((prev) => {
      const updatedImages = prev.filter(img => img.id !== idToRemove);
      const imageToRemove = prev.find(img => img.id === idToRemove);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl); // Clean up object URL
      }
      if (updatedImages.length === 0) {
        setResultUrl(null); // Clear result if no images left
        setAppState(AppState.IDLE);
      }
      return updatedImages;
    });
  }, []);

  const clearAllImages = useCallback(() => {
    uploadedImages.forEach(img => URL.revokeObjectURL(img.previewUrl)); // Clean up all object URLs
    setUploadedImages([]);
    setResultUrl(null);
    setAppState(AppState.IDLE);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadedImages]);

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
  };

  const handleGenerate = async () => {
    if (uploadedImages.length === 0 || !prompt.trim()) {
      setErrorMessage('Please upload at least one image and provide a prompt.');
      return;
    }

    setAppState(AppState.PROCESSING);
    setErrorMessage('');

    try {
      const imagePartsPromises = uploadedImages.map(async (img) => {
        const base64Data = await convertBlobToBase64(img.file);
        return { base64Data, mimeType: img.mimeType };
      });

      const imageParts = await Promise.all(imagePartsPromises);

      const response = await editImageWithGemini(imageParts, prompt);

      if (response.success && response.image) {
        setResultUrl(response.image);
        setAppState(AppState.SUCCESS);
      } else {
        setAppState(AppState.ERROR);
        setErrorMessage(response.error || 'Failed to generate image.');
      }
    } catch (error) {
      setAppState(AppState.ERROR);
      setErrorMessage('An unexpected error occurred.');
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const hasImages = uploadedImages.length > 0;

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      
      {/* Header Section */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">
          Nano Banana <span className="text-banana-500">Editor</span>
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Upload images and describe how you want to change or combine them. Powered by the Gemini 2.5 Flash Image model.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Input */}
        <div className="flex flex-col gap-6">
          
          {/* Image Upload Area */}
          <div 
            className={`
              relative group flex flex-col items-center justify-center w-full min-h-[200px] rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden bg-white shadow-sm
              ${!hasImages ? 'border-slate-300 hover:border-banana-500 hover:bg-banana-100/10 cursor-pointer' : 'border-slate-200'}
            `}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={!hasImages ? triggerFileUpload : undefined}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
              accept="image/*"
              multiple // Allow multiple file selection
            />

            {!hasImages ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-slate-400">
                <Upload className="w-12 h-12 mb-3 text-banana-500 group-hover:scale-110 transition-transform duration-300" />
                <p className="mb-2 text-sm font-semibold text-slate-600">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-400">PNG, JPG or WebP (Multiple files supported)</p>
              </div>
            ) : (
              <div className="w-full p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {uploadedImages.map((img) => (
                  <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm group">
                    <img 
                      src={img.previewUrl} 
                      alt={`Uploaded preview ${img.id}`} 
                      className="w-full h-full object-cover"
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute top-1 right-1 p-1 bg-slate-900/60 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                      aria-label={`Remove image ${img.file.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-slate-900/60 text-white text-xs text-center truncate backdrop-blur-sm">
                      {img.file.name}
                    </div>
                  </div>
                ))}
                {/* Button to add more images */}
                <button
                  onClick={triggerFileUpload}
                  className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-banana-500 hover:text-banana-500 transition-colors bg-slate-50 hover:bg-banana-100/10"
                  aria-label="Add more images"
                >
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs font-semibold">Add More</span>
                </button>
                {/* Clear all images button */}
                <button 
                  onClick={clearAllImages}
                  className="absolute top-2 right-2 p-2 bg-slate-900/50 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-colors"
                  aria-label="Clear all images"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Prompt Input Area */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <label htmlFor="prompt" className="block text-sm font-semibold text-slate-700 mb-2">
              Editing Instructions
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Make it look like a sketch, add sunglasses, remove the background, combine elements from image 1 and 2..."
              className="w-full h-32 p-4 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-banana-400 focus:border-banana-400 focus:outline-none resize-none bg-slate-50 placeholder-slate-400 transition-all"
            />
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>Be specific for best results</span>
              </div>
              <button
                onClick={handleGenerate}
                disabled={uploadedImages.length === 0 || !prompt.trim() || appState === AppState.PROCESSING}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-slate-900 transition-all shadow-md
                  ${(uploadedImages.length === 0 || !prompt.trim() || appState === AppState.PROCESSING) 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-banana-400 hover:bg-banana-300 hover:scale-105 active:scale-95 shadow-banana-200'}
                `}
              >
                {appState === AppState.PROCESSING ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-slate-800 border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
          
          {errorMessage && (
             <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMessage}
             </div>
          )}
        </div>

        {/* Right Column: Result */}
        <div className="relative h-full min-h-[500px] lg:min-h-0">
           <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                   <ImageIcon className="w-4 h-4 text-banana-600" />
                   Result
                 </h2>
                 {resultUrl && (
                    <a 
                      href={resultUrl} 
                      download="gemini-edit.png"
                      className="text-xs font-medium text-banana-700 hover:text-banana-900 flex items-center gap-1 bg-banana-100 hover:bg-banana-200 px-3 py-1.5 rounded-lg transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </a>
                 )}
              </div>
              
              <div className="flex-1 relative bg-slate-100 flex items-center justify-center p-4">
                 {appState === AppState.PROCESSING && (
                    <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-slate-500">
                       <div className="w-16 h-16 border-4 border-banana-200 border-t-banana-500 rounded-full animate-spin mb-4"></div>
                       <p className="animate-pulse font-medium">Gemini is thinking...</p>
                    </div>
                 )}
                 
                 {resultUrl ? (
                    <img 
                      src={resultUrl} 
                      alt="Edited result" 
                      className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                    />
                 ) : (
                    <div className="text-center p-8 max-w-xs">
                       <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <Wand2 className="w-8 h-8 text-slate-400" />
                       </div>
                       <h3 className="text-lg font-medium text-slate-700 mb-1">No Result Yet</h3>
                       <p className="text-sm text-slate-400">
                          Upload images and click generate to see the magic happen here.
                       </p>
                    </div>
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Editor;
