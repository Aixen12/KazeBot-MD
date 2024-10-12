const { generateWAMessageFromContent, generateWAMessageContent } = (await import('@whiskeysockets/baileys')).default


const command = {
    command: ['tiktok', 'tt'],
    categoria: ['servicio']
}

command.script = async (m, { conn }) => {
    if (!m.text) return m.reply(`Ingrese el comando *\`#${m.command}\`* y seguido un enlace de *Tiktok*, ejemplo:\n#${m.command} https://vm.tiktok.com/ZMhUSrbT2/`)
    m.react('wait')

    try {
        const TkTk = await conn.getJSON(`https://www.tikwm.com/api/?url=${m.args[0]}?hd=1`)
        const TikTok = TkTk.data

        if (m.tag[0] == 'audio') {
            if (TikTok.music) { await conn.sendMessage(m.chat.id, { audio: { url: TikTok.music }, mimetype: 'audio/mpeg' }, { quoted: m }), m.react('done') } else return m.reply('Este video/imagen no tiene ningun audio.')
        } else {
            if (TikTok.images) {
                const url = TikTok.images;
                var Texto = `*Titulo:* ${TikTok.title}\n`;
                Texto += `*Usuario:* ${TikTok.author.nickname}\n`;
                Texto += `*Reproducciones:* ${TikTok.play_count}\n`;
                Texto += `*Comentarios:* ${TikTok.comment_count}\n`;
                Texto += `*Descargas:* ${TikTok.download_count}\n`;
                Texto += `*Imagenes:* ${url.length}`;

                const cards = await Promise.all(url.map(async (url, i) => ({ body: { text: `` }, header: { title: '', hasMediaAttachment: true, imageMessage: (await generateWAMessageContent({ image: { url: url } }, { upload: conn.waUploadToServer })).imageMessage }, nativeFlowMessage: { buttons: [{ name: "single_select", buttonParamsJson: JSON.stringify({ title: BotName, sections: [] }) }] } })))

                if (cards.length > 0) {
                    const message = await generateWAMessageFromContent(m.chat.id, { viewOnceMessage: { message: { interactiveMessage: { body: { text: '`' + url.length + '` imagenes.\n' + readMore + '\n' + Texto }, footer: { text: '' }, header: { hasMediaAttachment: false }, carouselMessage: { cards: cards } } } } }, { timestamp: new Date(), quoted: m });
                    await conn.relayMessage(m.chat.id, message.message, { messageId: message.key.id });
                    await conn.sendButton(m.chat.id, [null, null, global.botName1], null, [{ name: 'reply', button: ['( Audio • 🎧 )', '.tiktok ' + m.args[0] + ' tag=audio'] }], message)
                    m.react('done')
                }
            } else {
                let Texto = `*Titulo:* ${TikTok.title}\n`
                Texto += `*Usuario:* ${TikTok.author.nickname}\n`
                Texto += `*Reproducciones:* ${TikTok.play_count}\n`
                Texto += `*Comentarios:* ${TikTok.comment_count}\n`
                Texto += `*Descargas:* ${TikTok.download_count}`

                await conn.sendButton(m.chat.id, [null, readMore + Texto, BotName], ['video-url', TikTok.play], [{ name: 'reply', button: ['( Audio • 🎧 )', '.tiktok ' + m.args[0] + ' tag=audio'] }], m)
                m.react('done')
            }
        }
    } catch (e) { console.log(e); m.react('error') }
}


export default command