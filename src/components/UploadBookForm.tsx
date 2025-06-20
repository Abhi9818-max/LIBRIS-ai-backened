
"use client";

import { useState, useCallback, ChangeEvent, DragEvent, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Book } from "@/types";
import { extractBookMetadata } from "@/ai/flows/extract-book-metadata";
import { generateBookCover } from "@/ai/flows/generate-book-cover-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, ImageUp, Loader2, Sparkles, BookImage } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

if (typeof window !== 'undefined') {
  const KNOWN_PDFJS_VERSION = "4.4.168"; // Version from package.json
  const localWorkerUrl = '/pdf.worker.min.js';
  const cdnWorkerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${KNOWN_PDFJS_VERSION}/pdf.worker.min.js`;

  fetch(localWorkerUrl)
    .then(response => {
      if (response.ok) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerUrl;
        console.log(`PDF.js worker set to local: ${localWorkerUrl}`);
      } else {
        console.warn(`Local pdf.worker.min.js not found or accessible (status: ${response.status}), falling back to CDN version: ${cdnWorkerUrl}`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
      }
    })
    .catch((error) => {
        console.warn(`Error checking local pdf.worker.min.js: ${error}. Falling back to CDN version: ${cdnWorkerUrl}`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorkerUrl;
    });
}


const BookFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  summary: z.string().min(1, "Summary is required"),
  totalPages: z.coerce.number().min(1, "Total pages must be at least 1").optional().nullable(),
});

type BookFormData = z.infer<typeof BookFormSchema>;

interface UploadBookFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveBook: (book: Book, isEditing: boolean) => void;
  bookToEdit?: Book | null;
}

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL: result is not a string.'));
      }
    };
    reader.onerror = (errorEvent) => reject(errorEvent.target?.error || new Error('FileReader error.'));
    reader.onabort = () => reject(new Error('File reading was aborted.'));
    reader.readAsDataURL(file);
  });
};

export default function UploadBookForm({ isOpen, onOpenChange, onSaveBook, bookToEdit }: UploadBookFormProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [currentPdfDataUri, setCurrentPdfDataUri] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isExtractingPageCover, setIsExtractingPageCover] = useState(false);
  const { toast } = useToast();
  const isEditing = !!bookToEdit;

  const form = useForm<BookFormData>({
    resolver: zodResolver(BookFormSchema),
    defaultValues: { title: "", author: "", summary: "", totalPages: null },
  });

  const resetFormState = useCallback(() => {
    form.reset({ title: "", author: "", summary: "", totalPages: null });
    setPdfFile(null);
    setPdfFileName("");
    setCurrentPdfDataUri(null);
    setCoverImageFile(null);
    setCoverPreviewUrl(null);
    setIsExtracting(false);
    setIsGeneratingCover(false);
    setIsExtractingPageCover(false);
  }, [form]);

  useEffect(() => {
    if (isOpen) {
      if (bookToEdit) {
        form.reset({
          title: bookToEdit.title,
          author: bookToEdit.author,
          summary: bookToEdit.summary,
          totalPages: bookToEdit.totalPages || null,
        });
        setCoverPreviewUrl(bookToEdit.coverImageUrl);
        setPdfFileName(bookToEdit.pdfFileName || "");
        setCurrentPdfDataUri(bookToEdit.pdfDataUri || null); 
        setPdfFile(null); 
        setCoverImageFile(null);
      } else {
        resetFormState();
      }
    }
  }, [isOpen, bookToEdit, form, resetFormState]);

  const extractPageAsCover = async (pdfDataUri: string, pageNumber: number): Promise<string | null> => {
    try {
      // PDF.js expects a Uint8Array or base64 string without the data URI prefix
      const base64Pdf = pdfDataUri.substring(pdfDataUri.indexOf(',') + 1);
      const pdfBinary = atob(base64Pdf);
      const len = pdfBinary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = pdfBinary.charCodeAt(i);
      }

      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;

      if (pageNumber < 1 || pageNumber > pdf.numPages) {
        toast({
          title: "Page Not Found",
          description: `Page ${pageNumber} does not exist. The PDF has ${pdf.numPages} pages.`,
          variant: "destructive",
        });
        return null;
      }

      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 }); // Adjust scale for quality
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (!context) {
        console.error("Could not get canvas context for PDF page rendering.");
        toast({ title: "Render Error", description: "Failed to prepare canvas for cover extraction.", variant: "destructive" });
        return null;
      }

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise;
      return canvas.toDataURL('image/png');
    } catch (error: any) {
      console.error("Error extracting page as cover:", error);
      if (error.name === 'PasswordException' || error.message?.includes('password')) {
          toast({ title: "PDF Locked", description: "Cannot extract cover from a password-protected PDF.", variant: "destructive" });
      } else if (error.message?.includes("Setting up fake worker") || error.message?.includes("Failed to fetch dynamically imported module")) {
          toast({ title: "PDF Worker Error", description: "Failed to set up PDF processing worker. Please ensure your internet connection is stable and try again. If this persists, the PDF might be incompatible.", variant: "destructive", duration: 7000 });
      }
      else {
          toast({ title: "Cover Extraction Failed", description: "Could not extract page as cover. The PDF might be corrupted, incompatible, or the worker script may not have loaded correctly.", variant: "destructive" });
      }
      return null;
    }
  };


  const handlePdfFileChange = async (file: File | null) => {
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file (.pdf).",
          variant: "destructive",
        });
        setPdfFile(null);
        if (!isEditing) {
            setPdfFileName("");
            setCurrentPdfDataUri(null);
        } else if (bookToEdit) {
            setPdfFileName(bookToEdit.pdfFileName || "");
            setCurrentPdfDataUri(bookToEdit.pdfDataUri || null);
        }
        return;
      }

      setPdfFile(file); 
      setPdfFileName(file.name);
      
      if (!isEditing || (isEditing && file)) { 
         form.reset({ title: bookToEdit?.title || "", author: bookToEdit?.author || "", summary: bookToEdit?.summary || "", totalPages: bookToEdit?.totalPages || null }); 
         if (!isEditing) setCoverPreviewUrl(null); 
      }
      
      setIsExtracting(true);
      let pdfDataUriForMeta = "";

      try {
        pdfDataUriForMeta = await readFileAsDataURL(file);
        if (!pdfDataUriForMeta || !pdfDataUriForMeta.startsWith('data:application/pdf;base64,')) {
            throw new Error('Generated PDF Data URI is invalid.');
        }
        setCurrentPdfDataUri(pdfDataUriForMeta); 
      } catch (readError: any) {
        console.error("Failed to read PDF:", readError);
        toast({
          title: "PDF Read Error",
          description: `Could not read PDF: ${readError.message || "Unknown error"}. Please try again.`,
          variant: "destructive",
        });
        setPdfFile(null); 
        if (isEditing && bookToEdit) {
            setPdfFileName(bookToEdit.pdfFileName || "");
            setCurrentPdfDataUri(bookToEdit.pdfDataUri || null);
        } else {
            setPdfFileName("");
            setCurrentPdfDataUri(null);
        }
        setIsExtracting(false);
        return;
      }

      try {
        const metadata = await extractBookMetadata({ pdfDataUri: pdfDataUriForMeta });
        form.setValue("title", metadata.title || form.getValues("title"));
        form.setValue("author", metadata.author || form.getValues("author"));
        form.setValue("summary", metadata.summary || form.getValues("summary"));
        toast({ title: "Metadata Extracted", description: "Review and edit the details below." });

        if (!isEditing && !coverImageFile && metadata.title && metadata.summary) {
          setIsGeneratingCover(true);
          toast({ title: "AI Cover Generation", description: "Attempting to generate a cover image..." });
          try {
            const summaryForCover = metadata.summary.length >= 10 ? metadata.summary : `A book titled "${metadata.title}". If summary is short, use title.`;
            const coverResult = await generateBookCover({ title: metadata.title, summary: summaryForCover });
            if (coverResult.coverImageDataUri) {
              setCoverPreviewUrl(coverResult.coverImageDataUri);
              toast({ title: "AI Cover Generated!", description: "A cover image has been generated." });
            } else {
              setCoverPreviewUrl(null);
              toast({ title: "AI Cover Failed", description: "Could not generate cover. A placeholder will be used, you can still add the book.", variant: "destructive" });
            }
          } catch (genError: any) {
            console.error("Error generating cover image:", genError);
            setCoverPreviewUrl(null);
            toast({ title: "AI Cover Error", description: `Cover generation failed: ${genError.message || "Unknown error"}. A placeholder will be used, you can still add the book.`, variant: "destructive" });
          } finally {
            setIsGeneratingCover(false);
          }
        }
      } catch (aiError: any) { 
        console.error("Failed to extract metadata or generate cover:", aiError);
        toast({
          title: "AI Processing Error",
          description: `AI processing failed: ${aiError.message || "Unknown error"}. Please fill in details manually. PDF is still attached if it was read successfully.`,
          variant: "destructive",
        });
         if (isEditing && !coverImageFile && bookToEdit?.coverImageUrl) {
            setCoverPreviewUrl(bookToEdit.coverImageUrl); 
        } else if (!currentPdfDataUri) { 
            setCoverPreviewUrl(null);
        }
      } finally {
        setIsExtracting(false);
         if (!isEditing && !coverImageFile && !isGeneratingCover && currentPdfDataUri) { 
             if (!form.getValues("title") && !form.getValues("summary")) { 
                setCoverPreviewUrl(null); 
             }
        }
      }
    } else { 
      if (!isEditing) { 
        setPdfFile(null);
        setPdfFileName("");
        setCurrentPdfDataUri(null);
        form.reset({ title: "", author: "", summary: "", totalPages: null });
        setCoverPreviewUrl(null);
      } else if (bookToEdit) { 
        setPdfFile(null); 
        setPdfFileName(bookToEdit.pdfFileName || "");
        setCurrentPdfDataUri(bookToEdit.pdfDataUri || null); 
      }
    }
  };

  const onPdfInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handlePdfFileChange(e.target.files ? e.target.files[0] : null);
    e.target.value = ""; 
  };
  
  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-primary');
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handlePdfFileChange(event.dataTransfer.files[0]);
    }
  }, [isEditing, bookToEdit, form, coverImageFile, handlePdfFileChange]);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('border-primary');
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-primary');
  }, []);


  const handleCoverImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
            title: "Invalid File Type",
            description: "Please upload an image file for the cover.",
            variant: "destructive",
        });
        e.target.value = ""; 
        return;
      }
      setCoverImageFile(file); 
      try {
        const dataUrl = await readFileAsDataURL(file);
        setCoverPreviewUrl(dataUrl);
      } catch (error: any) {
        console.error("Error reading cover image:", error);
        toast({ title: "Cover Image Error", description: `Could not read cover image: ${error.message || "Unknown error"}.`, variant: "destructive"});
        setCoverImageFile(null);
        setCoverPreviewUrl(isEditing && bookToEdit ? bookToEdit.coverImageUrl : null);
      }
    } else { 
      setCoverImageFile(null);
      if (isEditing && bookToEdit) {
        setCoverPreviewUrl(bookToEdit.coverImageUrl); 
      } else if (currentPdfDataUri && form.getValues("title") && form.getValues("summary")) { 
        setIsGeneratingCover(true);
        toast({ title: "AI Cover Generation", description: "Attempting to generate a cover image..." });
        const metadata = form.getValues();
        const summaryForCover = metadata.summary.length >= 10 ? metadata.summary : `A book titled "${metadata.title}". If summary is short, use title.`;
        generateBookCover({ title: metadata.title, summary: summaryForCover })
          .then(coverResult => {
            if (coverResult.coverImageDataUri) {
              setCoverPreviewUrl(coverResult.coverImageDataUri);
              toast({ title: "AI Cover Generated!", description: "A cover image has been generated." });
            } else {
              setCoverPreviewUrl(null); 
              toast({ title: "AI Cover Failed", description: "Could not generate cover. A placeholder will be used, you can still add the book.", variant: "destructive" });
            }
          })
          .catch(genError => {
            console.error("Error generating cover image:", genError);
            setCoverPreviewUrl(null);
            toast({ title: "AI Cover Error", description: "Cover generation failed. A placeholder will be used, you can still add the book.", variant: "destructive" });
          })
          .finally(() => setIsGeneratingCover(false));
      } else {
         setCoverPreviewUrl(null); 
      }
    }
     e.target.value = ""; 
  };

  const onSubmit = async (data: BookFormData) => {
    const bookId = isEditing && bookToEdit ? bookToEdit.id : Date.now().toString();
    
    let finalPdfDataUri = "";
    let finalPdfFileName = "";
    let finalCoverImageUrl = "https://placehold.co/200x300.png";

    if (isEditing && bookToEdit) {
      if (pdfFile && currentPdfDataUri) { 
        finalPdfDataUri = currentPdfDataUri;
        finalPdfFileName = pdfFileName || (pdfFile.name);
      } else { 
        finalPdfDataUri = bookToEdit.pdfDataUri || "";
        finalPdfFileName = bookToEdit.pdfFileName || "";
      }

      if (coverImageFile && coverPreviewUrl && coverPreviewUrl.startsWith('data:image')) { 
        finalCoverImageUrl = coverPreviewUrl;
      } else if (coverPreviewUrl && coverPreviewUrl.startsWith('data:image')) { 
        finalCoverImageUrl = coverPreviewUrl;
      } else if (coverPreviewUrl && !coverPreviewUrl.startsWith('data:image')) { 
         finalCoverImageUrl = coverPreviewUrl;
      } else if (!coverPreviewUrl && coverImageFile) { 
         finalCoverImageUrl = bookToEdit.coverImageUrl || "https://placehold.co/200x300.png"; 
      }
      else if (!coverPreviewUrl && !coverImageFile && bookToEdit.coverImageUrl) { 
         finalCoverImageUrl = bookToEdit.coverImageUrl;
      }
       else { 
        finalCoverImageUrl = bookToEdit.coverImageUrl && !coverImageFile ? bookToEdit.coverImageUrl : "https://placehold.co/200x300.png";
      }


    } else { 
      finalPdfDataUri = currentPdfDataUri || "";
      finalPdfFileName = pdfFileName || (pdfFile ? pdfFile.name : "");
      finalCoverImageUrl = coverPreviewUrl || "https://placehold.co/200x300.png";
      
      if (!finalPdfDataUri) { 
        toast({ 
          title: "Missing PDF", 
          description: "A PDF file is required for new books. Please upload one.", 
          variant: "destructive" 
        });
        return;
      }
    }

    const savedBook: Book = {
      id: bookId,
      title: data.title,
      author: data.author,
      summary: data.summary,
      coverImageUrl: finalCoverImageUrl,
      pdfFileName: finalPdfFileName,
      pdfDataUri: finalPdfDataUri,
      totalPages: data.totalPages || undefined,
      currentPage: (isEditing && bookToEdit?.currentPage) ? bookToEdit.currentPage : (data.totalPages ? 1 : undefined),
    };

    onSaveBook(savedBook, isEditing);
    toast({ title: isEditing ? "Book Updated!" : "Book Added!", description: `'${data.title}' has been ${isEditing ? 'updated' : 'added'}.` });
    onOpenChange(false);
  };
  
  const handleDialogClose = () => {
    onOpenChange(false);
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            resetFormState(); 
        }
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditing ? "Edit Book" : "Add New Book"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div 
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <div className="space-y-1 text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="flex text-sm text-muted-foreground">
                <Label
                  htmlFor="pdf-upload"
                  className="relative cursor-pointer rounded-md font-medium text-primary hover:text-accent focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring"
                >
                  <span>{pdfFileName ? "Change PDF" : (isEditing ? "Upload New PDF (Optional)" : "Upload a PDF")}</span>
                  <Input id="pdf-upload" name="pdf-upload" type="file" className="sr-only" onChange={onPdfInputChange} accept="application/pdf" />
                </Label>
                {!pdfFileName && <p className="pl-1">or drag and drop</p>}
              </div>
              <p className="text-xs text-muted-foreground">{pdfFileName || (isEditing && bookToEdit?.pdfFileName ? "Keep existing PDF" : "PDF up to 100MB (Note: Processing very large files may be slow or fail due to browser/server limits)")}</p>
            </div>
          </div>

          {isExtracting && (
            <div className="flex items-center justify-center p-4 text-primary">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Extracting metadata...</span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="title" className="font-headline">Title</Label>
            <Controller name="title" control={form.control} render={({ field }) => <Input id="title" {...field} />} />
            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="author" className="font-headline">Author</Label>
            <Controller name="author" control={form.control} render={({ field }) => <Input id="author" {...field} />} />
            {form.formState.errors.author && <p className="text-sm text-destructive">{form.formState.errors.author.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="summary" className="font-headline">Summary</Label>
            <Controller name="summary" control={form.control} render={({ field }) => <Textarea id="summary" {...field} rows={3} />} />
            {form.formState.errors.summary && <p className="text-sm text-destructive">{form.formState.errors.summary.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="totalPages" className="font-headline">Total Pages</Label>
            <Controller 
              name="totalPages" 
              control={form.control} 
              render={({ field }) => <Input id="totalPages" type="number" placeholder="e.g., 350" {...field} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} value={field.value === null ? '' : field.value} />} 
            />
            {form.formState.errors.totalPages && <p className="text-sm text-destructive">{form.formState.errors.totalPages.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cover-image-upload" className="font-headline">Cover Image</Label>
             <div className="mt-1 flex items-center space-x-4">
                {coverPreviewUrl && coverPreviewUrl !== "https://placehold.co/200x300.png" ? (
                    <img src={coverPreviewUrl} alt="Cover preview" className="h-24 w-16 object-cover rounded-md border" data-ai-hint="book cover"/>
                ) : (
                    <div className="h-24 w-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground border">
                        <ImageUp className="h-8 w-8" />
                    </div>
                )}
                <Button type="button" variant="outline" asChild>
                  <Label htmlFor="cover-image-upload" className="cursor-pointer">
                    {coverPreviewUrl && coverPreviewUrl !== "https://placehold.co/200x300.png" && !coverImageFile ? "Change" : "Upload"} Cover
                    <Input id="cover-image-upload" name="cover-image-upload" type="file" className="sr-only" onChange={handleCoverImageChange} accept="image/*" />
                  </Label>
                </Button>
            </div>
            {currentPdfDataUri && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!currentPdfDataUri) return;
                    setIsExtractingPageCover(true);
                    const coverDataUrl = await extractPageAsCover(currentPdfDataUri, 1);
                    if (coverDataUrl) {
                        setCoverPreviewUrl(coverDataUrl);
                        setCoverImageFile(null); // Clear any manually uploaded file
                        toast({ title: "Cover Set", description: "1st page of PDF set as cover."});
                    }
                    setIsExtractingPageCover(false);
                  }}
                  disabled={isExtractingPageCover || isExtracting || isGeneratingCover}
                  className="flex-grow sm:flex-grow-0"
                >
                  {isExtractingPageCover ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BookImage className="h-4 w-4 mr-2" />}
                  Use 1st Page 
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!currentPdfDataUri) return;
                    setIsExtractingPageCover(true);
                    const coverDataUrl = await extractPageAsCover(currentPdfDataUri, 2);
                    if (coverDataUrl) {
                        setCoverPreviewUrl(coverDataUrl);
                        setCoverImageFile(null); // Clear any manually uploaded file
                        toast({ title: "Cover Set", description: "2nd page of PDF set as cover."});
                    }
                    setIsExtractingPageCover(false);
                  }}
                  disabled={isExtractingPageCover || isExtracting || isGeneratingCover}
                  className="flex-grow sm:flex-grow-0"
                >
                  {isExtractingPageCover ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BookImage className="h-4 w-4 mr-2" />}
                  Use 2nd Page
                </Button>
              </div>
            )}
            {isGeneratingCover && (
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Sparkles className="h-4 w-4 animate-pulse mr-2 text-primary" />
                <span>Generating AI cover... This may take a moment.</span>
              </div>
            )}
            {!isEditing && !coverImageFile && !isGeneratingCover && (currentPdfDataUri) && !coverPreviewUrl && (
              <p className="text-xs text-muted-foreground mt-1">AI cover generation failed or was skipped. A placeholder will be used if no cover is uploaded. You can still add the book.</p>
            )}
             {isEditing && !coverImageFile && !coverPreviewUrl?.startsWith("data:image") && (
              <p className="text-xs text-muted-foreground mt-1">Upload a new image or an AI cover will be attempted if metadata changes.</p>
            )}
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={handleDialogClose}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isExtracting || isGeneratingCover || isExtractingPageCover || (!isEditing && !currentPdfDataUri && !pdfFile) }>
              {(isExtracting || isGeneratingCover || isExtractingPageCover) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isEditing ? "Save Changes" : "Add Book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

