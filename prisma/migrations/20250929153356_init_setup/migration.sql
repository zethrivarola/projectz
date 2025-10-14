-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('OWNER', 'USER', 'CLIENT');

-- CreateEnum
CREATE TYPE "public"."CollectionVisibility" AS ENUM ('public', 'private', 'password_protected');

-- CreateEnum
CREATE TYPE "public"."ProcessingStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "public"."DownloadResolution" AS ENUM ('web', 'high_res', 'original');

-- CreateEnum
CREATE TYPE "public"."BatchJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."ShareActivityAction" AS ENUM ('viewed', 'downloaded', 'favorited', 'commented', 'password_entered', 'pin_entered', 'email_opened', 'link_shared');

-- CreateEnum
CREATE TYPE "public"."SelectionSessionStatus" AS ENUM ('active', 'completed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."PhotoSelectionStatus" AS ENUM ('pending', 'favorite', 'approved', 'rejected', 'maybe');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" TEXT,
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMP(3),
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."collections" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "cover_photo_id" TEXT,
    "cover_focal_point" JSONB,
    "visibility" "public"."CollectionVisibility" NOT NULL DEFAULT 'private',
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "password_hash" TEXT,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "date_taken" TIMESTAMP(3),
    "tags" TEXT[],
    "background_music_url" TEXT,
    "auto_expiry" TIMESTAMP(3),
    "downloads_enabled" BOOLEAN NOT NULL DEFAULT true,
    "favorites_enabled" BOOLEAN NOT NULL DEFAULT true,
    "comments_enabled" BOOLEAN NOT NULL DEFAULT false,
    "slideshow_enabled" BOOLEAN NOT NULL DEFAULT true,
    "social_sharing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_registration_required" BOOLEAN NOT NULL DEFAULT false,
    "gallery_assist_enabled" BOOLEAN NOT NULL DEFAULT false,
    "watermark_id" TEXT,
    "grid_style" TEXT NOT NULL DEFAULT 'vertical',
    "thumbnail_size" TEXT NOT NULL DEFAULT 'regular',
    "grid_spacing" TEXT NOT NULL DEFAULT 'regular',
    "navigation_style" TEXT NOT NULL DEFAULT 'icons',
    "typography_style" TEXT NOT NULL DEFAULT 'sans',
    "color_theme" TEXT NOT NULL DEFAULT 'light',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."photos" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "is_raw" BOOLEAN NOT NULL DEFAULT false,
    "exif_data" JSONB,
    "focal_point" JSONB,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "processing_status" "public"."ProcessingStatus" NOT NULL DEFAULT 'pending',
    "thumbnail_url" TEXT,
    "web_url" TEXT,
    "high_res_url" TEXT,
    "original_url" TEXT,
    "watermarked_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."photo_sets" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."photo_set_photos" (
    "photo_id" TEXT NOT NULL,
    "photo_set_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "photo_set_photos_pkey" PRIMARY KEY ("photo_id","photo_set_id")
);

-- CreateTable
CREATE TABLE "public"."watermarks" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'bottom_right',
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "opacity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watermarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."collection_presets" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lightroom_presets" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "xmp_content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lightroom_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."photo_presets" (
    "photo_id" TEXT NOT NULL,
    "preset_id" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_presets_pkey" PRIMARY KEY ("photo_id","preset_id")
);

-- CreateTable
CREATE TABLE "public"."collection_shares" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "shared_by" TEXT NOT NULL,
    "recipient_email" TEXT,
    "access_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "accessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."download_pins" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT,
    "photo_id" TEXT,
    "pin" TEXT NOT NULL,
    "client_email" TEXT,
    "resolution" "public"."DownloadResolution" NOT NULL DEFAULT 'web',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."download_activities" (
    "id" TEXT NOT NULL,
    "pin_id" TEXT NOT NULL,
    "client_email" TEXT,
    "client_ip" TEXT,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL,
    "resolution" "public"."DownloadResolution",
    "file_size" BIGINT,
    "download_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."view_activities" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT,
    "photo_id" TEXT,
    "client_email" TEXT,
    "client_ip" TEXT,
    "user_agent" TEXT,
    "referrer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "view_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_activities" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "subject" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "message_id" TEXT,

    CONSTRAINT "email_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_templates" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_content" TEXT NOT NULL,
    "text_content" TEXT,
    "variables" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."global_settings" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "client_ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."photo_favorites" (
    "id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "client_email" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."collection_contacts" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batch_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "photos" TEXT[],
    "settings" JSONB NOT NULL,
    "preset_name" TEXT,
    "status" "public"."BatchJobStatus" NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "total_photos" INTEGER NOT NULL DEFAULT 0,
    "completed_photos" INTEGER NOT NULL DEFAULT 0,
    "failed_photos" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "batch_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."processing_presets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_built_in" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enhanced_share_links" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_password_protected" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "allow_download" BOOLEAN NOT NULL DEFAULT true,
    "allow_comments" BOOLEAN NOT NULL DEFAULT true,
    "allow_favorites" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "max_views" INTEGER,
    "current_views" INTEGER NOT NULL DEFAULT 0,
    "unique_visitors" INTEGER NOT NULL DEFAULT 0,
    "recipient_emails" TEXT[],
    "custom_message" TEXT,
    "tracking_enabled" BOOLEAN NOT NULL DEFAULT true,
    "require_pin" BOOLEAN NOT NULL DEFAULT false,
    "download_pin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enhanced_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."share_activities" (
    "id" TEXT NOT NULL,
    "share_id" TEXT NOT NULL,
    "action" "public"."ShareActivityAction" NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."selection_sessions" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_email" TEXT NOT NULL,
    "status" "public"."SelectionSessionStatus" NOT NULL DEFAULT 'active',
    "deadline" TIMESTAMP(3),
    "instructions" TEXT,
    "allow_download" BOOLEAN NOT NULL DEFAULT true,
    "max_selections" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "selection_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."photo_selections" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "status" "public"."PhotoSelectionStatus" NOT NULL DEFAULT 'pending',
    "comment" TEXT,
    "rating" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_selections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "public"."collections"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "collection_shares_access_token_key" ON "public"."collection_shares"("access_token");

-- CreateIndex
CREATE UNIQUE INDEX "global_settings_owner_id_key_key" ON "public"."global_settings"("owner_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "photo_favorites_photo_id_client_email_key" ON "public"."photo_favorites"("photo_id", "client_email");

-- CreateIndex
CREATE UNIQUE INDEX "collection_contacts_collection_id_contact_email_key" ON "public"."collection_contacts"("collection_id", "contact_email");

-- CreateIndex
CREATE UNIQUE INDEX "enhanced_share_links_token_key" ON "public"."enhanced_share_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "photo_selections_session_id_photo_id_key" ON "public"."photo_selections"("session_id", "photo_id");

-- AddForeignKey
ALTER TABLE "public"."collections" ADD CONSTRAINT "collections_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collections" ADD CONSTRAINT "collections_cover_photo_id_fkey" FOREIGN KEY ("cover_photo_id") REFERENCES "public"."photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collections" ADD CONSTRAINT "collections_watermark_id_fkey" FOREIGN KEY ("watermark_id") REFERENCES "public"."watermarks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photos" ADD CONSTRAINT "photos_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_sets" ADD CONSTRAINT "photo_sets_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_set_photos" ADD CONSTRAINT "photo_set_photos_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_set_photos" ADD CONSTRAINT "photo_set_photos_photo_set_id_fkey" FOREIGN KEY ("photo_set_id") REFERENCES "public"."photo_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."watermarks" ADD CONSTRAINT "watermarks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collection_presets" ADD CONSTRAINT "collection_presets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lightroom_presets" ADD CONSTRAINT "lightroom_presets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_presets" ADD CONSTRAINT "photo_presets_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_presets" ADD CONSTRAINT "photo_presets_preset_id_fkey" FOREIGN KEY ("preset_id") REFERENCES "public"."lightroom_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collection_shares" ADD CONSTRAINT "collection_shares_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collection_shares" ADD CONSTRAINT "collection_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."download_pins" ADD CONSTRAINT "download_pins_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."download_pins" ADD CONSTRAINT "download_pins_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."download_activities" ADD CONSTRAINT "download_activities_pin_id_fkey" FOREIGN KEY ("pin_id") REFERENCES "public"."download_pins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."view_activities" ADD CONSTRAINT "view_activities_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."view_activities" ADD CONSTRAINT "view_activities_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_activities" ADD CONSTRAINT "email_activities_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."global_settings" ADD CONSTRAINT "global_settings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_favorites" ADD CONSTRAINT "photo_favorites_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collection_contacts" ADD CONSTRAINT "collection_contacts_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batch_jobs" ADD CONSTRAINT "batch_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."processing_presets" ADD CONSTRAINT "processing_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enhanced_share_links" ADD CONSTRAINT "enhanced_share_links_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enhanced_share_links" ADD CONSTRAINT "enhanced_share_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."share_activities" ADD CONSTRAINT "share_activities_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "public"."enhanced_share_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."selection_sessions" ADD CONSTRAINT "selection_sessions_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."selection_sessions" ADD CONSTRAINT "selection_sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_selections" ADD CONSTRAINT "photo_selections_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."selection_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_selections" ADD CONSTRAINT "photo_selections_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_selections" ADD CONSTRAINT "photo_selections_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
