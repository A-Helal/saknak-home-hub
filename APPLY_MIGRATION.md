# 🔧 Apply Database Migration to Fix Booking Error

## The Problem
The code is updated to use `student_id`, but your Supabase production database still has the old `user_id` column. You need to apply the migration.

---

## ⚡ Quick Fix Option 1: Supabase Dashboard (EASIEST - 2 MINUTES)

1. **Go to Supabase SQL Editor:**
   - Open: https://supabase.com/dashboard/project/fnfgsdgrmhjeyzglynxw/sql/new

2. **Copy and paste this SQL:**
   ```sql
   -- Check current schema
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'booking_requests';
   ```
   - Click **"Run"**
   - If you see `user_id` column, continue below

3. **Apply the fix - Copy and paste this SQL:**
   ```sql
   -- Rename user_id to student_id
   ALTER TABLE booking_requests 
   RENAME COLUMN user_id TO student_id;
   
   -- Add owner_id if it doesn't exist
   ALTER TABLE booking_requests 
   ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
   
   -- Populate owner_id from properties
   UPDATE booking_requests br
   SET owner_id = p.owner_id
   FROM properties p
   WHERE br.property_id = p.id
   AND br.owner_id IS NULL;
   
   -- Make owner_id required
   ALTER TABLE booking_requests 
   ALTER COLUMN owner_id SET NOT NULL;
   
   -- Fix indexes
   DROP INDEX IF EXISTS one_pending_booking_per_user_property;
   DROP INDEX IF EXISTS idx_booking_requests_user_id;
   
   CREATE UNIQUE INDEX IF NOT EXISTS one_pending_booking_per_student_property
     ON booking_requests (student_id, property_id)
     WHERE status = 'pending';
   
   CREATE INDEX IF NOT EXISTS idx_booking_requests_student_id ON booking_requests(student_id);
   CREATE INDEX IF NOT EXISTS idx_booking_requests_owner_id ON booking_requests(owner_id);
   
   -- Fix RLS policies
   DROP POLICY IF EXISTS "Students can view their own booking requests" ON booking_requests;
   DROP POLICY IF EXISTS "Owners can view booking requests for their properties" ON booking_requests;
   DROP POLICY IF EXISTS "Students can create booking requests" ON booking_requests;
   DROP POLICY IF EXISTS "Owners can update booking request status" ON booking_requests;
   
   CREATE POLICY "Students can view their own booking requests"
     ON booking_requests FOR SELECT
     USING (auth.uid() = student_id);
   
   CREATE POLICY "Owners can view booking requests for their properties"
     ON booking_requests FOR SELECT
     USING (auth.uid() = owner_id);
   
   CREATE POLICY "Students can create booking requests"
     ON booking_requests FOR INSERT
     WITH CHECK (auth.uid() = student_id);
   
   CREATE POLICY "Owners can update booking request status"
     ON booking_requests FOR UPDATE
     USING (auth.uid() = owner_id);
   ```
   - Click **"Run"**

4. **Verify it worked:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'booking_requests'
   ORDER BY column_name;
   ```
   - You should see `student_id` and `owner_id` (NOT `user_id`)

5. **Test your site!**
   - Go to: https://saknak-home-hub.vercel.app/
   - Try booking an apartment
   - ✅ Should work now!

---

## 🛠️ Option 2: Using Supabase CLI (For Advanced Users)

```bash
# Install Supabase CLI if you don't have it
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref fnfgsdgrmhjeyzglynxw

# Push migrations
supabase db push

# Or apply specific migration
supabase migration up --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.fnfgsdgrmhjeyzglynxw.supabase.co:5432/postgres"
```

---

## ✅ After Applying Migration

Your app will work perfectly:
- ✅ Students can book apartments
- ✅ No more "user_id column not found" errors
- ✅ All existing bookings preserved
- ✅ Owners can see booking requests

---

## 🔍 Verify Everything Works

1. Login as student
2. Find an apartment
3. Click "احجز الآن" (Book Now)
4. Booking should complete successfully! 🎉


