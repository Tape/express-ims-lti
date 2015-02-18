var bodyParser   = require("body-parser");
var cookieParser = require("cookie-parser");
var express      = require("express");
var lti          = require("ims-lti");
var request      = require("supertest");
var session      = require("express-session");
var stSession    = require("supertest-session");
var should       = require("should");
var url          = require("url");
var util         = require("util");

var middleware = require("../");

var KEY    = "key";
var SECRET = "secret";

var genericProvider = new lti.Provider(KEY, SECRET);

function addNoops (app) {
  app.use(function (req, res, next) {
    res.status(200).end();
  });
  app.use(function (err, req, res, next) {
    res.status(500).end();
  });
  return app;
}

function addValidators (app) {
  app.use(function (req, res, next) {
    res.status(req.lti ? 200 : 500).end();
  });
  app.use(function (err, req, res, next) {
    res.status(500).end();
  });
  return app;
}

function getValidParams (testUrl) {
  var urlParsed = url.parse(testUrl);
  var fakeRequest = {
    url: urlParsed.path,
    method: "POST",
    connection: {
      encrypted: false
    },
    headers: {
      host: urlParsed.host
    },
    body: {
      lti_message_type:       "basic-lti-launch-request",
      lti_version:            "LTI-1p0",
      resource_link_id:       "http://my-resource.com/test-url",
      oauth_customer_key:     "key",
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp:        Math.round(Date.now() / 1000),
      oauth_nonce:            Math.floor(Math.random() * 0xffffffff)
    }
  };

  var signature = genericProvider.signer.build_signature(fakeRequest, fakeRequest.body, SECRET);
  fakeRequest.body.oauth_signature = signature;

  return fakeRequest.body;
}

describe("express-ims-lti", function () {
  describe("utils", function () {
    it("should expose an lti property that has the ims-lti library", function () {
      should(middleware.lti).be.an.Object;
    });
  });

  describe("errors", function () {
    it("should throw an error if required configuration params are missing", function () {
      (function () {
        var middleware = middleware();
      }).should.throw();
      (function () {
        var middleware = middleware({ consumer_key: "key" });
      }).should.throw();
      (function () {
        var middleware = middleware({ consumer_secret: "key" });
      }).should.throw();
    });

    it("should throw an error if it is detected that express session is not loaded", function (done) {
      var app = express();
      app.use(middleware({ consumer_key: KEY, consumer_secret: SECRET }));

      request(addNoops(app))
        .post("/")
        .expect(500, done);
    });
  });

  describe("Expectations: consumer_key and consumer_secret", function () {
    beforeEach(function () {
      var app = this.app = express();
      app.use(bodyParser.json());
      app.use(cookieParser());
      app.use(session({ resave: false, saveUninitialized: true, secret: "easy" }));
      app.use(middleware({ consumer_key: KEY, consumer_secret: SECRET }));
    });

    it("should be able to pass over a non-lti request", function (done) {
      request(addNoops(this.app))
        .post("/")
        .send({ test: "test" })
        .expect(200, done);
    });

    it("should be able to pick out an lti login request", function (done) {
      // We test for a 500 error here because the LTI request will not be valid
      // if some necessary request params are not present.
      request(addNoops(this.app))
        .post("/")
        .send({ lti_message_type: "basic-lti-launch-request" })
        .expect(500, done);
    });

    it("should add the lti property to the request object if successful", function (done) {
      var test = request(addValidators(this.app)).post("/");

      test
        .send(getValidParams(test.url))
        .expect(200, done);
    });

    it("should load the provider from the session if a user makes another request", function (done) {
      var Session = stSession({ app: addValidators(this.app) });
      var agent   = new Session();
      var test    = agent.post("/");

      test
        .send(getValidParams(test.url))
        .expect(function (res) {
          if (res.status != 200)          return "status should be 200";
          if (!res.headers["set-cookie"]) return "expected a cookie to be set";
        })
        .end(function (err) {
          if (err) {
            return done(err);
          }

          agent
            .get("/")
            .expect(200, done);
        });
    });
  });

  describe("Expectations: credentials", function () {
    beforeEach(function () {
      var app = this.app = express();
      app.use(bodyParser.json());
      app.use(cookieParser());
      app.use(session({ resave: false, saveUninitialized: true, secret: "easy" }));

      app.use(middleware({
        credentials: function (key, callback) {
          callback(null, KEY, SECRET);
        }
      }));
    });

    it("should add the lti property to the request object if successful", function (done) {
      var test = request(addValidators(this.app)).post("/");

      test
        .send(getValidParams(test.url))
        .expect(200, done);
    });

    it("should load the provider from the session if the user makes another request", function (done) {
      var Session = stSession({ app: addValidators(this.app) });
      var agent   = new Session();
      var test    = agent.post("/");

      test
        .send(getValidParams(test.url))
        .expect(function (res) {
          if (res.status != 200)          return "status should be 200";
          if (!res.headers["set-cookie"]) return "expected a cookie to be set";
        })
        .end(function (err) {
          if (err) {
            return done(err);
          }

          agent
            .get("/")
            .expect(200, done);
        });
    });
  });
});
