-- Create Enum segment_match
CREATE TYPE "public"."segment_match" AS ENUM ('all', 'any');

-- Create Enum marketing_consent_status
CREATE TYPE "public"."marketing_consent_status" AS ENUM ('unknown', 'opted_in', 'opted_out');

-- Alter table customers
ALTER TABLE "public"."customers" ADD COLUMN "marketing_consent_status" "public"."marketing_consent_status" NOT NULL DEFAULT 'unknown';
ALTER TABLE "public"."customers" ADD COLUMN "marketing_consent_updated_at" TIMESTAMPTZ(6);
ALTER TABLE "public"."customers" ADD COLUMN "marketing_consent_source" TEXT;
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_organization_id_id_key" UNIQUE ("organization_id", "id");

-- Create Table segments
CREATE TABLE "public"."segments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "match_type" "public"."segment_match" NOT NULL DEFAULT 'all',
    "conditions" JSONB NOT NULL,
    "conditions_version" INTEGER NOT NULL DEFAULT 1,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "last_calculated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "segments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "segments_organization_id_id_key" UNIQUE ("organization_id", "id"),
    CONSTRAINT "segments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "segments_organization_id_is_archived_idx" ON "public"."segments"("organization_id", "is_archived");

-- Create Table segment_memberships
CREATE TABLE "public"."segment_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "segment_id" UUID NOT NULL,
    "customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "segment_memberships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "segment_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "segment_memberships_organization_id_segment_id_fkey" FOREIGN KEY ("organization_id", "segment_id") REFERENCES "public"."segments"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "segment_memberships_organization_id_customer_id_fkey" FOREIGN KEY ("organization_id", "customer_id") REFERENCES "public"."customers"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "segment_memberships_segment_id_customer_id_key" ON "public"."segment_memberships"("segment_id", "customer_id");
CREATE INDEX "segment_memberships_organization_id_segment_id_idx" ON "public"."segment_memberships"("organization_id", "segment_id");
CREATE INDEX "segment_memberships_customer_id_idx" ON "public"."segment_memberships"("customer_id");

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_segments BEFORE UPDATE ON segments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE "public"."segments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."segment_memberships" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read for tenant users" ON "public"."segments"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organizationId')::uuid);

CREATE POLICY "Enable insert for tenant users" ON "public"."segments"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organizationId')::uuid);

CREATE POLICY "Enable update for tenant users" ON "public"."segments"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organizationId')::uuid)
WITH CHECK (organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organizationId')::uuid);

CREATE POLICY "Enable delete for tenant users" ON "public"."segments"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organizationId')::uuid);

-- Segment Memberships RLS
CREATE POLICY "Enable read for tenant users" ON "public"."segment_memberships"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organizationId')::uuid);

CREATE POLICY "Enable insert for tenant users" ON "public"."segment_memberships"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organizationId')::uuid);

CREATE POLICY "Enable update for tenant users" ON "public"."segment_memberships"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organizationId')::uuid)
WITH CHECK (organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organizationId')::uuid);

CREATE POLICY "Enable delete for tenant users" ON "public"."segment_memberships"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (organization_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'organizationId')::uuid);
