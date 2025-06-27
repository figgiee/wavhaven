### **Part 2: Implementation Plan**

#### **2.1. Guiding Principles**
*   **SOLID:** Adhere to the Single Responsibility Principle for all functions and components.
*   **Separation of Concerns (SoC):** Maintain a strict separation between UI, client-state, and server logic.
*   **CQRS:** Follow the established pattern of separating read queries from write mutations in server actions.

#### **2.2. Phase 1: MVP - Core E-commerce & Creator Journey**
*   **Epic 1: Checkout & Order Fulfillment**
    *   **Task 1.1:** Fully implement `createCheckoutSession` server action.
    *   **Task 1.2:** Connect `CheckoutClientPage.tsx` to the action.
    *   **Task 1.3:** Implement Stripe webhook handler for `checkout.session.completed`.
    *   **Task 1.4:** Create `Order`, `OrderItem`, and `UserDownloadPermission` records in the webhook.
    *   **Task 1.5:** Implement the `generateDownloadUrl` server action.
    *   **Task 1.6:** Build the UI for the `/downloads` page and connect the `DownloadButton`.

*   **Epic 2: Search & Discovery Polish**
    *   **Task 2.1:** Connect all UI controls in `FilterOverlayPanel.tsx` to the `useExploreFilters` hook.
    *   **Task 2.2:** Implement sorting logic (popularity, price) in the `searchTracks` Prisma query.
    *   **Task 2.3:** Implement robust pagination UI logic in `ExploreClientUIShadcn.tsx`.

#### **2.3. Phase 2: Producer Enablement & Onboarding**
*   **Epic 3: Producer Onboarding & Stripe Connect**
    *   **Task 3.1:** Create a "Become a Producer" UI flow.
    *   **Task 3.2:** Implement the `createStripeAccountLink` server action.
    *   **Task 3.3:** Build the Payouts/Connect UI in the producer dashboard.
    *   **Task 3.4:** Implement the `account.updated` Stripe webhook handler.

*   **Epic 4: Advanced Upload & Management**
    *   **Task 4.1:** Fully implement the `singleTrackUploadActions.ts` (prepare, finalize, cleanup).
    *   **Task 4.2:** Connect `TrackUploadForm.tsx` to the new single track upload actions.
    *   **Task 4.3:** Build out the two-column Track Edit Page UI.
    *   **Task 4.4:** Implement file replacement and deletion functionality on the Track Edit Page.
    *   **Task 4.5:** Develop the producer dashboard UI with data fetching for key stats.

#### **2.4. Phase 3: Community & Engagement Features**
*   **Epic 5: User Interactions (Likes, Comments)**
    *   **Task 5.1:** Implement the `toggleLike` server action.
    *   **Task 5.2:** Connect the UI "Like" buttons to the action with optimistic updates.
    *   **Task 5.3:** Build the UI for the `CommentsSection.tsx` component.
    *   **Task 5.4:** Implement and connect `addComment` and `deleteComment` server actions.

*   **Epic 6: User Following & Playlists**
    *   **Task 6.1:** Add `Follows`, `Playlist`, and `PlaylistTrack` models to `schema.prisma`.
    *   **Task 6.2:** Create server actions for all playlist and follow/unfollow operations.
    *   **Task 6.3:** Integrate "Follow" buttons on producer profile pages.
    *   **Task 6.4:** Implement an "Add to Playlist" feature.
    *   **Task 6.5:** Develop the "My Playlists" management page.

#### **2.5. Phase 4: Platform Maturity & Intelligence**

*   **Epic 7: Content Moderation**
    *   **Task 7.1:** Add a "Report Track" button to track detail views that triggers a server action to flag content for admin review. This action will add an entry to a new `ModerationQueue` table, noting the track ID, reporting user ID, and reason.

*   **Epic 8: AI-Powered Discovery - Detailed Plan**
    *   **Goal:** Transition the platform's recommendation engine from simple metadata filtering (e.g., same producer) to a sophisticated, content-based system that understands the sonic qualities of the audio itself. This will power a significantly more accurate "Similar Beats" section and lay the foundation for future personalization features.
    *   **Strategy: Content-Based Filtering via Audio Embeddings.** We will begin with content-based filtering as it does not suffer from the "cold start" problem (i.e., it works without needing extensive user interaction data). The core of this strategy is to convert every audio file into a high-dimensional numerical representation (a "vector" or "embedding") that captures its acoustic features like timbre, rhythm, and harmony. Tracks that are sonically similar will have vectors that are close to each other in this high-dimensional space.
    *   **Technical Architecture:**
        1.  **Audio Embedding Model:** We will leverage a state-of-the-art, pre-trained audio embedding model. A strong candidate is a model from the **CLAP (Contrastive Language-Audio Pretraining)** family, which is effective at creating meaningful representations for a wide range of sounds. We will integrate this model via a Python environment accessible from our backend.
        2.  **Vector Database:** To store and efficiently search these embeddings, we will use the `pgvector` extension for PostgreSQL, which is fully supported by Supabase. This avoids adding another new technology to the stack and keeps our data co-located.
        3.  **Background Processing Job:** Generating embeddings can be computationally intensive. To avoid blocking the user's upload process, this task will be handled asynchronously by a **Supabase Edge Function**.
        4.  **API/Server Action Layer:** A new server action will be created to query the vector database and retrieve similar tracks.
    *   **Implementation Sub-Epics & Tasks:**
        *   **Sub-Epic 8.1: Infrastructure Setup**
            *   **Task 8.1.1:** Enable the `pgvector` extension in the Supabase database via the SQL editor.
            *   **Task 8.1.2:** Create a new table in `schema.prisma` named `TrackEmbedding` with fields: `id` (PK), `trackId` (FK, unique), `embedding` (Unsupported(`vector(size)`), where `size` matches the output dimension of the chosen ML model), and `createdAt`. Run `prisma migrate dev`.
            *   **Task 8.1.3:** Research and select the specific pre-trained audio embedding model. Set up the Python environment (e.g., using a `requirements.txt`) for the Supabase Edge Function.

        *   **Sub-Epic 8.2: The Embedding Pipeline (Backend)**
            *   **Task 8.2.1:** Develop the Supabase Edge Function (`generate-embedding`). This function will:
                1.  Accept a `storagePath` and `trackId` as input.
                2.  Download the specified audio file from Supabase Storage.
                3.  Load the audio into the chosen Python ML model.
                4.  Generate the embedding vector.
                5.  `UPSERT` the embedding into the `TrackEmbedding` table against the `trackId`.
            *   **Task 8.2.2:** Create a database trigger on the `TrackFile` table. This trigger will fire on `INSERT` events where the `fileType` is `MAIN_WAV` or `MAIN_MP3` and will invoke the `generate-embedding` Edge Function, passing the new record's `storagePath` and `trackId`.

        *   **Sub-Epic 8.3: The Query & Display Layer (Full Stack)**
            *   **Task 8.3.1:** Create a new server action `getSimilarTracksByEmbedding(trackId: string)`. This action will:
                1.  Fetch the embedding for the given `trackId` from our `TrackEmbedding` table.
                2.  Use a Prisma raw query with `pgvector` operators (e.g., `<=>` for cosine distance) to find the top `N` nearest neighbors to that embedding.
                3.  Fetch the full track card data for the resulting track IDs.
            *   **Task 8.3.2:** Refactor the `SimilarBeatsSection.tsx` component to call this new `getSimilarTracksByEmbedding` server action instead of the old metadata-based one.
            *   **Task 8.3.3:** Create a one-time "backfill" script. This script will iterate through all existing tracks in the database, invoke the `generate-embedding` function for each one, and populate the `TrackEmbedding` table for the entire existing catalog. This is crucial for the feature to work on day one for all content.

    *   **Future Enhancements:**
        *   **Hybrid Recommendations:** Combine the content-based results with user behavior data (e.g., tracks frequently listened to by the same users) for a more robust hybrid recommendation engine.
        *   **Personalized "For You" Page:** Develop a dedicated discovery page that uses the user's listening history and likes to generate a personalized feed of recommended tracks.