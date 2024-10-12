const { generateWAMessageFromContent } = (await import('@whiskeysockets/baileys')).default


const command = {
    command: ['tagall', 'todos', 'invocar', 'paja'],
    categoria: ['grupos']
}

command.script = async (m, { conn }) => {
    if (!m.chat.group) return m.sms('group')
    if (!m.sender.admin) return m.sms('admin')
    let text = ''
    for (let mem of m.chat.participants) { text += `- @${mem.id.split('@')[0]}\n` }
    await conn.sendButton(m.chat.id, [m.text, (m.text == '' ? '' : '\n') + `*Invocando al grupo*\n${readMore}\n` + text, BotName], ['document-true', null, { fileLength: 1024 * 1024 * 1024, fileName: ' ', jpegThumbnail: true }], [{ name: 'reminder', button: ['Programar recordatorio', 'message'] }], m, { mentionedJid: m.chat.participants.map(a => a.id), externalAdReply: { title: `${m.chat.name}`, body: TextBot, thumbnailUrl: await m.bot.photo(), mediaType: 1 } })

}

export default command