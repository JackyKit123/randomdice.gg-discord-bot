# randomdice.gg-discord-bot
This project is a discord bot that can sync data from randomdice.gg website.

It is a submodule of [randomdice.gg Repository](https://github.com/JackyKit123/randomdice.gg).


## Before You Start

### `npm install`

First install all required packages.

### Create .env

Include the following environment variables in a .env

<table>
    <thead>
        <tr>
            <th>Variable Name</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>BOT_TOKEN</td>
            <td>Token for discord bot</td>
        </tr>
        <tr>
            <td>DEV_SERVER_ID (optional)</td>
            <td>Discord server id for end-to-end test</td>
        </tr>
        <tr>
            <td>DEV_SERVER_LOG_CHANNEL_ID (optional)</td>
            <td>Discord channel id for bot logging</td>
        </tr>
        <tr>
            <td>FIREBASE_ADMIN_PRIVATE_KEY</td>
            <td>Private key for accessing firebase database</td>
        </tr>
        <tr>
            <td>FIREBASE_ADMIN_CLIENT_EMAIL</td>
            <td>Client email for firebase service account</td>
        </tr>
        <tr>
            <td>DEV_USERS_ID</td>
            <td>List of discord user id for the bot developers</td>
        </tr>
    </tbody>
</table>

## Development

### `npm run dev`

Execute eslint, prettier and ts-node to start a development sever.

## Deployment

### `npm start`

This project is built to deployed with git onto heroku. On production server, use `npm start` to start, optionally you can start the production in daemon with [`forever`](https://www.npmjs.com/package/forever).