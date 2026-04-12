# Profile Photo Upload Issue

## Problem Identified
Profile photos only work on the single device they were uploaded on. When logging into the same account on another device, the profile photo does not appear.

## Root Cause
This is intentional behaviour implemented as a workaround:
```
// Keep avatars in device preferences only. Large base64 images in auth metadata
// can bloat the Supabase session token and break authenticated requests.
```

✅ **This issue is fixed correctly by using Supabase Storage properly instead of localStorage base64**

## Fix Implementation Steps:
1.  Create `avatars` bucket in Supabase Storage with proper RLS policies
2.  Add file upload handler that uploads actual image files to storage
3.  Store only public storage URL in user metadata (not base64)
4.  Remove localStorage only restriction
5.  Images will now properly sync across all devices

This maintains security, doesn't bloat auth tokens, and works correctly across all login sessions.