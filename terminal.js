const terminalOutput = document.getElementById('terminalOutput');
const terminalInput = document.getElementById('terminalInput');

let fileSystem = {
    'readme.txt': 'Welcome to the system. The anomaly is contained within Gensokyo.sys.\nDo not execute it.'
};

let gameInstance = null; // Will be set by game.js

terminalInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const commandStr = this.value.trim();
        this.value = '';
        
        printToTerminal(`root@gensokyo:~# ${commandStr}`, 'sys-text');
        
        if (commandStr.length > 0) {
            processCommand(commandStr);
        }
        
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
});

function printToTerminal(text, className = '') {
    const lines = text.split('\n');
    lines.forEach(line => {
        const p = document.createElement('p');
        p.textContent = line;
        if (className) p.className = className;
        terminalOutput.appendChild(p);
    });
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function processCommand(cmdStr) {
    const args = cmdStr.split(' ');
    const cmd = args[0].toLowerCase();

    switch(cmd) {
        case 'help':
            printToTerminal('Available commands:');
            printToTerminal('  help    - Show this message');
            printToTerminal('  ls      - List directory contents');
            printToTerminal('  cat     - Print and concatenate files');
            printToTerminal('  clear   - Clear terminal screen');
            printToTerminal('  ./gensokyo.sys - Execute anomaly ritual');
            break;
        case 'ls':
            const files = Object.keys(fileSystem).join('  ');
            printToTerminal(files);
            break;
        case 'cat':
            if (args.length < 2) {
                printToTerminal('cat: missing operand');
            } else {
                const filename = args[1];
                if (fileSystem[filename]) {
                    printToTerminal(fileSystem[filename]);
                } else {
                    printToTerminal(`cat: ${filename}: No such file or directory`, 'error-text');
                }
            }
            break;
        case 'clear':
            terminalOutput.innerHTML = '';
            break;
        case './gensokyo.sys':
            printToTerminal('Executing Gensokyo.sys...', 'sys-text');
            printToTerminal('WARNING: Memory corruption likely.', 'error-text');
            if (window.startGame) {
                window.startGame();
            } else {
                printToTerminal('Error: Executable not found.', 'error-text');
            }
            break;
        default:
            printToTerminal(`bash: ${cmd}: command not found`, 'error-text');
    }
}

// Global function exposed to game.js to trigger file decryption
window.unlockFile = function(filename, content) {
    fileSystem[filename] = content;
    printToTerminal(`[SYSTEM] Decryption successful. New file recovered: ${filename}`, 'success-text');
};

// Global print for game.js to use
window.printToTerminal = printToTerminal;
