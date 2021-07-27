const vscode = require("vscode");
const fs = require("fs");
const logger = require("./utils/console");

const getWorkspacePath = () => {
  if (vscode.workspace.workspaceFolders !== undefined) {
    let wf = vscode.workspace.workspaceFolders[0].uri.path;
    let f = vscode.workspace.workspaceFolders[0].uri.fsPath;
    return { wf, f };
  } else {
    return null;
  }
};

function execShellCommand(cmd, cwd) {
  console.log("execShellCommand");
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

const isPortFree = (port) =>
  new Promise((resolve) => {
    const server = require("http")
      .createServer()
      .listen(port, () => {
        server.close();
        resolve(true);
      })
      .on("error", () => {
        resolve(false);
      });
  });

const createResetFile = (path, slug, name) => {
  logger.debug(`Creating reset ${slug}/${name} file`);

  if (!fs.existsSync(`${extension.workspaceRoot}/.learn/resets`)) {
    fs.mkdirSync(`${extension.workspaceRoot}/.learn/resets`);
  }

  if (!fs.existsSync(`${extension.workspaceRoot}/.learn/resets/` + slug)) {
    fs.mkdirSync(`${extension.workspaceRoot}/.learn/resets/` + slug);
    if (
      !fs.existsSync(`${extension.workspaceRoot}/.learn/resets/${slug}/${name}`)
    ) {
      const content = fs.readFileSync(`${extension.workspaceRoot}/${path}`);
      fs.writeFileSync(
        `${extension.workspaceRoot}/.learn/resets/${slug}/${name}`,
        content
      );
    }
  }
};

module.exports = { getWorkspacePath, execShellCommand, isPortFree, createResetFile };
