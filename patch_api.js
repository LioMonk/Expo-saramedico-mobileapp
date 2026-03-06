const fs = require('fs');
const path = require('path');
const file = './src/services/api.js';
let content = fs.readFileSync(file, 'utf8');

// Add the endpoints to consultationAPI
content = content.replace(
  /export const consultationAPI = \{/,
  `export const consultationAPI = {
  // POST /consultations/{id}/complete - Mark consultation complete & trigger AI
  completeConsultation: (id) => api.post(\`/consultations/\${id}/complete\`),

  // GET /consultations/{id}/soap-note - Poll for SOAP Note
  getSoapNote: (id) => api.get(\`/consultations/\${id}/soap-note\`),`
);

fs.writeFileSync(file, content);
console.log('API successfully patched!');
