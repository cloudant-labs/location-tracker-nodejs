# Cloudant Location Tracker

The Cloudant Location Tracker is a demo web application which records a device's location and saves this information to [IBM Cloudant](https://cloudant.com/).

## Installing

Get the project and install its dependencies:

    $ git clone https://github.com/cloudant-labs/location-tracker-nodejs.git
    $ cd location-tracker-nodejs
    $ npm install

## Running

Run the project through [Foreman](https://github.com/ddollar/foreman):

    $ foreman start

## Deploying

Complete these steps first if you have not already:

1. [Install the Cloud Foundry command line interface.](https://www.ng.bluemix.net/docs/#starters/install_cli.html)
2. Follow the instructions at the above link to connect to Bluemix.
3. Follow the instructions at the above link to log in to Bluemix.

Create a Cloudant service within Bluemix if one has not already been created:

    $ cf create-service cloudantNoSQLDB Shared cloudant-location-tracker-db

Once you have completed the above steps, simply:

    $ cf push

**Note:** You may notice that Bluemix assigns a URL to your app containing a random word. This is defined by the `manifest.yml` file. The `host` key in this file contains the value `cloudant-location-tracker-${random-word}`. The random word is there to ensure that multiple people deploying the Location Tracker application to Bluemix do not run into naming collisions. However, this will cause a new route to be created for your application each time you deploy to Bluemix. To prevent this from happening, replace `${random-word}` with a hard coded (but unique) value.

## Configuring

### Development

Local configuration is done through a `.env` file. One environment variable, `VCAP_SERVICES`, is needed in order to configure your local development environment. The value of the `VCAP_SERVICES` is a string representation of a JSON object. Here is an example `.env` file:

    VCAP_SERVICES={"cloudantNoSQLDB": [{"name": "cloudant-location-tracker-db","label": "cloudantNoSQLDB","plan": "Shared","credentials": {"username": "your-username","password": "your-password","host": "your-host","port": 443,"url": "https://your-username:your-password@your-host"}}]}

### Production

Services created within Bluemix are automatically added to the `VCAP_SERVICES` environment variable. Therefore, no further configuration is needed.

## License

Licensed under the [Apache License, Version 2.0](LICENSE.txt).
