"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Book } from "@/types";
import BookCard from "@/components/BookCard";
import UploadBookForm from "@/components/UploadBookForm";
import BookDetailView from "@/components/BookDetailView";
import { Button } from "@/components/ui/button";
import { PlusCircle, BookOpen, Sun, Moon, SearchX, Loader2 } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { initDB, getBooks, saveBook, deleteBook } from "@/lib/db";

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [selectedBookForDetail, setSelectedBookForDetail] = useState<Book | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

  // Initialize DB on component mount
  useEffect(() => {
    setIsClient(true);
    initDB().then(success => {
      if (success) {
        setIsDbReady(true);
      } else {
        toast({
          title: "Database Error",
          description: "Could not initialize the local database. Your books cannot be saved.",
          variant: "destructive",
        });
      }
    });
  }, [toast]);

  // Load books from IndexedDB when it's ready
  useEffect(() => {
    if (isDbReady) {
      getBooks().then(storedBooks => {
        setBooks(storedBooks);
      }).catch(error => {
        console.error("Error loading books from IndexedDB:", error);
        toast({
          title: "Error Loading Books",
          description: "Could not load saved books from the database.",
          variant: "destructive",
        });
      });
    }
  }, [isDbReady, toast]);


  const handleOpenUploadModal = (book: Book | null = null) => {
    setEditingBook(book);
    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
    setEditingBook(null);
  };

  const handleSaveBook = async (bookData: Book, isEditing: boolean) => {
    try {
      const savedBookData = await saveBook(bookData);
      setBooks((prevBooks) => {
        if (isEditing) {
          const updatedBooks = prevBooks.map((b) => (b.id === savedBookData.id ? savedBookData : b));
          if (selectedBookForDetail && selectedBookForDetail.id === savedBookData.id) {
            setSelectedBookForDetail(savedBookData); 
          }
          return updatedBooks;
        }
        // For new books, just refetch from DB to get the sorted list
        getBooks().then(setBooks);
        return prevBooks; // temporarily return old state
      });
      // A cleaner way to update for new book:
       if (!isEditing) {
          getBooks().then(setBooks);
       }
      handleCloseUploadModal();
    } catch (error) {
      console.error("Error saving book to DB:", error);
      toast({
        title: "Storage Error",
        description: "Could not save the book to the database.",
        variant: "destructive",
      });
    }
  };
  
  const handleCloseDetailView = useCallback(() => {
    setIsDetailViewOpen(false);
    setTimeout(() => setSelectedBookForDetail(null), 300); 
  }, []);

  const handleRemoveBook = useCallback(async (id: string) => {
    try {
      await deleteBook(id);
      setBooks((prevBooks) => prevBooks.filter((book) => book.id !== id));
      toast({
        title: "Book Removed",
        description: "The book has been removed from your shelf.",
      });
      if (selectedBookForDetail && selectedBookForDetail.id === id) {
        handleCloseDetailView();
      }
    } catch (error) {
      console.error("Error removing book from DB:", error);
      toast({
        title: "Deletion Error",
        description: "Could not remove the book from the database.",
        variant: "destructive",
      });
    }
  }, [toast, selectedBookForDetail, handleCloseDetailView]);


  const handleEditBookInDetailView = useCallback((book: Book) => {
    handleCloseDetailView(); 
    setTimeout(() => handleOpenUploadModal(book), 150); 
  }, [handleCloseDetailView]);

  const handleUpdateProgress = useCallback(async (bookId: string, currentPage: number) => {
    const bookToUpdate = books.find(b => b.id === bookId);
    if (bookToUpdate) {
      const updatedBook = { ...bookToUpdate, currentPage };
      try {
        await saveBook(updatedBook);
        setBooks(prevBooks =>
          prevBooks.map(book => {
            if (book.id === bookId) {
              if (selectedBookForDetail && selectedBookForDetail.id === bookId) {
                setSelectedBookForDetail(updatedBook); 
              }
              return updatedBook;
            }
            return book;
          })
        );
      } catch (error) {
         console.error("Error updating progress in DB:", error);
        toast({
          title: "Sync Error",
          description: "Could not save your reading progress.",
          variant: "destructive",
        });
      }
    }
  }, [books, selectedBookForDetail, toast]);

  const handleOpenDetailView = useCallback((book: Book) => {
    setSelectedBookForDetail(book);
    setIsDetailViewOpen(true);
  }, []);


  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <BookOpen className="h-16 w-16 text-primary animate-pulse" />
        <p className="text-xl font-headline text-primary mt-4">Loading BookShelf...</p>
      </div>
    );
  }
  
  if (!isDbReady) {
     return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="text-xl font-headline text-primary mt-4">Preparing your bookshelf...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="py-4 sm:py-6 px-4 md:px-8 border-b border-border shadow-sm sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl sm:text-3xl font-headline text-primary flex items-center shrink-0">
            <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 mr-2 sm:mr-3 text-accent" />
            BookShelf
          </Link>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button 
              aria-label="Add new book" 
              onClick={() => handleOpenUploadModal()} 
              size="sm" 
              className="px-2 py-1 sm:px-3 sm:py-2 h-9 sm:h-10"
            >
              <PlusCircle className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Add Book</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <Moon className="h-[1.1rem] w-[1.1rem] sm:h-[1.2rem] sm:w-[1.2rem]" />
              ) : (
                <Sun className="h-[1.1rem] w-[1.1rem] sm:h-[1.2rem] sm:w-[1.2rem]" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-[60vh]">
            <SearchX className="h-24 w-24 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-headline text-foreground mb-2">Your Shelf is Empty</h2>
            <p className="text-muted-foreground mb-6">Click "Add Book" to start building your digital library.</p>
            <Button 
              aria-label="Add your first book" 
              onClick={() => handleOpenUploadModal()}
              size="sm"
              className="px-3 py-2 sm:px-4"
            >
              <PlusCircle className="h-5 w-5 mr-2" /> Add Your First Book
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {Array.isArray(books) && books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onOpenDetailView={handleOpenDetailView}
              />
            ))}
          </div>
        )}
      </main>

      {isUploadModalOpen && (
        <UploadBookForm
          isOpen={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
          onSaveBook={handleSaveBook}
          bookToEdit={editingBook}
        />
      )}

      <BookDetailView
        book={selectedBookForDetail}
        isOpen={isDetailViewOpen}
        onClose={handleCloseDetailView}
        onEditBook={handleEditBookInDetailView}
        onRemoveBook={handleRemoveBook}
        onUpdateProgress={handleUpdateProgress}
      />

      <footer className="py-4 px-4 md:px-8 border-t border-border mt-auto">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} BookShelf App. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
