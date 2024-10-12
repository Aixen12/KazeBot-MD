import chalk from 'chalk'
import util, { format } from 'util'
import fs from 'fs'

const file = JSON.parse(fs.readFileSync('./config.json'))
global.readMore = String.fromCharCode(8206).repeat(850)
global.ROwner = file.ROwner
global.Owners = file.Owners
global.prefix = file.Prefix[0]
global.icon = fs.readFileSync('./imagenes/icon.png')
global.aicover = fs.readFileSync('./imagenes/aicover.png')
global.hostWa = fs.readFileSync('./imagenes/hostWa.png')
global.Syllkom = 'https://beacons.ai/Syllkom'
global.CanalKz = 'https://whatsapp.com/channel/0029VaiYDdB89inkuoRbEV13'
global.TextBot = 'Powered by @Syllkom'
global.BotName = '@Kaze Bot - MD'
global.Shidori = 'El bot mas shodori tercer mundista ^w^'

export async function ChatUpdate(conn, m, store) {
    try {
        const userData = await conn.data['@users'][m.sender.id];
        if (global.Owners.some(o => o + '@s.whatsapp.net' === m.sender.id) && !userData.isOwner) Object.assign(userData, { isOwner: true, isModr: true, isPrem: true })
        if (global.ROwner + '@s.whatsapp.net' === m.sender.id && !userData.isROwner) userData.isROwner = true
        Object.assign(m.sender, { rowner: userData.isROwner || false, owner: userData.isOwner || false, modr: userData.isModr || false, prem: userData.isPrem || false })
        await conn.db.write();
    } catch (e) { console.log(util.format(e)) }

    try {
        const userStore = conn.dataStore['@users'][m.sender.id] || false
        const chatStore = conn.dataStore['@chats'][m.chat.id] || false

        if (userStore) {
            if (!userStore.chats.includes(m.chat.id)) userStore.chats.push(m.chat.id);
            if (userStore.commands.length >= 100) userStore.commands.pop();
            if (userStore.messages.length >= 100) userStore.messages.pop();
            if (userStore.names.length >= 100) userStore.names.pop();
            if (m.command) userStore.commands.unshift(m.command);
            if (!userStore.names.includes(m.pushName)) userStore.names.unshift(m.pushName)
            if (userStore.name !== m.pushName) userStore.name = m.pushName;
            userStore.messages.unshift(m.budy === '' ? m.type(m.message) : m.budy);
        }

        if (chatStore) {
            if (chatStore.users[m.sender.id]) chatStore.users[m.sender.id].contador += 1
            else chatStore.users[m.sender.id] = { contador: 1 }
        }

        await conn.dataStore['@data']('@chats').write()
        await conn.dataStore['@data']('@users').write()
    } catch (e) { console.log(util.format(e)) }

    m.IS = (Array = ['rowner', 'owner', 'modr', 'prem']) => Array.some(role => m.sender[role])

    try {
        await conn.commands['all:commands'].get('[StubType].js').script(m, { conn })
        const command = await conn.commands.get(m.command, 'all:commands')
        if (command) return await command.script(m, { conn, store })
    } catch (e) {
        console.log(format(e));
        await m.react('error')
        return await conn.sendButton(global.ROwner + '@s.whatsapp.net', [null, `*[ Evento - ERROR ]*\n\n- Comando:* ${global.prefix + m.command}\n- Usuario:* wa.me/${m.sender.number}\n- Chat:* ${m.chat.id}\n${global.readMore}\n*\`[ERORR]\`:* ${format(e)}\n`, ''], null, [{ name: 'copy', button: ['Copiar', format(e) + ''] }])
    }
}

export async function DataBase(conn, m) {
    try {
        const isROwner = global.ROwner + '@s.whatsapp.net' == m.sender.id;
        const isOwner = isROwner ? true : global.Owners.find(o => o + '@s.whatsapp.net' == m.sender.id);

        if (!conn.data['@chats']) { conn.data['@chats'] = {} }
        if (!conn.data['@users']) { conn.data['@users'] = {} }
        if (!conn.data['@bot']) { conn.data['@bot'] = {} }
        if (!conn.data['@chats'][m.chat.id]) {
            conn.data['@chats'][m.chat.id] = {
                isBan: false,
                settings: {
                    detect: {
                        detect: false,
                        SOLO_LATAM: false,
                        BIENVENIDA: false,
                        DESPEDIDA: false,
                        VERIFICACION: false,
                        ANNOUNCE: false,
                        RESTRICT: false,
                        INVITE_LINK: false,
                        SUBJECT: false,
                        ICON: false,
                        MEMBER_ADD_MODE: false,
                        DEMOTE: false,
                        PROMOTE: false,
                    },
                    antiLink: {
                        antiLink: false,
                        WhatsApp: true,
                        Discord: false,
                        facebook: false,
                        YouTube: false,
                        TikTok: false,
                        Telegram: false,
                        X: false,
                    },
                    antiDelete: {
                        antiDelete: false,
                        audio: true,
                        video: true,
                        image: true,
                        message: true
                    },
                    antiOnce: {
                        antiOnce: false,
                        audio: true,
                        video: true,
                        image: true,
                        admin: false,
                    }
                }
            }
        }

        if (!conn.data['@users'][m.sender.id]) {
            conn.data['@users'][m.sender.id] = {
                isBan: false,
                isROwner: m.bot.id == m.sender.id ? true : isROwner ? true : false,
                isOwner: m.bot.id == m.sender.id ? true : isOwner ? true : false,
                isModr: m.bot.id == m.sender.id ? true : isOwner ? true : false,
                isPrem: m.bot.id == m.sender.id ? true : isOwner ? true : false,
                getname: '',
                shortCmd: [],
            }
        }

        if (!conn.data['@bot'][m.bot.id]) {
            conn.data['@bot'][m.bot.id] = {
                objecto: {},
                SubBots: {},
                autoread: false,
                OwnerUse: false,
                antiPrivado: false
            }
        }
        await conn.db.write()
    } catch (e) {
        console.log(chalk.bgRed('\n[ ERROR - DataBase ] : '), chalk.white(util.format(e)));
    }
};
