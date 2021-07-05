const Discord = require("discord.js");
const { Aki } = require("aki-api");
const games = new Set();
const attemptingGuess = new Set();

/**
    * @param {Discord.Message} message The Message Sent by the User.
    * @param {Discord.Client} client The Discord Client.
    * @param {"en" | "ar" | "cn" | "de" | "es" | "fr" | "il" | "it" | "jp" | "kr" | "nl" | "pl" | "pt" | "ru" | "tr" | "id"} region (OPTIONAL): The Region/Language Code you want Akinator to Use. Defaults to "en".
    * @returns Discord.js Akinator Game
    * @async
    * @example
    *  const Discord = require("discord.js");
    *  const client = new Discord.Client();
    *  const akinator = require("discord.js-akinator");
    * 
    * const PREFIX = "!";
    * 
    * client.on("message", async message => {
    *     if(message.content.startsWith(`${PREFIX}akinator`)) {
    *         akinator(message, client)
    *     }
    * });
       */

module.exports = async function (message, client, region) {
    try {
        // error handling
        if (!message) return console.log("Discord.js Akinator Error: Message was not Provided.\nNeed Help? Join Our Discord Server at 'https://discord.gg/P2g24jp'");
        if (!client) return console.log("Discord.js Akinator Error: Discord Client was not Provided, and is needed in the new 2.0.0 Update you installed.\nNeed Help? Join Our Discord Server at 'https://discord.gg/P2g24jp'");
        if (!region) region = "en"
        if (!message.id || !message.channel || !message.channel.id || !message.author) throw new Error("The Message Object provided was invalid!")
        if (!client.user.id || !client.user) throw new Error("The Discord Client Object provided was invalid!")
        if (!message.guild) throw new Error("This cannot be used in DMs!")
       
        // defining for easy use
        let usertag = message.author.tag
        let avatar = message.author.displayAvatarURL()
        
        // check if a game is being hosted by the player
        if (games.has(message.author.id))  return;
       
        // adding the player into the game
        games.add(message.author.id)

        let startingMessage = await message.channel.send({ content: ":alarm_clock: Oyun başlıyor, hazır ol!" })

        // starts the game
        let aki = new Aki(region)
        await aki.start();

        let notFinished = true;
        let stepsSinceLastGuess = 0;
        let hasGuessed = false;

        let noResEmbed = new Discord.MessageEmbed()
            .setAuthor(usertag, avatar)
            .setTitle(`Game Ended`)
            .setDescription(`**${message.author.username}, your Game has Ended due to 1 Minute of Inactivity.**`)
            .setColor("RANDOM")

        let akiEmbed = new Discord.MessageEmbed()
            .setAuthor(usertag, avatar)
            .setTitle(`Question ${aki.currentStep + 1}`)
            .setDescription(`**Progress: 0%\n${aki.question}**`)
            .addField("Please Type...", "**Y** or **Yes**\n**N** or **No**\n**I** or **IDK**\n**P** or **Probably**\n**PN** or **Probably Not**\n**B** or **Back**")
            .setFooter(`You can also type "S" or "Stop" to End your Game`)
            .setColor("RANDOM")

        await startingMessage.delete();
        //let akiMessage = await message.channel.send({ content: `**Soru ${aki.currentStep + 1}**: ${aki.question}\nEvet (**e**), hayır (**h**), bilmiyorum (**i**), muhtemelen (**m**), muhtemelen değil (**md**), geri dön (**g**), bitir (**b**)` })
         
        // if message was deleted, quit the player from the game
        /*client.on("messageDelete", async deletedMessage => {
            if (deletedMessage.id == akiMessage.id) {
                notFinished = false;
                games.delete(message.author.id)
                attemptingGuess.delete(message.guild.id)
                await aki.win()
                return;
            }
        })*/

        // repeat while the game is not finished
        while (notFinished) {
            if (!notFinished) return;

            stepsSinceLastGuess = stepsSinceLastGuess + 1

            if (((aki.progress >= 95 && (stepsSinceLastGuess >= 10 || hasGuessed == false)) || aki.currentStep >= 78) && (!attemptingGuess.has(message.guild.id))) {
                attemptingGuess.add(message.guild.id)
                await aki.win();

                stepsSinceLastGuess = 0;
                hasGuessed = true;

                let guessEmbed = new Discord.MessageEmbed()
                    .setAuthor(`${aki.answers[0].name} (${aki.answers[0].description})`, avatar)
                    .setDescription(`Bu tahmini yaparken **%${Math.round(aki.progress)}** eminim.\n\nEğer doğru tahmin ise **e**, yanlış tahmin ise **y** yazın.`)
                    .setImage(aki.answers[0].absolute_picture_path)
                    .setColor("GOLD")
                await message.channel.send({ embed: guessEmbed });

                // valid answers if the akinator sends the last question
                const guessFilter = x => {
                    return (x.author.id === message.author.id && ([
                        "e",
                        "evet",
                        "doğru",
                        "d",
                        "y",
                        "yanlış"
                    ].includes(x.content.toLowerCase())));
                }

                await message.channel.awaitMessages(guessFilter, {
                    max: 1, time: 60000
                })
                    .then(async responses => {
                        if (!responses.size) {
                            return message.channel.send({ content: ":octagonal_sign: 1 dakika içinde herhangi bir cevap vermediğiniz için oyun iptal edildi." });
                        }
                        const guessAnswer = String(responses.first()).toLowerCase();

                        await responses.first().delete();

                        attemptingGuess.delete(message.guild.id)

                        // if they answered yes
                        if (guessAnswer == "d" || guessAnswer == "doğru" || guessAnswer == "e" || guessAnswer == "evet") {
                            await message.channel.send({ content: `:confetti_ball: Harika, seçtiğin **${aki.answers[0].name}** karakterini **${aki.currentStep}** soruda bildim.\nSeçtiğin karakter **${aki.answers[0].ranking}.** sırada, senle oynamak güzeldi!` })
                            notFinished = false;
                            games.delete(message.author.id)
                            return;
                           
                        // otherwise
                        } else if (guessAnswer == "y" || guessAnswer == "yanlış") {
                            if (aki.currentStep >= 78) {
                                await message.channel.send({ content: `:clap: Tebrikler ${message.author}, beni yendin.` })
                                notFinished = false;
                                games.delete(message.author.id)
                            } else {
                                aki.progress = 50
                            }
                        }
                    });
            }

            if (!notFinished) return;

            message.channel.send({ content: `**Soru ${aki.currentStep + 1}**: ${aki.question}\nEvet (**e**), hayır (**h**), bilmiyorum (**i**), muhtemelen (**m**), muhtemelen değil (**md**), geri dön (**g**), bitir (**b**)` })

            // all valid answers when answering a regular akinator question
            const filter = x => {
                return (x.author.id === message.author.id && ([
                    "e",
                    "evet",
                    "h",
                    "hayır",
                    "i",
                    "idk",
                    "bilmiyorum",
                    "m",
                    "muhtemelen",
                    "md",
                    "muhtemelen değil",
                    "g",
                    "geri",
                    "b",
                    "bitir"
                ].includes(x.content.toLowerCase())));
            }

            await message.channel.awaitMessages(filter, {
                max: 1, time: 60000
            })
                .then(async responses => {
                    if (!responses.size) {
                        await aki.win()
                        notFinished = false;
                        games.delete(message.author.id)
                        return message.channel.send({ content: ":octagonal_sign: **1 dakika** içinde herhangi bir cevap vermediğiniz için oyun iptal edildi." })
                    }
                    const answer = String(responses.first()).toLowerCase().replace("'", "");

                    // assign points for the possible answers given
                    const answers = {
                        "e": 0,
                        "evet": 0,
                        "h": 1,
                        "hayır": 1,
                        "i": 2,
                        "idk": 2,
                        "bilmiyorum": 2,
                        "m": 3,
                        "muhtemelen": 3,
                        "md": 4,
                        "muhtemelen değil": 4,
                    }

                    if (answer == "g" || answer == "geri") {
                        if (aki.currentStep >= 1) {
                            await aki.back();
                        }
                       
                    // stop the game if the user selected to stop
                    } else if (answer == "b" || answer == "bitir") {
                        games.delete(message.author.id)
                        await aki.win()
                        await message.channel.send({ content: ":octagonal_sign: Oyun başarıyla iptal edildi." })
                        notFinished = false;
                    } else {
                        await aki.step(answers[answer]);
                    }

                    if (!notFinished) return;
                });
        }
    } catch (e) {
        // log any errors that come
        attemptingGuess.delete(message.guild.id)
        games.delete(message.guild.id)
        if (e == "DiscordAPIError: Unknown Message") return;
        console.log(`Discord.js Akinator Error: ${e}`)
    }
}
