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

Create a Cloudant service within Bluemix if it has not already been created:

    $ cf create-service cloudantNoSQLDB Shared cloudant-location-tracker-db

Once you have completed the above steps, simply:

    $ cf push

## License

Licensed under the [Apache License, Version 2.0](LICENSE.txt).
