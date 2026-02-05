const { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand } = require('@aws-sdk/client-ec2');
const { EC2_INSTANCE_ID, AWS_REGION } = require('./config');

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

  try {
    await ec2.send(new StartInstancesCommand({ InstanceIds: [EC2_INSTANCE_ID] }));
    console.log('Instance started');
    return { action: 'start', status: 'started' };
  } catch (err) {
    if (err.name === 'IncorrectInstanceState') {
      console.log(`Cannot start instance: ${err.message}`);
      return { action: 'start', status: 'invalid-state', error: 'Server is not in a state where it can be started. Please try again in a moment.' };
    }
    throw err;
  }
}

async function stopInstance() {
  const state = await getInstanceState();
  if (state === 'stopped' || state === 'stopping') {
    console.log(`Instance already ${state}`);
    return { action: 'stop', status: state };
  }

  try {
    await ec2.send(new StopInstancesCommand({ InstanceIds: [EC2_INSTANCE_ID] }));
    console.log('Instance stopped');
    return { action: 'stop', status: 'stopped' };
  } catch (err) {
    if (err.name === 'IncorrectInstanceState') {
      console.log(`Cannot stop instance: ${err.message}`);
      return { action: 'stop', status: 'invalid-state', error: 'Server is not in a state where it can be stopped. Please try again in a moment.' };
    }
    throw err;
  }
}

module.exports = { startInstance, stopInstance };
