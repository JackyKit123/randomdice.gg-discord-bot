import firebase from 'firebase-admin';

export default function app(): firebase.app.App {
    return !firebase.apps.length
        ? firebase.initializeApp({
              credential: firebase.credential.cert({
                  projectId: 'random-dice-web',
                  privateKey: (
                      process.env.FIREBASE_ADMIN_PRIVATE_KEY || ''
                  ).replace(/\\n/g, '\n'),
                  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
              }),
              databaseURL: 'https://random-dice-web.firebaseio.com/',
              databaseAuthVariableOverride: {
                  uid: 'discord-bot',
              },
          })
        : firebase.app();
}

export const database = app().database();
