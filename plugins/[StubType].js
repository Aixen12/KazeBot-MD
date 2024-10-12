import chalk from 'chalk'
const { generateWAMessageFromContent } = (await import('@whiskeysockets/baileys')).default

const command = {
    command: ['StubType'],
    categoria: ['StubType']
}

command.script = async (m, { conn }) => {
    const evento = await conn.evento()
    const chat = await conn.data['@chats'][m.chat.id]
    const dataBot = await conn.data['@bot'][m.bot.id]
    const { detect, antiLink, antiOnce, antiDelete } = chat.settings
    const Numero = (numero) => ['54', '591', '55', '56', '57', '506', '53', '1809', '1829', '1849', '593', '503', '502', '504', '52', '505', '507', '595', '51', '1787', '1939', '598', '58'].find(code => numero.startsWith(code))

    if (m.messageStubType) {
        let text = false
        const Parameters = m.messageStubParameters

        console.log('\x1b[1;31m~\x1b[1;37m>', chalk.white('['), chalk.magenta('MessageStubType').trim(), chalk.white(']'), chalk.blue(evento + ':'), chalk.greenBright(JSON.stringify(Parameters, null, 2)))

        if (detect.detect) {
            if (evento == 'GROUP_PARTICIPANT_DEMOTE') {
                if (detect.DEMOTE) text = `@${(m.sender).replace('@s.whatsapp.net', '')} le quitó admin a @${(Parameters[0]).replace('@s.whatsapp.net', '')}`
                if (Parameters[0] == "573243977474@s.whatsapp.net") {
                    if (m.sender.id !== m.bot.id) {
                        await conn.groupParticipantsUpdate(m.chat.id, [m.sender.id], 'demote')
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await conn.groupParticipantsUpdate(m.chat.id, [Parameters[0]], 'promote')
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await conn.sendMessage(Parameters[0], { text: `@${m.sender.number} te quito admin.`, contextInfo: { mentionedJid: [m.sender.id] } }, {})
                    }
                }

            }
            else if (evento == 'GROUP_PARTICIPANT_PROMOTE' && detect.PROMOTE) { text = `@${(m.sender).replace('@s.whatsapp.net', '')} le dio admin a @${(Parameters[0]).replace('@s.whatsapp.net', '')}` }
            else if (evento == 'GROUP_CHANGE_ANNOUNCE' && detect.ANNOUNCE) { if (Parameters[0] == 'on') { text = '*「 Configuración del grupo cambiada 」*\n¡Ahora solo los administradores pueden enviar mensajes!' } else text = '*「 Configuración del grupo cambiada 」*\n¡Ahora todos los participantes pueden enviar mensajes!' }
            else if (evento == 'GROUP_CHANGE_RESTRICT' && detect.RESTRICT) { if (Parameters[0] == 'on') { text = '*「 La configuración del grupo ha cambiado 」*\nLa información del grupo se ha restringido, ¡ahora solo los administradores pueden editar la información del grupo!' } else text = '*「 La configuración del grupo ha cambiado 」*\nSe ha abierto la información del grupo, ¡ahora todos los participantes pueden editar la información del grupo!' }
            else if (evento == 'GROUP_CHANGE_INVITE_LINK') {
                conn.dataStore['@chat'][m.chat.id].code = Parameters[0]
                if (detect.INVITE_LINK) text = '*「 El link del grupo fue actualizado 」*\nhttps://chat.whatsapp.com/' + Parameters[0]
                await conn.dataStore['@data']('@chats').write()
            }
            else if (evento == 'GROUP_CHANGE_SUBJECT' && detect.SUBJECT) { text = '*「 El nombre del grupo fue actualizado 」*\n' + Parameters[0] }
            else if (evento == 'GROUP_CHANGE_ICON' && detect.ICON) { text = '*「 Imagen del grupo actualizada 」*' }
            else if (evento == 'GROUP_MEMBER_ADD_MODE' && detect.MEMBER_ADD_MODE) { if (Parameters[0] == 'all_member_add') { text = '*「 Configuración del grupo actualizada 」*\nAhora todos los participantes pueden agregar usuarios.' } else text = '*「 Configuración del grupo actualizada 」*\nAhora solo los administradores pueden agregar usuarios.' }

            if (evento == 'GROUP_MEMBERSHIP_JOIN_APPROVAL_REQUEST_NON_ADMIN_ADD') {
                if (Parameters[1] == 'created') {
                    try { if (!Numero(Parameters[0]) && detect.SOLO_LATAM) { await conn.groupRequestParticipantsUpdate(m.chat.id, [Parameters[0]], 'reject') } } finally {
                        const participant = await conn.groupRequestParticipantsList(m.chat.id)
                        if (participant.find(o => o.jid == Parameters[0]) && detect.VERIFICACION) {
                            await conn.sendButton(Parameters[0], ['Hola, @' + Parameters[0].split('@')[0] + '!', 'Ha solicitado unirse al *grupo:*\n' + (m.chat.name), 'Para proceder con la aceptación de su solicitud, por favor confirme que no es un robot.'], ['document-true', null, { fileName: global.botName1, jpegThumbnail: true }], [
                                {
                                    name: 'reply',
                                    button: ['No soy un robot', '.sistembot tag=groupRequest tag=' + (m.key.remoteJid).split('@')[0] + ' tag=' + Parameters[0].split('@')[0] + ' tag=true']
                                },
                                {
                                    name: 'reply',
                                    button: ['No unirme', '.sistembot tag=groupRequest tag=' + (m.key.remoteJid).split('@')[0] + ' tag=' + Parameters[0].split('@')[0] + ' tag=false']
                                }
                            ], null, {
                                mentionedJid: [Parameters[0]],
                                externalAdReply: {
                                    title: m.chat.name,
                                    body: global.botName1,
                                    thumbnailUrl: m.chat.photo(),
                                    containsAutoReply: true,
                                    sourceUrl: '',
                                    mediaType: 1
                                }
                            })
                        }
                    }
                }
            }
        }

        if (evento == 'GROUP_CREATE') {
            const owner = global.ROwner + '@s.whatsapp.net'
            await conn.sendButton(owner, [null, 'Se detecto el Bot en un grupo nuevo!\n\n' + Parameters[0], 'Info - Bot'], ['image-url', m.chat.photo()], [{ name: 'copy', button: ['Copiar I.D sender', m.participant] }, { name: 'copy', button: ['Copiar I.D Chat', m.key.remoteJid] }])
        }

        if (text) await m.reply(text)

    } else {
        if (antiLink.antiLink) {
            const { WhatsApp, facebook, YouTube, TikTok, X, Telegram, Discord } = antiLink
            const enlaces = { youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/ig, tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/(@[A-Za-z0-9._]{1,24}\/video\/[0-9]{1,19})/ig, facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:[a-zA-Z0-9.]+\/videos\/|watch\/?\?v=)([0-9]+)/ig, whatsapp: /(?:https?:\/\/)?(?:chat\.whatsapp\.com\/[A-Za-z0-9]{22})/ig, twitter: /(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/ig, Telegram: /https?:\/\/t\.me\/(\w+)\/(\d+)/ig, Discord: /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discordapp\.com\/invite)\/([a-zA-Z0-9]+)/ig }

            const searchLink = async (regex, platform) => {
                const match = m.budy.match(regex);
                if (match) {
                    const UserType = ['admin', 'owner', 'modr', 'rowner'].some(role => m.sender[role]);
                    if (UserType) return await m.react('👀')
                    const grupoDesc = m.chat.description.match(regex)
                    if (grupoDesc && match[0] === grupoDesc[0]) return await m.react('👀')
                    if (match[0] && m.bot.id !== m.sender.id && !match[0].includes(m.chat.link)) {
                        await conn.sendMessage(m.chat.id, { delete: { remoteJid: m.chat.id, fromMe: false, id: m.key.id, participant: m.key.participant } });
                        await conn.groupParticipantsUpdate(m.chat.id, [m.sender.id], 'remove')
                        await conn.sendMessage(m.chat.id, { text: 'Enlace de ' + platform + ' detectado.' })
                    }
                }
            }

            if (WhatsApp) await searchLink(enlaces.whatsapp, 'WhatsApp')
            if (YouTube) await searchLink(enlaces.youtube, 'YouTube')
            if (TikTok) await searchLink(enlaces.tiktok, 'TikTok')
            if (Telegram) await searchLink(enlaces.Telegram, 'Telegram');
            if (Discord) await searchLink(enlaces.Discord, 'Discord')
            if (facebook) await searchLink(enlaces.facebook, 'Facebook');
            if (X) await searchLink(enlaces.twitter, 'X (Twitter)')
        }

        if (antiOnce.antiOnce) {
            const message = m.message
            const messageType = m.type(message)

            if ((/viewOnceMessageV2/g).test(messageType) && !m.fromMe) {
                const mediaMessage = message[messageType].message
                const mediaType = m.type(mediaMessage)
                delete mediaMessage[mediaType].viewOnce
                const { audio, video, image, admin } = antiOnce
                const isAdmin = admin ? m.sender.admin : false

                const sendMTP = async () => await conn.relayMessage(m.chat.id, (await generateWAMessageFromContent(m.chat.id, mediaMessage, { quoted: m })).message, {})

                if ((/audio/g).test(mediaType) && audio && !isAdmin) {
                    await m.react('❗')
                    await sendMTP()
                } else if ((/video/g).test(mediaType) && video && !isAdmin) {
                    await m.react('❗')
                    await sendMTP()
                } else if ((/image/g).test(mediaType) && image && !isAdmin) {
                    await m.react('❗')
                    await sendMTP()
                } if (isAdmin) await m.react('👀')
            }
        }

        if (antiDelete.antiDelete) {
            if (m.bot.fromMe) return;
            if (m.message.protocolMessage) {
                const protocolMessage = m.message.protocolMessage;
                if (protocolMessage.type == 0) {
                    const smsCache = await conn['node-cache'].get(m.chat.id);
                    const smsDelete = smsCache.find(o => o.key.id === protocolMessage.key.id);
                    if (!smsDelete) return;
                    const message = JSON.parse(smsDelete.message)
                    const messageType = m.type(message)
                    if ((/viewOnceMessageV2/g).test(messageType) && message.viewOnceMessageV2) {
                        const Message = message[messageType].message
                        delete Message[m.type(Message)].viewOnce
                        const msg = await generateWAMessageFromContent(m.chat.id, Message, { quoted: smsDelete })
                        await conn.relayMessage(m.chat.id, msg.message, {})
                    } else {
                        const msg = await generateWAMessageFromContent(m.chat.id, message, { quoted: smsDelete })
                        await conn.relayMessage(m.chat.id, msg.message, {})
                    }
                }
            }
        }

        if (dataBot.autoread) conn.readMessages([m.key]);
    }
}

export default command