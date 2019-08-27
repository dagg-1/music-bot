const Discord = require('discord.js')
const tokens = require('./tokens.json')
const ytdl = require('ytdl-core')

const client = new Discord.Client()
const prefix = "!"

var queue = []

client.login(tokens.Discord.bot_token)

client.on('ready', () => {
    console.log(`Logged in as "${client.user.username}#${client.user.discriminator}"`)
})

client.on('message', message => {
    if (!message.guild) return
    if (!message.content.startsWith(prefix)) return
    const arguments = message.content.slice(prefix.length).trim().split(/ +/g)
    const command = arguments.shift().toLowerCase()

    switch (command) {
        case "add":
            ytdl.getBasicInfo(arguments[0])
                .then(info => {
                    queue.push({
                        title: `${info.title}`,
                        url: `${info.video_url}`,
                        views: `${info.player_response.videoDetails.viewCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} views`,
                        thumbnail: `${info.player_response.videoDetails.thumbnail.thumbnails[3].url}`,
                        author: {
                            name: `${info.author.name}`,
                            avatar: `${info.author.avatar}`,
                            url: `${info.author.channel_url}`
                        }
                    })
                    let addembed = new Discord.RichEmbed()
                        .setTitle(`Added To Queue: ${queue[queue.length - 1].title}`)
                        .setDescription(queue[queue.length - 1].url)
                        .setAuthor(queue[queue.length - 1].author.name, queue[queue.length - 1].author.avatar, queue[queue.length - 1].author.url)
                        .setColor("#FF0000")
                        .setImage(queue[queue.length - 1].thumbnail)
                        .setFooter(queue[queue.length - 1].views)
                    message.channel.send(addembed)
                })
            break
        case "play":
            message.member.voiceChannel.join()
                .then(vc => {
                    message.channel.send("Loading")
                        .then(thismessage => {
                            untilEnd()
                            function untilEnd() {
                                vc.playStream(ytdl(queue[0].url), { highWaterMark: 3200000 })
                                    .on('end', () => {
                                        queue.shift()
                                        if(queue[0]) untilEnd()
                                        else vc.disconnect()
                                    })
                                let playembed = new Discord.RichEmbed()
                                .setAuthor(queue[0].author.name, queue[0].author.avatar, queue[0].author.url)
                                .setTitle(queue[0].title)
                                .setDescription(queue[0].url)
                                .setFooter(queue[0].views)
                                .setImage(queue[0].thumbnail)
                                .setColor("#FF0000")
                                thismessage.edit(playembed)
                            }
                        })
                })
            break
    }
})