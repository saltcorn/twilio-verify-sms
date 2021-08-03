const Workflow = require("@saltcorn/data/models/workflow");
const Form = require("@saltcorn/data/models/form");
const Trigger = require("@saltcorn/data/models/trigger");

let service;

const configuration_workflow = () =>
  new Workflow({
    /* onDone: async (cfg) => {
      await onLoad(cfg);
      return cfg;
    },
*/ steps: [
      {
        name: "Twilio Account",
        form: async () => {
          return new Form({
            fields: [
              {
                name: "accountSid",
                label: "Account SID",
                type: "String",
                required: true,
              },
              {
                name: "authToken",
                label: "Auth Token",
                type: "String",
                required: true,
              },
            ],
          });
        },
      },
    ],
  });
const verifier_workflow = ({ accountSid, authToken }) => async (user) => {
  const client = require("twilio")(accountSid, authToken);

  return new Workflow({
    onDone: async ({ verify_token }) => {
      const verification_check = await client.verify
        .services(service.sid)
        .verificationChecks.create({ to: user.phone, code: verify_token });
      console.log(verification_check);
      return { verified: true };
    },
    steps: [
      {
        name: "Twilio Account",
        form: async () => {
          const verification = await client.verify
            .services(service.sid)
            .verifications.create({ to: user.phone, channel: "sms" });
          return new Form({
            fields: [
              {
                name: "verify_token",
                label: "Verification token",
                type: "String",
                required: true,
              },
            ],
          });
        },
      },
    ],
  });
};

const onLoad = async ({ accountSid, authToken }) => {
  const client = require("twilio")(accountSid, authToken);
  service = await client.verify.services.create({
    friendlyName: "My First Verify Service",
  });
};

module.exports = {
  sc_plugin_api_version: 1,
  configuration_workflow,
  verifier_workflow,
  onLoad,
};
