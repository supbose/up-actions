/**
 * Main entry point for the up-actions GitHub Action
 * This action handles file deployment and version management
 */

import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { deploy, excludeDefaults } from '@samkirkland/ftp-deploy';
import 'dotenv/config';
import { getOctokit, context } from "@actions/github";
import { Octokit } from '@octokit/core';

// Import type definitions
import {
  ActionInputs,
  FtpConfig,
  UploadOptions,
  RepositoryInfo,
  Release,
  ReleaseAsset,
  ConfigFile,
  LatestJsonContent,
  DeploymentResult,
  FileInfo,
  ProcessResult,
  ValidationResult
} from './types';

// Global token - should be set via environment variable
let GITHUB_TOKEN: string;

/**
 * Initialize GitHub token from environment
 */
function initializeToken(): void {
  GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
  if (!GITHUB_TOKEN) {
    console.log('Warning: GITHUB_TOKEN not found in environment variables');
  }
}

/**
 * Get all files from a directory recursively
 * @param dirPath - Directory to scan
 * @param arrayOfFiles - Accumulator for found files
 * @returns Array of file paths
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    }

    return arrayOfFiles;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return arrayOfFiles;
  }
}

/**
 * Get file information
 * @param filePath - Path to the file
 * @returns File information object
 */
function getFileInfo(filePath: string): FileInfo | null {
  try {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      modified: stats.mtime,
      isDirectory: stats.isDirectory()
    };
  } catch (error) {
    console.error(`Error getting file info for ${filePath}:`, error);
    return null;
  }
}

/**
 * Validate action inputs
 * @param inputs - Input parameters to validate
 * @returns Validation result
 */
function validateInputs(inputs: ActionInputs): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate enable-ftp
  if (!['disabled', 'ci', 'use'].includes(inputs.enableFtp)) {
    errors.push(`Invalid enable-ftp value: ${inputs.enableFtp}. Must be one of: disabled, ci, use`);
  }

  // Validate upload-latest
  if (!['disabled', 'ci', 'use'].includes(inputs.uploadLatest)) {
    errors.push(`Invalid upload-latest value: ${inputs.uploadLatest}. Must be one of: disabled, ci, use`);
  }

  // Validate GitHub token when required
  if (inputs.uploadLatest !== 'disabled' && !inputs.githubToken) {
    errors.push('GitHub token is required when upload-latest is not disabled');
  }

  // Check required FTP parameters
  if (inputs.enableFtp === 'use') {
    if (!inputs.ftpHost || !inputs.ftpUsername || !inputs.ftpPassword) {
      errors.push('FTP credentials are required when enable-ftp is set to "use"');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Get version from configuration file
 * @param configFile - Path to configuration file
 * @returns Version string
 */
function getVersionFromConfig(configFile: string): string {
  try {
    if (!fs.existsSync(configFile)) {
      console.log(`Warning: Config file not found: ${configFile}`);
      return "0.0.0";
    }

    const configContent = fs.readFileSync(configFile, 'utf8');
    const config: ConfigFile = JSON.parse(configContent);

    // Try root-level version first
    if (config.version) {
      console.log(`Version from config root: ${config.version}`);
      return config.version;
    }
    
    // Try package.version if root-level doesn't exist
    if (config.package?.version) {
      console.log(`Version from package config: ${config.package.version}`);
      return config.package.version;
    }

    console.log("Warning: Version not found in config file");
    return "0.0.0";
  } catch (error) {
    console.log(`Warning: Could not parse config file: ${error}`);
    return "0.0.0";
  }
}

/**
 * Create directory if it doesn't exist
 * @param dirPath - Directory path to create
 * @returns Success status
 */
function createDirectory(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`Creating directory: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return fs.existsSync(dirPath);
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error);
    return false;
  }
}

/**
 * Copy files from source to target directory
 * @param sourceDir - Source directory
 * @param targetDir - Target directory
 * @returns Process result
 */
function copyFiles(sourceDir: string, targetDir: string): ProcessResult {
  try {
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Source directory does not exist: ${sourceDir}`);
    }

    console.log(`Source directory exists: ${sourceDir}`);
    console.log(`Copying files from ${sourceDir} to ${targetDir} (flat structure)`);

    const files = getAllFiles(sourceDir);
    let fileCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const fileName = path.basename(file);
        const targetPath = path.join(targetDir, fileName);
        fs.copyFileSync(file, targetPath);
        console.log(`Copied: ${fileName}`);
        fileCount++;
      } catch (error) {
        console.error(`ERROR copying ${path.basename(file)}:`, error);
        errorCount++;
      }
    }

    console.log(`Copy completed! Files copied: ${fileCount}, Errors: ${errorCount}`);

    if (errorCount > 0) {
      console.log(`Warning: ${errorCount} file(s) failed to copy`);
    }

    return {
      success: errorCount === 0,
      version: '',
      targetDir,
      filesCopied: fileCount
    };
  } catch (error) {
    throw new Error(`Failed to copy files: ${error}`);
  }
}

/**
 * Verify files in target directory
 * @param targetDir - Target directory to verify
 */
function verifyFiles(targetDir: string): void {
  try {
    console.log("Verifying files in target directory:");
    const targetFiles = getAllFiles(targetDir);
    
    console.log(`Files in ${targetDir}:`);
    targetFiles.forEach(file => {
      const fileInfo = getFileInfo(file);
      if (fileInfo) {
        console.log(`${fileInfo.name} - Size: ${fileInfo.size} bytes - Modified: ${fileInfo.modified}`);
      }
    });

    if (targetFiles.length === 0) {
      console.log("WARNING: No files found in target directory!");
    } else {
      console.log(`SUCCESS: ${targetFiles.length} files found in target directory`);
    }
  } catch (error) {
    console.log(`Warning: Failed to verify copied files:`, error);
  }
}

/**
 * Upload files to FTP server
 * @param localDir - Local directory to upload
 * @param ftpConfig - FTP configuration
 * @returns Deployment result
 */
async function uploadToFTP(localDir: string, ftpConfig: FtpConfig): Promise<DeploymentResult> {
  try {
    console.log('🚚 FTP Deploy started');

    const deployOptions = {
      server: ftpConfig.host,
      username: ftpConfig.user,
      password: ftpConfig.password,
      'local-dir': formatPath(localDir),
      'server-dir': ftpConfig.serverDir || '/',
      exclude: [...excludeDefaults, 'dontDeployThisFolder/**']
    };

    await deploy(deployOptions);
    
    console.log('🚀 FTP Deploy completed successfully!');
    return {
      success: true,
      message: 'FTP deployment completed successfully',
      filesDeployed: getAllFiles(localDir).length
    };
  } catch (error) {
    console.error('FTP Deploy failed:', error);
    return {
      success: false,
      message: `FTP deployment failed: ${error}`,
      filesDeployed: 0,
      errors: [String(error)]
    };
  }
}

/**
 * Format path with proper ending
 * @param dir - Directory path
 * @returns Formatted directory path
 */
function formatPath(dir: string = '/'): string {
  return dir && !dir.endsWith('/') ? dir + '/' : dir || '/';
}

/**
 * Get repository information from environment or context
 * @returns Repository information
 */
function getRepositoryInfo(): RepositoryInfo {
  let owner: string;
  let repo: string;

  if (process.env.GITHUB_REPOSITORY) {
    try {
      const repoInfo = context.repo;
      owner = repoInfo.owner;
      repo = repoInfo.repo;
      console.log(`Using repository info from context: ${owner}/${repo}`);
    } catch (error) {
      const repoParts = process.env.GITHUB_REPOSITORY.split('/');
      if (repoParts.length === 2) {
        [owner, repo] = repoParts;
        console.log(`Using repository info from GITHUB_REPOSITORY: ${owner}/${repo}`);
      } else {
        throw new Error('Invalid GITHUB_REPOSITORY format');
      }
    }
  } else {
    owner = process.env.GITHUB_OWNER || "user";
    repo = process.env.GITHUB_REPO || "my-tauri-app";
    console.log(`Using repository info from environment/default: ${owner}/${repo}`);
    console.log("Note: In a real GitHub Actions environment, this would be automatically detected.");
  }

  return { owner, repo };
}

/**
 * Get latest release from GitHub
 * @param options - Repository options
 * @returns Latest release
 */
async function getLatestRelease(options: RepositoryInfo): Promise<Release | null> {
  try {
    const octokit = new Octokit({
      auth: GITHUB_TOKEN,
    });

    const response = await octokit.request('GET /repos/{owner}/{repo}/releases/latest', {
      ...options,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching latest release:', error);
    return null;
  }
}

/**
 * Get release asset content
 * @param options - Repository options
 * @param asset - Release asset
 * @returns Asset content as string
 */
async function getReleaseAssetContent(options: RepositoryInfo, asset: ReleaseAsset): Promise<string> {
  try {
    const octokit = new Octokit({
      auth: GITHUB_TOKEN,
    });

    const response = await octokit.request('GET /repos/{owner}/{repo}/releases/assets/{asset_id}', {
      ...options,
      asset_id: asset.id,
      headers: {
        'Accept': 'application/octet-stream',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

  

    let content: Buffer;
    

   
    if (Buffer.isBuffer(response.data)) {
      content = response.data;
    } else if (typeof response.data === 'string') {
      content = Buffer.from(response.data, 'utf-8');
    } else if (response.data instanceof ArrayBuffer) {
      content = Buffer.from(response.data);
    } else if (ArrayBuffer.isView(response.data)) {
      content = Buffer.from(response.data.buffer, response.data.byteOffset, response.data.byteLength);
    } else {
      // 如果以上都不是，尝试序列化成 JSON 字符串再转 buffer（兜底方案）
      content = Buffer.from(JSON.stringify(response.data), 'utf-8');
    }

    return content.toString('utf-8');
  } catch (error) {
    console.error('Error fetching release asset:', error);
    throw error;
  }
}

/**
 * Update latest.json with CDN URL and upload to FTP
 * @param release - Release data
 * @param targetVersion - Target version
 */
async function updateAndUploadLatestJson(release: Release, targetVersion: string): Promise<void> {
  try {
    const latestJsonAsset = release.assets.find(asset => asset.name === 'latest.json');
    
    if (!latestJsonAsset) {
      console.log('latest.json asset not found');
      return;
    }

    const repoInfo = getRepositoryInfo();
    const baseUrl = latestJsonAsset.browser_download_url.split('/').slice(0, -1).join('/');
    
    console.log('Base URL:', baseUrl);

    // Get the content of latest.json
    const contentStr = await getReleaseAssetContent(repoInfo, latestJsonAsset);

    // console.log('contentStr:', contentStr);
    
    // Parse JSON to get version info
    let contentJson: LatestJsonContent;
    try {
      contentJson = JSON.parse(contentStr);
    } catch (parseError) {
      console.error('Failed to parse latest.json:', parseError);
      throw parseError;
    }

    const version = contentJson.version || targetVersion;
    console.log('Version:', version);

    // console.log('Content JSON:', contentJson);

    // Replace base URL with CDN URL
    const updatedContent = contentStr.replace(
      new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      `https://cdn.ali.yiruan.wang/download/v${version}`
    );


    // console.log('Updated Content:', updatedContent);
    // Save updated content to file
    const outputDir = 'updateoutput';
    if (!createDirectory(outputDir)) {
      throw new Error(`Failed to create output directory: ${outputDir}`);
    }

    const outputPath = path.join(outputDir, 'latest.json');
    fs.writeFileSync(outputPath, Buffer.from(updatedContent, 'utf-8'));
    console.log(`Updated latest.json written to: ${outputDir}`);

    // Set output for downstream steps
    core.setOutput('latest-json-path', outputDir);

    // Get FTP credentials and upload
    const ftpHost = core.getInput('ftp-host');
    const ftpUsername = core.getInput('ftp-username');
    const ftpPassword = core.getInput('ftp-password');

    if (ftpHost && ftpUsername && ftpPassword) {
      const result = await uploadToFTP(outputDir, {
        host: ftpHost,
        user: ftpUsername,
        password: ftpPassword,
        serverDir: '/updater/'
      });

      if (result.success) {
        console.log('🚀 Latest.json uploaded successfully!');
      } else {
        console.error('Failed to upload latest.json:', result.message);
      }
    }
  } catch (error) {
    console.error('Error updating and uploading latest.json:', error);
    throw error;
  }
}

/**
 * Upload latest version files
 * @param targetVersion - Version to upload
 */
async function uploadLatestVersion(targetVersion: string): Promise<void> {
  try {
    if (!GITHUB_TOKEN) {
      console.log("GITHUB_TOKEN is required for uploading latest version");
      return;
    }

    const repoInfo = getRepositoryInfo();
    console.log('Repository info:', repoInfo);

    const release = await getLatestRelease(repoInfo);
    
    if (!release) {
      console.log('No release found');
      return;
    }

    await updateAndUploadLatestJson(release, targetVersion);
  } catch (error) {
    console.error('Error uploading latest version:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function run(): Promise<void> {
  try {
    initializeToken();

    // Get input parameters
    const inputs: ActionInputs = {
      sourceDir: core.getInput('source-dir'),
      targetRoot: core.getInput('target-root'),
      configFile: core.getInput('config-file'),
      enableFtp: core.getInput('enable-ftp') as 'disabled' | 'ci' | 'use',
      ftpHost: core.getInput('ftp-host'),
      ftpUsername: core.getInput('ftp-username'),
      ftpPassword: core.getInput('ftp-password'),
      ftpServerDir: core.getInput('ftp-server-dir'),
      uploadLatest: core.getInput('upload-latest') as 'disabled' | 'ci' | 'use',
      githubToken: core.getInput('github-token')
    };

    // Validate inputs
    const validation = validateInputs(inputs);
    if (!validation.valid) {
      core.setOutput('upload-latest', 'disabled');
      core.setFailed(`Input validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    // Get version from config file
    const version = getVersionFromConfig(inputs.configFile);
    console.log(`Using version: ${version}`);

    // Set output variables
    core.setOutput('version', version);
    core.setOutput('enable-ftp', inputs.enableFtp);

    // Create target directory
    const targetDir = path.join(inputs.targetRoot, `v${version}`);
    console.log(`Target directory: ${targetDir}`);

    // Save version to file for downstream steps
    try {
      fs.writeFileSync('version.txt', version, 'utf8');
    } catch (error) {
      console.log(`Warning: Failed to save version file:`, error);
    }

    // Create and verify target directory
    if (!createDirectory(targetDir)) {
      core.setFailed(`Failed to create target directory: ${targetDir}`);
      return;
    }
    core.setOutput('target-dir', targetDir);

    // Copy files from source to target
    const copyResult = copyFiles(inputs.sourceDir, targetDir);
    if (!copyResult.success) {
      core.setFailed(`Failed to copy files`);
      return;
    }

    // Verify copied files
    verifyFiles(targetDir);

    // Handle upload-latest option
    if (inputs.uploadLatest === 'disabled') {
      console.log(`✅ Latest version upload is disabled`);
    } else if (inputs.uploadLatest === 'ci') {
      console.log("✅ Using plugin to trigger latest version upload");
    } else if (inputs.uploadLatest === 'use') {
      console.log(`✅ Using built-in FTP upload for latest version files`);
      if (inputs.githubToken) {
        console.log(`✅ GitHub Token: ${inputs.githubToken}`);
      }
    }

    // Handle FTP upload based on enable-ftp setting
    let ftpUploadSuccess = false;
    
    switch (inputs.enableFtp) {
      case 'disabled':
        console.log("FTP upload is disabled.");
        core.setOutput('ftp-upload-success', 'disabled');
        break;

      case 'ci':
        console.log("FTP upload enabled for external CI step.");
        core.setOutput('ftp-upload-success', 'external');
        break;

      case 'use':
        console.log("FTP upload enabled with built-in functionality...");
        
        const uploadResult = await uploadToFTP(targetDir, {
          host: inputs.ftpHost,
          user: inputs.ftpUsername,
          password: inputs.ftpPassword,
          serverDir: formatPath(inputs.ftpServerDir) + `v${version}/` || `download/v${version}/`
        });

        ftpUploadSuccess = uploadResult.success;
        core.setOutput('ftp-upload-success', ftpUploadSuccess.toString());

        // If both FTP and latest upload are enabled
        if (ftpUploadSuccess && inputs.uploadLatest === 'use' && inputs.githubToken) {
          console.log(`✅ --------------------------------`);
          console.log(`✅ Using built-in FTP upload for latest version`);
          console.log(`✅ GitHub Token: ${inputs.githubToken}`);
          console.log(`✅ --------------------------------`);
          
          try {
            await uploadLatestVersion(version);
            core.setOutput('latest-upload-success', 'true');
          } catch (error) {
            core.setOutput('latest-upload-success', 'false');
            console.error('Failed to upload latest version:', error);
          }
        }
        break;

      default:
        core.setFailed(`Invalid enable-ftp value: ${inputs.enableFtp}`);
        return;
    }

    console.log("Process completed successfully without errors");
    
  } catch (error) {
    core.setFailed(`Unexpected error occurred: ${error}`);
  }
}

// Run the main function when executed
if (require.main === module) {
  run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { run, getAllFiles, uploadToFTP, copyFiles, getVersionFromConfig };