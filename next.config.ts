/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        dirs: ["app", "src"], // ← здесь НЕТ "lint"
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
        ],
    },
};

export default nextConfig;
