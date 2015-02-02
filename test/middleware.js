var bodyParser = require("body-parser");
var express    = require("express");
var request    = require("supertest");
var session    = require("express-session");
var should     = require("should");

var middleware = require("../src/middleware");

var validParams = {

};

function errorNoop (err, req, res, next) {
  res.status(500).end();
}

function successNoop (req, res, next) {
  res.status(200).end();
}

describe("express-ims-lti", function () {
  describe("errors", function () {
    it("should throw an error if the consumer_key or consumer_secret is missing", function () {
      (function () {
        var callback = middleware();
      }).should.throw();
    });

    it("should throw an error if it is detected that express session is not loaded", function (done) {
      var app = express();
      app.use(middleware({ consumer_key: "key", consumer_secret: "secret" }));
      app.use(successNoop);
      app.use(errorNoop);

      request(app)
        .post("/")
        .expect(500, done);
    });
  });

  describe("expectations", function () {
    beforeEach(function () {
      var app = this.app = express();
      app.use(bodyParser.json());
      app.use(session({ resave: false, saveUninitialized: true, secret: "secret" }));
      app.use(middleware({ consumer_key: "key", consumer_secret: "secret" }));
      app.use(successNoop);
      app.use(errorNoop);
    });

    it("should be able to pass over a non-lti request", function (done) {
      request(this.app)
        .post("/")
        .send({ test: "test" })
        .expect(200, done);
    });

    it("should be able to pick out an lti login request", function (done) {
      // We test for a 500 error here because the LTI request will not be valid
      // if some necessary request params are not present.
      request(this.app)
        .post("/")
        .send({ lti_message_type: "basic-lti-launch-request" })
        .expect(500, done);
    });
  });
});
