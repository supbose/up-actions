/**
 * Type definitions for the up-actions project
 */

// Input parameters from GitHub Actions
export interface ActionInputs {
  sourceDir: string;
  targetRoot: string;
  configFile: string;
  enableFtp: 'disabled' | 'ci' | 'use';
  ftpHost: string;
  ftpUsername: string;
  ftpPassword: string;
  ftpServerDir: string;
  uploadLatest: 'disabled' | 'ci' | 'use';
  githubToken: string;
}

// FTP configuration
export interface FtpConfig {
  host: string;
  user: string;
  password: string;
  serverDir?: string;
}

// Upload options for FTP deployment
export interface UploadOptions extends FtpConfig {
  localDir: string;
  exclude?: string[];
}

// Repository information
export interface RepositoryInfo {
  owner: string;
  repo: string;
}

// GitHub Release Asset
export interface ReleaseAsset {
  id: number;
  name: string;
  browser_download_url: string;
  size: number;
  created_at: string;
  updated_at: string;
  url: string;
  uploader?: {
    login: string;
    id: number;
    avatar_url: string;
  } | null;
  state: "uploaded" | "open";
  content_type: string;
  download_count: number;
  label?: string | null;
}

// GitHub Release
export interface Release {
  id: number;
  name: string | null;
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string | null;
  assets: ReleaseAsset[];
  body?: string | null;
  html_url: string;
  url: string;
  upload_url: string;
  tarball_url?: string | null;
  zipball_url?: string | null;
  target_commitish: string;
}

// Configuration file structure
export interface ConfigFile {
  version?: string;
  package?: {
    version?: string;
  };
  [key: string]: any;
}

// Latest.json content structure
export interface LatestJsonContent {
  version: string;
  date?: string;
  notes?: string;
  pub_date?: string;
  platform?: string;
  url?: string;
  [key: string]: any;
}

// API response structure
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

// Error structure
export interface ActionError {
  message: string;
  code?: string | number;
  details?: any;
}

// Deployment result
export interface DeploymentResult {
  success: boolean;
  message: string;
  filesDeployed?: number;
  errors?: string[];
}

// File info structure
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: Date;
  isDirectory: boolean;
}

// Process result
export interface ProcessResult {
  success: boolean;
  version: string;
  targetDir: string;
  filesCopied: number;
  ftpUploadSuccess?: boolean;
  latestUploaded?: boolean;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}