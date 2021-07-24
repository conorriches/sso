const crypto = require("crypto");

const secret = process.env.secret;
if (!secret) {
  throw new Error("No secret provided");
}

// TODO: Rename this from helloWorld!!
exports.helloWorld = (req, res) => {
  // Get query params from URL
  const { email, password, sso, sig } = req.query;

  // Check that the signature is correct
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(sso);

  if (hmac.digest("hex") !== sig) {
    res.status(400).send({ success: false, message: "Invalid token" });
    return;
  }

  // Check email and password against membership system
  // TODO: obvs, real authentication
  // 1. Update member system API to accept a query on a username and password
  // 2. Make an API token, and store it as a second secret here
  // 3. Make a request here to the member system API with the secret
  // 4. Handle the data coming in.
  if (email == "u" && password == "p") {
    var buff = Buffer.from(sso, "base64");
    let params = new URLSearchParams(buff.toString("ascii"));

    const result = {
      nonce: params.get("nonce"),
      username: "SSOtest",
      email: "outreach@hacman.org.uk",
      name: "SSO TEST",
      external_id: "0800001066", // you're welcome
      require_activation: false, // This will need to be true if member system doesn't check email
    };

    // Make a query string
    const q = Object.keys(result)
      .map((k) => `${k}=${result[k]}`)
      .join("&");

    // Get it in base64 and sign it
    const b64 = Buffer.from(q).toString("base64");
    const hmac = crypto.createHmac("sha256", secret).update(b64).digest("hex");

    let redirectTo = params.get("return_sso_url");
    redirectTo += `?sso=${encodeURIComponent(b64)}&sig=${encodeURIComponent(
      hmac
    )}`;

    const toReturn = {
      result: b64,
      resultSig: hmac,
      sso,
      sig,
      success: true,
      redirectTo,
    };

    res.status(200).send(toReturn);
    return;
  }

  res.status(400).send({ success: false, message: "Incorrect Login Details" });
};
