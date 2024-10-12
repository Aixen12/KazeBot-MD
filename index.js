import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fork, setupPrimary } from 'cluster';
import { createInterface } from 'readline/promises';

const readline = createInterface({ input: process.stdin, output: process.stdout });
let menu = `\n\x1b[1;31m╭╼◯\x1b[1;37m \x1b[1;32mKaze Bot - MD / Conexión\x1b[0m\n\x1b[1;31m╷\x1b[1;37m Como desea conectarse:\n\x1b[1;31m├╶╶╶✦\x1b[1;37m\n\x1b[1;31m╵⌬\x1b[1;37m \x1b[1;32m1. Por QR\x1b[0m\n\x1b[1;31m╵⌬\x1b[1;37m \x1b[1;32m2. Código por 8 dígitos\x1b[0m\n\x1b[1;31m╰────────────────────────────◯\x1b[1;37m\n`;
let running = false;
let objeto = {};

if (!fs.existsSync(`./connection/creds.json`)) {
    const opcion = await readline.question(menu);
    if (opcion == '1') { objeto = { connectType: 'qr-code', phoneNumber: '' } } else if (opcion == '2') { objeto = { connectType: 'pin-code', phoneNumber: (await readline.question('\n\x1b[1;31m●\x1b[1;37m \x1b[1;32m¿Cual es el numero que desea asignar como Bot?\x1b[0m\n: ')).trim() }, readline.close() }
}

const $logger = (title, text) => console.log('\x1b[1;31m~\x1b[1;37m>', chalk.white('['), chalk[title == 'ERROR' ? 'redBright' : 'blue'](title == 'ERROR' ? 'ERROR' : title), chalk.white(']'), chalk.blue(':'), chalk.green('{'), (title == 'ERROR' ? chalk.redBright(text) : chalk.rgb(255, 131, 0).underline(text)), chalk.green('}'));

async function startBot(file) {
    if (running) return;
    const File = path.resolve(file);
    setupPrimary({ exec: File, args: [JSON.stringify(objeto)] });
    const Worker = fork();
    running = true;
    $logger('KazeBot', 'Start()...')
    Worker.on('exit', async (code, signal) => {
        running = false;
        $logger('ERROR', `Code:${code}|Signal:${signal}`)
        Worker.process.kill();
        $logger('KazeBot', `Restarting()...`)
        await new Promise(resolve => setTimeout(resolve, 2000));
        await startBot(file);
    });
}

await startBot('./Sylls.js');
