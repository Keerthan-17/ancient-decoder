import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BoundingBox } from '../types';

interface ImageCanvasProps {
  imageSrc: string;
  onBoxComplete: (box: BoundingBox, dataUrl: string) => void;
}

export const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageSrc, onBoxComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null); // Hidden image to source data
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);

  // Initialize image and canvas sizing
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      resizeCanvas();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  const resizeCanvas = () => {
    if (!containerRef.current || !canvasRef.current || !imgRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const img = imgRef.current;

    // Calculate aspect ratio fit
    const containerAspect = container.clientWidth / container.clientHeight;
    const imgAspect = img.naturalWidth / img.naturalHeight;

    let renderWidth, renderHeight;

    if (containerAspect > imgAspect) {
      renderHeight = container.clientHeight;
      renderWidth = renderHeight * imgAspect;
    } else {
      renderWidth = container.clientWidth;
      renderHeight = renderWidth / imgAspect;
    }

    canvas.width = renderWidth;
    canvas.height = renderHeight;
    
    draw(null); // Initial draw
  };

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Drawing Logic
  const draw = useCallback((activeBox: BoundingBox | null) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw overlay to dim non-selected areas (optional, lets keep it clean for now)
    
    // Draw active box
    if (activeBox) {
      ctx.strokeStyle = '#264e86'; // Lapis color
      ctx.lineWidth = 2;
      ctx.strokeRect(activeBox.x, activeBox.y, activeBox.width, activeBox.height);
      
      ctx.fillStyle = 'rgba(38, 78, 134, 0.2)';
      ctx.fillRect(activeBox.x, activeBox.y, activeBox.width, activeBox.height);
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCoordinates(e);
    setStartPos(coords);
    setIsDrawing(true);
    setCurrentBox({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const currentPos = getCoordinates(e);
    
    const width = currentPos.x - startPos.x;
    const height = currentPos.y - startPos.y;

    const newBox = {
      x: width > 0 ? startPos.x : currentPos.x,
      y: height > 0 ? startPos.y : currentPos.y,
      width: Math.abs(width),
      height: Math.abs(height)
    };

    setCurrentBox(newBox);
    draw(newBox);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    
    if (currentBox && currentBox.width > 10 && currentBox.height > 10) {
      // Extract Image Data
      extractCrop(currentBox);
      // Reset box after a delay or immediately depending on UX
      setTimeout(() => {
        setCurrentBox(null);
        draw(null);
      }, 200);
    } else {
        // Too small, ignore
        setCurrentBox(null);
        draw(null);
    }
  };

  const extractCrop = (box: BoundingBox) => {
    if (!canvasRef.current || !imgRef.current) return;
    
    // We need to map the canvas coordinates back to the natural image coordinates
    // for highest quality inference, or just use the canvas data if resolution is sufficient.
    // Let's use canvas data for simplicity and performance in this demo.
    
    const sourceCanvas = canvasRef.current;
    
    // Create a temporary canvas for the crop
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = box.width;
    tempCanvas.height = box.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return;

    // Draw the specific region from source canvas to temp canvas
    tempCtx.drawImage(
      sourceCanvas,
      box.x, box.y, box.width, box.height, // Source
      0, 0, box.width, box.height // Dest
    );

    const dataUrl = tempCanvas.toDataURL('image/png');
    onBoxComplete(box, dataUrl);
  };

  return (
    <div className="relative w-full h-full bg-egypt-100/50 flex items-center justify-center overflow-hidden p-4">
      <div 
        ref={containerRef} 
        className="w-full h-full flex items-center justify-center relative shadow-inner"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair shadow-lg rounded-sm bg-white"
        />
      </div>
      <div className="absolute bottom-6 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm text-gray-600 font-medium pointer-events-none border border-egypt-200">
        Click and drag to select a hieroglyph
      </div>
    </div>
  );
};