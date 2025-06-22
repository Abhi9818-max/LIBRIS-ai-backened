
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Book } from "@/types";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react";

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
  
  // For responsive PDF width
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [pdfPageWidth, setPdfPageWidth] = useState<number | undefined>();

  useEffect(() => {
    // This effect sets up a ResizeObserver to dynamically adjust the PDF page width
    // based on its container's size. This is crucial for responsiveness on mobile.
    if (typeof window === 'undefined' || !pdfContainerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setPdfPageWidth(entry.contentRect.width);
      }
    });

    observer.observe(pdfContainerRef.current);

    return () => {
      // Cleanup observer on component unmount or when dialog closes
      if (pdfContainerRef.current) {
        observer.unobserve(pdfContainerRef.current);
      }
    };
  }, [isOpen]); // Rerun the effect when the dialog's open state changes

  useEffect(() => {
    if (book?.currentPage) {
      setPageNumber(book.currentPage);
    } else {
      setPageNumber(1);
    }
    // We only want this to run when the book prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);


  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }): void => {
    setNumPages(numPages);
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
      onClose();
    }
  };


  if (!isOpen || !book) {
    return null;
  }
  
  const hasValidPdf = book.pdfDataUri && book.pdfDataUri.startsWith('data:application/pdf;base64,');

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-4xl lg:max-w-6xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 border-b">
          <DialogTitle className="font-headline text-xl sm:text-2xl truncate pr-10">{book.title || "Untitled Book"}</DialogTitle>
          <DialogDescription className="text-sm sm:text-md">By: {book.author || "Unknown Author"}</DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-1 sm:p-2 bg-muted/40" ref={pdfContainerRef}>
           {hasValidPdf ? (
             <div className="flex justify-center items-start">
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
                    renderTextLayer={true}
                    width={pdfPageWidth}
                 />
               </Document>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-96">
                <p className="text-muted-foreground">No PDF available for this book.</p>
             </div>
           )}
        </div>

        <DialogFooter className="p-2 sm:p-4 border-t flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <div className="flex items-center justify-center space-x-2">
            <Button variant="outline" onClick={handleEditClick}>
              <Pencil className="mr-2 h-4 w-4" /> Edit Details
            </Button>
            <Button variant="destructive" onClick={handleRemoveClick}>
              <Trash2 className="mr-2 h-4 w-4" /> Remove
            </Button>
          </div>

          {hasValidPdf && numPages > 0 && (
            <div className="flex items-center justify-center space-x-2">
              <Button variant="outline" size="icon" onClick={handlePreviousPage} disabled={pageNumber <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground tabular-nums">
                Page {pageNumber} of {numPages}
              </span>
              <Button variant="outline" size="icon" onClick={handleNextPage} disabled={pageNumber >= numPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button onClick={handleSyncProgress}>
                <RefreshCw className="mr-2 h-4 w-4" /> Sync Progress
              </Button>
            </div>
          )}
          
          <Button variant="outline" onClick={onClose} className="sm:absolute sm:right-4 sm:top-1/2 sm:-translate-y-1/2">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
