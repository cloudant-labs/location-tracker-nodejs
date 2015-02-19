#!/usr/bin/env node
// Licensed under the Apache 2.0 License. See footer for details.

var express = require('express'),
    http = require('http'),
    path = require('path'),
    cloudant = require('cloudant'),
    program = require('commander'),
    dotenv = require('dotenv'),
    httpProxy = require('http-proxy'),
    url = require('url'),
    bodyParser = require('body-parser'),
    api = require('./routes/api'),
    pkg = require(path.join(__dirname, 'package.json'));

dotenv.load();

var app = express();

(function(app) {
  if (process.env.VCAP_SERVICES) {
    var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
    if (vcapServices.cloudantNoSQLDB) {
      vcapServices.cloudantNoSQLDB.map(function(service) {
        if (service.name && service.credentials) {
          app.set(service.name, cloudant({
            username: service.credentials.username,
            password: service.credentials.password,
            account: service.credentials.username
          }));
        }
      });
    }
  }
})(app);

program
  .version(pkg.version)
  .option('-p, --port <port>', 'Port on which to listen (defaults to 3000)', parseInt);

var createServer = true;
program
  .command('db <method>')
  .description('Create (put) or delete the database')
  .action(function(method, options) {
    createServer = false;
    switch (method) {
      case 'put':
        var cloudant = app.get('cloudant-location-tracker-db');
        cloudant.db.create('location-tracker', function(err, body) {
          if (!err) {
            console.log('Location tracker database created');
            // TODO: Make this happen even if location tracker database already exists
            cloudant.set_permissions({database:'location-tracker', username:'nobody', roles:['_reader']}, function(err, result) {
              if (!err) {
                console.log('Location tracker database is now world readable');
              } else {
                console.error('Error setting permissions on location tracker database');
              }
            });
          } else {
            if (412 == err.status_code) {
              console.log('Location tracker database already exists');
            } else {
              console.error('Error creating location tracker database');
            }
          }
        });
        app.get('cloudant-location-tracker-db').db.create('users', function(err, body) {
          if (!err) {
            console.log('Users database created');
          } else {
            if (412 == err.status_code) {
              console.log('Users database already exists');
            } else {
              console.error('Error creating users database');
            }
          }
        });
        break;
      case 'delete':
        app.get('cloudant-location-tracker-db').db.destroy('location-tracker', function(err, body) {
          if (!err) {
            console.log('Database deleted');
          } else {
            if (404 == err.status_code) {
              console.log('Database does not exist');
            } else {
              console.error('Error deleting database');
            }
          }
        });
        app.get('cloudant-location-tracker-db').db.destroy('users', function(err, body) {
          if (!err) {
            console.log('Users database deleted');
          } else {
            if (404 == err.status_code) {
              console.log('Users database does not exist');
            } else {
              console.error('Error deleting users database');
            }
          }
        });
        break;
    }
  }).on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('    $ db put');
    console.log('    $ db delete');
    console.log();
  });

program
  .command('api <endpoint>')
  .description('Call an API endpoint with preconfigured settings')
  .action(function(endpoint, options) {
    createServer = false;
    switch (endpoint) {
      case 'set_permissions':
        app.get('cloudant-location-tracker-db').set_permissions({
          database: 'location-tracker',
          username: 'nobody',
          roles: ['_reader']
        }, function(err, result) {
          if (!err) {
            console.log('Permissions set');
          } else {
            console.error('Error setting permission');
          }
        });
        break;
    }
  }).on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('    $ api set_permissions');
    console.log();
  });

program.parse(process.argv);

if (createServer) {
  var jsonParser = bodyParser.json();
  // Handle user signup
  app.put('/api/_users/:id', jsonParser, api.putUser);
  // Handle user login
  app.post('/api/_session', jsonParser, api.postSession);
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
}

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
