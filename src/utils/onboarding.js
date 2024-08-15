const { exec } = require('child_process');
const os = require('os');
const vscode = require('vscode');
const { promisify } = require('util');
const logger = require('./console');

const execAsync = promisify(exec);

async function showWebviewPanel(title, htmlContent) {
    const panel = vscode.window.createWebviewPanel(
        'webviewPanel',
        title,
        vscode.ViewColumn.One,
        {}
    );

    panel.webview.html = htmlContent;
}

async function showNodeInstallationInstructions() {

    const htmlContent = `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <title>Node.js Installation Instructions</title>
            <style>
            .alert {
            background: #f90000aa;
            padding: 15px;
            font-weight: bold;
            font-size: 20px;
            }

            blockquote {
            background: black;
            }
            </style>
        </head>
        <body>
        <div class="alert">
        ERROR: Node.js is missing!</div>
        <p>
        We didn't find Node.js installed on your computer. Follow <a href="https://4geeks.com/how-to/install-nvm-on-every-operating-system">this guide</a> to install Node in your system!
        </p>
        </body>
    </html>`;
    showWebviewPanel('Node.js Installation Instructions', htmlContent);
}


async function showLearnpackInstallationInstructions() {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <title>LearnPack Installation Instructions</title>
            <style>
            .alert {
            background: #f90000aa;
            padding: 15px;
            font-weight: bold;
            font-size: 20px;
            }

            blockquote {
            background: black;
            }
            </style>
        </head>
        <body>
        <div class="alert">
        ERROR: LearnPack CLI is missing!</div>
        <p>
        We didn't find the LearnPack command line tool in your computer, we tried installing it automatically without success.
        </p>
            <p>Please follow the instructions below to install LearnPack manually:</p>
            <h2> Steps to manually install learnpack cli</h2>
            <ol>
                <li>Open your terminal or command prompt.</li>
                <li>Run the following command: 
                <code>npm i -g @learnpack/learnpack</code>
                </li>
                <li>Verify LearnPack installation running the following command: 
                <code>learnpack --version</code>
                <p>
                You should see and output like the following:
                
                <code>
                 @learnpack/learnpack/4.0.7 win32-x64 node-v20.16.0
                </code>
                
                </p>
                </li>
                <li>
                <p>After installing LearnPack, run the following command:
            <code>learnpack start</code>
            </p>
                </li>
                </ol>
                
            
           
        </body>
    </html>`;
    showWebviewPanel('LearnPack Installation Instructions', htmlContent);
}

async function checkNodeInstallation() {
    try {
        const { stdout, stderr } = await execAsync('node -v');
        if (stderr) throw Error("Node is not installed!");
        return true
    } catch (error) {
        vscode.window.showErrorMessage('Node.js is not installed. Attempting to install Node.js...');
        const result = await installNode();
        return result
    }
}

async function installNode() {
    const platform = os.platform();
    let installCommand;

    if (platform === 'win32') {
        installCommand = 'winget install Schniz.fnm && fnm env --use-on-cd | Out-String | Invoke-Expression && fnm use --install-if-missing 20';
    } else if (platform === 'darwin' || platform === 'linux') {
        installCommand = 'curl -fsSL https://fnm.vercel.app/install | bash && source ~/.bashrc && fnm use --install-if-missing 20';
    } else {
        vscode.window.showErrorMessage('Unsupported OS. Please install Node.js manually from https://nodejs.org/');
        return;
    }

    try {
        await execAsync(installCommand);
        vscode.window.showInformationMessage('Node.js installed successfully. Please restart VSCode.');
        return true
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to install Node.js. Please install it manually from https://nodejs.org/. Error: ${error.stderr}`);
        showNodeInstallationInstructions();
        return false
    }
}

async function checkLearnpackInstallation() {
    try {
        const { stdout, stderr } = await execAsync('npm list -g @learnpack/learnpack');
        if (stderr) throw Error("LearnPack is not installed!");

        return true
    } catch (error) {
        vscode.window.setStatusBarMessage("💻 Attempting to install LearnPack CLI automatically!");
        const result = await installLearnpack();
        return result
    }
}

async function installLearnpack() {
    try {
        await execAsync('npm i -g @learnpack/learnpack');
        vscode.window.showInformationMessage('LearnPack CLI installed successfully!');
        vscode.window.setStatusBarMessage("")
        return true
    } catch (error) {
        vscode.window.showErrorMessage(`We couldn't install LearnPack CLI automatically. 😥`);
        showLearnpackInstallationInstructions();
        logger.debug(error);
        vscode.window.setStatusBarMessage("")
        return false
    }
}

const onboardingManager = {
    checkNodeInstallation,
    installNode,
    checkLearnpackInstallation,
    installLearnpack
};

module.exports = onboardingManager;
