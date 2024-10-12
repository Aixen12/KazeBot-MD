import yts from 'yt-search'

const command = {
    command: ['ytsearch', 'yts'],
    categoria: ['servicio']
}

command.script = async (m, { conn }) => {
    if (!m.text) return m.reply(`Ingrese el comando *\`.${m.command}\`* y seguido el título de un video de YouTube`)
    m.react('wait')
    try {
        const vid = (await yts(m.text)).all[0]
        const { thumbnail } = vid
        let results = await yts(m.text)
        let teks = results.all.map((v, i) => {
            switch (v.type) {
                case 'video': {
                    let Buttons = {
                        title: '',
                        highlight_label: v.timestamp,
                        rows: [
                            {
                                header: v.title,
                                title: 'Duracion ' + v.timestamp + ' / Subido ' + v.ago,
                                description: global.readMore + (v.description == '' ? 'Sin decripción' : v.description),
                                id: '.ytmp ' + v.url
                            }
                        ]
                    }

                    return { Buttons }
                }
            }
        }).filter(v => v)

        let buttonsList = teks.map(v => v.Buttons);
        await conn.sendList(m.chat.id, ['YouTube Search.', 'Se encontraron ' + teks.length + ' resultados.', null], 'Lista de resultados', ['image-url', thumbnail], buttonsList)
        m.react('done');
    } catch (e) { m.react('error') }
}

export default command;
