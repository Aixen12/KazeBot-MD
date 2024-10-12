import { youtubedl } from '@bochilteam/scraper-sosmed'

const Regex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/

const command = {
    command: ['ytmp3', 'ytmp4', 'ytmp'],
    categoria: ['servicio']
}

command.script = async (m, { conn }) => {
    if (!m.text) return m.reply(`Ingrese el comando *\`.${m.command}\`* y seguido el enlace de un video de YouTube`)
    if (!Regex.test(m.args[0])) return m.reply(`Link incorrecto`)

    try {
        if (m.command == 'ytmp') {
            await m.react('wait')
            try {
                const data = await youtubedl(m.args[0])
                await conn.sendButton(m.chat.id, [data.title, null, global.botName1], ['image-url', data.thumbnail], [
                    { name: 'reply', button: ['( Video • 🎥 )', `.ytmp4 ${m.args[0]}`] },
                    { name: 'reply', button: ['( Audio • 🎧 )', `.ytmp3 ${m.args[0]}`] },
                ], m)
                await m.react('done')
            } catch (e) {
                const ytmp = await conn.getJSON(`https://widipe.com/download/ytdl?url=${m.args[0]}`)
                if (ytmp.result) {
                    await conn.sendButton(m.chat.id, [ytmp.result.title, null, global.botName1], ['image-url', ytmp.result.thumbnail], [
                        { name: 'reply', button: ['( Video • 🎥 )', `.ytmp4 ${m.args[0]}`] },
                        { name: 'reply', button: ['( Audio • 🎧 )', `.ytmp3 ${m.args[0]}`] },
                    ], m); m.react('done')
                } else new Error('No result')
            }
        }
        else if (m.command == 'ytmp3') {
            const urls = YoutTube(m.text)
            for (let i = 0; i < urls.length; i++) {
                await m.react('wait')
                try {
                    const data = await youtubedl(urls[i])
                    await conn.sendMessage(m.chat.id, { audio: { url: await data.audio['128kbps'].download() }, contextInfo: { externalAdReply: { showAdAttribution: true, title: data.title, body: '', previewType: "PHOTO", thumbnailUrl: data.thumbnail, sourceUrl: CanalKz } }, mimetype: "audio/mp4", fileName: `${data.title}.mp3` }, { quoted: m })
                    await m.react('done');
                } catch (e) {
                    const ytmp = await conn.getJSON(`https://widipe.com/download/ytdl?url=${m.args[0]}`)
                    if (ytmp.result) {
                        await conn.sendMessage(m.chat.id, { audio: { url: ytmp.result.mp3 }, contextInfo: { externalAdReply: { showAdAttribution: true, title: ytmp.result.title, body: '', previewType: "PHOTO", thumbnailUrl: ytmp.result.thumbnail, sourceUrl: CanalKz } }, mimetype: "audio/mp4", fileName: `${ytmp.result.title}.mp3` }, { quoted: m })
                        await m.react('done');
                    } else new Error('No result')
                }
            }
        }
        else if (m.command == 'ytmp4') {
            const urls = YoutTube(m.text)
            for (let i = 0; i < urls.length; i++) {
                await m.react('wait')
                try {
                    const data = await youtubedl(urls[i])
                    const video = data.video[m.tag[0] ? m.tag[0] : '720p']
                    await conn.sendMessage(m.chat.id, { document: { url: await video.download() }, caption: `*Calidad:* ${video.quality}`.trim(), mimetype: 'video/mp4', fileName: data.title + `.mp4` }, { quoted: m })
                    await m.react('done')
                } catch {
                    try {
                        const data = await youtubedl(urls[i])
                        const video = data.video['auto']
                        await conn.sendMessage(m.chat.id, { document: { url: await video.download() }, caption: `*Calidad:* ${video.quality}`.trim(), mimetype: 'video/mp4', fileName: data.title + `.mp4` }, { quoted: m })
                        await m.react('done')
                    } catch {
                        const ytmp = await conn.getJSON(`https://widipe.com/download/ytdl?url=${m.args[0]}`)
                        if (ytmp.result) {
                            await conn.sendMessage(m.chat.id, { document: { url: ytmp.result.mp4 }, caption: ``, mimetype: 'video/mp4', fileName: ytmp.result.title + `.mp4` }, { quoted: m })
                            await m.react('done');
                        } else new Error('No result')
                    }
                }
            }
        }
    } catch (e) { m.react('error'), console.error(e) }
}

export default command

function YoutTube(texto) {
    var text = texto.split(' ')
    var enlaces = []
    var contador = 0

    for (var i = 0; i < text.length; i++) {
        if (Regex.test(text[i])) {
            enlaces.push(text[i]);
            contador++;
            if (contador === 5) { break }
        }
    }
    return enlaces
}