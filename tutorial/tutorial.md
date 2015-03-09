# Location Tracker Part 3: Add a middle tier to manage users, with Node.js

In [Part 1](https://github.com/cloudant-labs/location-tracker-couchapp/blob/master/tutorial/tutorial.adoc) of this tutorial series we learned why location is so important to modern mobile apps and how to build the basic functionality. In [Part 2](https://github.com/cloudant-labs/location-tracker-angular/blob/master/tutorial/tutorial.adoc), we took that code and transformed it into a serious app using AngularJS. In both Parts 1 and 2, the Location Tracker application was built as a [CouchApp](http://docs.couchdb.org/en/latest/couchapp/). The cool thing about a CouchApp is that it can be hosted completely within Cloudant. This makes CouchApps great for demo applications like the Location Tracker. As an added bonus, you can quickly fork a CouchApp by replicating it into your own Cloudant account and have a fully-functioning application up-and-running in under 60 seconds. However, there are limitations to CouchApps.

Without a [middle tier](http://en.wikipedia.org/wiki/Multitier_architecture), building certain functionality becomes a challenge. The typical three-tier architecture includes a data tier, an application (or logic) tier, and a presentation tier. CouchApps eschew the traditional application tier and just include a data tier (Cloudant or CouchDB) and a presentation tier (HTML5, CSS and JavaScript). While possible to build _some_ application logic within Cloudant, there are practical limitations. This is because Cloudant is primarily intended to be used as a data layer.

[![Overview of a three-tier application including presentation tier, logic tier, and data tier](http://upload.wikimedia.org/wikipedia/commons/5/51/Overview_of_a_three-tier_application_vectorVersion.svg "Overview of a Three-Tier Application")](http://en.wikipedia.org/wiki/Multitier_architecture)

Let's take managing user access, for example. How would you go about building a user management system without an application tier? If you can figure out how to do this, I'd love to know! In Part 3 of this tutorial we build a Node.js application that handles user registration, login and logout. Additionally, we make the Location Tracker application deployable to [IBM Bluemix](https://console.ng.bluemix.net/) and update the map to display individual user locations, rather than one big map of all user locations.

[![IBM Bluemix logo](http://upload.wikimedia.org/wikipedia/commons/c/c7/IBM_Bluemix_logo.svg "IBM Bluemix")](https://console.ng.bluemix.net/)

## Quick Start

If you're interested in learning all the steps needed to build this application, and want to explore all of the intricacies, then skip this section. This Quick Start section is for those who want to just get the code up-and-running as quickly as possible. Most of the instructions you'll need for this are in the [README that accompanies the application source code](https://github.com/cloudant-labs/location-tracker-nodejs). However, this Quick Start explains things in a bit more detail.

### Installing

The first step is to clone the project from GitHub:

    $ git clone https://github.com/cloudant-labs/location-tracker-nodejs.git

After cloning, you will have a new `location-tracker-nodejs` directory. Change into this directory:

    $ cd location-tracker-nodejs

**Note:** If you don't care about running the Location Tracker application locally on your development machine, you can skip to the [Deploying to IBM Bluemix](#deploying-to-ibm-bluemix) section. Otherwise, keep reading.

Next you'll need to [download and install Node.js](https://nodejs.org/download/), if you haven't already. The Location Tracker application uses [npm (node package manager)](https://www.npmjs.com/) to manage the application's various dependencies on external packages. You can see all of the application's dependencies in the [`package.json`](https://github.com/cloudant-labs/location-tracker-nodejs/blob/master/package.json) file (truncated for readability):

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

Note that the installation will not be complete, as we don't have a database configured yet. We'll come back to this.

### Running

To run the project locally you will first need to install [Foreman](https://github.com/ddollar/foreman). Then, you can start up the application with the following command:

    $ foreman start

You should now be able to access the application at [`http://localhost:5000`](http://localhost:5000). Note that parts of the application will fail as there is no database configured yet. Again, we'll come back to this.

### Deploying to IBM Bluemix

Let's jump to deploying to Bluemix, and then come back to getting the application running locally. The first step is to [sign up for a Bluemix account](https://console.ng.bluemix.net/), if you haven't already. Go ahead and do that now. I'll wait.

Next, [install the Cloud Foundry command line interface](https://www.ng.bluemix.net/docs/#starters/install_cli.html). This is the tool that you'll use to deploy to Bluemix. Follow the instructions on the Cloud Foundry command line interface installation page to connect to Bluemix and then to log in to Bluemix. Don't deploy to Bluemix quite yet, we've got one more thing we need to do first (if you do accidentally deploy to Bluemix at this point, that's not a problem).

The next step is to create a Cloudant service within Bluemix. This only needs to be done once. You can either do this at the command line, or in the Bluemix dashboard. If you prefer to use the command line:

    $ cf create-service cloudantNoSQLDB Shared cloudant-location-tracker-db

If you instead prefer to use the [Bluemix dashboard](https://console.ng.bluemix.net/):

1. Click "Services"
2. Click "Add a Service or API"
3. Under "Data Management", click "Cloudant NoSQL DB"
4. Under "App" select "Leave unbound" (we bind the app to the service in the [`manifest.yml`](https://github.com/cloudant-labs/location-tracker-nodejs/blob/master/manifest.yml) file)
5. Enter "cloudant-location-tracker-db" in the "Service name" field
6. Click the "Create" button

You are now ready to deploy your application! Deploying is as simple as:

    $ cf push

From now on, you will only need to use this one command whenever you want to deploy changes to your application. In the [Bluemix dashboard](https://console.ng.bluemix.net/), find the "cloudant-location-tracker" app. Look for "Routes" and find the route assigned to your app. Note that the route does not use SSL by default. I recommend changing the `http` to `https` in the route URL, as the Location Tracker app collects user credentials. Go ahead and visit this URL to see your newly deployed app!

### Configuring

#### Development

Configuration of your local development environment is done through a `.env` file. One environment variable, `VCAP_SERVICES`, is needed in order to configure your local development environment. The value of the `VCAP_SERVICES` is a string representation of a JSON object. Here is an example `.env` file:

    VCAP_SERVICES={"cloudantNoSQLDB": [{"name": "cloudant-location-tracker-db","label": "cloudantNoSQLDB","plan": "Shared","credentials": {"username": "your-username","password": "your-password","host": "your-host","port": 443,"url": "https://your-username:your-password@your-host"}}]}

You have two options for configuring the database to be used by your local development environment:

1. Install the [CouchDB 2.0 Developer Preview](https://couchdb.apache.org/developer-preview/2.0/) on your local development machine and configure the `VCAP_SERVICES` environment variable accordingly.
2. Simply point your local installation to your Cloudant database on Bluemix. This isn't ideal, as both your development and production environments will be using the same database.

If you want to try the second option: 

1. Click "Show Credentials" on your "Cloudant NoSQL DB" service within the Bluemix dashboard
2. Copy the JSON object displayed
3. Paste the JSON object into your `.env` file as the value for the `VCAP_SERVICES` environment variable, removing all of the line breaks

Once you have a database configured, be sure to install the application's dependencies again using npm:

    $ npm install

In addition to installing the application's dependencies, this command also runs scripts that create and configure databases needed by the application.

Go ahead and start up the application again:

    $ foreman start

Open your local application instance at [`http://localhost:5000`](http://localhost:5000). Now that you have a local database configured, everything should work correctly.

#### Production

Services created within Bluemix are automatically added to the `VCAP_SERVICES` environment variable for your app on Bluemix. Therefore, no further configuration is needed.



