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
                        .setImage(info.player_response.videoDetails.thumbnail.thumbnails[3].url)
                        .setFooter(queue[queue.length - 1].views)
                    message.channel.send(addembed)
                })
            break
        case "play":
            message.member.voiceChannel.join()
                .then(channel => {
                    untilEnd()
                    function untilEnd() {
                        channel.playStream(ytdl(queue[0]))
                            .on('end', channel => {
                                queue.shift()
                                untilEnd()
                            })
                    }
                })
            break
    }
})