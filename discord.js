const { Client, GatewayIntentBits } = require('discord.js');
const { DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_CHANNEL_NAME } = require('./config');

const SERVER_MESSAGES_CHANNEL = 'server-messages';

async function checkVoiceChannel() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('Discord timeout'));
    }, 10000);

    client.once('ready', async () => {
      try {
        const guild = client.guilds.cache.get(DISCORD_GUILD_ID);
        if (!guild) throw new Error(`Guild not found: ${DISCORD_GUILD_ID}`);

        const channel = guild.channels.cache.find(ch => ch.name === DISCORD_CHANNEL_NAME && ch.isVoiceBased());
        if (!channel) throw new Error(`Channel not found: ${DISCORD_CHANNEL_NAME}`);

        const count = channel.members.size;
        console.log(`${count} user(s) in ${DISCORD_CHANNEL_NAME}`);

        clearTimeout(timeout);
        client.destroy();
        resolve(count > 0);
      } catch (err) {
        clearTimeout(timeout);
        client.destroy();
        reject(err);
      }
    });

    client.on('error', err => {
      clearTimeout(timeout);
      client.destroy();
      reject(err);
    });

    client.login(DISCORD_BOT_TOKEN);
  });
}

async function sendServerMessage(message) {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('Discord timeout'));
    }, 10000);

    client.once('ready', async () => {
      try {
        const guild = client.guilds.cache.get(DISCORD_GUILD_ID);
        if (!guild) throw new Error(`Guild not found: ${DISCORD_GUILD_ID}`);

        const channel = guild.channels.cache.find(ch => ch.name === SERVER_MESSAGES_CHANNEL && ch.isTextBased());
        if (!channel) throw new Error(`Channel not found: ${SERVER_MESSAGES_CHANNEL}`);

        await channel.send(message);
        console.log(`Message sent to ${SERVER_MESSAGES_CHANNEL}: ${message}`);

        clearTimeout(timeout);
        client.destroy();
        resolve(true);
      } catch (err) {
        clearTimeout(timeout);
        client.destroy();
        reject(err);
      }
    });

    client.on('error', err => {
      clearTimeout(timeout);
      client.destroy();
      reject(err);
    });

    client.login(DISCORD_BOT_TOKEN);
  });
}

module.exports = { checkVoiceChannel, sendServerMessage };
