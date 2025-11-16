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
export interface FtpConfig {
    host: string;
    user: string;
    password: string;
    serverDir?: string;
}
export interface UploadOptions extends FtpConfig {
    localDir: string;
    exclude?: string[];
}
export interface RepositoryInfo {
    owner: string;
    repo: string;
}
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
export interface ConfigFile {
    version?: string;
    package?: {
        version?: string;
    };
    [key: string]: any;
}
export interface LatestJsonContent {
    version: string;
    date?: string;
    notes?: string;
    pub_date?: string;
    platform?: string;
    url?: string;
    [key: string]: any;
}
export interface ApiResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
}
export interface ActionError {
    message: string;
    code?: string | number;
    details?: any;
}
export interface DeploymentResult {
    success: boolean;
    message: string;
    filesDeployed?: number;
    errors?: string[];
}
export interface FileInfo {
    name: string;
    path: string;
    size: number;
    modified: Date;
    isDirectory: boolean;
}
export interface ProcessResult {
    success: boolean;
    version: string;
    targetDir: string;
    filesCopied: number;
    ftpUploadSuccess?: boolean;
    latestUploaded?: boolean;
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
//# sourceMappingURL=types.d.ts.map