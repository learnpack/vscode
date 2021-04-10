const vscode = require('vscode');

const getWorkspacePath = () => {
    if (vscode.workspace.workspaceFolders !== undefined) {
        let wf = vscode.workspace.workspaceFolders[0].uri.path;
        let f = vscode.workspace.workspaceFolders[0].uri.fsPath;
        return { wf, f };
    }
    else {
        vscode.window.showErrorMessage(`Working folder not found, open a folder an try again`);
        return null
    }
}

function execShellCommand(cmd, cwd) {
    console.log("execShellCommand")
    const exec = require("child_process").exec;
    return new Promise((resolve, reject) => {
        exec(cmd, { maxBuffer: 1024 * 500, cwd }, (error, stdout, stderr) => {
            if (error) {
                console.warn("Shell error: ", error);
                console.log(stderr);
            } else if (stdout) {
                console.log(stdout);
            } else {
                console.warn("Shell ok: ", error);
                console.log(stderr);
            }
            resolve(stdout ? true : false);
        });
    });
}

module.exports = { getWorkspacePath, execShellCommand }