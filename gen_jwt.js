const { createSigner } = require('fast-jwt');
const secret = 'agGs1TPwA48/md1lj/xfyroDbJlc21MH03EEWtlUr/A=';
const payload = {
  "user_id": "727bbc7d-6757-41bc-a8fc-d3643d395ebf",
  "telegram_id": 6461541179,
  "session_id": "86f88687-468a-49f2-972b-2dfa0c569d5b",
  "iss": "tadagram-core-api"
};
const signSync = createSigner({ key: secret, algorithm: 'HS256', expiresIn: 3600000 });
const token = signSync(payload);
console.log('Bearer ' + token);
