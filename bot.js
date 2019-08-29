const Discord = require('discord.js')
const tokens = require('./tokens.json')
const ytdl = require('ytdl-core')
const searchapi = require('youtube-api-v3-search')

const client = new Discord.Client()
const prefix = []

var queue = []
var dispatch = []
var repeat = []
var playembed = []

let volume = 1

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
        prefix[guild.id] = "!"
    })
})

client.on('guildDelete', guild => {
    queue.splice(queue.indexOf(guild.id), 1)
    dispatch.splice(dispatch.indexOf(guild.id), 1)
    repeat.splice(repeat.indexOf(guild.id), 1)
    playembed.splice(playembed.indexOf(guild.id), 1)
    prefix.splice(prefix.indexOf(guild.id), 1)
})

client.on('guildCreate', guild => {
    queue.push(guild.id)
    queue[guild.id] = []
    dispatch.push(guild.id)
    repeat.push(guild.id)
    repeat[guild.id] = false
    playembed.push(guild.id)
    playembed[guild.id] = ""
    prefix[guild.id] = "!"
})

client.on('message', async message => {
    if (!message.guild) return
    const currguild = message.member.guild.id
    if (!message.content.startsWith(prefix[currguild])) return
    const arguments = message.content.slice(prefix[currguild].length).trim().split(/ +/g)
    const command = arguments.shift().toLowerCase()

    switch (command) {
        case "add":
            await getinfo(arguments, currguild, message)
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
            if(!message.member.voiceChannel) return message.channel.send("You are not in a voice channel")
            if (!queue[currguild][0]) {
                if (arguments[0]) await getinfo(arguments, currguild, message)
                if (!queue[currguild][0].url) return
            }
            if (playembed[currguild]) return message.channel.send("Something is already playing")
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
                                dispatch[currguild].setVolume(volume)
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
            if (!queue[currguild][1]) {
                await queue[currguild].forEach(element => {
                    queue[currguild].shift()
                })
            }
            dispatch[currguild].end()
            break
        case "help":
            let helpembed = new Discord.RichEmbed()
                .setAuthor(message.author.username, message.author.avatarURL)
                .setTitle("Music Bot v3")
                .setDescription("A music bot")
                .addField(prefix[currguild] + "add", "Adds a song via url or search")
                .addField(prefix[currguild] + "remove", "Removes a song by position")
                .addField(prefix[currguild] + "play", "Starts playing the queue, adds a song if a search is passed")
                .addField(prefix[currguild] + "skip", "Skips the current song")
                .addField(prefix[currguild] + "repeat", "Toggles repeat on or off")
                .addField(prefix[currguild] + "stop", "Stops the music, clears the current queue")
                .setColor("#FF0000")
            message.channel.send(helpembed)
            break
        case "volume":
                if (!dispatch[currguild]) return message.channel.send("Nothing is playing")
                if (!arguments[0]) return message.channel.send(`Current Volume: ${dispatch[currguild].volume}`)
                if (arguments[0] > 1.0) return message.channel.send("Too high!")
                if (arguments[0] <= 0.0) return message.channel.send("Too low!")
                volume = arguments[0]
                dispatch[currguild].setVolume(arguments[0])
            break
        case "prefix":
            if (!arguments[0]) return message.channel.send(`Server Prefix: ${prefix[currguild]}`)
            prefix[currguild] = arguments[0]
            message.channel.send(`The new prefix is: ${prefix[currguild]}`)
            break
    }
})

async function getinfo(arguments, currguild, message) {
    if (!arguments[0]) return message.channel.send("No URL or search specified")
    if (!arguments[0].includes("https://youtu.be/") && !arguments[0].includes("https://www.youtube.com/watch?v=")) {
        let result = await searchapi(tokens.YouTube.api_key, { q: arguments.join().replace(/,/gi, " "), type: "video" })
        if (!result.items[0]) return message.channel.send("Nothing was found")
        arguments[0] = result.items[0].id.videoId
    }
    let info = await ytdl.getBasicInfo(arguments[0])
    let videoDetails = info.player_response.videoDetails
    let thumbnailarr = videoDetails.thumbnail.thumbnails
    let author = info.author
    queue[currguild].push({
        title: info.title,
        url: info.video_url,
        views: `${parseInt(videoDetails.viewCount).toLocaleString('en')} views`,
        thumbnail: thumbnailarr[thumbnailarr.length - 1].url,
        author: {
            name: author.name,
            avatar: author.avatar,
            url: author.channel_url
        }
    })
    return
}