// Licensed under the Apache 2.0 License. See footer for details.

module.exports.postUser = function(req, res) {
  var app = req.app;
  var cloudant = app.get('cloudant-location-tracker-db');
  if (!cloudant) {
    return res.status(500).json({ error: 'No database server configured' })
  }
  if (!req.body) {
    return res.sendStatus(400);
  }
  cloudant.generate_api_key(function(err, api) {
    if (!err) {
      cloudant.set_permissions({database:'location-tracker', username:api.key, roles:['_reader', '_writer']}, function(err, result) {
        if (!err) {
          res.json({
            ok: true,
            name: api.key,
            password: api.password
          });
        } else {
          console.error(err);
          res.status(500).json({error: 'Internal Server Error'});
        }
      });
     } else {
        console.error(err);
        res.status(500).json({error: 'Internal Server Error'});
     }
  });
};

module.exports.postSession = function(req, res) {
  var app = req.app;
  var cloudant = app.get('cloudant-location-tracker-db');
  if (!cloudant) {
    return res.status(500).json({ error: 'No database server configured' })
  }
  if (!req.body) {
    return res.sendStatus(400);
  }
  cloudant.auth(req.body.name, req.body.password, function(err, body, headers) {
    if (!err) {
      res.setHeader("Set-Cookie", headers['set-cookie']);
      res.json({
        ok: true,
        name: req.body.name,
        roles: body.roles
      });
    } else {
      console.error(err);
      res.status(500).json({error: 'Internal Server Error'});
    }
  });
};

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
