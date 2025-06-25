import { NextRequest, NextResponse } from 'next/server';

// Example data structure - replace with your actual Beat type
interface Beat {
  id: string | number;
  title: string;
  producerName: string;
  price: number;
  // Add other necessary fields
}

// Example function to fetch beats (replace with your actual data fetching logic)
async function getBeatsFromDatabase(page: number, limit: number, searchTerm?: string, sortBy?: string, genres?: string[], minBpm?: number, maxBpm?: number, key?: string, tags?: string[]): Promise<{ beats: Beat[], totalCount: number }> {
  // --- Placeholder Logic --- 
  // In a real application, you would fetch this data from your database (e.g., Supabase, PostgreSQL)
  // based on the provided filters, sorting, and pagination.
  console.log('API received params:', { page, limit, searchTerm, sortBy, genres, minBpm, maxBpm, key, tags });

  const allBeats: Beat[] = [
    // Add some sample beat data if needed for initial testing
    { id: 1, title: 'Sunset Drive', producerName: 'Synthwave King', price: 29.99 },
    { id: 2, title: 'Midnight Lo-fi', producerName: 'Chill Beats Co.', price: 19.99 },
    // ... more sample beats
  ];

  // Basic filtering/pagination simulation (replace with actual DB query)
  const filteredBeats = allBeats; // Apply actual filtering based on params here
  const totalCount = filteredBeats.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedBeats = filteredBeats.slice(startIndex, endIndex);
  // --- End Placeholder Logic ---

  return { beats: paginatedBeats, totalCount };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // --- Extract and Validate Parameters --- 
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10); // Default limit
  const searchTerm = searchParams.get('term') || undefined;
  const sortBy = searchParams.get('sortBy') || 'relevance'; // Default sort
  const genres = searchParams.get('genres')?.split(',') || undefined;
  const minBpmStr = searchParams.get('minBpm');
  const maxBpmStr = searchParams.get('maxBpm');
  const key = searchParams.get('key') || undefined;
  const tags = searchParams.get('tags')?.split(',') || undefined;

  const minBpm = minBpmStr ? parseInt(minBpmStr, 10) : undefined;
  const maxBpm = maxBpmStr ? parseInt(maxBpmStr, 10) : undefined;

  // Basic validation (you might want more robust validation)
  if (Number.isNaN(page) || page < 1) {
    return NextResponse.json({ error: 'Invalid page number' }, { status: 400 });
  }
  if (Number.isNaN(limit) || limit < 1 || limit > 100) { // Add a max limit
    return NextResponse.json({ error: 'Invalid limit value' }, { status: 400 });
  }
  if (minBpm !== undefined && Number.isNaN(minBpm)) {
      return NextResponse.json({ error: 'Invalid minBpm value' }, { status: 400 });
  }
  if (maxBpm !== undefined && Number.isNaN(maxBpm)) {
      return NextResponse.json({ error: 'Invalid maxBpm value' }, { status: 400 });
  }
  if (minBpm !== undefined && maxBpm !== undefined && minBpm > maxBpm) {
       return NextResponse.json({ error: 'minBpm cannot be greater than maxBpm' }, { status: 400 });
  }
  // Add validation for other params (sortBy, genres, key, tags) if necessary

  try {
    // --- Fetch Data --- 
    const { beats, totalCount } = await getBeatsFromDatabase(
        page,
        limit,
        searchTerm,
        sortBy,
        genres,
        minBpm,
        maxBpm,
        key,
        tags
    );

    // --- Return Response --- 
    return NextResponse.json({ 
        beats,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Error fetching beats in API route:', error);
    // Don't expose detailed internal errors to the client
    return NextResponse.json({ error: 'Failed to fetch beats. Please try again later.' }, { status: 500 });
  }
} 