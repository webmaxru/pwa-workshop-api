// Reading process.env variables from .env file
require('dotenv').config()

// Scaffolding Express app
var express = require('express')
var app = express()
var server = require('http').createServer(app)

var bodyParser = require('body-parser')
app.use(express.static(__dirname))
app.use(bodyParser.json())

// Enabling CORS
var cors = require('cors')
app.use(cors())
app.options('*', cors())

// Setting up detailed logging
var winston = require('winston')
var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      json: true
    })
  ],
  exitOnError: false
})
logger.stream = {
  write: function (message, encoding) {
    logger.info(message)
  }
}
app.use(require('morgan')('combined', { 'stream': logger.stream }))

// Setting Web Push credentials
var webPush = require('web-push')
webPush.setVapidDetails(
  'mailto:salnikov@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)
var pushSubscription

// Connecting to Twitter
var Twitter = require('twitter')
var twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

// Listening to tweets stream
twitterClient.stream('statuses/filter', {track: 'angular'}, function (stream) {
  stream.on('data', function (tweet) {

    // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
    var notificationData = {}
    notificationData.notification = {
      actions: [{
        action: 'retweet',
        title: 'Retweet'
      }, {
        action: 'reply',
        title: 'Reply'
      }],
      body: [ tweet.user.name, tweet.text ].join(': '),
      dir: 'auto',
      icon: tweet.profile_image_url_https,
      lang: tweet.lang,
      renotify: true,
      requireInteraction: true,
      tag: tweet.id,
      vibrate: [300, 100, 400],
      data: tweet.timestamp_ms
    }

    sendNotification(JSON.stringify(notificationData))
    logger.info(notificationData)
  })
})

// Subscribe to Web Push
app.get('/feed', function (req, res, next) {
  twitterClient.get('favorites/list', function (error, tweets, response) {
    if (!error) {
      res.send(tweets)
    } else {
      logger.error(error)
      throw new Error('Error receiving tweets')
    }
  })
})

// Subscribe to Web Push
app.post('/webpush', function (req, res, next) {
  if (req.body.action === 'subscribe') {
    pushSubscription = req.body.subscription

    logger.info('Subscription registered: ', pushSubscription)

    res.send({
      text: 'Subscribed',
      status: '200'
    })
  } else {
    throw new Error('Unsupported action')
  }
})

function sendNotification (payload) {
  if (pushSubscription) {
    webPush.sendNotification(pushSubscription, payload)
      .then(function (response) {
        logger.info('Push sent', payload, response)
      })
      .catch(function (error) {
        logger.error('Push error: ', error)
      })
  }
}

// Starting Express

server.listen(process.env.PORT || 3000, function () {
  logger.info('Listening on port ' + (process.env.PORT || 3000))
})

// Backup option - Web Push by timer

var CronJob = require('cron').CronJob

new CronJob('*/5 * * * * *', function () {

  var notificationData = {}
  notificationData.notification = {
    actions: [{
      action: 'retweet',
      title: 'Retweet'
    }, {
      action: 'reply',
      title: 'Reply'
    }],
    body: 'My notification',
    dir: 'auto',
    icon: 'https://image',
    lang: 'en',
    renotify: true,
    requireInteraction: true,
    tag: 'Some ID',
    vibrate: [300, 100, 400],
    data: 'Test data'
  }

  sendNotification(JSON.stringify(notificationData))
  logger.info(notificationData)

}, null, false) //set the last parameter to true to start CronJob
