// Licensed under the Apache 2.0 License. See footer for details.

var express = require('express'),
    cookieParser = require('cookie-parser'),
    http = require('http'),
    path = require('path'),
    cloudant = require('cloudant'),
    program = require('commander'),
    dotenv = require('dotenv'),
    httpProxy = require('http-proxy'),
    url = require('url'),
    bodyParser = require('body-parser'),
    api = require('./routes/api');

dotenv.load();

var app = express();
app.use(cookieParser());

(function(app) {
  if (process.env.VCAP_SERVICES) {
    var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
    app.set('vcapServices', vcapServices);
    if (vcapServices.cloudantNoSQLDB && vcapServices.cloudantNoSQLDB.length > 0) {
      var service = vcapServices.cloudantNoSQLDB[0];
      if (service.credentials) {
        app.set('cloudant-location-tracker-db', cloudant({
          username: service.credentials.username,
          password: service.credentials.password,
          account: service.credentials.username
        }));
      }
    }
  }
})(app);

var jsonParser = bodyParser.json();
// Handle user signup
app.put('/api/_users/:id', jsonParser, api.putUser);
// Handle user login
app.post('/api/_session', jsonParser, api.postSession);
// Handle getting user session info
app.get('/api/_session', jsonParser, api.getSession);
// Proxy requests for `/api/` to the Cloudant database server
var apiProxy = httpProxy.createProxyServer();
app.all('/api/*', function(req, res) {
  if (!app.get('cloudant-location-tracker-db')) {
    return res.status(500).json({error: 'No database server configured'});
  }
  // Remove first segment of the path (`/api/`)
  var pathSegments = req.url.substr(1).split('/');
  pathSegments.shift();
  req.url = '/' + pathSegments.join('/');
  // Work around Cloudant bug by stripping out query strings from top level URLs
  if (0 == req.url.indexOf('/?')) {
    req.url = '/';
  }
  // Strip out auth from Cloudant URL
  var cloudantUrl = url.parse(app.get('cloudant-location-tracker-db').config.url);
  var cloudantUrlSansAuth = url.parse(cloudantUrl.protocol + '//' + cloudantUrl.host + cloudantUrl.path);
  // Override the Host header value to be that of the Cloudant database server
  req.headers['host'] = cloudantUrl.host;
  // TODO: Validate SSL certificate by setting and configuring `agent: https.globalAgent`
  apiProxy.web(req, res, {
    target: url.format(cloudantUrlSansAuth),
    secure: true,
    hostRewrite: true
  });
});
// Set the port number based on a command line switch, an environment variable, or a default value
app.set('port', program.port || process.env.PORT || 3000);
// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));
// Create the HTTP server
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

//-------------------------------------------------------------------------------
// Copyright IBM Corp. 2015
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//-------------------------------------------------------------------------------
