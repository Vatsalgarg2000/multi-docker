//This server interacts with the redis and postgres db
const keys = require('./keys');

// Express App Setup
/*
Very quickly, let's talk about what's going on right here.
We first require in the express library. We require in the body-parser library and the cors library as well.

We then create a new express application. So this app right here is essentially the object that's going to receive and respond to any  HTTP requests
that are coming or going back to the REACT server, receiving the react application.
We then wire up something called cors. cors is short for cross origin resource sharing. And it's essentially going to allow us to make requests 
from one domain that the REACT application is going to be running on to a completely different domain or different port in this case that
the Express API is hosted on.
The body-parser library right here is going to pass incoming requests from the REACT application and turned the body of the post request
into a JSON value that our Express API can then very easily work with now very quickly.
*/
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

pgClient.on('connect', (client) => {
  client
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.error(err));
});

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

//return all postgres values
app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * from values');

  res.send(values.rows);
});

//return all redis values
app.get('/values/current', async (req, res) => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  });
});

app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  redisClient.hset('values', index, 'Nothing yet!');
  redisPublisher.publish('insert', index);
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  res.send({ working: true });
});

app.listen(5000, (err) => {
  console.log('Listening');
});
