var flatiron = require("flatiron");
var fs = require('fs');
var HB = require('handlebars');
var images = require('./photos').all;
var app = flatiron.app;
var _ = require('underscore');
var redis;

var ratings = {
  "1": "<strong>1/5</strong>: Not worth a peerage",
  "2": "<strong>2/5</strong>: I'd consider a mass debate",
  "3": "<strong>3/5</strong>: I'd hand them my sceptre",
  "4": "<strong>4/5</strong>: I'd fiddle their expenses",
  "5": "<strong>5/5</strong>: I'd back-bench them with my black rod"
};

if (process.env.REDISTOGO_URL) {
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  redis = require("redis").createClient(rtg.port, rtg.hostname);
  redis.auth(rtg.auth.split(":")[1]);
} else {
  redis = require("redis").createClient();
}

var nameLookup = {};
for (var i = images.length - 1; i >= 0; i--) {
  nameLookup[images[i].name] = images[i].photo;
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

var root = function(self) {
  var mp = Math.floor(Math.random() * images.length);
  self.res.writeHead(200, { 'Content-Type': 'text/html' });
  runTemplate('index', _.extend({
    b1: ratings["1"],
    b2: ratings["2"],
    b3: ratings["3"],
    b4: ratings["4"],
    b5: ratings["5"]
  }, {
    mp: images[mp].photo,
    name: images[mp].name
  }), function(res) {
    self.res.end(res);
  });
};

var get = function() {
  root(this);
};

var post = function() {
  var self = this;
  var voted = parseInt(self.req.body.vote);
  if (voted > 5 || voted < 1) { return; }
  console.log(self.req.body.mp + ' received a vote of ' + voted);
  redis.get(self.req.body.mp, function(err, res) {
    var numScores = res;
    redis.zscore('scores', self.req.body.mp, function(err, res) {
      var currentScore = res;
      var newScore = ((currentScore * numScores) + voted) / (numScores + 1);
      numScores = numScores + 1;
      redis.set(self.req.body.mp, numScores, function(err, res) {
        redis.zadd('scores', newScore, self.req.body.mp, function(err, res) {
          root(self);
        });
      });
    });
  });
};

var scores = function() {
  var self = this;
  redis.zrangebyscore('scores', '-inf', '+inf', 'WITHSCORES', function(err, res) {
    var s = [];
    for (var i = 0; i < res.length; i += 2) {
      var x = Math.round(Number(res[i+1]));
      s.push({
        "name": res[i],
        "score": x,
        "description": ratings[x.toString()],
        "imgurl": nameLookup[res[i]]
      });
    }
    s.reverse();
    self.res.writeHead(200, { 'Content-Type': 'text/html' });
    runTemplate('scores', {'scores': s}, function(res) {
      self.res.end(res);
    });
  });
};

app.router.get('/', get);
app.router.post('/', post);
app.router.get('/scores', scores);

app.start(process.env.PORT || 3000);
