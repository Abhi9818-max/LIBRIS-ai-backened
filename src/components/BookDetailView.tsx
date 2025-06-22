
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Book } from "@/types";
import { Document, Page, pdfjs, type PDFDocumentProxy } from 'react-pdf';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, Loader2, ArrowLeftRight, Maximize, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


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

const RENDER_SCALE = 1.5; // Render at 150% scale for better zoom quality

export default function BookDetailView({ book, isOpen, onClose, onEditBook, onRemoveBook, onUpdateProgress }: BookDetailViewProps) {
  const { toast } = useToast();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [minScale, setMinScale] = useState(0.2); // State for minimum zoom scale

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const transformComponentRef = useRef<any>(null);


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
    if (transformComponentRef.current?.instance && pdfContainerRef.current && pageDimensions) {
      const { setTransform } = transformComponentRef.current;
      const containerWidth = pdfContainerRef.current.clientWidth;
      const PADDING = 40;
      const visualScale = (containerWidth - PADDING) / (pageDimensions.width * RENDER_SCALE);
      setTransform(0, 0, visualScale, 300); // panX, panY, scale, animationTime
    }
  }, [pageDimensions]);
  
  const handleFitToPage = useCallback(() => {
    if (transformComponentRef.current?.instance && pdfContainerRef.current && pageDimensions) {
      const { setTransform } = transformComponentRef.current;
      const containerWidth = pdfContainerRef.current.clientWidth;
      const containerHeight = pdfContainerRef.current.clientHeight;
      const PADDING = 40;
      const scaleX = (containerWidth - PADDING) / (pageDimensions.width * RENDER_SCALE);
      const scaleY = (containerHeight - PADDING) / (pageDimensions.height * RENDER_SCALE);
      const visualScale = Math.min(scaleX, scaleY);
      setTransform(0, 0, visualScale, 300);
    }
  }, [pageDimensions]);

  const onPageRenderError = useCallback((error: Error) => {
    // The "AbortException" is a non-critical error that `react-pdf` throws when a user
    // navigates between pages too quickly. We can safely ignore it.
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


  // Set initial scale and calculate minimum zoom level once PDF dimensions are known
  useEffect(() => {
    // A small delay ensures the container has its final dimensions before we calculate scales.
    const timer = setTimeout(() => {
        if (isOpen && pageDimensions && pdfContainerRef.current && transformComponentRef.current?.instance) {
            const { setTransform } = transformComponentRef.current;
            const containerWidth = pdfContainerRef.current.clientWidth;
            const containerHeight = pdfContainerRef.current.clientHeight;
            const PADDING = 40; // visual padding inside the container

            // Calculate fit-to-width scale for initial view
            const fitToWidthScale = (containerWidth - PADDING) / (pageDimensions.width * RENDER_SCALE);
            setTransform(0, 0, fitToWidthScale, 0);

            // Calculate fit-to-page scale to use as the minimum zoom level
            const scaleX = (containerWidth - PADDING) / (pageDimensions.width * RENDER_SCALE);
            const scaleY = (containerHeight - PADDING) / (pageDimensions.height * RENDER_SCALE);
            const fitToPageScale = Math.min(scaleX, scaleY);
            
            // We set the minScale to a value slightly less than fit-to-page
            // to give a little wiggle room and prevent getting stuck at the exact limit.
            setMinScale(fitToPageScale * 0.98); 
        }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, pageDimensions]);


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
      setMinScale(0.2); // Reset min scale to default
      onClose();
    }
  };
  
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

        <div className="flex-grow overflow-hidden p-1 sm:p-2 bg-muted/40" ref={pdfContainerRef}>
           {hasValidPdf ? (
             <TransformWrapper
                ref={transformComponentRef}
                initialScale={1}
                minScale={minScale}
                maxScale={10}
                limitToBounds={true}
                panning={{
                    velocityDisabled: true,
                    disableOnPinch: true // Prevents panning while zooming, which is smoother for trackpads
                }}
                wheel={{
                    touchpadMode: true // Improves trackpad pinch-to-zoom gesture detection
                }}
              >
                <TransformComponent
                  wrapperStyle={{ width: '100%', height: '100%' }}
                  contentStyle={{ width: 'auto', height: 'auto' }}
                >
                  <div 
                    style={{'--scale-factor': RENDER_SCALE} as React.CSSProperties}
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
                        scale={RENDER_SCALE}
                        renderTextLayer={true}
                        onRenderError={onPageRenderError}
                     />
                   </Document>
                  </div>
                </TransformComponent>
             </TransformWrapper>
           ) : (
             <div className="flex flex-col items-center justify-center h-96">
                <p className="text-muted-foreground">No PDF available for this book.</p>
             </div>
           )}
        </div>

        <DialogFooter className="p-2 sm:p-4 border-t grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
            {/* Left Actions - now a dropdown */}
            <div className="flex items-center justify-center sm:justify-start">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={handleEditClick}>
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Edit Book Details</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleFitToWidth}>
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    <span>Fit to Width</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleFitToPage}>
                    <Maximize className="mr-2 h-4 w-4" />
                    <span>Fit to Page</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleRemoveClick} className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Remove Book</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                <div className="flex items-center justify-center sm:justify-end">
                    <Button onClick={handleSyncProgress} size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      <span>Sync Progress</span>
                    </Button>
                </div>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    