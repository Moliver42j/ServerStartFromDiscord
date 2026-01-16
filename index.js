const { startInstance, stopInstance } = require('./ec2');
const { checkVoiceChannel } = require('./discord');

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
