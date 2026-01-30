"use client";

import { useState, useRef, useCallback } from "react";
import { 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  FileText,
  Table,
  ChevronLeft,
  ChevronRight,
  GripVertical
} from "lucide-react";

interface DocumentPreviewLayoutProps {
  documentViewer: React.ReactNode;
  extractedData: React.ReactNode;
  filename: string;
  isExcel?: boolean;
}

/**
 * Side-by-side layout for document review
 * Shows document preview on left and extracted data on right
 * Includes resizable divider and zoom controls
 */
export function DocumentPreviewLayout({
  documentViewer,
  extractedData,
  filename,
  isExcel = false,
}: DocumentPreviewLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [isDocCollapsed, setIsDocCollapsed] = useState(false);
  const [isDataCollapsed, setIsDataCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Limit to 20-80% range
    setLeftWidth(Math.min(80, Math.max(20, newLeftWidth)));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove event listeners for drag
  useState(() => {
    if (typeof window !== "undefined") {
      if (isResizing) {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
          window.removeEventListener("mousemove", handleMouseMove);
          window.removeEventListener("mouseup", handleMouseUp);
        };
      }
    }
  });

  // Quick resize presets
  const setPreset = (preset: "balanced" | "document" | "data") => {
    switch (preset) {
      case "balanced":
        setLeftWidth(50);
        setIsDocCollapsed(false);
        setIsDataCollapsed(false);
        break;
      case "document":
        setLeftWidth(70);
        setIsDocCollapsed(false);
        setIsDataCollapsed(false);
        break;
      case "data":
        setLeftWidth(30);
        setIsDocCollapsed(false);
        setIsDataCollapsed(false);
        break;
    }
  };

  const toggleDocCollapse = () => {
    if (isDocCollapsed) {
      setLeftWidth(50);
      setIsDocCollapsed(false);
    } else {
      setLeftWidth(0);
      setIsDocCollapsed(true);
    }
    setIsDataCollapsed(false);
  };

  const toggleDataCollapse = () => {
    if (isDataCollapsed) {
      setLeftWidth(50);
      setIsDataCollapsed(false);
    } else {
      setLeftWidth(100);
      setIsDataCollapsed(true);
    }
    setIsDocCollapsed(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border border-stone-200 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-700">Visa:</span>
          <div className="flex items-center bg-stone-100 rounded-lg p-0.5">
            <button
              onClick={() => setPreset("document")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                leftWidth > 60 && !isDocCollapsed 
                  ? "bg-white text-stone-900 shadow-sm" 
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              Dokument
            </button>
            <button
              onClick={() => setPreset("balanced")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                leftWidth >= 40 && leftWidth <= 60 && !isDocCollapsed && !isDataCollapsed
                  ? "bg-white text-stone-900 shadow-sm" 
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Balanserad
            </button>
            <button
              onClick={() => setPreset("data")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                leftWidth < 40 && !isDataCollapsed 
                  ? "bg-white text-stone-900 shadow-sm" 
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Table className="w-3.5 h-3.5 inline mr-1" />
              Data
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDocCollapse}
            className={`p-1.5 rounded-lg transition-colors ${
              isDocCollapsed 
                ? "bg-indigo-100 text-indigo-700" 
                : "text-stone-500 hover:bg-stone-100"
            }`}
            title={isDocCollapsed ? "Visa dokument" : "Dölj dokument"}
          >
            {isDocCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleDataCollapse}
            className={`p-1.5 rounded-lg transition-colors ${
              isDataCollapsed 
                ? "bg-indigo-100 text-indigo-700" 
                : "text-stone-500 hover:bg-stone-100"
            }`}
            title={isDataCollapsed ? "Visa data" : "Dölj data"}
          >
            {isDataCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main split view */}
      <div 
        ref={containerRef}
        className={`flex flex-1 border-x border-b border-stone-200 rounded-b-xl overflow-hidden bg-white ${
          isResizing ? "select-none cursor-col-resize" : ""
        }`}
      >
        {/* Left panel - Document */}
        {!isDocCollapsed && (
          <div 
            className="relative overflow-auto bg-stone-50"
            style={{ width: `${leftWidth}%` }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 bg-stone-100/90 backdrop-blur-sm border-b border-stone-200">
              <div className="flex items-center gap-2">
                {isExcel ? (
                  <Table className="w-4 h-4 text-emerald-600" />
                ) : (
                  <FileText className="w-4 h-4 text-red-600" />
                )}
                <span className="text-xs font-medium text-stone-700 truncate max-w-[200px]" title={filename}>
                  {filename}
                </span>
              </div>
            </div>
            
            <div className="p-4">
              {documentViewer}
            </div>
          </div>
        )}

        {/* Resizer */}
        {!isDocCollapsed && !isDataCollapsed && (
          <div
            className={`relative w-1 bg-stone-200 hover:bg-indigo-400 cursor-col-resize transition-colors flex-shrink-0 group ${
              isResizing ? "bg-indigo-500" : ""
            }`}
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1 bg-white rounded shadow-sm border border-stone-200 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3 text-stone-400" />
            </div>
          </div>
        )}

        {/* Right panel - Extracted Data */}
        {!isDataCollapsed && (
          <div 
            className="relative overflow-auto"
            style={{ width: isDocCollapsed ? "100%" : `${100 - leftWidth}%` }}
          >
            <div className="sticky top-0 z-10 flex items-center px-3 py-2 bg-white/90 backdrop-blur-sm border-b border-stone-200">
              <Table className="w-4 h-4 text-indigo-600 mr-2" />
              <span className="text-xs font-medium text-stone-700">Extraherad data</span>
            </div>
            
            <div className="p-4">
              {extractedData}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * PDF Viewer with zoom controls
 */
export function PDFViewer({ 
  url, 
  className = "" 
}: { 
  url: string; 
  className?: string;
}) {
  const [zoom, setZoom] = useState(100);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Zoom controls */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setZoom(z => Math.max(50, z - 25))}
          disabled={zoom <= 50}
          className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zooma ut"
        >
          <ZoomOut className="w-4 h-4 text-stone-600" />
        </button>
        <span className="text-xs font-medium text-stone-600 w-12 text-center">{zoom}%</span>
        <button
          onClick={() => setZoom(z => Math.min(200, z + 25))}
          disabled={zoom >= 200}
          className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zooma in"
        >
          <ZoomIn className="w-4 h-4 text-stone-600" />
        </button>
        <button
          onClick={() => setZoom(100)}
          className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200"
          title="Återställ zoom"
        >
          <RotateCw className="w-4 h-4 text-stone-600" />
        </button>
      </div>

      {/* PDF embed */}
      <div 
        className="border border-stone-200 rounded-lg overflow-hidden bg-white shadow-sm"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
      >
        <iframe
          src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
          className="w-full h-[600px]"
          title="PDF Preview"
        />
      </div>
    </div>
  );
}
