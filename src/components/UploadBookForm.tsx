"use client";

import { useState, useCallback, ChangeEvent, DragEvent, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, ImageUp, Loader2, Sparkles, FileText } from "lucide-react";
// Dynamically import pdfjs-dist by only importing the types statically.
import type { PDFDocumentProxy } from 'pdfjs-dist';

const BookFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  summary: z.string().min(1, "Summary is required"),
  category: z.string().min(1, "Category is required"),
  totalPages: z.coerce.number().min(1, "Total pages must be at least 1").optional(),
  customCategory: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.category === 'Other' && (!data.customCategory || data.customCategory.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Custom category name is required.',
      path: ['customCategory']
    });
  }
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
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const { toast } = useToast();
  const isEditing = !!bookToEdit;
  const standardCategories = ['Novel', 'Fantasy', 'Science Fiction', 'Mystery', 'Manga', 'Non-Fiction'];


  const form = useForm<BookFormData>({
    resolver: zodResolver(BookFormSchema),
    defaultValues: { title: "", author: "", summary: "", category: "Novel", totalPages: undefined, customCategory: "" },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('pdfjs-dist').then(({ GlobalWorkerOptions }) => {
        try {
            GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        } catch (e) {
            console.error("Error setting pdf.js worker source:", e);
            toast({
              title: "PDF Worker Error",
              description: "Could not initialize the PDF processing worker. Page counting and metadata extraction might fail.",
              variant: "destructive",
            });
        }
      });
    }
  }, [toast]);

  const resetFormState = useCallback(() => {
    form.reset({ title: "", author: "", summary: "", category: "Novel", totalPages: undefined, customCategory: "" });
    setPdfFile(null);
    setPdfFileName("");
    setCurrentPdfDataUri(null);
    setCoverImageFile(null);
    setCoverPreviewUrl(null);
    setIsProcessingPdf(false);
    setIsGeneratingCover(false);
  }, [form]);

  useEffect(() => {
    if (isOpen) {
      if (bookToEdit) {
        const isCustomCategory = bookToEdit.category && !standardCategories.includes(bookToEdit.category);

        form.reset({
          title: bookToEdit.title,
          author: bookToEdit.author,
          summary: bookToEdit.summary,
          category: isCustomCategory ? 'Other' : (bookToEdit.category || 'Novel'),
          customCategory: isCustomCategory ? bookToEdit.category : '',
          totalPages: bookToEdit.totalPages,
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
         form.reset({ title: bookToEdit?.title || "", author: bookToEdit?.author || "", summary: bookToEdit?.summary || "", category: bookToEdit?.category || "Novel", totalPages: bookToEdit?.totalPages }); 
         if (!isEditing) setCoverPreviewUrl(null); 
      }
      
      setIsProcessingPdf(true);
      let pdfDataUriForProcessing = "";

      try {
        pdfDataUriForProcessing = await readFileAsDataURL(file);
        if (!pdfDataUriForProcessing || !pdfDataUriForProcessing.startsWith('data:application/pdf;base64,')) {
            throw new Error('Generated PDF Data URI is invalid.');
        }
        setCurrentPdfDataUri(pdfDataUriForProcessing); 
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
        setIsProcessingPdf(false);
        return;
      }

      try {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
        if (!GlobalWorkerOptions.workerSrc) throw new Error("PDF worker source not set.");
        const loadingTask = getDocument({data: atob(pdfDataUriForProcessing.substring(pdfDataUriForProcessing.indexOf(',') + 1))});
        const pdfDoc: PDFDocumentProxy = await loadingTask.promise;
        if (pdfDoc.numPages > 0) {
            form.setValue("totalPages", pdfDoc.numPages);
            toast({ title: "Page Count Detected", description: `Automatically filled total pages: ${pdfDoc.numPages}.` });
        }
        
        let textContent = '';
        const maxPagesToScan = Math.min(pdfDoc.numPages, 5);
        for (let i = 1; i <= maxPagesToScan; i++) {
            const page = await page.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map(item => 'str' in item ? item.str : '').join(' ') + '\n';
        }

        if (textContent.trim().length > 0) {
            const metadata = await extractBookMetadata({ textContent });
            if (metadata && (metadata.title || metadata.author)) {
                form.setValue("title", metadata.title || form.getValues("title"));
                form.setValue("author", metadata.author || form.getValues("author"));
                form.setValue("summary", metadata.summary || form.getValues("summary"));
                form.setValue("category", metadata.category || form.getValues("category") || "Novel");
                toast({ title: "AI Companion ✨", description: "I've analyzed the PDF and filled in the details. Please review." });
        
                if (!isEditing && !coverImageFile && metadata.title) {
                  setIsGeneratingCover(true);
                  toast({ title: "AI Cover Generation", description: "Attempting to generate a cover image..." });
                  try {
                    const summaryForCover = metadata.summary && metadata.summary.length >= 10 ? metadata.summary : `A book titled "${metadata.title}".`;
                    const coverResult = await generateBookCover({ title: metadata.title, summary: summaryForCover, category: metadata.category });
                    if (coverResult.coverImageDataUri) {
                      setCoverPreviewUrl(coverResult.coverImageDataUri);
                      toast({ title: "AI Cover Generated!", description: "A cover image has been generated." });
                    } else {
                      setCoverPreviewUrl(null);
                      toast({ title: "AI Cover Failed", description: "Could not generate cover. A placeholder will be used.", variant: "destructive" });
                    }
                  } catch (genError: any) {
                    console.error("Error generating cover image:", genError);
                    setCoverPreviewUrl(null);
                    toast({ title: "AI Cover Error", description: `Cover generation failed: ${genError.message || "Unknown error"}. A placeholder will be used.`, variant: "destructive" });
                  } finally {
                    setIsGeneratingCover(false);
                  }
                }
            } else {
                toast({
                    title: "AI Analysis Complete",
                    description: "I couldn't find metadata in this PDF. Please fill in the details manually.",
                    variant: "destructive"
                });
            }
        } else {
             toast({
                title: "Text Extraction Failed",
                description: "Could not extract text from this PDF. Please enter details manually.",
                variant: "destructive"
            });
        }
      } catch (aiError: any) { 
        console.error("Failed to extract metadata or generate cover:", aiError);
        toast({
          title: "AI Processing Error",
          description: `AI processing failed: ${aiError.message || "Unknown error"}. Please fill in details manually.`,
          variant: "destructive",
        });
      } finally {
        setIsProcessingPdf(false);
      }
    } else { 
      if (!isEditing) { 
        setPdfFile(null);
        setPdfFileName("");
        setCurrentPdfDataUri(null);
        form.reset({ title: "", author: "", summary: "", category: "Novel", totalPages: undefined, customCategory: "" });
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
  }, []); 

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
      setCoverPreviewUrl(isEditing && bookToEdit ? bookToEdit.coverImageUrl : null); 
    }
     e.target.value = ""; 
  };
  
  const handleSetFirstPageAsCover = async () => {
    if (!currentPdfDataUri) {
      toast({
        title: "No PDF Uploaded",
        description: "Please upload a PDF file first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingCover(true);
    toast({ title: "Generating Cover", description: "Creating cover from the first page of the PDF..." });

    try {
      const { getDocument } = await import('pdfjs-dist');
      const loadingTask = getDocument({ data: atob(currentPdfDataUri.substring(currentPdfDataUri.indexOf(',') + 1)) });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const targetWidth = 400;
      const viewport = page.getViewport({ scale: 1 });
      const scale = targetWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error("Could not get canvas context to generate cover.");
      }

      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
      }).promise;

      const coverDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCoverPreviewUrl(coverDataUrl);
      setCoverImageFile(null);
      
      toast({
        title: "Cover Set!",
        description: "The first page of the PDF is now the cover.",
      });

    } catch (error: any) {
      console.error("Error setting first page as cover:", error);
      toast({
        title: "Cover Generation Failed",
        description: `Could not generate cover from PDF: ${error.message || "Unknown error"}.`,
        variant: "destructive",
      });
    } finally {
        setIsGeneratingCover(false);
    }
  };

  const onSubmit = async (data: BookFormData) => {
    const bookId = isEditing && bookToEdit ? bookToEdit.id : Date.now().toString();
    
    // Use the current state of the URI and file name as the source of truth
    const finalPdfDataUri = currentPdfDataUri || "";
    const finalPdfFileName = pdfFileName || "";
    const finalCoverImageUrl = coverPreviewUrl || "https://placehold.co/200x300.png";
    const finalCategory = data.category === 'Other' && data.customCategory ? data.customCategory.trim() : data.category;


    if (!isEditing && !finalPdfDataUri) {
        toast({
            title: "Missing PDF",
            description: "A PDF file is required for new books. Please upload one.",
            variant: "destructive",
        });
        return;
    }

    const savedBook: Book = {
      id: bookId,
      title: data.title,
      author: data.author,
      summary: data.summary,
      category: finalCategory,
      coverImageUrl: finalCoverImageUrl,
      pdfFileName: finalPdfFileName,
      pdfDataUri: finalPdfDataUri,
      totalPages: data.totalPages,
      currentPage: (isEditing && bookToEdit?.currentPage) ? bookToEdit.currentPage : (data.totalPages ? 1 : undefined),
      highlights: (isEditing && bookToEdit?.highlights) ? bookToEdit.highlights : [],
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
        <Form {...form}>
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

            {isProcessingPdf && (
              <div className="flex items-center justify-center p-4 text-primary">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Processing PDF...</span>
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-headline">Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-headline">Author</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-headline">Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Novel">Novel</SelectItem>
                      <SelectItem value="Fantasy">Fantasy</SelectItem>
                      <SelectItem value="Science Fiction">Science Fiction</SelectItem>
                      <SelectItem value="Mystery">Mystery</SelectItem>
                      <SelectItem value="Manga">Manga</SelectItem>
                      <SelectItem value="Non-Fiction">Non-Fiction</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('category') === 'Other' && (
              <FormField
                control={form.control}
                name="customCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Custom Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Historical Fiction" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-headline">Summary</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalPages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-headline">Total Pages</FormLabel>
                  <FormControl>
                     <Input type="number" placeholder="e.g., 350" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label className="font-headline">Cover Image</Label>
               <div className="flex items-center space-x-4">
                  {coverPreviewUrl && coverPreviewUrl !== "https://placehold.co/200x300.png" ? (
                      <img src={coverPreviewUrl} alt="Cover preview" className="h-24 w-16 object-cover rounded-md border" data-ai-hint="book cover"/>
                  ) : (
                      <div className="h-24 w-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground border">
                          <ImageUp className="h-8 w-8" />
                      </div>
                  )}
                  <div className="flex flex-col items-start space-y-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Label htmlFor="cover-image-upload" className="cursor-pointer flex items-center">
                        <ImageUp className="mr-2 h-4 w-4" />
                        Upload Cover
                        <Input id="cover-image-upload" name="cover-image-upload" type="file" className="sr-only" onChange={handleCoverImageChange} accept="image/*" />
                      </Label>
                    </Button>

                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleSetFirstPageAsCover} 
                      disabled={!currentPdfDataUri || isProcessingPdf || isGeneratingCover}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Use 1st Page
                    </Button>
                  </div>
              </div>
              {isGeneratingCover && (
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  <Sparkles className="h-4 w-4 animate-pulse mr-2 text-primary" />
                  <span>Generating cover... This may take a moment.</span>
                </div>
              )}
              {!isEditing && !coverImageFile && !isGeneratingCover && (currentPdfDataUri) && !coverPreviewUrl && (
                <p className="text-xs text-muted-foreground mt-1">AI cover generation failed or was skipped. A placeholder will be used if no cover is uploaded. You can still add the book.</p>
              )}
               {isEditing && !coverImageFile && !coverPreviewUrl?.startsWith("data:image") && (
                <p className="text-xs text-muted-foreground mt-1">Upload a new image or a placeholder will be used.</p>
              )}
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleDialogClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isProcessingPdf || isGeneratingCover || (!isEditing && !currentPdfDataUri && !pdfFile) }>
                {(isProcessingPdf || isGeneratingCover) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isEditing ? "Save Changes" : "Add Book"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
