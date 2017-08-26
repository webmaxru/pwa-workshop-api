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

var offlineTimeline = require('./offline-data/timeline.json')

// Setting Web Push credentials
var webPush = require('web-push')
webPush.setVapidDetails(
  'mailto:salnikov@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)
var pushSubscriptions = []

// Connecting to Twitter
// Get your credentials here: https://apps.twitter.com/app/new
var Twitter = require('twitter')
var twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

// Subscribe to Web Push
app.post('/webpush', function (req, res, next) {
  logger.info('Web push subscription object received: ', req.body.subscription)

  if (req.body.action === 'subscribe') {
    if (arrayObjectIndexOf(pushSubscriptions, req.body.subscription.endpoint, 'endpoint') == -1) {
      pushSubscriptions.push(req.body.subscription)
      logger.info('Subscription registered: ' + req.body.subscription.endpoint)
    } else {
      logger.info('Subscription was already registered: ' + req.body.subscription.endpoint)
    }

    res.send({
      text: 'Web push subscribed',
      status: '200'
    })
  } else if (req.body.action === 'unsubscribe') {
    var subscriptionIndex = arrayObjectIndexOf(pushSubscriptions, req.body.subscription.endpoint, 'endpoint')

    if (subscriptionIndex >= 0) {
      pushSubscriptions.splice(subscriptionIndex, 1)

      logger.info('Subscription unregistered: ' + req.body.subscription.endpoint)
    } else {
      logger.info('Subscription was not found: ' + req.body.subscription.endpoint)
    }

    res.send({
      text: 'Web push unsubscribed',
      status: '200'
    })
  } else {
    throw new Error('Unsupported action')
  }

  logger.info('Number of active subscriptions: ' + pushSubscriptions.length)
})

// Listening to tweets stream and sending notifocation
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
        badge: tweet.user.profile_image_url_https,
        lang: tweet.lang,
        renotify: true,
        requireInteraction: true,
        tag: tweet.id,
        vibrate: [300, 100, 400],
        data: 'https://twitter.com/statuses/' + tweet.id_str
      }

      if (tweet.entities && tweet.entities.media) {
        notificationData.notification.image = tweet.entities.media[0].media_url_https
      }

      logger.debug(notificationData)
      logger.debug(tweet)
      logger.info('Tweet stream received')

      pushSubscriptions.forEach(function (item) {
        sendNotification(item, JSON.stringify(notificationData))
      })
    }
  })
})

function sendNotification (pushSubscription, payload) {
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

// Go to https://dev.twitter.com/rest/tools/console to get endpoints list

// Exposing the timeline endpoint
app.get('/search/:query', function (req, res, next) {
  twitterClient.get('search/tweets', {
    q: req.params.query,
    count: 5
  })
    .then(function (tweets) {
      res.send(tweets)
    })
    .catch(function (error) {
      logger.error(error)
      throw new Error('Error receiving tweets')
    })
})

// Exposing the timeline endpoint
app.get('/timeline/offline', function (req, res, next) {
  res.send(offlineTimeline)
})

// Exposing the timeline endpoint
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

// Exposing the favorites endpoint
app.get('/favorites/:screenName?', function (req, res, next) {
  twitterClient.get('favorites/list', {
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

// Placeholder to test Background Sync
app.post('/post-tweet', function (req, res, next) {
  if (req.body.message) {
    logger.info('The data was received from front-end', req.body.message)
    res.send({
      text: req.body.message,
      status: '200'
    })
  } else {
    throw new Error('Message text is required')
  }
})

// Posting the tweet
app.post('/real-post-tweet', function (req, res, next) {
  if (req.body.message) {
    logger.info('The data was received from front-end', req.body.message)
    twitterClient.post('statuses/update', {
      status: req.body.message
    })
      .then(function (tweet) {
        res.send(tweet)
      })
      .catch(function (error) {
        logger.error(error)
        throw new Error('Error posting tweet')
      })
  } else {
    throw new Error('Message text is required')
  }
})

app.get('/assets/redirect/redirectfrom.html', (req, res) => {
  res.redirect(301, '/assets/redirect/redirectto.html');
});

// Default endpoint
app.get('/', function (req, res, next) {
  res.send('PWA Workshop API works! Source: <a href="https://github.com/webmaxru/pwa-workshop-api">https://github.com/webmaxru/pwa-workshop-api</a>')
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
      title: 'Open root URL'
    }],
    title: 'Notification title',
    body: 'This is Cron-basednotification for PWA-workshop',
    dir: 'auto',
    icon: '/assets/images/logo.png',
    lang: 'en',
    renotify: true,
    requireInteraction: true,
    tag: 'Some ID',
    vibrate: [300, 100, 400],
    data: '/'
  }

  sendNotification(JSON.stringify(notificationData))
  logger.info(notificationData)
}, null, false) // Set the last parameter to true to start CronJob

// Utility function to search the item in the array of objects
function arrayObjectIndexOf (myArray, searchTerm, property) {
  for (var i = 0, len = myArray.length; i < len; i++) {
    if (myArray[i][property] === searchTerm) return i
  }
  return -1
}
