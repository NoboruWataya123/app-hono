import { db } from './client';
import { genres, categories } from './schema';
import { nanoid } from 'nanoid';

/**
 * Seed database with initial data
 */
async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Insert genres
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

    console.log('📝 Inserting genres...');
    for (const genre of defaultGenres) {
      await db
        .insert(genres)
        .values({
          id: `gen_${nanoid(10)}`,
          ...genre,
        })
        .onConflictDoNothing();
    }

    // Insert categories
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

    console.log('📝 Inserting categories...');
    for (const category of defaultCategories) {
      await db
        .insert(categories)
        .values({
          id: `cat_${nanoid(10)}`,
          ...category,
        })
        .onConflictDoNothing();
    }

    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
