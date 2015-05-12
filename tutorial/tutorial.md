# Location Tracker Part 3: Add a middle tier to manage users, with Node.js

In [Part 1](https://github.com/cloudant-labs/location-tracker-couchapp/blob/master/tutorial/tutorial.adoc) of this tutorial series we learned why location is so important to modern mobile apps and how to build the basic functionality. In [Part 2](https://github.com/cloudant-labs/location-tracker-angular/blob/master/tutorial/tutorial.adoc), we took that code and transformed it into a serious app using AngularJS. In both Parts 1 and 2, the Location Tracker application was built as a [CouchApp](http://docs.couchdb.org/en/latest/couchapp/). The cool thing about a CouchApp is that it can be hosted completely within Cloudant. This makes CouchApps great for demo applications like the Location Tracker. As an added bonus, you can quickly fork a CouchApp by replicating it into your own Cloudant account and have a fully-functioning application up-and-running in under 60 seconds. However, there are limitations to CouchApps.

Without a [middle tier](http://en.wikipedia.org/wiki/Multitier_architecture), building certain functionality becomes a challenge. The typical three-tier architecture includes a data tier, an application (or logic) tier, and a presentation tier. CouchApps eschew the traditional application tier and just include a data tier (Cloudant or CouchDB) and a presentation tier (HTML5, CSS and JavaScript). While possible to build _some_ application logic within Cloudant, there are practical limitations. This is because Cloudant is primarily intended to be used as a data layer.

[![Overview of a three-tier application including presentation tier, logic tier, and data tier](http://upload.wikimedia.org/wikipedia/commons/5/51/Overview_of_a_three-tier_application_vectorVersion.svg "Overview of a Three-Tier Application")](http://en.wikipedia.org/wiki/Multitier_architecture)

Let's take managing user access, for example. How would you go about building a user management system without an application tier? If you can figure out how to do this, I'd love to know! In Part 3 of this tutorial we build a Node.js application that handles user registration, login and logout. Additionally, we make the Location Tracker application deployable to [IBM Bluemix](https://console.ng.bluemix.net/) and update the map to display individual user locations, rather than one big map of all user locations.

[![IBM Bluemix logo](http://upload.wikimedia.org/wikipedia/commons/c/c7/IBM_Bluemix_logo.svg "IBM Bluemix")](https://console.ng.bluemix.net/)

## Deploying to IBM Bluemix

### Cloning

The first step is to clone the project from GitHub:

    $ git clone https://github.com/cloudant-labs/location-tracker-nodejs.git

After cloning, you will have a new `location-tracker-nodejs` directory. Change into this directory:

    $ cd location-tracker-nodejs

### Configuring

Next, [sign up for a Bluemix account](https://console.ng.bluemix.net/), if you haven't already. Go ahead and do that now. I'll wait. Then, [install the Cloud Foundry command line interface](https://www.ng.bluemix.net/docs/#starters/install_cli.html). This is the tool that you'll use to deploy to Bluemix. Follow the instructions on the Cloud Foundry command line interface installation page to:

1. Connect to Bluemix using the `cf api` command
2. Log in to Bluemix using the `cf login` command

### Deploying

You are now ready to deploy your application! Deploying is as simple as:

    $ cf push

From now on, you will only need to use this one command whenever you want to deploy changes to your application. In the [Bluemix dashboard](https://console.ng.bluemix.net/), find the "cloudant-location-tracker" app. Look for "Routes" and find the route assigned to your app. Note that the route does not use SSL by default. I recommend changing the `http` to `https` in the route URL, as the Location Tracker app collects user credentials. Go ahead and visit this URL to see your newly deployed app! Keep reading to learn more about how applications are deployed to Bluemix, or skip to the [Running Locally](#running-locally) section to learn how to run the Location Tracker application in your local development environment.

**Note:** You may notice that Bluemix assigns a route URL to your app containing a random word. This is defined in the [`manifest.yml`](https://github.com/cloudant-labs/location-tracker-nodejs/blob/master/manifest.yml) file. The `host` key in this file contains the value `cloudant-location-tracker-${random-word}`. The random word is there to ensure that multiple people deploying the Location Tracker application to Bluemix do not run into naming collisions. However, this will cause a new route to be created for your application each time you deploy to Bluemix. To prevent this from happening, replace `${random-word}` with a hard coded (but unique) value.

### Application Manifest

In the root of the Location Tracker application, you will find a file named `manifest.yml`. This _application manifest_ instructs Bluemix how to deploy the Location Tracker application.

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

In the `declared-services` section, we define a Cloudant service (`cloudantNoSQLDB`) with a service name of `cloudant-location-tracker-db`. We declare that this is a `Shared` plan, meaning it is a multi-tenant Cloudant account. Our application manifest includes one application named `cloudant-location-tracker` that uses 128M of memory. We instruct Bluemix to use a host name of `cloudant-location-tracker-${random-word}`. This will give us a host name of `cloudant-location-tracker-` followed by a random word generated by Bluemix (see the note above about this). This host name will be a subdomain of `mybluemix.net` (e.g. `cloudant-location-tracker-foo.mybluemix.net`). The last line binds our Cloudant service to our application.

### Buildpack

Every Bluemix application needs a _buildpack_, which will be used to build and run your application. In most cases, Bluemix will automatically detect the appropriate buildpack for your application. In the case of the Location Tracker application, Bluemix will use the Node.js buildpack. The Node.js buildpack will:

1. Install the npm dependencies declared in `package.json`
2. Run any scripts declared in `package.json`
3. Provide a Node.js runtime environment to start your application within

## Running Locally

### Configuring

Configuration of your local development environment is done through a `.env` file. One environment variable, `VCAP_SERVICES`, is needed in order to configure your local development environment. The value of the `VCAP_SERVICES` is a string representation of a JSON object. Here is an example `.env` file:

    VCAP_SERVICES={"cloudantNoSQLDB": [{"name": "cloudant-location-tracker-db","label": "cloudantNoSQLDB","plan": "Shared","credentials": {"username": "your-username","password": "your-password","host": "your-host","port": 443,"url": "https://your-username:your-password@your-host"}}]}

You have two options for configuring the database to be used by your local development environment:

1. Install the [CouchDB 2.0 Developer Preview](https://couchdb.apache.org/developer-preview/2.0/) on your local development machine and configure the `VCAP_SERVICES` environment variable accordingly.
2. Simply point your local installation to your Cloudant database on Bluemix. This isn't ideal, as both your development and production environments will be using the same database.

If you want to try the second option: 

1. Click "Show Credentials" on your "Cloudant NoSQL DB" service within the Bluemix dashboard
2. Copy the JSON object displayed
3. Paste the JSON object into your `.env` file as the value for the `VCAP_SERVICES` environment variable, removing all of the line breaks

### Installing

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
