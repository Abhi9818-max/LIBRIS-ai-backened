
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import type { Book } from "@/types";
import BookCard from "@/components/BookCard";
import UploadBookForm from "@/components/UploadBookForm";
import BookDetailView from "@/components/BookDetailView";
import { Button } from "@/components/ui/button";
import { PlusCircle, BookOpen, SearchX, Loader2, Search, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { initDB, getBooks, saveBook, deleteBook } from "@/lib/db";
import { defaultBooks } from "@/lib/default-books";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { UserNav } from "@/components/auth/UserNav";


export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const { toast } = useToast();

  const [selectedBookForDetail, setSelectedBookForDetail] = useState<Book | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [initialDetailTab, setInitialDetailTab] = useState<'details' | 'read'>('read');

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    // With guest-only mode, we no longer need to redirect to /auth
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
  
  const populateDefaultBooks = useCallback(async () => {
    try {
      const booksToSave = defaultBooks.map((book, index) => ({
        ...book,
        id: `default-${Date.now()}-${index}`,
        highlights: [],
      }));
      await Promise.all(booksToSave.map(book => saveBook(book)));
      const allBooks = await getBooks();
      setBooks(allBooks);
      toast({
        title: "Welcome to Libris!",
        description: "We've added a few classic books to your shelf to get you started.",
      });
    } catch (error) {
      console.error("Error populating default books:", error);
      toast({
        title: "Error",
        description: "Could not add default books to your library.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (isDbReady) {
      getBooks().then(storedBooks => {
        if (storedBooks.length === 0) {
          populateDefaultBooks();
        } else {
          setBooks(storedBooks);
        }
      }).catch(error => {
        console.error("Error loading books from IndexedDB:", error);
        toast({
          title: "Error Loading Books",
          description: "Could not load saved books from the database.",
          variant: "destructive",
        });
      });
    }
  }, [isDbReady, toast, populateDefaultBooks]);


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
      await saveBook(bookData);
      const allBooks = await getBooks();
      setBooks(allBooks);
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

  const handleUpdateBook = useCallback(async (updatedBook: Book) => {
    try {
      await saveBook(updatedBook);
      setBooks(prevBooks =>
        prevBooks.map(book => {
          if (book.id === updatedBook.id) {
            if (selectedBookForDetail && selectedBookForDetail.id === updatedBook.id) {
              setSelectedBookForDetail(updatedBook); 
            }
            return updatedBook;
          }
          return book;
        })
      );
    } catch (error) {
       console.error("Error updating book in DB:", error);
      toast({
        title: "Sync Error",
        description: "Could not save your changes.",
        variant: "destructive",
      });
    }
  }, [selectedBookForDetail, toast]);

  const handleOpenDetailView = useCallback((book: Book, tab: 'details' | 'read' = 'read') => {
    setSelectedBookForDetail(book);
    setInitialDetailTab(tab);
    setIsDetailViewOpen(true);
  }, []);

  const allCategories = useMemo(() => {
    const defaultCategories = ['Novel', 'Fantasy', 'Science Fiction', 'Mystery', 'Manga', 'Non-Fiction'];
    const categoriesFromBooks = books.map(book => book.category).filter(Boolean) as string[];
    const uniqueCategories = Array.from(new Set([...defaultCategories, ...categoriesFromBooks]));
    
    uniqueCategories.sort((a, b) => a.localeCompare(b));
    uniqueCategories.push('Other');
    
    return Array.from(new Set(uniqueCategories));
  }, [books]);

  const filteredBooks = useMemo(() => {
    const categoryFiltered = books.filter(book =>
      selectedCategory === 'All' || book.category === selectedCategory
    );

    if (!searchQuery.trim()) {
      return categoryFiltered;
    }

    const fuse = new Fuse(categoryFiltered, {
      keys: ['title', 'author'],
      threshold: 0.4,
      ignoreLocation: true,
    });

    return fuse.search(searchQuery).map(result => result.item);
  }, [books, searchQuery, selectedCategory]);


  if (!isClient || authLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="text-xl font-headline text-muted-foreground mt-4">Loading Libris...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 py-3 px-4 backdrop-blur-sm md:px-8">
        <div className="relative mx-auto flex w-full items-center justify-between gap-2 overflow-hidden md:gap-4">
            
            {/* Mobile Search Overlay */}
            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 flex w-full items-center gap-2 bg-background px-4 transition-all duration-300 md:hidden ${isMobileSearchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setIsMobileSearchOpen(false)}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Close search</span>
                </Button>
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input
                        type="search"
                        placeholder="Search your library..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full h-10 bg-muted/50 border-0 focus-visible:ring-primary focus-visible:ring-2"
                        aria-label="Search books"
                        autoFocus
                    />
                </div>
            </div>

            {/* Default Header Content */}
            <div className={`flex w-full items-center justify-between gap-2 transition-opacity md:gap-4 ${isMobileSearchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <Link href="/" className="text-2xl sm:text-3xl font-headline text-primary flex items-center shrink-0">
                    <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 mr-2 sm:mr-3 text-primary" />
                    <span className="hidden md:inline">Libris</span>
                </Link>

                {/* Desktop Search Bar */}
                <div className="hidden flex-1 justify-center px-4 sm:px-8 md:flex">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input
                            type="search"
                            placeholder="Search your library..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-full h-10 bg-muted/50 border-0 focus-visible:ring-primary focus-visible:ring-2"
                            aria-label="Search books"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Mobile Search Trigger */}
                    <Button variant="ghost" size="icon" className="h-10 w-10 md:hidden" onClick={() => setIsMobileSearchOpen(true)}>
                        <Search className="h-5 w-5" />
                        <span className="sr-only">Open search</span>
                    </Button>
                    <Button
                      aria-label="Add new book"
                      onClick={() => handleOpenUploadModal()}
                      size="sm"
                      className="h-10"
                    >
                      <PlusCircle className="h-5 w-5 sm:mr-2" />
                      <span className="hidden sm:inline">Add Book</span>
                    </Button>
                    <UserNav />
                </div>
            </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        {!isDbReady ? (
            <div className="flex flex-col items-center justify-center text-center h-[60vh]">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <p className="text-xl font-headline text-muted-foreground mt-4">Preparing your library...</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-full sm:max-w-xs">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full" aria-label="Filter by category">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      {allCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {books.length > 0 ? (
                filteredBooks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center h-[50vh]">
                      <SearchX className="h-24 w-24 text-muted-foreground mb-6" />
                      <h2 className="text-2xl font-headline text-foreground mb-2">No Matching Books Found</h2>
                      <p className="text-muted-foreground mb-6">Try adjusting your search or filter.</p>
                    </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {filteredBooks.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onOpenDetailView={handleOpenDetailView}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-[60vh]">
                  <SearchX className="h-24 w-24 text-muted-foreground mb-6" />
                  <h2 className="text-2xl font-headline text-foreground mb-2">Your Shelf is Empty</h2>
                  <p className="text-muted-foreground mb-6">Click "Add Book" to start building your digital library.</p>
                  <Button 
                    aria-label="Add your first book" 
                    onClick={() => handleOpenUploadModal()}
                    size="lg"
                  >
                    <PlusCircle className="h-5 w-5 mr-2" /> Add Your First Book
                  </Button>
                </div>
              )}
            </>
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
        onUpdateBook={handleUpdateBook}
        initialTab={initialDetailTab}
      />

      <footer className="py-4 px-4 md:px-8 border-t border-border mt-auto bg-background">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Libris. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
