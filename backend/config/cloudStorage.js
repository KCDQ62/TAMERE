javascript
const AWS = require('aws-sdk');

// Configuration S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  endpoint: process.env.S3_ENDPOINT,
  s3ForcePathStyle: true,
});

module.exports = s3;