-- Migration: Add sales count, user download permissions, and license updates
-- Description:
--   - Adds 'salesCount' column to 'Track' table to track sales.
--   - Adds 'isAvailable' column to 'License' table to allow toggling tiers.
--   - Adds unique constraint on ('trackId', 'type') to 'License' table.
--   - Creates 'UserDownloadPermission' table to manage download rights.
--   - Enables RLS on 'UserDownloadPermission' table.

-- Add salesCount to Track table
alter table "Track" add column "salesCount" integer not null default 0;
comment on column "Track"."salesCount" is 'Number of times this track has been successfully purchased.';

-- Add isAvailable to License table
alter table "License" add column "isAvailable" boolean not null default true;
comment on column "License"."isAvailable" is 'Whether this specific license tier is available for purchase for this track.';

-- Add unique constraint to License table
-- Note: Ensure no duplicate (trackId, type) combinations exist before applying.
alter table "License" add constraint "License_trackId_type_key" unique ("trackId", "type");

-- Create UserDownloadPermission table
create table "UserDownloadPermission" (
    "id" uuid not null default gen_random_uuid(),
    "userId" uuid not null,
    "trackId" uuid not null,
    "orderItemId" uuid null, -- Nullable link to the specific order item granting permission
    "createdAt" timestamp with time zone not null default now(),
    constraint "UserDownloadPermission_pkey" primary key ("id"),
    constraint "UserDownloadPermission_userId_fkey" foreign key ("userId") references "User"(id) on delete cascade,
    constraint "UserDownloadPermission_trackId_fkey" foreign key ("trackId") references "Track"(id) on delete cascade,
    constraint "UserDownloadPermission_orderItemId_fkey" foreign key ("orderItemId") references "OrderItem"(id) on delete set null,
    constraint "UserDownloadPermission_userId_trackId_key" unique ("userId", "trackId")
);

-- Add indexes for common lookups
create index "UserDownloadPermission_userId_idx" on "UserDownloadPermission"("userId");
create index "UserDownloadPermission_trackId_idx" on "UserDownloadPermission"("trackId");
create index "UserDownloadPermission_orderItemId_idx" on "UserDownloadPermission"("orderItemId");

-- Add comments to the new table and columns
comment on table "UserDownloadPermission" is 'Grants a user permission to download files associated with a specific track.';
comment on column "UserDownloadPermission"."userId" is 'The user granted permission.';
comment on column "UserDownloadPermission"."trackId" is 'The track the user has permission to download.';
comment on column "UserDownloadPermission"."orderItemId" is 'The specific order item that resulted in this permission grant.';
comment on column "UserDownloadPermission"."createdAt" is 'Timestamp when the permission was granted.';
comment on constraint "UserDownloadPermission_userId_trackId_key" on "UserDownloadPermission" is 'Ensures a user has only one download permission record per track.';


-- Enable Row Level Security (RLS) for the new table
alter table "UserDownloadPermission" enable row level security;

-- RLS Policies for UserDownloadPermission table

-- Allow authenticated users to select their own download permissions
create policy "Allow authenticated users to select own permissions"
on "UserDownloadPermission" for select
to authenticated
using (auth.uid() = "userId");

-- Allow service_role or backend to insert any permission
create policy "Allow service role to insert any permission"
on "UserDownloadPermission" for insert
to service_role
with check (true);


-- Allow service_role or backend to update any permission
create policy "Allow service role to update any permission"
on "UserDownloadPermission" for update
to service_role
using (true);


-- Allow service_role or backend to delete any permission
create policy "Allow service role to delete any permission"
on "UserDownloadPermission" for delete
to service_role
using (true);


-- Deny all operations for anonymous users
create policy "Deny anonymous access"
on "UserDownloadPermission" for all
to anon
using (false); 