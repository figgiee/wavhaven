#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

// Initialize Prisma and Supabase clients
const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function backfillEmbeddings() {
  console.log('🚀 Starting embedding backfill process...\n');
  
  try {
    // 1. Get all tracks that have main audio files but no embeddings
    const tracksNeedingEmbeddings = await prisma.track.findMany({
      where: {
        AND: [
          {
            trackFiles: {
              some: {
                fileType: {
                  in: ['MAIN_MP3', 'MAIN_WAV']
                }
              }
            }
          },
          {
            TrackEmbedding: null // No embedding exists yet
          }
        ]
      },
      include: {
        trackFiles: {
          where: {
            fileType: {
              in: ['MAIN_MP3', 'MAIN_WAV']
            }
          }
        }
      }
    });

    console.log(`📊 Found ${tracksNeedingEmbeddings.length} tracks requiring embeddings\n`);

    if (tracksNeedingEmbeddings.length === 0) {
      console.log('✅ All tracks already have embeddings!');
      return;
    }

    let processed = 0;
    let failed = 0;
    const batchSize = 5; // Process in small batches to avoid overwhelming the edge function

    // Process tracks in batches
    for (let i = 0; i < tracksNeedingEmbeddings.length; i += batchSize) {
      const batch = tracksNeedingEmbeddings.slice(i, i + batchSize);
      
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tracksNeedingEmbeddings.length / batchSize)}`);
      
      // Process batch in parallel
      const promises = batch.map(async (track) => {
        try {
          const mainAudioFile = track.trackFiles[0]; // Get the first main audio file
          
          if (!mainAudioFile) {
            console.warn(`⚠️  Track ${track.id} (${track.title}) has no main audio file`);
            return { success: false, reason: 'No main audio file' };
          }

          console.log(`   📁 Processing: ${track.title}`);

          // Call the generate-embedding edge function
          const { data, error } = await supabase.functions.invoke('generate-embedding', {
            body: {
              record: {
                id: track.id,
                mainAudioFilePath: mainAudioFile.storagePath
              }
            }
          });

          if (error) {
            console.error(`   ❌ Failed to generate embedding for ${track.title}:`, error);
            return { success: false, reason: error.message };
          }

          console.log(`   ✅ Generated embedding for: ${track.title}`);
          return { success: true };

        } catch (error) {
          console.error(`   ❌ Exception processing ${track.title}:`, error.message);
          return { success: false, reason: error.message };
        }
      });

      // Wait for batch to complete
      const results = await Promise.all(promises);
      
      // Update counters
      const batchProcessed = results.filter(r => r.success).length;
      const batchFailed = results.filter(r => !r.success).length;
      
      processed += batchProcessed;
      failed += batchFailed;

      console.log(`   📈 Batch complete: ${batchProcessed} succeeded, ${batchFailed} failed\n`);

      // Brief delay between batches to be respectful to the edge function
      if (i + batchSize < tracksNeedingEmbeddings.length) {
        console.log('   ⏳ Waiting 2 seconds before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('🎉 Backfill process completed!\n');
    console.log(`📊 Final Results:`);
    console.log(`   ✅ Successfully processed: ${processed} tracks`);
    console.log(`   ❌ Failed: ${failed} tracks`);
    console.log(`   📈 Total: ${processed + failed} tracks`);
    
    if (failed > 0) {
      console.log('\n⚠️  Some tracks failed to process. Check the logs above for details.');
      console.log('   You can re-run this script to retry failed tracks.');
    }

  } catch (error) {
    console.error('💥 Fatal error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Script execution
if (require.main === module) {
  backfillEmbeddings()
    .then(() => {
      console.log('\n🏁 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { backfillEmbeddings }; 