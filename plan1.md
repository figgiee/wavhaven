***

## **Wavhaven: Product Requirements & Implementation Plan**

**Version:** 2.0 (Final)
**Date:** June 26, 2025

### **Part 1: Product Requirements Document (PRD)**

#### **1.1. Overview**

Wavhaven is a modern, curated marketplace connecting talented music producers with a diverse range of creators, including artists, filmmakers, and digital media developers. The platform addresses the challenge of discovering high-quality, unique audio assets in an oversaturated market. By providing a streamlined and aesthetically pleasing interface, Wavhaven empowers producers to monetize their work effectively while enabling creators to find the perfect sounds—beats, loops, soundkits, and presets—to elevate their projects.

#### **1.2. User Personas**

*   **The Producer ("Seller"):** A music producer with a catalog of audio assets.
    *   **Goals:** Monetize their creations, build a brand, reach a wider audience, manage their sales and track performance efficiently.
    *   **Pain Points:** Low visibility on crowded platforms, unfair commission rates, cumbersome upload processes, lack of analytics.
*   **The Creator ("Customer"):** An artist, rapper, content creator, or developer.
    *   **Goals:** Discover high-quality and unique sounds that fit their creative vision, acquire licenses easily and legally, get a great value.
    *   **Pain Points:** Sifting through low-quality content, complex licensing terms, poor user experience on existing platforms.

#### **1.3. Core Features & Functionality**

##### **1.3.1. Marketplace & Discovery Engine**
*   **Explore Page:** A central, dynamic hub for users to discover all content types. It must support robust filtering and sorting to handle a growing catalog.
*   **Advanced Filtering:** Users can filter content by type, genre, mood, BPM, musical key, tags, and price.
*   **Global Search:** Quick-access, modal-based, and header-integrated search allows users to find assets from anywhere on the site.
*   **Track Detail View:** A dedicated page and a slide-out panel provide in-depth information about a specific track.

##### **1.3.2. E-commerce & Licensing**
*   **License Selection:** The platform presents clear, distinct licensing tiers for creators.

| Feature | Basic Lease | Premium Lease | Exclusive Rights |
| :--- | :--- | :--- | :--- |
| **File Delivery** | MP3 | MP3, WAV | MP3, WAV, Stems (ZIP) |
| **Use Case** | Demos, Auditions, Non-Profit | Independent Releases, Streaming | Major Releases, Full Control |
| **Streaming Limit** | 100,000 | 500,000 | Unlimited |
| **Distribution Limit**| 2,000 Units | 10,000 Units | Unlimited |
| **Music Videos** | 1 (Monetization Allowed) | Unlimited (Monetization Allowed) | Unlimited (Monetization Allowed)|
| **Radio Stations** | 0 (Not Permitted) | 2 Stations | Unlimited |
| **Exclusivity** | No (Producer can re-sell) | No (Producer can re-sell) | **Yes** (Beat is removed from sale) |
| **Credit Requirement**| `(Prod. by [Producer Name])` | `(Prod. by [Producer Name])` | `(Prod. by [Producer Name])` |

*   **Order Management & Downloads:** A full-featured "My Orders & Downloads" page, accessible from the user's dashboard.
    *   **UI/UX Theme:** Adopts the platform's standard dark theme, utilizing `Card` and `Accordion` components.
    *   **Layout:** An `Accordion` lists all past orders. Expanding an order reveals the purchased items.
    *   **Download Functionality:** Each purchased item has `DownloadButton` components for every file type included in its license.

##### **1.3.3. Producer Toolkit**
*   **Producer Dashboard:** A central hub for producers with a modular, data-rich interface.
    *   **UI/UX Theme:** Uses a grid layout of `Card` components for key stats, track management, recent activity, and Stripe Connect/payout management.
*   **Track Management:** A comprehensive, two-column workspace for editing tracks.
    *   **UI/UX Theme:** Leverages `framer-motion` for smooth animations and is built with `shadcn` components.
    *   **Layout:** Features a sticky left column for primary actions (preview, stats, publish/delete) and a scrollable right column with `Accordion` sections for details, file management, and license editing.

##### **1.3.4. User Identity & Profiles**
*   **Public User Profiles:** A producer's public storefront (`/u/[username]`).
    *   **UI/UX Principles:** Clearly establishes the producer's brand and makes their catalog discoverable.
    *   **Page Structure:** Consists of a `UserProfileHeader` (banner, avatar, stats, social links) and a `Tabs` component to organize the producer's content (Tracks, Sound Kits, Likes, etc.).
*   **Role-Based Access Control (RBAC):**
    *   **Role Definitions:** `ADMIN` (platform owner), `PRODUCER` (seller), `CUSTOMER` (default user).
    *   **Supabase RLS Implementation:** Uses a default-deny approach, with policies granting access based on the user's role and ownership of the data (e.g., a producer can only edit their own tracks). The `ADMIN` role for `wavhaven.app@gmail.com` will be enforced server-side.

##### **1.3.5. Audio Playback & User Experience**
*   **Persistent Audio Player:** A site-wide player for uninterrupted music discovery.
*   **Visual & Interactive UI:** A modern, dark-themed UI with smooth transitions and animations.
*   **Responsive Design:** Fully responsive layout for all devices.

#### **1.4. Technical Architecture**
*(This section remains as defined in v1.1)*

#### **1.5. Risks & Mitigation**
*   **Content Quality:**
    *   **Mitigation:** Implement **Automated Pre-Checks** (file format, size), a **Producer Vetting** system (new producers require manual approval for their first few uploads), and **Community Flagging** in addition to the `Submission Guidelines` and `Admin Panel`.
*   **Scalability:**
    *   **Mitigation:** Implement proper database indexing, pagination, and utilize Supabase's CDN.
*   **Legal & Copyright:**
    *   **Mitigation:** Enforce clear terms of service; implement a DMCA takedown procedure.
*   **Payment & Payout Complexity:**
    *   **Mitigation:** Thoroughly test the Stripe integration in a sandbox environment; develop robust admin tools.
