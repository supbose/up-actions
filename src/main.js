const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
import { deploy, excludeDefaults } from '@samkirkland/ftp-deploy'
// const Client = require('ftp');

async function run() {
    try {
        // 获取输入参数
        const sourceDir = core.getInput('source-dir');
        const targetRoot = core.getInput('target-root');
        const configFile = core.getInput('config-file');
        const enableFtp = core.getInput('enable-ftp'); // 支持 disabled, ci, use
        const ftpHost = core.getInput('ftp-host');
        const ftpUsername = core.getInput('ftp-username');
        const ftpPassword = core.getInput('ftp-password');
        const ftpServerDir = core.getInput('ftp-server-dir');
        const uploadLatest = core.getInput('upload-latest'); // 新增参数

        // 验证 enable-ftp 参数值
        if (!['disabled', 'ci', 'use'].includes(enableFtp)) {
            core.setFailed(`Invalid enable-ftp value: ${enableFtp}. Must be one of: disabled, ci, use`);
            return;
        }

        // 从 tauri.conf.json 获取版本号
        let version = "0.0.0";
        if (fs.existsSync(configFile)) {
            try {
                const configContent = fs.readFileSync(configFile, 'utf8');
                const config = JSON.parse(configContent);

                // 优先从根级别的version获取
                if (config.version) {
                    version = config.version;
                    console.log(`Version from config root: ${version}`);
                }
                // 如果根级别没有version，则尝试从package.version获取
                else if (config.package && config.package.version) {
                    version = config.package.version;
                    console.log(`Version from package config: ${version}`);
                }
                else {
                    console.log("Warning: Version not found in config file");
                }
            } catch (error) {
                console.log(`Warning: Could not parse config file: ${error.message}`);
            }
        } else {
            console.log(`Warning: Config file not found: ${configFile}`);
        }

        console.log(`Using version: ${version}`);

        // 设置输出变量
        core.setOutput('version', version);
        core.setOutput('enable-ftp', enableFtp);

        // 创建目标目录
        const targetDir = path.join(targetRoot, `v${version}`);
        console.log(`Target directory: ${targetDir}`);

        // 保存版本到文件供后续步骤使用
        try {
            fs.writeFileSync('version.txt', version, 'utf8');
        } catch (error) {
            console.log(`Warning: Failed to save version file: ${error.message}`);
        }

        // 创建目标目录
        try {
            console.log(`Creating target directory: ${targetDir}`);
            fs.mkdirSync(targetDir, { recursive: true });

            // 验证目标目录已创建
            if (!fs.existsSync(targetDir)) {
                throw new Error(`Failed to create target directory: ${targetDir}`);
            }
            console.log(`Target directory created successfully: ${targetDir}`);
            core.setOutput('target-dir', targetDir);
        } catch (error) {
            core.setFailed(`Failed to create target directory: ${error.message}`);
            return;
        }

        // 检查源目录
        if (!fs.existsSync(sourceDir)) {
            console.log(`Source directory not found: ${sourceDir}`);
            const parentDir = path.dirname(sourceDir);
            if (fs.existsSync(parentDir)) {
                console.log("Available directories in parent:");
                const dirs = fs.readdirSync(parentDir, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);
                console.log(dirs);
            }
            core.setFailed("Source directory does not exist");
            return;
        } else {
            console.log(`Source directory exists: ${sourceDir}`);

            try {
                console.log(`Copying files from ${sourceDir} to ${targetDir} (flat structure)`);

                // 获取所有文件（不保留目录结构）
                const files = getAllFiles(sourceDir);
                let fileCount = 0;
                let errorCount = 0;

                for (const file of files) {
                    try {
                        // 直接复制到目标目录，不保留子目录结构
                        const fileName = path.basename(file);
                        const targetPath = path.join(targetDir, fileName);
                        fs.copyFileSync(file, targetPath);
                        console.log(`Copied: ${fileName}`);
                        fileCount++;
                    } catch (error) {
                        console.log(`ERROR copying ${path.basename(file)}: ${error.message}`);
                        errorCount++;
                    }
                }

                console.log(`Copy completed! Files copied: ${fileCount}, Errors: ${errorCount}`);

                if (errorCount > 0) {
                    console.log(`Warning: ${errorCount} file(s) failed to copy`);
                }
            } catch (error) {
                core.setFailed(`Failed to copy files: ${error.message}`);
                return;
            }
        }

        // 验证复制的文件
        try {
            console.log("Verifying files in target directory:");
            const targetFiles = getAllFiles(targetDir);
            console.log(`Files in ${targetDir}:`);
            targetFiles.forEach(file => {
                const stats = fs.statSync(file);
                console.log(`${path.basename(file)} - Size: ${stats.size} bytes - Modified: ${stats.mtime}`);
            });

            if (targetFiles.length === 0) {
                console.log("WARNING: No files found in target directory!");
            } else {
                console.log(`SUCCESS: ${targetFiles.length} files found in target directory`);
            }
        } catch (error) {
            console.log(`Warning: Failed to verify copied files: ${error.message}`);
        }

        if (uploadLatest === 'disabled') {
            console.log(`✅ 不需要上传最新版本文件`);
        } else if (uploadLatest === 'ci') {
            console.log("✅ 使用插件触发上传最新版本文件");
        } else if (uploadLatest === 'use') {
            console.log(`✅ 使用内置FTP上传功能上传最新版本文件`);
        }

        // 根据 enable-ftp 的值决定FTP行为
        switch (enableFtp) {
            case 'disabled':
                console.log("FTP is disabled.");
                core.setOutput('ftp-upload-success', 'disabled');
                break;
                
            case 'ci':
                console.log("FTP is enabled for external CI step.");
                core.setOutput('ftp-upload-success', 'external');
                break;
                
            case 'use':
                console.log("FTP is enabled and using built-in FTP upload functionality...");
                if (!ftpHost || !ftpUsername || !ftpPassword) {
                    core.setFailed("FTP credentials are required when enable-ftp is set to 'use'");
                    return;
                }
                
                try {
                    await uploadToFTP(targetDir, {
                        host: ftpHost,
                        user: ftpUsername,
                        password: ftpPassword,
                        serverDir: joinPathEnd(ftpServerDir) + `v${version}/` || `uploads/v${version}/`
                    });
                    core.setOutput('ftp-upload-success', 'true');
                    // 显示统一提示消息
                    if (uploadLatest === 'use') {
                        console.log(`✅ --------------------------------`);
                        console.log(`✅ 使用内置FTP上传功能上传最新版本文件`);
                        console.log(`✅ --------------------------------`);
                    }
                   
                } catch (error) {
                    core.setOutput('ftp-upload-success', 'false');
                    core.setFailed(`Built-in FTP upload failed: ${error.message}`);
                    return;
                }
                break;
                
            default:
                core.setFailed(`Invalid enable-ftp value: ${enableFtp}`);
                return;
        }

        console.log("Process completed successfully without errors");
    } catch (error) {
        core.setFailed(`Unexpected error occurred: ${error.message}`);
    }
}

// 递归获取目录下的所有文件
function getAllFiles(dirPath, arrayOfFiles = []) {
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
}

// 上传文件到FTP服务器
function uploadToFTP(localDir, ftpConfig) {
    return new Promise((resolve, reject) => {
        console.log('🚚 Deploy started');
        
        deploy({
            server: ftpConfig.host,
            username: ftpConfig.user,
            password: ftpConfig.password,
            'local-dir': joinPathEnd(localDir),
            'server-dir': ftpConfig.serverDir,
            exclude: [...excludeDefaults, 'dontDeployThisFolder/**']
        }).then(() => {
            console.log('🚀 Deploy done!');
            resolve();
        }).catch((error) => {
            reject(error);
        });
    });
}

function joinPath(dir= '/') {
    if (dir !== '/') {
        // 移除现有的前后斜杠，然后重新加上
        return `/${dir.replace(/^\/+|\/+$/g, '')}/`
    }
    return '/'
}

function joinPathEnd(dir = '/') {
    return dir && !dir.endsWith('/') ? dir + '/' : dir || '/';
}

run();