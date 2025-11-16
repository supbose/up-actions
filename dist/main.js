"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
exports.getAllFiles = getAllFiles;
exports.uploadToFTP = uploadToFTP;
exports.copyFiles = copyFiles;
exports.getVersionFromConfig = getVersionFromConfig;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ftp_deploy_1 = require("@samkirkland/ftp-deploy");
require("dotenv/config");
const github_1 = require("@actions/github");
const core_1 = require("@octokit/core");
let GITHUB_TOKEN;
function initializeToken() {
    GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
    if (!GITHUB_TOKEN) {
        console.log('Warning: GITHUB_TOKEN not found in environment variables');
    }
}
function getAllFiles(dirPath, arrayOfFiles = []) {
    try {
        const files = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
            else {
                arrayOfFiles.push(fullPath);
            }
        }
        return arrayOfFiles;
    }
    catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
        return arrayOfFiles;
    }
}
function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            name: path.basename(filePath),
            path: filePath,
            size: stats.size,
            modified: stats.mtime,
            isDirectory: stats.isDirectory()
        };
    }
    catch (error) {
        console.error(`Error getting file info for ${filePath}:`, error);
        return null;
    }
}
function validateInputs(inputs) {
    const errors = [];
    const warnings = [];
    if (!['disabled', 'ci', 'use'].includes(inputs.enableFtp)) {
        errors.push(`Invalid enable-ftp value: ${inputs.enableFtp}. Must be one of: disabled, ci, use`);
    }
    if (!['disabled', 'ci', 'use'].includes(inputs.uploadLatest)) {
        errors.push(`Invalid upload-latest value: ${inputs.uploadLatest}. Must be one of: disabled, ci, use`);
    }
    if (inputs.uploadLatest !== 'disabled' && !inputs.githubToken) {
        errors.push('GitHub token is required when upload-latest is not disabled');
    }
    if (inputs.enableFtp === 'use') {
        if (!inputs.ftpHost || !inputs.ftpUsername || !inputs.ftpPassword) {
            errors.push('FTP credentials are required when enable-ftp is set to "use"');
        }
    }
    return { valid: errors.length === 0, errors, warnings };
}
function getVersionFromConfig(configFile) {
    try {
        if (!fs.existsSync(configFile)) {
            console.log(`Warning: Config file not found: ${configFile}`);
            return "0.0.0";
        }
        const configContent = fs.readFileSync(configFile, 'utf8');
        const config = JSON.parse(configContent);
        if (config.version) {
            console.log(`Version from config root: ${config.version}`);
            return config.version;
        }
        if (config.package?.version) {
            console.log(`Version from package config: ${config.package.version}`);
            return config.package.version;
        }
        console.log("Warning: Version not found in config file");
        return "0.0.0";
    }
    catch (error) {
        console.log(`Warning: Could not parse config file: ${error}`);
        return "0.0.0";
    }
}
function createDirectory(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            console.log(`Creating directory: ${dirPath}`);
            fs.mkdirSync(dirPath, { recursive: true });
        }
        return fs.existsSync(dirPath);
    }
    catch (error) {
        console.error(`Failed to create directory ${dirPath}:`, error);
        return false;
    }
}
function copyFiles(sourceDir, targetDir) {
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
            }
            catch (error) {
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
    }
    catch (error) {
        throw new Error(`Failed to copy files: ${error}`);
    }
}
function verifyFiles(targetDir) {
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
        }
        else {
            console.log(`SUCCESS: ${targetFiles.length} files found in target directory`);
        }
    }
    catch (error) {
        console.log(`Warning: Failed to verify copied files:`, error);
    }
}
async function uploadToFTP(localDir, ftpConfig) {
    try {
        console.log('🚚 FTP Deploy started');
        const deployOptions = {
            server: ftpConfig.host,
            username: ftpConfig.user,
            password: ftpConfig.password,
            'local-dir': formatPath(localDir),
            'server-dir': ftpConfig.serverDir || '/',
            exclude: [...ftp_deploy_1.excludeDefaults, 'dontDeployThisFolder/**']
        };
        await (0, ftp_deploy_1.deploy)(deployOptions);
        console.log('🚀 FTP Deploy completed successfully!');
        return {
            success: true,
            message: 'FTP deployment completed successfully',
            filesDeployed: getAllFiles(localDir).length
        };
    }
    catch (error) {
        console.error('FTP Deploy failed:', error);
        return {
            success: false,
            message: `FTP deployment failed: ${error}`,
            filesDeployed: 0,
            errors: [String(error)]
        };
    }
}
function formatPath(dir = '/') {
    return dir && !dir.endsWith('/') ? dir + '/' : dir || '/';
}
function getRepositoryInfo() {
    let owner;
    let repo;
    if (process.env.GITHUB_REPOSITORY) {
        try {
            const repoInfo = github_1.context.repo;
            owner = repoInfo.owner;
            repo = repoInfo.repo;
            console.log(`Using repository info from context: ${owner}/${repo}`);
        }
        catch (error) {
            const repoParts = process.env.GITHUB_REPOSITORY.split('/');
            if (repoParts.length === 2) {
                [owner, repo] = repoParts;
                console.log(`Using repository info from GITHUB_REPOSITORY: ${owner}/${repo}`);
            }
            else {
                throw new Error('Invalid GITHUB_REPOSITORY format');
            }
        }
    }
    else {
        owner = process.env.GITHUB_OWNER || "user";
        repo = process.env.GITHUB_REPO || "my-tauri-app";
        console.log(`Using repository info from environment/default: ${owner}/${repo}`);
        console.log("Note: In a real GitHub Actions environment, this would be automatically detected.");
    }
    return { owner, repo };
}
async function getLatestRelease(options) {
    try {
        const octokit = new core_1.Octokit({
            auth: GITHUB_TOKEN,
        });
        const response = await octokit.request('GET /repos/{owner}/{repo}/releases/latest', {
            ...options,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });
        return response.data;
    }
    catch (error) {
        console.error('Error fetching latest release:', error);
        return null;
    }
}
async function getReleaseAssetContent(options, asset) {
    try {
        const octokit = new core_1.Octokit({
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
        let content;
        if (Buffer.isBuffer(response.data)) {
            content = response.data;
        }
        else if (typeof response.data === 'string') {
            content = Buffer.from(response.data, 'utf-8');
        }
        else if (response.data instanceof ArrayBuffer) {
            content = Buffer.from(response.data);
        }
        else if (ArrayBuffer.isView(response.data)) {
            content = Buffer.from(response.data.buffer, response.data.byteOffset, response.data.byteLength);
        }
        else {
            content = Buffer.from(JSON.stringify(response.data), 'utf-8');
        }
        return content.toString('utf-8');
    }
    catch (error) {
        console.error('Error fetching release asset:', error);
        throw error;
    }
}
async function updateAndUploadLatestJson(release, targetVersion) {
    try {
        const latestJsonAsset = release.assets.find(asset => asset.name === 'latest.json');
        if (!latestJsonAsset) {
            console.log('latest.json asset not found');
            return;
        }
        const repoInfo = getRepositoryInfo();
        const baseUrl = latestJsonAsset.browser_download_url.split('/').slice(0, -1).join('/');
        console.log('Base URL:', baseUrl);
        const contentStr = await getReleaseAssetContent(repoInfo, latestJsonAsset);
        let contentJson;
        try {
            contentJson = JSON.parse(contentStr);
        }
        catch (parseError) {
            console.error('Failed to parse latest.json:', parseError);
            throw parseError;
        }
        const version = contentJson.version || targetVersion;
        console.log('Version:', version);
        const updatedContent = contentStr.replace(new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `https://cdn.ali.yiruan.wang/download/v${version}`);
        const outputDir = 'updateoutput';
        if (!createDirectory(outputDir)) {
            throw new Error(`Failed to create output directory: ${outputDir}`);
        }
        const outputPath = path.join(outputDir, 'latest.json');
        fs.writeFileSync(outputPath, Buffer.from(updatedContent, 'utf-8'));
        console.log(`Updated latest.json written to: ${outputDir}`);
        core.setOutput('latest-json-path', outputDir);
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
            }
            else {
                console.error('Failed to upload latest.json:', result.message);
            }
        }
    }
    catch (error) {
        console.error('Error updating and uploading latest.json:', error);
        throw error;
    }
}
async function uploadLatestVersion(targetVersion) {
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
    }
    catch (error) {
        console.error('Error uploading latest version:', error);
        throw error;
    }
}
async function run() {
    try {
        initializeToken();
        const inputs = {
            sourceDir: core.getInput('source-dir'),
            targetRoot: core.getInput('target-root'),
            configFile: core.getInput('config-file'),
            enableFtp: core.getInput('enable-ftp'),
            ftpHost: core.getInput('ftp-host'),
            ftpUsername: core.getInput('ftp-username'),
            ftpPassword: core.getInput('ftp-password'),
            ftpServerDir: core.getInput('ftp-server-dir'),
            uploadLatest: core.getInput('upload-latest'),
            githubToken: core.getInput('github-token')
        };
        const validation = validateInputs(inputs);
        if (!validation.valid) {
            core.setOutput('upload-latest', 'disabled');
            core.setFailed(`Input validation failed: ${validation.errors.join(', ')}`);
            return;
        }
        const version = getVersionFromConfig(inputs.configFile);
        console.log(`Using version: ${version}`);
        core.setOutput('version', version);
        core.setOutput('enable-ftp', inputs.enableFtp);
        const targetDir = path.join(inputs.targetRoot, `v${version}`);
        console.log(`Target directory: ${targetDir}`);
        try {
            fs.writeFileSync('version.txt', version, 'utf8');
        }
        catch (error) {
            console.log(`Warning: Failed to save version file:`, error);
        }
        if (!createDirectory(targetDir)) {
            core.setFailed(`Failed to create target directory: ${targetDir}`);
            return;
        }
        core.setOutput('target-dir', targetDir);
        const copyResult = copyFiles(inputs.sourceDir, targetDir);
        if (!copyResult.success) {
            core.setFailed(`Failed to copy files`);
            return;
        }
        verifyFiles(targetDir);
        if (inputs.uploadLatest === 'disabled') {
            console.log(`✅ Latest version upload is disabled`);
        }
        else if (inputs.uploadLatest === 'ci') {
            console.log("✅ Using plugin to trigger latest version upload");
        }
        else if (inputs.uploadLatest === 'use') {
            console.log(`✅ Using built-in FTP upload for latest version files`);
            if (inputs.githubToken) {
                console.log(`✅ GitHub Token: ${inputs.githubToken}`);
            }
        }
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
                if (ftpUploadSuccess && inputs.uploadLatest === 'use' && inputs.githubToken) {
                    console.log(`✅ --------------------------------`);
                    console.log(`✅ Using built-in FTP upload for latest version`);
                    console.log(`✅ GitHub Token: ${inputs.githubToken}`);
                    console.log(`✅ --------------------------------`);
                    try {
                        await uploadLatestVersion(version);
                        core.setOutput('latest-upload-success', 'true');
                    }
                    catch (error) {
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
    }
    catch (error) {
        core.setFailed(`Unexpected error occurred: ${error}`);
    }
}
if (require.main === module) {
    run().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=main.js.map