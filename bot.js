const Discord = require('discord.js')
const tokens = require('./tokens.json')

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
        case "foo":
            message.channel.send("bar")
            .then(async thismessage => {
                await thismessage.react("😀")
            }) 
            break

        case "add":
            queue.push({
                title: `${arguments[0]}`,
                url: `${arguments[1]}`
            })
            console.log(queue)
            break
    }
})