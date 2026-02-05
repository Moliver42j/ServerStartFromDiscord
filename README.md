# ServerStartFromDiscord

Monitors a Discord voice channel and starts/stops an EC2 instance based on whether anyone's connected.

## How it works

- **Cron trigger**: Checks the voice channel, starts server if users present, stops if empty
- **API Gateway**: POST with `{"action": "server-up"}` or `{"action": "server-down"}` for manual control
- **Direct invoke**: Also accepts `{"action": "start"}` or `{"action": "stop"}`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DISCORD_BOT_TOKEN` | Bot token from Discord developer portal |
| `DISCORD_GUILD_ID` | Server ID |
| `DISCORD_CHANNEL_NAME` | Voice channel name to monitor |
| `EC2_INSTANCE_ID` | EC2 instance to control |
| `AWS_REGION` | Optional, defaults to `eu-west-1` |

## IAM Permissions

```json
{
  "Effect": "Allow",
  "Action": ["ec2:DescribeInstances", "ec2:StartInstances", "ec2:StopInstances"],
  "Resource": "*"
}
```

## Deploy

Prereqs: `aws` (AWS CLI), `node`/`npm`, and `zip`.

```bash
make package
# or deploy directly:
make deploy FUNCTION_NAME=your-lambda-function-name

# Optional:
# make deploy FUNCTION_NAME=your-lambda-function-name AWS_REGION=eu-west-1 AWS_PROFILE=default PUBLISH=1
```
