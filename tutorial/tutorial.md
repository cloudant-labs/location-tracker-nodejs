# Location Tracker Part 3: Add a middle tier to manage users, with Node.js

In [Part 1](https://github.com/cloudant-labs/location-tracker-couchapp/blob/master/tutorial/tutorial.adoc) of this tutorial series we learned why location is so important to modern mobile apps and how to build the basic functionality. In [Part 2](https://github.com/cloudant-labs/location-tracker-angular/blob/master/tutorial/tutorial.adoc), we took that code and transformed it into a serious app using AngularJS. In both Parts 1 and 2, the Location Tracker application was built as a [CouchApp](http://docs.couchdb.org/en/latest/couchapp/). The cool thing about a CouchApp is that it can be hosted completely within Cloudant. This makes CouchApps great for demo applications like the Location Tracker. As an added bonus, you can quickly fork a CouchApp by replicating it into your own Cloudant account and have a fully-functioning application up-and-running in under 60 seconds. But, CouchApps have limitations.

Without a [middle tier](http://en.wikipedia.org/wiki/Multitier_architecture), building certain features is a challenge. The typical three-tier architecture includes a data tier, an application (middle, or logic) tier, and a presentation tier. CouchApps eschew the traditional application tier and just include a data tier (Cloudant or CouchDB) and a presentation tier (HTML5, CSS and JavaScript). While you can build _some_ application logic within Cloudant, there are practical limitations. That's because Cloudant is primarily intended to be used as a data layer.

[![Overview of a three-tier application including presentation tier, logic tier, and data tier](http://upload.wikimedia.org/wikipedia/commons/5/51/Overview_of_a_three-tier_application_vectorVersion.svg "Overview of a Three-Tier Application")](http://en.wikipedia.org/wiki/Multitier_architecture)

Take user access, for example. Our CouchApp can't tackle authentication tasks. To build a user-management system, you need an logic/application tier.  This tutorial shows how to build that middle tier and, because our app is now outgrowing its former home, find a new place to host our creation. Specifically, we will:

- build a Node.js application that handles user registration, login, and logout. 
- Deploy our app to [IBM Bluemix](https://console.ng.bluemix.net/), which provides a fast, easy way to host and deploy our more complex app. 
- update the map to show individual user locations and movement, instead of all users at once.

[![IBM Bluemix logo](http://upload.wikimedia.org/wikipedia/commons/c/c7/IBM_Bluemix_logo.svg "IBM Bluemix")](https://console.ng.bluemix.net/)

## Deploy to IBM Bluemix

### One-Click Deployment

The fastest way to deploy the Location Tracker app to Bluemix is to click the **Deploy to Bluemix** button. Then skip ahead to learn how [edit online or locally](#code-online-with-bluemix-and-git).

[![Deploy to Bluemix](https://bluemix.net/deploy/button_x2.png)](https://bluemix.net/deploy?repository=https://github.com/cloudant-labs/location-tracker-nodejs)

**Don't have a Bluemix account?** If you haven't already, you'll be prompted to sign up for a Bluemix account when you click the button.  Sign up, verify your email address, then return here and click the the **Deploy to Bluemix** button again. Your new credentials let you deploy to the platform and also to code online with Bluemix and Git. If you have questions about working in Bluemix, find answers in the [Bluemix Docs](https://www.ng.bluemix.net/docs/).

### Deploy Manually

#### Clone 

If you want to deploy to Bluemix manually and work on your local machine, the first step is to clone the project from GitHub:

    $ git clone https://github.com/cloudant-labs/location-tracker-nodejs.git

After cloning, you'll have a new `location-tracker-nodejs` directory. Change into this directory:

    $ cd location-tracker-nodejs

#### Configure

Next, [sign up for a Bluemix account](https://console.ng.bluemix.net/), if you haven't already. Go ahead and do that now. Then, [install the Cloud Foundry command line interface](https://www.ng.bluemix.net/docs/#starters/install_cli.html). This is the tool that you'll use to deploy to Bluemix. Follow the instructions on the Cloud Foundry command line interface installation page to:

1. Connect to Bluemix using the `cf api` command. For example:  
`cf api https://api.ng.bluemix.net`
2. Log in to Bluemix using the `cf login` command. For example:  
`cf login -u john.doe@acme.com -o john.doe@acme.com -s myspace`
3. Do _not_ deploy to Bluemix quite yet, we've got one more thing we need to do first (if you do accidentally deploy to Bluemix at this point, that's not a problem)

The next step is to create a Cloudant service within Bluemix. This only needs to be done once. You can either do this at the command line, or in the Bluemix dashboard. If you prefer to use the command line:

    $ cf create-service cloudantNoSQLDB Shared cloudant-location-tracker-db

If you instead prefer to use the [Bluemix dashboard](https://console.ng.bluemix.net/):

1. Click "Services"
2. Click "Add a Service or API"
3. Under "Data Management", click "Cloudant NoSQL DB"
4. Under "App" select "Leave unbound" (we bind the app to the service in the [`manifest.yml`](https://github.com/cloudant-labs/location-tracker-nodejs/blob/master/manifest.yml) file)
5. Enter "cloudant-location-tracker-db" in the "Service name" field
6. Click the "Create" button

#### Deploy

You're now ready to deploy your app! Deploying is as simple as:

    $ cf push

From now on, you only need to use this one command whenever you want to deploy changes to your application. In the [Bluemix dashboard](https://console.ng.bluemix.net/), find the "cloudant-location-tracker" app. Look for "Routes" and find the route assigned to your app. Note that the route does not use SSL by default. I recommend changing the `http` to `https` in the route URL, as the Location Tracker app collects user credentials. Go ahead and visit this URL to see your newly deployed app! Keep reading to learn more about how applications are deployed to Bluemix, or skip to the [Run Locally](#run-locally) section to learn how to run the Location Tracker application in your local development environment.

**Note:** You may notice that Bluemix assigns a route URL to your app containing a random word. This is defined in the [`manifest.yml`](https://github.com/cloudant-labs/location-tracker-nodejs/blob/master/manifest.yml) file. The `host` key in this file contains the value `cloudant-location-tracker-${random-word}`. The random word is there to ensure that multiple people deploying the Location Tracker application to Bluemix do not run into naming collisions. However, this will cause a new route to be created for your application each time you deploy to Bluemix. To prevent this from happening, replace `${random-word}` with a hard coded (but unique) value.

#### Application Manifest

In the root of the Location Tracker application, you will find a file named `manifest.yml`. This _application manifest_ tells Bluemix how to deploy the Location Tracker application.

```yaml
---
declared-services:
  cloudant-location-tracker-db:
    label: cloudantNoSQLDB
    plan: Shared
applications:
- name: cloudant-location-tracker
  memory: 128M
  host: cloudant-location-tracker-${random-word}
  services:
  - cloudant-location-tracker-db
```

In the `declared-services` section, we define a Cloudant service (`cloudantNoSQLDB`) with a service name of `cloudant-location-tracker-db`. We declare that this is a `Shared` plan, meaning it is a multi-tenant Cloudant account. Our application manifest includes one application named `cloudant-location-tracker` that uses 128M of memory. We instruct Bluemix to use a host name of `cloudant-location-tracker-${random-word}`. This will give us a host name of `cloudant-location-tracker-` followed by a random word generated by Bluemix (see the note above about this). This host name will be a subdomain of `mybluemix.net` (e.g. `cloudant-location-tracker-foo.mybluemix.net`). The last two lines bind our Cloudant service to our application.

#### Buildpack

Every Bluemix application needs a _buildpack_, which will be used to build and run your application. In most cases, Bluemix will automatically detect the appropriate buildpack for your application. In the case of the Location Tracker application, Bluemix will use the Node.js buildpack. The Node.js buildpack will:

1. Build the application by installing the npm dependencies declared in `package.json`
2. Execute any scripts declared in `package.json`
3. Provide a Node.js runtime environment to start your application within

#### Deploy Scripts

The Location Tracker application declares two admin processes to be run when deploying to Bluemix:

* `./admin.js db put`
* `./admin.js api set_permissions`

These are declared as `install` scripts within the `package.json` file (truncated for brevity):

```json
{
  "name": "cloudant-location-tracker",
  "version": "0.0.0",
  "description": "A demo web application which records a device's location and saves this information to IBM Cloudant",
  "main": "app.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "install": "./admin.js track && ./admin.js db put && ./admin.js api set_permissions",
    "start": "node app.js"
  },
  …
}
```

The `./admin.js db put` command creates `location-tracker` and `user` databases within the Cloudant service (if the databases don't already exist) and creates two Cloudant Query indexes that are used by the application. The `./admin.js api set_permissions` command makes the `location-tracker` database world readable.

#### Procfile

A `Procfile` contains the names of one or more process to be run within Bluemix along with the commands used to run these processes. In Bluemix, every web application should include a process named `web`. Since the Location Tracker is a Node.js application, we start the application with the `node app.js` command (`app.js` being the main script for our application).

```
web: node app.js
```

#### Configuration

Applications within Bluemix are configured via environment variables. The configuration settings for services provisioned by Bluemix are automatically added to a `VCAP_SERVICES` environment variable, which holds a string representation of a JSON object. This value can be accessed within a Node.js app through the `process.env.VCAP_SERVICES` property. If you'd like, you can preview the values for individual services through the Bluemix dashboard by clicking "Show Credentials" on a service instance. For example, here is what the configuration might look like for a Cloudant service:

```json
{
  "cloudantNoSQLDB": [
    {
      "name": "cloudant-location-tracker-db",
      "label": "cloudantNoSQLDB",
      "plan": "Shared",
      "credentials": {
        "username": "your-username",
        "password": "your-password",
        "host": "your-host",
        "port": 443,
        "url": "https://your-username:your-password@your-host"
      }
    }
  ]
}
```

## Code Online with Bluemix and Git 

If you don't want to download and work locally, you can edit this app directly through your browser. Bluemix features its own development environment--a web-based version of Git that lets you edit code, commit and push changes, then deploy. This is a fast way to play with code, see changes in action, and share your project.  In Bluemix, open your app and click the **Edit Code** button. (If you don't see this button, click the **Add Git** button to create the Git repository.)

## Run Locally

If you prefer to work locally, here's how to configure, install, and run:

### Configure

Configuration of your local development environment is done through a `.env` file. One environment variable, `VCAP_SERVICES`, is needed in order to configure your local development environment. The value of the `VCAP_SERVICES` is a string representation of a JSON object. Here is an example `.env` file:

    VCAP_SERVICES={"cloudantNoSQLDB": [{"name": "cloudant-location-tracker-db","label": "cloudantNoSQLDB","plan": "Shared","credentials": {"username": "your-username","password": "your-password","host": "your-host","port": 443,"url": "https://your-username:your-password@your-host"}}]}

You have two options for configuring the database to be used by your local development environment:

1. Install the [CouchDB 2.0 Developer Preview](https://couchdb.apache.org/developer-preview/2.0/) on your local development machine and configure the `VCAP_SERVICES` environment variable accordingly.
2. Simply point your local installation to your Cloudant database on Bluemix. This isn't ideal, as both your development and production environments will be using the same database.

If you want to try the second option: 

1. Click "Show Credentials" on your "Cloudant NoSQL DB" service within the Bluemix dashboard
2. Copy the JSON object displayed
3. Paste the JSON object into your `.env` file as the value for the `VCAP_SERVICES` environment variable, removing all of the line breaks

### Install

[Download and install Node.js](https://nodejs.org/download/), if you haven't already. The Location Tracker application uses [npm (node package manager)](https://www.npmjs.com/) to manage the application's various dependencies on external packages. You can see all of the application's dependencies in the [`package.json`](https://github.com/cloudant-labs/location-tracker-nodejs/blob/master/package.json) file (truncated for readability):

```json
{
  "dependencies": {
    "body-parser": "^1.11.0",
    "cloudant": "^1.0.0-beta3",
    "commander": "^2.6.0",
    "dotenv": "^0.5.1",
    "express": "^4.11.1",
    "http-proxy": "^1.8.1"
  }
}
```

Install the application's dependencies using npm:

    $ npm install

In addition to installing the application's dependencies, this command also runs scripts that create and configure databases needed by the application.

### Running

Install [Foreman](https://github.com/ddollar/foreman) and then start the application with the following command:

    $ foreman start

You should now be able to access the application at [`http://localhost:5000`](http://localhost:5000). You now have an instance of the Location Tracker application running in your local development environment.

## Managing User Access

Now let's take a look at the key reason we converted the Location Tracker from a CouchApp into a three-tier application. Without the Node.js middle tier, there would be no practical way to manage user access. In this section, we'll explore how the Location Tracker application handles user registration, login, and logout.

### PouchDB Authentication

The frontend of the Location Tracker application uses the [PouchDB Authentication](https://github.com/nolanlawson/pouchdb-authentication) plugin. This library integrates with the CouchDB signup, login, session and logout (among other) APIs. While it is possible to configure Cloudant to use the CouchDB security model, Cloudant uses its own security model by default. There are several benefits and features of the Cloudant security model, so the Location Tracker uses the default Cloudant security model rather than the CouchDB security model. This means that the Location Tracker needs to map the CouchDB-style API calls from PouchDB Authentication to the Cloudant API. This mapping is done in `routes/api.js` where you will find the `putUser`, `postSession` and `getSession` functions. There is no function for mapping logouts, as the API for this is the same in both Cloudant and CouchDB.

### User Registration

In `app.js` you will find the following route for handling user signups:

```javascript
// Handle user signup
app.put('/api/_users/:id', jsonParser, api.putUser);
```

The `api.putUser` function:

1. Generates a Cloudant API key and API password
2. Gives the generated API key user read and write access to the `location-tracker` database
3. AES encrypts the API key password using the user's chosen password as the encryption key
4. Saves the user's metadata as a document in the `users` database

Note that the user's password is never saved to the database. The password is used to encrypt the API key password (which is stored in its encrypted form) and then discarded.

### User Login

In `app.js` you will find the following route for handling user logins:

```javascript
// Handle user login
app.post('/api/_session', jsonParser, api.postSession);
```

The `api.postSession` function:

1. Gets the user's document from the `user` database
2. Decrypts the API password using the password supplied by the user
3. Authenticates with Cloudant using the API key and decrypted API password
4. Passes along the authentication cookie from Cloudant (assuming authentication was successful)

### User Session

In `app.js` you will find the following route for handling getting user session info:

```javascript
// Handle getting user session info
app.get('/api/_session', jsonParser, api.getSession);
```

The `api.getSession` function calls the corresponding `session` function from the Cloudant Node.js client library, passing along the cookie from the client, and returning the response from Cloudant.

### User Logout and Cloudant Service Proxy

All other requests to `/api/*`, including handling user logout, are proxied to the Cloudant service in `app.js`:

```javascript
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
```

## Querying Locations By User

One of the other improvements we made to the Location Tracker application was to display a map of individual user locations. This is done using [Cloudant Query](https://cloudant.com/blog/introducing-cloudant-query/) and [PouchDB Find](http://nolanlawson.github.io/pouchdb-find/). The technology behind Cloudant Query is a MongoDB-inspired query language interface for Apache CouchDB called [Mango](https://github.com/cloudant/mango), one of several significant contributions from IBM Cloudant that you will find in [Apache CouchDB 2.0](https://couchdb.apache.org/developer-preview/2.0/).

The first step in using Cloudant Query is to define an index. Fortunately, Cloudant Query makes creating an index much simpler than [defining a view with map and reduce functions](https://docs.cloudant.com/api.html#creating-views). In the Location Tracker application, we create an index on the `properties.username` and `properties.timestamp` fields of the `location-tracker` database in the `admin.js` script (which is run on automatically on deployment and installation) using the [Cloudant Node.js client library](https://github.com/cloudant/nodejs-cloudant).

```javascript
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
cloudantService.use('location-tracker').index(userLocationIndex, function(err, result) {
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
```

Once an index exists, you can perform queries against this index. This query is done by the frontend `public/script/app.js` script using PouchDB Find. When a specific user is selected, we query for documents with the `properties.username` field being equal to (`$eq`) the selected username. Results are collated by the `timestamp` field, as this was the second field in the index. The map is then updated with the results.

```javascript
db.find({
  selector: {'properties.username': {'$eq': username}},
}).then(function (result) {
  movementLayer = instantiateLeafletMap();
  result.docs.map(function(doc) {
    updateMovingLayer(doc, movementLayer);
  });
  $('.click-blocker').hide();
  $('#multi-user-popup').hide();
});
```

## Next Steps

This tutorial showed you how to deploy the Location Tracker application to Bluemix, demonstrated how to edit it online or run the application in your local development environment, and explained how it manages user access. If you find any bugs in the Location Tracker app, or see room for improvement in the application or this accompanying tutorial, please [submit a new issue on GitHub](https://github.com/cloudant-labs/location-tracker-nodejs/issues/new). If you'd like to learn more about Cloudant, please read the [For Developers](https://cloudant.com/for-developers/) section of the Cloudant website.
