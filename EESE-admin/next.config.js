/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@fullcalendar/core',
    '@fullcalendar/react',
    '@fullcalendar/daygrid',
    '@fullcalendar/timegrid',
    '@fullcalendar/interaction',
    '@fullcalendar/list',
  ],
};

module.exports = nextConfig;
