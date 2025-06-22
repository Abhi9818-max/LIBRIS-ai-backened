"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Book } from "@/types";
import Image from "next/image";
import { Document, Page, pdfjs, type PDFDocumentProxy } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, Loader2, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";


// Set up the pdf.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface BookDetailViewProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onEditBook: (book: Book) => void;
  onRemoveBook: (id: string) => void;
  onUpdateProgress: (bookId: string, currentPage: number) => void;
  initialTab?: 'details' | 'read';
}

export default function BookDetailView({ book, isOpen, onClose, onEditBook, onRemoveBook, onUpdateProgress, initialTab = 'read' }: BookDetailViewProps) {
  const { toast } = useToast();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [pdfPageDimensions, setPdfPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1.0);
  const [progressColor, setProgressColor] = useState<string>('hsl(var(--primary))');

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setNumPages(0);
      setPageNumber(1);
      setPdfPageDimensions(null);
      setIsPdfLoading(true);
      setScale(1.0);
      
      // Set random color for progress circle
      const randomHue = Math.floor(Math.random() * 360);
      const randomSaturation = Math.floor(Math.random() * 30) + 70;
      const randomLightness = Math.floor(Math.random() * 20) + 50;
      setProgressColor(`hsl(${randomHue}, ${randomSaturation}%, ${randomLightness}%)`);
    }
  }, [isOpen, initialTab, book]);
  
  const onDocumentLoadSuccess = useCallback(async (pdf: PDFDocumentProxy): Promise<void> => {
    setNumPages(pdf.numPages);
    const page = await pdf.getPage(1);
    const dimensions = { width: page.view[2], height: page.view[3] };
    setPdfPageDimensions(dimensions);

    if (pdfContainerRef.current) {
        const { clientWidth } = pdfContainerRef.current;
        const initialScale = clientWidth / dimensions.width;
        setScale(initialScale > 0 ? initialScale : 1.0);
    }

    setPageNumber(book?.currentPage || 1);
    setIsPdfLoading(false);
  }, [book?.currentPage]);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("Failed to load PDF:", error);
    toast({
      title: "PDF Loading Error",
      description: "Could not load the PDF file. It might be corrupted or in an unsupported format.",
      variant: "destructive"
    });
    setIsPdfLoading(false);
  }, [toast]);
  
  const onPageRenderError = useCallback((error: Error) => {
    if (error.name === 'AbortException') {
      return;
    }
    console.error("Failed to render PDF page:", error);
    toast({
      title: "PDF Page Error",
      description: "Could not render the PDF page. It might be corrupted.",
      variant: "destructive"
    });
  }, [toast]);


  const handlePreviousPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }
  
  const handleNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  }
  
  const handleSyncProgress = () => {
    if (book) {
      onUpdateProgress(book.id, pageNumber);
      toast({
        title: "Progress Synced!",
        description: `Your progress for "${book.title}" has been saved to page ${pageNumber}.`,
      });
    }
  };

  const handleEditClick = () => {
    if (book) onEditBook(book);
  };

  const handleRemoveClick = () => {
    if (book) onRemoveBook(book.id);
  };
  
  const handleZoomIn = () => setScale(prevScale => prevScale * 1.2);
  const handleZoomOut = () => setScale(prevScale => prevScale / 1.2);
  
  const handleFitToPage = () => {
    if (!pdfContainerRef.current || !pdfPageDimensions) return;
    const { clientWidth, clientHeight } = pdfContainerRef.current;
    const { width: pageWidth, height: pageHeight } = pdfPageDimensions;
    if (pageWidth <= 0 || pageHeight <= 0) return;

    const scaleX = clientWidth / pageWidth;
    const scaleY = clientHeight / pageHeight;
    setScale(Math.min(scaleX, scaleY));
  };

  const handleFitToWidth = () => {
    if (!pdfContainerRef.current || !pdfPageDimensions) return;
    const { clientWidth } = pdfContainerRef.current;
    const { width: pageWidth } = pdfPageDimensions;
    if (pageWidth <= 0) return;
    
    setScale(clientWidth / pageWidth);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  if (!isOpen || !book) {
    return null;
  }
  
  const hasValidPdf = book.pdfDataUri && book.pdfDataUri.startsWith('data:application/pdf;base64,');

  const percentageRead = book.totalPages && book.currentPage && book.totalPages > 0
    ? Math.round((book.currentPage / book.totalPages) * 100)
    : 0;
    
  const isComplete = percentageRead >= 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-4xl lg:max-w-6xl h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 border-b shrink-0">
          <DialogTitle className="font-headline text-xl sm:text-2xl truncate pr-10">{book.title || "Untitled Book"}</DialogTitle>
          <DialogDescription className="text-sm sm:text-md">
            By: {book.author || "Unknown Author"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'details' | 'read')} className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="mx-auto w-fit mt-2 px-4 shrink-0">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="read" disabled={!hasValidPdf}>Read</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="flex-grow overflow-y-auto p-4 md:p-6">
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <div className="md:col-span-1 flex flex-col items-center">
                <div className="aspect-[2/3] w-full max-w-[200px] relative rounded-md overflow-hidden shadow-lg">
                  <Image
                    src={book.coverImageUrl || "https://placehold.co/200x300.png"}
                    alt={`Cover of ${book.title}`}
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="book cover"
                  />
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button onClick={handleEditClick} size="sm"><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
                  <Button variant="outline" onClick={handleRemoveClick} size="sm"><Trash2 className="mr-2 h-4 w-4" /> Remove</Button>
                </div>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-headline text-lg text-foreground">Summary</h3>
                  <ScrollArea className="h-48 border rounded-md p-3">
                    <p className="text-sm text-muted-foreground">{book.summary || "No summary available."}</p>
                  </ScrollArea>
                </div>
                 <div className="space-y-2">
                    <h3 className="font-headline text-lg text-foreground">Information</h3>
                    <div className="flex flex-wrap gap-2">
                       {book.category && <Badge variant="secondary">Category: {book.category}</Badge>}
                       {book.totalPages && <Badge variant="secondary">Pages: {book.totalPages}</Badge>}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <h3 className="font-headline text-lg text-foreground">Reading Progress</h3>
                    {book.totalPages && book.totalPages > 0 ? (
                      <div className="flex items-center space-x-4 pt-2">
                        <div className="relative h-20 w-20 flex-shrink-0">
                          <svg className="h-full w-full" viewBox="0 0 36 36">
                            <circle
                              cx="18"
                              cy="18"
                              r="15.9155"
                              fill="none"
                              className="stroke-current text-muted/20"
                              strokeWidth="2"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.9155"
                              fill="none"
                              stroke={progressColor}
                              strokeWidth="2"
                              strokeDasharray={isComplete ? undefined : `${percentageRead}, 100`}
                              strokeLinecap="round"
                              className="origin-center -rotate-90 transition-all duration-300 ease-in-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-semibold text-foreground">
                              {isComplete ? '100' : percentageRead}<span className="text-xs">%</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-lg font-medium text-foreground">
                            {isComplete ? "Completed!" : "In Progress"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            You are on page {book.currentPage || 'N/A'} of {book.totalPages}.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pt-2">No progress tracked for this book.</p>
                    )}
                 </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="read" className="flex-grow flex flex-col overflow-hidden data-[state=inactive]:hidden">
             {hasValidPdf ? (
             <div className="flex-grow flex flex-col overflow-hidden">
              <div className="flex-grow bg-muted/40 overflow-auto" ref={pdfContainerRef}>
                  <div className="flex justify-center transition-transform duration-200 ease-in-out">
                      {isPdfLoading && (
                        <div className="flex flex-col items-center justify-center h-full w-full absolute inset-0">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="mt-4 text-muted-foreground">Loading PDF...</p>
                        </div>
                      )}
                     <Document
                       file={book.pdfDataUri}
                       onLoadSuccess={onDocumentLoadSuccess}
                       onLoadError={onDocumentLoadError}
                       loading="" 
                       className={isPdfLoading ? 'hidden' : ''}
                     >
                       <Page 
                          key={`${book.id}-${pageNumber}`}
                          pageNumber={pageNumber} 
                          scale={scale}
                          renderTextLayer={true}
                          onRenderError={onPageRenderError}
                          className="transition-opacity duration-300"
                       />
                     </Document>
                  </div>
              </div>
              <div className="p-2 border-t flex items-center justify-between shrink-0">
                  <div className="flex items-center justify-start w-1/3 space-x-1">
                    <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In"><ZoomIn className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={handleFitToWidth} title="Fit to Width"><Maximize2 className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={handleFitToPage} title="Fit to Page"><Minimize2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-center space-x-2 w-1/3">
                      <Button variant="outline" size="icon" onClick={handlePreviousPage} disabled={pageNumber <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                      <span className="text-sm font-medium text-muted-foreground tabular-nums whitespace-nowrap">
                          Page {pageNumber} of {numPages || '...'}
                      </span>
                      <Button variant="outline" size="icon" onClick={handleNextPage} disabled={!numPages || pageNumber >= numPages}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex items-center justify-end w-1/3">
                      <Button onClick={handleSyncProgress} size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Sync Progress</span>
                      </Button>
                  </div>
              </div>
            </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-full">
                <p className="text-muted-foreground">No PDF available for this book.</p>
             </div>
           )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
