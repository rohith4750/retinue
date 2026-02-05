-- Add group booking reference for multi-room batch bookings (single reference for all rooms)
ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "groupBookingReference" VARCHAR(50) NULL;

CREATE INDEX IF NOT EXISTS "Booking_groupBookingReference_idx" ON "Booking"("groupBookingReference");
