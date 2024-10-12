import chalk from 'chalk';
import fs, { link } from 'fs';
import Jimp from 'jimp';
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import minimist from 'minimist';
import path from 'path';
import url from 'url';
import util from 'util';
import { simple, makeWABot } from './lib/Simple.js';
import { ChatUpdate, DataBase } from './script.js';
import FormData from 'form-data'
import moment from 'moment-timezone'
import axios from 'axios'
import { Boom } from '@hapi/boom';

const Process = minimist(process.argv.slice(2));
let args = Process._[0] ? JSON.parse(Process._[0]) : {};
const file = JSON.parse(fs.readFileSync('./config.json'));

const { DisconnectReason } = (await import('@whiskeysockets/baileys')).default;
const dataBase = new LowSync(new JSONFileSync(path.resolve('./lib/data/dataBase.json')), {});
dataBase.read();

const commands = {
    'all:commands': new Map(),
    'prefix:true': new Map(),
    'prefix:false': new Map()
};

// Plugins
await Promise.all(fs.readdirSync('./plugins/').filter(file => file.endsWith('.js')).map(file => import(url.pathToFileURL(path.resolve(`./plugins/${file}`))).then(plugin => { if (plugin.default.usePrefix === false) { commands['prefix:false'].set(file, plugin.default) } else { commands['prefix:true'].set(file, plugin.default) } commands['all:commands'].set(file, plugin.default) }).catch(error => { console.log(chalk.bgRed('[ ERROR ]'), chalk.redBright.bold(`${file}:`), util.format(error)) })))

// Get plugin
commands.get = async (command = false, type = 'all:commands') => { let numero = 0; return await new Promise(async (resolve, reject) => { try { await commands[type].forEach(async (plugin) => { numero += 1, plugin?.command?.find(o => o == command) ? resolve(plugin) : numero >= await commands[type].size ? resolve(false) : null }) } catch (e) { return reject(e) } }) }

const $logger = (title, text) => console.log('\x1b[1;31m~\x1b[1;37m>', chalk.white('['), chalk[title == 'ERROR' ? 'redBright' : 'blue'](title == 'ERROR' ? 'Bot:ERROR' : title), chalk.white(']'), chalk.blue(':'), chalk.green('{'), (title == 'ERROR' ? chalk.redBright(text) : chalk.rgb(255, 131, 0).underline(text)), chalk.green('}'));

if (!fs.existsSync(path.resolve('tmp'))) { fs.mkdirSync('tmp', { recursive: true }), $logger('Bot:tmp', 'tmp create') }

// 
setInterval(async () => { await fs.promises.readdir(path.join('.', 'tmp')).then(files => { files.forEach(async file => { await fs.promises.unlink(path.join('./tmp', file)).catch(e => $logger('ERROR', `El archivo ${file} no se pudo eliminar.`)) }) }).catch(e => $logger('ERROR', e)) }, 1000 * 60 * 2)

if (dataBase.data) { setInterval(async () => { dataBase.write() }, 1000 * 60 * 2) }

const CatBox = async (file, userhash) => {
    const formData = new FormData();
    formData.append('fileToUpload', file, { filename: 'upload' });
    formData.append('userhash', userhash);
    formData.append('reqtype', 'fileupload');
    const CatBox = await axios.post('https://catbox.moe/user/api.php', formData, { headers: { ...formData.getHeaders(), 'Content-Type': 'multipart/form-data' } });
    if (CatBox.data.success) return CatBox.data.url
    return CatBox.data
}

async function StartBot(stMessage) {
    const conn = await makeWABot(stMessage ? stMessage : args)

    conn.db = dataBase;
    global.db = dataBase;
    conn.commands = commands;
    conn.data = dataBase.data;
    conn.$logger = $logger
    conn.CatBox = CatBox

    if (conn.PairingCode) {
        const code = conn.PairingCode.match(/.{1,4}/g)?.join("-");
        conn.$logger('Bot:pairing-code', code)
        args = {};
    }

    //////////////
    global.botName = file.botName[0]
    global.botName1 = file.botName[1]
    global.botName2 = file.botName[2]

    if (!conn.before) { conn.before = {} }

    conn.getName = async (id) => {
        if (typeof id !== 'string') return new Error('conn.getName()');
        id = id.toString();
        if (id.endsWith('@s.whatsapp.net')) {
            if (id == conn.user.id) return conn.user.name;
            let concat = await conn.dataStore['@users'][id] || {};
            concat = concat?.name || id.split('@')[0];
            return concat;
        } else { return id }
    };

    conn.generate_ProfilePhoto = async (buffer) => {
        const jimp = await Jimp.read(buffer);
        const cropped = jimp.crop(0, 0, jimp.getWidth(), jimp.getHeight());
        return await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG);
    };

    conn.getChat = async (chat = false) => {
        if (!chat) return new Error('conn.getChat( chat ? )')
        let m = { id: chat }
        const chatStore = conn.dataStore['@chats']
        if (!chatStore[m.id]) chatStore[m.id] = { link: false, code: false, users: {} }

        // datos | obtener datos
        m.group = m.id.endsWith('@g.us')
        m.metaData = m.group ? (await conn.groupMetadata(m.id) || {}) : {}
        m.name = m.metaData.subject || 'undefined'
        m.description = m.metaData.desc || 'undefined'
        m.participants = m.metaData.participants || []
        m.admins = m.participants.filter(o => o.admin !== null).map(v => v.id) || []
        m.owner = m.metaData.subjectOwner || 'undefined'
        m.photo = async (type = 'image') => await conn.profilePictureUrl(m.id, type).catch(_ => 'https://images.alphacoders.com/137/1377787.jpg')
        m.code = chatStore[m.id]?.code || null
        m.link = 'https://chat.whatsapp.com/' + chatStore[m.id]?.code || null
        m.change = {
            description: async (text) => await conn.groupUpdateDescription(m.id, text),
            name: async (text) => await conn.groupUpdateSubject(m.id, text),
            photo: async (image, type = 'normal') => type == 'normal' ? await conn.updateProfilePicture(m.id, image) : await conn.query({ tag: 'iq', attrs: { target: m.id, to: '@s.whatsapp.net', type: 'set', xmlns: 'w:profile:picture' }, content: [{ tag: 'picture', attrs: { type: 'image' }, content: await conn.generate_ProfilePhoto(image) }] })
        }

        return m
    }

    conn.getUser = async (user = false) => {
        if (!user) return new Error('conn.getUser( user ? )')
        let m = { id: user }

        // dataStore | guardar datos
        const userStore = conn.dataStore['@users']
        if (!userStore[m.id]) userStore[m.id] = {
            name: false,
            names: [],
            messages: [],
            commands: [],
            chats: []
        }

        // datos | obtener datos
        m.bot = (conn.user.id.split(":")[0] + "@s.whatsapp.net") == m.id
        m.name = m.bot ? conn.user.name : userStore[m.id]?.name ? 'undefined' : userStore[m.id].name
        m.photo = async (type = 'image') => await conn.profilePictureUrl(m.id, type).catch(_ => 'https://images.alphacoders.com/137/1377787.jpg')
        m.description = async () => (await conn.fetchStatus(m.id) || {})?.status || 'undefined'
        m.number = m.id.split('@')[0] || undefined
        m.link = `https://wa.me/${m.number}`
        if (m.bot) m.change = {
            description: async (text) => await conn.updateProfileStatus(text),
            name: async (text) => await conn.updateProfileName(text),
            photo: async (image, type = 'normal') => type == 'normal' ? await conn.updateProfilePicture(m.id, image) : await conn.query({ tag: 'iq', attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'w:profile:picture' }, content: [{ tag: 'picture', attrs: { type: 'image' }, content: await conn.generate_ProfilePhoto(image) }] })
        }

        return m
    }

    // event

    conn['@m.key'] = async (m) => {
        if (m.key) {
            if (m.key.remoteJid.endsWith('@g.us')) {
                m.chat = { ...(await conn.getChat(m.key.remoteJid)) }
            } else if (m.key.remoteJid.endsWith('@s.whatsapp.net')) {
                m.chat = { ...(await conn.getUser(m.key.remoteJid)) }
                m.chat.group = false
            }
            m.sender = (m.key.remoteJid.endsWith('@s.whatsapp.net') ?
                await conn.getUser(m.key.remoteJid) : await conn.getUser(m.key.participant))
            m.sender.mentioned = []
            m.bot = await conn.getUser(conn.user.id.split(":")[0] + "@s.whatsapp.net")

            if (m.chat.group) {
                m.bot.fromMe = m.key.fromMe || false
                m.bot.admin = m.chat.admins.includes(m.bot.id) || false
                m.sender.admin = m.chat.admins.includes(m.sender.id) || false
            }

            if (m.bot.admin) {
                const chatStore = conn.dataStore['@chats']
                if (!chatStore[m.chat.id].code) chatStore[m.chat.id].code = await conn.groupInviteCode(m.chat.id)
                if (!chatStore[m.chat.id].link && chatStore[m.chat.id].code) chatStore[m.chat.id].link = `https://chat.whatsapp.com/${chatStore[m.chat.id].code}`

                m.chat.code = chatStore[m.chat.id]?.code || null
                m.chat.link = chatStore[m.chat.id]?.link || null
            }
        }
        m['@m.key'] = true
    }

    conn.ev.on('connection.update', async (update) => {
        const { lastDisconnect } = update;
        if (update.connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode || 500;
            if (reason === DisconnectReason.restartRequired) {
                await StartBot({ connectType: 'qr-code' })
            } else {
                conn.$logger('ERROR', `Conexión cerrada, code ${reason}`);
                if (reason !== DisconnectReason.loggedOut) {
                    conn.$logger('Bot:Connection', 'Restarting()...');
                    await StartBot({ connectType: 'qr-code' })
                }
            }
        }
        if (update.connection === 'open') { conn.$logger('Bot:Connection', 'Connected') }
        if (update.qr) { conn.$logger('Bot:Pairing-qrcode', 'Qrcode()...\n') }
    })

    conn.ev.on('messages.upsert', async (m) => {
        let message_org = JSON.stringify(m, null, 2)
        try {
            if (m.messages > !0) return 'Esperando...'
            m = m.messages[0]
            m.message_org = message_org
            m.type = (message = { _: null }, object = false) => object ? Object.keys(message).find(o => o == object) : Object.keys(message)[0]

            if (m.key) {
                m.chat = { id: m.key.remoteJid }
                m.chat.group = m.key.remoteJid.endsWith('@g.us')
                m.sender = { id: m.chat.group ? m.key.participant : m.key.remoteJid }
                m.bot = { id: conn.user.id.split(":")[0] + "@s.whatsapp.net" }
            }

            // dataBase
            await DataBase(conn, m)
            await simple(conn, m, conn.store)
            if (m.messageStubType) {
                await conn['@m.key'](m)
                return await commands['all:commands'].get('[StubType].js').script(m, { conn })
            }
            if (m.message) {
                const getMessageBody = (message) => m.type(message, 'conversation') ? message.conversation : m.type(message, 'imageMessage') ? message.imageMessage.caption : m.type(message, 'videoMessage') ? message.videoMessage.caption : m.type(message, 'extendedTextMessage') ? message.extendedTextMessage.text : m.type(message, 'templateButtonReplyMessage') ? message.templateButtonReplyMessage.selectedId : m.type(message, 'interactiveResponseMessage') ? (JSON.parse(message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)).id : false

                m.body = await getMessageBody(m.message);
                m.tag = m.body ? (m.body.match(/tag=[^ ]+/g) || []).map(tag => tag.split('=')[1]) : [];
                m.budy = m.tag.length > 0 ? m.body.replace(/tag=[^\s]+/g, '') : m.body || '';
                m.budy = typeof m.budy === 'string' ? m.budy.split(/ +/).join('  ') : m.budy || '';

                if (file.Prefix) {
                    m.command = m.budy.substring(1).trim().split(/ +/)[0].toLowerCase();
                    m.isCmd = await commands.get(m.command, 'prefix:true') ? m.command : false
                    if (!m.isCmd) {
                        m.command = m.budy.trim().split(/ +/)[0].toLowerCase()
                        m.isCmd = await commands.get(m.command, 'prefix:false') ? m.command : false
                    }
                } else {
                    m.command = m.budy.trim().split(/ +/)[0].toLowerCase()
                    m.isCmd = await commands.get(m.command, 'all:commands') ? m.command : false;
                }

                if (m.isCmd) {
                    m.args = m.budy.trim().split(/ +/).slice(1)
                    m.text = m.args.length > 0 ? m.args.join(" ") : false

                    console.log('\x1b[1;31m~\x1b[1;37m>', chalk.white('['), chalk.magenta(moment().tz(Intl.DateTimeFormat().resolvedOptions().timeZone).format('HH:mm:ss')).trim(), chalk.white(']'), chalk.blue(m.isCmd ? `COMANDO:` : `MENSAJE:`), chalk.green('{'), chalk.rgb(255, 131, 0).underline(m.budy == '' ? m.type(m.message) + '' : m.budy), chalk.green('}'), chalk.blue(m.isCmd ? 'Por' : 'De'), chalk.cyan(m.sender.name), 'Chat', m.chat.group ? chalk.bgGreen('grupo:' + (m.chat.name || m.chat.id)) : chalk.bgRed('Privado:' + m.sender.name || m.sender.id))

                    const message = m.message[m.type(m.message)];
                    m.contextInfo = message.contextInfo || false;
                    m.quoted = undefined;

                    await conn['@m.key'](m)

                    if (m.contextInfo) {
                        m.sender.mentioned = m.contextInfo.mentionedJid || [];
                        if (m.contextInfo.quotedMessage) {
                            m.quoted = { ...m.contextInfo.quotedMessage };
                            m.quoted.sender = await conn.getUser(m.contextInfo.participant) || {};
                        }
                    }

                    //cache
                    if (m.chat.id) {
                        if (!conn['node-cache'].has(m.chat.id)) conn['node-cache'].set(m.chat.id, []);
                        const msgCache = conn['node-cache'].get(m.chat.id);
                        if (m.key && m.key.participant) {
                            if (msgCache.length >= 100) msgCache.pop()
                            msgCache.unshift({ key: m.key, message: JSON.stringify(m.message) })
                            conn['node-cache'].set(m.chat.id, msgCache)
                        }
                    }

                    await ChatUpdate(conn, m, conn.store);
                } else {
                    console.log('\x1b[1;31m●\x1b[1;37m>', chalk.white('['), chalk.magenta(moment().tz(Intl.DateTimeFormat().resolvedOptions().timeZone).format('HH:mm:ss')).trim(), chalk.white(']'), chalk.blue(`MENSAJE:`), chalk.green('{'), chalk.rgb(255, 131, 0).underline(m.budy == '' ? m.type(m.message) + '' : m.budy), chalk.green('}'), chalk.blue(m.isCmd ? 'Por' : 'De'), chalk.cyan(m.pushName), 'Chat', m.chat.group ? chalk.bgGreen('grupo:' + m.chat.id) : chalk.bgRed('Privado:' + m.pushName || m.chat.id))

                    /*if (conn.before[m.sender.id]) {
                        if (m.sender.id == m.bot.id) return;
                        return await conn.before[m.sender.id].script(m, { conn })
                    }
                    else if (m.type(m.quoted, "interactiveMessage") &&
                        m.quoted.interactiveMessage.header?.title === '@GPT') {
                        m.text = m.budy
                        await conn.commands.get('servicio-IA.js').script(m, { conn });
                    }*/
                }
            } else { console.log(JSON.stringify(message_org, undefined, 2)) }
        } catch (e) { console.log(chalk.bgRed('\n[E] messages.upsert:'), chalk.white(util.format(e))) }
    })
}

await StartBot()