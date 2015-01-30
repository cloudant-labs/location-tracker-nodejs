#!/usr/bin/env node
// Licensed under the Apache 2.0 License. See footer for details.

var express = require('express'),
    http = require('http'),
    path = require('path'),
    cloudant = require('cloudant'),
    program = require('commander'),
    dotenv = require('dotenv'),
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
  .option('-p, --port <port>', 'port on which to listen (defaults to 3000)', parseInt);

var createServer = true;
program
  .command('db <method>')
  .description('create (put) or delete the database')
  .action(function(method, options) {
    createServer = false;
    switch (method) {
      case 'put':
        app.get('cloudant-location-tracker-db').db.create('location-tracker', function(err, body) {
          if (!err) {
            console.log('Database created');
          } else {
            if (412 == err.status_code) {
              console.log('Database already exists');
            } else {
              console.error('Error creating database');
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
        break;
    }
  }).on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('    $ db put');
    console.log('    $ db delete');
    console.log();
  });

program.parse(process.argv);

if (createServer) {
  app.set('port', program.port || process.env.PORT || 3000);
  app.use(express.static(path.join(__dirname, 'public')));
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
