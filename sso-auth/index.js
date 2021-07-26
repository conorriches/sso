/*
  Authentication against members.hacman.org.uk for SSO
  All data is signed with a HMAC to ensure it's valid
*/

const axios = require("axios");
const crypto = require("crypto");

const secret = process.env.secret;
const membershipSecret = process.env.membershipSecret;

if (!secret || !membershipSecret) {
  throw new Error(
    "Not all secrets provided - require 'secret' and 'membershipSecret'"
  );
}

/*
  Makes GET request to membership system to see if given creds are valid
  Gets response back, validates HMAC and responses
  Returns an object with success: true|false and a message/data
*/
const validateMember = (email, password, callback) => {
  let { b64, hmac } = objectToSend({ email, password }, membershipSecret);

  axios
    .get("https://members.hacman.org.uk/sso", {
      params: {
        sso: b64,
        sig: hmac,
      },
    })
    .then((res) => {
      const { response, sig } = res.data;

      // Hash the repsonse with the secret
      const expectedHmac = generateHMAC(response, membershipSecret);

      // Make sure what we got is valid
      if (expectedHmac === sig) {
        // Get the response out of base64
        const decodedRes = Buffer.from(response, "base64").toString("ascii");
        const params = new URLSearchParams(decodedRes);

        // Return the nice data to be used
        callback({
          success: true,
          data: params,
        });
      } else {
        callback({
          success: false,
          message: "Signature didn't match",
        });
      }
    })
    .catch((error) => {
      callback({
        success: false,
        message: error.response.data
          ? error.response.data.message
          : "Unexpected error",
      });
    });
};

/*
  Prepares a JS object for sending by URL
  It converts to a query string (key=value&key2=value2)
  Then base64 encodes it with a valid HMAC
*/
const objectToSend = (obj, sec) => {
  // Make object a query string
  const q = Object.keys(obj)
    .map((k) => `${k}=${obj[k]}`)
    .join("&");

  // Get it in base64 and sign it
  const b64 = Buffer.from(q).toString("base64");
  const hmac = generateHMAC(b64, sec);
  return {
    b64,
    hmac,
  };
};

/*
  Signs some data returning the signature HMAC
  Takes some data and a secret
*/
const generateHMAC = (d, s) => {
  return crypto.createHmac("sha256", s).update(d).digest("hex");
};

// TODO: Rename this from helloWorld!!
exports.helloWorld = (req, res) => {
  // Get query params from URL
  const { email, password, sso, sig } = req.query;

  // Check that the signature is correct
  const hmac = generateHMAC(sso, secret);

  if (hmac !== sig) {
    res.status(400).send({ success: false, message: "Invalid token" });
    return;
  }

  // ask membership system
  validateMember(email, password, (response) => {
    if (response.success !== true) {
      res.status(400).send({ success: false });
      return;
    }

    // Get the nonce from the discourse sso object
    const decodedSSO = Buffer.from(sso, "base64").toString("ascii");
    const params = new URLSearchParams(decodedSSO);

    const result = {
      nonce: params.get("nonce"),
      username: response.data.get("username"),
      email: response.data.get("email"),
      name: response.data.get("name"),
      external_id: response.data.get("id"),
      require_activation: true,
    };

    let { b64, hmac } = objectToSend(result, secret);
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
  });
};
