const discourse_sso = require("discourse-sso");
//TODO - delete this module, do it all with node crypto

const secret = process.env.secret;
if (!secret) {
  throw new Error("No secret provided");
}

const sso = new discourse_sso(secret);

// TODO: Rename this from helloWorld!!
exports.helloWorld = (req, res) => {
  var payload = req.query.sso;
  var sig = req.query.sig;

  if (sso.validate(payload, sig)) {
    res.sendFile("./views/login.html", { root: __dirname });
  } else {
    res.status(400).sendFile("./views/error.html", { root: __dirname });
  }
};
