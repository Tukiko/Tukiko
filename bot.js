// Load up the discord.js library
const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const cooldowns = new Discord.Collection();
const prefix = "=";

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  client.user.setGame(`${prefix}help`);
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
});

client.on("message", async message => {
  // This event will run on every single message received, from any channel or DM.

  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").
  if(message.author.bot) return;

  // Also good practice to ignore any message that does not start with our prefix,
  // which is set in the configuration file.
  if(message.content.indexOf(config.prefix) !== 0) return;

  // Here we separate our "command" name, and our "arguments" for the command.
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  //Cooldown
  if (!cooldowns.has(command.name)) {
      cooldowns.set(command.name, new Discord.Collection());
  }



  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;

  if (!timestamps.has(message.author.id)) {
      timestamps.set(message.author.id, now);
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
  }
  else {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

      if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing that command.`);
      }

      timestamps.set(message.author.id, now);
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
  }


  // Commands =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

  if(command === "ping") {
    cooldown: 5;
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`:ping_pong: Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms`);
    message.react(`✅`);
  }

  if(command === "say") {
    cooldown: 10;
    if(!message.member.hasPermission(`manageMessages`)){
    return message.reply("Sorry, you need *Manage Meaages* to preform this command!");
  }
    // makes the bot say something and delete the message. As an example, it's open to anyone to use.
    // To get the "message" itself we join the `args` back into a string with spaces:
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{});
    // And we get the bot to say the thing:
    message.channel.send(sayMessage);
  }

  if(command === "kick") {
    cooldown: 10;
    // This command must be limited to mods and admins. In this example we just hardcode the role names.
    // Please read on Array.some() to understand this bit:
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/some?
    if(!message.member.hasPermission(`kickMembers`)){
    return message.reply("Sorry, you need *Kick Members* to preform this command!");
  }

    // Let's first check if we have a member and if we can kick them!
    // message.mentions.members is a collection of people that have been mentioned, as GuildMembers.
    let member = message.mentions.members.first();
    if(!member)
      return message.reply("Please mention a valid member of this server");
    if(!member.kickable)
      return message.reply("I cannot kick this user! Do they have a higher role? Do I have kick permissions?");

    // slice(1) removes the first part, which here should be the user mention!
    let reason = args.slice(1).join(' ');
    if(!reason)
      return message.reply("Please indicate a reason for the kick!");

    // Now, time for a swift kick in the nuts!
    await member.kick(reason)
      .catch(error => message.reply(`Sorry ${message.author} I couldn't kick because of : ${error}`));
    message.reply(`${member.user.tag} has been kicked by ${message.author.tag} because: ${reason}`);

  }

  if(command === "ban") {
    cooldown: 10;
    // Most of this command is identical to kick, except that here we'll only let admins do it.
    // In the real world mods could ban too, but this is just an example, right? ;)
    if(!message.member.hasPermission(`banMembers`)){
    return message.reply("Sorry, you need *Ban Members* to preform this command!");
  }

    let member = message.mentions.members.first();
    if(!member)
      return message.reply("Please mention a valid member of this server");
    if(!member.bannable)
      return message.reply("I cannot ban this user! Do they have a higher role? Do I have ban permissions?");

    let reason = args.slice(1).join(' ');
    if(!reason)
      return message.reply("Please indicate a reason for the ban!");

    await member.ban(reason)
      .catch(error => message.reply(`Sorry ${message.author} I couldn't ban because of : ${error}`));
    message.reply(`${member.user.tag} has been banned by ${message.author.tag} because: ${reason}`);
  }

  if(command === "purge") {
    cooldown: 10;
    if(!message.member.hasPermission(`manageMessages`)){
    return message.reply("Sorry, you need *Manage Messages* to preform this command!");
  }
    // This command removes all messages from all users in the channel, up to 100.

    // get the delete count, as an actual number.
    const deleteCount = parseInt(args[0], 10);

    // Ooooh nice, combined conditions. <3
    if(!deleteCount || deleteCount < 2 || deleteCount > 100)
      return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");

    // So we get our messages, and delete them. Simple enough, right?
    const fetched = await message.channel.fetchMessages({count: deleteCount});
    message.channel.bulkDelete(fetched)
      .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
  }


if(command === "help") {
  cooldown: 5;
  message.channel.send({embed: {
      color: 3447003,
      author: {
        name: client.user.username,
        icon_url: client.user.avatarURL
      },
      title: "Tukiko Help",
      description: "This is the Tukiko commands and what they do.",
      fields: [{
          name: "Ping",
          value: "Pong."
        },
        {
          name: "Help",
          value: "Shows this menu."
        },
        {
          name: "Serverinfo",
          value: "Shows information about the server."
        },
        {
          name: "Userinfo",
          value: "Shows information about a user."
        },
        {
          name: "Info",
          value: "Shows the bot info."
        },
        {
          name: "Invite",
          value: "Invite the bot to your server."
        },
        {
          name: "Meme",
          value: "Get Those Dank Memes Boi."
        },
        {
          name: "Cookie",
          value: "Give someone a cookie."
        },
        {
          name: "Slap",
          value: "Slap someone!"
        },
        {
          name: "Ship",
          value: "Matchmaking!"
        },
        {
          name: "Dicklength",
          value: "Find how long someones dick is!"
        },
        {
          name: "Moderator Commands",
          value: `do ${prefix}helpmod to see the moderator commands.`
        },
      ],
      timestamp: new Date(),
      footer: {
        icon_url: client.user.avatarURL,
        text: "© Tukiko"
      }
    }
  });
  message.react(`✅`);
}

if(command === "helpmod") {
  cooldown: 5;
  message.channel.send({embed: {
      color: 3447003,
      author: {
        name: client.user.username,
        icon_url: client.user.avatarURL
      },
      title: "Tukiko Moderator Help",
      description: "All of these commands require permissions.",
      fields: [{
          name: "Kick",
          value: `Usage ${prefix}kick @user`
        },
        {
          name: "Ban",
          value: `Usage ${prefix}ban @user`
        },
        {
          name: "Purge",
          value: `Usage ${prefix}purge 2-100`
        },
        {
          name: "Say",
          value: `Usage ${prefix}say message`
        },
        {
          name: "Invite the bot to a server",
          value: `Usage ${prefix}invite.`
        },
        {
          name: "Support server",
          value: `Usage ${prefix}support.`
        },
        {
          name: "Normal Commands",
          value: `do ${prefix}help to see the normal commands.`
        },
      ],
      timestamp: new Date(),
      footer: {
        icon_url: client.user.avatarURL,
        text: "© Tukiko"
      }
    }
  });
  message.react(`✅`);
}

if(command === "info") {
  cooldown: 5;
  message.channel.send({embed: {
      color: 3447003,
      author: {
        name: client.user.username,
        icon_url: client.user.avatarURL
      },
      title: "Bot id",
      description: "@383434335178457098",
      fields: [{
          name: "Bot Created",
          value: "November 23, 2017."
        },
        {
          name: "The Creator",
          value: "Dezin#2683."
        },
        {
          name: "Commands",
          value: `Use ${prefix}help to see the commands.`
        },
        {
          name: "Invite the bot",
          value: `Do ${prefix}invite to Invite the bot to your server.`
        }
      ],
      timestamp: new Date(),
      footer: {
        icon_url: client.user.avatarURL,
        text: `© Tukiko | The bot is with ${client.users.size} users, and ${client.guilds.size} servers!`
      }
    }
  });
  message.react(`✅`);
}

if(command === "stats") {
  cooldown: 10;

  if(message.author.id != 274751845698633729){
  return message.reply("Sorry, only the bot owner can do this!");
}
  message.channel.send(`The bot is with ${client.users.size} users, and ${client.guilds.size} servers!`);
  message.react(`✅`);
}

if(command === "game") {
  cooldown: 10;
  if(message.author.id != 274751845698633729){
  return message.reply("Sorry, only the bot owner can do this!");
}
const gameMessage = args.join(" ");
message.delete().catch(O_o=>{});
client.user.setGame(gameMessage);
message.react(`✅`);
}

if(command === "support") {
  cooldown: 30;
  message.author.sendMessage("Need some support? Join our support server https://discord.gg/7gRBXXZ");
  message.channel.send("Check your DM's!");
  message.react(`✅`);
}

if(command === "invite") {
  cooldown: 30;
  message.author.send("Want the bot on your server? Use this link to invite the bot to your server https://discordapp.com/oauth2/authorize?&client_id=383434335178457098&scope=bot&permissions=9999999999999");
  message.channel.send("Check your DM's!");
  message.react(`✅`);
      console.log(`${message.author.username} used the invite command`)
}

if(command === "meme") {
  cooldown: 5;
let memes = Math.floor(Math.random() * 30000);
message.channel.send({
  file: `http://images.memes.com/meme/${memes}.jpg`
});
message.react(`😆`);
}

if(command === "cookie") {
  cooldown: 5;
  let user = message.mentions.users.first();
  if(!user) return message.channel.send("You must mention a user!");
  message.channel.send({embed: {
  color: 3447003,
  description: `${user} was given a cookie :cookie: `
  }});
  message.react(`🍪`);
}

if(command === "slap") {
  cooldown: 5;
  let user = message.mentions.users.first();
  if(!user) return message.channel.send("You must mention a user!");
  message.channel.send({embed: {
  color: 3447003,
  description: `${user} was slapped!`
}});
  message.channel.send({
    file: `http://static.tvtropes.org/pmwiki/pub/images/super_slap_7910.png`
})
message.react(`🖐`);
}

if(command === "ship") {
  cooldown: 5;
  let user = message.mentions.users.first();
  if(!user) return message.channel.send("You must mention a user!");
  var relateShip=Math.floor(Math.random()*101);
  message.channel.send({embed: {
  color: 3447003,
  description: `${user} Has a ${relateShip}% chance with you!`
}});
message.react(`😍`);
}

if(command === "dicklength") {
  cooldown: 5;
  let user = message.mentions.users.first();
  if(!user) return message.channel.send("You must mention a user!");
  var dLen=Math.floor(Math.random()*11) + 4;
  message.channel.send({embed: {
  color: 3447003,
  description: `8=====D Whoa, ${user} Has a ${dLen}in dick!`
}});
message.react(`😲`);
}

if(command === "serverinfo") {
  cooldown: 5;
  message.channel.send(new Discord.RichEmbed()
  .setColor("GRAY")
  .setDescription("**Server Info**")
  .addField("Server Name", message.guild.name, false)
  .addField("Server ID", message.guild.id, false)
  .addField("Server Owner Name", message.guild.owner.user.tag, false)
  .addField("Server Owner ID", message.guild.ownerID, false)
  .addField("Members", message.guild.memberCount, true)
  .addField("Emojis", message.guild.emojis != 0 ? message.guild.emojis.size : "No Emojis", true)
  .addField("Roles", message.guild.roles.size != 0 ? message.guild.roles.size : "No Roles", true)
  .setTimestamp());
  message.react(`✅`);
}

if(command === "userinfo") {
  cooldown: 5;
    let user = message.mentions.users.first();
    if(!user) user = message.author;
    let member = message.guild.member(user);
    message.channel.send(new Discord.RichEmbed()
    .setAuthor(user.tag, user.displayAvatarURL)
    .setColor("GRAY")
    .addField("Name", user.username, true)
    .addField("Discriminator", user.discriminator, true)
    .addField("ID", user.id, true)
    .addField('Roles', member.roles.size != 0 ? member.roles.map(r => r.name).join(", ").replace("@everyone, ", "") : "No Roles", false)
    .setTimestamp()
    );
    message.react(`✅`);
}



});

//Functions---------------------------------------------------------------------------------------

client.login(proccess.env.BOT_TOKEN);
