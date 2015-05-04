#!/usr/bin/env node
// Licensed under the Apache 2.0 License. See footer for details.

var express = require('express'),
    http = require('http'),
    path = require('path'),
    cloudant = require('cloudant'),
    program = require('commander'),
    dotenv = require('dotenv'),
    pkg = require(path.join(__dirname, 'package.json'));

http.post = require('http-post');

dotenv.load();

var app = express();

(function(app) {
  if (process.env.VCAP_SERVICES) {
    var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
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
  if (process.env.VCAP_APPLICATION) {
    var vcapApplication = JSON.parse(process.env.VCAP_APPLICATION);
    app.set('vcapApplication', vcapApplication);
  }
})(app);

program
  .version(pkg.version)
  .option('-p, --port <port>', 'Port on which to listen (defaults to 3000)', parseInt);

program
  .command('db <method>')
  .description('Create (put) or delete the database')
  .action(function(method, options) {
    var cloudant = app.get('cloudant-location-tracker-db');
    if (!cloudant) {
      console.error('No database configured');
      return;
    }
    switch (method) {
      case 'put':
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
            var userLocationIndex = {
              name: 'user-location',
              type: 'json',
              index: {
                fields: [
                  'properties.username',
                  'properties.timestamp'
                ]
              }
            };
            // TODO: Make this happen even if location tracker database already exists
            cloudant.use('location-tracker').index(userLocationIndex, function(err, result) {
              if (!err) {
                console.log('User location index created');
              } else {
                if (412 == err.status_code) {
                  console.log('User location index already exists');
                } else {
                  console.error('Error creating user location index');
                }
              }
            });
            var userApiKeyIndex = {
              name: 'user-api_key',
              type: 'json',
              index: {
                fields: ['api_key']
              }
            };
            // TODO: Make this happen even if location tracker database already exists
            cloudant.use('users').index(userApiKeyIndex, function(err, result) {
              if (!err) {
                console.log('User key index created');
              } else {
                if (412 == err.status_code) {
                  console.log('User key index already exists');
                } else {
                  console.error('Error creating user key index');
                }
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
        cloudant.db.create('users', function(err, body) {
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
        cloudant.db.destroy('location-tracker', function(err, body) {
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
        cloudant.db.destroy('users', function(err, body) {
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
    var cloudant = app.get('cloudant-location-tracker-db');
    if (!cloudant) {
      console.error('No database configured');
      return;
    }
    switch (endpoint) {
      case 'set_permissions':
        cloudant.set_permissions({
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

program
  .command('track')
  .description('Track application deployments')
  .action(function(options) {
    var vcapApplication = app.get('vcapApplication');
    if (vcapApplication) {
      var event = {};
      if (vcapApplication.application_name) {
        event.application_name = vcapApplication.application_name;
      }
      if (vcapApplication.space_id) {
        event.space_id = vcapApplication.space_id;
      }
      if (vcapApplication.application_version) {
        event.application_version = vcapApplication.application_version;
      }
      if (vcapApplication.application_uris) {
        event.application_uris = vcapApplication.application_uris;
      }
      // TODO: Make this work over HTTPS
      http.post('http://deployment-tracker.mybluemix.net/', event);
    }
  }).on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('    $ track');
    console.log();
  });

program.parse(process.argv);

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
