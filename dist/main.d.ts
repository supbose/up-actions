import 'dotenv/config';
import { FtpConfig, DeploymentResult, ProcessResult } from './types';
declare function getAllFiles(dirPath: string, arrayOfFiles?: string[]): string[];
declare function getVersionFromConfig(configFile: string): string;
declare function copyFiles(sourceDir: string, targetDir: string): ProcessResult;
declare function uploadToFTP(localDir: string, ftpConfig: FtpConfig): Promise<DeploymentResult>;
declare function run(): Promise<void>;
export { run, getAllFiles, uploadToFTP, copyFiles, getVersionFromConfig };
//# sourceMappingURL=main.d.ts.map