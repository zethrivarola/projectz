-- Zeth Rivarola Photography Database Schema
-- PostgreSQL Schema for Client Gallery System

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User roles enum
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'client');

-- Collection visibility enum
CREATE TYPE collection_visibility AS ENUM ('public', 'private', 'password_protected');

-- Photo processing status enum
CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Download resolution enum
CREATE TYPE download_resolution AS ENUM ('web', 'high_res', 'original');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'client',
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Collections table
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    cover_photo_id UUID,
    cover_focal_point JSON, -- {x: number, y: number} for focal point
    visibility collection_visibility DEFAULT 'private',
    password_hash VARCHAR(255), -- for password protection
    is_starred BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    date_taken DATE,
    tags TEXT[],
    background_music_url TEXT,
    auto_expiry DATE,
    downloads_enabled BOOLEAN DEFAULT true,
    favorites_enabled BOOLEAN DEFAULT true,
    comments_enabled BOOLEAN DEFAULT false,
    slideshow_enabled BOOLEAN DEFAULT true,
    social_sharing_enabled BOOLEAN DEFAULT false,
    email_registration_required BOOLEAN DEFAULT false,
    gallery_assist_enabled BOOLEAN DEFAULT false,
    watermark_id UUID,
    grid_style VARCHAR(50) DEFAULT 'vertical', -- 'vertical', 'horizontal'
    thumbnail_size VARCHAR(50) DEFAULT 'regular', -- 'regular', 'large'
    grid_spacing VARCHAR(50) DEFAULT 'regular', -- 'regular', 'large'
    navigation_style VARCHAR(50) DEFAULT 'icons', -- 'icons', 'text'
    typography_style VARCHAR(50) DEFAULT 'sans', -- 'sans', 'serif', 'modern', 'bold', 'subtle'
    color_theme VARCHAR(50) DEFAULT 'light', -- 'light', 'gold', 'rose', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photos table
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INTEGER,
    height INTEGER,
    is_raw BOOLEAN DEFAULT false,
    exif_data JSON,
    focal_point JSON, -- {x: number, y: number}
    order_index INTEGER DEFAULT 0,
    is_starred BOOLEAN DEFAULT false,
    processing_status processing_status DEFAULT 'pending',
    thumbnail_url TEXT,
    web_url TEXT,
    high_res_url TEXT,
    original_url TEXT,
    watermarked_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo sets (grouped photos within collections)
CREATE TABLE photo_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo to photo set relationship
CREATE TABLE photo_set_photos (
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    photo_set_id UUID NOT NULL REFERENCES photo_sets(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    PRIMARY KEY (photo_id, photo_set_id)
);

-- Watermarks table
CREATE TABLE watermarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    position VARCHAR(50) DEFAULT 'bottom_right', -- 'top_left', 'top_right', 'bottom_left', 'bottom_right', 'center'
    scale FLOAT DEFAULT 0.1, -- 0.0 to 1.0
    opacity FLOAT DEFAULT 1.0, -- 0.0 to 1.0
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection presets
CREATE TABLE collection_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    settings JSON NOT NULL, -- All collection settings as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lightroom presets
CREATE TABLE lightroom_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    xmp_content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo preset associations
CREATE TABLE photo_presets (
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    preset_id UUID NOT NULL REFERENCES lightroom_presets(id) ON DELETE CASCADE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (photo_id, preset_id)
);

-- Collection sharing
CREATE TABLE collection_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255),
    access_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP,
    accessed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Download PINs
CREATE TABLE download_pins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    pin VARCHAR(4) NOT NULL,
    client_email VARCHAR(255),
    resolution download_resolution DEFAULT 'web',
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pin_target_check CHECK (
        (collection_id IS NOT NULL AND photo_id IS NULL) OR
        (collection_id IS NULL AND photo_id IS NOT NULL)
    )
);

-- Download activities
CREATE TABLE download_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pin_id UUID NOT NULL REFERENCES download_pins(id) ON DELETE CASCADE,
    client_email VARCHAR(255),
    client_ip INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    resolution download_resolution,
    file_size BIGINT,
    download_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- View activities
CREATE TABLE view_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    client_email VARCHAR(255),
    client_ip INET,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email activities
CREATE TABLE email_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    template_name VARCHAR(100) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    message_id VARCHAR(255) -- External email service message ID
);

-- Email templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSON, -- Available template variables
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Global settings
CREATE TABLE global_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_id, key)
);

-- User sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    client_ip INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo favorites (client favorites)
CREATE TABLE photo_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    client_email VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(photo_id, client_email)
);

-- Collection contacts (linked clients)
CREATE TABLE collection_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    contact_email VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, contact_email)
);

-- Add foreign key constraint for cover photo
ALTER TABLE collections
ADD CONSTRAINT fk_collections_cover_photo
FOREIGN KEY (cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL;

-- Add foreign key constraint for watermark
ALTER TABLE collections
ADD CONSTRAINT fk_collections_watermark
FOREIGN KEY (watermark_id) REFERENCES watermarks(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_collections_owner_id ON collections(owner_id);
CREATE INDEX idx_collections_slug ON collections(slug);
CREATE INDEX idx_collections_visibility ON collections(visibility);
CREATE INDEX idx_collections_created_at ON collections(created_at);
CREATE INDEX idx_photos_collection_id ON photos(collection_id);
CREATE INDEX idx_photos_order_index ON photos(order_index);
CREATE INDEX idx_photos_created_at ON photos(created_at);
CREATE INDEX idx_collection_shares_collection_id ON collection_shares(collection_id);
CREATE INDEX idx_collection_shares_access_token ON collection_shares(access_token);
CREATE INDEX idx_download_pins_pin ON download_pins(pin);
CREATE INDEX idx_download_pins_expires_at ON download_pins(expires_at);
CREATE INDEX idx_view_activities_collection_id ON view_activities(collection_id);
CREATE INDEX idx_view_activities_created_at ON view_activities(created_at);
CREATE INDEX idx_email_activities_collection_id ON email_activities(collection_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_access_token ON user_sessions(access_token);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_global_settings_updated_at BEFORE UPDATE ON global_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
