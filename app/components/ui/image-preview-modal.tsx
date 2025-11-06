import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './dialog';
import { Button } from './button';
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { buildBackendUrl } from '@/lib/config';

interface ImagePreviewModalProps {
  images: Array<{
    fileName: string;
    fileUrl: string;
    fileSize?: number;
  }>;
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImagePreviewModal({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}: ImagePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  // Reset zoom when image changes
  useEffect(() => {
    setZoom(100);
  }, [currentIndex]);

  // Reset index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(100);
    }
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasMultipleImages && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (hasMultipleImages && currentIndex < images.length - 1) {
            setCurrentIndex(currentIndex + 1);
          }
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
        case '_':
          handleZoomOut();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, hasMultipleImages]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = buildBackendUrl(currentImage.fileUrl);
    link.download = currentImage.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!currentImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 bg-black/95">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate">
                {currentImage.fileName}
              </h3>
              {currentImage.fileSize && (
                <p className="text-sm text-gray-300">
                  {formatFileSize(currentImage.fileSize)}
                  {hasMultipleImages && ` • ${currentIndex + 1} of ${images.length}`}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="h-8 w-8 p-0 hover:bg-white/20 text-white"
                  title="Zoom out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium px-2 min-w-[4rem] text-center">
                  {zoom}%
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="h-8 w-8 p-0 hover:bg-white/20 text-white"
                  title="Zoom in (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              {/* Download Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownload}
                className="h-8 w-8 p-0 hover:bg-white/20 text-white"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </Button>

              {/* Close Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-white/20 text-white"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Image Container */}
        <div className="relative w-full h-full flex items-center justify-center overflow-auto p-16">
          <img
            src={buildBackendUrl(currentImage.fileUrl)}
            alt={currentImage.fileName}
            style={{
              width: `${zoom}%`,
              height: 'auto',
              maxWidth: 'none',
            }}
            className="object-contain select-none transition-all duration-200"
            draggable={false}
          />
        </div>

        {/* Navigation Buttons */}
        {hasMultipleImages && (
          <>
            {/* Previous Button */}
            {currentIndex > 0 && (
              <Button
                size="lg"
                variant="ghost"
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                title="Previous (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}

            {/* Next Button */}
            {currentIndex < images.length - 1 && (
              <Button
                size="lg"
                variant="ghost"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                title="Next (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="absolute bottom-4 right-4 bg-black/80 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm">
          <div className="flex flex-col gap-1">
            <div><kbd className="px-1.5 py-0.5 bg-white/20 rounded">←</kbd> <kbd className="px-1.5 py-0.5 bg-white/20 rounded">→</kbd> Navigate</div>
            <div><kbd className="px-1.5 py-0.5 bg-white/20 rounded">+</kbd> <kbd className="px-1.5 py-0.5 bg-white/20 rounded">-</kbd> Zoom</div>
            <div><kbd className="px-1.5 py-0.5 bg-white/20 rounded">Esc</kbd> Close</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
