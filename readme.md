# express-ims-lti

[![Build Status](https://travis-ci.org/Tape/express-ims-lti.svg?branch=master)](https://travis-ci.org/Tape/express-ims-lti)

This module provides a way to use the [ims-lti](https://github.com/omsmith/ims-lti) module with Express. It is capable of detecting LTI login requests and intelligently restoring an LTI provider instance from an Express session automatically.

## Usage

Usage for the module is fairly straightfoward.

```js
var ltiMiddleware = require("express-ims-lti");

// ... Construct your application ...

app.use(ltiMiddleware({
  // You must use either the credentials option or the consumer_key and
  // consumer_secret. The credentials option a function that accepts a key and
  // a callback to perform an asynchronous operation to fetch the secret.
  credentials: function (key, callback) {
    // `this` is a reference to the request object.
    var consumer = this.consumer = fetchLtiConsumer(key);
    // The first parameter is an error (null if there is none).
    callback(null, key, consumer.secret);
  },

  consumer_key: "key",       // Required if not using credentials.
  consumer_secret: "secret", // Required if not using credentials.

  store: {                   // Optional.
    type: "redis",           // If store is omitted memory will be used.
    client: redisClient      // Required when using Redis.
  }
}));
```
