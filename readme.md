# express-ims-lti

[![Build Status](https://travis-ci.org/Tape/express-ims-lti.svg?branch=master)](https://travis-ci.org/Tape/express-ims-lti)

This module provides a way to use the [ims-lti](https://github.com/omsmith/ims-lti) module with Express. It is capable of detecting LTI login requests and intelligently restoring an LTI provider instance from an Express session automatically.

## Usage

Usage for the module is fairly straightfoward.

```js
var ltiMiddleware = require("express-ims-lti");

// ... Construct your application ...

app.use(ltiMiddleware({
  consumer_key: "key",       // Required.
  consumer_secret: "secret", // Required.
  store: {                   // Optional.
    type: "redis",           // If store is omitted memory will be used.
    client: redisClient      // Required when using Redis.
  }
}));
```
