import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages 정적 배포 설정
  output: 'export',
  
  // 성능 최적화 설정
  compress: true, // gzip 압축 활성화
  poweredByHeader: false, // X-Powered-By 헤더 제거
  
  // 이미지 최적화
  images: {
    unoptimized: true, // 정적 배포를 위해 이미지 최적화 비활성화
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    formats: ['image/webp', 'image/avif'], // 최신 이미지 포맷 사용
  },
  
  // 번들 크기 최적화
  experimental: {
    optimizePackageImports: ['xlsx'], // xlsx 패키지 최적화
  },
};

export default nextConfig;
