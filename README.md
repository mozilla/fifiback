# Fifi Back End

## Installation

* Clone this repo, then do `npm install` in the repo directory.

## Development

To run the server: `node server.js`.

When running on your local box, it will start up on port 5000, and connect
to redis on default ports.

## Copy local configuration file

> cp local.json-dist local.json

## Heroku deployment

Set up for a nodejs heroku deployment:

https://devcenter.heroku.com/articles/nodejs

Then after it is created:

    git push heroku master
