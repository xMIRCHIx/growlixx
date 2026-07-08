-- ==========================================================================
-- GROWLIX DIGITAL — SUPABASE SCHEMA MIGRATION SQL
-- ==========================================================================
-- Copy and run this script in your Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- This script creates the projects table and config table, then sets up permissive RLS.

-- 1. Create Projects Table
CREATE TABLE IF NOT EXISTS public.growlix_projects (
    id text PRIMARY KEY,
    title text NOT NULL,
    client text NOT NULL,
    category text NOT NULL,
    "shortDescription" text,
    "detailedDescription" text,
    challenge text,
    solution text,
    "coverImage" text,
    thumbnail text NOT NULL,
    "videoUrl" text DEFAULT '',
    "demoUrl" text DEFAULT '',
    gallery jsonb DEFAULT '[]'::jsonb,
    "beforeImage" text DEFAULT '',
    "afterImage" text DEFAULT '',
    technologies text DEFAULT '',
    "completionDate" text DEFAULT '',
    featured boolean DEFAULT false,
    "displayOrder" integer DEFAULT 999,
    status text DEFAULT 'published',
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Create Configurations Table (Stores landing config as a flexible JSONB record)
CREATE TABLE IF NOT EXISTS public.growlix_config (
    id integer PRIMARY KEY DEFAULT 1,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Enable Row-Level Security (RLS) on both tables
ALTER TABLE public.growlix_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growlix_config ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for Anonymous Access (Permits public read & write operations)
DROP POLICY IF EXISTS "Allow anonymous read" ON public.growlix_projects;
CREATE POLICY "Allow anonymous read" ON public.growlix_projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous write" ON public.growlix_projects;
CREATE POLICY "Allow anonymous write" ON public.growlix_projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous config read" ON public.growlix_config;
CREATE POLICY "Allow anonymous config read" ON public.growlix_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous config write" ON public.growlix_config;
CREATE POLICY "Allow anonymous config write" ON public.growlix_config FOR ALL USING (true) WITH CHECK (true);

-- 5. Supabase Storage Bucket Initialization for Image Uploads
-- Creates a public storage bucket named 'growlix-media'
INSERT INTO storage.buckets (id, name, public)
VALUES ('growlix-media', 'growlix-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allows anyone to upload and retrieve images inside this public bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'growlix-media');

DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'growlix-media');

DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'growlix-media');

DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'growlix-media');

-- 6. Customer Queries and Booking Enquiries Table
CREATE TABLE IF NOT EXISTS public.growlix_queries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text,
    phone text,
    query_type text NOT NULL, -- 'contact' or 'booking'
    event_type text,         -- e.g. Wedding, Commercial, brand identity etc.
    event_date text,         -- e.g. Jul 27, 2024
    message text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.growlix_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous query select" ON public.growlix_queries;
CREATE POLICY "Allow anonymous query select" ON public.growlix_queries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous query insert" ON public.growlix_queries;
CREATE POLICY "Allow anonymous query insert" ON public.growlix_queries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous query all" ON public.growlix_queries;
CREATE POLICY "Allow anonymous query all" ON public.growlix_queries FOR ALL USING (true) WITH CHECK (true);


