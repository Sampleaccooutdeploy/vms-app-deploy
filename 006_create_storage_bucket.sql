-- ============================================================
-- 006: Create visitor-photos storage bucket with security policies
-- ============================================================

-- 1. Create the bucket (public so photo URLs work without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'visitor-photos',
    'visitor-photos',
    true,
    5242880,  -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Allow anyone to upload images (visitor registration is public)
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload (Images Only)" ON storage.objects;

CREATE POLICY "Allow public image uploads" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'visitor-photos'
    AND (lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp'))
);

-- 3. Allow anyone to read/view photos (needed for public URLs)
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT USING (
    bucket_id = 'visitor-photos'
);

-- 4. Only authenticated users (admins/security) can delete photos
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

CREATE POLICY "Allow authenticated delete" ON storage.objects
FOR DELETE USING (
    bucket_id = 'visitor-photos'
    AND auth.role() = 'authenticated'
);
