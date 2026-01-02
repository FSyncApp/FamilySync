const { getDefaultConfig } = require('metro-config');
const path = require('path');

module.exports = (async () => {
  const config = await getDefaultConfig();
  return {
    ...config,
    resolver: {
      ...config.resolver,
      extraNodeModules: {
        '@supabase/supabase-js': path.resolve(__dirname, 'node_modules/@supabase/supabase-js/dist/index.cjs'),  // Resolve @supabase/supabase-js symlink
      },
      sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json', 'svg', 'cjs'], // Ensure .cjs is considered as an extension
    },
    transformer: {
      assetPlugins: ['expo-asset/tools/hashAssetFiles'],
    },
  };
})();
