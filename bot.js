const Discord = require('discord.js')
const tokens = require('./tokens.json')
const ytdl = require('ytdl-core')
const searchapi = require('youtube-api-v3-search')

const client = new Discord.Client()
const prefix = "!"

var queue = []
var dispatch = []
var repeat = []
var playembed = []

client.login(tokens.Discord.bot_token)

client.on('ready', () => {
    console.log(`Logged in as "${client.user.username}#${client.user.discriminator}"`)
    client.guilds.tap(guild => {
        queue.push(guild.id)
        queue[guild.id] = []
        dispatch.push(guild.id)
        repeat.push(guild.id)
        repeat[guild.id] = false
        playembed.push(guild.id)
        playembed[guild.id] = ""
    })
})

client.on('guildDelete', guild => {
    queue[guild.id] = []
    dispatch[guild.id] = []
    repeat[guild] = ""
    playembed[guild] = ""
})

client.on('guildCreate', guild => {
    queue.push(guild.id)
    queue[guild.id] = []
    dispatch.push(guild.id)
    repeat.push(guild.id)
    repeat[guild.id] = false
    playembed.push(guild.id)
    playembed[guild.id] = ""
})

client.on('message', async message => {
    if (!message.guild) return
    if (!message.content.startsWith(prefix)) return
    const arguments = message.content.slice(prefix.length).trim().split(/ +/g)
    const command = arguments.shift().toLowerCase()
    const currguild = message.member.guild.id

    switch (command) {
        case "add":
            if (!arguments[0]) return message.channel.send("No URL or search specified")
            if (!arguments[0].includes("https://youtu.be/") && !arguments[0].includes("https://www.youtube.com/watch?v=")) {
                let result = await searchapi(tokens.YouTube.api_key, { q: arguments.join().replace(/,/gi, " "), type: "video" })
                arguments[0] = result.items[0].id.videoId
            }
            let info = await ytdl.getBasicInfo(arguments[0])
            queue[currguild].push({
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
                .setTitle(`Added To Queue: ${queue[currguild][queue[currguild].length - 1].title}`)
                .setDescription(queue[currguild][queue[currguild].length - 1].url)
                .setAuthor(queue[currguild][queue[currguild].length - 1].author.name, queue[currguild][queue[currguild].length - 1].author.avatar, queue[currguild][queue[currguild].length - 1].author.url)
                .setColor("#FF0000")
                .setImage(queue[currguild][queue[currguild].length - 1].thumbnail)
                .setFooter(queue[currguild][queue[currguild].length - 1].views)
            message.channel.send(addembed)
            break
        case "play":
            if (!queue[currguild][0]) return message.channel.send("Nothing is queued")
            repeat[currguild] = false
            message.member.voiceChannel.join()
                .then(vc => {
                    message.channel.send("Loading")
                        .then(thismessage => {
                            untilEnd()
                            function untilEnd() {
                                dispatch[currguild] = vc.playStream(ytdl(queue[currguild][0].url, { highWaterMark: 32000000 }))
                                    .on('end', () => {
                                        if (repeat[currguild] == true) untilEnd()
                                        else queue[currguild].shift()
                                        if (queue[currguild][0]) untilEnd()
                                        else {
                                            vc.disconnect()
                                            dispatch[currguild] = ''
                                            playembed[currguild] = ''
                                        }
                                    })
                                playembed[currguild] = new Discord.RichEmbed()
                                    .setAuthor(queue[currguild][0].author.name, queue[currguild][0].author.avatar, queue[currguild][0].author.url)
                                    .setTitle(queue[currguild][0].title)
                                    .setDescription(queue[currguild][0].url)
                                    .setFooter(queue[currguild][0].views)
                                    .setImage(queue[currguild][0].thumbnail)
                                    .setColor("#FF0000")
                                if (queue[currguild][1]) playembed[currguild].addField("Up Next", queue[currguild][1].title)
                                thismessage.edit(playembed[currguild])
                            }
                        })
                })
            break
        case "pause":
            if (!dispatch[currguild]) return message.channel.send("Nothing is playing")
            dispatch[currguild].pause()
            break
        case "resume":
            if (!dispatch[currguild]) return message.channel.send("Nothing is playing")
            dispatch[currguild].resume()
            break
        case "repeat":
            if (!dispatch[currguild]) return message.channel.send("Nothing is playing")
            repeat[currguild] = !repeat[currguild]
            if (repeat[currguild] == true) message.channel.send("Repeating")
            else message.channel.send("Not repeating")
            break
        case "np":
            if (!dispatch[currguild]) return message.channel.send("Nothing is playing")
            message.channel.send(playembed[currguild])
                .then(thismessage => {
                    dispatch[currguild].on('end', () => {
                        thismessage.edit(playembed[currguild])
                    })
                })
            break
        case "queue":
            if (!queue[currguild][0]) return message.channel.send("Nothing is queued")
            let queueembed = new Discord.RichEmbed()
                .setAuthor(message.author.username, message.author.avatarURL)
                .setTitle("Queue")
                .setColor("#FF0000")
            let forelement = 0
            queue[currguild].forEach(element => {
                forelement++
                queueembed.addField(`Position ${forelement}`, element.title)
            })
            message.channel.send(queueembed)
            break
        case "remove":
            if (!queue[currguild][0]) return message.channel.send("Nothing is queued")
            if (!arguments[0]) return message.channel.send("No position specified")
            if (!queue[currguild][arguments[0] - 1]) return message.channel.send("Invalid position")
            message.channel.send(`Removed ${queue[currguild][arguments[0] - 1].title} from the queue`)
            queue[currguild].splice((arguments[0] - 1), 1)
            break
        case "skip":
            if (!dispatch[currguild]) return message.channel.send("Nothing is playing")
            if (!queue[currguild][1]) return message.channel.send("Nothing else is queued")
            dispatch[currguild].end()
            break
        case "stop":
            if (!dispatch[currguild]) return message.channel.send("Nothing is playing")
            await queue[currguild].forEach(element => {
                queue[currguild].shift()
            })
            dispatch[currguild].end()
            break
        case "help":
            let helpembed = new Discord.RichEmbed()
                .setAuthor(message.author.username, message.author.avatarURL)
                .setTitle("Music Bot v3")
                .setDescription("A music bot")
                .addField("add", "Adds a song via url or search")
                .addField("remove", "Removes a song by position")
                .addField("play", "Starts playing the queue")
                .addField("skip", "Skips the current song")
                .addField("repeat", "Toggles repeat on or off")
                .addField("stop", "Stops the music, clears the current queue")
                .setColor("#FF0000")
            message.channel.send(helpembed)
            break
    }
})