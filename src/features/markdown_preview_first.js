const {workspace, window, commands } = require('vscode');

module.exports = () => {
    let alreadyOpenedFirstMarkdown = false;
    let markdown_preview_command_id = "";
    let close_other_editor_command_id = "";
    close_other_editor_command_id = "workbench.action.closeEditorsInOtherGroups";
    markdown_preview_command_id = "markdown.showPreviewToSide";
    function previewFirstMarkdown() {
        if (alreadyOpenedFirstMarkdown) return;
        let editor = window.activeTextEditor;
        if (editor) {
            let doc = editor.document;
            if (doc && doc.languageId === "markdown") {
                openMarkdownPreviewSideBySide();
                alreadyOpenedFirstMarkdown = true;
            }
        }
    }
    function openMarkdownPreviewSideBySide() {
        commands.executeCommand(close_other_editor_command_id)
        .then(() => commands.executeCommand(markdown_preview_command_id))
        .then(() => {}, (e) => console.error(e));
    }

    if (window.activeTextEditor) {
        previewFirstMarkdown();
    } else {
        window.onDidChangeActiveTextEditor(()=>{
            previewFirstMarkdown();
        });
    }

    workspace.onDidOpenTextDocument((doc)=>{
        if (doc && doc.languageId === "markdown") {
            openMarkdownPreviewSideBySide();
        }
    });
}