import { nanoid } from 'nanoid';
import type { User, Video, Category, Genre } from '../../types';

/**
 * In-memory data store
 * In production, replace this with a real database (PostgreSQL, MongoDB, etc.)
 */
class DataStore {
  private users: Map<string, User> = new Map();
  private videos: Map<string, Video> = new Map();
  private categories: Map<string, Category> = new Map();
  private genres: Map<string, Genre> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  // Initialize with some default data
  private initializeDefaultData() {
    // Default genres
    const defaultGenres = [
      { name: 'Drama', slug: 'drama' },
      { name: 'Comedy', slug: 'comedy' },
      { name: 'Thriller', slug: 'thriller' },
      { name: 'Documentary', slug: 'documentary' },
      { name: 'Horror', slug: 'horror' },
      { name: 'Romance', slug: 'romance' },
      { name: 'Action', slug: 'action' },
      { name: 'Sci-Fi', slug: 'sci-fi' },
    ];

    defaultGenres.forEach((genre) => {
      const id = `gen_${nanoid(10)}`;
      this.genres.set(id, { id, ...genre });
    });

    // Default categories
    const defaultCategories = [
      {
        name: 'Independent Films',
        slug: 'independent-films',
        description: 'Discover amazing indie films from local filmmakers',
      },
      {
        name: 'Short Films',
        slug: 'short-films',
        description: 'Collection of captivating short films',
      },
      {
        name: 'Documentaries',
        slug: 'documentaries',
        description: 'Real stories, real people',
      },
    ];

    defaultCategories.forEach((category) => {
      const id = `cat_${nanoid(10)}`;
      this.categories.set(id, {
        id,
        ...category,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }

  // User operations
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const id = `usr_${nanoid(10)}`;
    const newUser: User = {
      id,
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, newUser);
    return newUser;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updated = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  // Video operations
  createVideo(video: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>): Video {
    const id = `vid_${nanoid(10)}`;
    const newVideo: Video = {
      id,
      ...video,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.videos.set(id, newVideo);
    return newVideo;
  }

  getVideoById(id: string): Video | undefined {
    return this.videos.get(id);
  }

  updateVideo(id: string, updates: Partial<Video>): Video | undefined {
    const video = this.videos.get(id);
    if (!video) return undefined;

    const updated = {
      ...video,
      ...updates,
      updatedAt: new Date(),
    };
    this.videos.set(id, updated);
    return updated;
  }

  deleteVideo(id: string): boolean {
    return this.videos.delete(id);
  }

  getAllVideos(): Video[] {
    return Array.from(this.videos.values());
  }

  getVideosByCategory(categoryId: string): Video[] {
    return this.getAllVideos().filter((v) => v.categoryId === categoryId);
  }

  getVideosByGenre(genre: string): Video[] {
    return this.getAllVideos().filter((v) => v.genres.includes(genre));
  }

  getVideosByUser(userId: string): Video[] {
    return this.getAllVideos().filter((v) => v.uploadedBy === userId);
  }

  searchVideos(query: string): Video[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllVideos().filter(
      (v) =>
        v.title.toLowerCase().includes(lowerQuery) ||
        v.description.toLowerCase().includes(lowerQuery)
    );
  }

  // Category operations
  createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Category {
    const id = `cat_${nanoid(10)}`;
    const newCategory: Category = {
      id,
      ...category,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  getCategoryById(id: string): Category | undefined {
    return this.categories.get(id);
  }

  getCategoryBySlug(slug: string): Category | undefined {
    return Array.from(this.categories.values()).find((c) => c.slug === slug);
  }

  updateCategory(id: string, updates: Partial<Category>): Category | undefined {
    const category = this.categories.get(id);
    if (!category) return undefined;

    const updated = {
      ...category,
      ...updates,
      updatedAt: new Date(),
    };
    this.categories.set(id, updated);
    return updated;
  }

  deleteCategory(id: string): boolean {
    return this.categories.delete(id);
  }

  getAllCategories(): Category[] {
    return Array.from(this.categories.values());
  }

  // Genre operations
  getAllGenres(): Genre[] {
    return Array.from(this.genres.values());
  }

  getGenreById(id: string): Genre | undefined {
    return this.genres.get(id);
  }

  getGenreBySlug(slug: string): Genre | undefined {
    return Array.from(this.genres.values()).find((g) => g.slug === slug);
  }

  // Statistics
  incrementViewCount(videoId: string): boolean {
    const video = this.videos.get(videoId);
    if (!video) return false;

    video.viewCount += 1;
    this.videos.set(videoId, video);
    return true;
  }
}

// Export singleton instance
export const db = new DataStore();
