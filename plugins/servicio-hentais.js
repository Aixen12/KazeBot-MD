import fs from 'fs';
import path from 'path';

const command = {
    command: ['hentai'],
    categoria: ['servicio']
}

const _Image = {
    hentai: [
        "https://telegra.ph/file/e6e7a4f32b971870ab951.jpg"
    ]
}

const getRandom = (Array) => Array[Math.floor(Math.random() * Array.length)];

command.script = async (m, { conn }) => {
    const animeDB = JSON.parse(fs.readFileSync(path.resolve('./lib/animeDB.json')));
    const hentais = animeDB.hentais;
    const hentaiList = Object.keys(hentais).map(key => ({ name: key, ...hentais[key] })).sort((a, b) => Object.values(a.capitulos).length - Object.values(b.capitulos).length);

    let single_select = [{ title: '', highlight_label: '', rows: [] }];

    if (m.tag.length < 1) {
        await m.react('wait');
        try {
            single_select = hentaiList.map(hentai => ({ title: '', highlight_label: Object.values(hentai.capitulos).length === hentai.cap_total ? '' : 'Emisión', rows: [{ header: hentai.name.split('_').join(' '), title: `Capítulos: ${Object.values(hentai.capitulos).length}/${hentai.cap_total}. Temporada: ${hentai.temporada}`, description: hentai.clasificacion, id: `.hentai tag=${hentai.name} tag=hentai` }] }));
            await conn.sendButton(m.chat.id, ['Hentais disponibles', '', global.botName1], ['image-url', getRandom(_Image.hentai)], [{ name: 'single_select', button: ['Hentais', single_select] }], m);
            await m.react('done');
        } catch (e) { await m.react('error'); }
    } 
    
    else if (m.tag[1] === 'hentai') {
        if (hentais[m.tag[0]]) {
            await m.react('wait');
            try {
                const hentai = hentais[m.tag[0]];
                const capitulos = Object.values(hentai.capitulos);

                single_select[0].title = hentai.title;
                for (let i = 0; i < capitulos.length; i++) {
                    single_select[0].rows.push({
                        header: '',
                        title: `Capítulo ${i + 1} | Sub Español`,
                        description: '',
                        id: `.hentai tag=${m.tag[0]} tag=capitulo tag=${i + 1}`
                    });
                }

                await conn.sendButton(m.chat.id, [
                    hentai.title,
                    `Capítulos: ${capitulos.length}/${hentai.cap_total}\n\n${hentai.sinopsis}`,
                    hentai.clasificacion
                ], ['image-url', hentai.imagen], [{ name: 'single_select', button: ['Capítulos', single_select] }], m);
                await m.react('done');
            } catch (e) { await m.react('error'); }
        } else {
            m.reply('Hentai no encontrado.');
        }
    } 
    
    else if (m.tag[1] === 'capitulo') {
        await m.react('wait');
        try {
            const hentai = hentais[m.tag[0]];

            if (hentai && hentai.capitulos['' + m.tag[2]]) {
                await conn.sendMessage(m.chat.id, {
                    document: { url: hentai.capitulos['' + m.tag[2]] },
                    caption: `Capítulo ${m.tag[2]} | Sub Español. ${hentai.title}.`,
                    mimetype: 'video/mp4',
                    fileName: `${hentai.title}. Capítulo ${m.tag[2]}. Sub Español.mp4`
                }, { quoted: m });
                await m.react('done');
            } else {
                m.reply('Capítulo no encontrado.');
            }
        } catch (e) {
            await m.react('error');
        }
    }
}

export default command;
