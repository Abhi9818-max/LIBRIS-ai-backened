
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
import { UploadCloud, ImageUp, Loader2, Sparkles } from "lucide-react";

const BookFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  summary: z.string().min(1, "Summary is required"),
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
  const { toast } = useToast();
  const isEditing = !!bookToEdit;

  const form = useForm<BookFormData>({
    resolver: zodResolver(BookFormSchema),
    defaultValues: { title: "", author: "", summary: "" },
  });

  const resetFormState = useCallback(() => {
    form.reset({ title: "", author: "", summary: "" });
    setPdfFile(null);
    setPdfFileName("");
    setCurrentPdfDataUri(null);
    setCoverImageFile(null);
    setCoverPreviewUrl(null);
    setIsExtracting(false);
    setIsGeneratingCover(false);
  }, [form]);

  useEffect(() => {
    if (isOpen) {
      if (bookToEdit) {
        form.reset({
          title: bookToEdit.title,
          author: bookToEdit.author,
          summary: bookToEdit.summary,
        });
        setCoverPreviewUrl(bookToEdit.coverImageUrl);
        setPdfFileName(bookToEdit.pdfFileName);
        setCurrentPdfDataUri(bookToEdit.pdfDataUri);
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
        setPdfFileName(bookToEdit ? bookToEdit.pdfFileName : "");
        setCurrentPdfDataUri(bookToEdit ? bookToEdit.pdfDataUri : null);
        return;
      }

      setPdfFile(file);
      setPdfFileName(file.name);
      if (!isEditing || (isEditing && file)) {
         form.reset({ title: "", author: "", summary: "" });
         if (!isEditing) setCoverPreviewUrl(null); // Clear previous AI cover if new PDF for new book
      }
      setIsExtracting(true);
      setCurrentPdfDataUri(null); 
      try {
        const pdfDataUriForMeta = await readFileAsDataURL(file);
        
        if (!pdfDataUriForMeta || !pdfDataUriForMeta.startsWith('data:application/pdf;base64,')) {
            throw new Error('Generated PDF Data URI is invalid.');
        }
        setCurrentPdfDataUri(pdfDataUriForMeta); 
        
        const metadata = await extractBookMetadata({ pdfDataUri: pdfDataUriForMeta });
        form.setValue("title", metadata.title || (isEditing ? bookToEdit.title : ""));
        form.setValue("author", metadata.author || (isEditing ? bookToEdit.author : ""));
        form.setValue("summary", metadata.summary || (isEditing ? bookToEdit.summary : ""));
        toast({ title: "Metadata Extracted", description: "Review and edit the details below." });

        // AI Cover Generation for new books if no cover image file is selected
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

      } catch (error: any) { 
        console.error("Failed to extract metadata or read PDF:", error);
        setCurrentPdfDataUri(isEditing ? bookToEdit.pdfDataUri : null);
        setPdfFileName(isEditing ? bookToEdit.pdfFileName : "");
        toast({
          title: "PDF Processing Error",
          description: `Could not process PDF: ${error.message || "Unknown error"}. Please try again or fill in manually.`,
          variant: "destructive",
        });
        setPdfFile(null); 
      } finally {
        setIsExtracting(false);
      }
    } else {
      if (!isEditing) { 
        setPdfFile(null);
        setPdfFileName("");
        setCurrentPdfDataUri(null);
        form.reset({ title: "", author: "", summary: "" });
      } else { 
        setPdfFile(null);
        setPdfFileName(bookToEdit?.pdfFileName || "");
        setCurrentPdfDataUri(bookToEdit?.pdfDataUri || null);
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
  }, [isEditing, bookToEdit, form, coverImageFile]);

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
        setCoverPreviewUrl(isEditing ? bookToEdit.coverImageUrl : null);
      }
    } else {
      setCoverImageFile(null);
      if (isEditing) {
        setCoverPreviewUrl(bookToEdit.coverImageUrl);
      } else if (pdfFile && form.getValues("title") && form.getValues("summary")) { 
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
    let bookId = isEditing && bookToEdit ? bookToEdit.id : Date.now().toString();
    let finalCoverImageUrl = coverPreviewUrl; 
    let finalPdfDataUri = currentPdfDataUri; 
    let finalPdfFileName = pdfFileName; 
    
    if (isEditing && bookToEdit && !coverImageFile) {
        finalCoverImageUrl = bookToEdit.coverImageUrl;
    }
    if (isEditing && bookToEdit && !pdfFile) {
        finalPdfDataUri = bookToEdit.pdfDataUri;
        finalPdfFileName = bookToEdit.pdfFileName;
    }

    if (!isEditing && (!pdfFile || !finalPdfDataUri)) {
      toast({ 
        title: "Missing PDF", 
        description: "Please ensure a PDF is uploaded for a new book.", 
        variant: "destructive" 
      });
      return;
    }

    const savedBook: Book = {
      id: bookId, 
      ...data,
      coverImageUrl: finalCoverImageUrl || "https://placehold.co/200x300.png", 
      pdfFileName: finalPdfFileName || "",
      pdfDataUri: finalPdfDataUri || "", 
    };
    onSaveBook(savedBook, isEditing);
    toast({ title: isEditing ? "Book Updated!" : "Book Added!", description: `${data.title} has been ${isEditing ? 'updated' : 'added'}.` });
    onOpenChange(false); 
  };
  
  const handleDialogClose = () => {
    resetFormState();
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
                  <span>{pdfFile || (isEditing && bookToEdit?.pdfFileName) ? "Change PDF" : "Upload a PDF"}</span>
                  <Input id="pdf-upload" name="pdf-upload" type="file" className="sr-only" onChange={onPdfInputChange} accept="application/pdf" />
                </Label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-muted-foreground">{pdfFileName || "PDF up to 10MB (approx)"}</p>
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
            <Controller name="summary" control={form.control} render={({ field }) => <Textarea id="summary" {...field} rows={4} />} />
            {form.formState.errors.summary && <p className="text-sm text-destructive">{form.formState.errors.summary.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cover-image-upload" className="font-headline">Cover Image</Label>
             <div className="mt-1 flex items-center space-x-4">
                {coverPreviewUrl ? (
                    <img src={coverPreviewUrl} alt="Cover preview" className="h-24 w-16 object-cover rounded-md border" data-ai-hint="book cover"/>
                ) : (
                    <div className="h-24 w-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                        <ImageUp className="h-8 w-8" />
                    </div>
                )}
                <Button type="button" variant="outline" asChild>
                  <Label htmlFor="cover-image-upload" className="cursor-pointer">
                    {coverPreviewUrl && !coverImageFile ? "Change" : "Upload"} Cover
                    <Input id="cover-image-upload" name="cover-image-upload" type="file" className="sr-only" onChange={handleCoverImageChange} accept="image/*" />
                  </Label>
                </Button>
            </div>
            {isGeneratingCover && (
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Sparkles className="h-4 w-4 animate-pulse mr-2 text-primary" />
                <span>Generating AI cover... This may take a moment.</span>
              </div>
            )}
            {!isEditing && !coverImageFile && !isGeneratingCover && pdfFile && !coverPreviewUrl && (
              <p className="text-xs text-muted-foreground mt-1">AI cover generation failed or was skipped. A placeholder will be used if no cover is uploaded. You can still add the book.</p>
            )}
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={handleDialogClose}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isExtracting || isGeneratingCover || (!isEditing && !pdfFile) }>
              {isExtracting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isGeneratingCover ? <Sparkles className="h-4 w-4 animate-pulse mr-2" /> : null}
              {isEditing ? "Save Changes" : "Add Book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


    