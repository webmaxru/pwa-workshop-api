require('dotenv').config()

var express = require('express')
var app = express()
var server = require('http').createServer(app)

var base64 = require('base-64')

var CronJob = require('cron').CronJob

var cors = require('cors')
app.use(cors())
app.options('*', cors())

var bodyParser = require('body-parser')
app.use(express.static(__dirname))
app.use(bodyParser.json())

const webPush = require('web-push')
var pushSubscription

var Twitter = require('twitter')

var twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

/**
 * Grab a list of favorited tweets
 **/
twitterClient.get('favorites/list', function (error, tweets, response) {
  if (!error) {
    // console.log(tweets)
  }
})

twitterClient.stream('statuses/filter', {track: 'angular'}, function (stream) {
  stream.on('data', function (tweet) {
    console.log(JSON.stringify(tweet, null, 2))
  })
})

webPush.setVapidDetails(
  'mailto:salnikov@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

app.post('/subscription', function (req, res, next) {
  if (req.body.action === 'subscribe') {
    pushSubscription = req.body.subscription

    console.log('Subscription registered: ')
    console.log(JSON.stringify(pushSubscription, null, 2))
  } else {
    throw new Error('Unsupported action')
  }

  res.send({
    text: 'Subscribed',
    status: '200'
  })
})

function sendNotification (payload) {
  if (pushSubscription) {
    webPush.sendNotification(pushSubscription, payload)
      .then(function (response) {
        console.log('Push sent')
      // console.log(JSON.stringify(response, null, 2))
      })
      .catch(function (err) {
        console.error('Push error: ' + err)
      })
  }
}

function sendToBrowser (messageContent) {
  sendNotification(JSON.stringify(messageContent))
}

// Starting server

server.listen(process.env.PORT || 3001, function () {
  console.log('Listening on port ' + (process.env.PORT || 3001))
})

// Starting push

new CronJob('*/5 * * * * *', function () {
  // console.log('You will see this message every second')
}, null, true)
