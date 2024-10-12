import pino from 'pino';
import nodecache from 'node-cache'
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import path from 'path'

const { default: makeWASocket, makeCacheableSignalKeyStore, useMultiFileAuthState, makeInMemoryStore, Browsers, proto } = (await import('@whiskeysockets/baileys')).default;

export class makeWABot {
    async make(Connection = { connectType: '1', phoneNumber: '', pathFile: 'Session' }) {
        const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
        const { state, saveCreds } = await useMultiFileAuthState(Connection.pathFile);
        const connection = { logger: pino({ level: 'silent' }), auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })) }, browser: Browsers.ubuntu("Chrome"), mobile: false, syncFullHistory: true, printQRInTerminal: Connection.connectType == '1' ? true : false, connectTimeoutMs: 60000, defaultQueryTimeoutMs: 0, keepAliveIntervalMs: 10000, emitOwnEvents: true, fireInitQueries: true, markOnlineOnConnect: true, generateHighQualityLinkPreview: false, getMessage: async (key) => { if (store) { return await (store.loadMessage(key.remoteJid, key.id))?.message || undefined } return proto.Message.fromObject({}) } }

        if (Connection.connectType == '1') { connection.browser = Browsers.macOS('Desktop') }

        const data = {}
        const sock = makeWASocket(connection);
        sock['node-cache'] = new nodecache()
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

        if (Connection.connectType == '2') {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const pairingCode = await sock.requestPairingCode(Connection.phoneNumber.replace(/\D/g, ''));
            return { PairingCode: pairingCode, state, store, ...sock, proto };
        } else { return { ...sock, state, store, proto } }
    }
};
