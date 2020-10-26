# netlify-plugin-gcp-secret-manager-to-dotenv

Get secrets from Google Cloud Secret Manager at build-time and persist them in a `.env` file during build.

## Usage
```shell
npm install --save-dev netlify-plugin-gcp-secret-manager-to-dotenv
```

Set an environment variable called `GCP_SERVICE_ACCOUNT` to the JSON payload of a GCP service account with read access to secrets stored in Secret Manager.

Use the inputs to this plugin to create mappings between secret names and environment variables.

```toml
[[plugins]]
package = "netlify-plugin-gcp-secret-manager-to-dotenv"
  [plugins.inputs.variables]
  # This will make the plugin emit the value of the
  # secret named "secret-name" into the env var
  # ENVIRONMENT_VARIABLE_NAME in .env
  ENVIRONMENT_VARIABLE_NAME = "secret-name"

  [plugins.inputs.files]
  # This will write a file with the contents of the
  # "file-secret" secret into a directory generated
  # in the functions dir, and the SOME_SECRET_FILE
  # var will be populated with the path of that file.
  SOME_SECRET_FILE = "file-secret"

  # This will add the "pem" extension to the file
  # generated with the contents of the secret.
  SSL_CERT = { name = "some-cert", extension = "pem" }

  [plugins.inputs]
  # The name of the generated directory for file
  # secrets. Defaults to "secrets".
  secretdir = "secrets"
```

Unless a file secret is exposed as `GOOGLE_APPLICATION_CREDENTIALS`, the service account provided in the `GCP_SERVICE_ACCOUNT` env var will be exposed as a file in that name.
