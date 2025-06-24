
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Book, Highlight, HighlightRect } from "@/types";
import Image from "next/image";
import { Document, Page, pdfjs, type PDFDocumentProxy, type TextContent } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, Loader2, ZoomIn, ZoomOut, Maximize2, Minimize2, BookText, Headphones } from "lucide-react";
import { cn, getBookColor } from "@/lib/utils";
import { textToSpeech, type TextToSpeechOutput } from "@/ai/flows/text-to-speech-flow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


// Set up the pdf.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

const HIGHLIGHT_COLOR_STYLES: Record<string, React.CSSProperties> = {
    'yellow': { backgroundColor: 'rgba(255, 255, 102, 0.4)' }, // #FFFF66
    'green': { backgroundColor: 'rgba(204, 255, 204, 0.4)' },  // #CCFFCC
    'blue': { backgroundColor: 'rgba(204, 229, 255, 0.4)' },   // #CCE5FF
    'peach': { backgroundColor: 'rgba(255, 218, 185, 0.4)' },  // #FFDAB9
    'lavender': { backgroundColor: 'rgba(230, 230, 250, 0.4)' } // #E6E6FA
};
const HIGHLIGHT_COLOR_KEYS = Object.keys(HIGHLIGHT_COLOR_STYLES);

interface BookDetailViewProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onEditBook: (book: Book) => void;
  onRemoveBook: (id: string) => void;
  onUpdateBook: (book: Book) => void;
  initialTab?: 'details' | 'read';
}

// Helper function to convert rectangle data into an SVG path for clip-path
const rectsToSvgPath = (rects: HighlightRect[], scale: number): string => {
  if (!rects || rects.length === 0) return '';
  // For each rectangle, create a path command (Move, horizontal line, vertical line, horizontal line, close)
  // and scale it according to the current zoom level.
  return rects
    .map(rect => `M${rect.x * scale},${rect.y * scale} h${rect.width * scale} v${rect.height * scale} h-${rect.width * scale} z`)
    .join(' ');
};

export default function BookDetailView({ book, isOpen, onClose, onEditBook, onRemoveBook, onUpdateBook, initialTab = 'read' }: BookDetailViewProps) {
  const { toast } = useToast();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [pdfPageDimensions, setPdfPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1.0);
  const [selectionPopover, setSelectionPopover] = useState<{ top: number; left: number; } | null>(null);
  const [deletingHighlight, setDeletingHighlight] = useState<Highlight | null>(null);

  const [pageText, setPageText] = useState('');
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [narratorVoice, setNarratorVoice] = useState('Algenib');

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);


  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setNumPages(0);
      setPageNumber(book?.currentPage || 1);
      setPdfPageDimensions(null);
      setIsPdfLoading(true);
      setScale(1.0);
      setSelectionPopover(null);
      setDeletingHighlight(null);
      setAudioDataUri(null);
      setIsGeneratingAudio(false);
    }
  }, [isOpen, initialTab, book?.id]);
  
  useEffect(() => {
    // Reset audio when page changes
    setAudioDataUri(null);
    setIsGeneratingAudio(false);
  }, [pageNumber]);

  const onDocumentLoadSuccess = useCallback(async (pdf: PDFDocumentProxy): Promise<void> => {
    setNumPages(pdf.numPages);
    const page = await pdf.getPage(1);
    const dimensions = { width: page.view[2], height: page.view[3] };
    setPdfPageDimensions(dimensions);

    if (pdfContainerRef.current) {
        const { clientWidth } = pdfContainerRef.current;
        let initialScale = clientWidth / dimensions.width;
        
        // On smaller screens, apply an initial zoom to better fit the content, as requested.
        if (clientWidth < 768) {
            initialScale *= 1.2;
        }

        setScale(initialScale > 0 ? initialScale : 1.0);
    }

    setIsPdfLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    if (error.name === 'AbortException') {
        // This is expected if the user navigates away while the PDF is loading.
        // We can safely ignore it.
        return; 
    }
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

  const onPageRenderTextLayerError = useCallback((error: Error) => {
    if (error.name === 'AbortException') {
      return;
    }
    console.error("Failed to render PDF text layer:", error);
    toast({
      title: "PDF Text Layer Error",
      description: "Could not render text layer for selection. Highlighting may not work.",
      variant: "destructive"
    });
  }, [toast]);
  
  const onGetTextSuccess = useCallback((textContent: TextContent) => {
    const text = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
    setPageText(text);
  }, []);

  const handlePreviousPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }
  
  const handleNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  }
  
  const handleSyncProgress = () => {
    if (book) {
      onUpdateBook({ ...book, currentPage: pageNumber });
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
  
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim() !== '') {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = pdfContainerRef.current?.getBoundingClientRect();

        if (containerRect) {
            setSelectionPopover({
                top: rect.bottom - containerRect.top + pdfContainerRef.current!.scrollTop + 8,
                left: rect.left - containerRect.left + rect.width / 2 + pdfContainerRef.current!.scrollLeft,
            });
        }
    } else {
        setSelectionPopover(null);
    }
  };

  const handleHighlightClick = (color: string) => {
    if (!book) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const pageContainer = pdfWrapperRef.current?.querySelector('.react-pdf__Page');
    if (!pageContainer) return;

    const pageRect = pageContainer.getBoundingClientRect();
    const range = selection.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects());
    
    const newHighlight: Highlight = {
        id: `highlight-${Date.now()}`,
        pageNumber: pageNumber,
        text: selection.toString(),
        color: color,
        rects: clientRects.map((rect): HighlightRect => ({
            x: (rect.left - pageRect.left) / scale,
            y: (rect.top - pageRect.top) / scale,
            width: rect.width / scale,
            height: rect.height / scale,
        })).filter(r => r.width > 0 && r.height > 0),
    };

    if (newHighlight.rects.length === 0) {
        toast({ title: "Highlight Error", description: "Could not create a highlight from this selection.", variant: "destructive" });
        return;
    }

    const updatedHighlights = [...(book.highlights || []), newHighlight];
    const updatedBook = { ...book, highlights: updatedHighlights };

    onUpdateBook(updatedBook);
    toast({ title: "Highlight Saved!" });
    setSelectionPopover(null);
    window.getSelection()?.removeAllRanges();
  };
  
  const handleDeleteHighlight = () => {
    if (!book || !deletingHighlight) return;

    const updatedHighlights = book.highlights?.filter(h => h.id !== deletingHighlight.id) ?? [];
    const updatedBook = { ...book, highlights: updatedHighlights };
    
    onUpdateBook(updatedBook);
    toast({ title: "Highlight Removed" });
    setDeletingHighlight(null);
  };
  
  const handleListenToPage = async () => {
    if (!pageText || pageText.trim().length === 0) {
      toast({
        title: "Nothing to Read",
        description: "There doesn't seem to be any text on this page to narrate.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingAudio(true);
    setAudioDataUri(null);

    try {
      const result: TextToSpeechOutput = await textToSpeech({ text: pageText, voice: narratorVoice });
      if (result && result.media) {
        setAudioDataUri(result.media);
      } else {
        throw new Error("The AI did not return any audio data.");
      }
    } catch (error: any) {
      console.error("Text-to-speech failed:", error);
      toast({
        title: "Narration Failed",
        description: `Could not generate audio for this page. ${error.message || ""}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };


  useEffect(() => {
    if (audioDataUri && audioPlayerRef.current) {
        const playPromise = audioPlayerRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                if (error.name === 'AbortError') {
                    // This is expected when the user navigates away quickly.
                    // We can safely ignore it.
                    return; 
                }
                console.error("Audio autoplay was blocked or failed:", error);
            });
        }
    }
  }, [audioDataUri]);

  if (!isOpen || !book) {
    return null;
  }
  
  const hasValidPdf = book.pdfDataUri && book.pdfDataUri.startsWith('data:application/pdf;base64,');

  const percentageRead = book.totalPages && book.currentPage && book.totalPages > 0
    ? Math.round((book.currentPage / book.totalPages) * 100)
    : 0;
    
  const isComplete = percentageRead >= 100;
  const progressColor = getBookColor(book.id);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className={cn(
          "flex flex-col p-0 transition-all duration-300 ease-in-out",
          activeTab === 'read' 
            ? "w-screen h-svh max-w-full max-h-svh rounded-none border-0" 
            : "sm:max-w-4xl lg:max-w-6xl h-[95vh]"
        )}>
          {activeTab === 'details' ? (
              <DialogHeader className="p-4 sm:p-6 pb-2 border-b shrink-0">
                <DialogTitle className="font-headline text-xl sm:text-2xl truncate pr-10">{book.title || "Untitled Book"}</DialogTitle>
                <DialogDescription className="text-sm sm:text-md">
                    By: {book.author || "Unknown Author"}
                </DialogDescription>
              </DialogHeader>
          ) : (
            <DialogHeader className="sr-only">
              <DialogTitle>Reading: {book.title || "Untitled Book"}</DialogTitle>
              <DialogDescription>PDF reader view for {book.title || "Untitled Book"} by {book.author || "Unknown Author"}.</DialogDescription>
            </DialogHeader>
          )}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'details' | 'read')} className="flex-grow flex flex-col overflow-hidden">
              {activeTab === 'details' && (
                  <TabsList className="mx-auto w-fit mt-2 px-4 shrink-0">
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="read" disabled={!hasValidPdf}>Read</TabsTrigger>
                  </TabsList>
              )}
            
            <TabsContent value="details" className="flex-grow overflow-y-auto p-4 md:p-6 data-[state=inactive]:hidden">
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
                    <Button variant="outline" onClick={() => setDeletingHighlight(book as any)} size="sm"><Trash2 className="mr-2 h-4 w-4" /> Remove</Button>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-headline text-lg text-foreground">Summary</h3>
                    <ScrollArea className="h-32 border rounded-md p-3">
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
                   <div className="space-y-2">
                      <h3 className="font-headline text-lg text-foreground">Highlights</h3>
                      {book.highlights && book.highlights.length > 0 ? (
                        <ScrollArea className="h-40 border rounded-md p-3">
                          <div className="space-y-4">
                            {book.highlights
                              .sort((a, b) => a.pageNumber - b.pageNumber)
                              .map((highlight) => (
                              <div key={highlight.id} className="group flex items-start justify-between gap-2">
                                <div 
                                  className="flex-grow cursor-pointer" 
                                  onClick={() => {
                                      setActiveTab('read');
                                      setPageNumber(highlight.pageNumber);
                                  }}
                                  title={`Go to page ${highlight.pageNumber}`}
                                >
                                  <blockquote 
                                    className="text-sm text-muted-foreground italic border-l-4 pl-3 py-1 transition-colors group-hover:border-primary/70"
                                    style={{ borderLeftColor: (HIGHLIGHT_COLOR_STYLES[highlight.color] || HIGHLIGHT_COLOR_STYLES.yellow).backgroundColor as string }}
                                  >
                                    "{highlight.text.length > 150 ? `${highlight.text.substring(0, 150)}...` : highlight.text}"
                                  </blockquote>
                                  <p className="text-xs text-muted-foreground/80 mt-1">Page {highlight.pageNumber}</p>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => setDeletingHighlight(highlight)}
                                  aria-label="Delete highlight"
                                >
                                  <Trash2 className="h-4 w-4 hover:text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-sm text-muted-foreground pt-2 border rounded-md p-3 text-center">
                            <p>No highlights yet.</p>
                            <p className="text-xs">Select text in the "Read" tab to create one.</p>
                        </div>
                      )}
                    </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="read" className="flex-grow flex flex-col overflow-hidden data-[state=inactive]:hidden">
              {hasValidPdf ? (
              <div className="flex-grow flex flex-col overflow-hidden">
                <div className="flex-grow bg-muted/40 overflow-auto relative" ref={pdfContainerRef} onMouseUp={handleMouseUp}>
                    <div 
                        className="flex justify-center transition-transform duration-200 ease-in-out"
                        ref={pdfWrapperRef}
                    >
                        {isPdfLoading && (
                          <div className="flex flex-col items-center justify-center h-full w-full absolute inset-0">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="mt-4 text-muted-foreground">Loading PDF...</p>
                          </div>
                        )}
                      <div className="relative">
                        <Document
                          file={book.pdfDataUri}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          onPageRenderError={onPageRenderError}
                          onPageRenderTextLayerError={onPageRenderTextLayerError}
                          loading="" 
                          className={isPdfLoading ? 'hidden' : ''}
                        >
                          <Page 
                              key={`${book.id}-${pageNumber}`}
                              pageNumber={pageNumber} 
                              scale={scale}
                              renderTextLayer={true}
                              onGetTextSuccess={onGetTextSuccess}
                              onRenderError={onPageRenderError}
                              onRenderTextLayerError={onPageRenderTextLayerError}
                              className="transition-opacity duration-300"
                          />
                        </Document>
                         <div className="absolute inset-0 pointer-events-none">
                            {book.highlights
                                ?.filter((h) => h.pageNumber === pageNumber)
                                .map((highlight) => (
                                <div
                                    key={highlight.id}
                                    className="absolute inset-0"
                                    style={{
                                    ...(HIGHLIGHT_COLOR_STYLES[highlight.color] ||
                                        HIGHLIGHT_COLOR_STYLES.yellow),
                                    clipPath: `path('${rectsToSvgPath(highlight.rects, scale)}')`,
                                    }}
                                />
                                ))}
                        </div>
                      </div>
                    </div>
                    {selectionPopover && (
                        <div 
                        className="absolute z-10 p-1 bg-background border rounded-md shadow-lg"
                        style={{
                            top: `${selectionPopover.top}px`,
                            left: `${selectionPopover.left}px`,
                            transform: 'translateX(-50%)',
                        }}
                        >
                        <div className="flex items-center gap-2">
                           {HIGHLIGHT_COLOR_KEYS.map((color) => (
                              <button
                                key={color}
                                title={`Highlight ${color}`}
                                aria-label={`Highlight ${color}`}
                                onClick={() => handleHighlightClick(color)}
                                className="w-6 h-6 rounded-full border border-muted-foreground/50"
                                style={HIGHLIGHT_COLOR_STYLES[color]}
                              />
                            ))}
                        </div>
                        </div>
                    )}
                </div>
                <div className="p-3 border-t flex flex-wrap items-center justify-between gap-x-4 gap-y-3 shrink-0 bg-background">
                    <div className="flex items-center justify-center space-x-2">
                        <Button variant="outline" size="icon" onClick={handlePreviousPage} disabled={pageNumber <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <span className="text-sm font-medium text-muted-foreground tabular-nums whitespace-nowrap">
                            Page {pageNumber} of {numPages || '...'}
                        </span>
                        <Button variant="outline" size="icon" onClick={handleNextPage} disabled={!numPages || pageNumber >= numPages}><ChevronRight className="h-4 w-4" /></Button>
                    </div>

                    <div className="flex-1 min-w-[150px]">
                      {audioDataUri && (
                        <audio
                          key={audioDataUri}
                          ref={audioPlayerRef}
                          controls
                          className="w-full h-8"
                          onEnded={handleNextPage}
                        >
                          <source src={audioDataUri} type="audio/mpeg" />
                           Your browser does not support the audio element.
                        </audio>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-center space-x-2">
                        <Button variant="outline" size="icon" onClick={() => setActiveTab('details')} title="Back to Details">
                            <BookText className="h-4 w-4" />
                        </Button>
                        
                        <div className="flex items-center gap-1">
                            <Select value={narratorVoice} onValueChange={setNarratorVoice}>
                                <SelectTrigger className="w-[140px] h-10" aria-label="Select narrator voice">
                                    <SelectValue placeholder="Select a voice" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Algenib">Narrator 1 (M)</SelectItem>
                                    <SelectItem value="Achernar">Narrator 2 (M)</SelectItem>
                                    <SelectItem value="Sirius">Narrator 3 (F)</SelectItem>
                                    <SelectItem value="Vega">Narrator 4 (F)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" onClick={handleListenToPage} disabled={isGeneratingAudio} title="Listen to this page">
                              {isGeneratingAudio ? <Loader2 className="h-4 w-4 animate-spin"/> : <Headphones className="h-4 w-4" />}
                            </Button>
                        </div>
                        
                        <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In"><ZoomIn className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="hidden sm:inline-flex" onClick={handleFitToWidth} title="Fit to Width"><Maximize2 className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="hidden sm:inline-flex" onClick={handleFitToPage} title="Fit to Page"><Minimize2 className="h-4 w-4" /></Button>
                        <Button onClick={handleSyncProgress} size="icon" title="Sync Progress">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-muted-foreground">No PDF available for this book.</p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('details')} className="mt-4">
                      <BookText className="mr-2 h-4 w-4" />
                      Back to Details
                  </Button>
              </div>
            )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deletingHighlight} onOpenChange={(open) => !open && setDeletingHighlight(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Highlight?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the highlight. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <blockquote className="mt-4 p-2 border-l-4 bg-muted text-muted-foreground italic text-sm">
            {deletingHighlight?.text}
          </blockquote>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteHighlight} 
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
