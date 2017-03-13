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
      json: true,
      level: 'info' // Set 'debug' for super-detailed output
    })
  ],
  exitOnError: false
})
logger.stream = {
  write: function (message, encoding) {
    logger.info(message)
  }
}
app.use(require('morgan')('combined', {
  'stream': logger.stream
}))

// Reading command line arguments
var argv = require('yargs')
  .usage('Usage: $0 --stringToMonitor [string]')
  .argv

var stringToMonitor = argv.stringToMonitor || 'javascript'

// Setting Web Push credentials
var webPush = require('web-push')
webPush.setVapidDetails(
  'mailto:salnikov@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)
var pushSubscription

// Connecting to Twitter
// Get your credentials here: https://apps.twitter.com/app/new
var Twitter = require('twitter')
var twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

// Listening to tweets stream
twitterClient.stream('statuses/filter', {
  track: stringToMonitor
}, function (stream) {
  stream.on('data', function (tweet) {
    if (tweet && tweet.user) {

      // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
      var notificationData = {}
      notificationData.notification = {
        title: tweet.user.name,
        actions: [{
          action: 'opentweet',
          title: 'Open tweet'
        }],
        body: tweet.text,
        dir: 'auto',
        icon: tweet.user.profile_image_url_https,
        image: tweet.user.profile_image_url_https,
        badge: tweet.user.profile_image_url_https,
        lang: tweet.lang,
        renotify: true,
        requireInteraction: true,
        tag: tweet.id,
        vibrate: [300, 100, 400],
        data: 'https://twitter.com/statuses/' + tweet.id_str
      }

      sendNotification(JSON.stringify(notificationData))
      logger.debug(notificationData)
      logger.debug(tweet)
      logger.info('Tweet stream received')
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
        logger.info('Push sent')
        logger.debug(payload)
        logger.debug(response)
      })
      .catch(function (error) {
        logger.error('Push error: ', error)
      })
  }
}

// Exposing the timeline endpoint
// Go to https://dev.twitter.com/rest/tools/console to get endpoints list
app.get('/timeline/:screenName?', function (req, res, next) {
  twitterClient.get('statuses/user_timeline', {
    screen_name: req.params.screenName
  })
    .then(function (tweets) {
      res.send(tweets)
    })
    .catch(function (error) {
      logger.error(error)
      throw new Error('Error receiving tweets')
    })
})

// Subscribe to Web Push
app.post('/post-tweet', function (req, res, next) {
  if (req.body.message) {
    twitterClient.post('statuses/update', {
      status: req.body.message
    })
      .then(function (tweet) {
        res.send(tweet)
      })
      .catch(function (error) {
        logger.error(error)
        logger.info('Tweeting via Twitter API is not possible, but the data was received from front-end, all OK')
        res.send({
          text: 'Tweet "posted"',
          status: '200'
        })
        throw new Error('Error posting tweet')
      })
  } else {
    throw new Error('Unsupported action')
  }
})

// Default endpoint
app.get('/', function (req, res, next) {
  res.send('PWA Workshop API works!')
})

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
      action: 'opentweet',
      title: 'Open tweet'
    }],
    title: 'My title',
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
}, null, false) // Set the last parameter to true to start CronJob
