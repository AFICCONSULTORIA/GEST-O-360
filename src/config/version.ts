import versionData from './version.json';

export interface AppVersionInfo {
  major: number;
  minor: number;
  patch: number;
  build: number;
  version: string;
  buildDate: string;
  buildTime: string;
  notes?: string;
}

export const APP_VERSION: AppVersionInfo = versionData as AppVersionInfo;
export const APP_VERSION_STRING = `v${versionData.version}`;

