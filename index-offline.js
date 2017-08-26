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

offlineTimeline = [
  {
    id_str: 'webmaxru',
    user: {
      name: 'Maxim Salnikov',
      profile_image_url_https: '/assets/images/logo.png'
    },
    created_at: 'May 8th, 2017',
    text: 'Hello offline!'
  },
  {
    id_str: 'webmaxru',
    user: {
      name: 'Maxim Salnikov',
      profile_image_url_https: '/assets/images/logo.png'
    },
    created_at: 'May 9th, 2017',
    text: 'This is test message'
  },
  {
    id_str: 'webmaxru',
    user: {
      name: 'Maxim Salnikov',
      profile_image_url_https: '/assets/images/logo.png'
    },
    created_at: 'May 10th, 2017',
    text: 'To work in offline'
  }
]

offlineFavorites = [
  {
    id_str: 'angular',
    user: {
      name: 'Angular Team',
      profile_image_url_https: '/assets/images/logo.png'
    },
    created_at: 'May 11th, 2017',
    text: 'Nice to be offline'
  },
  {
    id_str: 'angular',
    user: {
      name: 'Angular Team',
      profile_image_url_https: '/assets/images/logo.png'
    },
    created_at: 'May 12th, 2017',
    text: 'So relaxing'
  },
  {
    id_str: 'angular',
    user: {
      name: 'Angular Team',
      profile_image_url_https: '/assets/images/logo.png'
    },
    created_at: 'May 13th, 2017',
    text: 'And productive'
  }
]


// Go to https://dev.twitter.com/rest/tools/console to get endpoints list

// Exposing the timeline endpoint
app.get('/timeline/:screenName?', function (req, res, next) {

  res.send(offlineTimeline)

})

// Exposing the favorites endpoint
app.get('/favorites/:screenName?', function (req, res, next) {
  
res.send(offlineFavorites)

})

app.get('/assets/redirect/redirectfrom.html', (req, res) => {
  res.redirect(301, '/assets/redirect/redirectto.html');
});

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

// Default endpoint
app.get('/', function (req, res, next) {
  res.send('PWA Workshop API works! Source: <a href="https://github.com/webmaxru/pwa-workshop-api">https://github.com/webmaxru/pwa-workshop-api</a>')
})

// Starting Express

server.listen(process.env.PORT || 3000, function () {
  logger.info('Listening on port ' + (process.env.PORT || 3000))
})
