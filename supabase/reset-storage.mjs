import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'avatars';

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing SUPABASE_URL (or VITE_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function listAllPaths(bucket, prefix = '') {
  const paths = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' }
    });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (!entry.id) {
        paths.push(...(await listAllPaths(bucket, path)));
      } else {
        paths.push(path);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return paths;
}

async function main() {
  console.log(`Preparing to remove storage bucket "${bucketName}"...`);

  const paths = await listAllPaths(bucketName);
  if (paths.length > 0) {
    console.log(`Removing ${paths.length} object(s)...`);
    const chunkSize = 100;
    for (let index = 0; index < paths.length; index += chunkSize) {
      const chunk = paths.slice(index, index + chunkSize);
      const { error } = await supabase.storage.from(bucketName).remove(chunk);
      if (error) throw error;
    }
  } else {
    console.log('Bucket is already empty.');
  }

  const { data, error } = await supabase.storage.deleteBucket(bucketName);
  if (error) throw error;

  console.log(`Bucket "${bucketName}" deleted successfully.`, data ?? '');
}

main().catch((error) => {
  console.error('Failed to reset storage bucket:', error.message || error);
  process.exit(1);
});
