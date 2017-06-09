// Reading process.env variables from .env file
require('dotenv').config();

// Scaffolding Express app
var express = require('express');
var app = express();
var server = require('http').createServer(app);

var bodyParser = require('body-parser');
app.use(express.static(__dirname));
app.use(bodyParser.json());

// Enabling CORS
var cors = require('cors');
app.use(cors());
app.options('*', cors());

// Setting up detailed logging
var winston = require('winston');
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
    logger.info(message);
  }
}

app.use(require('morgan')('combined', {
  'stream': logger.stream
}));

// Setting Web Push credentials
var webPush = require('web-push')
webPush.setVapidDetails(
  'mailto:dave@webdave.de',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

var pushSubscriptions = [];
var activeUsers = ['Foo','Bar','Baz'];

// get Users (list)
app.get('/users', function (req, res, next) {
      res.send({
      text: {
        msg: 'active users',
        user: activeUsers
      },
      status: '200'
    });
})

// Subscribe to Web Push
app.post('/webpush', function (req, res, next) {
  logger.info('Web push subscription object received: ', req.body.subscription)

  var notificationData = {}
  notificationData.notification = {
    title: '',
    body: '',
    dir: 'auto',
    icon: '',
    badge: '',
    lang: 'en',
    renotify: true,
    requireInteraction: true,
    tag: '',
    vibrate: [300, 100, 400],
    data: ''
  };

  if (req.body.action === 'subscribe') {
    if (arrayObjectIndexOf(pushSubscriptions, req.body.subscription.endpoint, 'endpoint') == -1) {
      pushSubscriptions.push(req.body.subscription);
      activeUsers.push(req.body.user);
      var subscriptionIndex = arrayObjectIndexOf(pushSubscriptions, req.body.subscription.endpoint, 'endpoint')
      logger.info('Subscription registered: ' + req.body.subscription.endpoint + ' at ' + subscriptionIndex)
    } else {
      logger.info('Subscription was already registered: ' + req.body.subscription.endpoint)
    }

    notificationData.notification.title = activeUsers[subscriptionIndex];
    notificationData.notification.body = activeUsers[subscriptionIndex] + ' subscribed Web push';

    res.send({
      text: {
        msg: 'Web push subscribed',
        user: activeUsers[subscriptionIndex]
      },
      status: '200'
    });
  } else if (req.body.action === 'unsubscribe') {
    var subscriptionIndex = arrayObjectIndexOf(pushSubscriptions, req.body.subscription.endpoint, 'endpoint')

    if (subscriptionIndex >= 0) {
      pushSubscriptions.splice(subscriptionIndex, 1);
      activeUsers.splice(subscriptionIndex, 1);

      logger.info('Subscription unregistered: ' + req.body.subscription.endpoint)
    } else {
      logger.info('Subscription was not found: ' + req.body.subscription.endpoint)
    }

    notificationData.notification.title = activeUsers[subscriptionIndex];
    notificationData.notification.body = activeUsers[subscriptionIndex] + ' unsubscribed Web push';

    res.send({
      text: 'Web push unsubscribed',
      status: '200'
    })
  } else {
    throw new Error('Unsupported action')
  }

  logger.info('Number of active subscriptions: ' + pushSubscriptions.length);

  pushSubscriptions.forEach(function (item) {
    sendNotification(item, JSON.stringify(notificationData));
  });
})

/**
 * @payload: 
 * {
 *    users: string[];
 *    msg: {
 *      msg: {
 *        title: string;
 *        message: string;
 *      }
 *      icon?: url | base64;
 *      badge?: url | base64;
 *      tag?: string;
 *      data?: url;
 *    }
 * }
 * 
 */
app.post('/msg', function (req, res, next) {
  logger.info('Web req: ', req.body);
  logger.info('Number of active subscriptions: ' + pushSubscriptions.length);
  var recivers = req.body.users; // []
  var msg = req.body.msg;
  var icon = msg.icon || 'https://www.webdave.de/wp-content/uploads/2016/04/wer.jpg';
  var badge = msg.badge || 'https://www.webdave.de/wp-content/uploads/2016/04/wer.jpg';
  var tag = msg.tag || 'webdave_de';
  var data = msg.data || 'https://www.webdave.de';
  var notificationData = {};
  notificationData.notification = {
    title: msg.title,
    body: msg.message,
    dir: 'auto',
    icon: icon,
    badge: badge,
    lang: 'en',
    renotify: true,
    requireInteraction: true,
    tag: tag,
    vibrate: [300, 100, 400],
    data: data
  };

  if(req.users === ['all']){
    recivers = activeUsers;
  }
    recivers.map(function (reciver) {
      var item = pushSubscriptions[activeUsers.indexOf(reciver)];
      sendNotification(item, JSON.stringify(notificationData));
    });
  res.send({
    text: 'Web push send to ' + recivers.length + ' subscribers!',
    status: '200'
  });
});

function sendNotification(pushSubscription, payload) {
  if (pushSubscription) {
    webPush.sendNotification(pushSubscription, payload)
      .then(function (response) {
        logger.info('Push sent')
        logger.debug(payload)
        logger.debug(response)
      })
      .catch(function (error) {
        logger.error('Push error: ', error);
      });
  }
}


// Default endpoint
app.get('/', function (req, res, next) {
  res.send('PWA msg api')
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
function arrayObjectIndexOf(myArray, searchTerm, property) {
  for (var i = 0, len = myArray.length; i < len; i++) {
    if (myArray[i][property] === searchTerm) return i
  }
  return -1
}
