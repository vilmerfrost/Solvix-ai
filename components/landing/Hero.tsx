"use client";

import { ArrowRight, FileText, Upload, CheckCircle, FileSpreadsheet, Receipt } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const SCENARIOS = [
  {
    id: "receipt",
    label: "INPUT: RECEIPT_SCAN",
    icon: <Receipt className="w-6 h-6 text-neutral-300" />,
    data: {
      vendor: "Nordfrakt AB",
      date: "2024-02-08",
      total: "2490.00",
      currency: "SEK",
      items_count: 12
    }
  },
  {
    id: "waybill",
    label: "INPUT: WAYBILL_PDF",
    icon: <FileSpreadsheet className="w-6 h-6 text-neutral-300" />,
    data: {
      vendor: "DHL Freight",
      date: "2024-02-09",
      weight: "1250 kg",
      sender: "Volvo AB",
      items_count: 4
    }
  },
  {
    id: "invoice",
    label: "INPUT: INVOICE_IMG",
    icon: <FileText className="w-6 h-6 text-neutral-300" />,
    data: {
      vendor: "Vattenfall",
      date: "2024-02-10",
      total: "14500.00",
      due_date: "2024-03-10",
      items_count: 1
    }
  }
];

export function Hero() {
  const router = useRouter();
  const [activeScenario, setActiveScenario] = useState(0);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Auto-cycle scenarios
  useEffect(() => {
    if (droppedFile) return;
    
    const interval = setInterval(() => {
      setActiveScenario((prev) => (prev + 1) % SCENARIOS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [droppedFile]);

  // Dropzone logic
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setDroppedFile(acceptedFiles[0]);
      setIsProcessing(true);
      setShowResult(false);
      
      // Simulate processing
      setTimeout(() => {
        setIsProcessing(false);
        setShowResult(true);
      }, 1200);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: false,
    accept: {
      'image/*': [],
      'application/pdf': []
    }
  });

  const handleStartProcess = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExiting(true);
    // Wait for animation
    setTimeout(() => {
      router.push("/signup");
    }, 500);
  };

  const currentScenario = SCENARIOS[activeScenario];

  return (
    <motion.section 
      className="pt-32 pb-20 px-6 border-b border-neutral-200 overflow-hidden"
      animate={isExiting ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-12 gap-12 lg:gap-24 items-center">
        
        {/* Left Column: The Pitch */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 border border-neutral-900 px-3 py-1 mb-8 w-fit bg-neutral-900 text-white">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-mono tracking-widest uppercase font-bold">System Online v2.4</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter text-neutral-900 mb-8 leading-[0.9]">
            KAOTISKA<br/>
            FÖLJESEDLAR<br/>
            <span className="text-neutral-400">→</span> REN EXCEL.
          </h1>
          
          <p className="text-lg text-neutral-600 mb-10 max-w-md font-medium leading-relaxed">
            Eliminera manuell inmatning. Solvix.ai omvandlar ostrukturerade PDF:er och bilder till strukturerad data med 99.8% precision.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <a
              href="/signup"
              onClick={handleStartProcess}
              className="bg-neutral-900 text-white px-8 py-4 text-base font-bold tracking-wide hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              STARTA PROCESSEN
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <Link
              href="#demo"
              className="px-8 py-4 text-base font-bold tracking-wide border-2 border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 transition-all flex items-center justify-center text-neutral-900"
            >
              SE DEMO
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-8 border-t border-neutral-200">
            <div className="flex flex-col">
              <span className="text-xs font-mono text-neutral-500 uppercase mb-1">BEARBETNINGSTID</span>
              <span className="text-2xl font-bold font-mono text-neutral-900">0.4s<span className="text-sm text-neutral-400 font-normal ml-1">/ sida</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-mono text-neutral-500 uppercase mb-1">NOGGRANNHET</span>
              <span className="text-2xl font-bold font-mono text-neutral-900">99.8%<span className="text-sm text-neutral-400 font-normal ml-1">verifierad</span></span>
            </div>
          </div>
        </div>

        {/* Right Column: The Proof (Technical Viz) */}
        <div className="lg:col-span-7 relative">
          <div className="relative border-2 border-neutral-900 bg-neutral-50 p-2 shadow-[10px_10px_0px_0px_rgba(23,23,23,1)]">
            {/* Window Chrome */}
            <div className="flex items-center justify-between border-b-2 border-neutral-200 bg-white px-4 py-2 mb-2">
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveScenario(i);
                      setDroppedFile(null); // Reset dropped file when switching
                      setShowResult(false);
                    }}
                    className={`w-3 h-3 rounded-full border transition-all ${
                      activeScenario === i 
                        ? "bg-neutral-900 border-neutral-900 scale-110" 
                        : "border-neutral-300 hover:border-neutral-400"
                    }`}
                    title={`Scenario ${i + 1}`}
                  />
                ))}
              </div>
              <div className="text-xs font-mono text-neutral-400">PIPELINE_PREVIEW_MODE</div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 h-[500px]">
              {/* Input: The Receipt / Dropzone */}
              <div 
                {...getRootProps()}
                className={`bg-white border transition-colors relative overflow-hidden group cursor-pointer ${
                  isDragActive ? "border-green-500 bg-green-50" : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <input {...getInputProps()} />
                
                <div className="absolute top-2 left-2 z-10 bg-neutral-900 text-white text-[10px] font-mono px-2 py-1">
                  {droppedFile ? "INPUT: USER_UPLOAD" : currentScenario.label}
                </div>

                <div className="h-full flex items-center justify-center p-6">
                  {droppedFile ? (
                     <div className="text-center">
                       <div className="w-16 h-16 bg-neutral-100 rounded-lg flex items-center justify-center mx-auto mb-4 border border-neutral-200">
                         <FileText className="w-8 h-8 text-neutral-400" />
                       </div>
                       <p className="font-mono text-sm font-bold text-neutral-900 truncate max-w-[200px] mx-auto">
                         {droppedFile.name}
                       </p>
                       <p className="text-xs text-neutral-500 mt-1">
                         {(droppedFile.size / 1024).toFixed(1)} KB
                       </p>
                       {isProcessing && (
                         <div className="mt-4 flex flex-col items-center">
                           <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden w-24">
                             <div className="h-full bg-green-500 animate-[loading_1s_ease-in-out_infinite]"></div>
                           </div>
                           <span className="text-[10px] font-mono text-neutral-400 mt-2">PROCESSING...</span>
                         </div>
                       )}
                     </div>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeScenario}
                        initial={{ opacity: 0, rotate: -5, scale: 0.9 }}
                        animate={{ opacity: 0.8, rotate: 1, scale: 0.95 }}
                        exit={{ opacity: 0, rotate: 5, scale: 0.9 }}
                        transition={{ duration: 0.4 }}
                        className="w-full max-w-[280px] bg-white border border-neutral-200 shadow-sm p-6 text-xs font-mono text-neutral-400 space-y-4 select-none"
                      >
                        <div className="w-12 h-12 border-2 border-neutral-200 mb-4 rounded-full flex items-center justify-center">
                          {currentScenario.icon}
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 bg-neutral-100 w-1/2"></div>
                          <div className="h-2 bg-neutral-100 w-3/4"></div>
                        </div>
                        <div className="border-t border-dashed border-neutral-200 my-4"></div>
                        <div className="space-y-2">
                          <div className="flex justify-between"><span className="bg-neutral-100 text-transparent">Item</span><span className="bg-neutral-100 text-transparent">0.00</span></div>
                          <div className="flex justify-between"><span className="bg-neutral-100 text-transparent">Item</span><span className="bg-neutral-100 text-transparent">0.00</span></div>
                        </div>
                        <div className="border-t border-neutral-900 my-4 pt-2 flex justify-between font-bold text-neutral-900">
                          <span>TOTAL</span>
                          <span>SEK ...</span>
                        </div>
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm">
                          <div className="bg-neutral-900 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2">
                            <Upload className="w-3 h-3" />
                            DROP FILE TO TEST
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>

                {/* Scanning line animation */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.5)] ${isProcessing || !droppedFile ? "animate-[scan_3s_ease-in-out_infinite]" : "hidden"}`}></div>
              </div>

              {/* Output: The Data */}
              <div className="bg-neutral-900 p-4 text-green-400 font-mono text-xs overflow-hidden relative">
                <div className="absolute top-2 left-2 z-10 border border-green-500/30 bg-green-500/10 text-green-400 px-2 py-1">OUTPUT: JSON_STREAM</div>
                
                {showResult && droppedFile ? (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4"
                   >
                     <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
                     <h3 className="text-white font-bold text-lg">Extraction Complete</h3>
                     <p className="text-neutral-400 max-w-[200px]">
                       Analyzed <span className="text-white">{droppedFile.name}</span> with 99.8% confidence.
                     </p>
                     <div className="pt-4 w-full">
                       <a 
                         href="/signup"
                         onClick={handleStartProcess}
                         className="block w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-4 transition-colors"
                       >
                         SIGN UP TO EXPORT
                       </a>
                       <p className="text-[10px] text-neutral-500 mt-2 uppercase tracking-wide">NO CREDIT CARD REQUIRED</p>
                     </div>
                   </motion.div>
                ) : (
                  <div className="mt-8 space-y-1 opacity-90">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={droppedFile ? "processing" : activeScenario}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                         <p><span className="text-green-600">{`{`}</span></p>
                         <p className="pl-4"><span className="text-white">"status"</span>: <span className="text-green-300">"success"</span>,</p>
                         <p className="pl-4"><span className="text-white">"confidence"</span>: <span className="text-green-300">0.998</span>,</p>
                         <p className="pl-4"><span className="text-white">"data"</span>: <span className="text-green-600">{`{`}</span></p>
                         
                         {Object.entries(currentScenario.data).map(([key, value]) => (
                           <p key={key} className="pl-8">
                             <span className="text-white">"{key}"</span>: <span className="text-yellow-300">
                               {typeof value === 'number' ? value : `"${value}"`}
                             </span>,
                           </p>
                         ))}

                         <p className="pl-8"><span className="text-white">"items"</span>: <span className="text-green-600">{`[`}</span></p>
                         <p className="pl-12"><span className="text-gray-500">/* {currentScenario.data.items_count || 12} items extracted */</span></p>
                         <p className="pl-8"><span className="text-green-600">{`]`}</span></p>
                         <p className="pl-4"><span className="text-green-600">{`}`}</span></p>
                         <p><span className="text-green-600">{`}`}</span></p>
                         <div className="mt-4 border-t border-green-900 pt-2 text-green-700">
                           <p>{`> Exporting to Azure Blob Storage...`}</p>
                           <p>{`> Syncing with Fortnox...`}</p>
                           <p className="text-white animate-pulse">{`> Done.`}</p>
                         </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
