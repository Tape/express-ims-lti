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
  if (!userSettings.consumer_key || !userSettings.consumer_secret) {
    throw new Error("A consumer_key and consumer_secret must be present");
  }

  var options    = util._extend({}, userSettings);
  var nonceStore = getNonceStore(options.store);

  return function (req, res, next) {
    if (!isObject(req.session)) {
      return next(new Error("To use express-ims-lti a session must be present in the request object"));
    }

    // If an lti property is present within the session that indicates we have
    // already performed the authentication and purely wish to resume the
    // provider instance from the stored session.
    if (req.session.lti) {
      req.lti = new lti.Provider(options.consumer_key, options.consumer_secret, nonceStore);
      req.lti.parse_request(req, req.session.lti);
      return next();
    }

    // Detect if there is a payload that would indicate an LTI launch. If it is
    // present then verify the request, storing the request parameters into the
    // session if valid, and throwing an error if not.
    if (req.method == "POST" && isObject(req.body) && req.body.lti_message_type == "basic-lti-launch-request") {
      req.lti = new lti.Provider(options.consumer_key, options.consumer_secret, nonceStore);
      return req.lti.valid_request(req, function (err) {
        if (err) {
          return next(err);
        }

        req.session.lti = req.body;
        next();
      });
    }

    next();
  };
};

module.exports.lti = lti;
