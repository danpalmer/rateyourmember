var flatiron = require("flatiron");
var fs = require('fs');
var images = require('./photos').all;
var app = flatiron.app;
var redis;

if (process.env.REDISTOGO_URL) {
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  redis = require("redis").createClient(rtg.port, rtg.hostname);
  redis.auth(rtg.auth.split(":")[1]);
} else {
  redis = require("redis").createClient();
}

app.use(flatiron.plugins.http, {
  // HTTP options
});

app.router.get('/', function() {
  var mp1 = Math.floor(Math.random() * images.length);
  var mp2 = Math.floor(Math.random() * images.length);

  this.res.writeHead(200, { 'Content-Type': 'text/plain' });
  this.res.end(mp1 + '\n' + mp2);
});

app.start(process.env.PORT || 3000);
