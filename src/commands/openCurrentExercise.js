const vscode = require("vscode");
const lp = require("../learnpack");
const logger = require("../utils/console");
const { createResetFile, prioritizeHTMLFile } = require("../utils");

module.exports = async () => {
  logger.debug("open current");

  let current = lp.currentExercise();

  logger.debug(`Opening ${current.slug}`, current);
  return openFiles(current);
};

const openFiles = async (ex) => {
  const files = prioritizeHTMLFile(ex.visibleFiles);

  logger.debug(`Files to open`, files);
  let editor = null;
  for (let i = 0; i < files.length; i++) {
    try {
      const file = vscode.Uri.file(
        `${extension.workspaceRoot}/${files[i].path}`
      );
      const fileName = files[i].name;
      const path = files[i].path;

      createResetFile(path, ex.title, fileName);

      editor = await vscode.window.showTextDocument(file, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false,
        preview: false,
      });
    } catch (err) {
      logger.error(err.message);
    }
  }
  return editor;
};
