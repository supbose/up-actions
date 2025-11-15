const core = require('@actions/core');
const fs = require('fs');

try {
    // 获取输入参数
    const message = core.getInput('message');
    const filePath = core.getInput('file-path');

    // 输出消息
    console.log(message);

    // 如果提供了文件路径，则读取文件
    if (filePath) {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            console.log('File content:', content);
            core.setOutput('result', content);
        } else {
            core.setFailed(`File not found: ${filePath}`);
        }
    } else {
        core.setOutput('result', message);
    }
} catch (error) {
    core.setFailed(error.message);
}