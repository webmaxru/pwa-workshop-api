# A simple Twitter-based API for PWA Workshop

## Prerequisites
Latest stable versions of `node`, `npm` installed. Having `yarn` installed is strongly recommended.

## Install
1. Clone the repo
2. 
```bash
yarn
```
or
```bash
npm install
```

## Creating settings file
1. Save `.env.template` as `.env` and open it in the editor

## Getting Twitter credentials
1. Go to [https://apps.twitter.com/app/new](https://apps.twitter.com/app/new) and create a new app. Website field - any valid URL
2. Go to "Keys and Access Tokens" tab and click "Create my access token" button
3. Use Consumer Key, Consumer Secret, Access Token, Access Token Secret to fill in the corresponding fields in `.env`

## Getting VAPID credentials
Go to [https://web-push-codelab.appspot.com/](https://web-push-codelab.appspot.com/) and use the newly generated Public and Private VAPID keys to fill in the corresponding fields in `.env`

## Starting the app
1. In the terminal
```bash
node .
```
You should see the output:
```
{
  "level": "info",
  "message": "Listening on port 3000"
}
```
2. Open [http://localhost:3000/](http://localhost:3000/). You should see `PWA Workshop API works!`.
3. Open [http://localhost:3000/timeline/](http://localhost:3000/timeline/). You should see the JSON with your latest tweets.
4. Open [http://localhost:3000/timeline/angular/](http://localhost:3000/timeline/angular/). You should see the JSON with `@angular` latest tweets. Instead of `angular` you can use any other Twitter handle.
5. Check the console: you will see the entries
```
{
  "level": "info",
  "message": "Tweet stream received"
}
```
appear there periodically.


## Customizing the app
By default it streams the new tweets with `javascript` string. You can change this setting:
```bash
node . --stringToMonitor angular
```

## Important
Please allow 10-15 seconds after application stop before the new start. Otherwise your connection will be rejected by Twitter's rate limit control (`Status Code: 420`). Just wait 30 seconds before the new start in this case.

## Fallback solution for Push messaging
If Twitter Stream API doesn't work, set the last parameter of `new CronJob` to `true` to start pushing messages by timer. 
