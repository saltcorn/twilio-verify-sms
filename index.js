const Workflow = require("@saltcorn/data/models/workflow");
const Form = require("@saltcorn/data/models/form");
const User = require("@saltcorn/data/models/user");
const Table = require("@saltcorn/data/models/table");

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
          const userTable = await Table.findOne({ name: "users" });
          const userFields = (await userTable.getFields())
            .filter((f) => !f.calculated && f.name !== "id")
            .map((f) => ({ value: f.name, label: f.name }));
          //console.log(userFields);
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
              {
                name: "friendlyName",
                label: "Friendly name",
                type: "String",
                sublabel: "The name of your service shown to your users",
                required: true,
              },
              {
                name: "phoneField",
                label: "Phone field",
                input_type: "select",
                sublabel:
                  "The field in the user table containing the phone number",
                options: userFields,
                required: true,
              },
              {
                name: "bypass",
                label: "Bypass authentication",
                type: "Bool",
                sublabel:
                  "For testing purposes. Verification token is fixed to 000000",
              },
            ],
          });
        },
      },
    ],
  });
const verifier_workflow =
  ({ accountSid, authToken, phoneField, bypass }) =>
  async (user) => {
    const client = !bypass && require("twilio")(accountSid, authToken);
    const userRow = await User.findOne({ id: user.id });

    return new Workflow({
      onDone: async ({ verify_token }) => {
        if (bypass) return { verified: true };
        const verification_check = await client.verify
          .services(service.sid)
          .verificationChecks.create({
            to: userRow[phoneField],
            code: verify_token,
          });
        //console.log(verification_check);
        return { verified: verification_check.valid };
      },
      steps: [
        {
          name: "Twilio Account",
          form: async () => {
            //console.log({to: userRow.phone, channel: "sms", user, userRow});
            if (!bypass)
              await client.verify.services(service.sid).verifications.create({
                to: userRow[phoneField],
                channel: "sms",
              });
            const form = new Form({
              fields: [
                {
                  name: "verify_token",
                  label: "Verification token",
                  type: "String",
                  required: true,
                },
              ],
            });
            if (bypass) form.values.verify_token = "000000";
            return form;
          },
        },
      ],
    });
  };

const onLoad = async (cfg) => {
  if (!cfg) return;
  const { accountSid, authToken, friendlyName, bypass } = cfg;
  if (!accountSid || !authToken) return;
  if (bypass) return;
  const client = require("twilio")(accountSid, authToken);
  service = await client.verify.services.create({
    friendlyName,
  });
};

module.exports = {
  sc_plugin_api_version: 1,
  configuration_workflow,
  verifier_workflow,
  onLoad,
};
