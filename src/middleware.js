var util = require("util");
var lti  = require("ims-lti");

function isObject (arg) {
  return typeof arg == "object" && arg !== null;
}

function getNonceStore (store) {
  if (isObject(store) && store.type == "redis") {
    return new lti.Stores.RedisStore(store.client);
  }
  return new lti.Stores.MemoryStore();
};

module.exports = function (userSettings) {
  if (!userSettings.credentials && (!userSettings.consumer_key || !userSettings.consumer_secret)) {
    throw new Error("A consumer_key and consumer_secret must be present");
  }

  var options    = util._extend({}, userSettings);
  var nonceStore = getNonceStore(options.store);

  if (!options.credentials) {
    options.credentials = function (key, callback) {
      callback(null, options.consumer_key, options.consumer_secret);
    };
  }

  return function (req, res, next) {
    // Detect if there is a payload that would indicate an LTI launch. If it is
    // present then verify the request, storing the request parameters into the
    // session if valid, and throwing an error if not.
    if (req.method == "POST" && isObject(req.body) && req.body.lti_message_type == "basic-lti-launch-request") {
      return options.credentials.call(req, req.body.oauth_consumer_key, function (err, key, secret) {
        if (err) {
          return next(err);
        }

        req.lti = new lti.Provider(key, secret, nonceStore);
        req.lti.valid_request(req, function (err) {
          if (err) {
            return next(err);
          }

          req.session.lti = {
            key:    key,
            secret: secret,
            params: req.body
          };
          next();
        });
      });
    }

    // If an lti property is present within the session that indicates we have
    // already performed the authentication and purely wish to resume the
    // provider instance from the stored session.
    if (isObject(req.session) && req.session.lti) {
      req.lti = new lti.Provider(req.session.lti.key, req.session.lti.secret, nonceStore);
      req.lti.parse_request(req, req.session.lti.params);
      return next();
    }

    next();
  };
};

module.exports.lti = lti;
