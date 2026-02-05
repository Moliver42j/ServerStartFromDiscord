const { startInstance, stopInstance } = require('./ec2');
const { checkVoiceChannel, sendServerMessage } = require('./discord');
const { DISCORD_PUBLIC_KEY } = require('./config');
const nacl = require('tweetnacl');

function verifyDiscordSignature(event) {
  const signature = event.headers['x-signature-ed25519'];
  const timestamp = event.headers['x-signature-timestamp'];
  const body = event.body;

  if (!signature || !timestamp || !body) {
    console.log('Missing signature, timestamp, or body');
    return false;
  }

  if (!DISCORD_PUBLIC_KEY) {
    console.log('DISCORD_PUBLIC_KEY environment variable is not set');
    return false;
  }

  try {
    const isValid = nacl.sign.detached.verify(
      new Uint8Array(Buffer.from(timestamp + body)),
      new Uint8Array(Buffer.from(signature, 'hex')),
      new Uint8Array(Buffer.from(DISCORD_PUBLIC_KEY, 'hex'))
    );
    console.log('Signature verification result:', isValid);
    return isValid;
  } catch (err) {
    console.log('Signature verification error:', err.message);
    return false;
  }
}

async function handleCron() {
  const hasUsers = await checkVoiceChannel();
  if (hasUsers) {
    const result = await startInstance();
    if (result.status === 'started') {
      await sendServerMessage('Start signal sent to the server! ✅');
    }
    return result;
  } else {
    const result = await stopInstance();
    if (result.status === 'stopped') {
      await sendServerMessage('Stop signal sent to the server! ❌');
    }
    return result;
  }
}

function parseBody(event) {
  if (!event.body) return null;
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return null;
  }
}

async function handleDiscordInteraction(body) {
  // Discord PING verification - must respond with PONG
  if (body.type === 1) {
    return { statusCode: 200, body: JSON.stringify({ type: 1 }) };
  }

  // Slash command (type 2 = APPLICATION_COMMAND)
  if (body.type === 2) {
    const commandName = body.data?.name;

    if (commandName === 'server-up') {
      const result = await startInstance();
      const message = result.error 
        ? `⚠️ ${result.error}`
        : `🚀 Server start signal sent! Status: ${result.status}\n\n⚠️ **Reminder:** Join the voice channel to keep the server running! The server will automatically shut down if no one is in the voice channel.`;
      return {
        statusCode: 200,
        body: JSON.stringify({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: { content: message }
        })
      };
    }

    if (commandName === 'server-down') {
      const result = await stopInstance();
      const message = result.error 
        ? `⚠️ ${result.error}`
        : `🛑 Server stop signal sent! Status: ${result.status}`;
      return {
        statusCode: 200,
        body: JSON.stringify({
          type: 4,
          data: { content: message }
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        type: 4,
        data: { content: 'Unknown command' }
      })
    };
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'Unknown interaction type' }) };
}

async function handleHttp(event) {
  const body = parseBody(event);

  // Handle Discord interactions (has type field)
  if (body?.type !== undefined) {
    // Verify Discord signature
    if (!verifyDiscordSignature(event)) {
      console.log('Invalid Discord signature');
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid signature' }) };
    }
    return handleDiscordInteraction(body);
  }

  // Handle legacy API calls (has action field)
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
