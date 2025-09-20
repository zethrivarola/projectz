-- Database initialization script for Zeth Rivarola Photography
-- This script sets up the database schema, indexes, and initial configuration

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create database user if not exists (for additional security)
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'zeth_app_user') THEN
      CREATE ROLE zeth_app_user WITH LOGIN PASSWORD 'change_me_in_production';
   END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE zeth_photography TO zeth_app_user;
GRANT USAGE ON SCHEMA public TO zeth_app_user;
GRANT CREATE ON SCHEMA public TO zeth_app_user;

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    cover_photo_url TEXT,
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(255) UNIQUE,
    download_enabled BOOLEAN DEFAULT true,
    watermark_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    exif_data JSONB,
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    web_url TEXT,
    high_res_url TEXT,
    original_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watermarks table
CREATE TABLE IF NOT EXISTS watermarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    opacity DECIMAL(3,2) DEFAULT 0.30,
    position VARCHAR(50) DEFAULT 'bottom-right',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client favorites table (for gallery sharing)
CREATE TABLE IF NOT EXISTS client_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    client_email VARCHAR(255),
    session_token VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, photo_id, client_email)
);

-- Download requests table
CREATE TABLE IF NOT EXISTS download_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    client_email VARCHAR(255) NOT NULL,
    pin_code VARCHAR(10),
    photos_selected JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    download_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_share_token ON collections(share_token);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_photos_collection_id ON photos(collection_id);
CREATE INDEX IF NOT EXISTS idx_photos_sort_order ON photos(collection_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_is_featured ON photos(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_client_favorites_collection ON client_favorites(collection_id);
CREATE INDEX IF NOT EXISTS idx_client_favorites_email ON client_favorites(client_email);

CREATE INDEX IF NOT EXISTS idx_download_requests_collection ON download_requests(collection_id);
CREATE INDEX IF NOT EXISTS idx_download_requests_token ON download_requests(download_token);
CREATE INDEX IF NOT EXISTS idx_download_requests_expires ON download_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_collections_search ON collections USING gin(to_tsvector('english', name || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_photos_search ON photos USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
('app_name', 'Zeth Rivarola Photography', 'Application name'),
('max_upload_size', '50', 'Maximum upload size in MB'),
('watermark_opacity', '0.3', 'Default watermark opacity'),
('gallery_items_per_page', '50', 'Number of items per page in gallery'),
('download_pin_length', '6', 'Length of download PIN codes'),
('session_timeout', '3600', 'Session timeout in seconds')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions on all tables to app user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO zeth_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO zeth_app_user;

-- Create a function to clean up expired download requests
CREATE OR REPLACE FUNCTION cleanup_expired_downloads()
RETURNS void AS $$
BEGIN
    DELETE FROM download_requests WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION cleanup_expired_downloads() TO zeth_app_user;

-- Insert a default admin user (password should be changed)
-- Default password is 'admin123' - CHANGE THIS IN PRODUCTION
INSERT INTO admin_users (email, password_hash, name) VALUES
('admin@zethrivarola.com', '$2b$10$8K1p/a0dCVFkXJT8YnWxGuJFR4H8Wq5Zt9j8PkLmN3oQrStUvWxYe', 'Administrator')
ON CONFLICT (email) DO NOTHING;

-- Create a maintenance function for regular cleanup
CREATE OR REPLACE FUNCTION maintenance_cleanup()
RETURNS void AS $$
BEGIN
    -- Clean up expired download requests
    PERFORM cleanup_expired_downloads();

    -- Update statistics
    ANALYZE collections;
    ANALYZE photos;
    ANALYZE client_favorites;
    ANALYZE download_requests;

    -- Log maintenance completion
    RAISE NOTICE 'Database maintenance completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION maintenance_cleanup() TO zeth_app_user;
