const express = require('express');
const router  = express.Router();

// Telegram webhook — dihandle oleh apps/bot
// Route ini hanya forward ke bot service jika bot dan api digabung
// Jika bot run berasingan, boleh remove route ini
router.post('/', (req, res) => {
  // Bot handles webhook independently via its own server
  res.sendStatus(200);
});

module.exports = router;
