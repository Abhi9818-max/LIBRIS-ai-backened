
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Book } from "@/types";
import { Document, Page, pdfjs, type PDFDocumentProxy } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, Loader2, ArrowLeftRight, Maximize } from "lucide-react";

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
}

export default function BookDetailView({ book, isOpen, onClose, onEditBook, onRemoveBook, onUpdateProgress }: BookDetailViewProps) {
  const { toast } = useToast();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [scale, setScale] = useState(1.0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(async (pdf: PDFDocumentProxy): Promise<void> => {
    setNumPages(pdf.numPages);
    const page = await pdf.getPage(1);
    setPageDimensions({ width: page.view[2], height: page.view[3] });
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
  
  const handleFitToWidth = useCallback(() => {
    if (pdfContainerRef.current && pageDimensions) {
      const containerWidth = pdfContainerRef.current.clientWidth;
       // Add some padding to prevent horizontal scrollbars
      setScale((containerWidth - 20) / pageDimensions.width);
    }
  }, [pageDimensions]);

  // Set initial scale to "fit-to-width" once PDF dimensions are known
  useEffect(() => {
    if (pageDimensions && pdfContainerRef.current) {
      handleFitToWidth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageDimensions]);


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

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsPdfLoading(true); // Reset loading state for next open
      setPageDimensions(null); // Reset dimensions
      onClose();
    }
  };

  const handleFitToPage = useCallback(() => {
    if (pdfContainerRef.current && pageDimensions) {
      const containerWidth = pdfContainerRef.current.clientWidth;
      const containerHeight = pdfContainerRef.current.clientHeight;
      const scaleWidth = (containerWidth - 20) / pageDimensions.width;
      const scaleHeight = (containerHeight - 20) / pageDimensions.height;
      setScale(Math.min(scaleWidth, scaleHeight));
    }
  }, [pageDimensions]);
  
   useEffect(() => {
    const handleResize = () => {
      // Re-apply fit-to-width on resize to ensure it stays responsive
      if (pdfContainerRef.current && pageDimensions) {
        handleFitToWidth();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pageDimensions, handleFitToWidth]);


  if (!isOpen || !book) {
    return null;
  }
  
  const hasValidPdf = book.pdfDataUri && book.pdfDataUri.startsWith('data:application/pdf;base64,');

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-4xl lg:max-w-6xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 border-b">
          <DialogTitle className="font-headline text-xl sm:text-2xl truncate pr-10">{book.title || "Untitled Book"}</DialogTitle>
          <DialogDescription className="text-sm sm:text-md">
            By: {book.author || "Unknown Author"}
            {book.category && <span className="mx-2">|</span>}
            {book.category && <span className="font-medium">{book.category}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-auto p-1 sm:p-2 bg-muted/40" ref={pdfContainerRef}>
           {hasValidPdf ? (
             <div 
                className="flex justify-center items-start"
                style={{'--scale-factor': scale} as React.CSSProperties}
              >
              {isPdfLoading && (
                <div className="flex flex-col items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">Loading PDF...</p>
                </div>
              )}
               <Document
                 file={book.pdfDataUri}
                 onLoadSuccess={onDocumentLoadSuccess}
                 onLoadError={onDocumentLoadError}
                 loading="" // Hide default loader, we use our own
                 className={isPdfLoading ? 'hidden' : ''}
               >
                 <Page 
                    pageNumber={pageNumber} 
                    scale={scale}
                    renderTextLayer={true}
                 />
               </Document>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-96">
                <p className="text-muted-foreground">No PDF available for this book.</p>
             </div>
           )}
        </div>

        <DialogFooter className="p-2 sm:p-4 border-t grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
            {/* Left Actions */}
            <div className="flex items-center justify-center sm:justify-start space-x-2">
                <Button variant="outline" size="sm" onClick={handleEditClick}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
                <Button variant="destructive" size="sm" onClick={handleRemoveClick}><Trash2 className="mr-2 h-4 w-4" /> Remove</Button>
            </div>

            {/* Center Navigation */}
            {hasValidPdf && numPages > 0 && (
                <div className="flex items-center justify-center space-x-2">
                    <Button variant="outline" size="icon" onClick={handlePreviousPage} disabled={pageNumber <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm font-medium text-muted-foreground tabular-nums whitespace-nowrap">
                        Page {pageNumber} of {numPages}
                    </span>
                    <Button variant="outline" size="icon" onClick={handleNextPage} disabled={pageNumber >= numPages}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            )}

            {/* Right Actions */}
            {hasValidPdf && numPages > 0 && (
                <div className="flex items-center justify-center sm:justify-end space-x-2">
                    <Button variant="outline" size="sm" onClick={handleFitToWidth}><ArrowLeftRight className="mr-2 h-4 w-4" />Width</Button>
                    <Button variant="outline" size="sm" onClick={handleFitToPage}><Maximize className="mr-2 h-4 w-4" />Page</Button>
                    <Button onClick={handleSyncProgress} size="sm"><RefreshCw className="mr-2 h-4 w-4" /> Sync</Button>
                </div>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
