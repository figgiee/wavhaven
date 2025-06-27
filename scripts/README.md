# Scripts Documentation

This directory contains utility scripts for managing and maintaining the Wavhaven platform.

## Available Scripts

### `backfill-embeddings.js`

A one-time script to generate AI embeddings for all existing tracks in the database that don't have embeddings yet. This is essential for the AI-powered track discovery system.

#### Purpose
- Finds all tracks with main audio files that don't have embeddings
- Calls the Supabase Edge Function to generate CLAP audio embeddings
- Processes tracks in batches to avoid overwhelming the system
- Provides detailed progress reporting and error handling

#### Prerequisites
Before running this script, ensure:

1. **Environment Variables** are set:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Supabase Edge Function** is deployed:
   - The `generate-embedding` function must be deployed to your Supabase project
   - The function should have the required ML model dependencies installed

3. **Database Setup**:
   - `pgvector` extension is enabled in your Supabase database
   - `TrackEmbedding` table exists
   - `match_tracks` SQL function is created

#### Usage

```bash
# From the project root
cd scripts
node backfill-embeddings.js
```

#### What It Does

1. **Discovery**: Queries the database for tracks that have main audio files (`MAIN_MP3` or `MAIN_WAV`) but no corresponding embedding in the `TrackEmbedding` table

2. **Batch Processing**: Processes tracks in batches of 5 to:
   - Avoid overwhelming the Edge Function
   - Provide manageable progress updates
   - Allow for graceful error handling

3. **Edge Function Invocation**: For each track, calls the `generate-embedding` Supabase Edge Function with:
   - Track ID
   - Storage path to the main audio file

4. **Progress Reporting**: Provides detailed console output including:
   - Total tracks found
   - Batch progress
   - Individual track processing status
   - Final success/failure summary

#### Output Example

```
🚀 Starting embedding backfill process...

📊 Found 23 tracks requiring embeddings

🔄 Processing batch 1/5
   📁 Processing: Dark Ambient Beat
   ✅ Generated embedding for: Dark Ambient Beat
   📁 Processing: Hip Hop Groove
   ✅ Generated embedding for: Hip Hop Groove
   📈 Batch complete: 2 succeeded, 0 failed

   ⏳ Waiting 2 seconds before next batch...

🎉 Backfill process completed!

📊 Final Results:
   ✅ Successfully processed: 23 tracks
   ❌ Failed: 0 tracks
   📈 Total: 23 tracks

🏁 Script completed successfully
```

#### Error Handling

The script handles various error scenarios:

- **Missing Environment Variables**: Exits early with clear error message
- **No Main Audio Files**: Warns and skips tracks without audio files
- **Edge Function Failures**: Logs errors but continues processing other tracks
- **Network Issues**: Retries can be achieved by re-running the script

#### Re-running

The script is safe to run multiple times:
- Only processes tracks that don't already have embeddings
- Will attempt to process any previously failed tracks
- Uses database queries to ensure no duplicates

#### Troubleshooting

**"No tracks found"**: 
- Verify tracks have `MAIN_MP3` or `MAIN_WAV` files in the `TrackFile` table
- Check that tracks don't already have embeddings in `TrackEmbedding`

**"Edge Function errors"**:
- Verify the `generate-embedding` function is deployed
- Check Supabase logs for function execution details
- Ensure the function has access to the audio files in storage

**"Authentication errors"**:
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct and has necessary permissions
- Check that the service role can access both database and storage

## Future Scripts

This directory can be extended with additional maintenance scripts such as:
- Database cleanup utilities
- Analytics data processing
- Batch operations for user management
- Storage optimization scripts 