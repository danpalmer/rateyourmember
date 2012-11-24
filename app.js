var flatiron = require("flatiron");
var fs = require('fs');
var HB = require('handlebars');
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

var templates = {};
function runTemplate(name, data, cb) {

  function run(template) {
    cb(template(data));
  }

  if (templates[name]) {
    run(templates[name]);
  } else {
    var str = fs.readFileSync('templates/' + name + '.html');
    var template = HB.compile(str.toString());
    templates[name] = template;
    run(template);
  }
}

app.use(flatiron.plugins.http);

app.router.get('/', function() {
  var self = this;
  var mp = Math.floor(Math.random() * images.length);

  self.res.writeHead(200, { 'Content-Type': 'text/html' });
  runTemplate('index', {
    mp: images[mp].photo,
    name: images[mp].name
  }, function(res) {
    self.res.end(res);
  });
});

app.start(process.env.PORT || 3000);
