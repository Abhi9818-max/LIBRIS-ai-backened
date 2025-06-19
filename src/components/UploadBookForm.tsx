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
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function UploadBookForm({ isOpen, onOpenChange, onAddBook }: UploadBookFormProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const { toast } = useToast();

  const form = useForm<BookFormData>({
    resolver: zodResolver(BookFormSchema),
    defaultValues: { title: "", author: "", summary: "" },
  });

  const handlePdfFileChange = async (file: File | null) => {
    if (file) {
      setPdfFile(file);
      setPdfFileName(file.name);
      form.reset(); // Reset form fields when new PDF is selected
      setIsExtracting(true);
      try {
        const pdfDataUri = await readFileAsDataURL(file);
        const metadata = await extractBookMetadata({ pdfDataUri });
        form.setValue("title", metadata.title);
        form.setValue("author", metadata.author);
        form.setValue("summary", metadata.summary);
        toast({ title: "Metadata Extracted", description: "Review and edit the details below." });
      } catch (error) {
        console.error("Failed to extract metadata:", error);
        toast({
          title: "Extraction Error",
          description: "Could not extract metadata from PDF. Please fill in manually.",
          variant: "destructive",
        });
      } finally {
        setIsExtracting(false);
      }
    } else {
      setPdfFile(null);
      setPdfFileName("");
      form.reset();
    }
  };

  const onPdfInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handlePdfFileChange(e.target.files ? e.target.files[0] : null);
  };
  
  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-primary');
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      if (event.dataTransfer.files[0].type === "application/pdf") {
        handlePdfFileChange(event.dataTransfer.files[0]);
      } else {
        toast({ title: "Invalid File", description: "Please upload a PDF file.", variant: "destructive" });
      }
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
      setCoverImageFile(file);
      const dataUrl = await readFileAsDataURL(file);
      setCoverPreviewUrl(dataUrl);
    } else {
      setCoverImageFile(null);
      setCoverPreviewUrl(null);
    }
  };

  const onSubmit = async (data: BookFormData) => {
    if (!pdfFile || !coverImageFile) {
      toast({ title: "Missing Files", description: "Please upload both PDF and cover image.", variant: "destructive" });
      return;
    }

    try {
      const coverImageUrl = await readFileAsDataURL(coverImageFile);
      const newBook: Book = {
        id: Date.now().toString(), // Simple unique ID
        ...data,
        coverImageUrl,
        pdfFileName: pdfFile.name,
      };
      onAddBook(newBook);
      toast({ title: "Book Added!", description: `${data.title} has been added to your shelf.` });
      form.reset();
      setPdfFile(null);
      setPdfFileName("");
      setCoverImageFile(null);
      setCoverPreviewUrl(null);
      onOpenChange(false); // Close dialog
    } catch (error) {
      console.error("Error adding book:", error);
      toast({ title: "Error", description: "Failed to add book.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                  <Input id="pdf-upload" name="pdf-upload" type="file" className="sr-only" onChange={onPdfInputChange} accept=".pdf" />
                </Label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-muted-foreground">{pdfFileName || "PDF up to 10MB"}</p>
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
            <Button type="submit" disabled={isExtracting || !pdfFile || !coverImageFile}>
              {isExtracting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Book
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
