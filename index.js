const { Client, GatewayIntentBits } = require('discord.js');
const { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand } = require('@aws-sdk/client-ec2');

const {
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  DISCORD_CHANNEL_NAME,
  EC2_INSTANCE_ID,
  AWS_REGION = 'eu-west-1'
} = process.env;

const ec2 = new EC2Client({ region: AWS_REGION });

async function getInstanceState() {
  const { Reservations } = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [EC2_INSTANCE_ID] }));
  return Reservations[0].Instances[0].State.Name;
}

async function startInstance() {
  const state = await getInstanceState();
  if (state === 'running' || state === 'pending') {
    console.log(`Instance already ${state}`);
    return { action: 'start', status: state };
  }
  
  await ec2.send(new StartInstancesCommand({ InstanceIds: [EC2_INSTANCE_ID] }));
  console.log('Instance started');
  return { action: 'start', status: 'started' };
}

async function stopInstance() {
  const state = await getInstanceState();
  if (state === 'stopped' || state === 'stopping') {
    console.log(`Instance already ${state}`);
    return { action: 'stop', status: state };
  }
  
  await ec2.send(new StopInstancesCommand({ InstanceIds: [EC2_INSTANCE_ID] }));
  console.log('Instance stopped');
  return { action: 'stop', status: 'stopped' };
}

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

async function handleCron() {
  const hasUsers = await checkVoiceChannel();
  return hasUsers ? startInstance() : stopInstance();
}

function parseBody(event) {
  if (!event.body) return null;
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return null;
  }
}

async function handleHttp(event) {
  const body = parseBody(event);
  const action = body?.action;

  if (action !== 'server-up' && action !== 'server-down') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Use action: server-up or server-down' }) };
  }

  const result = action === 'server-up' ? await startInstance() : await stopInstance();
  return { statusCode: 200, body: JSON.stringify(result) };
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  try {
    // API Gateway request
    if (event.httpMethod || event.requestContext?.http) {
      return handleHttp(event);
    }

    // Direct invoke with action param
    if (event.action === 'start' || event.action === 'server-up') return startInstance();
    if (event.action === 'stop' || event.action === 'server-down') return stopInstance();

    // Scheduled trigger - check Discord and manage server
    return handleCron();

  } catch (err) {
    console.error(err);
    if (event.httpMethod || event.requestContext?.http) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
    throw err;
  }
};
