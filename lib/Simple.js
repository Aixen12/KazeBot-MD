import { fileTypeFromBuffer } from 'file-type';
import { JSONFileSync } from 'lowdb/node';
import node_cache from 'node-cache';
import { LowSync } from 'lowdb';
import axios from 'axios';
import path from 'path';
import pino from 'pino';
import fs from 'fs';
import {
    imageToWebp,
    videoToWebp,
    writeExifImg,
    writeExifVid
} from './converter.js';
import {
    Browsers,
    downloadContentFromMessage,
    generateWAMessageContent,
    generateWAMessageFromContent,
    makeCacheableSignalKeyStore,
    makeInMemoryStore,
    useMultiFileAuthState
} from '@whiskeysockets/baileys';

const { default: makeWASocket, proto } = (await import('@whiskeysockets/baileys')).default;

export async function makeWABot(conn = { connectType: 'qr-code', phoneNumber: '' }) {

    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
    const { state, saveCreds } = await useMultiFileAuthState(`connection`);

    const connection = {
        logger: pino({ level: 'silent' }),
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })) },
        browser: Browsers.ubuntu("Chrome"),
        mobile: false,
        syncFullHistory: true,
        printQRInTerminal: conn.connectType == 'qr-code' ? true : false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        fireInitQueries: true,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: false,
        getMessage: async (key) => { if (store) { return await (store.loadMessage(key.remoteJid, key.id))?.message || undefined } return proto.Message.fromObject({}) }
    }

    if (conn.connectType == 'qr-code') { connection.browser = Browsers.macOS('Desktop') }

    const data = {}
    const sock = makeWASocket(connection);
    sock['node-cache'] = new node_cache()
    data['@users'] = new LowSync(new JSONFileSync(path.resolve('./lib/data/Users.Store.json')), {})
    data['@chats'] = new LowSync(new JSONFileSync(path.resolve('./lib/data/Chats.Store.json')), {})
    await data['@users'].read()
    await data['@chats'].read()
    sock.dataStore = {
        '@users': data['@users'].data,
        '@chats': data['@chats'].data,
        '@data': (type) => data[type]
    }

    store?.bind(sock.ev);
    sock.ev.on('creds.update', saveCreds);

    if (conn.connectType == 'pin-code') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const pairingCode = await sock.requestPairingCode(conn.phoneNumber.replace(/\D/g, ''));
        return { PairingCode: pairingCode, state, store, ...sock, proto };
    } else { return { ...sock, state, store, proto } }
}

export async function getBuffer(url, options) { try { options ? options : {}; const res = await axios({ method: "get", url, headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 }, ...options, responseType: 'arraybuffer' }); return res.data } catch (err) { return err } }

export async function simple(conn, m, store) {
    conn.getBuffer = async (url) => Buffer.from(await (await axios.get(url, { responseType: 'arraybuffer' })).data, 'binary')

    conn.getFile = async (URL, type = 'Buffer') => {
        const archivo = await axios.get(URL, { responseType: 'arraybuffer' })
        if (type == 'Buffer') { return Buffer.from(archivo.data, 'binary') } else if (type == 'Base64') { return Buffer.from(archivo.data).toString('base64') } else { return new Error('Tipo no espesificado, Buffer o Base64') }
    }

    conn.getJSON = async (URL, options = {}) => { if (URL) { try { return await (await axios({ method: 'GET', url: URL, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36' }, ...options })).data } catch (e) { return e } } else throw new Error('URL?') }

    conn.Baileys = async () => { return (await import('@whiskeysockets/baileys')).default }
    conn.download = () => { return conn.downloadMediaMessage(m.SMS().message[m.type(m.SMS().message)]) }
    conn.DownloadMedia = () => { return conn.DownloadSaveMedia(m.SMS().message[m.type(m.SMS().message)]) }
    conn.downloadMediaMessage = async (message) => {
        const mime = message.mimetype || "";
        let messageType = mime.split("/")[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
        return buffer;
    }

    conn.DownloadSaveMedia = async (message, filename, attachExtension = true) => {
        const mime = message.mimetype || "";
        let messageType = mime.split("/")[0];
        const stream = await downloadContentFromMessage(m.quoted, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]) }
        let type = await fileTypeFromBuffer(buffer)
        var trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
        fs.writeFileSync(trueFileName, buffer)
        return trueFileName
    }

    conn.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], "base64") : /^https?:\/\//.test(path) ? await getBuffer(path) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer;
        if (options && (options.packname || options.author)) { buffer = await writeExifImg(buff, options) } else { buffer = await imageToWebp(buff) }

        await conn.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
        return buffer;
    }

    conn.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buffer;
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], "base64") : /^https?:\/\//.test(path) ? await getBuffer(path) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);

        if (options && (options.packname || options.author)) { buffer = await writeExifVid(buff, options) } else { buffer = await videoToWebp(buff) }

        await conn.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
        return buffer;
    }

    conn.sendButton = async (jid, text = [], media = null, buttons = [], quoted, options = {}) => {
        let mediaType;
        let mediaMessage = {};
        let type;

        if (media) {
            const [message, source] = media[0].split('-');
            const image = await conn.getFile('https://images.alphacoders.com/137/1377787.jpg', 'Buffer')
            if (media[2]) { if (media[2].jpegThumbnail == true) { media[2].jpegThumbnail = image } }
            mediaType = await generateWAMessageContent({ [message]: source === 'url' ? { url: media[1] } : source == 'true' ? image : media[1], ...(media[2] || {}) }, { upload: conn.waUploadToServer });
            type = Object.keys(mediaType)[0];
            mediaMessage[type] = { ...mediaType[type] }
        }

        const dynamicButtons = buttons.map(btn => {
            let buttonParams = {};
            if (btn.name == 'single_select') {
                buttonParams = { title: btn.button[0], sections: btn.button[1] }
            } else if (btn.name == 'reminder') {
                buttonParams = { display_text: btn.button[0], id: btn.button[1] }
            } else if (btn.name === 'url') {
                buttonParams = { display_text: btn.button[0], url: btn.button[1], merchant_url: btn.button[1] };
            } else if (btn.name === 'copy') {
                buttonParams = { display_text: btn.button[0], copy_code: btn.button[1] };
            } else if (btn.name === 'reply') {
                buttonParams = { display_text: btn.button[0], id: btn.button[1] };
            }
            return {
                name: btn.name == 'single_select' ? 'single_select' : btn.name === 'reply' ? 'quick_reply' : `cta_${btn.name}`,
                buttonParamsJson: JSON.stringify(buttonParams)
            };
        });

        const interactiveMessage = {
            header: mediaMessage[type] ? { title: text[0] || '', hasMediaAttachment: false, [type]: mediaMessage[type] } : { title: text[0] || '', hasMediaAttachment: false },
            body: { text: text[1] || '' },
            footer: { text: text[2] || '' },
            contextInfo: options,
            nativeFlowMessage: {
                buttons: dynamicButtons,
                messageParamsJson: ''
            }
        }

        const message = await generateWAMessageFromContent(jid, { viewOnceMessage: { message: { interactiveMessage } } }, quoted ? { quoted } : {})

        return await conn.relayMessage(jid, message.message, {});
    }

    conn.sendList = async (jid, text = [], buttonText, media = null, sections, quoted, options = {}) => {
        let mediaType;
        let mediaMessage = {};
        let type;

        if (media) {
            const [message, source] = media[0].split('-');
            const image = await conn.getFile('https://images.alphacoders.com/137/1377787.jpg', 'Buffer')
            if (media[2]) { if (media[2].jpegThumbnail == true) { media[2].jpegThumbnail = image } }
            mediaType = await generateWAMessageContent({ [message]: source === 'url' ? { url: media[1] } : source == 'true' ? image : media[1], ...(media[2] || {}) }, { upload: conn.waUploadToServer });
            type = Object.keys(mediaType)[0];
            mediaMessage[type] = { ...mediaType[type] }
        }

        const interactiveMessage = {
            header: mediaMessage[type] ? { title: text[0] || null, hasMediaAttachment: false, [type]: mediaMessage[type] } : { title: text[0] || null, hasMediaAttachment: false },
            body: { text: text[1] || null },
            footer: { text: text[2] || null },
            contextInfo: options,
            nativeFlowMessage: {
                buttons: [{ name: 'single_select', buttonParamsJson: JSON.stringify({ title: buttonText, sections: sections }) }],
                messageParamsJson: ''
            }
        };

        return await conn.relayMessage(jid, await (await generateWAMessageFromContent(jid, { viewOnceMessage: { message: { interactiveMessage } } }, quoted ? { quoted } : {})).message, {});
    };

    m.reply = async (text, tag = 'KazeBot') => {
        if (typeof text == 'string') { await conn.relayMessage(m.chat.id, (await generateWAMessageFromContent(m.chat.id, { viewOnceMessage: { message: { interactiveMessage: { header: { title: tag, hasMediaAttachment: false }, body: { text: text }, footer: { text: '@' + global.botName }, contextInfo: { mentionedJid: (text.match(/@(\d{0,16})/g) || []).map(v => v.slice(1) + '@s.whatsapp.net') }, carouselMessage: { cards: [] } } } } }, { timestamp: new Date(), quoted: m })).message, {}) } else return new Error('[E]: m.reply(string ?)')
    }

    m.react = async (text) => {
        const react = async text => await conn.sendMessage(m.chat.id, { react: { text, key: m.key } })
        if (text == 'error' || text == 'done' || text == 'wait') { await react((JSON.parse(fs.readFileSync('./config.json'))).react[text]) } else await react(text)
    }

    m.SMS = () => {
        const mensage = m.quoted ? m.contextInfo.quotedMessage : m.message
        return { key: { remoteJid: m.key.remoteJid, fromMe: m.key.fromMe, id: m.key.id, participant: m.key.participant }, messageTimestamp: m.messageTimestamp, pushName: m.pushName, broadcast: m.broadcast, message: { [m.type(mensage)]: mensage[m.type(mensage)] } }
    }

    m.sms = (type) => {
        let msg = { rowner: 'Este comando solo puede ser utilizado por el *dueño*', owner: 'Este comando solo puede ser utilizado por un *propietario*', modr: 'Este comando solo puede ser utilizado por un *moderador*', premium: 'Esta solicitud es solo para usuarios *premium*', group: 'Este comando solo se puede usar en *grupos*', private: 'Este comando solo se puede usar por *chat privado*', admin: 'Este comando solo puede ser usado por los *administradores del grupo*', botAdmin: 'El bot necesita *ser administrador* para usar este comando', unreg: 'Regístrese para usar esta función escribiendo:\n\n.registrar nombre.edad', restrict: 'Esta función está desactivada' }[type]
        if (msg) return m.reply(msg)
    }

    conn.evento = async () => {
        if (typeof m.messageStubType == 'undefined') return false
        const even = proto.WebMessageInfo.StubType
        return Object.keys(even).find(key => even[key] === m.messageStubType)
    }

    return conn
}
