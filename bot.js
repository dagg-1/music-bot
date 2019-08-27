const Discord = require('discord.js')
const tokens = require('./tokens.json')
const ytdl = require('ytdl-core')

const client = new Discord.Client()
const prefix = "!"

var queue = []
var dispatch
var repeat = false
var playembed

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
            if (!arguments[0]) return message.channel.send("No URL specified")
            if (!arguments[0].includes("https://youtu.be/") && !arguments[0].includes("https://www.youtube.com/watch?v=")) return message.channel.send("Invalid URL")
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
            if (!queue[0]) return message.channel.send("Nothing is queued")
            repeat = false
            message.member.voiceChannel.join()
                .then(vc => {
                    message.channel.send("Loading")
                        .then(thismessage => {
                            untilEnd()
                            function untilEnd() {
                                dispatch = vc.playStream(ytdl(queue[0].url), { highWaterMark: 3200000 })
                                    .on('end', () => {
                                        if (repeat == true) untilEnd()
                                        else queue.shift()
                                        if (queue[0]) untilEnd()
                                        else {
                                            vc.disconnect()
                                            dispatch = ''
                                        }
                                    })
                                playembed = new Discord.RichEmbed()
                                    .setAuthor(queue[0].author.name, queue[0].author.avatar, queue[0].author.url)
                                    .setTitle(queue[0].title)
                                    .setDescription(queue[0].url)
                                    .setFooter(queue[0].views)
                                    .setImage(queue[0].thumbnail)
                                    .setColor("#FF0000")
                                if (queue[1]) playembed.addField("Up Next", queue[1].title)
                                thismessage.edit(playembed)
                            }
                        })
                })
            break
        case "pause":
            if (!dispatch) return message.channel.send("Nothing is playing")
            dispatch.pause()
            break
        case "resume":
            if (!dispatch) return message.channel.send("Nothing is playing")
            dispatch.resume()
            break
        case "repeat":
            if (!dispatch) return message.channel.send("Nothing is playing")
            repeat = !repeat
            if (repeat == true) message.channel.send("Repeating")
            else message.channel.send("Not repeating")
            break
        case "np":
            if (!dispatch) return message.channel.send("Nothing is playing")
            message.channel.send(playembed)
                .then(thismessage => {
                    dispatch.on('end', () => {
                        thismessage.edit(playembed)
                    })
                })
            break
        case "queue":
            if (!queue) return message.channel.send("Nothing is queued")
            let queueembed = new Discord.RichEmbed()
                .setAuthor(message.author.username, message.author.avatarURL)
                .setTitle("Queue")
                .setColor("#FF0000")
            let forelement = 0
            queue.forEach(element => {
                forelement++
                queueembed.addField(`Position ${forelement}`, element.title)
            })
            message.channel.send(queueembed)
            break
    }
})