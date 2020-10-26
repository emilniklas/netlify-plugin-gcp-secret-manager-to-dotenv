const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const { createHash } = require("crypto");
const { resolve, join } = require("path");
const { writeFile, mkdir } = require("fs").promises;

const credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT);

const client = new SecretManagerServiceClient({
  credentials,
});

module.exports = {
  async onPreBuild({ constants, inputs: { variables, files, secretdir } }) {
    const environment = {};

    await Promise.all([
      "GOOGLE_APPLICATION_CREDENTIALS" in files
        ? Promise.resolve()
        : exposeServiceAccount(),
      ...Object.entries(variables).map(([envVar, secretName]) => exposeValue(secretName, envVar)),
      ...Object.entries(files).map(([envVar, secretNameOrObj]) => {
        let secretName;
        let ext = "secret";
        switch (typeof secretNameOrObj) {
          case "string":
            secretName = secretNameOrObj;
            break;
          case "object":
            secretName = secretNameOrObj.name;
            ext = secretNameOrObj.extension;
            break;
        }
        return exposeFile(secretName, envVar, ext);
      }),
    ]);

    async function exposeServiceAccount() {
      await createFileAndExpose("credentials.json", process.env.GCP_SERVICE_ACCOUNT, "GOOGLE_APPLICATION_CREDENTIALS");
      console.log(`Exposed provided service account as GOOGLE_APPLICATION_CREDENTIALS`);
    }

    await writeFile(
      ".env",
      Object.entries(environment)
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
        .join("\n"),
    );

    async function access(secretName) {
      const [response] = await client.accessSecretVersion({
        name: `projects/${credentials.project_id}/secrets/${secretName}/versions/latest`,
      });

      return response.payload.data;
    }

    async function exposeValue(secretName, envName) {
      environment[envName] = (await access(secretName)).toString("utf-8");
      console.log(`Exposed secret "${secretName}" as ${envName}`);
    }

    async function createFileAndExpose(name, data, envName) {
      await mkdir(join(constants.FUNCTIONS_SRC, secretdir), { recursive: true });
      const relativePath = join(secretdir, name);
      await writeFile(resolve(constants.FUNCTIONS_SRC, relativePath), data);
      environment[envName] = relativePath;
    }

    async function exposeFile(secretName, envName, ext) {
      const buffer = await access(secretName);
      const hash = createHash("sha256")
        .update(buffer)
        .digest("hex")
        .slice(0, 5);
      const name = `${hash}-${secretName.replace(/[^a-z0-9_-]/ig, "-")}.${ext}`;
      await createFileAndExpose(name, buffer, envName);
      console.log(`Wrote secret "${secretName}" to ${name} and exposed as ${envName}`);
    }
  },
};

