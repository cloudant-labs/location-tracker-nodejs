# Cloudant Location Tracker

The Cloudant Location Tracker is a demo web application which records a device's location and saves this information to [IBM Cloudant](https://cloudant.com/).

UPDATE June, 2016:  We have several sample apps covering location tracking with Cloudant. Use the one that fits your coding needs best. There's a bare-bones [couchapp](https://github.com/cloudant-labs/location-tracker-couchapp/), [this one for Angular (version 1)/NodeJS developers](https://github.com/cloudant-labs/location-tracker-nodejs), and the [latest using Swift/iOS on the client-side](https://github.com/ibm-cds-labs/location-tracker-client-swift) with a [NodeJS back-end](https://github.com/ibm-cds-labs/location-tracker-server-nodejs/).

## Cloning

Get the project and change into the project directory:

    $ git clone https://github.com/cloudant-labs/location-tracker-nodejs.git
    $ cd location-tracker-nodejs

## Configuring IBM Bluemix

Complete these steps first if you have not already:

1. [Install the Cloud Foundry command line interface.](https://www.ng.bluemix.net/docs/#starters/install_cli.html)
2. Follow the instructions at the above link to connect to Bluemix.
3. Follow the instructions at the above link to log in to Bluemix.

Create a Cloudant service within Bluemix if one has not already been created:

    $ cf create-service cloudantNoSQLDB Lite cloudant-location-tracker-db

## Configuring Local Development

Local configuration is done through a `.env` file. One environment variable, `VCAP_SERVICES`, is needed in order to configure your local development environment. The value of the `VCAP_SERVICES` is a string representation of a JSON object. Here is an example `.env` file:

    VCAP_SERVICES={"cloudantNoSQLDB": [{"name": "cloudant-location-tracker-db","label": "cloudantNoSQLDB","plan": "Shared","credentials": {"username": "your-username","password": "your-password","host": "your-host","port": 443,"url": "https://your-username:your-password@your-host"}}]}

**Note:**  Services created within Bluemix are automatically added to the `VCAP_SERVICES` environment variable. Therefore, no configuration is needed for Bluemix.

## Installing

Install the project's dependencies and initialize the database:

    $ npm install

## Running

1. **Run** the project through [Foreman](https://github.com/ddollar/foreman):

        $ foreman start

2. **Authenticate** by clicking the sign up link. Iif this is your first time logging in, enter your email address and a password. If not, click the "Go Sign In" link. 

3. **Track** locations by simply doing nothing or moving around by foot, bike or vehicle. Location data is saved in your browser in a [PouchDB database](https://pouchdb.com/).

4. **Persist** the data to the cloud by clicking "Stop & Save Location Data". Everything is saved to the Cloudant database you created earlier, with your username included in each location reading.

## Deploying

To deploy to Bluemix, simply:

    $ cf push

**Note:** You may notice that Bluemix assigns a URL to your app containing a random word. This is defined in the `manifest.yml` file. The `host` key in this file contains the value `cloudant-location-tracker-${random-word}`. The random word is there to ensure that multiple people deploying the Location Tracker application to Bluemix do not run into naming collisions. However, this will cause a new route to be created for your application each time you deploy to Bluemix. To prevent this from happening, replace `${random-word}` with a hard coded (but unique) value.

## Privacy Notice

The Location Tracker sample web application includes code to track deployments to [IBM Bluemix](https://www.bluemix.net/) and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker](https://github.com/cloudant-labs/deployment-tracker) service on each deployment:

* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)

This data is collected from the `VCAP_APPLICATION` environment variable in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix to measure the usefulness of our examples, so that we can continuously improve the content we offer to you. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

Deployment tracking can be disabled by removing `./admin.js track && ` from the `install` script line of the `scripts` section within `package.json`.

## License

Licensed under the [Apache License, Version 2.0](LICENSE.txt).
