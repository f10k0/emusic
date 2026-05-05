/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          'C:\\DumpStack.log.tmp',
          'C:\\pagefile.sys',
          'C:\\swapfile.sys',
          'C:\\System Volume Information/**',
          /C:\\[^\\]+\.sys$/,
        ],
        poll: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
