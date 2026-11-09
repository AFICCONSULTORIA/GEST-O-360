import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function autoVersionBumpPlugin() {
  let debounceTimer: NodeJS.Timeout | null = null;

  const bump = () => {
    try {
      const versionJsonPath = path.resolve(__dirname, 'src/config/version.json');
      const packageJsonPath = path.resolve(__dirname, 'package.json');
      if (!fs.existsSync(versionJsonPath)) return;

      const data = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'));
      data.build = (Number(data.build) || 0) + 1;

      // Regra de rollover: a cada 100 builds, incrementa o patch e zera o build (ex: após 100 vira 0.0.1.0)
      if (data.build >= 100) {
        data.patch = (Number(data.patch) || 0) + Math.floor(data.build / 100);
        data.build = data.build % 100;
      }
      if (data.patch >= 100) {
        data.minor = (Number(data.minor) || 0) + Math.floor(data.patch / 100);
        data.patch = data.patch % 100;
      }
      if (data.minor >= 100) {
        data.major = (Number(data.major) || 0) + Math.floor(data.minor / 100);
        data.minor = data.minor % 100;
      }

      data.version = `${data.major || 0}.${data.minor || 0}.${data.patch || 0}.${data.build}`;

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      data.buildDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
      data.buildTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

      fs.writeFileSync(versionJsonPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');

      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        pkg.version = data.version;
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
      }
      console.log(`\x1b[32m[Version Manager]\x1b[0m Versão incrementada: v${data.version} (${data.buildDate} ${data.buildTime})`);
    } catch (err) {
      console.warn('[Version Manager] Erro ao incrementar versão:', err);
    }
  };

  return {
    name: 'vite-plugin-auto-version-bump',
    handleHotUpdate({ file }: { file: string }) {
      const normalized = file.replace(/\\/g, '/');
      if (
        normalized.endsWith('src/config/version.json') ||
        normalized.endsWith('src/config/version.ts') ||
        normalized.endsWith('package.json')
      ) {
        return;
      }

      if (normalized.includes('/src/')) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          bump();
        }, 1500);
      }
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      autoVersionBumpPlugin(),
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'favicon-32x32.png',
          'favicon-16x16.png',
          'logo-gestao360.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png'
        ],
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024 // 15MB
        },
        manifest: {
          name: 'Gestão 360 - Sistema de Gestão Pública',
          short_name: 'Gestão 360',
          description: 'Plataforma integrada de inteligência e gestão para a administração pública municipal.',
          theme_color: '#0a0907',
          background_color: '#0a0907',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
