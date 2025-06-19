
"use client";

import { useState, useCallback, ChangeEvent, DragEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Book } from "@/types";
import { extractBookMetadata } from "@/ai/flows/extract-book-metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, ImageUp, Loader2 } from "lucide-react";

const BookFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  summary: z.string().min(1, "Summary is required"),
});

type BookFormData = z.infer<typeof BookFormSchema>;

interface UploadBookFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBook: (book: Book) => void;
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

export default function UploadBookForm({ isOpen, onOpenChange, onAddBook }: UploadBookFormProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [currentPdfDataUri, setCurrentPdfDataUri] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const { toast } = useToast();

  const form = useForm<BookFormData>({
    resolver: zodResolver(BookFormSchema),
    defaultValues: { title: "", author: "", summary: "" },
  });

  const resetFormState = () => {
    form.reset({ title: "", author: "", summary: "" });
    setPdfFile(null);
    setPdfFileName("");
    setCurrentPdfDataUri(null);
    setCoverImageFile(null);
    setCoverPreviewUrl(null);
    setIsExtracting(false);
  };

  const handlePdfFileChange = async (file: File | null) => {
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file (.pdf).",
          variant: "destructive",
        });
        resetFormState(); // Reset relevant states
        form.resetField("title"); // Clear fields potentially filled by a previous valid PDF
        form.resetField("author");
        form.resetField("summary");
        return;
      }

      setPdfFile(file);
      setPdfFileName(file.name);
      form.reset({ title: "", author: "", summary: "" }); 
      setIsExtracting(true);
      setCurrentPdfDataUri(null); 
      try {
        const pdfDataUriForMeta = await readFileAsDataURL(file);
        
        if (!pdfDataUriForMeta || !pdfDataUriForMeta.startsWith('data:application/pdf;base64,')) {
            throw new Error('Generated PDF Data URI is invalid. It might be empty or not correctly formatted.');
        }
        setCurrentPdfDataUri(pdfDataUriForMeta); 
        
        const metadata = await extractBookMetadata({ pdfDataUri: pdfDataUriForMeta });
        form.setValue("title", metadata.title);
        form.setValue("author", metadata.author);
        form.setValue("summary", metadata.summary);
        toast({ title: "Metadata Extracted", description: "Review and edit the details below." });
      } catch (error: any) { 
        console.error("Failed to extract metadata or read PDF:", error);
        setCurrentPdfDataUri(null); 
        toast({
          title: "PDF Processing Error",
          description: `Could not process PDF: ${error.message || "Unknown error"}. Please try again or fill in manually.`,
          variant: "destructive",
        });
        setPdfFile(null); // Clear invalid PDF file
        setPdfFileName("");
      } finally {
        setIsExtracting(false);
      }
    } else {
      resetFormState(); // Full reset if file is null
    }
  };

  const onPdfInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handlePdfFileChange(e.target.files ? e.target.files[0] : null);
    // Clear the input value to allow re-uploading the same file if needed after an error
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
        e.target.value = ""; // Clear the input
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
        setCoverPreviewUrl(null);
      }
    } else {
      setCoverImageFile(null);
      setCoverPreviewUrl(null);
    }
     e.target.value = ""; // Clear the input value for cover image as well
  };

  const onSubmit = async (data: BookFormData) => {
    if (!pdfFile || !coverImageFile) {
      toast({ 
        title: "Missing Files", 
        description: "Please ensure PDF and cover image are uploaded.", 
        variant: "destructive" 
      });
      return;
    }

    if (!currentPdfDataUri || !currentPdfDataUri.startsWith('data:application/pdf;base64,')) {
        toast({
            title: "Invalid PDF Data",
            description: "The PDF data could not be processed or is missing. Please re-upload the PDF.",
            variant: "destructive",
        });
        return;
    }
    
    // Ensure coverPreviewUrl which holds the data URI for the cover image is also present
    if (!coverPreviewUrl) {
      toast({
          title: "Missing Cover Image Data",
          description: "The cover image data is missing. Please re-upload the cover image.",
          variant: "destructive",
      });
      return;
    }


    try {
      // coverPreviewUrl already holds the data URI from handleCoverImageChange
      const newBook: Book = {
        id: Date.now().toString(), 
        ...data,
        coverImageUrl: coverPreviewUrl, // Use the stored data URI
        pdfFileName: pdfFile.name,
        pdfDataUri: currentPdfDataUri, 
      };
      onAddBook(newBook);
      toast({ title: "Book Added!", description: `${data.title} has been added to your shelf.` });
      
      resetFormState();
      onOpenChange(false); 
    } catch (error: any) {
      console.error("Error adding book:", error);
      toast({ title: "Error Adding Book", description: `Failed to add book: ${error.message || "Could not process files."}`, variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            resetFormState(); // Reset form if dialog is closed
        }
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Add New Book</DialogTitle>
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
                  <span>Upload a PDF</span>
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
                    {coverImageFile ? "Change" : "Upload"} Cover
                    <Input id="cover-image-upload" name="cover-image-upload" type="file" className="sr-only" onChange={handleCoverImageChange} accept="image/*" />
                  </Label>
                </Button>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isExtracting || !pdfFile || !coverImageFile || !currentPdfDataUri}>
              {isExtracting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Book
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

