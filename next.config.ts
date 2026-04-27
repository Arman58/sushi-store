/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        dirs: ["app", "src"], // ← здесь НЕТ "lint"
    },
};

export default nextConfig;
